"""
Session router – Phase 2 learning flow.

Endpoints
---------
POST /api/session/start_diagnostic   – return diagnostic question set
POST /api/session/submit_diagnostic  – score diagnostic, build skill profile, pick first question
POST /api/session/submit_answer      – score one answer, explain, pick next question
GET  /api/session/assessment         – return per-topic skill summary for a user
GET  /api/session/review             – return spaced-repetition review questions and topic suggestions
"""

from __future__ import annotations

import random
from datetime import datetime
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException

from backend import db
from backend.schemas.question import Attempt, Question, QuestionPublic, SkillProfile, TopicStats
from backend.schemas.session import (
    AssessmentResponse,
    DiagnosticAnswer,
    Explanation,
    ReviewItem,
    ReviewResponse,
    StartDiagnosticRequest,
    StartDiagnosticResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    SubmitDiagnosticRequest,
    SubmitDiagnosticResponse,
    SuggestedTopic,
)
from backend.services import ai_engine, review_scheduler
from backend.services.ai_engine import SkillStats

router = APIRouter(prefix="/api/session", tags=["session"])


# How often (every N answers) to inject a spaced-repetition review question.
_REVIEW_INJECTION_INTERVAL = 4


# ---------------------------------------------------------------------------
# Helper: fetch questions filtered by topic
# ---------------------------------------------------------------------------

def get_questions_by_topic(topic_id: str) -> List[Question]:
    return db.get_all_questions(topic_id=topic_id)


# ---------------------------------------------------------------------------
# Helper: fetch all attempts for a user
# ---------------------------------------------------------------------------

def get_user_attempts(user_id: str) -> List[Attempt]:
    return db.get_user_attempts(user_id)


# ---------------------------------------------------------------------------
# Helper: pick diagnostic questions from a topic
# ---------------------------------------------------------------------------

_DIAGNOSTIC_COUNT   = 5
_DIAGNOSTIC_WEIGHTS = {"easy": 3, "medium": 2, "hard": 1}


def select_diagnostic_questions(topic_id: str) -> List[Question]:
    """Return a small, mixed-difficulty set for the diagnostic.

    Prefers easy/medium questions; hard ones are weighted lower so beginners
    are not immediately overwhelmed.
    """
    pool = db.get_questions_from_trial_papers(topic_id)
    if not pool:
        return []

    weighted: List[Question] = []
    for q in pool:
        weight = _DIAGNOSTIC_WEIGHTS.get(q.difficulty, 1)
        weighted.extend([q] * weight)

    count = min(_DIAGNOSTIC_COUNT, len(pool))
    seen: set[str] = set()
    chosen: List[Question] = []
    random.shuffle(weighted)
    for q in weighted:
        if q.id not in seen:
            chosen.append(q)
            seen.add(q.id)
        if len(chosen) == count:
            break

    return chosen


# ---------------------------------------------------------------------------
# Helper: translate ai_engine.SkillProfile → schemas.question.SkillProfile
# ---------------------------------------------------------------------------

def _to_schema_skill_profile(
    user_id: str,
    ai_profile: ai_engine.SkillProfile,
) -> SkillProfile:
    """Convert the AI engine's dict-based profile to the Pydantic response model."""
    _level_map: Dict[str, Literal["beginner", "developing", "proficient", "advanced"]] = {
        "weak":   "beginner",
        "okay":   "developing",
        "strong": "proficient",
    }
    topics: Dict[str, TopicStats] = {}
    for tid, stats in ai_profile.items():
        schema_level = _level_map.get(stats.estimated_level, "beginner")
        topics[tid] = TopicStats(
            topic_id=tid,
            accuracy=stats.accuracy,
            attempts=stats.attempt_count,
            correct=stats.correct_count,
            level=schema_level,
        )
    return SkillProfile(user_id=user_id, topics=topics)


# ---------------------------------------------------------------------------
# Helper: choose next practice question (rule-based)
# ---------------------------------------------------------------------------

def choose_next_question_for_user(
    user_id: str,
    ai_profile: ai_engine.SkillProfile,
) -> Question:
    attempts = get_user_attempts(user_id)
    return ai_engine.choose_next_question(ai_profile, db.get_all_questions(), attempts)


# ---------------------------------------------------------------------------
# Helper: rule-based explanation generator
# ---------------------------------------------------------------------------

def _generate_explanation(
    question: Question,
    attempt: Attempt,
    ai_profile: ai_engine.SkillProfile,
) -> Explanation:
    engine_expl = ai_engine.generate_explanation(question, attempt, ai_profile)
    return Explanation(text=engine_expl.text, style=engine_expl.style)


# ---------------------------------------------------------------------------
# Endpoint: POST /api/session/start_diagnostic
# ---------------------------------------------------------------------------

@router.get("/papers")
def list_papers():
    """Return all papers grouped by subject for the diagnostic picker."""
    from backend.supabase_client import supabase
    response = (
        supabase.table("papers")
        .select("id, subject, state, year, paper_type, paper_name")
        .order("subject")
        .execute()
    )
    return {"papers": response.data}


@router.post("/start_diagnostic", response_model=StartDiagnosticResponse)
def start_diagnostic(req: StartDiagnosticRequest) -> StartDiagnosticResponse:
    """
    Return a mixed-difficulty set of diagnostic questions for the requested topic.

    - Filters the question bank by topic_id.
    - Selects up to 5 questions weighted toward easy/medium.
    - Strips correct_option_index before responding (uses QuestionPublic).
    - No attempts are saved here; that happens in submit_diagnostic.
    """
    questions = select_diagnostic_questions(req.topic_id)
    if not questions:
        raise HTTPException(
            status_code=404,
            detail=f"No diagnostic questions found for topic '{req.topic_id}'.",
        )
    return StartDiagnosticResponse(questions=[q.to_public() for q in questions])


# ---------------------------------------------------------------------------
# Endpoint: POST /api/session/submit_diagnostic
# ---------------------------------------------------------------------------

@router.post("/submit_diagnostic", response_model=SubmitDiagnosticResponse)
def submit_diagnostic(req: SubmitDiagnosticRequest) -> SubmitDiagnosticResponse:
    """
    Score diagnostic answers, persist attempts, build the initial skill profile,
    and return the first recommended practice question.

    Flow
    ----
    1. Validate each submitted question_id exists.
    2. Score each answer and create Attempt objects → persist via db.record_attempt.
    3. Build SkillProfile using ai_engine.analyze_diagnostic (Phase 1 logic).
    4. Pick the first practice question via choose_next_question_for_user.
    5. Return SubmitDiagnosticResponse (no correct_option_index exposed).
    """
    if not req.answers:
        raise HTTPException(status_code=400, detail="No answers provided.")

    submitted_ids = [ans.question_id for ans in req.answers]
    question_map: Dict[str, Question] = {q.id: q for q in db.get_questions_by_ids(submitted_ids)}
    diagnostic_questions: List[Question] = []
    new_attempts: List[Attempt] = []

    for ans in req.answers:
        q = question_map.get(ans.question_id)
        if q is None:
            raise HTTPException(
                status_code=404,
                detail=f"Question '{ans.question_id}' not found.",
            )
        is_correct = q.correct_option_index == ans.selected_option_index
        attempt = Attempt(
            user_id=req.user_id,
            question_id=ans.question_id,
            selected_option_index=ans.selected_option_index,
            is_correct=is_correct,
            timestamp=datetime.utcnow(),
        )
        db.record_attempt(attempt)
        diagnostic_questions.append(q)
        new_attempts.append(attempt)

    ai_profile = ai_engine.analyze_diagnostic(diagnostic_questions, new_attempts)

    # Also update/persist the schemas-layer profile in db
    db_profile = db.get_or_create_profile(req.user_id)
    for tid, stats in ai_profile.items():
        db_profile.topics[tid] = TopicStats(
            topic_id=tid,
            accuracy=stats.accuracy,
            attempts=stats.attempt_count,
            correct=stats.correct_count,
            level=TopicStats.compute_level(stats.accuracy),
        )
    db.save_profile(db_profile)

    schema_profile = _to_schema_skill_profile(req.user_id, ai_profile)

    next_q = choose_next_question_for_user(req.user_id, ai_profile)

    return SubmitDiagnosticResponse(
        skill_profile=schema_profile,
        next_question=next_q.to_public(),
    )


# ---------------------------------------------------------------------------
# Endpoint: POST /api/session/submit_answer
# ---------------------------------------------------------------------------

@router.post("/submit_answer", response_model=SubmitAnswerResponse)
def submit_answer(req: SubmitAnswerRequest) -> SubmitAnswerResponse:
    """
    Score a single MCQ answer in the adaptive practice loop.

    Flow
    ----
    1. Look up the question; 404 if missing.
    2. Evaluate correctness.
    3. Persist the Attempt.
    4. Incrementally update the skill profile (re-analyse from all attempts).
    5. Generate a rule-based explanation tailored to the user's accuracy level.
    6. Pick the next question.
    7. Return SubmitAnswerResponse.
    """
    question = db.get_question_by_id(req.question_id)
    if question is None:
        raise HTTPException(
            status_code=404,
            detail=f"Question '{req.question_id}' not found.",
        )

    is_correct = question.correct_option_index == req.selected_option_index

    attempt = Attempt(
        user_id=req.user_id,
        question_id=req.question_id,
        selected_option_index=req.selected_option_index,
        is_correct=is_correct,
        timestamp=datetime.utcnow(),
    )
    db.record_attempt(attempt)

    all_attempts = get_user_attempts(req.user_id)
    ai_profile = ai_engine.analyze_diagnostic(db.get_all_questions(), all_attempts)

    # Persist updated stats back into the db-layer profile
    db_profile = db.get_or_create_profile(req.user_id)
    for tid, stats in ai_profile.items():
        db_profile.topics[tid] = TopicStats(
            topic_id=tid,
            accuracy=stats.accuracy,
            attempts=stats.attempt_count,
            correct=stats.correct_count,
            level=TopicStats.compute_level(stats.accuracy),
        )
    db.save_profile(db_profile)

    explanation = _generate_explanation(question, attempt, ai_profile)

    # Every _REVIEW_INJECTION_INTERVAL answers, serve an overdue review question
    # instead of a fresh adaptive one.
    answer_count = review_scheduler.increment_answer_counter(req.user_id)
    is_review = False
    if answer_count % _REVIEW_INJECTION_INTERVAL == 0:
        # Convert schemas.question types to ai_engine types for the scheduler.
        engine_questions = [
            ai_engine.Question(**q.model_dump()) for q in db.get_all_questions()
        ]
        engine_attempts = [
            ai_engine.Attempt(**a.model_dump()) for a in all_attempts
        ]
        due = review_scheduler.get_due_reviews(
            user_id=req.user_id,
            all_questions=engine_questions,
            attempts=engine_attempts,
            skill_profile=ai_profile,
            now=attempt.timestamp,
            limit=1,
        )
        if due:
            review_item = due[0]
            next_q_public = QuestionPublic(
                id=review_item.question.id,
                topic_id=review_item.question.topic_id,
                text=review_item.question.text,
                options=review_item.question.options,
                difficulty=review_item.question.difficulty,
                tags=review_item.question.tags,
            )
            is_review = True
        else:
            next_q_public = choose_next_question_for_user(req.user_id, ai_profile).to_public()
    else:
        next_q_public = choose_next_question_for_user(req.user_id, ai_profile).to_public()

    topic_summary: Optional[TopicStats] = db_profile.topics.get(question.topic_id)

    return SubmitAnswerResponse(
        is_correct=is_correct,
        explanation=explanation,
        next_question=next_q_public,
        skill_summary=topic_summary,
        is_review=is_review,
    )


# ---------------------------------------------------------------------------
# Endpoint: GET /api/session/assessment
# ---------------------------------------------------------------------------

@router.get("/assessment", response_model=AssessmentResponse)
def get_assessment(user_id: str) -> AssessmentResponse:
    """Return the per-topic skill summary for the given user.

    Recomputes the full skill profile from recorded attempts and syncs it
    to the DB-layer profile so the response always reflects the latest state.
    """
    all_attempts = get_user_attempts(user_id)

    if all_attempts:
        ai_profile = ai_engine.analyze_diagnostic(db.get_all_questions(), all_attempts)
        # Keep db-layer profile in sync
        db_profile = db.get_or_create_profile(user_id)
        for tid, stats in ai_profile.items():
            db_profile.topics[tid] = TopicStats(
                topic_id=tid,
                accuracy=stats.accuracy,
                attempts=stats.attempt_count,
                correct=stats.correct_count,
                level=TopicStats.compute_level(stats.accuracy),
            )
        db.save_profile(db_profile)
    else:
        db_profile = db.get_or_create_profile(user_id)

    return AssessmentResponse(topics=list(db_profile.topics.values()))


# ---------------------------------------------------------------------------
# Endpoint: GET /api/session/review
# ---------------------------------------------------------------------------

@router.get("/review", response_model=ReviewResponse)
def get_review(user_id: str) -> ReviewResponse:
    """
    Return spaced-repetition review questions and topic suggestions for a user.

    Fetches all attempts from Supabase, builds the skill profile, then delegates
    to review_scheduler.get_due_reviews and get_topic_suggestions.
    """
    from datetime import timezone
    all_attempts = get_user_attempts(user_id)
    now = datetime.now(timezone.utc)

    if not all_attempts:
        return ReviewResponse(review_questions=[], suggested_topics=[])

    engine_questions = [ai_engine.Question(**q.model_dump()) for q in db.get_all_questions()]
    engine_attempts = [ai_engine.Attempt(**a.model_dump()) for a in all_attempts]
    ai_profile = ai_engine.analyze_diagnostic(engine_questions, engine_attempts)

    due = review_scheduler.get_due_reviews(
        user_id=user_id,
        all_questions=engine_questions,
        attempts=engine_attempts,
        skill_profile=ai_profile,
        now=now,
        limit=10,
    )

    # Map reviewer's ReviewItemOut → schemas ReviewItem
    review_questions = [
        ReviewItem(
            question=item.question,  # type: ignore[arg-type]
            reason=item.reason if item.reason in ("low_accuracy", "not_seen_recently") else "low_accuracy",
        )
        for item in due
    ]

    topic_suggestions_raw = review_scheduler.get_topic_suggestions(
        skill_profile=ai_profile,
        all_topics=list(ai_profile.keys()),
        now=now,
        user_id=user_id,
    )

    suggested_topics = [
        SuggestedTopic(
            topic_id=s.topic_id,
            reason=s.reason if s.reason in ("low_accuracy", "not_seen_recently") else "low_accuracy",
        )
        for s in topic_suggestions_raw
    ]

    return ReviewResponse(review_questions=review_questions, suggested_topics=suggested_topics)

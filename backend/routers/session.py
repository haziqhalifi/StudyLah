"""
Session router – Phase 2 learning flow.

Endpoints
---------
POST /api/session/start_diagnostic   – return diagnostic question set
POST /api/session/submit_diagnostic  – score diagnostic, build skill profile, pick first question
POST /api/session/submit_answer      – score one answer, explain, pick next question
GET  /api/session/assessment         – return per-topic skill summary for a user

All AI calls are rule-based stubs; every integration point is marked
# TODO: integrate ai_engine.* so the real calls can be dropped in later.
"""

from __future__ import annotations

import random
from datetime import datetime
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException

import db
from schemas.question import Attempt, Question, QuestionPublic, SkillProfile, TopicStats
from schemas.session import (
    AssessmentResponse,
    DiagnosticAnswer,
    Explanation,
    StartDiagnosticRequest,
    StartDiagnosticResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    SubmitDiagnosticRequest,
    SubmitDiagnosticResponse,
)
from services import ai_engine, review_scheduler
from services.ai_engine import SkillStats

router = APIRouter(prefix="/api/session", tags=["session"])


# ---------------------------------------------------------------------------
# In-memory stubs (replace with real DB queries)
# ---------------------------------------------------------------------------

# TODO: Replace these with real database queries
QUESTIONS_DB: List[Question] = db.QUESTION_BANK          # aliased for clarity
ATTEMPTS_DB:  List[Attempt]  = []                         # shadowed by db.user_attempts


# ---------------------------------------------------------------------------
# Helper: fetch questions filtered by topic
# ---------------------------------------------------------------------------

def get_questions_by_topic(topic_id: str) -> List[Question]:
    # TODO: Replace with a real DB query filtered by topic_id
    return [q for q in QUESTIONS_DB if q.topic_id == topic_id]


# ---------------------------------------------------------------------------
# Helper: fetch all attempts for a user
# ---------------------------------------------------------------------------

def get_user_attempts(user_id: str) -> List[Attempt]:
    # TODO: Replace with a real DB query filtered by user_id
    return db.get_user_attempts(user_id)


# ---------------------------------------------------------------------------
# Helper: pick diagnostic questions from a topic
# ---------------------------------------------------------------------------

_DIAGNOSTIC_COUNT   = 5
_DIAGNOSTIC_WEIGHTS = {"easy": 3, "medium": 2, "hard": 1}


def select_diagnostic_questions(topic_id: str) -> List[Question]:
    """
    Return a small, mixed-difficulty set for the diagnostic.

    Strategy: prefer easy and medium questions; hard ones are allowed but
    weighted lower so beginners are not immediately overwhelmed.

    # TODO: integrate ai_engine.select_diagnostic_questions(...) once available.
    """
    pool = get_questions_by_topic(topic_id)
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
# Helper: build an ai_engine SkillProfile (Dict[str, SkillStats]) for a user
# ---------------------------------------------------------------------------

def _build_ai_skill_profile(user_id: str) -> ai_engine.SkillProfile:
    """
    Reconstruct an ai_engine.SkillProfile from the user's recorded attempts.

    The ai_engine uses its own SkillProfile type alias (Dict[str, SkillStats])
    which is separate from schemas.question.SkillProfile (a Pydantic model).
    This helper bridges the two.

    # TODO: cache / persist this in the DB so it doesn't recompute each request.
    """
    attempts = get_user_attempts(user_id)
    questions = QUESTIONS_DB
    return ai_engine.analyze_diagnostic(questions, attempts)


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
    """
    Pick the next question using the AI engine's adaptive heuristic.

    Prefers questions from the weakest topic at an appropriate difficulty.

    # TODO: Replace with ai_engine.choose_next_question(...) — already implemented
    #       in services/ai_engine.py; wire up once caller signatures are finalised.
    """
    attempts = get_user_attempts(user_id)
    # TODO: integrate ai_engine.choose_next_question(ai_profile, QUESTIONS_DB, attempts)
    return ai_engine.choose_next_question(ai_profile, QUESTIONS_DB, attempts)


# ---------------------------------------------------------------------------
# Helper: rule-based explanation generator
# ---------------------------------------------------------------------------

def _generate_explanation(
    question: Question,
    attempt: Attempt,
    ai_profile: ai_engine.SkillProfile,
) -> Explanation:
    """
    Delegate to the AI engine's rule-based explanation stub.

    # TODO: integrate ai_engine.generate_explanation(...) — already implemented.
    #       This wrapper exists so the call site only imports schemas.Explanation.
    """
    # TODO: Call ai_engine.generate_explanation(...) here instead of rule-based text
    engine_expl = ai_engine.generate_explanation(question, attempt, ai_profile)
    return Explanation(text=engine_expl.text, style=engine_expl.style)


# ---------------------------------------------------------------------------
# Endpoint: POST /api/session/start_diagnostic
# ---------------------------------------------------------------------------

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

    question_map: Dict[str, Question] = {q.id: q for q in QUESTIONS_DB}
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

    # Build AI engine skill profile from all attempts (diagnostic + any prior)
    # TODO: integrate ai_engine.analyze_diagnostic once DB persistence is in place
    all_attempts = get_user_attempts(req.user_id)
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

    # TODO: Replace choose_next_question_for_user with ai_engine.choose_next_question(...)
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

    # Rebuild AI profile from full attempt history (includes the new attempt)
    all_attempts = get_user_attempts(req.user_id)
    # TODO: integrate ai_engine.apply_incremental_update(...) for O(1) update
    #       once that function is available, instead of recomputing the full profile.
    ai_profile = ai_engine.analyze_diagnostic(QUESTIONS_DB, all_attempts)

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

    # TODO: Call ai_engine.generate_explanation(...) here instead of rule-based text
    explanation = _generate_explanation(question, attempt, ai_profile)

    # Review injection: every 4th answer, check for overdue reviews and serve one
    # instead of a fresh adaptive question.
    # TODO: Make the review injection frequency dynamic (e.g., based on how many
    #       reviews are overdue vs total questions remaining).
    answer_count = review_scheduler.increment_answer_counter(req.user_id)
    is_review = False
    if answer_count % 4 == 0:
        # Convert schemas.question types to ai_engine types for the scheduler.
        engine_questions = [
            ai_engine.Question(**q.model_dump()) for q in QUESTIONS_DB
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
        # TODO: Call ai_engine.choose_next_question(...) here for more advanced logic
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
    """
    Return the per-topic skill summary for the given user.

    Recomputes the full skill profile from recorded attempts so the response
    always reflects the latest state.

    # TODO: Replace recomputation with a DB read once profiles are persisted.
    """
    all_attempts = get_user_attempts(user_id)

    if all_attempts:
        ai_profile = ai_engine.analyze_diagnostic(QUESTIONS_DB, all_attempts)
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

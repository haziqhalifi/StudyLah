"""
Review router – Growtrics-inspired spaced repetition (Phase 5).

Endpoints
---------
GET  /api/session/review              – due review questions with SR state info
POST /api/session/review/submit       – score answer, advance SR schedule
GET  /api/spaced-rep/summary          – topic-level SR health (dashboard widget)
GET  /api/recommendations/study_plan  – topic study plan with Claude summary
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend import db
from backend.schemas.question import Attempt, TopicStats
from backend.schemas.session import Explanation
from backend.services import ai_engine
from backend.services.review_scheduler import (
    TopicSuggestion,
    get_topic_suggestions,
)
from backend.services.spaced_rep_engine import (
    ReviewState,
    TopicSummary,
    get_engine,
)

router = APIRouter(tags=["review"])

_claude = anthropic.Anthropic()
_engine = get_engine()


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class ReviewQuestionOut(BaseModel):
    id: str
    topic_id: str
    text: str
    options: List[str]
    difficulty: Literal["easy", "medium", "hard"]
    tags: List[str]


class ReviewStateOut(BaseModel):
    status: Literal["learning", "reviewing", "mastered"]
    next_review_at: Optional[datetime]
    interval_days: float


class ReviewItemOut(BaseModel):
    question: ReviewQuestionOut
    reason: str          # "new" | "due_for_review" | "overdue" | "learning" | "low_accuracy" | ...
    status: Literal["learning", "reviewing", "mastered"]
    next_review_at: Optional[datetime] = None
    is_overdue: bool = False


class ReviewResponse(BaseModel):
    review_items: List[ReviewItemOut]
    suggested_topics: List[TopicSuggestion]
    caught_up: bool = False


class ReviewSubmitRequest(BaseModel):
    user_id: str
    question_id: str
    selected_option_index: int


class ReviewSubmitResponse(BaseModel):
    is_correct: bool
    explanation: Explanation
    next_review_at: datetime        # kept for backward compat with existing frontend
    review_state: ReviewStateOut    # richer SR info for the upgraded UI


class SpacedRepSummaryResponse(BaseModel):
    topics: List[TopicSummary]


class StudyPlanResponse(BaseModel):
    suggested_topics: List[TopicSuggestion]
    summary: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_ai_skill_profile(user_id: str) -> ai_engine.SkillProfile:
    attempts = db.get_user_attempts(user_id)
    return ai_engine.analyze_diagnostic(db.get_all_questions(), attempts)


def _all_topic_ids() -> List[str]:
    return list({q.topic_id for q in db.get_all_questions()})


def _reason_and_overdue(state: ReviewState, now: datetime) -> tuple[str, bool]:
    """Derive a human-readable reason label and overdue flag from a ReviewState."""
    if state.last_review_at is None:
        return "new", False
    if state.next_review_at is not None and state.next_review_at < now:
        overdue_hours = (now - state.next_review_at).total_seconds() / 3600
        return ("overdue", True) if overdue_hours > 24 else ("due_for_review", False)
    if state.status == "learning":
        return "learning", False
    return "due_for_review", False


def _claude_study_summary(
    suggested_topics: List[TopicSuggestion],
    ai_profile: ai_engine.SkillProfile,
    overdue_count: int,
) -> str:
    topic_lines = "\n".join(
        f"- {t.topic_name} (priority: {t.priority}, reason: {t.reason})"
        for t in suggested_topics
    )
    accuracy_lines = "\n".join(
        f"- {tid}: {stats.correct_count}/{stats.attempt_count} correct"
        f" ({int(stats.correct_count / stats.attempt_count * 100) if stats.attempt_count else 0}%)"
        for tid, stats in ai_profile.items()
    )
    prompt = (
        "You are a warm, encouraging study coach for a student using a spaced-repetition learning app.\n\n"
        f"Suggested topics (ordered by priority):\n{topic_lines}\n\n"
        f"Student accuracy per topic:\n{accuracy_lines}\n\n"
        f"Overdue reviews: {overdue_count}\n\n"
        "Write a personalised 2-3 sentence study plan summary. Be specific — mention the top priority topic "
        "by name and the overdue count if > 0. End with a short word of encouragement. "
        "Do not use bullet points or headers, just plain sentences."
    )
    response = _claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


# ---------------------------------------------------------------------------
# GET /api/session/review
# ---------------------------------------------------------------------------

@router.get("/api/session/review", response_model=ReviewResponse)
def get_review(user_id: str, limit: int = 5) -> ReviewResponse:
    """
    Return due review questions for a user, driven by the spaced-rep schedule.

    Questions are selected in priority order:
      1. "learning" items due now (recently failed, short interval)
      2. "reviewing" items due now (progressing, medium interval)
      3. "mastered" items due now (held back until the optimal moment)
      4. Supplement with unseen questions if the schedule has fewer than `limit`

    When no items are due, returns caught_up=True so the frontend can show
    the "all caught up" state instead of an empty list.
    """
    all_questions = db.get_all_questions()
    attempts = db.get_user_attempts(user_id)
    ai_profile = ai_engine.analyze_diagnostic(all_questions, attempts)
    now = datetime.now(timezone.utc)

    due_states = _engine.get_due_reviews(
        user_id=user_id,
        now=now,
        all_questions=all_questions,
        attempts=attempts,
        max_items=limit,
    )

    review_items: List[ReviewItemOut] = []
    for state in due_states:
        q = db.get_question_by_id(state.question_id)
        if q is None:
            continue
        reason, is_overdue = _reason_and_overdue(state, now)
        review_items.append(
            ReviewItemOut(
                question=ReviewQuestionOut(
                    id=q.id,
                    topic_id=q.topic_id,
                    text=q.text,
                    options=q.options,
                    difficulty=q.difficulty,
                    tags=q.tags,
                ),
                reason=reason,
                status=state.status,
                next_review_at=state.next_review_at,
                is_overdue=is_overdue,
            )
        )

    topic_ids = _all_topic_ids()
    suggested_topics = get_topic_suggestions(
        skill_profile=ai_profile,
        all_topics=topic_ids,
        now=now,
        user_id=user_id,
    )

    return ReviewResponse(
        review_items=review_items,
        suggested_topics=suggested_topics,
        caught_up=len(review_items) == 0,
    )


# ---------------------------------------------------------------------------
# POST /api/session/review/submit
# ---------------------------------------------------------------------------

@router.post("/api/session/review/submit", response_model=ReviewSubmitResponse)
def submit_review(req: ReviewSubmitRequest) -> ReviewSubmitResponse:
    """
    Score a review answer, update the SR schedule, and return the next window.

    The spaced-rep engine decides the next interval:
      - Correct → longer interval, higher ease factor, status may → mastered
      - Wrong   → 0.5-day interval, lower ease factor, status → learning
    """
    question = db.get_question_by_id(req.question_id)
    if question is None:
        raise HTTPException(
            status_code=404,
            detail=f"Question '{req.question_id}' not found.",
        )

    is_correct = question.correct_option_index == req.selected_option_index
    now = datetime.now(timezone.utc)

    # Record attempt
    attempt = Attempt(
        user_id=req.user_id,
        question_id=req.question_id,
        selected_option_index=req.selected_option_index,
        is_correct=is_correct,
        timestamp=now,
    )
    db.record_attempt(attempt)

    # Rebuild and persist skill profile
    all_attempts = db.get_user_attempts(req.user_id)
    ai_profile = ai_engine.analyze_diagnostic(db.get_all_questions(), all_attempts)
    db_profile = db.get_or_create_profile(req.user_id)
    for tid, stats in ai_profile.items():
        db_profile.topics[tid] = TopicStats(
            topic_id=tid,
            accuracy=stats.correct_count / stats.attempt_count if stats.attempt_count else 0.0,
            attempts=stats.attempt_count,
            correct=stats.correct_count,
            level=TopicStats.compute_level(
                stats.correct_count / stats.attempt_count if stats.attempt_count else 0.0
            ),
        )
    db.save_profile(db_profile)

    # Generate explanation
    engine_expl = ai_engine.generate_explanation(question, attempt, ai_profile)
    explanation = Explanation(text=engine_expl.text, style=engine_expl.style)

    # Advance spaced-repetition schedule
    existing_state = _engine.get_state(req.user_id, req.question_id)
    updated_state = _engine.update_review_state(
        state=existing_state,
        is_correct=is_correct,
        now=now,
        user_id=req.user_id,
        question_id=req.question_id,
        topic_id=question.topic_id,
    )

    # next_review_at is always set by update_review_state; fall back to now defensively
    next_review_at = updated_state.next_review_at or now

    return ReviewSubmitResponse(
        is_correct=is_correct,
        explanation=explanation,
        next_review_at=next_review_at,
        review_state=ReviewStateOut(
            status=updated_state.status,
            next_review_at=updated_state.next_review_at,
            interval_days=updated_state.interval_days,
        ),
    )


# ---------------------------------------------------------------------------
# GET /api/spaced-rep/summary
# ---------------------------------------------------------------------------

@router.get("/api/spaced-rep/summary", response_model=SpacedRepSummaryResponse)
def get_spaced_rep_summary(user_id: str) -> SpacedRepSummaryResponse:
    """
    Topic-level SR health snapshot for the dashboard widget.

    Returns per-topic due/overdue counts and next scheduled review time.
    Use this to mirror the Growtrics narrative: "mastered topics held back
    until the perfect review moment."
    """
    now = datetime.now(timezone.utc)
    topic_ids = _all_topic_ids()
    summaries = _engine.get_topic_summary(
        user_id=user_id, now=now, all_topic_ids=topic_ids
    )
    return SpacedRepSummaryResponse(topics=summaries)


# ---------------------------------------------------------------------------
# GET /api/recommendations/study_plan
# ---------------------------------------------------------------------------

@router.get("/api/recommendations/study_plan", response_model=StudyPlanResponse)
def get_study_plan(user_id: str) -> StudyPlanResponse:
    """Topic-level study plan with a Claude-generated personalised summary."""
    ai_profile = _build_ai_skill_profile(user_id)
    now = datetime.now(timezone.utc)
    topic_ids = _all_topic_ids()

    suggested_topics = get_topic_suggestions(
        skill_profile=ai_profile,
        all_topics=topic_ids,
        now=now,
        user_id=user_id,
    )

    overdue_count = len(
        _engine.get_due_reviews(user_id=user_id, now=now, max_items=50)
    )

    if not ai_profile:
        summary = "Start your first session so I can build your study plan!"
    else:
        try:
            summary = _claude_study_summary(suggested_topics, ai_profile, overdue_count)
        except Exception:
            high_priority = [t for t in suggested_topics if t.priority == "high"]
            if high_priority:
                summary = (
                    f"Focus on {high_priority[0].topic_name} today. "
                    f"You have {overdue_count} overdue review(s) waiting."
                )
            elif overdue_count > 0:
                summary = (
                    f"You have {overdue_count} overdue review(s). "
                    "Complete them to keep your knowledge fresh!"
                )
            else:
                summary = "Great work — no overdue reviews. Keep up the momentum!"

    return StudyPlanResponse(suggested_topics=suggested_topics, summary=summary)

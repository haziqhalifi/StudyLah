"""
Review router – Phase 4 spaced-repetition and scheduling.

Endpoints
---------
GET  /api/review/session/review         – return due review questions + topic suggestions
POST /api/review/session/review/submit  – score a review answer, advance schedule
GET  /api/recommendations/study_plan    – topic-level study plan suggestion

All AI calls are rule-based stubs; every integration point is marked
# TODO: Call Claude here with a concise prompt sketch.

# TODO: Replace in-memory store with database queries for production.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import db
from schemas.question import Attempt, TopicStats
from schemas.session import Explanation
from services import ai_engine, review_scheduler
from services.review_scheduler import (
    ReviewItemOut,
    ReviewResponse,
    ReviewScheduleEntry,
    TopicSuggestion,
    get_due_reviews,
    get_topic_suggestions,
    mark_reviewed,
)

router = APIRouter(tags=["review"])


# ---------------------------------------------------------------------------
# Request / response schemas (review-specific)
# ---------------------------------------------------------------------------

class ReviewSubmitRequest(BaseModel):
    user_id: str
    question_id: str
    selected_option_index: int


class ReviewSubmitResponse(BaseModel):
    is_correct: bool
    explanation: Explanation
    next_review_at: datetime


class StudyPlanResponse(BaseModel):
    suggested_topics: List[TopicSuggestion]
    summary: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_ai_skill_profile(user_id: str) -> ai_engine.SkillProfile:
    """Reconstruct the ai_engine skill profile from the user's full attempt history."""
    attempts = db.get_user_attempts(user_id)
    return ai_engine.analyze_diagnostic(db.QUESTION_BANK, attempts)


def _all_topic_ids() -> List[str]:
    """Return the distinct set of topic_ids present in the question bank."""
    return list({q.topic_id for q in db.QUESTION_BANK})


# ---------------------------------------------------------------------------
# GET /api/review/session/review
# ---------------------------------------------------------------------------

@router.get("/api/review/session/review", response_model=ReviewResponse)
def get_review(user_id: str, limit: int = 5) -> ReviewResponse:
    """Return due review questions and topic study suggestions for a user.

    Args:
        user_id: The student's identifier (query param).
        limit: Maximum number of review questions to return (default 5).

    Returns:
        ReviewResponse with:
          - review_items: questions due now, each with a reason tag.
          - suggested_topics: topics ranked by priority.

    Behaviour:
        Loads the user's attempts and skill profile from the in-memory store,
        calls review_scheduler.get_due_reviews and get_topic_suggestions,
        and returns the combined result.
        If no reviews are due, review_items will be empty.

    # TODO: Replace in-memory store with database queries for production.
    """
    attempts = db.get_user_attempts(user_id)
    ai_profile = _build_ai_skill_profile(user_id)
    now = datetime.utcnow()

    review_items = get_due_reviews(
        user_id=user_id,
        all_questions=db.QUESTION_BANK,
        attempts=attempts,
        skill_profile=ai_profile,
        now=now,
        limit=limit,
    )

    topic_ids = _all_topic_ids()
    suggested_topics = get_topic_suggestions(
        skill_profile=ai_profile,
        all_topics=topic_ids,
        now=now,
    )

    return ReviewResponse(
        review_items=review_items,
        suggested_topics=suggested_topics,
    )


# ---------------------------------------------------------------------------
# POST /api/review/session/review/submit
# ---------------------------------------------------------------------------

@router.post("/api/review/session/review/submit", response_model=ReviewSubmitResponse)
def submit_review(req: ReviewSubmitRequest) -> ReviewSubmitResponse:
    """Score a review answer, update the skill profile, and advance the schedule.

    Args:
        req.user_id: The student's identifier.
        req.question_id: The question that was reviewed.
        req.selected_option_index: The student's chosen option (0-indexed).

    Returns:
        ReviewSubmitResponse with:
          - is_correct: bool
          - explanation: Explanation (rule-based style selection from ai_engine)
          - next_review_at: datetime when this question is next due

    Behaviour:
        1. Look up the question; 404 if not found.
        2. Evaluate correctness against correct_option_index.
        3. Persist an Attempt via db.record_attempt.
        4. Rebuild skill profile and persist updated TopicStats.
        5. Generate a rule-based explanation via ai_engine.generate_explanation.
        6. Call review_scheduler.mark_reviewed to advance the SM-2 schedule.
        7. Return the response.

    # TODO: Replace in-memory store with database queries for production.
    """
    question = db.get_question_by_id(req.question_id)
    if question is None:
        raise HTTPException(
            status_code=404,
            detail=f"Question '{req.question_id}' not found.",
        )

    is_correct = question.correct_option_index == req.selected_option_index
    now = datetime.utcnow()

    attempt = Attempt(
        user_id=req.user_id,
        question_id=req.question_id,
        selected_option_index=req.selected_option_index,
        is_correct=is_correct,
        timestamp=now,
    )
    db.record_attempt(attempt)

    # Rebuild AI profile from full attempt history (includes the new attempt).
    all_attempts = db.get_user_attempts(req.user_id)
    ai_profile = ai_engine.analyze_diagnostic(db.QUESTION_BANK, all_attempts)

    # Persist updated stats back into the db-layer profile.
    db_profile = db.get_or_create_profile(req.user_id)
    for tid, stats in ai_profile.items():
        db_profile.topics[tid] = TopicStats(
            topic_id=tid,
            accuracy=stats.accuracy,
            attempts=stats.attempt_count,
            correct=stats.correct_count,
            level=TopicStats.compute_level(stats.accuracy),
        )

    # Rule-based explanation – style chosen from topic accuracy.
    engine_expl = ai_engine.generate_explanation(question, attempt, ai_profile)
    explanation = Explanation(text=engine_expl.text, style=engine_expl.style)

    # Advance the spaced-repetition schedule.
    schedule_entry: ReviewScheduleEntry = mark_reviewed(
        user_id=req.user_id,
        question_id=req.question_id,
        topic_id=question.topic_id,
        is_correct=is_correct,
        now=now,
    )

    return ReviewSubmitResponse(
        is_correct=is_correct,
        explanation=explanation,
        next_review_at=schedule_entry.next_review_at,
    )


# ---------------------------------------------------------------------------
# GET /api/recommendations/study_plan
# ---------------------------------------------------------------------------

@router.get("/api/recommendations/study_plan", response_model=StudyPlanResponse)
def get_study_plan(user_id: str) -> StudyPlanResponse:
    """Return a topic-level study plan with a plain-text summary for the user.

    Args:
        user_id: The student's identifier (query param).

    Returns:
        StudyPlanResponse with:
          - suggested_topics: list of TopicSuggestion sorted by priority.
          - summary: a placeholder summary string.

    Behaviour:
        Loads the skill profile, calls get_topic_suggestions, counts overdue
        reviews, and assembles a rule-based summary string.

    # TODO: Call Claude here to generate a warm, encouraging, 2-3 sentence
    #       study plan summary personalised to the student's current skill
    #       profile and review backlog.
    #       Prompt: ordered suggested_topics list, skill_profile snapshot
    #               (accuracy per topic), overdue_count, student's display name.
    #       Claude returns: 2-3 sentences, e.g.
    #           "Focus on Quadratic Equations today — you scored 30% last time
    #            and have 3 overdue reviews waiting. After that, a quick look at
    #            Indices before you sleep will keep it fresh. You're doing great!"
    """
    ai_profile = _build_ai_skill_profile(user_id)
    now = datetime.utcnow()
    topic_ids = _all_topic_ids()

    suggested_topics = get_topic_suggestions(
        skill_profile=ai_profile,
        all_topics=topic_ids,
        now=now,
    )

    # Count overdue reviews across all questions for this user.
    overdue_count = len(
        get_due_reviews(
            user_id=user_id,
            all_questions=db.QUESTION_BANK,
            attempts=db.get_user_attempts(user_id),
            skill_profile=ai_profile,
            now=now,
            limit=50,
        )
    )

    # Build a simple rule-based summary.
    high_priority = [t for t in suggested_topics if t.priority == "high"]
    if high_priority:
        weakest = high_priority[0].topic_name
        summary = (
            f"Focus on {weakest} today. "
            f"You have {overdue_count} overdue review(s) waiting."
        )
    elif overdue_count > 0:
        summary = (
            f"You have {overdue_count} overdue review(s). "
            "Complete them to keep your knowledge fresh!"
        )
    else:
        summary = "Great work — no overdue reviews. Keep up the momentum!"

    # TODO: Replace summary above with a Claude-generated personalised message.

    return StudyPlanResponse(
        suggested_topics=suggested_topics,
        summary=summary,
    )

"""
Review router – Phase 4 spaced-repetition and scheduling.

Endpoints
---------
GET  /api/review/session/review         – return due review questions + topic suggestions
POST /api/review/session/review/submit  – score a review answer, advance schedule
GET  /api/recommendations/study_plan    – topic-level study plan suggestion
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend import db
from backend.schemas.question import Attempt, TopicStats
from backend.schemas.session import Explanation
from backend.services import ai_engine, review_scheduler
from backend.services.review_scheduler import (
    ReviewItemOut,
    ReviewResponse,
    ReviewScheduleEntry,
    TopicSuggestion,
    get_due_reviews,
    get_topic_suggestions,
    mark_reviewed,
)

router = APIRouter(tags=["review"])

_claude = anthropic.Anthropic()


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
    attempts = db.get_user_attempts(user_id)
    return ai_engine.analyze_diagnostic(db.get_all_questions(), attempts)


def _all_topic_ids() -> List[str]:
    return list({q.topic_id for q in db.get_all_questions()})


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
# GET /api/review/session/review
# ---------------------------------------------------------------------------

@router.get("/api/review/session/review", response_model=ReviewResponse)
def get_review(user_id: str, limit: int = 5) -> ReviewResponse:
    """Return due review questions and topic study suggestions for a user."""
    attempts = db.get_user_attempts(user_id)
    ai_profile = _build_ai_skill_profile(user_id)
    now = datetime.now(timezone.utc)

    review_items = get_due_reviews(
        user_id=user_id,
        all_questions=db.get_all_questions(),
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
        user_id=user_id,
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
    """Score a review answer, update the skill profile, and advance the schedule."""
    question = db.get_question_by_id(req.question_id)
    if question is None:
        raise HTTPException(
            status_code=404,
            detail=f"Question '{req.question_id}' not found.",
        )

    is_correct = question.correct_option_index == req.selected_option_index
    now = datetime.now(timezone.utc)

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
    ai_profile = ai_engine.analyze_diagnostic(db.get_all_questions(), all_attempts)

    # Persist updated stats back into the db-layer profile.
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
    """Return a topic-level study plan with a Claude-generated summary for the user."""
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
        get_due_reviews(
            user_id=user_id,
            all_questions=db.get_all_questions(),
            attempts=db.get_user_attempts(user_id),
            skill_profile=ai_profile,
            now=now,
            limit=50,
        )
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

    return StudyPlanResponse(
        suggested_topics=suggested_topics,
        summary=summary,
    )

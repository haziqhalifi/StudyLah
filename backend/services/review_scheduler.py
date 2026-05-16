"""
Spaced-repetition scheduling layer for StudyLah.

Persists review state per (user_id, question_id) in Supabase.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel

from services import ai_engine
from services.ai_engine import Question, Attempt, SkillProfile
from supabase_client import supabase


# ---------------------------------------------------------------------------
# Public Pydantic models
# ---------------------------------------------------------------------------

class ReviewQuestionOut(BaseModel):
    id: str
    topic_id: str
    text: str
    options: List[str]
    difficulty: Literal["easy", "medium", "hard"]
    tags: List[str]


class ReviewItemOut(BaseModel):
    question: ReviewQuestionOut
    reason: Literal["low_accuracy", "not_seen_recently", "weak_topic"]


class TopicSuggestion(BaseModel):
    topic_id: str
    topic_name: str
    reason: str
    priority: Literal["high", "medium", "low"]


class ReviewResponse(BaseModel):
    review_items: List[ReviewItemOut]
    suggested_topics: List[TopicSuggestion]


class ReviewScheduleEntry(BaseModel):
    user_id: str
    question_id: str
    topic_id: str
    last_reviewed_at: datetime
    times_reviewed: int
    times_correct: int
    next_review_at: datetime
    current_interval_minutes: int = 5


# ---------------------------------------------------------------------------
# SM-2 interval helpers
# ---------------------------------------------------------------------------

_FIRST_INTERVAL_MINUTES = 5
_SECOND_INTERVAL_MINUTES = 30
_MAX_INTERVAL_MINUTES = 1440


def _next_interval(entry: ReviewScheduleEntry, is_correct: bool) -> int:
    if not is_correct:
        return _FIRST_INTERVAL_MINUTES
    reviewed = entry.times_reviewed
    if reviewed == 0:
        return _FIRST_INTERVAL_MINUTES
    if reviewed == 1:
        return _SECOND_INTERVAL_MINUTES
    return min(entry.current_interval_minutes * 2, _MAX_INTERVAL_MINUTES)


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _get_entry(user_id: str, question_id: str) -> Optional[ReviewScheduleEntry]:
    row = (
        supabase.table("studylah_review_schedule")
        .select("*")
        .eq("user_id", user_id)
        .eq("question_id", question_id)
        .maybe_single()
        .execute()
    )
    if row.data:
        return ReviewScheduleEntry(**row.data)
    return None


def _get_user_schedule(user_id: str) -> Dict[str, ReviewScheduleEntry]:
    rows = (
        supabase.table("studylah_review_schedule")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    return {r["question_id"]: ReviewScheduleEntry(**r) for r in rows.data}


def _save_entry(entry: ReviewScheduleEntry) -> None:
    supabase.table("studylah_review_schedule").upsert(
        {
            "user_id": entry.user_id,
            "question_id": entry.question_id,
            "topic_id": entry.topic_id,
            "last_reviewed_at": entry.last_reviewed_at.isoformat(),
            "times_reviewed": entry.times_reviewed,
            "times_correct": entry.times_correct,
            "next_review_at": entry.next_review_at.isoformat(),
            "current_interval_minutes": entry.current_interval_minutes,
        },
        on_conflict="user_id,question_id",
    ).execute()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_due_reviews(
    user_id: str,
    all_questions: List[Question],
    attempts: List[Attempt],
    skill_profile: SkillProfile,
    now: datetime,
    limit: int = 5,
) -> List[ReviewItemOut]:
    ranked: List[ai_engine.ReviewItem] = ai_engine.select_review_questions(
        skill_profile=skill_profile,
        all_questions=all_questions,
        attempts=attempts,
        now=now,
        top_n=limit * 3,
    )

    schedule = _get_user_schedule(user_id)

    due: List[ReviewItemOut] = []
    for item in ranked:
        if len(due) >= limit:
            break
        entry = schedule.get(item.question.id)
        if entry is not None and entry.next_review_at > now:
            continue
        q = item.question
        due.append(
            ReviewItemOut(
                question=ReviewQuestionOut(
                    id=q.id,
                    topic_id=q.topic_id,
                    text=q.text,
                    options=q.options,
                    difficulty=q.difficulty,
                    tags=q.tags,
                ),
                reason=item.reason,
            )
        )

    return due


def mark_reviewed(
    user_id: str,
    question_id: str,
    topic_id: str,
    is_correct: bool,
    now: datetime,
) -> ReviewScheduleEntry:
    entry = _get_entry(user_id, question_id)

    if entry is None:
        entry = ReviewScheduleEntry(
            user_id=user_id,
            question_id=question_id,
            topic_id=topic_id,
            last_reviewed_at=now,
            times_reviewed=0,
            times_correct=0,
            next_review_at=now,
            current_interval_minutes=_FIRST_INTERVAL_MINUTES,
        )

    new_interval = _next_interval(entry, is_correct)
    entry.last_reviewed_at = now
    entry.times_reviewed += 1
    if is_correct:
        entry.times_correct += 1
    entry.current_interval_minutes = new_interval
    entry.next_review_at = now + timedelta(minutes=new_interval)

    _save_entry(entry)
    return entry


def get_topic_suggestions(
    skill_profile: SkillProfile,
    all_topics: List[str],
    now: datetime,
    user_id: str = "",
) -> List[TopicSuggestion]:
    _PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}
    _24H_MINUTES = 1440

    # Fetch all schedule entries for this user once
    schedule = _get_user_schedule(user_id) if user_id else {}

    suggestions: List[TopicSuggestion] = []

    for topic_id in all_topics:
        stats = skill_profile.get(topic_id)
        if stats is None:
            continue

        topic_entries = [e for e in schedule.values() if e.topic_id == topic_id]
        most_recent_review: Optional[datetime] = (
            max(e.last_reviewed_at for e in topic_entries) if topic_entries else None
        )
        minutes_since_review: float = (
            (now - most_recent_review).total_seconds() / 60.0
            if most_recent_review is not None
            else float("inf")
        )

        if stats.estimated_level == "weak":
            priority: Literal["high", "medium", "low"] = "high"
            reason = "low_accuracy"
        elif minutes_since_review >= _24H_MINUTES:
            priority = "medium"
            reason = "not_reviewed_in_24h"
        else:
            priority = "low"
            reason = "on_track"

        topic_name = topic_id.replace("_", " ").title()
        suggestions.append(
            TopicSuggestion(
                topic_id=topic_id,
                topic_name=topic_name,
                reason=reason,
                priority=priority,
            )
        )

    suggestions.sort(key=lambda s: _PRIORITY_ORDER[s.priority])
    return suggestions


def increment_answer_counter(user_id: str) -> int:
    """Fetch the current count from Supabase attempts and return it (no separate counter table needed)."""
    row = (
        supabase.table("studylah_attempts")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    return row.count or 0

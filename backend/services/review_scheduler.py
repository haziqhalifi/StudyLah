"""
Spaced-repetition scheduling layer for StudyLah.

Tracks review state per (user_id, question_id) in an in-memory dict and
exposes three public functions used by the review router:

    get_due_reviews       – return questions whose next_review_at is overdue
    mark_reviewed         – record a review result and advance the schedule
    get_topic_suggestions – rank topics by study priority

All three are rule-based. Every Claude integration point is marked with a
# TODO: Call Claude here comment that includes a concise prompt sketch.

# TODO: Persist ReviewScheduleEntry to database instead of in-memory dict.
# TODO: Replace simplified SM-2 with Claude-modelled forgetting curve for
#       personalised interval prediction per student and topic.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel

from services import ai_engine
from services.ai_engine import Question, Attempt, SkillProfile


# ---------------------------------------------------------------------------
# Public Pydantic models
# ---------------------------------------------------------------------------

class ReviewQuestionOut(BaseModel):
    """Question payload safe for the review endpoint (no correct_option_index)."""
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
    # Internal: current interval in minutes (drives next_review_at computation).
    current_interval_minutes: int = 5


# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------

# TODO: Persist ReviewScheduleEntry to database instead of in-memory dict.
REVIEW_SCHEDULE: Dict[Tuple[str, str], ReviewScheduleEntry] = {}

# Per-user question-attempt counter used by the review-injection logic in
# session.py.  Key: user_id, value: number of answers submitted this session.
ANSWER_COUNTERS: Dict[str, int] = {}

# ---------------------------------------------------------------------------
# SM-2 interval helpers
# ---------------------------------------------------------------------------

_FIRST_INTERVAL_MINUTES = 5
_SECOND_INTERVAL_MINUTES = 30
_MAX_INTERVAL_MINUTES = 1440  # 24 hours – capped for hackathon


def _next_interval(entry: ReviewScheduleEntry, is_correct: bool) -> int:
    """Compute the next review interval in minutes using simplified SM-2 logic.

    Args:
        entry: The existing schedule entry (may have times_reviewed == 0 if new).
        is_correct: Whether the student answered correctly on this review.

    Returns:
        New interval in minutes, clamped to [5, 1440].

    Rules:
        Wrong answer      → reset to 5 minutes regardless of history.
        First review      → 5 minutes.
        Second review     → 30 minutes.
        Third+ review     → previous_interval * 2, capped at 1440 minutes.

    TODO: Replace simplified SM-2 with Claude-modelled forgetting curve for
          personalised interval prediction per student and topic.
    """
    if not is_correct:
        return _FIRST_INTERVAL_MINUTES

    reviewed = entry.times_reviewed  # before this review is recorded
    if reviewed == 0:
        return _FIRST_INTERVAL_MINUTES
    if reviewed == 1:
        return _SECOND_INTERVAL_MINUTES

    new_interval = entry.current_interval_minutes * 2
    return min(new_interval, _MAX_INTERVAL_MINUTES)


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
    """Return review questions that are currently due for this user.

    Args:
        user_id: The student's identifier.
        all_questions: Full question bank.
        attempts: All of the user's attempts (used by ai_engine scoring).
        skill_profile: Current ai_engine.SkillProfile for the user.
        now: Current UTC datetime (passed in so callers control the clock).
        limit: Maximum number of items to return.

    Returns:
        Up to `limit` ReviewItemOut objects for questions that are due.
        Questions with no schedule entry yet are treated as immediately due
        (first_interval = 5 min, so any question never reviewed is overdue
        if the user has at least one attempt on it that is > 5 min old).

    Behaviour:
        1. Calls ai_engine.select_review_questions to get priority-ranked items.
        2. For each item, looks up the ReviewScheduleEntry.
        3. Keeps only items where next_review_at <= now, or where the entry
           doesn't exist yet (treat as immediately due).

    TODO: Call Claude here to apply a personalised forgetting curve instead
          of the fixed SM-2 intervals.
          Prompt: per-question accuracy history, attempt timestamps, topic
          weakness labels from skill_profile.
          Claude returns: predicted retention scores per question, re-ranked list.
    """
    # Delegate priority ranking to the ai_engine heuristic.
    ranked: List[ai_engine.ReviewItem] = ai_engine.select_review_questions(
        skill_profile=skill_profile,
        all_questions=all_questions,
        attempts=attempts,
        now=now,
        top_n=limit * 3,  # over-fetch so we have room after filtering
    )

    due: List[ReviewItemOut] = []
    for item in ranked:
        if len(due) >= limit:
            break

        key = (user_id, item.question.id)
        entry = REVIEW_SCHEDULE.get(key)

        is_due = entry is None or entry.next_review_at <= now
        if not is_due:
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
    """Record a review result and advance the spaced-repetition schedule.

    Args:
        user_id: The student's identifier.
        question_id: The question that was reviewed.
        topic_id: Topic the question belongs to.
        is_correct: Whether the student answered correctly.
        now: Current UTC datetime.

    Returns:
        The updated (or newly created) ReviewScheduleEntry with next_review_at set.

    Behaviour:
        Finds or creates the entry for (user_id, question_id), increments
        times_reviewed, conditionally increments times_correct, recomputes
        the interval via simplified SM-2, and saves back to REVIEW_SCHEDULE.

    TODO: Replace simplified SM-2 with Claude-modelled forgetting curve.
          Prompt: full attempt history for this (user, question), topic stats,
          student's overall retention rate.
          Claude returns: recommended next review interval in minutes.
    """
    key = (user_id, question_id)
    entry = REVIEW_SCHEDULE.get(key)

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

    REVIEW_SCHEDULE[key] = entry
    return entry


def get_topic_suggestions(
    skill_profile: SkillProfile,
    all_topics: List[str],
    now: datetime,
) -> List[TopicSuggestion]:
    """Rank topics by study priority based on skill level and review recency.

    Args:
        skill_profile: Current ai_engine.SkillProfile (topic_id → SkillStats).
        all_topics: List of all topic_ids to consider (including those not yet
                    in skill_profile).
        now: Current UTC datetime.

    Returns:
        List of TopicSuggestion sorted high → medium → low priority.

    Behaviour (rule-based):
        For each topic in skill_profile:
          - estimated_level == "weak"                → priority "high",  reason "low_accuracy"
          - any review entry older than 24 h for this topic
                                                     → priority "medium", reason "not_reviewed_in_24h"
          - otherwise                                → priority "low"

        Topics not yet in skill_profile are skipped (no data yet).

    TODO: Call Claude here to generate a natural-language study plan from the
          topic suggestions.
          Prompt: ordered TopicSuggestion list, skill_profile snapshot,
          overdue review count.
          Claude returns: 2-3 warm, encouraging sentences naming specific topics
          the student should focus on today and why (e.g. "You scored 30% on
          Quadratic Equations last time — let's nail it today before moving on.").
    """
    _PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}
    _24H_MINUTES = 1440

    suggestions: List[TopicSuggestion] = []

    for topic_id in all_topics:
        stats = skill_profile.get(topic_id)
        if stats is None:
            continue

        # Determine most recent review for any question in this topic.
        topic_entries = [
            e for (uid, _), e in REVIEW_SCHEDULE.items()
            if e.topic_id == topic_id
        ]
        most_recent_review: Optional[datetime] = (
            max(e.last_reviewed_at for e in topic_entries)
            if topic_entries else None
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

        # Use a human-readable name derived from the topic_id as a fallback.
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
    """Increment and return the per-user answer count for review injection.

    Args:
        user_id: The student's identifier.

    Returns:
        The new count (1-indexed).
    """
    ANSWER_COUNTERS[user_id] = ANSWER_COUNTERS.get(user_id, 0) + 1
    return ANSWER_COUNTERS[user_id]

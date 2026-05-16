"""
Skill profile logic for StudyLah.

Pure functions — no I/O, no FastAPI, no DB. Designed to be called from
service/router layers and easily unit-tested.
"""

from __future__ import annotations

from collections import defaultdict

from .models import Attempt, Question, SkillProfile, SkillStats, Topic


def update_skill_profile_from_attempts(
    user_id: str,
    topics: list[Topic],
    questions: list[Question],
    attempts: list[Attempt],
) -> SkillProfile:
    """Rebuild a SkillProfile from scratch using the full attempt history.

    Args:
        user_id:  The user whose profile is being computed.
        topics:   All available topics (used for metadata / future extension).
        questions: All questions — used to resolve question_id → topic_id.
        attempts: All attempts for this user (filtering by user_id happens here).

    Returns:
        A SkillProfile whose `topics` dict contains one SkillStats entry for
        every topic that has at least one attempt by this user.

    Notes:
        - Attempts belonging to other users are silently ignored.
        - Questions referenced by an attempt but missing from `questions` are
          skipped (defensive; shouldn't happen in a well-formed data set).
        - accuracy and estimated_level are computed properties on SkillStats,
          so they are always consistent with the stored counts.
    """
    question_map: dict[str, Question] = {q.id: q for q in questions}

    # topic_id → {"correct": int, "total": int}
    counters: dict[str, dict[str, int]] = defaultdict(lambda: {"correct": 0, "total": 0})

    for attempt in attempts:
        if attempt.user_id != user_id:
            continue

        question = question_map.get(attempt.question_id)
        if question is None:
            continue

        counters[question.topic_id]["total"] += 1
        if attempt.is_correct:
            counters[question.topic_id]["correct"] += 1

    topic_stats: dict[str, SkillStats] = {
        topic_id: SkillStats(
            topic_id=topic_id,
            correct_count=c["correct"],
            attempt_count=c["total"],
        )
        for topic_id, c in counters.items()
    }

    return SkillProfile(user_id=user_id, topics=topic_stats)


def apply_incremental_update(
    skill_profile: SkillProfile,
    question: Question,
    attempt: Attempt,
) -> SkillProfile:
    """Apply a single new attempt to an existing SkillProfile without recomputing everything.

    Args:
        skill_profile: The user's current SkillProfile (will not be mutated).
        question:      The question that was just attempted; provides topic_id.
        attempt:       The new Attempt record (is_correct determines count delta).

    Returns:
        A new SkillProfile instance with the relevant SkillStats updated.
        All other topic stats are carried over unchanged.

    Notes:
        - If no SkillStats entry exists yet for the topic, one is created from zero.
        - This function returns a new object — the input `skill_profile` is not mutated.
    """
    topic_id = question.topic_id

    existing = skill_profile.topics.get(topic_id)
    if existing is not None:
        new_stats = SkillStats(
            topic_id=topic_id,
            correct_count=existing.correct_count + (1 if attempt.is_correct else 0),
            attempt_count=existing.attempt_count + 1,
        )
    else:
        new_stats = SkillStats(
            topic_id=topic_id,
            correct_count=1 if attempt.is_correct else 0,
            attempt_count=1,
        )

    updated_topics = {**skill_profile.topics, topic_id: new_stats}
    return SkillProfile(user_id=skill_profile.user_id, topics=updated_topics)

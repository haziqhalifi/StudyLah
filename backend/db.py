"""
Database layer backed by Supabase (Postgres).

Public API is unchanged from the original in-memory version so routers need
no edits. Questions are fetched from the studylah_questions table.
"""

from datetime import datetime
from typing import List, Optional

from backend.schemas.question import Attempt, Question, SkillProfile, TopicStats
from backend.supabase_client import supabase

# ---------------------------------------------------------------------------
# Questions – fetched from the shared `questions` table
# Column mapping: id→id, question→text, correct_index→correct_option_index,
#                 topic→topic_id, subject→subject, difficulty→difficulty
# ---------------------------------------------------------------------------

def _row_to_question(row: dict) -> Question:
    return Question(
        id=str(row["id"]),
        topic_id=row.get("topic") or row.get("subject") or "general",
        text=row["question"],
        options=row["options"] if isinstance(row["options"], list) else list(row["options"]),
        correct_option_index=row["correct_index"],
        difficulty=row.get("difficulty") or "medium",
        tags=[],
    )


def get_question_by_id(question_id: str) -> Optional[Question]:
    response = (
        supabase.table("questions")
        .select("id, question, options, correct_index, difficulty, topic, subject")
        .eq("id", int(question_id))
        .maybe_single()
        .execute()
    )
    data = response.data if response else None
    return _row_to_question(data) if data else None


def get_questions_by_ids(ids: List[str]) -> List[Question]:
    if not ids:
        return []
    int_ids = [int(i) for i in ids]
    response = (
        supabase.table("questions")
        .select("id, question, options, correct_index, difficulty, topic, subject")
        .in_("id", int_ids)
        .execute()
    )
    order = {str(qid): i for i, qid in enumerate(ids)}
    rows = sorted(response.data, key=lambda r: order.get(str(r["id"]), len(ids)))
    return [_row_to_question(r) for r in rows]


def get_questions_by_paper(paper_id: int, limit: int = 50) -> List[Question]:
    response = (
        supabase.table("questions")
        .select("id, question, options, correct_index, difficulty, topic, subject")
        .eq("paper_id", paper_id)
        .not_.is_("question", "null")
        .limit(limit)
        .execute()
    )
    return [_row_to_question(r) for r in response.data]


_DIAGNOSTIC_CHAPTER_IDS = [87, 88, 89]  # Ubahan, Matriks, Matematik Pengguna: Insurans (Form 5)

def get_questions_from_trial_papers(limit: int = 200) -> List[Question]:
    """Fetch diagnostic questions from the first 3 Form 5 Matematik chapters."""
    response = (
        supabase.table("questions")
        .select("id, question, options, correct_index, difficulty, topic, subject, chapter_id")
        .in_("chapter_id", _DIAGNOSTIC_CHAPTER_IDS)
        .not_.is_("question", "null")
        .limit(limit)
        .execute()
    )
    return [_row_to_question(r) for r in response.data]


def get_all_questions(topic_id: Optional[str] = None, limit: int = 50) -> List[Question]:
    query = (
        supabase.table("questions")
        .select("id, question, options, correct_index, difficulty, topic, subject")
        .not_.is_("question", "null")
        .limit(limit)
    )
    if topic_id:
        # `topic` column is currently unused (always null); filter by `subject` instead.
        query = query.eq("subject", topic_id)
    response = query.execute()
    return [_row_to_question(r) for r in response.data]


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def ensure_user(user_id: str, name: str = "") -> None:
    supabase.table("studylah_users").upsert(
        {"id": user_id, "name": name}, on_conflict="id"
    ).execute()


# ---------------------------------------------------------------------------
# Attempts
# ---------------------------------------------------------------------------

def record_attempt(attempt: Attempt) -> None:
    supabase.table("studylah_attempts").insert({
        "id": attempt.id,
        "user_id": attempt.user_id,
        "question_id": attempt.question_id,
        "selected_option_index": attempt.selected_option_index,
        "is_correct": attempt.is_correct,
        "timestamp": attempt.timestamp.isoformat(),
    }).execute()


def get_user_attempts(user_id: str) -> List[Attempt]:
    response = (
        supabase.table("studylah_attempts")
        .select("*")
        .eq("user_id", user_id)
        .order("timestamp")
        .execute()
    )
    return [
        Attempt(
            id=row["id"],
            user_id=row["user_id"],
            question_id=row["question_id"],
            selected_option_index=row["selected_option_index"],
            is_correct=row["is_correct"],
            timestamp=row["timestamp"],
        )
        for row in response.data
    ]


# ---------------------------------------------------------------------------
# Skill profiles
# ---------------------------------------------------------------------------

def get_or_create_profile(user_id: str) -> SkillProfile:
    response = (
        supabase.table("studylah_skill_profiles")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    # Some Supabase client implementations (or stubs) may return `None`
    # for the entire response on failure; handle that case gracefully by
    # treating it as an empty/no profile.
    if response and getattr(response, "data", None):
        topics = {
            tid: TopicStats(**stats)
            for tid, stats in response.data["topics"].items()
        }
        return SkillProfile(user_id=user_id, topics=topics)

    # Create a blank profile row so future upserts work
    supabase.table("studylah_skill_profiles").insert(
        {"user_id": user_id, "topics": {}}
    ).execute()
    return SkillProfile(
        user_id=user_id,
        topics={
            "quadratic_equations": TopicStats(
                topic_id="quadratic_equations",
                accuracy=0.0,
                attempts=0,
                correct=0,
            )
        },
    )


def save_profile(profile: SkillProfile) -> None:
    topics_json = {
        tid: stats.model_dump() for tid, stats in profile.topics.items()
    }
    supabase.table("studylah_skill_profiles").upsert(
        {"user_id": profile.user_id, "topics": topics_json, "updated_at": datetime.utcnow().isoformat()},
        on_conflict="user_id",
    ).execute()

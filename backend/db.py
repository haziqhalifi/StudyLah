"""
Database layer backed by Supabase (Postgres).

Public API is unchanged from the original in-memory version so routers need
no edits. The question bank stays in-memory since it's static seed data.
"""

from datetime import datetime
from typing import Dict, List

from schemas.question import Attempt, Question, SkillProfile, TopicStats
from supabase_client import supabase

# ---------------------------------------------------------------------------
# Question bank – static, kept in memory
# ---------------------------------------------------------------------------
QUESTION_BANK: List[Question] = [
    Question(
        id="q1",
        topic_id="quadratic_equations",
        text="Solve: x² - 5x + 6 = 0. What are the roots?",
        options=["x = 2, x = 3", "x = -2, x = -3", "x = 1, x = 6", "x = -1, x = -6"],
        correct_option_index=0,
        difficulty="easy",
        tags=["quadratic_roots", "factoring"],
    ),
    Question(
        id="q2",
        topic_id="quadratic_equations",
        text="Which of the following is the quadratic formula?",
        options=[
            "x = (-b ± √(b²-4ac)) / 2a",
            "x = (-b ± √(b²+4ac)) / 2a",
            "x = (b ± √(b²-4ac)) / 2a",
            "x = (-b ± √(4ac-b²)) / 2a",
        ],
        correct_option_index=0,
        difficulty="easy",
        tags=["quadratic_formula"],
    ),
    Question(
        id="q3",
        topic_id="quadratic_equations",
        text="The discriminant of x² + 4x + 5 = 0 is:",
        options=["-4", "4", "36", "-36"],
        correct_option_index=0,
        difficulty="medium",
        tags=["discriminant"],
    ),
    Question(
        id="q4",
        topic_id="quadratic_equations",
        text="Solve by completing the square: x² + 6x - 7 = 0",
        options=["x = 1, x = -7", "x = -1, x = 7", "x = 3, x = -7", "x = 7, x = 1"],
        correct_option_index=0,
        difficulty="medium",
        tags=["completing_the_square", "quadratic_roots"],
    ),
    Question(
        id="q5",
        topic_id="quadratic_equations",
        text="A ball is thrown upward with height h = -5t² + 20t. When does it hit the ground?",
        options=["t = 4 seconds", "t = 2 seconds", "t = 5 seconds", "t = 10 seconds"],
        correct_option_index=0,
        difficulty="hard",
        tags=["word_problem", "quadratic_roots"],
    ),
    Question(
        id="q6",
        topic_id="quadratic_equations",
        text="For x² - 4 = 0, which method is fastest?",
        options=[
            "Difference of squares: (x-2)(x+2)=0",
            "Quadratic formula",
            "Completing the square",
            "Graphing",
        ],
        correct_option_index=0,
        difficulty="medium",
        tags=["factoring", "shortcut"],
    ),
    Question(
        id="q7",
        topic_id="quadratic_equations",
        text="The sum of the roots of 2x² - 8x + 6 = 0 is:",
        options=["4", "-4", "3", "6"],
        correct_option_index=0,
        difficulty="hard",
        tags=["vieta_formulas", "quadratic_roots"],
    ),
    Question(
        id="q8",
        topic_id="quadratic_equations",
        text="How many real roots does x² + x + 1 = 0 have?",
        options=["0", "1", "2", "Cannot determine"],
        correct_option_index=0,
        difficulty="medium",
        tags=["discriminant"],
    ),
    Question(
        id="q9",
        topic_id="quadratic_equations",
        text="Factorise: 3x² + 7x + 2",
        options=["(3x + 1)(x + 2)", "(3x - 1)(x - 2)", "(x + 1)(3x - 2)", "(x - 1)(3x + 2)"],
        correct_option_index=0,
        difficulty="hard",
        tags=["factoring"],
    ),
    Question(
        id="q10",
        topic_id="quadratic_equations",
        text="What is the vertex form of y = x² - 4x + 3?",
        options=["y = (x-2)² - 1", "y = (x+2)² - 1", "y = (x-2)² + 1", "y = (x+2)² + 3"],
        correct_option_index=0,
        difficulty="hard",
        tags=["vertex_form", "completing_the_square"],
    ),
]

DIAGNOSTIC_QUESTION_IDS = ["q1", "q2", "q3", "q6", "q8"]

_question_map: Dict[str, Question] = {q.id: q for q in QUESTION_BANK}


def get_question_by_id(question_id: str) -> Question | None:
    return _question_map.get(question_id)


def get_questions_by_ids(ids: List[str]) -> List[Question]:
    return [_question_map[i] for i in ids if i in _question_map]


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
    if response.data:
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

"""
In-memory data store. Replace with SQLite/Postgres for production.
All question bank entries live here so the AI engine can query them.
"""

from datetime import datetime
from typing import Dict, List
from schemas.question import Question, Attempt, SkillProfile, TopicStats

# ---------------------------------------------------------------------------
# Question bank – one topic (quadratic equations) to start
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

DIAGNOSTIC_QUESTION_IDS = ["q1", "q2", "q3", "q6", "q8"]  # 5 diagnostic questions

# ---------------------------------------------------------------------------
# Runtime stores (keyed by user_id)
# ---------------------------------------------------------------------------
user_profiles: Dict[str, SkillProfile] = {}
user_attempts: Dict[str, List[Attempt]] = {}


def get_question_by_id(question_id: str) -> Question | None:
    return next((q for q in QUESTION_BANK if q.id == question_id), None)


def get_questions_by_ids(ids: List[str]) -> List[Question]:
    id_set = set(ids)
    return [q for q in QUESTION_BANK if q.id in id_set]


def get_or_create_profile(user_id: str) -> SkillProfile:
    if user_id not in user_profiles:
        user_profiles[user_id] = SkillProfile(
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
    return user_profiles[user_id]


def record_attempt(attempt: Attempt) -> None:
    user_attempts.setdefault(attempt.user_id, []).append(attempt)


def get_user_attempts(user_id: str) -> List[Attempt]:
    return user_attempts.get(user_id, [])

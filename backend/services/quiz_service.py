"""
Quiz service — creates and stores personalised quizzes.

A "quiz" is a named collection of Question objects generated for a specific
user + topic.  For the hackathon we keep everything in an in-memory dict;
swap _QUIZ_STORE for a Supabase table when ready.

Public API
----------
    from backend.services.quiz_service import create_personalized_quiz, get_quiz

    quiz = create_personalized_quiz(user_id="u1", topic_id="ubahan", num_questions=5)
    same = get_quiz(quiz.id)
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel

try:
    from backend.data.seed_questions import get_seed_questions
    from backend.schemas.question import Question
except ModuleNotFoundError:
    from data.seed_questions import get_seed_questions  # type: ignore
    from schemas.question import Question  # type: ignore

# ---------------------------------------------------------------------------
# Domain model
# ---------------------------------------------------------------------------

TopicId = Literal["ubahan", "matriks", "insurans"]

TOPIC_NAMES: Dict[str, str] = {
    "ubahan":   "Ubahan (Variation)",
    "matriks":  "Matriks (Matrices)",
    "insurans": "Matematik Pengguna: Insurans",
}

SUPPORTED_TOPICS = set(TOPIC_NAMES.keys())


class Quiz(BaseModel):
    id: str
    user_id: str
    topic_id: str
    title: str
    created_at: datetime
    questions: List[Question]  # full Question objects (incl. correct_option_index)

    @property
    def question_count(self) -> int:
        return len(self.questions)


# ---------------------------------------------------------------------------
# In-memory store  (replace with Supabase when ready)
# TODO: persist to Supabase `quizzes` + `quiz_questions` tables
# ---------------------------------------------------------------------------

_QUIZ_STORE: Dict[str, Quiz] = {}


# ---------------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------------


def create_personalized_quiz(
    user_id: str,
    topic_id: str,
    num_questions: int = 5,
    skill_profile: Optional[Dict] = None,  # future: use to bias difficulty
) -> Quiz:
    """
    Select `num_questions` questions for the given topic and save a Quiz.

    Selection strategy (rule-based):
    1. Pull all seed questions for the topic.
    2. If skill_profile is provided, prefer questions matching the user's
       current difficulty level (weak → easy, okay → medium, strong → hard).
    3. Shuffle and take `num_questions`.

    TODO: replace step 2 with a Gemini call for fully personalised selection.
    """
    if topic_id not in SUPPORTED_TOPICS:
        raise ValueError(
            f"Unsupported topic '{topic_id}'. Supported: {sorted(SUPPORTED_TOPICS)}"
        )

    all_qs: List[Question] = get_seed_questions(topic_id=topic_id)

    if not all_qs:
        raise RuntimeError(f"No questions found for topic '{topic_id}'")

    selected = _select_questions(all_qs, num_questions, skill_profile, topic_id)

    quiz = Quiz(
        id=str(uuid.uuid4()),
        user_id=user_id,
        topic_id=topic_id,
        title=f"Personalised {TOPIC_NAMES[topic_id]} Quiz",
        created_at=datetime.now(tz=timezone.utc),
        questions=selected,
    )

    _QUIZ_STORE[quiz.id] = quiz
    return quiz


def get_quiz(quiz_id: str) -> Optional[Quiz]:
    """Return a quiz by ID, or None if not found."""
    return _QUIZ_STORE.get(quiz_id)


def list_user_quizzes(user_id: str) -> List[Quiz]:
    """Return all quizzes for a user, newest first."""
    return sorted(
        [q for q in _QUIZ_STORE.values() if q.user_id == user_id],
        key=lambda q: q.created_at,
        reverse=True,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_DIFFICULTY_ORDER = ["easy", "medium", "hard"]


def _skill_to_difficulty(skill_profile: Optional[Dict], topic_id: str) -> Optional[str]:
    """Map a topic's skill level → preferred difficulty string."""
    if not skill_profile:
        return None
    stats = skill_profile.get(topic_id)
    if not stats:
        return None
    level = getattr(stats, "estimated_level", None) or stats.get("estimated_level")
    return {"weak": "easy", "okay": "medium", "strong": "hard"}.get(level or "", None)


def _select_questions(
    questions: List[Question],
    n: int,
    skill_profile: Optional[Dict],
    topic_id: str,
) -> List[Question]:
    preferred_diff = _skill_to_difficulty(skill_profile, topic_id)

    if preferred_diff:
        # Prefer matching difficulty; fill remainder from other difficulties
        preferred = [q for q in questions if q.difficulty == preferred_diff]
        others = [q for q in questions if q.difficulty != preferred_diff]
        random.shuffle(preferred)
        random.shuffle(others)
        pool = (preferred + others)[:n]
    else:
        # No profile — balanced selection: 2 easy, 2 medium, 1 hard (for n=5)
        easy   = [q for q in questions if q.difficulty == "easy"]
        medium = [q for q in questions if q.difficulty == "medium"]
        hard   = [q for q in questions if q.difficulty == "hard"]
        random.shuffle(easy)
        random.shuffle(medium)
        random.shuffle(hard)
        # Proportional: 40% easy, 40% medium, 20% hard
        n_easy   = max(1, round(n * 0.4))
        n_medium = max(1, round(n * 0.4))
        n_hard   = max(0, n - n_easy - n_medium)
        pool = (easy[:n_easy] + medium[:n_medium] + hard[:n_hard])[:n]

    # Pad with any remaining questions if pool is still short
    if len(pool) < n:
        remaining = [q for q in questions if q not in pool]
        random.shuffle(remaining)
        pool += remaining[: n - len(pool)]

    random.shuffle(pool)
    return pool

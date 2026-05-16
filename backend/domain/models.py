"""
Core domain models for StudyLah.

All models are pure Pydantic v2 schemas — no FastAPI or DB imports.
An in-memory repository stub is included at the bottom for hackathon use;
replace with SQLModel / SQLAlchemy queries later.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field, computed_field


# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    email: Optional[str] = None


class Topic(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None


class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic_id: str
    text: str
    options: list[str]
    # Never expose this field in API responses — use a response schema that excludes it.
    correct_option_index: int
    difficulty: Literal["easy", "medium", "hard"]
    tags: list[str] = []


class Attempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    question_id: str
    selected_option_index: int
    is_correct: bool
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SkillStats(BaseModel):
    topic_id: str
    correct_count: int = 0
    attempt_count: int = 0

    @computed_field  # type: ignore[misc]
    @property
    def accuracy(self) -> float:
        if self.attempt_count == 0:
            return 0.0
        return round(self.correct_count / self.attempt_count, 4)

    @computed_field  # type: ignore[misc]
    @property
    def estimated_level(self) -> Literal["weak", "okay", "strong"]:
        if self.accuracy > 0.7:
            return "strong"
        if self.accuracy >= 0.4:
            return "okay"
        return "weak"


class SkillProfile(BaseModel):
    user_id: str
    # topic_id → SkillStats
    topics: dict[str, SkillStats] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# In-memory repository stub
# ---------------------------------------------------------------------------
# TODO: Replace every method body with real database queries (SQLModel / SQLAlchemy).


class InMemoryStore:
    """Thin in-memory store for hackathon use. Not thread-safe."""

    def __init__(self) -> None:
        self._users: dict[str, User] = {}
        self._topics: dict[str, Topic] = {}
        self._questions: dict[str, Question] = {}
        self._attempts: dict[str, Attempt] = {}
        self._skill_profiles: dict[str, SkillProfile] = {}

    # --- Users ---

    def save_user(self, user: User) -> User:
        # TODO: INSERT INTO users ...
        self._users[user.id] = user
        return user

    def get_user(self, user_id: str) -> Optional[User]:
        # TODO: SELECT * FROM users WHERE id = ?
        return self._users.get(user_id)

    # --- Topics ---

    def save_topic(self, topic: Topic) -> Topic:
        # TODO: INSERT INTO topics ...
        self._topics[topic.id] = topic
        return topic

    def get_topic(self, topic_id: str) -> Optional[Topic]:
        # TODO: SELECT * FROM topics WHERE id = ?
        return self._topics.get(topic_id)

    def list_topics(self) -> list[Topic]:
        # TODO: SELECT * FROM topics
        return list(self._topics.values())

    # --- Questions ---

    def save_question(self, question: Question) -> Question:
        # TODO: INSERT INTO questions ...
        self._questions[question.id] = question
        return question

    def get_question(self, question_id: str) -> Optional[Question]:
        # TODO: SELECT * FROM questions WHERE id = ?
        return self._questions.get(question_id)

    def list_questions_by_topic(self, topic_id: str) -> list[Question]:
        # TODO: SELECT * FROM questions WHERE topic_id = ?
        return [q for q in self._questions.values() if q.topic_id == topic_id]

    def list_all_questions(self) -> list[Question]:
        # TODO: SELECT * FROM questions
        return list(self._questions.values())

    # --- Attempts ---

    def save_attempt(self, attempt: Attempt) -> Attempt:
        # TODO: INSERT INTO attempts ...
        self._attempts[attempt.id] = attempt
        return attempt

    def list_attempts_by_user(self, user_id: str) -> list[Attempt]:
        # TODO: SELECT * FROM attempts WHERE user_id = ? ORDER BY timestamp
        return [a for a in self._attempts.values() if a.user_id == user_id]

    # --- Skill profiles ---

    def save_skill_profile(self, profile: SkillProfile) -> SkillProfile:
        # TODO: UPSERT skill_profiles ...
        self._skill_profiles[profile.user_id] = profile
        return profile

    def get_skill_profile(self, user_id: str) -> Optional[SkillProfile]:
        # TODO: SELECT * FROM skill_profiles WHERE user_id = ?
        return self._skill_profiles.get(user_id)


# Singleton store — import and use this across the app during the hackathon.
store = InMemoryStore()

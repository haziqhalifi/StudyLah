"""
Core domain models for StudyLah.

All models are pure Pydantic v2 schemas — no FastAPI or DB imports.
The SupabaseStore below backs every method with real Postgres queries via
the Supabase client. The legacy InMemoryStore is kept as a fallback for
unit tests that don't need a live database.
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
# Supabase-backed store
# ---------------------------------------------------------------------------


class SupabaseStore:
    """All persistence goes to Supabase (Postgres). Import `store` below."""

    def __init__(self) -> None:
        from supabase_client import supabase  # local import to avoid circular deps
        self._db = supabase

    # --- Users ---

    def save_user(self, user: User) -> User:
        self._db.table("studylah_users").upsert(
            {"id": user.id, "name": user.name, "email": user.email},
            on_conflict="id",
        ).execute()
        return user

    def get_user(self, user_id: str) -> Optional[User]:
        resp = (
            self._db.table("studylah_users")
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if not resp.data:
            return None
        row = resp.data
        return User(id=row["id"], name=row.get("name"), email=row.get("email"))

    # --- Topics ---

    def save_topic(self, topic: Topic) -> Topic:
        self._db.table("studylah_topics").upsert(
            {"id": topic.id, "name": topic.name, "description": topic.description},
            on_conflict="id",
        ).execute()
        return topic

    def get_topic(self, topic_id: str) -> Optional[Topic]:
        resp = (
            self._db.table("studylah_topics")
            .select("*")
            .eq("id", topic_id)
            .maybe_single()
            .execute()
        )
        if not resp.data:
            return None
        row = resp.data
        return Topic(id=row["id"], name=row["name"], description=row.get("description"))

    def list_topics(self) -> list[Topic]:
        resp = self._db.table("studylah_topics").select("*").execute()
        return [
            Topic(id=row["id"], name=row["name"], description=row.get("description"))
            for row in resp.data
        ]

    # --- Questions ---

    def save_question(self, question: Question) -> Question:
        self._db.table("studylah_questions").upsert(
            {
                "id": question.id,
                "topic_id": question.topic_id,
                "text": question.text,
                "options": question.options,
                "correct_option_index": question.correct_option_index,
                "difficulty": question.difficulty,
                "tags": question.tags,
            },
            on_conflict="id",
        ).execute()
        return question

    def get_question(self, question_id: str) -> Optional[Question]:
        resp = (
            self._db.table("studylah_questions")
            .select("*")
            .eq("id", question_id)
            .maybe_single()
            .execute()
        )
        if not resp.data:
            return None
        return Question(**resp.data)

    def list_questions_by_topic(self, topic_id: str) -> list[Question]:
        resp = (
            self._db.table("studylah_questions")
            .select("*")
            .eq("topic_id", topic_id)
            .execute()
        )
        return [Question(**row) for row in resp.data]

    def list_all_questions(self) -> list[Question]:
        resp = self._db.table("studylah_questions").select("*").execute()
        return [Question(**row) for row in resp.data]

    # --- Attempts ---

    def save_attempt(self, attempt: Attempt) -> Attempt:
        self._db.table("studylah_attempts").insert(
            {
                "id": attempt.id,
                "user_id": attempt.user_id,
                "question_id": attempt.question_id,
                "selected_option_index": attempt.selected_option_index,
                "is_correct": attempt.is_correct,
                "timestamp": attempt.timestamp.isoformat(),
            }
        ).execute()
        return attempt

    def list_attempts_by_user(self, user_id: str) -> list[Attempt]:
        resp = (
            self._db.table("studylah_attempts")
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
            for row in resp.data
        ]

    # --- Skill profiles ---

    def save_skill_profile(self, profile: SkillProfile) -> SkillProfile:
        topics_json = {tid: stats.model_dump() for tid, stats in profile.topics.items()}
        self._db.table("studylah_skill_profiles").upsert(
            {
                "user_id": profile.user_id,
                "topics": topics_json,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="user_id",
        ).execute()
        return profile

    def get_skill_profile(self, user_id: str) -> Optional[SkillProfile]:
        resp = (
            self._db.table("studylah_skill_profiles")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if not resp.data:
            return None
        topics = {
            tid: SkillStats(**stats)
            for tid, stats in resp.data["topics"].items()
        }
        return SkillProfile(user_id=user_id, topics=topics)


# ---------------------------------------------------------------------------
# Legacy in-memory store (kept for unit tests)
# ---------------------------------------------------------------------------


class InMemoryStore:
    """Thin in-memory store for unit tests. Not thread-safe."""

    def __init__(self) -> None:
        self._users: dict[str, User] = {}
        self._topics: dict[str, Topic] = {}
        self._questions: dict[str, Question] = {}
        self._attempts: dict[str, Attempt] = {}
        self._skill_profiles: dict[str, SkillProfile] = {}

    def save_user(self, user: User) -> User:
        self._users[user.id] = user
        return user

    def get_user(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)

    def save_topic(self, topic: Topic) -> Topic:
        self._topics[topic.id] = topic
        return topic

    def get_topic(self, topic_id: str) -> Optional[Topic]:
        return self._topics.get(topic_id)

    def list_topics(self) -> list[Topic]:
        return list(self._topics.values())

    def save_question(self, question: Question) -> Question:
        self._questions[question.id] = question
        return question

    def get_question(self, question_id: str) -> Optional[Question]:
        return self._questions.get(question_id)

    def list_questions_by_topic(self, topic_id: str) -> list[Question]:
        return [q for q in self._questions.values() if q.topic_id == topic_id]

    def list_all_questions(self) -> list[Question]:
        return list(self._questions.values())

    def save_attempt(self, attempt: Attempt) -> Attempt:
        self._attempts[attempt.id] = attempt
        return attempt

    def list_attempts_by_user(self, user_id: str) -> list[Attempt]:
        return sorted(
            (a for a in self._attempts.values() if a.user_id == user_id),
            key=lambda a: a.timestamp,
        )

    def save_skill_profile(self, profile: SkillProfile) -> SkillProfile:
        self._skill_profiles[profile.user_id] = profile
        return profile

    def get_skill_profile(self, user_id: str) -> Optional[SkillProfile]:
        return self._skill_profiles.get(user_id)


# Singleton store backed by Supabase. Falls back to in-memory if env vars are absent.
try:
    store: SupabaseStore | InMemoryStore = SupabaseStore()
except Exception:
    store = InMemoryStore()

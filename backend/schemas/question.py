from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal

from pydantic import BaseModel


class Question(BaseModel):
    id: str
    topic_id: str
    text: str
    options: List[str]
    correct_option_index: int  # NEVER expose this field to the frontend
    difficulty: Literal["easy", "medium", "hard"]
    tags: List[str]

    def to_public(self) -> QuestionPublic:
        return QuestionPublic(
            id=self.id,
            topic_id=self.topic_id,
            text=self.text,
            options=self.options,
            difficulty=self.difficulty,
            tags=self.tags,
        )


class QuestionPublic(BaseModel):
    """Safe to serialise and send to the frontend."""
    id: str
    topic_id: str
    text: str
    options: List[str]
    difficulty: Literal["easy", "medium", "hard"]
    tags: List[str]


class Attempt(BaseModel):
    user_id: str
    question_id: str
    selected_option_index: int
    is_correct: bool
    timestamp: datetime


class TopicStats(BaseModel):
    topic_id: str
    accuracy: float  # 0.0 – 1.0
    attempts: int
    correct: int
    level: Literal["beginner", "developing", "proficient", "advanced"] = "beginner"

    @classmethod
    def compute_level(cls, accuracy: float) -> Literal["beginner", "developing", "proficient", "advanced"]:
        if accuracy >= 0.85:
            return "advanced"
        if accuracy >= 0.65:
            return "proficient"
        if accuracy >= 0.40:
            return "developing"
        return "beginner"


class SkillProfile(BaseModel):
    user_id: str
    topics: Dict[str, TopicStats] = {}

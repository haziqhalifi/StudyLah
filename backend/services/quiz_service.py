from __future__ import annotations

import logging
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from backend import db
from backend.schemas.question import Attempt, Question, SkillProfile, TopicStats

try:
    from backend.services.question_generator import QuestionGenerator
except ModuleNotFoundError:
    from services.question_generator import QuestionGenerator  # type: ignore

logger = logging.getLogger(__name__)

TopicId = Literal["ubahan", "matriks", "insurans"]

TOPIC_NAMES: Dict[str, str] = {
    "ubahan": "Ubahan",
    "matriks": "Matriks",
    "insurans": "Insurans",
}

SUPPORTED_TOPICS = set(TOPIC_NAMES)


class Quiz(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    topic_id: str
    title: str
    question_ids: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def question_count(self) -> int:
        return len(self.question_ids)


_QUIZ_STORE: dict[str, Quiz] = {}
_QUESTION_STORE: dict[str, Question] = {}


def _difficulty_mix(level: str, total: int) -> list[str]:
    if total <= 0:
        return []
    if level == "weak":
        mix = ["easy", "easy", "easy", "medium", "medium"]
    elif level == "strong":
        mix = ["easy", "medium", "medium", "hard", "hard"]
    else:
        mix = ["easy", "easy", "medium", "medium", "hard"]
    return mix[:total]


def _band_from_level(level: str | None) -> str:
    if level is None:
        return "weak"
    if level in {"beginner", "weak"}:
        return "weak"
    if level in {"developing", "okay"}:
        return "okay"
    return "strong"


def _topic_focus_text(topic_id: str, questions: list[Question]) -> str:
    tags: list[str] = []
    for q in questions:
        for tag in q.tags:
            if tag != topic_id and tag not in tags:
                tags.append(tag)
    if not tags:
        return TOPIC_NAMES.get(topic_id, topic_id)
    focus = ", ".join(tag.replace("_", " ").title() for tag in tags[:2])
    return f"{TOPIC_NAMES.get(topic_id, topic_id)} – Focus: {focus}"


def _persist_question(question: Question) -> None:
    _QUESTION_STORE[question.id] = question
    try:
        db.save_question(question)
    except Exception:
        logger.debug("Question save skipped for %s", question.id, exc_info=True)


def _pool_from_bank(topic_id: str, difficulty: str, count: int, skill_profile: SkillProfile) -> list[Question]:
    bank = [q for q in db.get_all_questions(topic_id=topic_id)]
    if not bank:
        try:
            from backend.data.seed_questions import get_seed_questions
            bank = get_seed_questions(topic_id=topic_id)
        except Exception:
            bank = []
    attempts = db.get_user_attempts(skill_profile.user_id)
    recent_ids = [attempt.question_id for attempt in attempts[-15:]]

    filtered = [q for q in bank if q.difficulty == difficulty] or list(bank)
    filtered.sort(key=lambda q: (recent_ids.index(q.id) if q.id in recent_ids else 10_000, q.id))
    return filtered[:count]


def create_personalized_quiz(
    user_id: str,
    topic_id: str,
    skill_profile: SkillProfile,
    num_questions: int = 5,
) -> Quiz:
    if topic_id not in SUPPORTED_TOPICS:
        raise ValueError(f"Unsupported topic '{topic_id}'. Supported: {sorted(SUPPORTED_TOPICS)}")

    generator = QuestionGenerator()
    topic_stats = skill_profile.topics.get(topic_id)
    level_band = _band_from_level(topic_stats.level if topic_stats else None)
    difficulty_mix = _difficulty_mix(level_band, num_questions)

    generated: list[Question] = []
    try:
        generated = generator.generate_for_weak_subtopics(skill_profile, topic_id, num_questions=num_questions)
    except Exception as exc:
        logger.warning("Primary generation failed for %s: %s", topic_id, exc)

    chosen: list[Question] = []
    seen_ids: set[str] = set()

    for question in generated:
        if question.id in seen_ids:
            continue
        chosen.append(question)
        seen_ids.add(question.id)
        if len(chosen) >= num_questions:
            break

    if len(chosen) < num_questions:
        for difficulty in difficulty_mix:
            if len(chosen) >= num_questions:
                break
            for question in _pool_from_bank(topic_id, difficulty, num_questions, skill_profile):
                if question.id in seen_ids:
                    continue
                chosen.append(question)
                seen_ids.add(question.id)
                if len(chosen) >= num_questions:
                    break

    if not chosen:
        raise RuntimeError(f"No questions available for topic '{topic_id}'")

    for question in chosen:
        _persist_question(question)

    quiz = Quiz(
        user_id=user_id,
        topic_id=topic_id,
        title=f"Personalised {TOPIC_NAMES.get(topic_id, topic_id)} Quiz – Focus: {_topic_focus_text(topic_id, chosen).split('Focus: ', 1)[-1]}",
        question_ids=[question.id for question in chosen],
    )
    _QUIZ_STORE[quiz.id] = quiz
    return quiz


def get_quiz_by_id(quiz_id: str) -> Optional[Quiz]:
    return _QUIZ_STORE.get(quiz_id)


def get_quiz_questions(quiz_id: str) -> list[Question]:
    quiz = _QUIZ_STORE.get(quiz_id)
    if quiz is None:
        return []
    questions: list[Question] = []
    for question_id in quiz.question_ids:
        question = _QUESTION_STORE.get(question_id)
        if question is None:
            question = db.get_question_by_id(question_id)
        if question is not None:
            questions.append(question)
    return questions


def get_quiz(quiz_id: str) -> Optional[Quiz]:
    return get_quiz_by_id(quiz_id)


def list_user_quizzes(user_id: str) -> List[Quiz]:
    return sorted(
        [quiz for quiz in _QUIZ_STORE.values() if quiz.user_id == user_id],
        key=lambda quiz: quiz.created_at,
        reverse=True,
    )

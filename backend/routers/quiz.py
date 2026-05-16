"""
Personalised quiz endpoints.

POST /api/quizzes/personalized   - create a quiz for a user/topic
GET  /api/quizzes/{quiz_id}      - fetch the quiz without answer keys
POST /api/quizzes/{quiz_id}/submit - score the quiz and return explanations
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend import db
from backend.schemas.question import QuestionPublic, SkillProfile, TopicStats, Attempt
from backend.schemas.session import Explanation

try:
    from backend.services.quiz_service import (
        create_personalized_quiz,
        get_quiz_by_id,
        get_quiz_questions,
        TOPIC_NAMES,
    )
except ModuleNotFoundError:
    from services.quiz_service import (  # type: ignore
        create_personalized_quiz,
        get_quiz_by_id,
        get_quiz_questions,
        TOPIC_NAMES,
    )

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])

TopicId = Literal["ubahan", "matriks", "insurans"]


class CreatePersonalizedQuizRequest(BaseModel):
    userId: str
    topicId: TopicId
    numQuestions: int = Field(default=5, ge=1, le=10)

    @field_validator("userId")
    @classmethod
    def user_id_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("userId must not be empty")
        return value


class CreatePersonalizedQuizResponse(BaseModel):
    quizId: str
    topicId: str
    title: str
    questionCount: int
    difficulty: str


class QuizQuestionOut(BaseModel):
    id: str
    text: str
    options: List[str]
    difficulty: Literal["easy", "medium", "hard"]
    tags: List[str]


class QuizDetailResponse(BaseModel):
    quizId: str
    topicId: str
    title: str
    questions: List[QuizQuestionOut]


class QuizAnswerIn(BaseModel):
    questionId: str
    selectedOptionIndex: int


class QuizSubmitRequest(BaseModel):
    userId: str
    answers: List[QuizAnswerIn]

    @field_validator("userId")
    @classmethod
    def user_id_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("userId must not be empty")
        return value


class QuizSubmitResultItem(BaseModel):
    questionId: str
    isCorrect: bool
    correctOptionIndex: int
    explanation: Explanation


class QuizSubmitResponse(BaseModel):
    score: int
    total: int
    percentage: int
    results: List[QuizSubmitResultItem]


def _skill_profile_for_user(user_id: str) -> SkillProfile:
    profile = db.get_or_create_profile(user_id)
    if profile.topics:
        return profile
    return SkillProfile(
        user_id=user_id,
        topics={
            "ubahan": TopicStats(topic_id="ubahan", accuracy=0.0, attempts=0, correct=0, level="beginner"),
            "matriks": TopicStats(topic_id="matriks", accuracy=0.0, attempts=0, correct=0, level="beginner"),
            "insurans": TopicStats(topic_id="insurans", accuracy=0.0, attempts=0, correct=0, level="beginner"),
        },
    )


@router.post("/personalized", response_model=CreatePersonalizedQuizResponse)
def create_personalized_quiz_endpoint(body: CreatePersonalizedQuizRequest) -> CreatePersonalizedQuizResponse:
    profile = _skill_profile_for_user(body.userId)
    try:
        quiz = create_personalized_quiz(
            user_id=body.userId,
            topic_id=body.topicId,
            skill_profile=profile,
            num_questions=body.numQuestions,
        )
    except Exception as exc:
        logger.exception("Failed to create personalised quiz")
        raise HTTPException(status_code=500, detail=str(exc))

    topic_name = TOPIC_NAMES.get(body.topicId, body.topicId)
    return CreatePersonalizedQuizResponse(
        quizId=quiz.id,
        topicId=quiz.topic_id,
        title=quiz.title or f"Personalised {topic_name} Quiz",
        questionCount=len(quiz.question_ids),
        difficulty="mixed",
    )


@router.get("/{quiz_id}", response_model=QuizDetailResponse)
def get_quiz_detail(quiz_id: str) -> QuizDetailResponse:
    quiz = get_quiz_by_id(quiz_id)
    if quiz is None:
        raise HTTPException(status_code=404, detail=f"Quiz '{quiz_id}' not found")

    questions = get_quiz_questions(quiz_id)
    return QuizDetailResponse(
        quizId=quiz.id,
        topicId=quiz.topic_id,
        title=quiz.title,
        questions=[
            QuizQuestionOut(
                id=q.id,
                text=q.text,
                options=q.options,
                difficulty=q.difficulty,
                tags=q.tags,
            )
            for q in questions
        ],
    )


@router.post("/{quiz_id}/submit", response_model=QuizSubmitResponse)
def submit_quiz(quiz_id: str, body: QuizSubmitRequest) -> QuizSubmitResponse:
    quiz = get_quiz_by_id(quiz_id)
    if quiz is None:
        raise HTTPException(status_code=404, detail=f"Quiz '{quiz_id}' not found")

    questions = {question.id: question for question in get_quiz_questions(quiz_id)}
    score = 0
    results: list[QuizSubmitResultItem] = []

    for answer in body.answers:
        question = questions.get(answer.questionId)
        if question is None:
            continue
        is_correct = question.correct_option_index == answer.selectedOptionIndex
        score += int(is_correct)
        attempt = Attempt(
            user_id=body.userId,
            question_id=question.id,
            selected_option_index=answer.selectedOptionIndex,
            is_correct=is_correct,
            timestamp=datetime.now(timezone.utc),
        )
        try:
            db.record_attempt(attempt)
        except Exception:
            logger.debug("Failed to record attempt for quiz submit", exc_info=True)

        explanation = Explanation(
            text=(
                "Correct answer: "
                f"{question.options[question.correct_option_index]}. "
                "This question is aligned to the quiz topic and difficulty."
            ),
            style="step_by_step",
        )
        results.append(
            QuizSubmitResultItem(
                questionId=question.id,
                isCorrect=is_correct,
                correctOptionIndex=question.correct_option_index,
                explanation=explanation,
            )
        )

    total = len(results)
    percentage = round((score / total) * 100) if total else 0
    return QuizSubmitResponse(score=score, total=total, percentage=percentage, results=results)

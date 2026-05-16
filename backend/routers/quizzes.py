"""
Quiz endpoints.

POST /api/quizzes/personalized  — create a personalised quiz for a user/topic
GET  /api/quizzes/{quiz_id}     — fetch a quiz's questions (safe: no correct answers)
"""

from __future__ import annotations

import logging
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

try:
    from backend.services.quiz_service import (
        create_personalized_quiz,
        get_quiz,
        SUPPORTED_TOPICS,
        TOPIC_NAMES,
    )
    from backend.schemas.question import QuestionPublic
except ModuleNotFoundError:
    from services.quiz_service import (  # type: ignore
        create_personalized_quiz,
        get_quiz,
        SUPPORTED_TOPICS,
        TOPIC_NAMES,
    )
    from schemas.question import QuestionPublic  # type: ignore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

TopicId = Literal["ubahan", "matriks", "insurans"]


class CreateQuizRequest(BaseModel):
    user_id: str
    topic_id: TopicId
    num_questions: int = 5

    @field_validator("user_id")
    @classmethod
    def user_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("user_id must not be empty")
        return v

    @field_validator("num_questions")
    @classmethod
    def clamp_questions(cls, v: int) -> int:
        return max(1, min(v, 13))  # seed bank has 13 per topic


class CreateQuizResponse(BaseModel):
    quiz_id: str
    topic_id: str
    title: str
    question_count: int


class QuizDetailResponse(BaseModel):
    quiz_id: str
    user_id: str
    topic_id: str
    title: str
    created_at: str  # ISO datetime
    questions: List[QuestionPublic]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/personalized", response_model=CreateQuizResponse)
def create_quiz(body: CreateQuizRequest) -> CreateQuizResponse:
    """
    Create a personalised quiz for a user and topic.

    Selects questions from the seed bank based on the user's skill profile
    (rule-based for now; Gemini personalisation is a TODO).
    """
    try:
        quiz = create_personalized_quiz(
            user_id=body.user_id,
            topic_id=body.topic_id,
            num_questions=body.num_questions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        logger.error("Quiz creation failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    return CreateQuizResponse(
        quiz_id=quiz.id,
        topic_id=quiz.topic_id,
        title=quiz.title,
        question_count=quiz.question_count,
    )


@router.get("/{quiz_id}", response_model=QuizDetailResponse)
def get_quiz_detail(quiz_id: str) -> QuizDetailResponse:
    """
    Fetch a quiz by ID.

    Returns the quiz metadata and questions (without correct_option_index).
    """
    quiz = get_quiz(quiz_id)
    if quiz is None:
        raise HTTPException(status_code=404, detail=f"Quiz '{quiz_id}' not found")

    return QuizDetailResponse(
        quiz_id=quiz.id,
        user_id=quiz.user_id,
        topic_id=quiz.topic_id,
        title=quiz.title,
        created_at=quiz.created_at.isoformat(),
        questions=[q.to_public() for q in quiz.questions],
    )

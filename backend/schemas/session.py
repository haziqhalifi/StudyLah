from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel

from schemas.question import QuestionPublic, SkillProfile, TopicStats


# ---------------------------------------------------------------------------
# Diagnostic
# ---------------------------------------------------------------------------

class StartDiagnosticRequest(BaseModel):
    user_id: str
    topic_id: str


class StartDiagnosticResponse(BaseModel):
    questions: List[QuestionPublic]


class DiagnosticAnswer(BaseModel):
    question_id: str
    selected_option_index: int


class SubmitDiagnosticRequest(BaseModel):
    user_id: str
    answers: List[DiagnosticAnswer]


class SubmitDiagnosticResponse(BaseModel):
    skill_profile: SkillProfile
    next_question: QuestionPublic
    message: str = "Diagnostic complete. Let's begin your personalised learning!"


# ---------------------------------------------------------------------------
# Learn / practice loop
# ---------------------------------------------------------------------------

class SubmitAnswerRequest(BaseModel):
    user_id: str
    question_id: str
    selected_option_index: int


class Explanation(BaseModel):
    text: str
    style: Literal["step_by_step", "analogy", "formula_first", "shortcut_tips"]


class SubmitAnswerResponse(BaseModel):
    is_correct: bool
    explanation: Explanation
    next_question: QuestionPublic
    skill_summary: Optional[TopicStats] = None


# ---------------------------------------------------------------------------
# Assessment
# ---------------------------------------------------------------------------

class AssessmentResponse(BaseModel):
    topics: List[TopicStats]


# ---------------------------------------------------------------------------
# Spaced repetition / review
# ---------------------------------------------------------------------------

class ReviewItem(BaseModel):
    question: QuestionPublic
    reason: Literal["low_accuracy", "not_seen_recently"]


class SuggestedTopic(BaseModel):
    topic_id: str
    reason: Literal["low_accuracy", "not_seen_recently"]


class ReviewResponse(BaseModel):
    review_questions: List[ReviewItem]
    suggested_topics: List[SuggestedTopic]


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class CreateUserRequest(BaseModel):
    user_id: str
    name: str


class UserResponse(BaseModel):
    user_id: str
    name: str

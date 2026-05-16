"""
POST /api/assistant/study-buddy

Agentic chatbot endpoint.  Every response now carries:
  - reply   : human-readable assistant message
  - action  : { type: "none" } | { type: "create_quiz", quiz_id, topic_id }

When the student asks to generate a personalised quiz the agent:
  1. Classifies the intent (Gemini, JSON-only prompt).
  2. Calls quiz_service.create_personalized_quiz().
  3. Returns ChatResponse with action.type == "create_quiz" so the frontend
     can navigate to /quiz/<quiz_id> automatically.
"""

from __future__ import annotations

import logging
from typing import Literal, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

try:
    from backend import db
except ModuleNotFoundError:
    import db  # type: ignore

try:
    from backend.services.study_buddy_agent import StudyBuddyAgent, ChatMessage, LearningContext
    from backend.services.quiz_service import create_personalized_quiz, TOPIC_NAMES
except ModuleNotFoundError:
    from services.study_buddy_agent import StudyBuddyAgent, ChatMessage, LearningContext  # type: ignore
    from services.quiz_service import create_personalized_quiz, TOPIC_NAMES  # type: ignore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

_agent = StudyBuddyAgent()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class MessageDTO(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message content must not be empty.")
        return v


class StudyBuddyRequest(BaseModel):
    user_id: str
    messages: list[MessageDTO]
    # Optional learning context passed from Learn/Review/Quiz pages.
    # When present, injected into Gemini for hyper-relevant answers.
    # TODO: extend with more fields as the frontend LearningContext grows.
    learning_context: dict | None = None

    @field_validator("user_id")
    @classmethod
    def user_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("user_id must not be empty.")
        return v

    @field_validator("messages")
    @classmethod
    def messages_not_empty(cls, v: list[MessageDTO]) -> list[MessageDTO]:
        if not v:
            raise ValueError("messages must contain at least one entry.")
        if v[-1].role != "user":
            raise ValueError("The last message must have role 'user'.")
        return v


# --- Agent action models ---

class NoAction(BaseModel):
    type: Literal["none"] = "none"


class CreateQuizAction(BaseModel):
    type: Literal["create_quiz"] = "create_quiz"
    quiz_id: str
    topic_id: str
    title: str
    question_count: int


AgentAction = Union[NoAction, CreateQuizAction]


class ChatResponse(BaseModel):
    reply: str
    action: AgentAction
    meta: dict = {}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/study-buddy", response_model=ChatResponse)
def study_buddy_chat(body: StudyBuddyRequest) -> ChatResponse:
    """
    Agentic study-buddy chat.

    Flow:
      1. Extract the latest user message.
      2. Run intent classification via Gemini (decide_intent_and_reply).
      3a. intent == "create_quiz"  → create quiz, return action payload.
      3b. intent == "chat"         → run normal StudyBuddy conversation.
    """
    messages: list[ChatMessage] = [
        {"role": m.role, "content": m.content} for m in body.messages
    ]

    latest_user_msg = _last_user_message(messages)
    if not latest_user_msg:
        raise HTTPException(status_code=400, detail="No user message found.")

    # --- Step 1: classify intent ---
    try:
        intent_result = _agent.decide_intent_and_reply(latest_user_msg)
    except Exception as exc:
        logger.error("Intent classification error for user %s: %s", body.user_id, exc)
        intent_result = {"intent": "chat"}

    # --- Step 2a: create_quiz path ---
    if intent_result.get("intent") == "create_quiz":
        topic_id: str = intent_result.get("topic_id", "ubahan")
        num_questions: int = int(intent_result.get("num_questions", 5))

        try:
            quiz = create_personalized_quiz(
                user_id=body.user_id,
                topic_id=topic_id,
                skill_profile=db.get_or_create_profile(body.user_id),
                num_questions=num_questions,
            )
        except Exception as exc:
            logger.error("Quiz creation failed for user %s: %s", body.user_id, exc)
            # Fall through to normal chat reply on failure
            return _chat_reply(body.user_id, messages, body.learning_context)

        topic_name = TOPIC_NAMES.get(topic_id, topic_id)
        reply_text = (
            f"I've created a personalised **{topic_name}** quiz with "
            f"{quiz.question_count} question{'s' if quiz.question_count != 1 else ''} "
            f"just for you. Opening it now! 🚀"
        )
        logger.info(
            "StudyBuddy [%s]: created quiz %s (%s, %d Qs)",
            body.user_id, quiz.id, topic_id, quiz.question_count,
        )
        return ChatResponse(
            reply=reply_text,
            action=CreateQuizAction(
                quiz_id=quiz.id,
                topic_id=topic_id,
                title=quiz.title,
                question_count=quiz.question_count,
            ),
        )

    # --- Step 2b: normal chat path ---
    return _chat_reply(body.user_id, messages, body.learning_context)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _chat_reply(
    user_id: str,
    messages: list[ChatMessage],
    raw_context: dict | None = None,
) -> ChatResponse:
    """Run the full StudyBuddy conversation and wrap in ChatResponse."""
    # Cast the raw dict to LearningContext (TypedDict — no runtime overhead).
    ctx: LearningContext | None = raw_context  # type: ignore[assignment]

    try:
        result = _agent.chat(user_id=user_id, messages=messages, learning_context=ctx)
    except RuntimeError as exc:
        logger.error("StudyBuddy config error for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=500,
            detail="AI service is not configured correctly. Contact support.",
        )
    except Exception as exc:
        logger.error("StudyBuddy Gemini failure for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=500,
            detail="AI service is temporarily unavailable. Please try again.",
        )

    return ChatResponse(
        reply=result["reply"],
        action=NoAction(),
        meta={"out_of_scope": result["out_of_scope"]},
    )


def _last_user_message(messages: list[ChatMessage]) -> str:
    for msg in reversed(messages):
        if msg["role"] == "user":
            return msg["content"]
    return ""

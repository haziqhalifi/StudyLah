"""
POST /api/assistant/study-buddy

Conversational endpoint for the StudyBuddy Gemini-powered tutor.
Accepts a conversation history and returns the next assistant reply.
"""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

try:
    from backend.services.study_buddy_agent import StudyBuddyAgent, ChatMessage
except ModuleNotFoundError:
    from services.study_buddy_agent import StudyBuddyAgent, ChatMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

# Singleton agent — constructed once, reused across requests.
_agent = StudyBuddyAgent()

# ---------------------------------------------------------------------------
# Request / response schemas
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


class StudyBuddyResponse(BaseModel):
    reply: str
    meta: dict


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/study-buddy", response_model=StudyBuddyResponse)
def study_buddy_chat(body: StudyBuddyRequest) -> StudyBuddyResponse:
    """
    Chat with the StudyBuddy tutor (Gemini-backed).

    Request body:
        user_id  – caller identifier (used for logging/tracing)
        messages – full conversation history; last entry must be role="user"

    Returns:
        reply        – assistant's next message
        meta         – auxiliary flags, e.g. { "out_of_scope": false }
    """
    # Convert Pydantic DTOs → plain TypedDicts expected by the agent.
    messages: list[ChatMessage] = [
        {"role": m.role, "content": m.content} for m in body.messages
    ]

    try:
        result = _agent.chat(user_id=body.user_id, messages=messages)
    except RuntimeError as exc:
        # Configuration errors (e.g. missing API key) — surface as 500.
        logger.error("StudyBuddy config error for user %s: %s", body.user_id, exc)
        raise HTTPException(status_code=500, detail="AI service is not configured correctly. Contact support.")
    except Exception as exc:
        # Gemini API failures — log full error, return generic message.
        logger.error("StudyBuddy Gemini failure for user %s: %s", body.user_id, exc)
        raise HTTPException(status_code=500, detail="AI service is temporarily unavailable. Please try again.")

    return StudyBuddyResponse(
        reply=result["reply"],
        meta={"out_of_scope": result["out_of_scope"]},
    )

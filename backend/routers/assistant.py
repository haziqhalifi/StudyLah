"""
POST /api/assistant/study-buddy

Agentic chatbot endpoint.  Every response now carries:
  - reply   : human-readable assistant message
  - action  : { type: "none" }
            | { type: "create_quiz", quiz_id, topic_id, ... }
            | { type: "create_flashcards", flashcard_set_id, ... }

When the student asks to generate flashcards the agent:
  1. Detects "create_flashcards" intent (keyword-based, fast).
  2. Calls FlashcardGenerator.generate_flashcards() via asyncio.
  3. Calls FlashcardService.create_set() to persist the set.
  4. Returns ChatResponse with action.type == "create_flashcards" so the
     frontend can render a FlashcardReadyCard and navigate to /flashcards/<id>.
"""

from __future__ import annotations

import asyncio
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
    from backend.services.flashcard_generator import get_generator
    from backend.services.flashcard_service import flashcard_service
except ModuleNotFoundError:
    from services.study_buddy_agent import StudyBuddyAgent, ChatMessage, LearningContext  # type: ignore
    from services.quiz_service import create_personalized_quiz, TOPIC_NAMES  # type: ignore
    from services.flashcard_generator import get_generator  # type: ignore
    from services.flashcard_service import flashcard_service  # type: ignore

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


class CurrentQuestionDTO(BaseModel):
    id: str
    text: str
    options: list[str] = []
    difficulty: str = "medium"


class LastAttemptDTO(BaseModel):
    selectedOptionIndex: int
    isCorrect: bool
    correctOptionIndex: int


class RecentAttemptDTO(BaseModel):
    questionId: str
    isCorrect: bool
    topicId: str


class LearningContextDTO(BaseModel):
    """Mirrors the frontend LearningContext TypeScript interface (camelCase)."""
    topicId: str = ""
    topicName: str = ""
    chapterName: str | None = None
    currentQuestion: CurrentQuestionDTO | None = None
    lastAttempt: LastAttemptDTO | None = None
    recentAttempts: list[RecentAttemptDTO] = []
    pageContext: str = "general"


class StudyBuddyRequest(BaseModel):
    user_id: str
    messages: list[MessageDTO]
    learning_context: LearningContextDTO | None = None
    # mode controls KSSM RAG routing:
    #   "standard"    — KSSM only for conceptual questions on supported topics (default)
    #   "kssm_strict" — always use KSSM when topic is ubahan / matriks / insurans
    #   "kssm_off"    — never use KSSM; normal Gemini chat for everything
    mode: str = "standard"

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


class CreateFlashcardsAction(BaseModel):
    type: Literal["create_flashcards"] = "create_flashcards"
    flashcard_set_id: str
    flashcard_title: str
    topic_id: str
    num_cards: int


AgentAction = Union[NoAction, CreateQuizAction, CreateFlashcardsAction]


class ChatResponse(BaseModel):
    reply: str
    action: AgentAction
    meta: dict = {}


_TOPIC_NAMES_FC = {
    "ubahan": "Ubahan (Variation)",
    "matriks": "Matriks (Matrices)",
    "insurans": "Matematik Pengguna: Insurans",
}




# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/study-buddy", response_model=ChatResponse)
def study_buddy_chat(body: StudyBuddyRequest) -> ChatResponse:
    """
    Agentic study-buddy chat.

    Flow:
      1. AI intent classifier (single OpenAI call) determines intent.
      2. create_flashcards → generate + save set, return action payload.
      3. create_quiz       → create quiz, return action payload.
      4. understand_concept / chat → run StudyBuddy conversation.
    """
    messages: list[ChatMessage] = [
        {"role": m.role, "content": m.content} for m in body.messages
    ]

    latest_user_msg = _last_user_message(messages)
    if not latest_user_msg:
        raise HTTPException(status_code=400, detail="No user message found.")

    context_topic: str | None = body.learning_context.topicId if body.learning_context else None

    # --- Step 1: AI intent classification (single call, replaces all keyword matching) ---
    try:
        intent_result = _agent.decide_intent_and_reply(latest_user_msg, context_topic=context_topic)
    except Exception as exc:
        logger.error("Intent classification error for user %s: %s", body.user_id, exc)
        intent_result = {"intent": "chat"}

    intent = intent_result.get("intent", "chat")

    # --- Step 2: flashcard intent ---
    if intent == "create_flashcards":
        topic_id: str | None = intent_result.get("topic_id")
        if topic_id is None:
            return ChatResponse(
                reply="Sure! Which topic would you like flashcards for? (Ubahan, Matriks, or Insurans)",
                action=NoAction(),
                meta={"pick_flashcard_topic": True},
            )
        num_cards: int = int(intent_result.get("num_cards", 8))
        subtopic_hint: str | None = intent_result.get("subtopic_hint")
        topic_name = _TOPIC_NAMES_FC.get(topic_id, topic_id)
        title = f"{topic_name}" + (f" – {subtopic_hint.title()}" if subtopic_hint else "")

        try:
            generator = get_generator()
            cards_data = asyncio.get_event_loop().run_until_complete(
                generator.generate_flashcards(topic_id, subtopic_hint, num_cards)
            )
        except RuntimeError:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(
                    asyncio.run,
                    get_generator().generate_flashcards(topic_id, subtopic_hint, num_cards),
                )
                cards_data = future.result(timeout=30)
        except Exception as exc:
            logger.error("Flashcard generation failed for user %s: %s", body.user_id, exc)
            return _chat_reply(body.user_id, messages, body.learning_context)

        try:
            flash_set = flashcard_service.create_set(
                user_id=body.user_id,
                topic_id=topic_id,  # type: ignore[arg-type]
                title=title,
                cards_data=cards_data,
                subtopic=subtopic_hint,
            )
        except Exception as exc:
            logger.error("Flashcard set creation failed for user %s: %s", body.user_id, exc)
            return _chat_reply(body.user_id, messages, body.learning_context)

        actual = len(flash_set.cards)
        logger.info(
            "StudyBuddy [%s]: created flashcard set %s (%s, %d cards)",
            body.user_id, flash_set.id, topic_id, actual,
        )
        return ChatResponse(
            reply=f"I've created a set of **{actual} flashcard{'s' if actual != 1 else ''}** on **{title}**. Let's study them now! 🃏",
            action=CreateFlashcardsAction(
                flashcard_set_id=flash_set.id,
                flashcard_title=title,
                topic_id=topic_id,
                num_cards=actual,
            ),
        )

    # --- Step 3: quiz intent ---
    if intent == "create_quiz":
        topic_id = intent_result.get("topic_id") or "ubahan"
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
            return _chat_reply(body.user_id, messages, body.learning_context)

        topic_name = TOPIC_NAMES.get(topic_id, topic_id)
        logger.info(
            "StudyBuddy [%s]: created quiz %s (%s, %d Qs)",
            body.user_id, quiz.id, topic_id, quiz.question_count,
        )
        return ChatResponse(
            reply=(
                f"I've created a personalised **{topic_name}** quiz with "
                f"{quiz.question_count} question{'s' if quiz.question_count != 1 else ''} "
                f"just for you. Opening it now! 🚀"
            ),
            action=CreateQuizAction(
                quiz_id=quiz.id,
                topic_id=topic_id,
                title=quiz.title,
                question_count=quiz.question_count,
            ),
        )

    # --- Step 4: understand_concept / chat → normal conversational path ---
    return _chat_reply(body.user_id, messages, body.learning_context, body.mode)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _chat_reply(
    user_id: str,
    messages: list[ChatMessage],
    raw_context: LearningContextDTO | None = None,
    mode: str = "standard",
) -> ChatResponse:
    """Run the full StudyBuddy conversation and wrap in ChatResponse.

    mode mapping → kssm_mode passed to the agent:
      "standard"    → "auto"   (KSSM for conceptual questions on supported topics)
      "kssm_strict" → "strict" (always use KSSM for supported topics)
      "kssm_off"    → "off"    (never use KSSM)
    """
    _mode_map = {"standard": "auto", "kssm_strict": "strict", "kssm_off": "off"}
    kssm_mode = _mode_map.get(mode, "auto")

    # Convert Pydantic model → plain dict so the agent's TypedDict-based
    # build_context_message() receives the same camelCase keys the frontend sends.
    ctx: LearningContext | None = (
        raw_context.model_dump()  # type: ignore[assignment]
        if raw_context else None
    )

    try:
        result = _agent.chat(
            user_id=user_id,
            messages=messages,
            learning_context=ctx,
            kssm_mode=kssm_mode,
        )
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

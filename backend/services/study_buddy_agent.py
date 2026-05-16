"""
StudyBuddy Agent — Gemini-powered conversational tutor for SPM Math Form 5.

Covers exactly three topics:
  1. Ubahan        (variation: direct, inverse, joint, partial)
  2. Matriks       (matrix operations and applications)
  3. Matematik Pengguna: Insurans (consumer math: insurance)

Usage:
    agent = StudyBuddyAgent()
    reply = await agent.chat(user_id="u123", messages=[
        {"role": "user", "content": "How do I solve direct variation?"}
    ])
"""

from __future__ import annotations

import logging
import os
from typing import Literal, TypedDict

import google.generativeai as genai

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model configuration — change MODEL_NAME here to swap models globally.
# ---------------------------------------------------------------------------

MODEL_NAME = "gemini-1.5-pro"          # swap to "gemini-1.5-flash" for faster/cheaper
TEMPERATURE = 0.4                       # lower = more consistent tutoring answers
MAX_OUTPUT_TOKENS = 1024

# ---------------------------------------------------------------------------
# System prompt — canonical StudyBuddy persona.
# Update the block below to change the tutor's behaviour for all calls.
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are "StudyBuddy", an AI tutor for Malaysian SPM Mathematics Form 5.
Your job in this demo is to help students understand and practise ONLY these three topics:
1. Ubahan (direct, inverse, joint and partial variation)
2. Matriks (matrix operations and simple applications)
3. Matematik Pengguna: Insurans (insurance concepts and calculations)

Guiding principles:
- Always respond in the same language the student uses (Bahasa Malaysia or English).
- Be encouraging, patient, and concise — SPM students need clarity, not walls of text.
- For calculations, show every step clearly and label each step.
- When a student makes a mistake, gently point out the error and guide them to the right answer rather than just giving it.
- Use Malaysian curriculum conventions (SPM marking scheme style).
- If a student asks about anything outside the three topics above, politely decline and redirect:
  "Untuk demo ini, saya hanya boleh bantu dengan Ubahan, Matriks, dan Insurans."
  ("For this demo, I can only help with Ubahan, Matriks, and Insurans.")
- Never fabricate formulae or rules; if unsure, say so.

Topic reference:
UBAHAN
  - Direct variation: y ∝ x  →  y = kx
  - Inverse variation: y ∝ 1/x  →  y = k/x
  - Joint variation: y ∝ xⁿzᵐ
  - Partial variation: y = kx + c

MATRIKS
  - Matrix notation, order, equality
  - Addition, subtraction, scalar multiplication
  - Matrix multiplication (conformability rule)
  - Identity matrix, inverse of a 2×2 matrix
  - Solving simultaneous linear equations using matrices

MATEMATIK PENGGUNA: INSURANS
  - Types of insurance (life, motor, medical, fire)
  - Premium calculation (basic premium, loading, NCD)
  - Policy concepts: sum insured, excess, rider, beneficiary
  - Claims process and indemnity principle
  - Simple interest and compound interest applied to insurance savings plans
"""

# ---------------------------------------------------------------------------
# Message type
# ---------------------------------------------------------------------------


class ChatMessage(TypedDict):
    role: Literal["user", "assistant", "system"]
    content: str


# ---------------------------------------------------------------------------
# Topic guardrail — fast-path check before hitting Gemini.
# ---------------------------------------------------------------------------

# Keywords that strongly signal one of the three supported topics.
_SUPPORTED_KEYWORDS: list[str] = [
    # Ubahan / variation
    "ubahan", "variation", "direct variation", "inverse variation",
    "joint variation", "partial variation", "ubahan langsung",
    "ubahan songsang", "ubahan bersama", "ubahan separa",
    # Matriks / matrices
    "matriks", "matrix", "matrices", "determinant", "inverse matrix",
    "transpose", "identity matrix", "simultaneous", "serentak",
    # Insurans / insurance
    "insurans", "insurance", "premium", "polisi", "policy",
    "perlindungan", "coverage", "indemnity", "ncd", "no-claim",
    "beneficiary", "waris", "sum insured", "takaful",
]

# Keywords that clearly signal out-of-scope subjects — used as a secondary
# signal when no supported keywords are found.
_BLOCKLIST_KEYWORDS: list[str] = [
    "chemistry", "kimia", "biology", "biologi", "physics", "fizik",
    "history", "sejarah", "geography", "geografi", "literature",
    "english essay", "moral", "pendidikan islam", "add math",
    "additional math", "matematik tambahan",
]

_OUT_OF_SCOPE_REPLY = (
    "Untuk demo ini, saya hanya boleh bantu dengan tiga topik: "
    "Ubahan, Matriks, dan Matematik Pengguna: Insurans (SPM Math Form 5). "
    "Sila tanya soalan berkaitan topik-topik tersebut. 😊\n\n"
    "*(For this demo I can only help with Ubahan, Matriks, and Insurans for SPM Math Form 5.)*"
)


def is_supported_topic(message: str) -> bool:
    """
    Return True if the message appears to be within the three supported topics.

    Strategy (in order):
    1. If any supported keyword is present → in scope.
    2. If any blocklist keyword is present and no supported keyword → out of scope.
    3. Ambiguous / general math questions → assume in scope (let Gemini handle it).
    """
    lower = message.lower()

    if any(kw in lower for kw in _SUPPORTED_KEYWORDS):
        return True

    if any(kw in lower for kw in _BLOCKLIST_KEYWORDS):
        return False

    # Default: pass through to Gemini; the system prompt handles redirection.
    return True


# ---------------------------------------------------------------------------
# Gemini client (lazy singleton)
# ---------------------------------------------------------------------------

_gemini_configured = False


def _configure_gemini() -> None:
    global _gemini_configured
    if _gemini_configured:
        return
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. "
            "Add it to your backend/.env file."
        )
    genai.configure(api_key=api_key)
    _gemini_configured = True


# ---------------------------------------------------------------------------
# StudyBuddyAgent
# ---------------------------------------------------------------------------


class StudyBuddyAgent:
    """
    Conversational tutor agent backed by Google Gemini.

    Each call to `chat()` is stateless — the caller passes the full
    conversation history and receives the next assistant reply.
    """

    def __init__(
        self,
        model_name: str = MODEL_NAME,
        temperature: float = TEMPERATURE,
        max_output_tokens: int = MAX_OUTPUT_TOKENS,
    ) -> None:
        self.model_name = model_name
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def chat(
        self,
        user_id: str,
        messages: list[ChatMessage],
        *,
        skip_guardrail: bool = False,
    ) -> dict:
        """
        Generate the next tutor reply.

        Args:
            user_id:        Caller's user ID (logged for tracing; not sent to Gemini).
            messages:       Conversation history. Last entry must be role="user".
            skip_guardrail: Set True to bypass the topic guardrail (for testing).

        Returns:
            {
                "reply": str,           # assistant message text
                "out_of_scope": bool,   # True if guardrail blocked the call
            }
        """
        if not messages:
            return {"reply": "Hi! Ask me anything about Ubahan, Matriks, or Insurans.", "out_of_scope": False}

        latest_user_message = self._last_user_message(messages)

        # --- Topic guardrail (fast path) ---
        if not skip_guardrail and not is_supported_topic(latest_user_message):
            logger.info("StudyBuddy [%s]: out-of-scope message blocked", user_id)
            return {"reply": _OUT_OF_SCOPE_REPLY, "out_of_scope": True}

        # --- Call Gemini ---
        try:
            reply_text = self._call_gemini(messages)
            logger.info("StudyBuddy [%s]: reply generated (%d chars)", user_id, len(reply_text))
            return {"reply": reply_text, "out_of_scope": False}
        except Exception as exc:
            logger.error("StudyBuddy [%s]: Gemini call failed — %s", user_id, exc)
            raise

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _call_gemini(self, messages: list[ChatMessage]) -> str:
        """
        Build the Gemini request and return the reply text.

        Gemini's `GenerativeModel` uses a different history format than
        OpenAI-style APIs:
          - System instruction is passed at model construction time.
          - History is a list of {"role": "user"|"model", "parts": [text]}.
          - "assistant" role maps to "model" in Gemini's API.
        """
        _configure_gemini()

        # Build the model with the system prompt baked in.
        # To change temperature or model, adjust the constants at the top of
        # this file or pass them to StudyBuddyAgent.__init__.
        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.types.GenerationConfig(
                temperature=self.temperature,
                max_output_tokens=self.max_output_tokens,
            ),
        )

        # Convert ChatMessage list → Gemini history format.
        # Skip any system-role messages (already handled by system_instruction).
        history: list[dict] = []
        for msg in messages[:-1]:                    # all but the last message
            if msg["role"] == "system":
                continue
            history.append({
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [msg["content"]],
            })

        # The last message must be from the user; start a chat and send it.
        last_msg = messages[-1]
        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(last_msg["content"])

        return response.text

    @staticmethod
    def _last_user_message(messages: list[ChatMessage]) -> str:
        """Return the content of the most recent user-role message."""
        for msg in reversed(messages):
            if msg["role"] == "user":
                return msg["content"]
        return ""

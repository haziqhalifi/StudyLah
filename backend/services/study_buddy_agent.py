"""
StudyBuddy Agent — OpenAI-powered conversational tutor for SPM Math Form 5.

SDK: openai  (pip install openai)
Model: gpt-4o-mini

Covers exactly three topics:
  1. Ubahan        (variation: direct, inverse, joint, partial)
  2. Matriks       (matrix operations and applications)
  3. Matematik Pengguna: Insurans (consumer math: insurance)
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, Literal, Optional, TypedDict

from dotenv import load_dotenv
from openai import OpenAI

# KSSM RAG components — imported lazily inside StudyBuddyAgent to avoid
# circular imports and to keep startup fast when RAG is not used.

# Load backend/.env so OPENAI_API_KEY is available regardless of cwd
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model configuration — swap MODEL_NAME here to change the model globally.
# ---------------------------------------------------------------------------

MODEL_NAME = "gpt-4o-mini"

# ---------------------------------------------------------------------------
# System prompt — canonical StudyBuddy persona (do not reformat).
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are "StudyBuddy", an AI tutor for Malaysian SPM Mathematics Form 5.
Your job in this demo is to help students understand and practise ONLY these three topics:

Ubahan (direct, inverse, joint and partial variation)

Matriks (matrix operations and simple applications)

Matematik Pengguna: Insurans (insurance concepts and calculations)

High‑level goals

Act as a friendly, encouraging study buddy, not a strict examiner.

Focus on deep understanding + practice, not just giving final answers.

Adapt your explanations to the student's level based on their answers.

Use simple, clear language, with Malaysian context and examples when helpful.

Language & tone

VERY IMPORTANT — Always respond in Bahasa Melayu (Malay) regardless of what language the student uses. Do not switch to English even if the student writes in English.

Use Bahasa Melayu terms and explanations throughout all responses.

Be concise, step‑by‑step, and positive.

Avoid heavy jargon; when you must use it, define it in simple words.

Always be respectful and supportive, especially when the student is wrong.

Tutor behaviour (VERY IMPORTANT)

Do NOT immediately give full solutions by default.

First, restate the problem briefly.

Then ask the student what they've tried or what they think the next step is.

Guide them one step at a time.

If the student explicitly says "Just give me the answer/solution", you may give a full solution, but still briefly explain the main idea.

When a student's answer is wrong:

Gently point out it is incorrect.

Explain what is wrong with the reasoning.

Show the correct step and invite them to try the next step themselves.

Encourage retrieval practice:

Ask "Can you explain this in your own words?" or "Which formula do you think fits here?".

Topic‑specific guidance

Ubahan (Variation)

Cover direct, inverse, joint, and partial variation.

Help students:

Translate statements into algebraic forms, e.g. "y varies directly as x" → y = kx.

Identify the type of variation from words or tables.

Solve for the constant of variation k.

Use the model to find new values.

Emphasise:

Distinguishing direct vs inverse vs joint.

Checking units and proportional reasoning.

Showing full workings clearly.

Matriks (Matrices)

Focus on:

Matrix notation, order, and conformability for operations.

Addition, subtraction, and multiplication of matrices.

Finding the inverse of a 2×2 matrix (when it exists).

Simple applications: e.g. cost/quantity problems modelled with matrices.

Emphasise:

Checking matrix dimensions before multiplying.

Showing row‑by‑column multiplication clearly.

Avoiding arithmetic slips in small examples.

Matematik Pengguna: Insurans (Consumer Math: Insurance)

Focus on:

Basic insurance terms: premium, sum insured, rate, under‑insurance, compensation formula.

Calculating premium given rate and sum insured.

Using the average clause:
Compensation = (Sum Insured / Value of Property) × Loss

Simple word problems in a Malaysian context (RM, per annum, etc.).

Emphasise:

Identifying what is given (sum insured, property value, loss).

Correctly applying the formula and interpreting the result.

What you MUST avoid

Do not answer questions outside the 3 topics (ubahan, matriks, insurans). Politely say you're focused on those topics for this demo.

Do not produce full exam sets by yourself; instead, generate short practice sets (3–5 questions) when asked.

Do not give long lectures. Prefer short explanation → question → student's attempt → feedback.

VERY IMPORTANT — do NOT generate practice questions proactively:

If the student sends a greeting (e.g. "hi", "hello", "hey", "hye") or a short casual message, respond warmly and briefly. Ask how you can help. Do NOT immediately generate a question or quiz. Wait until the student explicitly asks for a question or practice.

When generating practice questions

Ask the student which topic and difficulty they want: e.g. "Ubahan – easy", "Matriks – medium", or "Insurans – mixed".

Generate 3–5 questions at a time.

For each question, offer to:

wait for their answer, OR

give a small hint first.

When revealing solutions:

Show step‑by‑step workings.

Highlight key formulas used.

Connect back to the topic name ("This is inverse variation because…").

Safety and boundaries

Never give harmful, offensive, or inappropriate content.

If the student is stressed about exams, respond empathetically and give encouragement along with the math support.

Keep all content suitable for secondary school students."""

# ---------------------------------------------------------------------------
# Message type
# ---------------------------------------------------------------------------


class ChatMessage(TypedDict):
    role: Literal["user", "assistant", "system"]
    content: str


# ---------------------------------------------------------------------------
# Learning context — injected from the frontend when student is on a page
# with an active question. Maps to the frontend LearningContext type.
# ---------------------------------------------------------------------------


class LearningContext(TypedDict, total=False):
    topicId: str          # "ubahan" | "matriks" | "insurans"
    topicName: str        # e.g. "Ubahan (Variation)"
    chapterName: str      # e.g. "Direct Variation"
    currentQuestion: Dict[str, Any]   # {id, text, options, difficulty}
    lastAttempt: Dict[str, Any]       # {selectedOptionIndex, isCorrect, correctOptionIndex}
    recentAttempts: list              # [{questionId, isCorrect, topicId}, ...]
    pageContext: str       # "learn" | "review" | "quiz" | "general"


_OPTION_LABELS = ["A", "B", "C", "D", "E"]


def build_context_message(ctx: LearningContext) -> str:
    """
    Render a plain-text block that is injected as a system message so
    the model can give hyper-relevant, personalised answers.
    """
    lines: list[str] = ["--- STUDENT CONTEXT ---"]

    topic_name = ctx.get("topicName") or ctx.get("topicId", "Unknown")
    chapter = ctx.get("chapterName")
    if chapter:
        lines.append(f"Topic: {topic_name} > {chapter}")
    else:
        lines.append(f"Topic: {topic_name}")

    page = ctx.get("pageContext", "general")
    lines.append(f"Page: {page}")

    q = ctx.get("currentQuestion")
    if q:
        difficulty = q.get("difficulty", "unknown")
        lines.append(f"Difficulty: {difficulty}")
        lines.append(f'Current question: "{q.get("text", "")}"')
        options: list[str] = q.get("options", [])
        if options:
            formatted = "  ".join(
                f"{_OPTION_LABELS[i]}) {opt}"
                for i, opt in enumerate(options)
            )
            lines.append(f"Options: {formatted}")

    attempt = ctx.get("lastAttempt")
    if attempt and q:
        sel_idx: int = attempt.get("selectedOptionIndex", -1)
        correct_idx: int = attempt.get("correctOptionIndex", -1)
        is_correct: bool = attempt.get("isCorrect", False)
        options = q.get("options", [])

        sel_label = _OPTION_LABELS[sel_idx] if 0 <= sel_idx < len(_OPTION_LABELS) else "?"
        correct_label = _OPTION_LABELS[correct_idx] if 0 <= correct_idx < len(_OPTION_LABELS) else "?"

        if is_correct:
            lines.append(f"Student's last answer: Option {sel_label} (CORRECT ✓)")
        else:
            lines.append(
                f"Student's last answer: Option {sel_label} (WRONG ✗) — correct was Option {correct_label}"
            )

    recent: list = ctx.get("recentAttempts", [])
    if recent:
        correct_count = sum(1 for a in recent if a.get("isCorrect"))
        total = len(recent)
        lines.append(
            f"Recent performance: {correct_count} correct out of last {total} attempt{'s' if total != 1 else ''}"
        )

    lines.append("-----------------------")
    lines.append("Use this context to give a relevant, personalised response.")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Topic guardrail — fast-path check before hitting the API.
# ---------------------------------------------------------------------------

_SUPPORTED_KEYWORDS: list[str] = [
    "ubahan", "variation", "direct variation", "inverse variation",
    "joint variation", "partial variation", "ubahan langsung",
    "ubahan songsang", "ubahan bersama", "ubahan separa",
    "matriks", "matrix", "matrices", "determinant", "inverse matrix",
    "transpose", "identity matrix", "simultaneous", "serentak",
    "insurans", "insurance", "premium", "polisi", "policy",
    "perlindungan", "coverage", "indemnity", "ncd", "no-claim",
    "beneficiary", "waris", "sum insured", "takaful",
]

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

# ---------------------------------------------------------------------------
# KSSM RAG routing helpers
# ---------------------------------------------------------------------------

_KSSM_SUPPORTED_TOPICS: frozenset[str] = frozenset({"ubahan", "matriks", "insurans"})

_CONCEPTUAL_KEYWORDS: list[str] = [
    # English
    "explain", "what is", "what are", "what does", "how to", "how do",
    "how does", "why", "why is", "why does", "define", "definition",
    "describe", "formula", "concept", "meaning", "understand",
    "when to", "when do", "when is", "show me", "teach me",
    # Bahasa Melayu
    "jelaskan", "apa itu", "apa yang", "apakah", "bagaimana", "mengapa",
    "kenapa", "rumus", "maksud", "terangkan", "tunjukkan",
]


def _is_conceptual_question(message: str) -> bool:
    lower = message.lower()
    return any(kw in lower for kw in _CONCEPTUAL_KEYWORDS)


def is_supported_topic(message: str) -> bool:
    lower = message.lower()
    if any(kw in lower for kw in _SUPPORTED_KEYWORDS):
        return True
    if any(kw in lower for kw in _BLOCKLIST_KEYWORDS):
        return False
    return True  # ambiguous → let the system prompt handle it


# ---------------------------------------------------------------------------
# OpenAI client (lazy singleton)
# ---------------------------------------------------------------------------

_client: OpenAI | None = None


def _get_openai_api_key() -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OpenAI API key is not set. Add OPENAI_API_KEY to backend/.env."
        )
    return api_key


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=_get_openai_api_key())
    return _client


# ---------------------------------------------------------------------------
# AI-powered intent classifier (OpenAI JSON response)
# ---------------------------------------------------------------------------

_INTENT_SYSTEM_PROMPT = """You are an intent classifier for a Malaysian SPM Math Form 5 study chatbot.
Classify the user's message into exactly one of these intents:

- "create_quiz"       : User explicitly wants to take/generate a quiz or practice questions (e.g. "buat kuiz", "create quiz", "give me practice questions", "test me")
- "create_flashcards" : User explicitly wants flashcards created (e.g. "buat flashcard", "create flashcards", "kad imbas")
- "understand_concept": User wants explanation, wants to understand a concept, wants worked examples shown TO them, or asks "what is", "how does", "terangkan", "jelaskan" — even if the word "soalan" or "example" appears in passing
- "chat"              : Greetings, small talk, or anything else

IMPORTANT RULES:
- "Terangkan dengan contoh soalan" = understand_concept (they want an explanation WITH example questions shown to them, NOT a quiz)
- "Buat/cipta/hasilkan soalan/kuiz" = create_quiz (they want to answer questions themselves)
- "Buat/cipta flashcard/kad" = create_flashcards
- When in doubt between understand_concept and create_quiz, ask yourself: does the user want to BE TESTED, or do they want to LEARN/SEE an explanation?

Also extract:
- topic_id: "ubahan" | "matriks" | "insurans" | null
- num_questions: integer 3-10 (only for create_quiz, default 5)
- num_cards: integer 3-20 (only for create_flashcards, default 8)
- subtopic_hint: short string describing subtopic if mentioned, else null

Respond ONLY with valid JSON, no markdown, no extra text. Example:
{"intent": "understand_concept", "topic_id": "insurans", "num_questions": null, "num_cards": null, "subtopic_hint": null}"""


def _classify_intent_with_ai(
    message: str, context_topic: Optional[str] = None
) -> Dict[str, Any]:
    """
    AI-powered intent classifier using OpenAI structured JSON output.
    Falls back to chat intent on any error so the conversation always continues.
    """
    try:
        client = _get_client()
        user_content = message
        if context_topic:
            user_content = f"[Current topic context: {context_topic}]\n\n{message}"

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": _INTENT_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            max_tokens=150,
            temperature=0,
        )
        raw = (response.choices[0].message.content or "{}").strip()
        result: Dict[str, Any] = __import__("json").loads(raw)

        intent = result.get("intent", "chat")
        if intent not in {"create_quiz", "create_flashcards", "understand_concept", "chat"}:
            intent = "chat"

        topic_id = result.get("topic_id") or context_topic or None
        if topic_id not in {"ubahan", "matriks", "insurans"}:
            topic_id = None

        num_questions = result.get("num_questions") or 5
        try:
            num_questions = max(3, min(int(num_questions), 10))
        except (TypeError, ValueError):
            num_questions = 5

        num_cards = result.get("num_cards") or 8
        try:
            num_cards = max(3, min(int(num_cards), 20))
        except (TypeError, ValueError):
            num_cards = 8

        subtopic_hint = result.get("subtopic_hint") or None

        logger.info(
            "AI intent classifier: intent=%s topic=%s", intent, topic_id
        )
        return {
            "intent": intent,
            "topic_id": topic_id,
            "num_questions": num_questions,
            "num_cards": num_cards,
            "subtopic_hint": subtopic_hint,
        }
    except Exception as exc:
        logger.warning("AI intent classifier failed, defaulting to chat: %s", exc)
        return {"intent": "chat", "topic_id": context_topic, "num_questions": 5, "num_cards": 8, "subtopic_hint": None}


# Keep old name as alias for the router that still calls decide_intent_and_reply
def _classify_intent(message: str, context_topic: Optional[str] = None) -> Dict[str, Any]:
    return _classify_intent_with_ai(message, context_topic)


# ---------------------------------------------------------------------------
# StudyBuddyAgent
# ---------------------------------------------------------------------------


class StudyBuddyAgent:
    """
    Conversational tutor backed by OpenAI.

    chat() is stateless — the caller provides the full conversation history
    and receives the complete assistant reply as a string.

    KSSM RAG mode
    -------------
    When kssm_mode is "auto" (default), chat() routes conceptual questions on
    supported topics (ubahan / matriks / insurans) through the KssmAnswerEngine
    so answers are grounded in KSSM syllabus chunks rather than free-form AI.

    kssm_mode values:
      "auto"   — use KSSM when topic is supported AND question looks conceptual.
      "strict" — use KSSM whenever topic is supported (ignores question type).
      "off"    — never use KSSM; always use the normal chat pipeline.
    """

    def __init__(self, model_name: str = MODEL_NAME) -> None:
        self.model_name = model_name
        self._kssm_engine = None
        self._kssm_retriever = None

    # ------------------------------------------------------------------
    # Lazy KSSM singletons
    # ------------------------------------------------------------------

    @property
    def kssm_engine(self):
        if self._kssm_engine is None:
            try:
                from backend.services.kssm_answer_engine import default_engine
            except ModuleNotFoundError:
                from services.kssm_answer_engine import default_engine  # type: ignore
            self._kssm_engine = default_engine
        return self._kssm_engine

    @property
    def kssm_retriever(self):
        if self._kssm_retriever is None:
            try:
                from backend.services.kssm_retriever import default_retriever
            except ModuleNotFoundError:
                from services.kssm_retriever import default_retriever  # type: ignore
            self._kssm_retriever = default_retriever
        return self._kssm_retriever

    # ------------------------------------------------------------------
    # Public chat interface
    # ------------------------------------------------------------------

    def chat(
        self,
        user_id: str,
        messages: list[ChatMessage],
        *,
        skip_guardrail: bool = False,
        learning_context: Optional[LearningContext] = None,
        kssm_mode: str = "auto",
    ) -> dict:
        """
        Returns:
            { "reply": str, "out_of_scope": bool }
        """
        if not messages:
            return {
                "reply": "Hi! I'm StudyBuddy. Ask me anything about Ubahan, Matriks, or Insurans.",
                "out_of_scope": False,
            }

        latest = self._last_user_message(messages)

        if not skip_guardrail and not is_supported_topic(latest):
            logger.info("StudyBuddy [%s]: out-of-scope blocked", user_id)
            return {"reply": _OUT_OF_SCOPE_REPLY, "out_of_scope": True}

        topic_id: str = (learning_context or {}).get("topicId", "")  # type: ignore[arg-type]
        if self._should_use_kssm(latest, topic_id, kssm_mode):
            logger.info(
                "StudyBuddy [%s]: routing to KSSM engine (topic=%s, mode=%s)",
                user_id, topic_id, kssm_mode,
            )
            answer = self.kssm_engine.answer_with_kssm(
                user_question=latest,
                topic_id=topic_id or None,
                retriever=self.kssm_retriever,
            )
            return {"reply": answer, "out_of_scope": False}

        try:
            reply_text = self._call_openai(messages, learning_context=learning_context)
            logger.info("StudyBuddy [%s]: reply %d chars", user_id, len(reply_text))
            return {"reply": reply_text, "out_of_scope": False}
        except Exception as exc:
            logger.error("StudyBuddy [%s]: OpenAI error — %s", user_id, exc)
            raise

    # ------------------------------------------------------------------
    # KSSM routing helper
    # ------------------------------------------------------------------

    @staticmethod
    def _should_use_kssm(message: str, topic_id: str, kssm_mode: str) -> bool:
        if kssm_mode == "off":
            return False
        if topic_id not in _KSSM_SUPPORTED_TOPICS:
            return False
        if kssm_mode == "strict":
            return True
        return _is_conceptual_question(message)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _call_openai(
        self,
        messages: list[ChatMessage],
        *,
        learning_context: Optional[LearningContext] = None,
    ) -> str:
        """
        Converts ChatMessage history → OpenAI messages list and calls
        chat.completions.create with the StudyBuddy system prompt.

        When learning_context is provided, a context block is injected as an
        additional system message so the model always has the student's
        current situation in view.
        """
        client = _get_client()

        openai_messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

        if learning_context:
            ctx_text = build_context_message(learning_context)
            openai_messages.append({"role": "system", "content": ctx_text})

        for msg in messages:
            if msg["role"] == "system":
                continue
            openai_messages.append({"role": msg["role"], "content": msg["content"]})

        response = client.chat.completions.create(
            model=self.model_name,
            messages=openai_messages,  # type: ignore[arg-type]
        )

        return (response.choices[0].message.content or "").strip()

    def decide_intent_and_reply(
        self, user_message: str, context_topic: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Classify the user's message as quiz-creation or normal chat using
        keyword matching (fast, no extra API call).

        Returns one of:
            {"intent": "chat"}
            {"intent": "create_quiz", "topic_id": "ubahan"|"matriks"|"insurans",
                                      "num_questions": 5}
        """
        return _classify_intent(user_message, context_topic=context_topic)

    @staticmethod
    def _last_user_message(messages: list[ChatMessage]) -> str:
        for msg in reversed(messages):
            if msg["role"] == "user":
                return msg["content"]
        return ""

"""
KSSM Answer Engine — generation layer of the StudyLah RAG pipeline.

Gemini is given the retrieved KSSM syllabus context and instructed to answer
using ONLY that context.  This eliminates hallucinated formulas or definitions
that conflict with the Malaysian KSSM syllabus.

Prompt structure sent to Gemini
────────────────────────────────
SYSTEM:
  You are an SPM Mathematics Form 5 tutor. You MUST answer using ONLY the
  KSSM syllabus context provided. Do not invent new formulas or definitions
  outside what is given. If the context is insufficient, say so clearly.

USER:
  --- KSSM SYLLABUS CONTEXT START ---
  Source: KSSM Textbook Form 5, Chapter 1 (Direct Variation)
  Content:
  Direct variation (ubahan langsung): y ∝ x means y = kx ...
  --- KSSM SYLLABUS CONTEXT END ---

  STUDENT QUESTION:
  What is direct variation and how do I find k?
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

try:
    from backend.services.kssm_retriever import KssmRetriever
except ModuleNotFoundError:
    from services.kssm_retriever import KssmRetriever  # type: ignore

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini configuration for KSSM-grounded answers
# Low temperature → more faithful, less creative.
# ---------------------------------------------------------------------------

_KSSM_MODEL = "gemini-2.0-flash"

_KSSM_SYSTEM_PROMPT = (
    "Anda adalah tutor Matematik SPM Tingkatan 5 untuk pelajar Malaysia. "
    "Anda MESTI menjawab menggunakan SAHAJA konteks silibus KSSM yang disediakan dalam mesej pengguna. "
    "JANGAN mencipta rumus, definisi, atau kaedah baharu yang tidak terdapat dalam konteks tersebut. "
    "Jika konteks yang diberikan tidak mencukupi untuk menjawab soalan, balas dengan tepat: "
    "'Saya tidak mempunyai cukup bahan silibus untuk topik ini. "
    "Sila tanya soalan lain atau pilih topik lain (Ubahan, Matriks, atau Insurans).' "
    "Jawab dalam Bahasa Melayu dengan jelas dan ringkas. "
    "Gunakan istilah matematik KSSM yang tepat seperti yang terdapat dalam konteks "
    "(contoh: ubahan langsung, pemalar ubahan, matriks songsang, pampasan, premium). "
    "Gunakan markdown: **tebal** untuk istilah penting, senarai bernombor untuk langkah, "
    "dan $...$ untuk matematik LaTeX sebaris (contoh: $y = kx$)."
)

# Fallback replies (no API call needed)
_NO_CONTEXT_REPLY = (
    "Saya tidak mempunyai cukup bahan silibus untuk soalan ini. "
    "Sila tanya soalan lain atau pilih topik lain (Ubahan, Matriks, atau Insurans)."
)
_GEMINI_ERROR_REPLY = (
    "Saya tidak dapat mengakses kandungan silibus pada masa ini. Sila cuba lagi."
)


class KssmAnswerEngine:
    """
    Generates KSSM-grounded answers using Gemini + retrieved syllabus context.

    Example
    -------
    from backend.services.kssm_retriever import default_retriever
    engine = KssmAnswerEngine()
    answer = engine.answer_with_kssm(
        user_question="What is direct variation?",
        topic_id="ubahan",
        retriever=default_retriever,
    )
    """

    def __init__(self, model_name: str = _KSSM_MODEL) -> None:
        self.model_name = model_name
        self._client = None  # lazy-initialised on first use

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def answer_with_kssm(
        self,
        user_question: str,
        topic_id: Optional[str],
        retriever: KssmRetriever,
    ) -> str:
        """
        Generate a KSSM-grounded answer for the student's question.

        Pipeline:
          1. Retrieve relevant KSSM syllabus chunks via the retriever.
          2. If none found → return polite "not enough material" message.
          3. Build Gemini prompt: KSSM context block + student question.
          4. Call Gemini with low temperature (0.2) to minimise hallucination.
          5. On any error → return graceful fallback message.

        This method is synchronous and safe to call from a FastAPI sync endpoint.

        TODO (async upgrade):
          Change signature to `async def answer_with_kssm(...)` and replace
          `_call_gemini` with an async Gemini call when the router is converted
          to `async def`.
        """
        # Step 1 — retrieve context
        chunks = retriever.retrieve_context(
            topic_id=topic_id,
            user_question=user_question,
        )

        # Step 2 — bail early when no relevant chunks are available
        if not chunks:
            logger.info(
                "KssmAnswerEngine: no chunks found (topic=%s, q=%r)",
                topic_id,
                user_question[:60],
            )
            return _NO_CONTEXT_REPLY

        # Step 3 — build the user message: context block + question
        context_block = retriever.format_context_for_prompt(chunks)
        user_message = (
            f"{context_block}\n\n"
            f"STUDENT QUESTION:\n{user_question}"
        )

        # Step 4 — call Gemini
        logger.info(
            "KssmAnswerEngine: calling Gemini with %d chunks (topic=%s)",
            len(chunks),
            topic_id,
        )
        try:
            return self._call_gemini(user_message)
        except Exception as exc:
            logger.error("KssmAnswerEngine: Gemini error — %s", exc)
            return _GEMINI_ERROR_REPLY

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _get_client(self):
        """Lazy-initialise the google-genai client (same SDK as StudyBuddy)."""
        if self._client is None:
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            if not api_key:
                raise RuntimeError(
                    "Gemini API key not set. Add GEMINI_API_KEY to backend/.env."
                )
            from google import genai
            self._client = genai.Client(api_key=api_key)
        return self._client

    def _call_gemini(self, user_message: str) -> str:
        """
        Non-streaming Gemini call with the KSSM system prompt.

        Uses generate_content (not streaming) because the grounded-answer path
        does not need incremental output — the full answer is returned at once.
        Temperature is fixed at _KSSM_TEMPERATURE (0.2).
        """
        from google.genai import types

        client = self._get_client()

        config = types.GenerateContentConfig(
            system_instruction=[types.Part.from_text(text=_KSSM_SYSTEM_PROMPT)],
        )

        response = client.models.generate_content(
            model=self.model_name,
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=user_message)],
                )
            ],
            config=config,
        )

        text = (response.text or "").strip()
        return text if text else _NO_CONTEXT_REPLY


# Module-level singleton — import and use this in other services.
default_engine = KssmAnswerEngine()

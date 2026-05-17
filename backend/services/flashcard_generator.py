"""
FlashcardGenerator — uses OpenAI to generate Q-A flashcards grounded in
KSSM SPM Form 5 Mathematics content (Ubahan, Matriks, Insurans).

Falls back to hard-coded seed pairs when OpenAI is unavailable.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

_MODEL = "gpt-4o-mini"

# ---------------------------------------------------------------------------
# Topic-specific prompt hints
# ---------------------------------------------------------------------------

_TOPIC_HINTS: dict[str, str] = {
    "ubahan": (
        "Cover direct variation (y = kx), inverse variation (y = k/x), joint variation "
        "(y = kxz), and partial variation. Focus on definitions, formulas, identifying "
        "variation type from tables or statements, finding the constant k, and computing "
        "new values. Use small, concrete numerical examples."
    ),
    "matriks": (
        "Cover matrix notation (order m×n), matrix addition and subtraction, scalar "
        "multiplication, matrix multiplication (row × column), 2×2 determinant, 2×2 "
        "inverse matrix formula, and simple applied problems (e.g. simultaneous equations "
        "via matrix method). Avoid calculations too large for a flashcard."
    ),
    "insurans": (
        "Cover key terms: premium, sum insured, property value, under-insurance, "
        "average clause / compensation formula: "
        "Compensation = (Sum Insured / Property Value) × Loss. "
        "Include basic premium calculations (RM, per annum) and "
        "interpretation of results in Malaysian context."
    ),
}

_TOPIC_NAMES: dict[str, str] = {
    "ubahan": "Ubahan (Variation)",
    "matriks": "Matriks (Matrices)",
    "insurans": "Matematik Pengguna: Insurans",
}

# ---------------------------------------------------------------------------
# Fallback seed flashcards (used when OpenAI is unavailable)
# ---------------------------------------------------------------------------

_SEED_CARDS: dict[str, list[dict]] = {
    "ubahan": [
        {"question": "What is direct variation?", "answer": "y varies directly as x means y = kx, where k is a non-zero constant."},
        {"question": "What is inverse variation?", "answer": "y varies inversely as x means y = k/x, where k is a non-zero constant."},
        {"question": "What is joint variation?", "answer": "y varies jointly as x and z means y = kxz, where k is a non-zero constant."},
        {"question": "If y = 12 when x = 3 and y ∝ x, find k.", "answer": "k = y/x = 12/3 = 4, so y = 4x."},
        {"question": "If y ∝ 1/x and y = 5 when x = 2, find y when x = 10.", "answer": "k = xy = 5×2 = 10. When x = 10: y = 10/10 = 1."},
    ],
    "matriks": [
        {"question": "What is the order of a matrix with 2 rows and 3 columns?", "answer": "2 × 3 (read as '2 by 3')."},
        {"question": "What is the determinant of [[a, b], [c, d]]?", "answer": "det = ad − bc."},
        {"question": "What is the inverse of [[a, b], [c, d]] when det ≠ 0?", "answer": "1/(ad−bc) × [[d, −b], [−c, a]]."},
        {"question": "When can two matrices be multiplied?", "answer": "When the number of columns in the first equals the number of rows in the second."},
        {"question": "What is the identity matrix I₂?", "answer": "[[1, 0], [0, 1]]. Any matrix A × I = I × A = A."},
    ],
    "insurans": [
        {"question": "What is a premium in insurance?", "answer": "The amount paid by the policyholder to the insurer, usually annually, to keep the policy active."},
        {"question": "What is 'sum insured'?", "answer": "The maximum amount the insurer will pay in the event of a claim."},
        {"question": "What is under-insurance?", "answer": "When the sum insured is less than the actual property value, meaning the policyholder bears part of any loss."},
        {"question": "State the average clause formula.", "answer": "Compensation = (Sum Insured ÷ Property Value) × Loss suffered."},
        {"question": "A property worth RM200,000 is insured for RM100,000. Fire causes RM40,000 damage. Find compensation.", "answer": "Compensation = (100,000 / 200,000) × 40,000 = RM20,000."},
    ],
}

# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------


class FlashcardGenerator:
    """
    Generates Q-A flashcards using OpenAI.
    Optionally uses a KssmRetriever for KSSM-grounded context.
    """

    def __init__(self, kssm_retriever=None) -> None:
        self._kssm_retriever = kssm_retriever
        self._client = None  # lazy-initialised on first use

    def _get_client(self):
        if self._client is None:
            from openai import OpenAI
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise RuntimeError("OPENAI_API_KEY not set.")
            self._client = OpenAI(api_key=api_key)
        return self._client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_flashcards(
        self,
        topic_id: str,
        subtopic_hint: Optional[str],
        num_cards: int,
    ) -> list[dict]:
        """
        Return num_cards items: [{"question": str, "answer": str}, ...].
        Falls back to seed cards if OpenAI is unavailable or fails.
        """
        num_cards = max(3, min(num_cards, 20))

        prompt = self._build_prompt(topic_id, subtopic_hint, num_cards)
        try:
            client = self._get_client()
            raw = self._call_openai(client, prompt)
            cards = self._parse_response(raw)
            if len(cards) >= 3:
                return cards[:num_cards]
            logger.warning("FlashcardGenerator: OpenAI returned too few cards (%d), using seed.", len(cards))
        except Exception as exc:
            logger.error("FlashcardGenerator: OpenAI call failed — %s", exc)

        return self._seed_fallback(topic_id, num_cards)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_prompt(self, topic_id: str, subtopic_hint: Optional[str], num_cards: int) -> str:
        topic_name = _TOPIC_NAMES.get(topic_id, topic_id)
        topic_hint = _TOPIC_HINTS.get(topic_id, "")

        kssm_context = ""
        if self._kssm_retriever:
            try:
                query = subtopic_hint or "general"
                chunks = self._kssm_retriever.retrieve(topic_id=topic_id, query=query, top_k=3)
                if chunks:
                    kssm_context = "\n\nKSSM SYLLABUS CONTEXT:\n" + "\n---\n".join(
                        c.content if hasattr(c, "content") else str(c) for c in chunks
                    )
            except Exception as exc:
                logger.warning("FlashcardGenerator: KSSM retrieval failed — %s", exc)

        subtopic_line = f"\nFocus subtopic: {subtopic_hint}" if subtopic_hint else ""

        return (
            "You are an SPM Mathematics Form 5 tutor. Generate flashcards (question + short answer) "
            "for Malaysian students based on the given topic and KSSM syllabus context. "
            "Write ALL questions and answers in Bahasa Melayu. "
            "Use clear, exam-relevant language. Each question should be concise (fits on a card). "
            "Each answer should be a direct, brief explanation or formula — not a multi-step solution."
            f"{kssm_context}\n\n"
            f"Topic: {topic_name}{subtopic_line}\n"
            f"Topic guidance: {topic_hint}\n\n"
            f"Generate exactly {num_cards} flashcards.\n\n"
            "Respond with ONLY valid JSON in this exact format, no extra text:\n"
            '{"flashcards": [{"question": "...", "answer": "..."}, ...]}'
        )

    def _call_openai(self, client, prompt: str) -> str:
        response = client.chat.completions.create(
            model=_MODEL,
            temperature=0.5,
            messages=[{"role": "user", "content": prompt}],
        )
        return (response.choices[0].message.content or "").strip()

    def _parse_response(self, raw: str) -> list[dict]:
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
        data = json.loads(cleaned)
        cards = data.get("flashcards", [])
        validated = []
        for item in cards:
            if isinstance(item, dict) and item.get("question") and item.get("answer"):
                validated.append({"question": str(item["question"]), "answer": str(item["answer"])})
        return validated

    def _seed_fallback(self, topic_id: str, num_cards: int) -> list[dict]:
        seeds = _SEED_CARDS.get(topic_id, _SEED_CARDS["ubahan"])
        result = []
        for i in range(num_cards):
            result.append(seeds[i % len(seeds)])
        return result


# Module-level singleton (kssm_retriever wired up lazily on first use)
_generator_instance: FlashcardGenerator | None = None


def get_generator() -> FlashcardGenerator:
    global _generator_instance
    if _generator_instance is None:
        try:
            try:
                from backend.services.kssm_retriever import default_retriever  # type: ignore
            except (ModuleNotFoundError, ImportError):
                from services.kssm_retriever import default_retriever  # type: ignore
            _generator_instance = FlashcardGenerator(kssm_retriever=default_retriever)
        except Exception:
            _generator_instance = FlashcardGenerator()
    return _generator_instance

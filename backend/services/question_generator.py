from __future__ import annotations

import json
import logging
import re
import uuid
from dataclasses import dataclass
from typing import Iterable, Optional

from backend.data.seed_questions import get_seed_questions
from backend.schemas.question import Question, SkillProfile
from backend import db

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an expert SPM Mathematics Form 5 question writer for Malaysian students. "
    "Generate MCQ questions that follow SPM exam format and marking scheme. Questions must be clear, "
    "unambiguous, and at the specified difficulty level. "
    "IMPORTANT: Write ALL question text and answer options in Bahasa Melayu (Malay). "
    "Always return valid JSON only, no extra text."
)

_TOPIC_NAMES = {
    "ubahan": "Ubahan (Variation)",
    "matriks": "Matriks (Matrices)",
    "insurans": "Matematik Pengguna: Insurans",
}


@dataclass(slots=True)
class _GeminiConfig:
    api_key: Optional[str]
    model_name: str


class QuestionGenerator:
    """
    Uses Gemini to generate brand-new MCQ questions for SPM Form 5 Math.
    Falls back to picking from the existing question bank if Gemini fails.
    """

    def __init__(self) -> None:
        self._gemini = self._create_client()

    def _create_client(self):
        try:
            from backend.config.settings import settings
            cfg = _GeminiConfig(api_key=settings.gemini_api_key, model_name=settings.gemini_model_name)
            if not cfg.api_key:
                return None
            try:
                import google.generativeai as genai  # type: ignore
                genai.configure(api_key=cfg.api_key)
                return (genai.GenerativeModel(cfg.model_name), cfg.model_name)
            except Exception:
                from google import genai  # type: ignore

                return (genai.Client(api_key=cfg.api_key), cfg.model_name)
        except Exception as exc:
            logger.warning("Gemini client unavailable: %s", exc)
            return None

    def generate_questions_with_gemini(
        self,
        topic_id: str,
        difficulty: str,
        num_questions: int,
        subtopic_hint: str | None = None,
    ) -> list[Question]:
        topic_name = _TOPIC_NAMES.get(topic_id, topic_id)
        prompt = self._build_prompt(topic_name, topic_id, difficulty, num_questions, subtopic_hint)
        payload = self._call_gemini(prompt)
        questions = self._parse_questions(payload, topic_id, difficulty)
        if not questions:
            raise ValueError("Gemini returned no valid questions")
        return questions[:num_questions]

    def pick_from_bank_fallback(
        self,
        topic_id: str,
        difficulty: str,
        num_questions: int,
        skill_profile: SkillProfile,
    ) -> list[Question]:
        bank = list(get_seed_questions(topic_id=topic_id))
        if not bank:
            bank = [q for q in db.get_all_questions(topic_id=topic_id)]

        if not bank:
            return []

        attempts = db.get_user_attempts(skill_profile.user_id)
        recent_ids = [attempt.question_id for attempt in attempts[-10:]]

        preferred = [q for q in bank if q.difficulty == difficulty]
        others = [q for q in bank if q.difficulty != difficulty]

        def sort_key(question: Question) -> tuple[int, int]:
            recency = recent_ids.index(question.id) if question.id in recent_ids else 10_000
            return (recency, bank.index(question))

        preferred.sort(key=sort_key)
        others.sort(key=sort_key)

        selected: list[Question] = []
        for question in preferred + others:
            if question.id in {q.id for q in selected}:
                continue
            selected.append(question)
            if len(selected) >= num_questions:
                break
        return selected[:num_questions]

    def generate_for_weak_subtopics(
        self,
        skill_profile: SkillProfile,
        topic_id: str,
        num_questions: int = 5,
    ) -> list[Question]:
        topic_stats = skill_profile.topics.get(topic_id)
        if topic_stats is None:
            return self.pick_from_bank_fallback(topic_id, "medium", num_questions, skill_profile)

        accuracy = topic_stats.accuracy
        if accuracy < 0.4:
            difficulty = "easy"
        elif accuracy < 0.7:
            difficulty = "medium"
        else:
            difficulty = "hard"

        weak_hints = self._infer_weak_subtopics(topic_id)
        subtopic_hint = ", ".join(weak_hints[:2]) if weak_hints else None

        try:
            return self.generate_questions_with_gemini(
                topic_id=topic_id,
                difficulty=difficulty,
                num_questions=num_questions,
                subtopic_hint=subtopic_hint,
            )
        except Exception as exc:
            logger.warning("Gemini generation failed for %s: %s", topic_id, exc)
            return self.pick_from_bank_fallback(topic_id, difficulty, num_questions, skill_profile)

    def _build_prompt(
        self,
        topic_name: str,
        topic_id: str,
        difficulty: str,
        num_questions: int,
        subtopic_hint: str | None,
    ) -> str:
        subtopic_line = f"Focus especially on these weak subtopics: {subtopic_hint}." if subtopic_hint else ""
        return (
            f"{SYSTEM_PROMPT}\n\n"
            f"Topic: {topic_name} ({topic_id})\n"
            f"Difficulty: {difficulty}\n"
            f"Number of questions: {num_questions}\n"
            f"{subtopic_line}\n\n"
            "REMINDER: All question text and all answer options MUST be written in Bahasa Melayu.\n\n"
            "Return exactly this JSON shape:\n"
            "{\n"
            '  "questions": [\n'
            "    {\n"
            '      "text": "question text here",\n'
            '      "options": ["A", "B", "C", "D"],\n'
            '      "correct_option_index": 0,\n'
            '      "difficulty": "medium",\n'
            '      "subtopic": "direct_variation"\n'
            "    }\n"
            "  ]\n"
            "}\n"
            "Only valid JSON. No markdown, no explanations."
        )

    def _call_gemini(self, prompt: str) -> str:
        if self._gemini is None:
            raise RuntimeError("Gemini client is not configured")

        try:
            client, model_name = self._gemini
            if hasattr(client, "generate_content"):
                response = client.generate_content(prompt)
                return getattr(response, "text", "") or ""
            model = getattr(client, "models", None)
            if model is not None:
                response = model.generate_content(model=model_name, contents=prompt)
                return getattr(response, "text", "") or ""
        except Exception as exc:
            raise RuntimeError(f"Gemini generation failed: {exc}") from exc
        raise RuntimeError("Unsupported Gemini client")

    def _parse_questions(self, raw: str, topic_id: str, difficulty: str) -> list[Question]:
        if not raw:
            return []
        cleaned = raw.strip()
        match = re.search(r"\{.*\}", cleaned, re.S)
        if match:
            cleaned = match.group(0)

        data = json.loads(cleaned)
        questions_payload = data.get("questions", [])
        parsed: list[Question] = []
        for item in questions_payload:
            options = item.get("options") or []
            if len(options) != 4:
                continue
            parsed.append(
                Question(
                    id=str(uuid.uuid4()),
                    topic_id=topic_id,
                    text=str(item.get("text", "")).strip(),
                    options=[str(opt) for opt in options],
                    correct_option_index=int(item.get("correct_option_index", 0)),
                    difficulty=str(item.get("difficulty", difficulty)),
                    tags=[topic_id, str(item.get("subtopic", "")).strip()] if item.get("subtopic") else [topic_id],
                )
            )
        return parsed

    def _infer_weak_subtopics(self, topic_id: str) -> list[str]:
        bank = get_seed_questions(topic_id=topic_id)
        subtopics: list[str] = []
        for question in bank:
            for tag in question.tags:
                if tag not in subtopics and tag != topic_id:
                    subtopics.append(tag)
        return subtopics

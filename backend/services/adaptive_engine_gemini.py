"""
Gemini-backed adaptive engine for StudyLah.

SDK: google-genai  (pip install google-genai)
Model: controlled by settings.gemini_model_name (default "gemini-1.5-pro")

Each public method mirrors a function in ai_engine.py and is called by the
routing wrappers there when ADAPTIVE_ENGINE=gemini.  Every method:
  1. Builds a compact JSON prompt.
  2. Calls Gemini with low temperature for deterministic structured output.
  3. Parses the response into the existing domain models.
  4. Raises on failure so the caller's except-block triggers rule-based fallback.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Dict, List, Literal, Optional

from google import genai
from google.genai import types

from backend.schemas.question import Question, Attempt

logger = logging.getLogger(__name__)

# Re-import domain models defined in ai_engine to avoid circular imports.
# We import lazily inside each method where needed; the type aliases below
# are only used in type hints.
# SkillProfile = Dict[str, SkillStats]   (defined in ai_engine)


# ---------------------------------------------------------------------------
# GeminiAdaptiveEngine
# ---------------------------------------------------------------------------

class GeminiAdaptiveEngine:
    """
    Wraps the google-genai client and exposes one method per adaptive decision.

    All methods raise on error — the caller (ai_engine.py) catches and falls
    back to rule-based heuristics, so this class never swallows exceptions.
    """

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-pro", temperature: float = 0.2) -> None:
        # ── Gemini client init ──────────────────────────────────────────────
        # To swap models: change model_name at call site or via settings.
        # To change temperature: adjust the GenerateContentConfig below.
        self._client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.temperature = temperature

    # ------------------------------------------------------------------
    # Internal helper: single-turn call that returns raw text
    # ------------------------------------------------------------------

    def _call(self, system_prompt: str, user_prompt: str, max_tokens: int = 512) -> str:
        """Send one system+user turn to Gemini and return the text response."""
        config = types.GenerateContentConfig(
            # ── Tune prompt behaviour here ─────────────────────────────────
            temperature=self.temperature,   # low = more deterministic JSON
            max_output_tokens=max_tokens,
            system_instruction=[types.Part.from_text(text=system_prompt)],
        )
        response = self._client.models.generate_content(
            model=self.model_name,
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=user_prompt)],
                )
            ],
            config=config,
        )
        return response.text or ""

    @staticmethod
    def _parse_json(raw: str) -> object:
        """Strip markdown fences then parse JSON; raises ValueError on failure."""
        text = raw.strip()
        # Handle ```json ... ``` fences Gemini sometimes adds
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(
                line for line in lines
                if not line.strip().startswith("```")
            )
        return json.loads(text)

    # ------------------------------------------------------------------
    # 1. analyze_diagnostic_gemini
    # ------------------------------------------------------------------

    def analyze_diagnostic_gemini(
        self,
        questions: List[Question],
        attempts: List[Attempt],
    ) -> dict:
        """
        Returns a misconception map: { topic_id: [str, ...] }

        This is used to ENRICH an existing heuristic SkillProfile — not to
        replace it.  The caller merges misconceptions into SkillStats.

        Expected Gemini response shape:
            { "algebra": ["confuses signs when transposing"], "geometry": [] }
        """
        from backend.services.ai_engine import SkillStats  # local import avoids circular

        question_map: Dict[str, Question] = {q.id: q for q in questions}
        attempt_details = []
        for a in attempts:
            q = question_map.get(a.question_id)
            if q is None:
                continue
            attempt_details.append({
                "topic_id": q.topic_id,
                "question": q.text[:120],          # truncate to keep prompt small
                "options": q.options,
                "correct_option_index": q.correct_option_index,
                "selected_option_index": a.selected_option_index,
                "is_correct": a.is_correct,
            })

        system = (
            "You are an expert SPM Math tutor analysing a student's diagnostic results. "
            "Identify specific misconceptions from wrong answers. "
            "Return ONLY valid JSON — no markdown, no explanation."
        )

        # ── Prompt: tweak the instruction text here if needed ──────────────
        user = f"""Analyse these quiz attempts and return a JSON object mapping topic_id
to a list of misconception strings (max 3 per topic, empty list if none).

Attempts:
{json.dumps(attempt_details, separators=(',', ':'))}

Return ONLY this JSON shape (no markdown fences):
{{"<topic_id>": ["<misconception>", ...], ...}}"""

        raw = self._call(system, user, max_tokens=512)
        data = self._parse_json(raw)
        if not isinstance(data, dict):
            raise ValueError(f"Expected dict, got {type(data)}")
        # Validate values are lists of strings
        return {
            k: [str(m) for m in v] if isinstance(v, list) else []
            for k, v in data.items()
        }

    # ------------------------------------------------------------------
    # 2. choose_next_question_gemini
    # ------------------------------------------------------------------

    def choose_next_question_gemini(
        self,
        skill_profile: dict,          # SkillProfile = Dict[str, SkillStats]
        all_questions: List[Question],
        recent_attempts: List[Attempt],
    ) -> Question:
        """
        Ask Gemini to pick the single best next question for the student.

        Expected Gemini response shape:
            { "next_question_id": "q42", "reason": "..." }
        """
        if not all_questions:
            raise ValueError("No questions available.")

        # Build compact summaries to keep the prompt small
        profile_summary = {
            tid: {
                "level": s.estimated_level,
                "accuracy": round(s.correct_count / s.attempt_count, 2) if s.attempt_count else 0.5,
                "misconceptions": s.misconceptions[:2],  # cap at 2 per topic
            }
            for tid, s in skill_profile.items()
        }

        recent_summary = [
            {"qid": a.question_id, "correct": a.is_correct}
            for a in recent_attempts[-10:]
        ]

        # Limit candidate list to 20 to keep prompt under ~2k tokens
        candidate_summary = [
            {"id": q.id, "topic_id": q.topic_id, "difficulty": q.difficulty, "text": q.text[:80]}
            for q in all_questions[:20]
        ]

        system = (
            "You are an adaptive learning engine for SPM Form 5 Mathematics. "
            "Choose the SINGLE best next question to maximise the student's learning. "
            "Return ONLY valid JSON — no markdown, no explanation."
        )

        # ── Prompt: tweak the selection criteria here ──────────────────────
        user = f"""Student skill profile (topic → stats):
{json.dumps(profile_summary, separators=(',', ':'))}

Recent attempts (oldest first, last 10):
{json.dumps(recent_summary, separators=(',', ':'))}

Available questions (up to 20):
{json.dumps(candidate_summary, separators=(',', ':'))}

Rules:
- Prefer questions on the student's weakest topic.
- Prefer difficulty that matches their current level (weak→easy, okay→medium, strong→hard).
- Avoid repeating recently correct questions.

Return ONLY this JSON (no markdown fences):
{{"next_question_id": "<id>", "reason": "<one sentence>"}}"""

        raw = self._call(system, user, max_tokens=128)
        data = self._parse_json(raw)
        if not isinstance(data, dict) or "next_question_id" not in data:
            raise ValueError(f"Unexpected response shape: {data}")

        chosen_id: str = str(data["next_question_id"])
        id_to_q = {q.id: q for q in all_questions}
        question = id_to_q.get(chosen_id)
        if question is None:
            raise ValueError(f"Gemini returned unknown question id: {chosen_id!r}")

        logger.debug("Gemini chose question %s — %s", chosen_id, data.get("reason", ""))
        return question

    # ------------------------------------------------------------------
    # 3. generate_explanation_gemini
    # ------------------------------------------------------------------

    def generate_explanation_gemini(
        self,
        question: Question,
        attempt: Attempt,
        skill_profile: dict,          # SkillProfile = Dict[str, SkillStats]
    ):
        """
        Generate a personalised explanation for the student's attempt.

        Expected Gemini response shape:
            {
                "style": "step_by_step",
                "text": "Here is why ...",
                "short_title": "Step-by-step breakdown"
            }

        Returns an Explanation(text=..., style=...) model instance.
        """
        from backend.services.ai_engine import Explanation, get_topic_accuracy

        accuracy = get_topic_accuracy(skill_profile, question.topic_id)
        stats = skill_profile.get(question.topic_id)

        # Mirror the heuristic style-selection logic so Gemini reinforces it
        if accuracy < 0.40:
            suggested_style = "step_by_step"
        elif accuracy < 0.70:
            suggested_style = "formula_first"
        elif not attempt.is_correct:
            suggested_style = "shortcut_tips"
        else:
            suggested_style = "analogy"

        selected_text = (
            question.options[attempt.selected_option_index]
            if 0 <= attempt.selected_option_index < len(question.options)
            else "unknown"
        )
        correct_text = question.options[question.correct_option_index]

        topic_ctx = {
            "accuracy": round(accuracy, 2),
            "level": stats.estimated_level if stats else "weak",
            "misconceptions": stats.misconceptions[:2] if stats else [],
        }

        system = (
            "You are a friendly SPM Math tutor writing a short personalised explanation. "
            "Return ONLY valid JSON — no markdown, no extra text."
        )

        is_step_by_step = suggested_style == "step_by_step"

        if is_step_by_step:
            format_instructions = (
                'Return ONLY this JSON (no markdown fences):\n'
                '{"style": "step_by_step", "text": "<1 sentence intro>", '
                '"steps": ["<Step 1 text>", "<Step 2 text>", "<Step 3 text>"], '
                '"short_title": "<5 word title>"}\n'
                'steps must be 3–5 clear numbered actions that solve the problem. '
                'Each step should be specific to this question — not generic advice.'
            )
        else:
            format_instructions = (
                f'Return ONLY this JSON (no markdown fences):\n'
                f'{{"style": "{suggested_style}", "text": "<explanation prose 2-3 sentences>", '
                f'"short_title": "<5 word title>"}}'
            )

        # ── Prompt: change style descriptions or length guidance here ───────
        user = f"""Question: {question.text}
Options: {json.dumps(question.options)}
Student selected: "{selected_text}" (index {attempt.selected_option_index}) — {"CORRECT" if attempt.is_correct else "WRONG"}
Correct answer: "{correct_text}" (index {question.correct_option_index})
Topic stats: {json.dumps(topic_ctx)}
Suggested style: {suggested_style}

If wrong, reference the student's specific wrong choice.
Be warm and encouraging.

Allowed styles: step_by_step | formula_first | shortcut_tips | analogy

{format_instructions}"""

        raw = self._call(system, user, max_tokens=400)
        data = self._parse_json(raw)
        if not isinstance(data, dict) or "text" not in data:
            raise ValueError(f"Unexpected explanation response: {data}")

        # Validate style is one of the allowed literals
        valid_styles = ("step_by_step", "analogy", "formula_first", "shortcut_tips")
        style_out: Literal["step_by_step", "analogy", "formula_first", "shortcut_tips"] = (
            data["style"] if data.get("style") in valid_styles else suggested_style  # type: ignore[assignment]
        )

        steps = None
        if style_out == "step_by_step" and isinstance(data.get("steps"), list):
            steps = [str(s).strip() for s in data["steps"] if s]

        return Explanation(text=str(data["text"]).strip(), style=style_out, steps=steps)

    # ------------------------------------------------------------------
    # 4. select_review_questions_gemini
    # ------------------------------------------------------------------

    def select_review_questions_gemini(
        self,
        skill_profile: dict,          # SkillProfile = Dict[str, SkillStats]
        all_questions: List[Question],
        attempts: List[Attempt],
        now: datetime,
        top_n: int = 5,
    ) -> list:
        """
        Use Gemini to rank questions by spaced-repetition urgency.

        Expected Gemini response shape:
            {
                "review_items": [
                    {"question_id": "Q12", "reason": "low_accuracy"},
                    {"question_id": "Q7",  "reason": "not_seen_recently"}
                ]
            }

        Returns a list of ReviewItem model instances.
        """
        from backend.services.ai_engine import ReviewItem, get_last_seen, get_topic_accuracy

        # Build per-question stats payload
        attempt_history: Dict[str, list] = {}
        for a in attempts:
            attempt_history.setdefault(a.question_id, []).append(
                {"correct": a.is_correct, "ts": a.timestamp.isoformat()}
            )

        # Cap at top_n * 3 candidates to keep prompt size reasonable
        candidate_data = []
        for q in all_questions[: top_n * 3]:
            last_seen = get_last_seen(q.id, attempts)
            minutes_since = (
                (now - last_seen).total_seconds() / 60.0 if last_seen else 9999.0
            )
            candidate_data.append({
                "id": q.id,
                "topic_id": q.topic_id,
                "difficulty": q.difficulty,
                "topic_accuracy": round(get_topic_accuracy(skill_profile, q.topic_id), 2),
                "minutes_since_seen": round(minutes_since, 1),
                "attempt_count": len(attempt_history.get(q.id, [])),
            })

        profile_summary = {
            tid: {"level": s.estimated_level, "accuracy": round(s.correct_count / s.attempt_count, 2) if s.attempt_count else 0.5}
            for tid, s in skill_profile.items()
        }

        system = (
            "You are a spaced-repetition system for SPM Math Form 5. "
            "Rank questions by how urgently the student needs to review them. "
            "Return ONLY valid JSON — no markdown, no explanation."
        )

        valid_reasons = ("low_accuracy", "not_seen_recently", "weak_topic")

        # ── Prompt: adjust forgetting-curve weighting guidance here ─────────
        user = f"""Student skill profile:
{json.dumps(profile_summary, separators=(',', ':'))}

Candidate questions with stats:
{json.dumps(candidate_data, separators=(',', ':'))}

Rank the top {top_n} questions by review urgency using:
- accuracy (lower = more urgent)
- time since last seen (longer = more urgent)
- topic weakness

Allowed reasons: low_accuracy | not_seen_recently | weak_topic

Return ONLY this JSON (no markdown fences):
{{"review_items": [{{"question_id": "<id>", "reason": "<reason>"}}, ...]}}

Include exactly {top_n} items."""

        raw = self._call(system, user, max_tokens=256)
        data = self._parse_json(raw)
        if not isinstance(data, dict) or "review_items" not in data:
            raise ValueError(f"Unexpected review response: {data}")

        id_to_q = {q.id: q for q in all_questions}
        results = []
        for item in data["review_items"]:
            qid = str(item.get("question_id", ""))
            reason_raw = str(item.get("reason", "low_accuracy"))
            reason: Literal["low_accuracy", "not_seen_recently", "weak_topic"] = (
                reason_raw if reason_raw in valid_reasons else "low_accuracy"  # type: ignore[assignment]
            )
            q = id_to_q.get(qid)
            if q is not None:
                results.append(ReviewItem(question=q, reason=reason))
            if len(results) >= top_n:
                break

        if not results:
            raise ValueError("Gemini returned no valid review items.")

        return results

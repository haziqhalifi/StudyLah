"""
AI engine layer for StudyLah adaptive education platform.

Routing:
  ADAPTIVE_ENGINE=rule_based  →  deterministic heuristics only (default)
  ADAPTIVE_ENGINE=gemini      →  GeminiAdaptiveEngine with rule-based fallback

Each public function (analyze_diagnostic, choose_next_question, …) checks
settings.adaptive_engine and delegates to the Gemini engine when enabled.
If Gemini raises for any reason the rule-based result is used instead.

Claude integration uses the Anthropic SDK:

    import anthropic
    client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY from env
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    result = response.content[0].text  # parsed as JSON where needed
"""

from __future__ import annotations

import json
import logging
import os
import random
from datetime import datetime
from typing import TYPE_CHECKING, Dict, List, Literal, Optional

if TYPE_CHECKING:
    from backend.services.adaptive_engine_gemini import GeminiAdaptiveEngine

import anthropic
from pydantic import BaseModel, computed_field

from backend.config.settings import settings
from backend.schemas.question import Question, Attempt

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Anthropic client (lazy singleton — initialised on first use so tests that
# don't set ANTHROPIC_API_KEY still import this module without crashing)
# ---------------------------------------------------------------------------

_anthropic_client: Optional[anthropic.Anthropic] = None


def _client() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    return _anthropic_client


# ---------------------------------------------------------------------------
# Gemini adaptive engine (lazy singleton)
# ---------------------------------------------------------------------------

_gemini_engine: Optional[GeminiAdaptiveEngine] = None


def get_gemini_engine():
    """Return (and lazily create) the GeminiAdaptiveEngine singleton.

    Import is deferred so the module loads even if google-genai is absent.
    """
    global _gemini_engine
    if _gemini_engine is None:
        from backend.services.adaptive_engine_gemini import GeminiAdaptiveEngine
        _gemini_engine = GeminiAdaptiveEngine(
            api_key=settings.gemini_api_key,          # type: ignore[arg-type]
            model_name=settings.gemini_model_name,    # swap model here or in .env
            temperature=settings.gemini_temperature,  # lower = stricter JSON
        )
    return _gemini_engine


def _gemini_enabled() -> bool:
    """True only when explicitly opted-in AND the API key is present."""
    return settings.adaptive_engine == "gemini" and bool(settings.gemini_api_key)


def _call_claude(prompt: str, max_tokens: int = 1024) -> Optional[str]:
    """Send a single-turn prompt to Claude and return the text response.

    Returns None on any error so callers can fall back to heuristics.
    """
    try:
        response = _client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        block = response.content[0]
        if isinstance(block, anthropic.types.TextBlock):
            return block.text
        return None
    except Exception as exc:
        logger.warning("Claude API call failed, falling back to heuristic: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------

class SkillStats(BaseModel):
    topic_id: str
    correct_count: int = 0
    attempt_count: int = 0
    estimated_level: Literal["weak", "okay", "strong"] = "weak"
    misconceptions: List[str] = []

    @computed_field  # type: ignore[misc]
    @property
    def accuracy(self) -> float:
        if self.attempt_count == 0:
            return 0.0
        return self.correct_count / self.attempt_count

    @classmethod
    def _compute_level(cls, accuracy: float) -> Literal["weak", "okay", "strong"]:
        if accuracy > 0.70:
            return "strong"
        if accuracy >= 0.40:
            return "okay"
        return "weak"

    def update(self, is_correct: bool) -> None:
        self.attempt_count += 1
        if is_correct:
            self.correct_count += 1
        self.estimated_level = self._compute_level(
            self.correct_count / self.attempt_count
        )


# SkillProfile maps topic_id → SkillStats
SkillProfile = Dict[str, SkillStats]


class Explanation(BaseModel):
    text: str
    style: Literal["step_by_step", "analogy", "formula_first", "shortcut_tips"]
    steps: Optional[List[str]] = None  # populated for step_by_step style


class ReviewItem(BaseModel):
    question: Question
    reason: Literal["low_accuracy", "not_seen_recently", "weak_topic"]


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def get_topic_accuracy(skill_profile: SkillProfile, topic_id: str) -> float:
    """Return accuracy for a topic, defaulting to 0.5 if unseen."""
    stats: Optional[SkillStats] = skill_profile.get(topic_id)
    if stats is None or stats.attempt_count == 0:
        return 0.5
    return stats.correct_count / stats.attempt_count


def get_last_seen(question_id: str, attempts: List[Attempt]) -> Optional[datetime]:
    """Return the most recent attempt timestamp for a given question, or None."""
    seen_at: List[datetime] = [
        a.timestamp for a in attempts if a.question_id == question_id
    ]
    return max(seen_at) if seen_at else None


def filter_unattempted_recently(
    questions: List[Question],
    attempts: List[Attempt],
    window: int = 10,
) -> List[Question]:
    """Remove questions that appear in the last `window` attempts."""
    recent_ids: set[str] = {a.question_id for a in attempts[-window:]}
    return [q for q in questions if q.id not in recent_ids]


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

_DIFFICULTY_ORDER: List[Literal["easy", "medium", "hard"]] = ["easy", "medium", "hard"]


def _bump_difficulty(
    current: str,
    direction: Literal["up", "down", "same"],
) -> Literal["easy", "medium", "hard"]:
    idx = _DIFFICULTY_ORDER.index(current) if current in _DIFFICULTY_ORDER else 1
    if direction == "up":
        idx = min(idx + 1, len(_DIFFICULTY_ORDER) - 1)
    elif direction == "down":
        idx = max(idx - 1, 0)
    return _DIFFICULTY_ORDER[idx]


def _question_topic(question_id: str, questions: List[Question]) -> Optional[str]:
    for q in questions:
        if q.id == question_id:
            return q.topic_id
    return None


def _question_difficulty(
    question_id: Optional[str], questions: List[Question]
) -> Optional[str]:
    if question_id is None:
        return None
    for q in questions:
        if q.id == question_id:
            return q.difficulty
    return None


# ---------------------------------------------------------------------------
# 1. analyze_diagnostic
# ---------------------------------------------------------------------------

def _analyze_diagnostic_rule_based(
    questions: List[Question],
    attempts: List[Attempt],
) -> SkillProfile:
    """Rule-based fallback: tally accuracy per topic, enrich via Claude."""
    question_map: Dict[str, Question] = {q.id: q for q in questions}
    profile: SkillProfile = {}

    for attempt in attempts:
        q = question_map.get(attempt.question_id)
        if q is None:
            continue
        tid = q.topic_id
        if tid not in profile:
            profile[tid] = SkillStats(topic_id=tid)
        profile[tid].update(attempt.is_correct)

    # --- Claude: infer deeper misconceptions from answer patterns ----------
    if profile:
        attempt_details = []
        for attempt in attempts:
            q = question_map.get(attempt.question_id)
            if q is None:
                continue
            attempt_details.append({
                "topic_id": q.topic_id,
                "question": q.text,
                "options": q.options,
                "correct_option_index": q.correct_option_index,
                "selected_option_index": attempt.selected_option_index,
                "is_correct": attempt.is_correct,
            })

        prompt = f"""You are an expert tutor analysing a student's diagnostic quiz results.

Below is a list of question attempts. For each topic, identify specific misconceptions or error patterns the student shows based on WRONG answers only. Be concise and precise.

Attempts (JSON):
{json.dumps(attempt_details, indent=2)}

Return ONLY a JSON object mapping topic_id to a list of misconception strings (max 3 per topic). Example:
{{"algebra": ["confuses expanding brackets with factorising"], "geometry": []}}

If a topic has no wrong answers, return an empty list for it. Return only the JSON, no explanation."""

        raw = _call_claude(prompt, max_tokens=512)
        if raw:
            try:
                misconception_map: Dict[str, List[str]] = json.loads(raw)
                for tid, labels in misconception_map.items():
                    if tid in profile and isinstance(labels, list):
                        profile[tid].misconceptions = [str(l) for l in labels]
            except (json.JSONDecodeError, TypeError, ValueError) as exc:
                logger.warning("Could not parse misconception response: %s", exc)

    return profile


def analyze_diagnostic(
    questions: List[Question],
    attempts: List[Attempt],
) -> SkillProfile:
    """Build a SkillProfile from diagnostic session attempts.

    Routes to Gemini when ADAPTIVE_ENGINE=gemini, otherwise uses rule-based
    heuristics (with Claude misconception enrichment as a secondary call).
    Falls back to rule-based on any Gemini error.
    """
    # ── Rule-based first pass (always needed to compute accuracy/level) ────
    profile = _analyze_diagnostic_rule_based(questions, attempts)

    # ── Gemini: overwrite misconceptions with richer analysis ──────────────
    if _gemini_enabled():
        try:
            misconception_map = get_gemini_engine().analyze_diagnostic_gemini(questions, attempts)
            for tid, labels in misconception_map.items():
                if tid in profile:
                    profile[tid].misconceptions = labels
        except Exception as exc:
            logger.exception("Gemini analyze_diagnostic failed, using rule-based misconceptions", exc_info=exc)

    return profile


# ---------------------------------------------------------------------------
# 2. choose_next_question
# ---------------------------------------------------------------------------

def choose_next_question(
    skill_profile: SkillProfile,
    all_questions: List[Question],
    recent_attempts: List[Attempt],
) -> Question:
    """Select the optimal next question for the student.

    Args:
        skill_profile: Current skill snapshot.
        all_questions: Full question bank.
        recent_attempts: Recent attempt history (most recent last).

    Returns:
        The chosen Question object.

    Raises:
        ValueError: If the question bank is entirely empty.

    Heuristic:
        1. Target the topic with the lowest level first (weak > okay > strong),
           tie-broken by lowest accuracy.
        2. Examine the last 3 attempts on that topic:
             2+ consecutive correct → bump difficulty up.
             2+ consecutive wrong   → bump difficulty down.
             Otherwise              → keep current difficulty.
        3. Exclude questions the student got correct recently.
        4. Filter by (topic, difficulty); relax difficulty if pool is empty.
        5. Rank candidates by expected learning gain via Claude; fall back to
           random choice if Claude is unavailable.
    """
    if not all_questions:
        raise ValueError("No questions available.")

    level_priority = {"weak": 0, "okay": 1, "strong": 2}

    sorted_topics = sorted(
        skill_profile.items(),
        key=lambda kv: (
            level_priority.get(kv[1].estimated_level, 1),
            get_topic_accuracy(skill_profile, kv[0]),
        ),
    )

    if not sorted_topics:
        return random.choice(all_questions)

    target_topic_id = sorted_topics[0][0]

    topic_recent = [
        a for a in recent_attempts
        if (_question_topic(a.question_id, all_questions)) == target_topic_id
    ][-3:]

    last_q_difficulty = (
        _question_difficulty(topic_recent[-1].question_id, all_questions)
        if topic_recent
        else None
    ) or "medium"

    if len(topic_recent) >= 2 and all(a.is_correct for a in topic_recent[-2:]):
        adjustment: Literal["up", "down", "same"] = "up"
    elif len(topic_recent) >= 2 and all(not a.is_correct for a in topic_recent[-2:]):
        adjustment = "down"
    else:
        adjustment = "same"

    target_difficulty = _bump_difficulty(last_q_difficulty, adjustment)

    mastered_ids: set[str] = {a.question_id for a in recent_attempts if a.is_correct}

    def _pick(difficulty: Optional[str]) -> List[Question]:
        return [
            q for q in all_questions
            if q.topic_id == target_topic_id
            and (difficulty is None or q.difficulty == difficulty)
            and q.id not in mastered_ids
        ]

    candidates = _pick(target_difficulty) or _pick(None)
    if not candidates:
        candidates = list(all_questions)

    # --- Claude: rank candidates by expected learning gain -----------------
    if len(candidates) > 1:
        profile_summary = {
            tid: {
                "level": s.estimated_level,
                "accuracy": round(s.correct_count / s.attempt_count, 2) if s.attempt_count else 0.5,
                "misconceptions": s.misconceptions,
            }
            for tid, s in skill_profile.items()
        }
        recent_summary = [
            {"question_id": a.question_id, "is_correct": a.is_correct}
            for a in recent_attempts[-10:]
        ]
        candidate_summary = [
            {"id": q.id, "text": q.text, "difficulty": q.difficulty, "topic_id": q.topic_id}
            for q in candidates
        ]

        prompt = f"""You are an adaptive learning system. Rank the following candidate questions by expected learning gain for this student.

Student skill profile:
{json.dumps(profile_summary, indent=2)}

Recent attempts (oldest first):
{json.dumps(recent_summary, indent=2)}

Candidate questions:
{json.dumps(candidate_summary, indent=2)}

Return ONLY a JSON array of question IDs ordered from highest to lowest expected learning gain. Example:
["q3", "q1", "q2"]

Return only the JSON array, no explanation."""

        raw = _call_claude(prompt, max_tokens=256)
        if raw:
            try:
                ranked_ids: List[str] = json.loads(raw)
                id_to_q = {q.id: q for q in candidates}
                ordered = [id_to_q[qid] for qid in ranked_ids if qid in id_to_q]
                if ordered:
                    return ordered[0]
            except (json.JSONDecodeError, TypeError, ValueError, KeyError) as exc:
                logger.warning("Could not parse ranking response: %s", exc)

    return random.choice(candidates)


# ---------------------------------------------------------------------------
# 3. generate_explanation
# ---------------------------------------------------------------------------

_EXPLANATION_TEMPLATES: Dict[str, str] = {
    "step_by_step": (
        "Let's break this down step by step. "
        "First, identify what the question is asking. "
        "Then, apply the relevant method to each part, "
        "checking your work at every stage before moving on."
    ),
    "formula_first": (
        "Start with the key formula for this concept. "
        "Then substitute the given values and simplify — "
        "keeping track of units and sign conventions as you go."
    ),
    "shortcut_tips": (
        "You almost had it! A quick tip for this type of question: "
        "look for the pattern in the options before calculating. "
        "Eliminating obviously wrong answers first can save valuable time."
    ),
    "analogy": (
        "Think of it like this: the concept works just like a familiar real-world pattern. "
        "Map each element onto that analogy "
        "and let the familiar pattern guide your reasoning."
    ),
}


def generate_explanation(
    question: Question,
    attempt: Attempt,
    skill_profile: SkillProfile,
) -> Explanation:
    """Generate a personalised step-by-step explanation via Gemini.

    Heuristic (style selection from topic accuracy):
        accuracy < 0.40               → "step_by_step"
        0.40 ≤ accuracy < 0.70        → "formula_first"
        accuracy ≥ 0.70 + wrong answer → "shortcut_tips"
        accuracy ≥ 0.70 + correct      → "analogy"
    Falls back to a template string if Gemini is unavailable.
    """
    accuracy = get_topic_accuracy(skill_profile, question.topic_id)

    if accuracy < 0.40:
        style: Literal["step_by_step", "analogy", "formula_first", "shortcut_tips"] = "step_by_step"
    elif accuracy < 0.70:
        style = "formula_first"
    elif not attempt.is_correct:
        style = "shortcut_tips"
    else:
        style = "analogy"

    selected_text = (
        question.options[attempt.selected_option_index]
        if 0 <= attempt.selected_option_index < len(question.options)
        else "unknown"
    )
    correct_text = question.options[question.correct_option_index]
    result_word = "CORRECT ✓" if attempt.is_correct else "WRONG ✗"

    style_instruction = {
        "step_by_step": (
            "Write a numbered step-by-step solution. "
            "Start each step on its own line as **Step N:** followed by the working. "
            "Show every calculation clearly."
        ),
        "formula_first": (
            "Start with a **Formula:** line showing the key formula. "
            "Then substitute values and simplify step by step."
        ),
        "shortcut_tips": (
            "Start with a **Tip:** line giving the key insight the student missed. "
            "Then show the correct working briefly."
        ),
        "analogy": (
            "Open with a one-sentence real-world analogy in **bold**. "
            "Then connect it to the solution steps."
        ),
    }[style]

    wrong_guidance = (
        f'\nThe student chose **"{selected_text}"** which is wrong. '
        "Gently explain why before showing the correct working."
        if not attempt.is_correct else ""
    )

    system = (
        "You are a friendly SPM Mathematics tutor. "
        "Write clear, encouraging explanations using markdown. "
        "Use **bold** for key terms and formulas. "
        "Use LaTeX with $...$ for inline math and $$...$$ for display math. "
        "Keep the total response under 200 words."
    )

    user = f"""Question: {question.text}
Options: {json.dumps(question.options)}
Correct answer: "{correct_text}"
Student's answer: "{selected_text}" — {result_word}
{wrong_guidance}

{style_instruction}"""

    explanation_text = _EXPLANATION_TEMPLATES[style]  # default fallback
    try:
        from google import genai as _genai
        from google.genai import types as _types
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv(Path(__file__).resolve().parent.parent / ".env")

        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("Gemini API key not set (GEMINI_API_KEY or GOOGLE_API_KEY)")

        _gclient = _genai.Client(api_key=api_key)
        config = _types.GenerateContentConfig(
            thinking_config=_types.ThinkingConfig(thinking_level=_types.ThinkingLevel.HIGH),
            system_instruction=[_types.Part.from_text(text=system)],
        )
        response = _gclient.models.generate_content(
            model="gemini-3-flash-preview",   # swap model here if needed
            contents=[
                _types.Content(
                    role="user",
                    parts=[_types.Part.from_text(text=user)],
                )
            ],
            config=config,
        )
        text = (response.text or "").strip()
        if text:
            explanation_text = text
    except Exception as exc:
        logger.warning("Gemini explanation failed, using template: %s", exc)

    return Explanation(text=explanation_text, style=style)


# ---------------------------------------------------------------------------
# 4. generate_personalized_question
# ---------------------------------------------------------------------------

def generate_personalized_question(
    skill_profile: SkillProfile,
    base_questions: List[Question],
    recent_attempts: List[Attempt],
) -> Question:
    """Select or generate a question targeting the student's skill gap.

    Args:
        skill_profile: Current skill snapshot.
        base_questions: Full question bank used as the selection pool and as
            format examples for Claude-generated questions.
        recent_attempts: Attempt history for recency filtering.

    Returns:
        A Question tagged with "personalised" to signal adaptive selection.
        When Claude generates a brand-new question, it is prepended with the
        id prefix "gen-" so callers can distinguish generated from banked items.

    Raises:
        ValueError: If no questions exist for the weakest topic and Claude
            generation also fails.

    Heuristic:
        1. Find the weakest topic with ≥ 2 attempts (lowest accuracy).
           Falls back to any topic if none have 2+ attempts.
        2. Try to generate a brand-new MCQ via Claude targeting that topic.
        3. If generation fails or returns an invalid question, fall back to
           selecting from the existing bank (preferring easy/medium, excluding
           recently seen questions).
    """
    eligible = [
        (tid, stats)
        for tid, stats in skill_profile.items()
        if stats.attempt_count >= 2
    ]
    if not eligible:
        eligible = list(skill_profile.items())

    if not eligible:
        if not base_questions:
            raise ValueError("No questions available.")
        chosen = random.choice(base_questions)
        _tag_personalised(chosen)
        return chosen

    weakest_topic_id = min(
        eligible,
        key=lambda kv: get_topic_accuracy(skill_profile, kv[0]),
    )[0]

    weakest_stats = skill_profile.get(weakest_topic_id)

    # --- Claude: generate a brand-new MCQ targeting the skill gap ----------
    example_questions = [
        {"text": q.text, "options": q.options, "correct_option_index": q.correct_option_index, "difficulty": q.difficulty}
        for q in base_questions
        if q.topic_id == weakest_topic_id
    ][:3]

    if not example_questions:
        # Use any questions as format examples
        example_questions = [
            {"text": q.text, "options": q.options, "correct_option_index": q.correct_option_index, "difficulty": q.difficulty}
            for q in base_questions[:3]
        ]

    misconceptions = weakest_stats.misconceptions if weakest_stats else []
    accuracy = get_topic_accuracy(skill_profile, weakest_topic_id)

    prompt = f"""You are an expert question writer for a student revision app. Generate ONE new multiple-choice question targeting the student's weak area.

Topic: {weakest_topic_id}
Student accuracy on this topic: {round(accuracy, 2)} ({"weak" if accuracy < 0.40 else "developing"})
Known misconceptions: {json.dumps(misconceptions) if misconceptions else "none identified"}

The question should be at "easy" or "medium" difficulty to help the student build confidence while addressing the gap.

Format your question to match these examples:
{json.dumps(example_questions, indent=2)}

Return ONLY a JSON object with these exact keys:
{{
  "text": "<question text>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correct_option_index": <0-3>,
  "difficulty": "easy" | "medium"
}}

Return only the JSON, no explanation."""

    generated: Optional[Question] = None
    raw = _call_claude(prompt, max_tokens=512)
    if raw:
        try:
            data = json.loads(raw)
            if (
                isinstance(data.get("text"), str)
                and isinstance(data.get("options"), list)
                and len(data["options"]) == 4
                and isinstance(data.get("correct_option_index"), int)
                and 0 <= data["correct_option_index"] <= 3
                and data.get("difficulty") in ("easy", "medium", "hard")
            ):
                generated = Question(
                    id=f"gen-{weakest_topic_id}-{random.randint(10000, 99999)}",
                    topic_id=weakest_topic_id,
                    text=data["text"],
                    options=[str(o) for o in data["options"]],
                    correct_option_index=data["correct_option_index"],
                    difficulty=data["difficulty"],
                    tags=["personalised", "generated"],
                )
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            logger.warning("Could not parse generated question: %s", exc)

    if generated is not None:
        return generated

    # Fallback: select from existing bank
    topic_questions = [q for q in base_questions if q.topic_id == weakest_topic_id]
    preferred = [q for q in topic_questions if q.difficulty in ("easy", "medium")]
    candidates = filter_unattempted_recently(
        preferred or topic_questions, recent_attempts, window=10
    )

    pool = candidates or preferred or topic_questions
    if not pool:
        raise ValueError(f"No questions found for topic '{weakest_topic_id}'.")

    chosen = random.choice(pool)
    _tag_personalised(chosen)
    return chosen


def _tag_personalised(question: Question) -> None:
    """Add a 'personalised' tag to the question in-place (idempotent)."""
    if "personalised" not in question.tags:
        question.tags.append("personalised")


# ---------------------------------------------------------------------------
# 5. select_review_questions
# ---------------------------------------------------------------------------

_NEVER_SEEN_MINUTES: float = 9999.0


def select_review_questions(
    skill_profile: SkillProfile,
    all_questions: List[Question],
    attempts: List[Attempt],
    now: datetime,
    top_n: int = 5,
) -> List[ReviewItem]:
    """Rank questions by spaced-repetition priority and return the top N.

    Args:
        skill_profile: Current skill snapshot.
        all_questions: Full question bank.
        attempts: Complete attempt history for staleness calculation.
        now: Current datetime used to compute time-since-last-seen.
        top_n: Number of review items to return.

    Returns:
        Up to top_n ReviewItem objects sorted by priority descending.

    Heuristic — priority score per question:
        score = (1 - accuracy_for_topic) * 0.6
              + min(time_since_last_seen_minutes * 0.0005, 0.3)
              + (0.1 if topic.estimated_level == "weak" else 0.0)

        time_since_last_seen_minutes: minutes since the most recent attempt
        on this specific question; 9999 if never attempted.

    Reason assignment:
        "weak_topic"        — topic is "weak" in skill_profile (highest precedence)
        "not_seen_recently" — time component ≥ accuracy component
        "low_accuracy"      — otherwise

    Claude augmentation:
        After heuristic scoring, Claude re-ranks using a more nuanced
        forgetting-curve model. Falls back to heuristic ranking if Claude
        is unavailable.
    """
    scored: List[tuple[float, Question, Literal["low_accuracy", "not_seen_recently", "weak_topic"]]] = []

    for question in all_questions:
        accuracy = get_topic_accuracy(skill_profile, question.topic_id)
        last_seen = get_last_seen(question.id, attempts)

        if last_seen is None:
            minutes_since = _NEVER_SEEN_MINUTES
        else:
            delta = now - last_seen
            minutes_since = max(delta.total_seconds() / 60.0, 0.0)

        stats = skill_profile.get(question.topic_id)
        is_weak = stats is not None and stats.estimated_level == "weak"

        accuracy_component = (1.0 - accuracy) * 0.6
        time_component = min(minutes_since * 0.0005, 0.3)
        weak_component = 0.1 if is_weak else 0.0

        score = accuracy_component + time_component + weak_component

        if is_weak:
            reason: Literal["low_accuracy", "not_seen_recently", "weak_topic"] = "weak_topic"
        elif time_component >= accuracy_component:
            reason = "not_seen_recently"
        else:
            reason = "low_accuracy"

        scored.append((score, question, reason))

    scored.sort(key=lambda t: t[0], reverse=True)

    # Use a larger candidate pool for Claude re-ranking (up to 3× top_n)
    candidate_pool = scored[: top_n * 3] if len(scored) > top_n else scored

    # --- Claude: re-rank using forgetting-curve model ----------------------
    if len(candidate_pool) > top_n:
        attempt_history: Dict[str, list] = {}
        for a in attempts:
            attempt_history.setdefault(a.question_id, []).append(
                {"is_correct": a.is_correct, "timestamp": a.timestamp.isoformat()}
            )

        candidate_data = []
        for _, q, r in candidate_pool:
            last_seen_q = get_last_seen(q.id, attempts)
            candidate_data.append({
                "id": q.id,
                "topic_id": q.topic_id,
                "difficulty": q.difficulty,
                "heuristic_reason": r,
                "attempt_history": attempt_history.get(q.id, []),
                "minutes_since_last_seen": (
                    (now - last_seen_q).total_seconds() / 60.0
                    if last_seen_q else _NEVER_SEEN_MINUTES
                ),
            })

        profile_summary = {
            tid: {"level": s.estimated_level, "accuracy": round(s.correct_count / s.attempt_count, 2) if s.attempt_count else 0.5}
            for tid, s in skill_profile.items()
        }

        prompt = f"""You are a spaced-repetition system. Re-rank these candidate review questions by how urgently the student needs to review them, using a forgetting-curve model (consider recency, accuracy history, and difficulty).

Student skill profile:
{json.dumps(profile_summary, indent=2)}

Candidate questions (JSON):
{json.dumps(candidate_data, indent=2)}

Return ONLY a JSON array of exactly {top_n} question IDs in priority order (highest urgency first). Example:
["q2", "q5", "q1", "q4", "q3"]

Return only the JSON array, no explanation."""

        raw = _call_claude(prompt, max_tokens=256)
        if raw:
            try:
                ranked_ids: List[str] = json.loads(raw)
                id_to_item: Dict[str, tuple[float, Question, Literal["low_accuracy", "not_seen_recently", "weak_topic"]]] = {
                    q.id: (score, q, r) for score, q, r in candidate_pool
                }
                reranked = [id_to_item[qid] for qid in ranked_ids if qid in id_to_item]
                if len(reranked) >= top_n:
                    return [ReviewItem(question=q, reason=r) for _, q, r in reranked[:top_n]]
            except (json.JSONDecodeError, TypeError, ValueError, KeyError) as exc:
                logger.warning("Could not parse review ranking response: %s", exc)

    return [ReviewItem(question=q, reason=r) for _, q, r in scored[:top_n]]

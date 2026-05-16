"""
AI engine layer for StudyLah adaptive education platform.

All adaptive logic lives here as rule-based heuristics.
Every # TODO: Call Claude here marker is a drop-in point for Anthropic API calls.

Integration pattern (for when Claude is wired in):

    import anthropic
    client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY from env
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    result = response.content[0].text  # parse as JSON

No external services or LLM calls are made by this file.
"""

from __future__ import annotations

import random
from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Data models (Phase 1 domain models reproduced here for self-containment)
# ---------------------------------------------------------------------------

class Question(BaseModel):
    id: str
    topic_id: str
    text: str
    options: List[str]
    correct_option_index: int
    difficulty: Literal["easy", "medium", "hard"]
    tags: List[str] = []


class Attempt(BaseModel):
    user_id: str
    question_id: str
    selected_option_index: int
    is_correct: bool
    timestamp: datetime
    topic_id: Optional[str] = None  # convenience field; may be populated by caller


class SkillStats(BaseModel):
    topic_id: str
    correct_count: int = 0
    attempt_count: int = 0
    estimated_level: Literal["weak", "okay", "strong"] = "weak"

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


# ---------------------------------------------------------------------------
# Data models defined in this layer
# ---------------------------------------------------------------------------

class Explanation(BaseModel):
    text: str
    style: Literal["step_by_step", "analogy", "formula_first", "shortcut_tips"]


class ReviewItem(BaseModel):
    question: Question
    reason: Literal["low_accuracy", "not_seen_recently", "weak_topic"]


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def get_topic_accuracy(skill_profile: SkillProfile, topic_id: str) -> float:
    """Return accuracy for a topic from skill_profile, defaulting to 0.5.

    Args:
        skill_profile: The student's current skill profile.
        topic_id: The topic to look up.

    Returns:
        Accuracy in [0.0, 1.0], or 0.5 if the topic has no recorded stats.
    """
    stats: Optional[SkillStats] = skill_profile.get(topic_id)
    if stats is None or stats.attempt_count == 0:
        return 0.5
    return stats.correct_count / stats.attempt_count


def get_last_seen(question_id: str, attempts: List[Attempt]) -> Optional[datetime]:
    """Return the most recent attempt timestamp for a given question, or None.

    Args:
        question_id: ID of the question to search for.
        attempts: Full list of attempts to search through.

    Returns:
        The most recent datetime the question was attempted, or None if never.
    """
    seen_at: List[datetime] = [
        a.timestamp for a in attempts if a.question_id == question_id
    ]
    return max(seen_at) if seen_at else None


def filter_unattempted_recently(
    questions: List[Question],
    attempts: List[Attempt],
    window: int = 10,
) -> List[Question]:
    """Remove questions that appear in the last `window` attempts.

    Args:
        questions: Candidate question pool.
        attempts: Full attempt history (ordered oldest→newest).
        window: How many recent attempts to treat as "recently seen".

    Returns:
        Subset of questions not seen in the last `window` attempts.
    """
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

def analyze_diagnostic(
    questions: List[Question],
    attempts: List[Attempt],
) -> SkillProfile:
    """Build a SkillProfile from diagnostic session attempts.

    Args:
        questions: All questions that were part of the diagnostic.
        attempts: The student's attempts on those questions.

    Returns:
        A SkillProfile (topic_id → SkillStats) populated for every topic
        with at least one attempt. Accuracy thresholds:
            < 0.40  → "weak"
            0.40–0.70 → "okay"
            > 0.70  → "strong"

    Heuristic:
        Groups attempts by topic_id via question metadata, tallies
        correct/total per topic, and derives estimated_level.

    Claude integration point:
        Deeper misconception inference from answer patterns replaces this.
        e.g., detect if a student confuses discriminant calculation vs root
        substitution. Claude returns per-topic misconception labels that
        enrich the SkillProfile beyond simple accuracy.
    """
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

    # TODO: Call Claude here to infer deeper misconceptions from answer patterns.
    # e.g., detect if student confuses discriminant calculation vs root substitution.
    # Prompt Claude with: question texts, option choices, selected options, correct options.
    # Claude should return: list of misconception labels per topic.

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
        5. Choose uniformly at random.

    Claude integration point:
        Ranking candidate questions by expected learning gain replaces step 5.
        Claude receives the skill_profile snapshot, recent_attempts, and the
        candidate list, then returns ranked question IDs with short reasoning.
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

    # Resolve topic for each recent attempt via the question bank
    topic_recent = [
        a for a in recent_attempts
        if (a.topic_id or _question_topic(a.question_id, all_questions)) == target_topic_id
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

    # TODO: Call Claude here to rank candidate questions by expected learning gain.
    # Prompt: skill_profile snapshot + recent_attempts + candidate question list.
    # Claude should return: ranked question IDs with short reasoning.

    def _pick(difficulty: Optional[str]) -> Optional[Question]:
        pool = [
            q for q in all_questions
            if q.topic_id == target_topic_id
            and (difficulty is None or q.difficulty == difficulty)
            and q.id not in mastered_ids
        ]
        return random.choice(pool) if pool else None

    chosen = _pick(target_difficulty) or _pick(None) or random.choice(all_questions)
    return chosen


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
        "Think of it like this: [concept] works just like [simple real-world analogy]. "
        "So in this question, the approach is to map each element onto that analogy "
        "and let the familiar pattern guide your reasoning."
    ),
}


def generate_explanation(
    question: Question,
    attempt: Attempt,
    skill_profile: SkillProfile,
) -> Explanation:
    """Generate a personalised explanation for a student's attempt.

    Args:
        question: The question that was attempted.
        attempt: The student's attempt record (includes is_correct, selected index).
        skill_profile: Current skill snapshot used to look up topic accuracy.

    Returns:
        An Explanation with a style tag and placeholder text.

    Heuristic (style selection from topic accuracy):
        accuracy < 0.40               → "step_by_step"
        0.40 ≤ accuracy < 0.70        → "formula_first"
        accuracy ≥ 0.70 + wrong answer → "shortcut_tips"
        accuracy ≥ 0.70 + correct      → "analogy"

    Claude integration point:
        High-quality personalised text replaces the template strings.
        Claude receives question.text, question.options,
        attempt.selected_option_index, correct_option_index,
        skill_profile stats for this topic, and the chosen style.
        Claude returns explanation text in that style, referencing the
        student's specific wrong choice where relevant.
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

    # TODO: Call Claude here to generate high-quality personalised explanation text.
    # Prompt: question.text, question.options, attempt.selected_option_index,
    #         correct_option_index, skill_profile stats for this topic, chosen style.
    # Claude should return: explanation text in the chosen style, referencing the
    #         student's specific wrong choice where relevant.

    return Explanation(text=_EXPLANATION_TEMPLATES[style], style=style)


# ---------------------------------------------------------------------------
# 4. generate_personalized_question
# ---------------------------------------------------------------------------

def generate_personalized_question(
    skill_profile: SkillProfile,
    base_questions: List[Question],
    recent_attempts: List[Attempt],
) -> Question:
    """Select (or eventually generate) a question targeting the student's skill gap.

    Args:
        skill_profile: Current skill snapshot.
        base_questions: Full question bank used as the selection pool.
        recent_attempts: Attempt history for recency filtering.

    Returns:
        A Question tagged with "personalised" to signal adaptive selection.

    Raises:
        ValueError: If no questions exist for the weakest topic.

    Heuristic:
        1. Find the weakest topic with ≥ 2 attempts (lowest accuracy).
           Falls back to any topic if none have 2+ attempts.
        2. Filter base_questions for that topic; prefer easy/medium difficulty.
        3. Exclude questions seen in the last 10 attempts.
        4. Tag the chosen question "personalised" in-place.
        5. Fall back to any question on the weakest topic if pool is empty.

    Claude integration point:
        Brand-new MCQ generation replaces selection from the existing bank.
        Claude receives topic name, student's weak sub-tags, and past question
        examples for format reference, then returns a new question text + 4 MCQ
        options + correct_option_index + difficulty. The generated question is
        validated for syntactic correctness before being returned.
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

    topic_questions = [q for q in base_questions if q.topic_id == weakest_topic_id]
    preferred = [q for q in topic_questions if q.difficulty in ("easy", "medium")]
    candidates = filter_unattempted_recently(
        preferred or topic_questions, recent_attempts, window=10
    )

    # TODO: Call Claude here to generate a brand-new MCQ targeting the skill gap.
    # Prompt: topic name, student's weak sub-tags, past question examples for format reference.
    # Claude should return: new question text + 4 MCQ options + correct_option_index + difficulty.
    # Validate that the generated question is syntactically valid before returning.

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

    Claude integration point:
        A more nuanced forgetting curve replaces the score formula.
        Claude receives per-question accuracy history, timestamps, and topic
        context, then returns a priority-ranked list of question IDs with
        predicted retention scores.
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

    # TODO: Call Claude here to model a more nuanced forgetting curve.
    # Prompt: per-question accuracy history + timestamps + topic context.
    # Claude should return: priority-ranked list of question IDs with predicted retention scores.

    scored.sort(key=lambda t: t[0], reverse=True)
    return [ReviewItem(question=q, reason=r) for _, q, r in scored[:top_n]]

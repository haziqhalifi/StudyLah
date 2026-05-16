"""
AI Engine – the brain of StudyLah.

All adaptive logic lives here. Rule-based stubs are in place now;
every # TODO: Claude marks a spot where an Anthropic API call will later plug in.

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
from datetime import datetime, timedelta
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

class Question(BaseModel):
    id: str
    topic_id: str
    text: str
    options: List[str]
    correct_option_index: int
    difficulty: Literal["easy", "medium", "hard"]
    tags: List[str]


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
    accuracy: float = 0.0
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
        self.accuracy = self.correct_count / self.attempt_count
        self.estimated_level = self._compute_level(self.accuracy)


# SkillProfile is a plain mapping so callers can access it as a dict.
# Type alias for clarity.
SkillProfile = Dict[str, SkillStats]


class Explanation(BaseModel):
    text: str
    style: Literal["step_by_step", "analogy", "formula_first", "shortcut_tips"]


class ReviewItem(BaseModel):
    question: Question
    reason: Literal["low_accuracy", "not_seen_recently", "weak_topic"]


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_ACCURACY_WEAK    = 0.40
_ACCURACY_OKAY    = 0.70
_RECENT_WINDOW    = 2    # number of last attempts to check for difficulty adjustment
_REVIEW_TOP_N     = 5    # max items returned by select_review_questions
_STALE_MINUTES    = 60   # a question is "not seen recently" after this many minutes


# ---------------------------------------------------------------------------
# 1. Analyse diagnostic → SkillProfile
# ---------------------------------------------------------------------------

def analyze_diagnostic(
    questions: List[Question],
    attempts: List[Attempt],
) -> SkillProfile:
    """
    Build an initial SkillProfile from a completed diagnostic session.

    Inputs:
        questions: The full list of Question objects shown in the diagnostic.
        attempts:  One Attempt per question, in any order.

    Outputs:
        SkillProfile mapping topic_id → SkillStats.

    Current heuristic:
        Groups attempts by the topic_id of their corresponding question,
        tallies correct/total, sets estimated_level via fixed accuracy thresholds:
            > 0.70  → "strong"
            0.40–0.70 → "okay"
            < 0.40  → "weak"

    Claude integration point:
        # TODO: Call Claude here to infer deeper misconceptions from patterns.
        # e.g., "Student consistently picks the wrong sign in the discriminant →
        # sign-confusion bias in b²-4ac". Return a richer SkillProfile with an
        # optional 'misconceptions' list per topic.
        # Prompt sketch:
        #   f"Here are the diagnostic questions: {[q.model_dump() for q in questions]}
        #     Here are the student's answers: {[a.model_dump() for a in attempts]}
        #     Identify specific misconceptions per topic. Return JSON:
        #     {{'topic_id': [{{'misconception': str, 'evidence': str}}]}}"
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

    return profile


# ---------------------------------------------------------------------------
# 2. Choose next question (adaptive)
# ---------------------------------------------------------------------------

def choose_next_question(
    skill_profile: SkillProfile,
    all_questions: List[Question],
    recent_attempts: List[Attempt],
) -> Question:
    """
    Select the single best next question for the student to answer.

    Inputs:
        skill_profile:   Current SkillProfile for the user.
        all_questions:   Full question bank to select from.
        recent_attempts: All of the user's attempts so far (newest last).

    Outputs:
        The chosen Question object.

    Current heuristic:
        1. Target topic: prefer topics with lowest accuracy (most "weak" first,
           then "okay", then "strong"). Ties broken by fewest attempt_count.
        2. Target difficulty: examine the last _RECENT_WINDOW attempts on that
           topic; if all correct → step up; if all wrong → step down; else keep.
        3. Exclude recently seen questions (last 10 attempt IDs).
        4. Filter bank by (topic, difficulty), fall back gracefully if empty.
        5. Choose uniformly at random from candidates.

    Claude integration point:
        # TODO: Call Claude here to rank all candidate questions by expected
        # learning gain given the full skill profile and attempt history.
        # Prompt sketch:
        #   f"Skill profile: {skill_profile}
        #     Recent attempts: {[a.model_dump() for a in recent_attempts[-10:]]}
        #     Question bank: {[q.model_dump() for q in all_questions]}
        #     Return the id of the single best next question and a one-line reason.
        #     JSON: {{'id': str, 'reason': str}}"
    """
    _DIFFICULTY_ORDER: List[Literal["easy", "medium", "hard"]] = ["easy", "medium", "hard"]

    # --- 1. Pick target topic ---
    level_priority = {"weak": 0, "okay": 1, "strong": 2}
    sorted_topics = sorted(
        skill_profile.items(),
        key=lambda kv: (level_priority[kv[1].estimated_level], kv[1].attempt_count),
    )
    target_topic = sorted_topics[0][0] if sorted_topics else None

    # --- 2. Determine difficulty based on recent topic performance ---
    recently_seen_ids = {a.question_id for a in recent_attempts[-10:]}

    if target_topic:
        topic_attempts = [a for a in recent_attempts if a.topic_id == target_topic or _topic_of(a, all_questions) == target_topic]
        last_n = topic_attempts[-_RECENT_WINDOW:] if len(topic_attempts) >= _RECENT_WINDOW else topic_attempts
        current_level = skill_profile[target_topic].estimated_level
        base_difficulty: Literal["easy", "medium", "hard"] = (
            "easy" if current_level == "weak" else ("medium" if current_level == "okay" else "hard")
        )
        if len(last_n) == _RECENT_WINDOW and all(a.is_correct for a in last_n):
            idx = min(_DIFFICULTY_ORDER.index(base_difficulty) + 1, 2)
            target_difficulty = _DIFFICULTY_ORDER[idx]
        elif len(last_n) == _RECENT_WINDOW and all(not a.is_correct for a in last_n):
            idx = max(_DIFFICULTY_ORDER.index(base_difficulty) - 1, 0)
            target_difficulty = _DIFFICULTY_ORDER[idx]
        else:
            target_difficulty = base_difficulty
    else:
        target_topic = all_questions[0].topic_id if all_questions else ""
        target_difficulty = "easy"

    # --- 3 & 4. Filter candidates ---
    candidates = [
        q for q in all_questions
        if q.topic_id == target_topic
        and q.id not in recently_seen_ids
        and q.difficulty == target_difficulty
    ]
    if not candidates:
        candidates = [q for q in all_questions if q.topic_id == target_topic and q.id not in recently_seen_ids]
    if not candidates:
        candidates = [q for q in all_questions if q.topic_id == target_topic]
    if not candidates:
        candidates = list(all_questions)

    return random.choice(candidates)


def _topic_of(attempt: Attempt, questions: List[Question]) -> Optional[str]:
    """Resolve topic_id for an attempt from the question bank (fallback helper)."""
    if attempt.topic_id:
        return attempt.topic_id
    for q in questions:
        if q.id == attempt.question_id:
            return q.topic_id
    return None


# ---------------------------------------------------------------------------
# 3. Generate explanation
# ---------------------------------------------------------------------------

def generate_explanation(
    question: Question,
    attempt: Attempt,
    skill_profile: SkillProfile,
) -> Explanation:
    """
    Return a tailored explanation after the student answers a question.

    Inputs:
        question:      The Question that was just answered.
        attempt:       The student's Attempt for that question.
        skill_profile: Current SkillProfile for the user.

    Outputs:
        An Explanation with a style tag and placeholder text.

    Current heuristic (style selection):
        - accuracy < 0.40 (low)  → "step_by_step"
        - 0.40 ≤ accuracy < 0.70 → "formula_first"
        - accuracy ≥ 0.70 but wrong this time → "shortcut_tips"
        - question has 'word_problem' tag → "analogy" (overrides default)

    Claude integration point:
        # TODO: Call Claude here to generate a high-quality, personalised
        # explanation in the selected style using the full question context.
        # Prompt sketch:
        #   f"Question: {question.text}
        #     Options: {question.options}
        #     Correct answer: {question.options[question.correct_option_index]}
        #     Student chose: {question.options[attempt.selected_option_index]}
        #     Explanation style: {style}
        #     Write an encouraging, concise explanation in the '{style}' style.
        #     Return JSON: {{'text': str, 'style': str}}"
    """
    tid = question.topic_id
    stats = skill_profile.get(tid)
    accuracy = stats.accuracy if stats else 0.0
    is_correct = attempt.is_correct
    correct_text = question.options[question.correct_option_index]
    chosen_text  = question.options[attempt.selected_option_index]

    # Style selection
    if "word_problem" in question.tags:
        style: Literal["step_by_step", "analogy", "formula_first", "shortcut_tips"] = "analogy"
    elif accuracy < _ACCURACY_WEAK:
        style = "step_by_step"
    elif accuracy < _ACCURACY_OKAY:
        style = "formula_first"
    else:
        style = "shortcut_tips" if not is_correct else "formula_first"

    verdict = "Correct!" if is_correct else f"Not quite — the answer is \"{correct_text}\" (you chose \"{chosen_text}\")."

    # TODO: Call Claude here to generate the explanation text in `style`.
    stub_texts: Dict[str, str] = {
        "step_by_step": (
            f"{verdict}\n"
            f"Let's work through '{question.text}' step by step.\n"
            f"Step 1 – Identify the form of the problem.\n"
            f"Step 2 – Choose the appropriate method.\n"
            f"Step 3 – Apply it carefully and check each line.\n"
            f"Step 4 – Verify: substitute your answer back in.\n"
            f"Repeat this process until it feels automatic."
        ),
        "analogy": (
            f"{verdict}\n"
            f"Think of '{question.text}' like this: a quadratic describes a parabola. "
            f"The roots are where it touches the ground — imagine a ball thrown upward. "
            f"Visualising the shape often makes the algebra click."
        ),
        "formula_first": (
            f"{verdict}\n"
            f"Key formula: x = (−b ± √(b²−4ac)) / 2a.\n"
            f"For '{question.text}', identify a, b, c, then substitute directly. "
            f"This method is reliable for every quadratic, no exceptions."
        ),
        "shortcut_tips": (
            f"{verdict}\n"
            f"Quick tip for '{question.text}': check for factorisable patterns first "
            f"(difference of squares, simple trinomials). If b²−4ac < 0 you can stop — "
            f"no real roots exist. Reserve the full formula for cases that resist factoring."
        ),
    }

    return Explanation(text=stub_texts[style], style=style)


# ---------------------------------------------------------------------------
# 4. Generate personalised question
# ---------------------------------------------------------------------------

def generate_personalized_question(
    skill_profile: SkillProfile,
    base_questions: List[Question],
    recent_attempts: List[Attempt],
) -> Question:
    """
    Return a personalised question that targets the student's weakest skill gap.

    Inputs:
        skill_profile:   Current SkillProfile for the user.
        base_questions:  Full question bank.
        recent_attempts: All of the user's attempts (newest last).

    Outputs:
        A Question (possibly with a "(practice variation)" suffix on its text)
        chosen to address the most pressing gap.

    Current heuristic:
        1. Identify the weakest topic (lowest accuracy with at least 1 attempt).
        2. Collect tags from recently-wrong questions to find the specific weak tag.
        3. Filter bank to (weak topic × matching difficulty × matching weak tag).
        4. Fall back to (weak topic × difficulty) then (weak topic) if needed.
        5. Append "(practice variation)" to signal it was adaptively chosen.

    Claude integration point:
        # TODO: Call Claude here to generate a brand-new MCQ (stem + 4 options +
        # correct index) that specifically targets the identified skill gap,
        # varying the numbers/wording so it's not just a copy from the bank.
        # Prompt sketch:
        #   f"The student is weak on topic '{weak_topic}', specifically tags
        #     {list(weak_tags)}. Their accuracy is {accuracy:.0%}.
        #     Generate a fresh MCQ at '{difficulty}' difficulty.
        #     Return JSON: {{'id': 'generated', 'topic_id': ..., 'text': ...,
        #     'options': [...], 'correct_option_index': int,
        #     'difficulty': ..., 'tags': [...]}}"
    """
    # --- Find weakest topic ---
    if skill_profile:
        weak_topic_id, weak_stats = min(
            ((tid, s) for tid, s in skill_profile.items() if s.attempt_count > 0),
            key=lambda kv: kv[1].accuracy,
            default=(None, None),
        )
    else:
        weak_topic_id, weak_stats = None, None

    if weak_topic_id is None:
        return random.choice(base_questions)

    accuracy = weak_stats.accuracy  # type: ignore[union-attr]
    difficulty: Literal["easy", "medium", "hard"] = (
        "easy" if accuracy < _ACCURACY_WEAK else ("medium" if accuracy < _ACCURACY_OKAY else "hard")
    )

    # --- Collect tags from wrong recent answers ---
    wrong_ids = {a.question_id for a in recent_attempts if not a.is_correct}
    weak_tags: set[str] = set()
    for q in base_questions:
        if q.id in wrong_ids and q.topic_id == weak_topic_id:
            weak_tags.update(q.tags)

    # --- Filter candidates ---
    candidates = [
        q for q in base_questions
        if q.topic_id == weak_topic_id
        and q.difficulty == difficulty
        and (weak_tags & set(q.tags))
    ]
    if not candidates:
        candidates = [q for q in base_questions if q.topic_id == weak_topic_id and q.difficulty == difficulty]
    if not candidates:
        candidates = [q for q in base_questions if q.topic_id == weak_topic_id]
    if not candidates:
        candidates = list(base_questions)

    chosen = random.choice(candidates)

    # TODO: Call Claude here to generate a brand-new MCQ targeting the gap.
    # For now we signal adaptive selection with a text suffix.
    personalised = chosen.model_copy(
        update={"text": chosen.text + " (practice variation)"}
    )
    return personalised


# ---------------------------------------------------------------------------
# 5. Select review questions (spaced repetition)
# ---------------------------------------------------------------------------

def select_review_questions(
    skill_profile: SkillProfile,
    all_questions: List[Question],
    attempts: List[Attempt],
    now: datetime,
    max_items: int = _REVIEW_TOP_N,
) -> List[ReviewItem]:
    """
    Choose the highest-priority questions for a spaced-repetition review session.

    Inputs:
        skill_profile: Current SkillProfile for the user.
        all_questions: Full question bank.
        attempts:      All of the user's attempts (newest last).
        now:           Current datetime (injected for testability).
        max_items:     Maximum number of ReviewItem objects to return.

    Outputs:
        A list of ReviewItem objects, sorted by review priority (highest first),
        capped at max_items.

    Current heuristic (forgetting-curve proxy):
        For each question q, compute a priority score:
            score = wrong_ratio(q) * 2.0
                  + staleness_hours(q) / 24.0
                  + (1.0 if q belongs to a "weak" topic else 0.0)

        where:
            wrong_ratio(q)    = wrong_attempts / total_attempts (0 if never seen)
            staleness_hours(q) = hours since last attempt (_STALE_MINUTES/60 min floor)

        Assign reason:
            "low_accuracy"      if wrong_ratio > 0.5
            "not_seen_recently" if staleness > _STALE_MINUTES and low wrong_ratio
            "weak_topic"        if topic is "weak" in skill_profile

    Claude integration point:
        # TODO: Call Claude here to model a more nuanced forgetting curve,
        # incorporating Ebbinghaus decay, item difficulty, and student-specific
        # error patterns to prioritise review items.
        # Prompt sketch:
        #   f"Skill profile: {skill_profile}
        #     Attempt history: {[a.model_dump() for a in attempts]}
        #     Today's date: {now.isoformat()}
        #     Question bank: {[q.model_dump() for q in all_questions]}
        #     Return the top {max_items} questions to review, with reasons.
        #     JSON: [{{'id': str, 'reason': str}}, ...]"
    """
    stale_threshold = timedelta(minutes=_STALE_MINUTES)

    # Build per-question stats
    wrong_counts:  Dict[str, int]      = {}
    total_counts:  Dict[str, int]      = {}
    last_seen:     Dict[str, datetime] = {}

    for a in attempts:
        qid = a.question_id
        total_counts[qid] = total_counts.get(qid, 0) + 1
        if not a.is_correct:
            wrong_counts[qid] = wrong_counts.get(qid, 0) + 1
        ts = a.timestamp
        if qid not in last_seen or ts > last_seen[qid]:
            last_seen[qid] = ts

    topic_level: Dict[str, str] = {tid: s.estimated_level for tid, s in skill_profile.items()}

    scored: List[tuple[float, Question, str]] = []
    for q in all_questions:
        total   = total_counts.get(q.id, 0)
        wrong   = wrong_counts.get(q.id, 0)
        last    = last_seen.get(q.id)
        level   = topic_level.get(q.topic_id, "weak")

        wrong_ratio    = wrong / total if total > 0 else 0.0
        stale_hours    = (now - last).total_seconds() / 3600 if last else float(_STALE_MINUTES) / 60
        is_weak_topic  = level == "weak"

        score = wrong_ratio * 2.0 + stale_hours / 24.0 + (1.0 if is_weak_topic else 0.0)

        # Assign human-readable reason
        if wrong_ratio > 0.5:
            reason: Literal["low_accuracy", "not_seen_recently", "weak_topic"] = "low_accuracy"
        elif last is None or (now - last) > stale_threshold:
            reason = "not_seen_recently"
        else:
            reason = "weak_topic"

        scored.append((score, q, reason))

    scored.sort(key=lambda t: t[0], reverse=True)

    # TODO: Call Claude here to rerank using a richer retention model.
    return [
        ReviewItem(question=q, reason=r)  # type: ignore[arg-type]
        for _, q, r in scored[:max_items]
    ]

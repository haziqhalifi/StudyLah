"""
AI Engine – the brain of StudyLah.

All adaptive logic lives here. Rule-based stubs are in place now;
every # TODO: Claude marks a spot where we'll drop in an Anthropic API call.

Integration pattern (for when Claude is wired in):
    import anthropic
    client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY from env
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import List, Literal

from schemas.question import Attempt, Question, QuestionPublic, SkillProfile, TopicStats
from schemas.session import DiagnosticAnswer, Explanation, ReviewItem, SuggestedTopic
import db

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SPACED_REPETITION_WINDOW_MINUTES = 10  # revisit if not seen in last N minutes
LOW_ACCURACY_THRESHOLD = 0.50           # below this → low accuracy flag
RECENT_WRONG_STREAK = 2                 # consecutive wrong answers → step_by_step


# ---------------------------------------------------------------------------
# 1. Analyse diagnostic results → SkillProfile
# ---------------------------------------------------------------------------

def analyze_diagnostic(
    user_id: str,
    answers: List[DiagnosticAnswer],
) -> SkillProfile:
    """
    Scores diagnostic answers, builds initial SkillProfile.

    # TODO: Call Claude here to infer deeper misconceptions from the answer
    # pattern (e.g. consistently picking the wrong sign → sign confusion bias).
    # Prompt idea: "Given these diagnostic MCQ responses, identify the student's
    # likely misconceptions about quadratic equations and return a JSON summary."
    """
    profile = db.get_or_create_profile(user_id)
    correct = 0
    total = len(answers)

    for ans in answers:
        question = db.get_question_by_id(ans.question_id)
        if question is None:
            continue
        is_correct = question.correct_option_index == ans.selected_option_index
        if is_correct:
            correct += 1
        attempt = Attempt(
            user_id=user_id,
            question_id=ans.question_id,
            selected_option_index=ans.selected_option_index,
            is_correct=is_correct,
            timestamp=datetime.utcnow(),
        )
        db.record_attempt(attempt)

    accuracy = correct / total if total > 0 else 0.0
    topic_id = db.get_question_by_id(answers[0].question_id).topic_id if answers else "quadratic_equations"

    profile.topics[topic_id] = TopicStats(
        topic_id=topic_id,
        accuracy=accuracy,
        attempts=total,
        correct=correct,
        level=TopicStats.compute_level(accuracy),
    )
    db.user_profiles[user_id] = profile
    return profile


# ---------------------------------------------------------------------------
# 2. Choose next question (adaptive)
# ---------------------------------------------------------------------------

def choose_next_question(
    skill_profile: SkillProfile,
    history: List[Attempt],
    topic_id: str = "quadratic_equations",
) -> QuestionPublic:
    """
    Picks the next question based on current skill level and history.

    Rule-based strategy:
      - Filter out recently answered questions (avoid immediate repeats).
      - Target difficulty matching current level.
      - Prioritise tags the student has struggled with.

    # TODO: Call Claude here to select or generate the ideal next question.
    # Prompt idea: "The student's skill profile is {profile}. Their last 5
    # attempts were {history}. Choose the single best next question from this
    # bank {question_bank} and explain why. Return JSON: {id, reason}."
    """
    answered_ids = {a.question_id for a in history[-10:]}  # recent window
    topic_stats = skill_profile.topics.get(topic_id)
    accuracy = topic_stats.accuracy if topic_stats else 0.0

    target_difficulty: Literal["easy", "medium", "hard"]
    if accuracy >= 0.75:
        target_difficulty = "hard"
    elif accuracy >= 0.45:
        target_difficulty = "medium"
    else:
        target_difficulty = "easy"

    candidates = [
        q for q in db.QUESTION_BANK
        if q.topic_id == topic_id
        and q.id not in answered_ids
        and q.difficulty == target_difficulty
    ]

    # fallback: any unseen question in topic
    if not candidates:
        candidates = [q for q in db.QUESTION_BANK if q.topic_id == topic_id and q.id not in answered_ids]

    # last resort: any question in topic
    if not candidates:
        candidates = [q for q in db.QUESTION_BANK if q.topic_id == topic_id]

    chosen = random.choice(candidates)
    return chosen.to_public()


# ---------------------------------------------------------------------------
# 3. Generate explanation
# ---------------------------------------------------------------------------

def generate_explanation(
    question: Question,
    user_answer_index: int,
    skill_profile: SkillProfile,
    history: List[Attempt],
) -> Explanation:
    """
    Returns a tailored explanation after each answer.

    Style selection rules:
      - Recent wrong streak ≥ RECENT_WRONG_STREAK → "step_by_step"
      - Student is advanced but got this wrong → "shortcut_tips"
      - Question tagged with real-world context → "analogy"
      - Default for strong students → "formula_first"

    # TODO: Replace the text below with a Claude call.
    # Prompt idea: "The student answered {question.text} with option
    # '{question.options[user_answer_index]}' which is {'correct' if correct else 'wrong'}.
    # Their explanation style preference is '{style}'. Write a concise, encouraging
    # explanation in that style. Return JSON: {text, style}."
    """
    topic_id = question.topic_id
    topic_stats = skill_profile.topics.get(topic_id)
    level = topic_stats.level if topic_stats else "beginner"

    recent = history[-RECENT_WRONG_STREAK:] if len(history) >= RECENT_WRONG_STREAK else history
    recent_all_wrong = len(recent) == RECENT_WRONG_STREAK and all(not a.is_correct for a in recent)

    is_correct = question.correct_option_index == user_answer_index

    # Determine style
    if recent_all_wrong:
        style: Literal["step_by_step", "analogy", "formula_first", "shortcut_tips"] = "step_by_step"
    elif level in ("advanced", "proficient") and not is_correct:
        style = "shortcut_tips"
    elif "word_problem" in question.tags:
        style = "analogy"
    else:
        style = "formula_first"

    # Stub explanations – Claude will replace these with dynamic, personalised text
    # TODO: Call Claude to generate explanation text in the chosen style.
    correct_option_text = question.options[question.correct_option_index]
    user_option_text = question.options[user_answer_index]

    stub_texts = {
        "step_by_step": (
            f"Let's work through this step-by-step.\n"
            f"The question asks: '{question.text}'\n"
            f"{'Great job! ' if is_correct else f'You chose \"{user_option_text}\", but the answer is \"{correct_option_text}\". '}"
            f"Step 1: Identify the form. Step 2: Apply the method. Step 3: Verify your answer. "
            f"Practice this approach and it will become second nature!"
        ),
        "analogy": (
            f"Think of it like this: solving quadratics is like finding where a parabola crosses the x-axis. "
            f"{'You nailed it! ' if is_correct else f'The correct answer is \"{correct_option_text}\". '}"
            f"Imagine throwing a ball – it goes up and comes back down, crossing the ground at the roots."
        ),
        "formula_first": (
            f"Key formula: x = (-b ± √(b²-4ac)) / 2a. "
            f"{'Correct! ' if is_correct else f'Answer: \"{correct_option_text}\". '}"
            f"Plug in a, b, c from the equation directly. This method always works for any quadratic."
        ),
        "shortcut_tips": (
            f"Quick tip: {'Well done! ' if is_correct else f'Answer is \"{correct_option_text}\". '}"
            f"For this type, look for patterns first – can you factorise quickly? "
            f"If discriminant (b²-4ac) < 0, stop: no real roots. Save the formula for harder cases."
        ),
    }

    return Explanation(text=stub_texts[style], style=style)


# ---------------------------------------------------------------------------
# 4. Generate personalised question
# ---------------------------------------------------------------------------

def generate_personalized_question(
    skill_profile: SkillProfile,
    history: List[Attempt],
    topic_id: str = "quadratic_equations",
) -> QuestionPublic:
    """
    Returns a personalised or varied question for the student's skill gap.

    Currently: picks from the bank targeting weak tags.

    # TODO: Call Claude here to generate a brand-new MCQ with varied numbers/
    # wording that targets the student's specific gap.
    # Prompt idea: "Generate an MCQ about {weak_tags} at {difficulty} level for
    # a student who keeps making {error_pattern} errors. Return JSON matching
    # this schema: {QuestionPublic schema}."
    """
    wrong_question_ids = {a.question_id for a in history if not a.is_correct}
    weak_tags: set[str] = set()
    for q_id in wrong_question_ids:
        q = db.get_question_by_id(q_id)
        if q:
            weak_tags.update(q.tags)

    topic_stats = skill_profile.topics.get(topic_id)
    accuracy = topic_stats.accuracy if topic_stats else 0.0
    difficulty = "easy" if accuracy < 0.45 else ("medium" if accuracy < 0.75 else "hard")

    candidates = [
        q for q in db.QUESTION_BANK
        if q.topic_id == topic_id
        and q.difficulty == difficulty
        and bool(set(q.tags) & weak_tags)
    ]

    if not candidates:
        candidates = [q for q in db.QUESTION_BANK if q.topic_id == topic_id and q.difficulty == difficulty]

    if not candidates:
        candidates = db.QUESTION_BANK

    return random.choice(candidates).to_public()


# ---------------------------------------------------------------------------
# 5. Select review questions (spaced repetition)
# ---------------------------------------------------------------------------

def select_review_questions(
    skill_profile: SkillProfile,
    history: List[Attempt],
    topic_id: str = "quadratic_equations",
    max_questions: int = 3,
) -> tuple[List[ReviewItem], List[SuggestedTopic]]:
    """
    Picks questions for the spaced repetition review session.

    Heuristics:
      - Questions answered incorrectly more than once.
      - Questions not seen in the last SPACED_REPETITION_WINDOW_MINUTES.

    # TODO: Call Claude to intelligently rank questions by forgetting curve and
    # student-specific error patterns, and suggest a learning path.
    # Prompt idea: "Given this attempt history {history} and skill profile
    # {profile}, rank the top 3 questions to review today for maximum retention.
    # Return JSON list with question_id and reason."
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=SPACED_REPETITION_WINDOW_MINUTES)

    # Count wrong attempts per question
    wrong_counts: dict[str, int] = {}
    last_seen: dict[str, datetime] = {}
    for attempt in history:
        if not attempt.is_correct:
            wrong_counts[attempt.question_id] = wrong_counts.get(attempt.question_id, 0) + 1
        last_seen[attempt.question_id] = max(
            last_seen.get(attempt.question_id, datetime.min), attempt.timestamp
        )

    review_items: List[ReviewItem] = []
    seen_ids: set[str] = set()

    # Priority 1: frequently wrong
    for q_id, count in sorted(wrong_counts.items(), key=lambda x: -x[1]):
        if len(review_items) >= max_questions:
            break
        q = db.get_question_by_id(q_id)
        if q and q.topic_id == topic_id and q_id not in seen_ids:
            review_items.append(ReviewItem(question=q.to_public(), reason="low_accuracy"))
            seen_ids.add(q_id)

    # Priority 2: not seen recently
    for q in db.QUESTION_BANK:
        if len(review_items) >= max_questions:
            break
        if q.topic_id == topic_id and q.id not in seen_ids:
            last = last_seen.get(q.id, datetime.min)
            if last < cutoff:
                review_items.append(ReviewItem(question=q.to_public(), reason="not_seen_recently"))
                seen_ids.add(q.id)

    # Suggested topics
    suggested: List[SuggestedTopic] = []
    for tid, stats in skill_profile.topics.items():
        if stats.accuracy < LOW_ACCURACY_THRESHOLD and stats.attempts > 0:
            suggested.append(SuggestedTopic(topic_id=tid, reason="low_accuracy"))

    return review_items, suggested


# ---------------------------------------------------------------------------
# 6. Update skill profile after a single answer
# ---------------------------------------------------------------------------

def update_skill_profile(
    profile: SkillProfile,
    topic_id: str,
    is_correct: bool,
) -> SkillProfile:
    stats = profile.topics.get(
        topic_id,
        TopicStats(topic_id=topic_id, accuracy=0.0, attempts=0, correct=0),
    )
    stats.attempts += 1
    if is_correct:
        stats.correct += 1
    stats.accuracy = stats.correct / stats.attempts if stats.attempts > 0 else 0.0
    stats.level = TopicStats.compute_level(stats.accuracy)
    profile.topics[topic_id] = stats
    db.user_profiles[profile.user_id] = profile
    return profile

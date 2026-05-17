"""
AI Coach — personalised coaching suggestions for SPM Math students.

Combines rule-based recommendation logic with OpenAI-powered phrasing
to produce short, friendly coaching messages based on a user's learning data.

Covers the three SPM Form 5 Math topics:
  1. Ubahan        (variation)
  2. Matriks       (matrices)
  3. Insurans      (consumer math: insurance)
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Topic registry
# ---------------------------------------------------------------------------

TOPIC_NAMES: dict[str, str] = {
    "ubahan": "Ubahan",
    "matriks": "Matriks",
    "insurans": "Insurans",
}

# ---------------------------------------------------------------------------
# Coach-specific Pydantic models
# (separate from schemas/question.py TopicStats which serves the quiz/session flow)
# ---------------------------------------------------------------------------


class CoachTopicStats(BaseModel):
    topic_id: str
    topic_name: str
    accuracy: float          # 0–1
    attempts: int
    last_attempt_at: Optional[datetime] = None


class LearningSnapshot(BaseModel):
    user_id: str
    topics: list[CoachTopicStats]
    total_questions_answered: int
    questions_answered_this_week: int
    last_active_at: Optional[datetime] = None
    upcoming_exam_date: Optional[datetime] = None


class CoachSuggestion(BaseModel):
    id: str
    type: Literal["do_quiz", "do_review", "focus_topic", "celebration", "consistency_nudge"]
    title: str
    message: str
    cta_label: Optional[str] = None
    cta_action: Optional[dict] = None
    priority: Literal["high", "medium", "low"]
    created_at: datetime


# ---------------------------------------------------------------------------
# AI Coach
# ---------------------------------------------------------------------------


class AICoach:
    """
    Generates personalised coaching suggestions based on the user's learning data.
    Uses rule-based logic for recommendations and OpenAI for natural language phrasing.
    """

    # ------------------------------------------------------------------
    # 1. Build snapshot
    # ------------------------------------------------------------------

    def build_learning_snapshot(self, user_id: str) -> LearningSnapshot:
        """
        Query attempts + skill profile to build a LearningSnapshot.

        Per-topic accuracy and attempt counts come from the skill profile
        (which is updated after every answer). Overall recency stats come
        from the attempts table.
        """
        from backend.db import get_user_attempts, get_or_create_profile

        attempts = get_user_attempts(user_id)
        profile = get_or_create_profile(user_id)

        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)

        # Per-topic stats from skill profile
        topic_stats_list: list[CoachTopicStats] = []
        for topic_id, topic_name in TOPIC_NAMES.items():
            stats = profile.topics.get(topic_id)
            if stats and stats.attempts > 0:
                topic_stats_list.append(CoachTopicStats(
                    topic_id=topic_id,
                    topic_name=topic_name,
                    accuracy=stats.accuracy,
                    attempts=stats.attempts,
                    last_attempt_at=None,  # enriched below once we have topic-stamped attempts
                ))
            else:
                topic_stats_list.append(CoachTopicStats(
                    topic_id=topic_id,
                    topic_name=topic_name,
                    accuracy=0.0,
                    attempts=0,
                    last_attempt_at=None,
                ))

        # Overall recency from attempts table
        total_answered = len(attempts)
        questions_this_week = sum(
            1 for a in attempts if _parse_ts(a.timestamp) >= week_ago
        )
        last_active: Optional[datetime] = None
        if attempts:
            last_active = max(_parse_ts(a.timestamp) for a in attempts)

        return LearningSnapshot(
            user_id=user_id,
            topics=topic_stats_list,
            total_questions_answered=total_answered,
            questions_answered_this_week=questions_this_week,
            last_active_at=last_active,
        )

    # ------------------------------------------------------------------
    # 2. Rule-based recommendations
    # ------------------------------------------------------------------

    def generate_raw_recommendations(
        self, snapshot: LearningSnapshot
    ) -> list[CoachSuggestion]:
        """
        Deterministic, rule-based recommendation engine — no AI calls.

        Rules:
          • accuracy < 0.40 AND attempts ≥ 3    → high-priority "focus_topic"
          • accuracy > 0.75 AND attempts ≥ 5    → "celebration"
          • inactive ≥ 3 days                   → "consistency_nudge" (high)
          • okay-range topic (0.40–0.75)         → "do_quiz" (medium)
          • any attempts exist                   → "do_review" (medium)
          • no attempts at all                   → onboarding "do_quiz" (high)
        """
        suggestions: list[CoachSuggestion] = []
        now = datetime.now(timezone.utc)

        tried_topics = [t for t in snapshot.topics if t.attempts > 0]
        weak_topics = [t for t in tried_topics if t.accuracy < 0.40 and t.attempts >= 3]
        strong_topics = [t for t in tried_topics if t.accuracy > 0.75 and t.attempts >= 5]
        okay_topics = [t for t in tried_topics if 0.40 <= t.accuracy <= 0.75]

        # Consistency nudge — inactive for 3+ days
        if snapshot.last_active_at:
            days_inactive = (now - snapshot.last_active_at).days
            if days_inactive >= 3:
                fallback_topic = _weakest_topic(snapshot)
                suggestions.append(CoachSuggestion(
                    id=_new_id(),
                    type="consistency_nudge",
                    title="Dah lama tak belajar!",
                    message=(
                        f"You haven't practised for {days_inactive} day{'s' if days_inactive != 1 else ''}. "
                        "A quick 3-question warm-up will get you back on track. Jom!"
                    ),
                    cta_label="Start warm-up quiz",
                    cta_action={"type": "start_quiz", "topicId": fallback_topic, "length": 3},
                    priority="high",
                    created_at=now,
                ))

        # Focus topic — weak topics (one suggestion per weak topic, max 2)
        for topic in weak_topics[:2]:
            suggestions.append(CoachSuggestion(
                id=_new_id(),
                type="focus_topic",
                title=f"Let's strengthen your {topic.topic_name}",
                message=(
                    f"Your {topic.topic_name} accuracy is {round(topic.accuracy * 100)}% "
                    f"across {topic.attempts} questions. "
                    "A short 3-question set will help you pin down the weak spots."
                ),
                cta_label=f"Start {topic.topic_name} quiz",
                cta_action={"type": "start_quiz", "topicId": topic.topic_id, "length": 3},
                priority="high",
                created_at=now,
            ))

        # Celebration — strong topics
        for topic in strong_topics[:1]:
            suggestions.append(CoachSuggestion(
                id=_new_id(),
                type="celebration",
                title=f"Tahniah — {topic.topic_name} is looking great! 🎉",
                message=(
                    f"You've scored {round(topic.accuracy * 100)}% in {topic.topic_name} "
                    f"over {topic.attempts} questions. Excellent work! "
                    "Ready for a harder challenge?"
                ),
                cta_label=f"Try harder {topic.topic_name} questions",
                cta_action={"type": "start_quiz", "topicId": topic.topic_id, "length": 5, "difficulty": "hard"},
                priority="low",
                created_at=now,
            ))

        # Do quiz — okay-range topic to push into strong zone
        if okay_topics and not weak_topics:
            topic = okay_topics[0]
            suggestions.append(CoachSuggestion(
                id=_new_id(),
                type="do_quiz",
                title=f"Keep pushing in {topic.topic_name}",
                message=(
                    f"You're at {round(topic.accuracy * 100)}% in {topic.topic_name}. "
                    "A few more questions will push you into the strong zone!"
                ),
                cta_label=f"Practice {topic.topic_name}",
                cta_action={"type": "start_quiz", "topicId": topic.topic_id, "length": 5},
                priority="medium",
                created_at=now,
            ))

        # Do review — if there are attempts and no consistency nudge already
        if tried_topics and not any(s.type == "consistency_nudge" for s in suggestions):
            suggestions.append(CoachSuggestion(
                id=_new_id(),
                type="do_review",
                title="Review your mistakes",
                message=(
                    "Reviewing questions you got wrong is one of the fastest ways to improve. "
                    "Let's go through them now!"
                ),
                cta_label="Start review session",
                cta_action={"type": "start_review"},
                priority="medium",
                created_at=now,
            ))

        # Onboarding — no attempts yet
        if not tried_topics:
            suggestions.append(CoachSuggestion(
                id=_new_id(),
                type="do_quiz",
                title="Let's get started! 🚀",
                message=(
                    "You haven't answered any questions yet. "
                    "Start with a short Ubahan quiz to see where you stand."
                ),
                cta_label="Start Ubahan quiz",
                cta_action={"type": "start_quiz", "topicId": "ubahan", "length": 5},
                priority="high",
                created_at=now,
            ))

        # Sort by priority and cap at 5
        _priority_rank = {"high": 0, "medium": 1, "low": 2}
        suggestions.sort(key=lambda s: _priority_rank[s.priority])
        return suggestions[:5]

    # ------------------------------------------------------------------
    # 3. OpenAI phrasing
    # ------------------------------------------------------------------

    async def phrase_suggestions_with_gemini(
        self,
        snapshot: LearningSnapshot,
        suggestions: list[CoachSuggestion],
    ) -> list[CoachSuggestion]:
        """
        Rewrite suggestion titles and messages in a friendly SPM-student tone.
        Falls back to the original rule-based text if OpenAI fails.

        """
        if not suggestions:
            return suggestions

        try:
            import json
            from backend.services.study_buddy_agent import _get_client, MODEL_NAME

            client = _get_client()

            raw_list = [
                {"id": s.id, "title": s.title, "message": s.message}
                for s in suggestions
            ]

            coach_system_prompt = (
                "You are an encouraging AI coach for SPM Mathematics students in Malaysia. "
                "Your tone is warm, direct, and motivating — like a friendly teacher who knows the student well. "
                "Rewrite the given coaching messages to be short (20–40 words each), personal, and friendly. "
                "Use simple English with occasional Malay terms (e.g. 'tahniah', 'jom', 'latihan'). "
                "Do NOT change the meaning or add information not in the original. "
                "Return ONLY a valid JSON array with the same 'id' fields and updated 'title' and 'message'. "
                "No markdown fences, no extra text outside the JSON array."
            )

            user_payload = (
                f"Student: {snapshot.total_questions_answered} questions answered total, "
                f"{snapshot.questions_answered_this_week} this week.\n\n"
                f"Rewrite these suggestions:\n{json.dumps(raw_list, ensure_ascii=False, indent=2)}"
            )

            response = client.chat.completions.create(
                model=MODEL_NAME,
                temperature=0.5,
                messages=[
                    {"role": "system", "content": coach_system_prompt},
                    {"role": "user", "content": user_payload},
                ],
            )

            text = (response.choices[0].message.content or "").strip()
            # Strip markdown code fences if present
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:])
                if text.endswith("```"):
                    text = text[:-3].strip()

            rewrites: list[dict] = json.loads(text)
            rewrite_map = {r["id"]: r for r in rewrites}

            updated: list[CoachSuggestion] = []
            for s in suggestions:
                if s.id in rewrite_map:
                    rw = rewrite_map[s.id]
                    updated.append(s.model_copy(update={
                        "title": rw.get("title", s.title),
                        "message": rw.get("message", s.message),
                    }))
                else:
                    updated.append(s)
            return updated

        except Exception as exc:
            logger.warning("AICoach: OpenAI phrasing failed, returning raw suggestions — %s", exc)
            return suggestions

    # ------------------------------------------------------------------
    # 4. Orchestrators
    # ------------------------------------------------------------------

    async def generate_coach_suggestions(
        self,
        user_id: str,
        use_gemini: bool = True,
    ) -> tuple[LearningSnapshot, list[CoachSuggestion]]:
        """Build snapshot, run rules, optionally rephrase with OpenAI."""
        snapshot = self.build_learning_snapshot(user_id)
        suggestions = self.generate_raw_recommendations(snapshot)
        if use_gemini and suggestions:
            suggestions = await self.phrase_suggestions_with_gemini(snapshot, suggestions)
        return snapshot, suggestions

    async def generate_coach_reply(
        self,
        user_id: str,
        question: str,
        page_context: str = "general",
        topic_id: Optional[str] = None,
    ) -> tuple[str, LearningSnapshot, list[CoachSuggestion]]:
        """
        Generate a direct coach reply for a user question alongside suggestions.

        The reply references specific numbers from the student's snapshot so it
        feels data-driven rather than generic.
        """
        snapshot = self.build_learning_snapshot(user_id)
        suggestions = self.generate_raw_recommendations(snapshot)

        reply = await self._openai_coach_reply(snapshot, question, page_context, topic_id)

        if suggestions:
            suggestions = await self.phrase_suggestions_with_gemini(snapshot, suggestions)

        return reply, snapshot, suggestions

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _openai_coach_reply(
        self,
        snapshot: LearningSnapshot,
        question: str,
        page_context: str,
        topic_id: Optional[str],
    ) -> str:
        """Call OpenAI for a personalised coach reply; fall back to rule-based text."""
        try:
            from backend.services.study_buddy_agent import _get_client, MODEL_NAME

            client = _get_client()

            topic_lines: list[str] = []
            for t in snapshot.topics:
                if t.attempts > 0:
                    topic_lines.append(
                        f"  • {t.topic_name}: {round(t.accuracy * 100)}% correct "
                        f"({t.attempts} attempts)"
                    )
            topic_summary = (
                "\n".join(topic_lines)
                if topic_lines
                else "  (No attempts recorded yet)"
            )

            coach_system = (
                "You are a friendly, data-driven AI coach for SPM Mathematics students in Malaysia. "
                "You have the student's real performance data. "
                "Give concrete, actionable advice in 2–4 sentences. "
                "Reference specific numbers from their data (e.g. '42% in Ubahan'). "
                "Do NOT give generic motivation — be specific and helpful. "
                "Use occasional Malay terms like 'tahniah', 'jom', 'latihan' naturally. "
                "Respond primarily in English with Malay terms mixed in."
            )

            context_block = (
                f"Student performance:\n{topic_summary}\n"
                f"Total answered: {snapshot.total_questions_answered} questions\n"
                f"This week: {snapshot.questions_answered_this_week} questions\n"
                f"Current page: {page_context}\n"
                f"Active topic: {topic_id or 'none'}\n\n"
                f"Student asks: {question}"
            )

            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": coach_system},
                    {"role": "user", "content": context_block},
                ],
            )
            return (response.choices[0].message.content or "").strip()

        except Exception as exc:
            logger.warning("AICoach: OpenAI reply failed — %s", exc)
            return _build_fallback_reply(snapshot)


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

coach = AICoach()


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _new_id() -> str:
    return str(uuid.uuid4())[:8]


def _parse_ts(ts: datetime | str) -> datetime:
    """Normalise a timestamp that may arrive as a string or datetime."""
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    if isinstance(ts, str):
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _weakest_topic(snapshot: LearningSnapshot) -> str:
    """Return the topic_id of the topic with the lowest accuracy (tried only)."""
    tried = [t for t in snapshot.topics if t.attempts > 0]
    if not tried:
        return "ubahan"
    return min(tried, key=lambda t: t.accuracy).topic_id


def _build_fallback_reply(snapshot: LearningSnapshot) -> str:
    """Rule-based coach reply used when OpenAI is unavailable."""
    tried = [t for t in snapshot.topics if t.attempts > 0]
    if not tried:
        return (
            "You haven't started practising yet. "
            "Begin with a short Ubahan quiz to get your baseline. Jom!"
        )
    weakest = min(tried, key=lambda t: t.accuracy)
    return (
        f"Based on your recent results, {weakest.topic_name} is your weakest area "
        f"({round(weakest.accuracy * 100)}% correct). "
        f"I recommend a 3-question {weakest.topic_name} quiz to start strengthening it. Jom!"
    )

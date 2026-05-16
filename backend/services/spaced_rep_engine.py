"""
Growtrics-inspired spaced-repetition engine for StudyLah.

Implements a day-based SM-2 variant:
- Short intervals when learning (0.5–3 days)
- Exponentially growing intervals when mastering (up to 60 days)
- Ease factor rewards consistency, penalises mistakes
- Four consecutive correct answers promote a question to "mastered"

TODO – create this Supabase table before deploying to production:
    CREATE TABLE IF NOT EXISTS studylah_spaced_rep_states (
        user_id         TEXT        NOT NULL,
        question_id     TEXT        NOT NULL,
        topic_id        TEXT        NOT NULL,
        ease_factor     FLOAT       NOT NULL DEFAULT 2.5,
        interval_days   FLOAT       NOT NULL DEFAULT 0,
        repetitions     INT         NOT NULL DEFAULT 0,
        last_review_at  TIMESTAMPTZ,
        next_review_at  TIMESTAMPTZ,
        status          TEXT        NOT NULL DEFAULT 'learning',
        PRIMARY KEY (user_id, question_id)
    );
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List, Literal, Optional, Set

from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_EF_DEFAULT = 2.5       # starting ease factor (Anki default)
_EF_MIN = 1.3           # floor – prevents intervals shrinking below sensible minimum
_EF_MAX = 3.0           # ceiling – SPM context doesn't need longer than ~60 days anyway
_INTERVAL_CAP_DAYS = 60.0
_MASTERY_REPS = 4       # consecutive correct answers needed to reach "mastered"

ReviewStatus = Literal["learning", "reviewing", "mastered"]


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ReviewState(BaseModel):
    user_id: str
    question_id: str
    topic_id: str
    ease_factor: float = _EF_DEFAULT
    interval_days: float = 0.0
    repetitions: int = 0
    last_review_at: Optional[datetime] = None
    next_review_at: Optional[datetime] = None
    status: ReviewStatus = "learning"


class TopicSummary(BaseModel):
    topic_id: str
    status: Literal["behind", "on_track", "ahead"]
    due_count: int
    overdue_count: int
    next_due_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class SpacedRepEngine:
    """
    Manages per-user, per-question review states.

    Primary store is an in-memory dict (fast for hackathon / small data).
    Writes are best-effort persisted to Supabase so state survives restarts.
    Reads warm the in-memory cache once per user per process lifetime.
    """

    # TODO: SpacedRepEngine._store is in-memory — state is lost on restart.
    # The _persist() method writes to Supabase but only if the table
    # studylah_spaced_rep_states already exists (see CREATE TABLE comment at top).
    # Run that migration before deploying to production.
    def __init__(self) -> None:
        self._store: Dict[str, ReviewState] = {}
        self._loaded_users: Set[str] = set()

    # ── private ──────────────────────────────────────────────────────────────

    def _key(self, user_id: str, question_id: str) -> str:
        return f"{user_id}:{question_id}"

    def _load_user(self, user_id: str) -> None:
        """Hydrate in-memory cache from Supabase (once per user per process)."""
        if user_id in self._loaded_users:
            return
        self._loaded_users.add(user_id)
        try:
            from backend.supabase_client import supabase
            rows = (
                supabase.table("studylah_spaced_rep_states")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )
            for row in rows.data:
                state = ReviewState(**row)
                self._store[self._key(user_id, state.question_id)] = state
        except Exception:
            # Table not yet created or Supabase unavailable — fall through to
            # pure in-memory mode. No data loss within the process lifetime.
            pass

    def _persist(self, state: ReviewState) -> None:
        """Write a single state to Supabase (best-effort)."""
        try:
            from backend.supabase_client import supabase
            supabase.table("studylah_spaced_rep_states").upsert(
                {
                    "user_id": state.user_id,
                    "question_id": state.question_id,
                    "topic_id": state.topic_id,
                    "ease_factor": state.ease_factor,
                    "interval_days": state.interval_days,
                    "repetitions": state.repetitions,
                    "last_review_at": (
                        state.last_review_at.isoformat() if state.last_review_at else None
                    ),
                    "next_review_at": (
                        state.next_review_at.isoformat() if state.next_review_at else None
                    ),
                    "status": state.status,
                },
                on_conflict="user_id,question_id",
            ).execute()
        except Exception:
            pass

    # ── public API ────────────────────────────────────────────────────────────

    def get_state(self, user_id: str, question_id: str) -> Optional[ReviewState]:
        self._load_user(user_id)
        return self._store.get(self._key(user_id, question_id))

    def update_review_state(
        self,
        state: Optional[ReviewState],
        is_correct: bool,
        now: datetime,
        *,
        user_id: str = "",
        question_id: str = "",
        topic_id: str = "",
    ) -> ReviewState:
        """
        Apply a review outcome and return the updated ReviewState.

        Algorithm (simplified SM-2, day-based):

        Correct answer:
          repetitions += 1
          interval ladder: rep=1 → 1 day, rep=2 → 3 days, rep≥3 → prev × EF
          EF nudged up by 0.05 (capped at 3.0)
          status → "reviewing"; status → "mastered" once rep ≥ 4

        Wrong answer:
          repetitions reset to 0
          interval set to 0.5 days (surface again in ~12 hours)
          EF nudged down by 0.10 (floored at 1.3)
          status → "learning"

        Short intervals on failure ensure struggling questions surface quickly;
        exponential growth on success means mastered content stays out of
        the queue until the "perfect review moment" (Growtrics principle).
        """
        if state is None:
            state = ReviewState(
                user_id=user_id,
                question_id=question_id,
                topic_id=topic_id,
            )

        if is_correct:
            state.repetitions += 1
            if state.repetitions == 1:
                state.interval_days = 1.0          # try again tomorrow
            elif state.repetitions == 2:
                state.interval_days = 3.0          # 3-day gap
            else:
                # Exponential growth: longer waits as confidence grows
                state.interval_days = min(
                    state.interval_days * state.ease_factor,
                    _INTERVAL_CAP_DAYS,
                )
            state.ease_factor = min(state.ease_factor + 0.05, _EF_MAX)
            state.status = "mastered" if state.repetitions >= _MASTERY_REPS else "reviewing"
        else:
            # Wrong: short interval so the question returns quickly
            state.repetitions = 0
            state.interval_days = 0.5
            state.ease_factor = max(state.ease_factor - 0.10, _EF_MIN)
            state.status = "learning"

        state.last_review_at = now
        state.next_review_at = now + timedelta(days=state.interval_days)

        self._store[self._key(state.user_id, state.question_id)] = state
        self._persist(state)
        return state

    def get_due_reviews(
        self,
        user_id: str,
        now: datetime,
        all_questions: Optional[List] = None,
        attempts: Optional[List] = None,
        max_items: int = 5,
    ) -> List[ReviewState]:
        """
        Return up to max_items ReviewStates that are due for review.

        A state is "due" when:
          - next_review_at is None (never reviewed), OR
          - next_review_at ≤ now

        Priority order:
          1. Status rank: learning (0) > reviewing (1) > mastered (2)
          2. How overdue (most overdue first — they've waited longest)
          3. Lower ease_factor first (harder questions need more attention)

        When fewer than max_items exist in the schedule, supplements with
        unseen questions from all_questions (newest questions first).
        These are returned as placeholder "learning" states so the engine
        can track them after the first answer.
        """
        self._load_user(user_id)

        _STATUS_RANK: Dict[str, int] = {"learning": 0, "reviewing": 1, "mastered": 2}

        user_states = [s for s in self._store.values() if s.user_id == user_id]

        due = [
            s for s in user_states
            if s.next_review_at is None or s.next_review_at <= now
        ]

        def sort_key(s: ReviewState):
            overdue_secs = (
                (now - s.next_review_at).total_seconds()
                if s.next_review_at is not None
                else float("inf")
            )
            return (_STATUS_RANK[s.status], -overdue_secs, s.ease_factor)

        due.sort(key=sort_key)
        result = due[:max_items]

        # Supplement with questions the user has never seen
        if len(result) < max_items and all_questions:
            seen_ids = {s.question_id for s in user_states}
            for q in all_questions:
                if len(result) >= max_items:
                    break
                if q.id not in seen_ids:
                    result.append(
                        ReviewState(
                            user_id=user_id,
                            question_id=q.id,
                            topic_id=q.topic_id,
                        )
                    )

        return result

    def get_topic_summary(
        self,
        user_id: str,
        now: datetime,
        all_topic_ids: List[str],
    ) -> List[TopicSummary]:
        """
        Per-topic spaced-rep health snapshot for the dashboard widget.

        Status heuristic:
          "behind"   – any overdue items (mastered questions surfaced again)
          "ahead"    – ≥70% of tracked questions are mastered
          "on_track" – everything else
        """
        self._load_user(user_id)
        user_states = [s for s in self._store.values() if s.user_id == user_id]

        summaries: List[TopicSummary] = []
        for topic_id in all_topic_ids:
            topic_states = [s for s in user_states if s.topic_id == topic_id]
            if not topic_states:
                continue

            due_states = [
                s for s in topic_states
                if s.next_review_at is None or s.next_review_at <= now
            ]
            overdue_states = [
                s for s in topic_states
                if s.next_review_at is not None and s.next_review_at < now
                and s.last_review_at is not None  # only counts if seen before
            ]
            upcoming = [
                s for s in topic_states
                if s.next_review_at is not None and s.next_review_at > now
            ]
            next_due = min((s.next_review_at for s in upcoming), default=None)

            mastered_ratio = (
                sum(1 for s in topic_states if s.status == "mastered") / len(topic_states)
            )

            if overdue_states:
                status: Literal["behind", "on_track", "ahead"] = "behind"
            elif mastered_ratio >= 0.7:
                status = "ahead"
            else:
                status = "on_track"

            summaries.append(
                TopicSummary(
                    topic_id=topic_id,
                    status=status,
                    due_count=len(due_states),
                    overdue_count=len(overdue_states),
                    next_due_at=next_due,
                )
            )

        return summaries


# Module-level singleton – shared across all requests in the process
_engine = SpacedRepEngine()


def get_engine() -> SpacedRepEngine:
    return _engine

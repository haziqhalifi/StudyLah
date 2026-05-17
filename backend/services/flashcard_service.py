"""
FlashcardService — CRUD for flashcard sets.

Persistence: Supabase (primary) with in-memory cache as fallback when the DB
is unavailable or the tables haven't been migrated yet.

Required Supabase tables:
    CREATE TABLE IF NOT EXISTS studylah_flashcard_sets (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        topic_id    TEXT NOT NULL,
        subtopic    TEXT,
        title       TEXT NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS flashcards (
        id          TEXT PRIMARY KEY,
        set_id      TEXT NOT NULL REFERENCES studylah_flashcard_sets(id) ON DELETE CASCADE,
        question    TEXT NOT NULL,
        answer      TEXT NOT NULL,
        topic_id    TEXT NOT NULL,
        subtopic    TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

try:
    from backend.models.flashcards import Flashcard, FlashcardSet, TopicId
    from backend.supabase_client import supabase
except ModuleNotFoundError:
    from models.flashcards import Flashcard, FlashcardSet, TopicId  # type: ignore
    from supabase_client import supabase  # type: ignore

# In-memory fallback cache (also used when Supabase is unavailable)
_SET_CACHE: dict[str, FlashcardSet] = {}


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


class FlashcardService:
    """Create and retrieve flashcard sets, backed by Supabase with in-memory cache."""

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def create_set(
        self,
        user_id: str,
        topic_id: TopicId,
        title: str,
        cards_data: list[dict],
        subtopic: Optional[str] = None,
        description: Optional[str] = None,
    ) -> FlashcardSet:
        now = _now()
        set_id = f"fs_{uuid.uuid4().hex[:12]}"

        cards: list[Flashcard] = []
        for raw in cards_data:
            card = Flashcard(
                id=f"fc_{uuid.uuid4().hex[:12]}",
                set_id=set_id,
                question=raw["question"],
                answer=raw["answer"],
                topic_id=topic_id,
                subtopic=subtopic,
                created_at=now,
            )
            cards.append(card)

        flash_set = FlashcardSet(
            id=set_id,
            user_id=user_id,
            topic_id=topic_id,
            subtopic=subtopic,
            title=title,
            description=description,
            cards=cards,
            created_at=now,
        )

        # Always keep in local cache (fast reads, survives Supabase errors)
        _SET_CACHE[set_id] = flash_set

        # Persist to Supabase best-effort
        self._persist_set(flash_set)

        return flash_set

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_set(self, set_id: str) -> Optional[FlashcardSet]:
        # Check cache first
        if set_id in _SET_CACHE:
            return _SET_CACHE[set_id]

        # Try Supabase
        try:
            set_resp = (
                supabase.table("studylah_flashcard_sets")
                .select("*")
                .eq("id", set_id)
                .maybe_single()
                .execute()
            )
            set_data = getattr(set_resp, "data", None)
            if not set_data:
                return None

            card_resp = (
                supabase.table("studylah_flashcards")
                .select("*")
                .eq("set_id", set_id)
                .execute()
            )
            card_data: list[dict] = getattr(card_resp, "data", None) or []
            flash_set = self._hydrate_set(set_data, card_data)
            _SET_CACHE[set_id] = flash_set
            return flash_set
        except Exception:
            return None

    def list_sets_for_user(self, user_id: str) -> list[FlashcardSet]:
        # Try Supabase first to get the authoritative list
        try:
            sets_resp = (
                supabase.table("studylah_flashcard_sets")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )
            sets_data: list[dict] = getattr(sets_resp, "data", None) or []
            if not sets_data:
                # Fall through to cache if DB returns nothing
                raise ValueError("empty")

            results: list[FlashcardSet] = []
            for row in sets_data:
                sid = row["id"]
                if sid in _SET_CACHE:
                    results.append(_SET_CACHE[sid])
                    continue
                card_resp2 = (
                    supabase.table("studylah_flashcards")
                    .select("*")
                    .eq("set_id", sid)
                    .execute()
                )
                cards_data2: list[dict] = getattr(card_resp2, "data", None) or []
                flash_set = self._hydrate_set(row, cards_data2)
                _SET_CACHE[sid] = flash_set
                results.append(flash_set)
            return results
        except Exception:
            # Fallback to in-memory cache (works when tables don't exist yet)
            return [s for s in _SET_CACHE.values() if s.user_id == user_id]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _persist_set(self, flash_set: FlashcardSet) -> None:
        try:
            supabase.table("studylah_flashcard_sets").upsert(
                {
                    "id": flash_set.id,
                    "user_id": flash_set.user_id,
                    "topic_id": flash_set.topic_id,
                    "subtopic": flash_set.subtopic,
                    "title": flash_set.title,
                    "description": flash_set.description,
                    "created_at": flash_set.created_at.isoformat(),
                },
                on_conflict="id",
            ).execute()
            for card in flash_set.cards:
                supabase.table("studylah_flashcards").upsert(
                    {
                        "id": card.id,
                        "set_id": card.set_id,
                        "question": card.question,
                        "answer": card.answer,
                        "topic_id": card.topic_id,
                        "subtopic": card.subtopic,
                        "created_at": card.created_at.isoformat(),
                    },
                    on_conflict="id",
                ).execute()
        except Exception:
            pass  # cache already holds the data; Supabase is best-effort

    def _hydrate_set(self, row: dict, card_rows: list[dict]) -> FlashcardSet:
        cards = [
            Flashcard(
                id=c["id"],
                set_id=c["set_id"],
                question=c["question"],
                answer=c["answer"],
                topic_id=c["topic_id"],
                subtopic=c.get("subtopic"),
                created_at=c["created_at"],
            )
            for c in card_rows
        ]
        return FlashcardSet(
            id=row["id"],
            user_id=row["user_id"],
            topic_id=row["topic_id"],
            subtopic=row.get("subtopic"),
            title=row["title"],
            description=row.get("description"),
            cards=cards,
            created_at=row["created_at"],
        )


# Module-level singleton
flashcard_service = FlashcardService()

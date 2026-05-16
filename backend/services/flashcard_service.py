"""
FlashcardService — CRUD for flashcard sets.
Storage: in-memory dicts (TODO: replace with Supabase for persistence).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

try:
    from backend.models.flashcards import (
        Flashcard,
        FlashcardSet,
        FLASHCARD_SETS,
        FLASHCARDS,
        TopicId,
    )
except ModuleNotFoundError:
    from models.flashcards import (  # type: ignore
        Flashcard,
        FlashcardSet,
        FLASHCARD_SETS,
        FLASHCARDS,
        TopicId,
    )


class FlashcardService:
    """Create and retrieve flashcard sets."""

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
        """
        Create a new FlashcardSet from raw card dicts.

        Each item in cards_data must have "question" and "answer" keys.
        Returns the complete FlashcardSet including generated IDs.
        """
        now = datetime.now(tz=timezone.utc)
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
            FLASHCARDS[card.id] = card
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
        FLASHCARD_SETS[set_id] = flash_set
        return flash_set

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_set(self, set_id: str) -> Optional[FlashcardSet]:
        return FLASHCARD_SETS.get(set_id)

    def list_sets_for_user(self, user_id: str) -> list[FlashcardSet]:
        return [s for s in FLASHCARD_SETS.values() if s.user_id == user_id]


# Module-level singleton
flashcard_service = FlashcardService()

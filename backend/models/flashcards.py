"""
Domain models for flashcard sets and individual cards.
Storage is in-memory (dicts) — replace with Supabase calls for persistence.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

TopicId = Literal["ubahan", "matriks", "insurans"]

# ---------------------------------------------------------------------------
# Core models
# ---------------------------------------------------------------------------


class Flashcard(BaseModel):
    id: str
    set_id: str
    question: str
    answer: str
    topic_id: TopicId
    subtopic: Optional[str] = None
    created_at: datetime


class FlashcardSet(BaseModel):
    id: str
    user_id: str
    topic_id: TopicId
    subtopic: Optional[str] = None
    title: str
    description: Optional[str] = None
    cards: list[Flashcard] = []
    created_at: datetime


# ---------------------------------------------------------------------------
# In-memory stores  (TODO: replace with Supabase persistence)
# ---------------------------------------------------------------------------

# TODO: FlashcardSets and Flashcards are stored in-memory only — all data is lost
# on every server restart. Replace these dicts with Supabase upsert/select calls
# in FlashcardService.create_set() / get_set() / list_sets_for_user().
# Suggested table schema:
#   flashcard_sets (id, user_id, topic_id, subtopic, title, description, created_at)
#   flashcards     (id, set_id, question, answer, topic_id, subtopic, created_at)

# set_id -> FlashcardSet
FLASHCARD_SETS: dict[str, FlashcardSet] = {}

# card_id -> Flashcard
FLASHCARDS: dict[str, Flashcard] = {}

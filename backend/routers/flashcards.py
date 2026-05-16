"""
GET /api/flashcards/sets?userId=...
GET /api/flashcards/sets/{set_id}

Read-only endpoints for flashcard sets — consumed by the frontend
flashcard study page (/flashcards/[id]).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

try:
    from backend.services.flashcard_service import flashcard_service
    from backend.models.flashcards import FlashcardSet
except ModuleNotFoundError:
    from services.flashcard_service import flashcard_service  # type: ignore
    from models.flashcards import FlashcardSet  # type: ignore

router = APIRouter(prefix="/api/flashcards", tags=["flashcards"])


# ---------------------------------------------------------------------------
# Response shapes (subset of FlashcardSet for the list view)
# ---------------------------------------------------------------------------


class FlashcardSetSummary(BaseModel):
    id: str
    title: str
    topic_id: str
    subtopic: str | None
    card_count: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/sets", response_model=list[FlashcardSetSummary])
def list_sets(userId: str = Query(..., description="User ID")) -> list[FlashcardSetSummary]:
    """Return all flashcard sets for a user (summary only, no card content)."""
    sets = flashcard_service.list_sets_for_user(userId)
    return [
        FlashcardSetSummary(
            id=s.id,
            title=s.title,
            topic_id=s.topic_id,
            subtopic=s.subtopic,
            card_count=len(s.cards),
        )
        for s in sets
    ]


@router.get("/sets/{set_id}", response_model=FlashcardSet)
def get_set(set_id: str) -> FlashcardSet:
    """Return a full flashcard set including all cards (question + answer)."""
    flash_set = flashcard_service.get_set(set_id)
    if flash_set is None:
        raise HTTPException(status_code=404, detail=f"Flashcard set '{set_id}' not found.")
    return flash_set

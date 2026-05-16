"""
AI Coach router.

GET  /api/coach/summary   — dashboard-friendly snapshot + ranked suggestions
POST /api/coach/message   — chat-style personalised coach reply + suggestions
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/coach", tags=["coach"])


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CoachMessageRequest(BaseModel):
    userId: str
    question: str
    pageContext: str = "general"
    topicId: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/summary")
async def get_coach_summary(userId: str = Query(..., description="User ID")):
    """
    Return a learning snapshot + ranked coaching suggestions for the dashboard.

    Query params:
      userId — the user's ID (required)
    """
    try:
        from backend.services.ai_coach import coach

        snapshot, suggestions = await coach.generate_coach_suggestions(
            userId, use_gemini=True
        )
        return {
            "snapshot": snapshot.model_dump(mode="json"),
            "suggestions": [s.model_dump(mode="json") for s in suggestions],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/message")
async def post_coach_message(body: CoachMessageRequest):
    """
    Generate a coach reply (chat-style) for the given user question.

    The reply is Gemini-generated and references the student's actual performance
    data. Suggestions are also returned for the frontend to render as cards.
    """
    try:
        from backend.services.ai_coach import coach

        reply, snapshot, suggestions = await coach.generate_coach_reply(
            user_id=body.userId,
            question=body.question,
            page_context=body.pageContext,
            topic_id=body.topicId,
        )
        return {
            "reply": reply,
            "snapshot": snapshot.model_dump(mode="json"),
            "suggestions": [s.model_dump(mode="json") for s in suggestions],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

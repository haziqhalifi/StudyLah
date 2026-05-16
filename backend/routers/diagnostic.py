"""
Diagnostic results router.

GET /api/diagnostic/result   — structured per-topic summary + coach recommendations
GET /api/diagnostic/report   — stub for future detailed analytics
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend import db
from backend.services import ai_engine

router = APIRouter(prefix="/api/diagnostic", tags=["diagnostic"])

# ---------------------------------------------------------------------------
# Topic name lookup
# ---------------------------------------------------------------------------

_TOPIC_NAMES: Dict[str, str] = {
    "ubahan": "Ubahan",
    "matriks": "Matriks",
    "insurans": "Matematik Pengguna: Insurans",
}

# chapter_id → topic_id mapping (mirrors db._DIAGNOSTIC_CHAPTER_IDS)
_CHAPTER_TO_TOPIC: Dict[int, str] = {
    87: "ubahan",
    88: "matriks",
    89: "insurans",
}


# ---------------------------------------------------------------------------
# Response Pydantic models
# ---------------------------------------------------------------------------


class TopicDiagnostic(BaseModel):
    topicId: str
    topicName: str
    accuracy: float          # 0.0 – 1.0
    attempts: int
    level: Literal["weak", "okay", "strong"]
    lastAttemptAt: Optional[str] = None


class DiagnosticRecommendation(BaseModel):
    title: str
    message: str
    topicId: str
    suggestedQuizLength: int


class DiagnosticResult(BaseModel):
    userId: str
    totalQuestions: int
    correctQuestions: int
    overallAccuracy: float
    topics: List[TopicDiagnostic]
    mainRecommendation: DiagnosticRecommendation
    secondaryRecommendation: Optional[DiagnosticRecommendation] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _engine_level_to_result(level: str) -> Literal["weak", "okay", "strong"]:
    mapping = {"weak": "weak", "okay": "okay", "strong": "strong"}
    return mapping.get(level, "weak")  # type: ignore[return-value]


def _make_main_recommendation(topic: TopicDiagnostic) -> DiagnosticRecommendation:
    pct = round(topic.accuracy * 100)
    return DiagnosticRecommendation(
        title=f"Let's fix {topic.topicName} first",
        message=(
            f"{topic.topicName} is currently your weakest topic ({pct}% correct). "
            f"Let's start with a short 5-question {topic.topicName} quiz to build your basics."
        ),
        topicId=topic.topicId,
        suggestedQuizLength=5,
    )


def _make_secondary_recommendation(topic: TopicDiagnostic) -> DiagnosticRecommendation:
    pct = round(topic.accuracy * 100)
    return DiagnosticRecommendation(
        title=f"Then review {topic.topicName}",
        message=(
            f"You scored {pct}% on {topic.topicName}. "
            f"We'll review 3 questions from this topic after your main practice."
        ),
        topicId=topic.topicId,
        suggestedQuizLength=3,
    )


# ---------------------------------------------------------------------------
# Endpoint: GET /api/diagnostic/result
# ---------------------------------------------------------------------------


@router.get("/result", response_model=DiagnosticResult)
def get_diagnostic_result(userId: str = Query(..., description="User ID")) -> DiagnosticResult:
    """
    Return a structured diagnostic summary for the given user.

    Pulls all recorded attempts, recomputes per-topic skill stats (accuracy,
    level), then selects:
    - one main weak topic for the primary recommendation,
    - one secondary topic (next-weakest or non-weak okay topic) if available.
    """
    all_attempts = db.get_user_attempts(userId)
    if not all_attempts:
        raise HTTPException(
            status_code=404,
            detail="No diagnostic attempts found for this user. Complete the diagnostic first.",
        )

    # Map question_id → last attempt timestamp for each topic
    question_ids = list({a.question_id for a in all_attempts})
    questions = db.get_questions_by_ids(question_ids)
    question_map = {q.id: q for q in questions}

    # Recompute skill profile from all attempts
    all_questions = db.get_all_questions()
    ai_profile = ai_engine.analyze_diagnostic(all_questions, all_attempts)

    # Build per-topic diagnostics
    topic_diagnostics: List[TopicDiagnostic] = []
    for topic_id, name in _TOPIC_NAMES.items():
        if topic_id not in ai_profile:
            continue
        stats = ai_profile[topic_id]

        # Find the latest attempt timestamp for this topic
        topic_attempt_timestamps: List[datetime] = []
        for attempt in all_attempts:
            q = question_map.get(attempt.question_id)
            if q and q.topic_id == topic_id:
                ts = attempt.timestamp
                if isinstance(ts, str):
                    try:
                        ts = datetime.fromisoformat(ts)
                    except ValueError:
                        continue
                topic_attempt_timestamps.append(ts)

        last_at: Optional[str] = None
        if topic_attempt_timestamps:
            last_at = max(topic_attempt_timestamps).isoformat()

        topic_diagnostics.append(
            TopicDiagnostic(
                topicId=topic_id,
                topicName=name,
                accuracy=stats.accuracy,
                attempts=stats.attempt_count,
                level=_engine_level_to_result(stats.estimated_level),
                lastAttemptAt=last_at,
            )
        )

    # Fallback: if we get no topic matches via topic_id, use all available
    if not topic_diagnostics:
        for tid, stats in ai_profile.items():
            topic_diagnostics.append(
                TopicDiagnostic(
                    topicId=tid,
                    topicName=_TOPIC_NAMES.get(tid, tid.title()),
                    accuracy=stats.accuracy,
                    attempts=stats.attempt_count,
                    level=_engine_level_to_result(stats.estimated_level),
                )
            )

    # Overall stats across all attempts
    total_questions = len(all_attempts)
    correct_questions = sum(1 for a in all_attempts if a.is_correct)
    overall_accuracy = round(correct_questions / total_questions, 4) if total_questions else 0.0

    # Sort: weakest first (ascending accuracy)
    sorted_topics = sorted(topic_diagnostics, key=lambda t: t.accuracy)

    # Pick main recommendation: weakest topic
    main_topic = sorted_topics[0]
    main_rec = _make_main_recommendation(main_topic)

    # Pick secondary recommendation: second topic in sorted order (if exists and not strong)
    secondary_rec: Optional[DiagnosticRecommendation] = None
    if len(sorted_topics) >= 2:
        second_topic = sorted_topics[1]
        if second_topic.level in ("weak", "okay"):
            secondary_rec = _make_secondary_recommendation(second_topic)

    return DiagnosticResult(
        userId=userId,
        totalQuestions=total_questions,
        correctQuestions=correct_questions,
        overallAccuracy=overall_accuracy,
        topics=topic_diagnostics,
        mainRecommendation=main_rec,
        secondaryRecommendation=secondary_rec,
    )


# ---------------------------------------------------------------------------
# Endpoint: GET /api/diagnostic/report  (stub)
# ---------------------------------------------------------------------------


@router.get("/report")
def get_diagnostic_report(userId: str = Query(..., description="User ID")):
    """Stub endpoint for future detailed analytics."""
    return {
        "userId": userId,
        "status": "coming_soon",
        "message": "Detailed diagnostic report is under construction.",
        "sections": [
            {"title": "Topic Breakdown", "available": False},
            {"title": "Question-level Analysis", "available": False},
            {"title": "Time Trends", "available": False},
        ],
    }

from __future__ import annotations

import json
import os
import random
import re
import uuid
from typing import Dict, List, Literal, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.supabase_client import supabase

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

_TOPIC_BY_CHAPTER: Dict[int, str] = {
    87: "Ubahan",
    88: "Matriks",
    89: "Insurans",
}

# In-memory onboarding sessions keyed by session_id.
_session_bank: Dict[str, List[dict]] = {}

_MOJIBAKE_MAP = {
    "â‰¥": "≥",
    "â‰¤": "≤",
    "â‰ ": "≠",
    "Ã—": "×",
    "âˆ’": "−",
    "âˆš": "√",
    "Ï€": "π",
    "Â°": "°",
}


def _clean_math_text(text: str) -> str:
    out = (text or "").strip()
    if not out:
        return out

    for bad, good in _MOJIBAKE_MAP.items():
        out = out.replace(bad, good)

    # Collapse accidental repeated whitespace first.
    out = re.sub(r"\s+", " ", out)

    # Remove spaces before punctuation and ensure one space after punctuation.
    out = re.sub(r"\s+([,.;:!?])", r"\1", out)
    out = re.sub(r"([,.;:!?])(?!\s|$)", r"\1 ", out)

    # Keep equations readable: add spacing around core operators when used between terms.
    out = re.sub(r"(?<=[0-9A-Za-z\)])\s*([=+×÷<>≤≥])\s*(?=[0-9A-Za-z(])", r" \1 ", out)
    out = re.sub(r"(?<=[0-9A-Za-z\)])\s*-\s*(?=[0-9A-Za-z(])", " - ", out)

    # Trim inner spaces around parentheses.
    out = re.sub(r"\(\s+", "(", out)
    out = re.sub(r"\s+\)", ")", out)

    # Final whitespace normalization.
    out = re.sub(r"\s+", " ", out).strip()
    return out


class OnboardingQuestion(BaseModel):
    id: str
    topic: str
    text: str
    options: List[str]
    correct_index: int


class StartOnboardingRequest(BaseModel):
    name: str
    school: str
    form: int = Field(ge=1, le=5)


class StartOnboardingResponse(BaseModel):
    session_id: str
    questions: List[OnboardingQuestion]


class OnboardingAnswer(BaseModel):
    question_id: str
    selected_option_index: int


class SubmitOnboardingRequest(BaseModel):
    session_id: str
    answers: List[OnboardingAnswer]


class TopicSummary(BaseModel):
    topic: str
    correct: int
    total: int
    accuracy: float
    level: Literal["strong", "weak"]


class OnboardingDiagnosticResponse(BaseModel):
    score: int
    total: int
    strengths: List[str]
    weaknesses: List[str]
    by_topic: List[TopicSummary]
    recommendation: str
    next_step: str


def _fetch_form5_questions(limit: int = 220) -> List[dict]:
    response = (
        supabase.table("questions")
        .select("id, question, options, correct_index, chapter_id")
        .in_("chapter_id", list(_TOPIC_BY_CHAPTER.keys()))
        .eq("approval_status", "approved")
        .not_.is_("question", "null")
        .limit(limit)
        .execute()
    )

    rows = response.data or []
    cleaned: List[dict] = []
    for row in rows:
        options = row.get("options")
        if not isinstance(options, list) or len(options) < 2:
            continue
        chapter_id = row.get("chapter_id")
        topic = _TOPIC_BY_CHAPTER.get(chapter_id)
        if topic is None:
            continue

        cleaned.append(
            {
                "id": str(row["id"]),
                "topic": topic,
                "text": _clean_math_text(str(row["question"])),
                "options": [_clean_math_text(str(o)) for o in options],
                "correct_index": int(row.get("correct_index", 0)),
            }
        )

    return cleaned


def _fallback_recommendation(by_topic: List[TopicSummary]) -> str:
    weakest = sorted(by_topic, key=lambda t: t.accuracy)[0]
    best = sorted(by_topic, key=lambda t: t.accuracy, reverse=True)[0]
    if best.accuracy >= 0.7:
        opener = f"You are strongest in {best.topic}."
    else:
        opener = f"You've got a baseline in {best.topic}!"
    return (
        f"{opener} Let's focus next on {weakest.topic} with short daily drills, "
        f"then revise mistakes using worked examples."
    )


def _run_google_studio_diagnostic(payload: dict) -> Optional[dict]:
    api_key = (
        os.getenv("GOOGLE_STUDIO_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
    )
    if not api_key:
        return None

    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={api_key}"
    )

    prompt = (
        "You are an SPM Mathematics diagnostic coach. "
        "Given the student's onboarding quiz performance, produce JSON only with keys: "
        "strengths (string array), weaknesses (string array), recommendation (string), next_step (string). "
        "Rules for recommendation: NEVER call a topic the student's 'strongest' if their accuracy on it is below 70%. "
        "Instead say they 'have a baseline in' that topic. "
        "Keep strengths and weaknesses concise, subtopic-oriented, no markdown.\n\n"
        f"Data:\n{json.dumps(payload, indent=2)}"
    )

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"},
    }

    try:
        with httpx.Client(timeout=18.0) as client:
            res = client.post(endpoint, json=body)
            res.raise_for_status()
            raw = res.json()
            text = raw["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text)
            if not isinstance(parsed, dict):
                return None
            return parsed
    except Exception:
        return None


@router.post("/start", response_model=StartOnboardingResponse)
def start_onboarding(_: StartOnboardingRequest) -> StartOnboardingResponse:
    bank = _fetch_form5_questions()
    if len(bank) < 10:
        raise HTTPException(
            status_code=500,
            detail="Not enough onboarding questions available from Supabase.",
        )

    selected = random.sample(bank, 10)
    session_id = str(uuid.uuid4())
    _session_bank[session_id] = selected

    return StartOnboardingResponse(
        session_id=session_id,
        questions=[
            OnboardingQuestion(
                id=q["id"],
                topic=q["topic"],
                text=q["text"],
                options=q["options"],
                correct_index=q["correct_index"],
            )
            for q in selected
        ],
    )


@router.post("/submit", response_model=OnboardingDiagnosticResponse)
def submit_onboarding(req: SubmitOnboardingRequest) -> OnboardingDiagnosticResponse:
    selected = _session_bank.get(req.session_id)
    if not selected:
        raise HTTPException(status_code=404, detail="Onboarding session not found or expired.")

    answer_by_qid = {a.question_id: a.selected_option_index for a in req.answers}

    total = len(selected)
    score = 0
    per_topic: Dict[str, Dict[str, int]] = {}

    for q in selected:
        topic = q["topic"]
        per_topic.setdefault(topic, {"correct": 0, "total": 0})
        per_topic[topic]["total"] += 1

        picked = answer_by_qid.get(q["id"], -1)
        if picked == q["correct_index"]:
            score += 1
            per_topic[topic]["correct"] += 1

    by_topic: List[TopicSummary] = []
    for topic, stats in per_topic.items():
        accuracy = stats["correct"] / stats["total"] if stats["total"] else 0.0
        by_topic.append(
            TopicSummary(
                topic=topic,
                correct=stats["correct"],
                total=stats["total"],
                accuracy=round(accuracy, 4),
                level="strong" if accuracy >= 0.7 else "weak",
            )
        )

    strengths = [t.topic for t in by_topic if t.accuracy >= 0.7]
    weaknesses = [t.topic for t in by_topic if t.accuracy < 0.7]

    ai_payload = {
        "score": score,
        "total": total,
        "by_topic": [t.model_dump() for t in by_topic],
    }
    ai_diag = _run_google_studio_diagnostic(ai_payload) or {}

    recommendation = ai_diag.get("recommendation") or _fallback_recommendation(by_topic)
    next_step = ai_diag.get("next_step") or "Start your personalized lesson path on the weakest topic."

    ai_strengths = ai_diag.get("strengths")
    if isinstance(ai_strengths, list) and ai_strengths:
        strengths = [str(s) for s in ai_strengths]

    ai_weaknesses = ai_diag.get("weaknesses")
    if isinstance(ai_weaknesses, list) and ai_weaknesses:
        weaknesses = [str(w) for w in ai_weaknesses]

    _session_bank.pop(req.session_id, None)

    return OnboardingDiagnosticResponse(
        score=score,
        total=total,
        strengths=strengths,
        weaknesses=weaknesses,
        by_topic=by_topic,
        recommendation=recommendation,
        next_step=next_step,
    )

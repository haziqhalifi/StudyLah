from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException

import db
from schemas.session import (
    AssessmentResponse,
    ReviewResponse,
    StartDiagnosticRequest,
    StartDiagnosticResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    SubmitDiagnosticRequest,
    SubmitDiagnosticResponse,
)
from schemas.question import Attempt
from services import ai_engine

router = APIRouter()


@router.post("/start_diagnostic", response_model=StartDiagnosticResponse)
def start_diagnostic(req: StartDiagnosticRequest):
    """
    Returns a fixed set of diagnostic MCQ questions for the given topic.
    Correct answers are stripped before sending to the frontend.
    """
    questions = db.get_questions_by_ids(db.DIAGNOSTIC_QUESTION_IDS)
    if not questions:
        raise HTTPException(status_code=404, detail="No diagnostic questions found for this topic.")
    return StartDiagnosticResponse(questions=[q.to_public() for q in questions])


@router.post("/submit_diagnostic", response_model=SubmitDiagnosticResponse)
def submit_diagnostic(req: SubmitDiagnosticRequest):
    """
    Scores diagnostic answers, builds the initial skill profile, and
    returns the first personalised question for the learn loop.

    AI engine called here:
      - ai_engine.analyze_diagnostic  → builds SkillProfile
      - ai_engine.choose_next_question → picks first learn question
    """
    if not req.answers:
        raise HTTPException(status_code=400, detail="No answers provided.")

    # AI Engine: analyse diagnostic and build skill profile
    skill_profile = ai_engine.analyze_diagnostic(req.user_id, req.answers)

    # AI Engine: select the first learning question
    history = db.get_user_attempts(req.user_id)
    first_question = ai_engine.choose_next_question(skill_profile, history)

    return SubmitDiagnosticResponse(
        skill_profile=skill_profile,
        next_question=first_question,
    )


@router.post("/submit_answer", response_model=SubmitAnswerResponse)
def submit_answer(req: SubmitAnswerRequest):
    """
    Processes a single MCQ answer in the learn/practice loop.

    AI engine called here:
      - ai_engine.generate_explanation  → personalised explanation
      - ai_engine.update_skill_profile  → update accuracy stats
      - ai_engine.choose_next_question  → select next question
    """
    question = db.get_question_by_id(req.question_id)
    if question is None:
        raise HTTPException(status_code=404, detail=f"Question {req.question_id} not found.")

    is_correct = question.correct_option_index == req.selected_option_index

    # Record attempt
    attempt = Attempt(
        user_id=req.user_id,
        question_id=req.question_id,
        selected_option_index=req.selected_option_index,
        is_correct=is_correct,
        timestamp=datetime.utcnow(),
    )
    db.record_attempt(attempt)

    # AI Engine: update skill profile
    profile = db.get_or_create_profile(req.user_id)
    profile = ai_engine.update_skill_profile(profile, question.topic_id, is_correct)

    # AI Engine: generate personalised explanation
    history = db.get_user_attempts(req.user_id)
    explanation = ai_engine.generate_explanation(question, req.selected_option_index, profile, history)

    # AI Engine: choose next question
    next_q = ai_engine.choose_next_question(profile, history, question.topic_id)

    topic_summary = profile.topics.get(question.topic_id)

    return SubmitAnswerResponse(
        is_correct=is_correct,
        explanation=explanation,
        next_question=next_q,
        skill_summary=topic_summary,
    )


@router.get("/assessment", response_model=AssessmentResponse)
def get_assessment(user_id: str):
    """
    Returns per-topic accuracy summary for the assessment view.
    """
    profile = db.get_or_create_profile(user_id)
    return AssessmentResponse(topics=list(profile.topics.values()))


@router.get("/review", response_model=ReviewResponse)
def get_review(user_id: str):
    """
    Returns spaced-repetition review questions and topic suggestions.

    AI engine called here:
      - ai_engine.select_review_questions → spaced repetition logic
    """
    profile = db.get_or_create_profile(user_id)
    history = db.get_user_attempts(user_id)

    # AI Engine: spaced repetition selection
    review_items, suggested_topics = ai_engine.select_review_questions(profile, history)

    return ReviewResponse(
        review_questions=review_items,
        suggested_topics=suggested_topics,
    )

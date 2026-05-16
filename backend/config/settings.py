"""
Application settings loaded from environment variables.

Usage:
    from backend.config.settings import settings

Add to backend/.env (or set as real env vars):
    OPENAI_API_KEY=sk-...
    OPENAI_MODEL_NAME=gpt-4o-mini   # optional, has default
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load backend/.env so keys are available regardless of cwd.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class Settings(BaseSettings):
    # -----------------------------------------------------------------------
    # Adaptive engine selector
    #   "rule_based"  — deterministic heuristics only (safe default)
    #   "gemini"      — route through GeminiAdaptiveEngine with rule-based fallback
    # -----------------------------------------------------------------------
    adaptive_engine: str = "rule_based"

    # -----------------------------------------------------------------------
    # OpenAI
    # -----------------------------------------------------------------------
    openai_api_key: Optional[str] = None
    openai_model_name: str = "gpt-4o-mini"
    openai_temperature: float = 0.2                  # low = more deterministic JSON output
    openai_timeout_seconds: int = 15                 # per-request timeout

    # -----------------------------------------------------------------------
    # KSSM RAG — controls where explanation text comes from.
    #   "openai"  — free-form OpenAI (default, no syllabus grounding)
    #   "kssm"    — KSSM-grounded via KssmAnswerEngine (RAG pipeline)
    # Set EXPLANATIONS_SOURCE=kssm in backend/.env to enable grounded explanations.
    # -----------------------------------------------------------------------
    explanations_source: str = "openai"

    # -----------------------------------------------------------------------
    # Anthropic (kept for backwards compatibility with existing ai_engine)
    # -----------------------------------------------------------------------
    anthropic_api_key: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# Singleton — import this everywhere.
settings = Settings()

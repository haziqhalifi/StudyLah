"""
Application settings loaded from environment variables.

Usage:
    from backend.config.settings import settings

    if settings.adaptive_engine == "gemini":
        ...

Add to backend/.env (or set as real env vars):
    ADAPTIVE_ENGINE=gemini
    GEMINI_API_KEY=AIza...
    GEMINI_MODEL_NAME=gemini-1.5-pro   # optional, has default
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
    # Gemini
    # -----------------------------------------------------------------------
    gemini_api_key: Optional[str] = None
    gemini_model_name: str = "gemini-1.5-pro"       # swap to "gemini-2.0-flash" if needed
    gemini_temperature: float = 0.2                  # low = more deterministic JSON output
    gemini_timeout_seconds: int = 15                 # per-request timeout

    # -----------------------------------------------------------------------
    # KSSM RAG — controls where explanation text comes from.
    #   "gemini"  — free-form Gemini (default, no syllabus grounding)
    #   "kssm"    — KSSM-grounded via KssmAnswerEngine (RAG pipeline)
    # Used by ai_engine.generate_explanation to optionally route through KSSM.
    # Set EXPLANATIONS_SOURCE=kssm in backend/.env to enable grounded explanations.
    # -----------------------------------------------------------------------
    explanations_source: str = "gemini"

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

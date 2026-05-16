"""
KSSM Retriever — retrieval layer of the StudyLah RAG pipeline.

Given a topic ID and a user question, this module fetches the most relevant
KSSM syllabus chunks from the content store and formats them into a context
block ready for injection into a Gemini prompt.

Current retrieval strategy: keyword overlap (bag-of-words, case-insensitive).
See TODO comments for the vector-search upgrade path.
"""

from __future__ import annotations

import logging
from typing import Optional

try:
    from backend.models.content import SyllabusChunk, SyllabusRepository, ACTIVE_CHUNKS
except ModuleNotFoundError:
    from models.content import SyllabusChunk, SyllabusRepository, ACTIVE_CHUNKS  # type: ignore

logger = logging.getLogger(__name__)

_CONTEXT_HEADER = "--- KSSM SYLLABUS CONTEXT START ---"
_CONTEXT_FOOTER = "--- KSSM SYLLABUS CONTEXT END ---"
_EMPTY_CONTEXT = (
    f"{_CONTEXT_HEADER}\n"
    "(No relevant KSSM syllabus material found for this question.)\n"
    f"{_CONTEXT_FOOTER}"
)


class KssmRetriever:
    """
    Retrieves KSSM-aligned syllabus chunks for a given question.

    Usage:
        repo = SyllabusRepository(SAMPLE_CHUNKS)
        retriever = KssmRetriever(repo)

        chunks = retriever.retrieve_context("ubahan", "What is direct variation?")
        context_str = retriever.format_context_for_prompt(chunks)
    """

    def __init__(
        self,
        repository: SyllabusRepository,
        max_tokens: int = 1500,
    ) -> None:
        self.repository = repository
        self.max_tokens = max_tokens

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def retrieve_context(
        self,
        topic_id: Optional[str],
        user_question: str,
        max_chunks: int = 5,
    ) -> list[SyllabusChunk]:
        """
        Return the most relevant KSSM chunks for the question.

        Steps:
          1. If topic_id is provided, filter the pool to that topic.
          2. Rank remaining chunks by keyword overlap with user_question.
          3. Greedily select chunks until max_chunks or max_tokens is exhausted.

        TODO (semantic retrieval upgrade):
          Replace step 2 with a vector similarity search:
            query_vec = embed_model.encode(user_question)
            candidates = vector_store.search(query_vec, topic_id=topic_id, k=max_chunks*2)
          Steps 1 and 3 stay the same.
        """
        # Fetch a wider candidate set, then token-budget down to max_chunks.
        candidates = self.repository.search_chunks(
            topic_id=topic_id,
            query=user_question,
            limit=max_chunks * 2,
        )

        selected: list[SyllabusChunk] = []
        token_budget = self.max_tokens

        for chunk in candidates:
            chunk_tokens = chunk.approx_tokens()
            if chunk_tokens > token_budget:
                continue
            selected.append(chunk)
            token_budget -= chunk_tokens
            if len(selected) >= max_chunks:
                break

        logger.debug(
            "KssmRetriever: topic=%s query=%r → %d chunks selected (%d tokens remaining)",
            topic_id,
            user_question[:60],
            len(selected),
            token_budget,
        )
        return selected

    def format_context_for_prompt(self, chunks: list[SyllabusChunk]) -> str:
        """
        Render retrieved chunks into a structured block for the LLM prompt.

        Output format:
            --- KSSM SYLLABUS CONTEXT START ---

            Source: KSSM Textbook Form 5, Chapter 1 (Direct Variation)
            Content:
            Direct variation (ubahan langsung): y varies directly as x ...

            Source: KSSM Textbook Form 5, Chapter 1 (Inverse Variation)
            Content:
            ...
            --- KSSM SYLLABUS CONTEXT END ---
        """
        if not chunks:
            return _EMPTY_CONTEXT

        lines = [_CONTEXT_HEADER]
        for chunk in chunks:
            lines.append(f"\nSource: {chunk.source} ({chunk.chapter})")
            lines.append("Content:")
            lines.append(chunk.content)
        lines.append(f"\n{_CONTEXT_FOOTER}")

        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Module-level singleton — use this in production; override in tests.
# ACTIVE_CHUNKS is either loaded from kssm_chunks.json (real KSSM content
# produced by tools/pdf_chunker.py) or falls back to SAMPLE_CHUNKS.
# ---------------------------------------------------------------------------

_default_repository = SyllabusRepository(ACTIVE_CHUNKS)
default_retriever = KssmRetriever(_default_repository)

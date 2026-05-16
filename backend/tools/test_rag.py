"""
RAG pipeline test — shows exactly what Gemini receives.

Run from backend/:
    python tools/test_rag.py

It prints:
  1. Which chunks were retrieved
  2. The FULL prompt sent to Gemini (system + user)
  3. Gemini's answer
"""

import sys
from pathlib import Path

# Make sure backend/ is on the path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.models.content import ACTIVE_CHUNKS, SyllabusRepository
from backend.services.kssm_retriever import KssmRetriever
from backend.services.kssm_answer_engine import KssmAnswerEngine, _KSSM_SYSTEM_PROMPT

# ── Test questions (Bahasa Melayu) ───────────────────────────────────────────
TEST_CASES = [
    ("ubahan",   "Apakah maksud ubahan langsung? Berikan contoh."),
    ("matriks",  "Bagaimana cara mencari songsangan matriks 2×2?"),
    ("insurans", "Apakah formula klausa purata dan bagaimana cara menggunakannya?"),
]

repo = SyllabusRepository(ACTIVE_CHUNKS)
retriever = KssmRetriever(repo)
engine = KssmAnswerEngine()


def run_test(topic_id: str, question: str) -> None:
    print("\n" + "=" * 70)
    print(f"TOPIK  : {topic_id}")
    print(f"SOALAN : {question}")
    print("=" * 70)

    # Step 1 — retrieve
    chunks = retriever.retrieve_context(topic_id=topic_id, user_question=question)
    print(f"\n[RETRIEVAL] {len(chunks)} chunk(s) retrieved:")
    for i, c in enumerate(chunks, 1):
        preview = c.content[:80].replace("\n", " ")
        print(f"  {i}. [{c.id}] {c.chapter} — \"{preview}...\"")

    if not chunks:
        print("  ⚠ No chunks found — Gemini will NOT be called.")
        return

    # Step 2 — show the exact prompt
    context_block = retriever.format_context_for_prompt(chunks)
    user_message = f"{context_block}\n\nSOALAN PELAJAR:\n{question}"

    print("\n[PROMPT TO GEMINI]")
    print("--- SYSTEM ---")
    print(_KSSM_SYSTEM_PROMPT)
    print("\n--- USER ---")
    print(user_message)

    # Step 3 — call Gemini
    print("\n[GEMINI ANSWER] (calling API...)")
    answer = engine.answer_with_kssm(
        user_question=question,
        topic_id=topic_id,
        retriever=retriever,
    )
    print(answer)


if __name__ == "__main__":
    topic_filter = sys.argv[1] if len(sys.argv) > 1 else None

    print(f"Loaded {len(ACTIVE_CHUNKS)} chunks "
          f"({'kssm_chunks.json' if (Path(__file__).parent.parent / 'models' / 'kssm_chunks.json').exists() else 'SAMPLE_CHUNKS (fallback)'})")

    for topic_id, question in TEST_CASES:
        if topic_filter and topic_id != topic_filter:
            continue
        run_test(topic_id, question)

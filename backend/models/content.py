"""
KSSM Syllabus content store for StudyLah RAG pipeline.

Topics covered (SPM Form 5 Mathematics):
  - Ubahan         (Variation)
  - Matriks        (Matrices)
  - Insurans       (Consumer Math: Insurance)

LEGAL NOTE: All chunks stored here must come from legally permissible sources,
e.g. the publicly available DSKP curriculum document, teacher-authored notes
aligned to KSSM, or original summaries of the public syllabus.  Do NOT store
verbatim copyrighted textbook pages.  The operator is responsible for ensuring
all content complies with applicable Malaysian copyright law.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Path to the JSON file produced by tools/pdf_chunker.py
_CHUNKS_JSON = Path(__file__).resolve().parent / "kssm_chunks.json"


class SyllabusChunk(BaseModel):
    """A single grounded content chunk from KSSM-aligned materials."""

    id: str
    subject: str        # e.g. "math"
    level: str          # e.g. "form5"
    topic_id: str       # "ubahan" | "matriks" | "insurans"
    chapter: str        # e.g. "Direct Variation"
    source: str         # e.g. "KSSM Textbook Form 5, Chapter 1"
    content: str        # actual text chunk
    tokens: int = 0     # precomputed token count; 0 = not set, computed on demand

    def approx_tokens(self) -> int:
        """Approximate token count (word-count proxy — good enough for budget checks)."""
        return self.tokens if self.tokens > 0 else len(self.content.split())


# ---------------------------------------------------------------------------
# English → Bahasa Melayu keyword bridge.
# The chunks are in BM (extracted from KSSM textbooks), but students may ask
# in English.  This map expands an English query with BM equivalents so that
# keyword scoring still finds the right chunks.
# ---------------------------------------------------------------------------
_EN_TO_BM: dict[str, list[str]] = {
    # Ubahan
    "variation":        ["ubahan"],
    "direct":           ["langsung"],
    "inverse":          ["songsang"],
    "joint":            ["bergabung", "tercantum"],
    "partial":          ["separa"],
    "constant":         ["pemalar"],
    "variable":         ["pemboleh ubah", "pembolehubah"],
    "proportion":       ["nisbah", "perkadaran"],
    "proportional":     ["berkadar"],
    # Matriks
    "matrix":           ["matriks"],
    "matrices":         ["matriks"],
    "determinant":      ["penentu", "determinan"],
    "inverse matrix":   ["matriks songsang"],
    "identity":         ["identiti"],
    "multiplication":   ["pendaraban", "darab"],
    "simultaneous":     ["serentak"],
    "equation":         ["persamaan"],
    "order":            ["peringkat", "tertib"],
    "element":          ["unsur"],
    # Insurans
    "insurance":        ["insurans"],
    "premium":          ["premium"],
    "policy":           ["polisi"],
    "insured":          ["diinsurans", "insurans"],
    "compensation":     ["pampasan", "ganti rugi"],
    "claim":            ["tuntutan"],
    "fire":             ["kebakaran"],
    "motor":            ["kenderaan"],
    "life":             ["hayat"],
    "takaful":          ["takaful"],
    "ncd":              ["ncd", "diskaun"],
    "discount":         ["diskaun"],
    "sum":              ["jumlah"],
    "loss":             ["kerugian", "kehilangan"],
    "property":         ["harta", "hartanah"],
    "value":            ["nilai"],
    "rate":             ["kadar"],
    # Common math
    "formula":          ["rumus", "formula"],
    "calculate":        ["kira", "kiraan", "hitung"],
    "find":             ["cari", "dapatkan"],
    "solve":            ["selesai", "penyelesaian"],
    "example":          ["contoh"],
    "explain":          ["terang", "jelaskan", "huraikan"],
    "definition":       ["definisi", "maksud", "takrif"],
    "how":              ["bagaimana", "cara"],
    "what":             ["apa", "apakah"],
}


def _expand_query(query: str) -> set[str]:
    """
    Return query words PLUS their BM equivalents from _EN_TO_BM.
    This lets English queries match Bahasa Melayu chunk content.
    """
    words = set(query.lower().split())
    extra: set[str] = set()
    query_lower = query.lower()
    for en_term, bm_terms in _EN_TO_BM.items():
        if en_term in query_lower:
            extra.update(bm_terms)
    words.update(extra)
    return words


class SyllabusRepository:
    """
    In-memory store for KSSM syllabus chunks with bilingual keyword search.

    Chunks are in Bahasa Melayu (extracted from KSSM textbooks).  The search
    automatically expands English queries with BM equivalents so that English-
    language student questions still retrieve relevant chunks.

    TODO (vector DB upgrade):
      Replace __init__ and search_chunks with a PGVector / Pinecone client.
      The public interface (get_chunks_for_topic, search_chunks) stays the same
      so all callers need zero changes.

      PGVector example:
        # 1. Store chunks with embeddings: text-embedding-3-small (1536-dim)
        # 2. On query: embed user_question, then:
        #    SELECT * FROM kssm_chunks
        #    WHERE topic_id = %s
        #    ORDER BY embedding <-> %s   -- cosine/L2 distance
        #    LIMIT %s;
    """

    def __init__(self, chunks: list[SyllabusChunk]) -> None:
        self._chunks = chunks

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def get_chunks_for_topic(self, topic_id: str) -> list[SyllabusChunk]:
        """Return all chunks for a specific topic."""
        return [c for c in self._chunks if c.topic_id == topic_id]

    def search_chunks(
        self,
        topic_id: Optional[str],
        query: Optional[str],
        limit: int = 5,
    ) -> list[SyllabusChunk]:
        """
        Bilingual keyword search over chunk content.

        Scoring: count how many (expanded) query words appear in each chunk.
        English queries are automatically expanded with BM equivalents via
        _expand_query(), so "explain direct variation" also matches chunks
        containing "ubahan langsung".

        Chunks are ranked by score descending.  Zero-score chunks are still
        included (topic-filtered fallback) so the retriever never returns empty
        when topic_id is given.

        TODO (semantic search upgrade):
          Replace the scoring block below with an embedding similarity call:
            query_vec = embed(query)          # e.g. Gemini embedding API
            scored = vector_store.nearest(query_vec, topic_id=topic_id, k=limit)
          Everything else (topic filter, limit) stays identical.
        """
        pool = self._chunks if topic_id is None else self.get_chunks_for_topic(topic_id)

        if not query or not query.strip():
            return pool[:limit]

        query_words = _expand_query(query)

        scored: list[tuple[int, SyllabusChunk]] = []
        for chunk in pool:
            content_lower = chunk.content.lower()
            score = sum(1 for w in query_words if w in content_lower)
            scored.append((score, chunk))

        scored.sort(key=lambda t: t[0], reverse=True)
        return [chunk for _, chunk in scored[:limit]]


# ---------------------------------------------------------------------------
# Sample KSSM-aligned chunks (simulated / demo data).
#
# Replace these with your own preprocessed chunks extracted from:
#   - DSKP Matematik Tingkatan 5 (publicly available KPM curriculum document)
#   - Teacher-authored notes aligned to KSSM
#   - Original summaries of the public syllabus
#
# Ideal chunk size: ~100–300 words for best RAG recall vs. context-window cost.
# ---------------------------------------------------------------------------

SAMPLE_CHUNKS: list[SyllabusChunk] = [
    # ── Ubahan (Variation) ──────────────────────────────────────────────────
    SyllabusChunk(
        id="ubahan-01",
        subject="math",
        level="form5",
        topic_id="ubahan",
        chapter="Direct Variation",
        source="KSSM Matematik Tingkatan 5, Bab 1 – Ubahan",
        content=(
            "Direct variation (ubahan langsung): y varies directly as x, written y ∝ x, "
            "means y = kx where k is the constant of variation (pemalar ubahan).\n"
            "Key facts:\n"
            "  • k = y/x (ratio is constant).\n"
            "  • Graph of y against x is a straight line through the origin.\n"
            "  • When x increases, y increases proportionally; when x decreases, y decreases.\n"
            "Finding k: substitute one known pair (x, y) → k = y/x.\n"
            "Example: y = 6 when x = 2 → k = 3 → equation: y = 3x.\n"
            "To find a new value: if x = 5, then y = 3 × 5 = 15.\n"
            "SPM shortcut: use y₁/x₁ = y₂/x₂ to find an unknown without first finding k."
        ),
    ),
    SyllabusChunk(
        id="ubahan-02",
        subject="math",
        level="form5",
        topic_id="ubahan",
        chapter="Inverse Variation",
        source="KSSM Matematik Tingkatan 5, Bab 1 – Ubahan",
        content=(
            "Inverse variation (ubahan songsang): y varies inversely as x, written y ∝ 1/x, "
            "means y = k/x, or equivalently xy = k (constant product).\n"
            "Key facts:\n"
            "  • Product xy is constant.\n"
            "  • Graph of y against x is a hyperbola (not a straight line).\n"
            "  • Graph of y against 1/x is a straight line through the origin.\n"
            "  • As x increases, y decreases; as x decreases, y increases.\n"
            "Finding k: k = x × y from any known pair.\n"
            "Example: y = 4 when x = 3 → k = 12 → equation: y = 12/x.\n"
            "SPM shortcut: x₁y₁ = x₂y₂. Substitute known values to find the unknown."
        ),
    ),
    SyllabusChunk(
        id="ubahan-03",
        subject="math",
        level="form5",
        topic_id="ubahan",
        chapter="Joint Variation",
        source="KSSM Matematik Tingkatan 5, Bab 1 – Ubahan",
        content=(
            "Joint variation (ubahan bersama): y varies jointly as x and z means y ∝ xz, "
            "so y = kxz.\n"
            "Combined forms also appear in SPM:\n"
            "  • y ∝ x/z  → y = kx/z  (directly as x, inversely as z).\n"
            "  • y ∝ x²/z → y = kx²/z (directly as x², inversely as z).\n"
            "Finding k: substitute known values of all variables into the equation.\n"
            "Example: y = 12 when x = 2, z = 3 → k = 12/(2×3) = 2 → y = 2xz.\n"
            "SPM approach:\n"
            "  (1) Write the variation as an equation with k.\n"
            "  (2) Substitute one known set of values to find k.\n"
            "  (3) Rewrite the full equation, then substitute to find the unknown."
        ),
    ),
    SyllabusChunk(
        id="ubahan-04",
        subject="math",
        level="form5",
        topic_id="ubahan",
        chapter="Partial Variation",
        source="KSSM Matematik Tingkatan 5, Bab 1 – Ubahan",
        content=(
            "Partial variation (ubahan separa): y is partly constant and partly varies "
            "with x. General form: y = kx + c, where both k and c are constants.\n"
            "How to find k and c:\n"
            "  1. Substitute two given (x, y) pairs into y = kx + c.\n"
            "  2. Solve the two resulting simultaneous equations.\n"
            "Example: y = 11 when x = 2, and y = 17 when x = 5.\n"
            "  11 = 2k + c  …(1)\n"
            "  17 = 5k + c  …(2)\n"
            "  (2) − (1): 6 = 3k → k = 2, then c = 11 − 4 = 7.\n"
            "  Equation: y = 2x + 7.\n"
            "SPM context: often appears as a word problem with a fixed component "
            "(e.g. fixed monthly fee) plus a variable component (e.g. charge per unit used)."
        ),
    ),

    # ── Matriks (Matrices) ──────────────────────────────────────────────────
    SyllabusChunk(
        id="matriks-01",
        subject="math",
        level="form5",
        topic_id="matriks",
        chapter="Matrix Notation and Basic Operations",
        source="KSSM Matematik Tingkatan 5, Bab 2 – Matriks",
        content=(
            "A matrix (matriks) is a rectangular array of numbers in rows and columns. "
            "Order of a matrix: m × n (m rows, n columns).\n"
            "Special matrices:\n"
            "  • Row matrix (1×n), Column matrix (m×1), Square matrix (n×n).\n"
            "  • Zero matrix (O): all elements are 0.\n"
            "  • Identity matrix (I): 1s on the main diagonal, 0s elsewhere.\n"
            "Addition / subtraction: only matrices of the SAME order can be added or subtracted; "
            "operate on corresponding elements.\n"
            "  [1 2] + [5 6] = [6  8]\n"
            "  [3 4]   [7 8]   [10 12]\n"
            "Scalar multiplication: multiply every element by the scalar.\n"
            "KSSM scope: Form 5 focuses on 2×2 and 3×3 for addition/subtraction, "
            "and 2×2 for multiplication and inverse."
        ),
    ),
    SyllabusChunk(
        id="matriks-02",
        subject="math",
        level="form5",
        topic_id="matriks",
        chapter="Matrix Multiplication",
        source="KSSM Matematik Tingkatan 5, Bab 2 – Matriks",
        content=(
            "Matrix multiplication: an m×n matrix can only be multiplied by an n×p matrix "
            "(inner dimensions must match). The result is an m×p matrix.\n"
            "Method (row × column): each element of the result = sum of products of the "
            "corresponding row elements of the first matrix and column elements of the second.\n"
            "Example (2×2 × 2×2):\n"
            "  [1 2] × [5 6] = [1×5+2×7  1×6+2×8] = [19 22]\n"
            "  [3 4]   [7 8]   [3×5+4×7  3×6+4×8]   [43 50]\n"
            "Important: matrix multiplication is NOT commutative (AB ≠ BA in general).\n"
            "SPM tips:\n"
            "  • Check conformability (dimensions) before multiplying.\n"
            "  • Show full row-by-column working to earn method marks."
        ),
    ),
    SyllabusChunk(
        id="matriks-03",
        subject="math",
        level="form5",
        topic_id="matriks",
        chapter="Inverse of a 2×2 Matrix",
        source="KSSM Matematik Tingkatan 5, Bab 2 – Matriks",
        content=(
            "Inverse of a 2×2 matrix (KSSM Form 5 formula):\n"
            "For A = [a b; c d]:\n"
            "  det(A) = ad − bc\n"
            "  A⁻¹ = (1 / det A) × [d  −b; −c  a]\n"
            "Steps:\n"
            "  1. Calculate det(A) = ad − bc.\n"
            "  2. If det(A) = 0, the matrix is singular (no inverse).\n"
            "  3. Swap positions of a and d; negate b and c.\n"
            "  4. Multiply the resulting matrix by 1/det(A).\n"
            "Key property: A × A⁻¹ = A⁻¹ × A = I (identity matrix).\n"
            "Example: A = [3 1; 2 1]. det = 3×1 − 1×2 = 1.\n"
            "  A⁻¹ = [1 −1; −2 3].\n"
            "SPM note: memorise this formula — it appears directly in examinations."
        ),
    ),
    SyllabusChunk(
        id="matriks-04",
        subject="math",
        level="form5",
        topic_id="matriks",
        chapter="Simultaneous Equations via Matrix",
        source="KSSM Matematik Tingkatan 5, Bab 2 – Matriks",
        content=(
            "Solving simultaneous linear equations using matrices:\n"
            "Write the system as AX = B:\n"
            "  A = coefficient matrix, X = variable column matrix, B = constant column matrix.\n"
            "Solution: X = A⁻¹B.\n"
            "Example: 2x + y = 5 and x + 3y = 10.\n"
            "  A = [2 1; 1 3],  X = [x; y],  B = [5; 10].\n"
            "  det(A) = 2×3 − 1×1 = 5.\n"
            "  A⁻¹ = (1/5)[3 −1; −1 2].\n"
            "  X = (1/5)[ 3×5+(−1)×10 ; (−1)×5+2×10 ]\n"
            "    = (1/5)[5; 15] = [1; 3].\n"
            "  So x = 1, y = 3.\n"
            "SPM approach: (1) form the matrix equation; (2) find A⁻¹; "
            "(3) compute X = A⁻¹B and state the solution. Show all steps."
        ),
    ),

    # ── Insurans (Insurance) ─────────────────────────────────────────────────
    SyllabusChunk(
        id="insurans-01",
        subject="math",
        level="form5",
        topic_id="insurans",
        chapter="Basic Insurance Concepts",
        source="KSSM Matematik Tingkatan 5, Bab 3 – Matematik Pengguna: Insurans",
        content=(
            "Insurance (insurans): a contract where an insurer pays financial compensation "
            "for specified losses in exchange for a premium from the policyholder.\n"
            "Key terms:\n"
            "  • Premium (premium): regular payment (usually annual) to the insurer.\n"
            "  • Sum insured (jumlah diinsurans): maximum payout by the insurer.\n"
            "  • Policy (polisi): the insurance contract document.\n"
            "  • Policyholder (pemegang polisi): person who owns the policy.\n"
            "  • Beneficiary (benefisiari / waris): person who receives payment on a claim.\n"
            "  • NCD (No-Claim Discount): discount on renewal premium when no claims were made.\n"
            "  • Takaful: Islamic alternative to conventional insurance, based on mutual "
            "contribution (ta'awun) and shared responsibility — no riba (interest)."
        ),
    ),
    SyllabusChunk(
        id="insurans-02",
        subject="math",
        level="form5",
        topic_id="insurans",
        chapter="Premium Calculation",
        source="KSSM Matematik Tingkatan 5, Bab 3 – Matematik Pengguna: Insurans",
        content=(
            "Premium calculation formula (KSSM Form 5):\n"
            "  Annual Premium = Rate × Sum Insured\n"
            "Rate is expressed per RM100 or per RM1 000 of sum insured.\n"
            "Example 1 (fire insurance): rate = RM0.25 per RM100, sum insured = RM80 000.\n"
            "  Premium = (0.25 / 100) × 80 000 = RM200 per year.\n"
            "Example 2 (motor insurance): rate = RM1.50 per RM100, sum insured = RM50 000.\n"
            "  Premium = (1.50 / 100) × 50 000 = RM750 per year.\n"
            "NCD example: NCD = 25%, base premium = RM750.\n"
            "  Actual premium = RM750 × (1 − 0.25) = RM562.50.\n"
            "SPM tip: Convert the rate correctly (per RM100 means divide by 100). "
            "Write formula, substitute values, and give final answer in RM."
        ),
    ),
    SyllabusChunk(
        id="insurans-03",
        subject="math",
        level="form5",
        topic_id="insurans",
        chapter="Average Clause and Under-insurance",
        source="KSSM Matematik Tingkatan 5, Bab 3 – Matematik Pengguna: Insurans",
        content=(
            "Average clause / under-insurance (klausa purata / kurang insurans):\n"
            "Applies when the sum insured is LESS than the actual market value of the property.\n"
            "Formula:\n"
            "  Compensation = (Sum Insured / Market Value of Property) × Amount of Loss\n"
            "The policyholder bears any uncompensated portion of the loss themselves.\n"
            "Example: market value = RM120 000, sum insured = RM80 000, loss = RM60 000.\n"
            "  Compensation = (80 000 / 120 000) × 60 000 = (2/3) × 60 000 = RM40 000.\n"
            "  Policyholder's own loss = RM60 000 − RM40 000 = RM20 000.\n"
            "SPM approach:\n"
            "  1. Identify sum insured, market/property value, and loss amount.\n"
            "  2. Apply the formula.\n"
            "  3. State the compensation AND the uncompensated portion."
        ),
    ),
    SyllabusChunk(
        id="insurans-04",
        subject="math",
        level="form5",
        topic_id="insurans",
        chapter="Types of Insurance",
        source="KSSM Matematik Tingkatan 5, Bab 3 – Matematik Pengguna: Insurans",
        content=(
            "Types of insurance relevant to KSSM Matematik Pengguna Form 5:\n"
            "1. Fire insurance (insurans kebakaran): covers property loss/damage from fire. "
            "Average clause applies for under-insured property.\n"
            "2. Motor vehicle insurance (insurans kenderaan bermotor):\n"
            "   • Comprehensive (komprehensif): own damage + third-party damage + theft.\n"
            "   • Third party only (pihak ketiga): covers damage to other parties only.\n"
            "   NCD applies on annual renewal.\n"
            "3. Life insurance (insurans hayat): pays a lump sum on death or at policy maturity.\n"
            "   Premium depends on age, health, and sum insured.\n"
            "4. Medical / health insurance (insurans perubatan): covers hospital and medical bills.\n"
            "Takaful products mirror all four types above but use Islamic finance principles "
            "(tabarru' donation model, no riba, surplus may be returned to participants)."
        ),
    ),
]


# ---------------------------------------------------------------------------
# Active chunk list — used by SyllabusRepository at runtime.
#
# Priority:
#   1. kssm_chunks.json  (produced by tools/pdf_chunker.py — real KSSM content)
#   2. SAMPLE_CHUNKS     (built-in demo data used when the JSON is absent)
#
# After running the chunker, restart the backend and this loader picks up the
# real content automatically — no code change needed.
# ---------------------------------------------------------------------------

def _load_chunks() -> list[SyllabusChunk]:
    if _CHUNKS_JSON.exists():
        try:
            raw: list[dict] = json.loads(_CHUNKS_JSON.read_text(encoding="utf-8"))
            chunks = [SyllabusChunk(**item) for item in raw]
            logger.info(
                "content: loaded %d KSSM chunks from %s", len(chunks), _CHUNKS_JSON.name
            )
            return chunks
        except Exception as exc:
            logger.warning(
                "content: failed to load %s (%s) — falling back to SAMPLE_CHUNKS",
                _CHUNKS_JSON.name, exc,
            )
    return SAMPLE_CHUNKS


# This is what the rest of the codebase imports.
ACTIVE_CHUNKS: list[SyllabusChunk] = _load_chunks()

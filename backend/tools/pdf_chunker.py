"""
KSSM PDF Chunker — extracts text from PDF docs and produces SyllabusChunk JSON.

Usage:
    # 1. Install pdfplumber once:
    #    pip install pdfplumber
    #
    # 2. Run from the backend/ directory:
    #    python tools/pdf_chunker.py
    #
    # 3. This writes  models/kssm_chunks.json
    #    content.py will automatically load it at startup (replacing SAMPLE_CHUNKS).

Input:  ../docs/ubahan.pdf, ../docs/matriks.pdf, ../docs/insurans.pdf
Output: models/kssm_chunks.json
"""

from __future__ import annotations

import json
import re
import sys
import uuid
from pathlib import Path

# ── Dependency check ────────────────────────────────────────────────────────
try:
    import pdfplumber
except ImportError:
    print(
        "ERROR: pdfplumber is not installed.\n"
        "Run:  pip install pdfplumber\n"
        "Then re-run this script.",
        file=sys.stderr,
    )
    sys.exit(1)

# ── Paths ────────────────────────────────────────────────────────────────────

_SCRIPT_DIR = Path(__file__).resolve().parent          # backend/tools/
_BACKEND_DIR = _SCRIPT_DIR.parent                      # backend/
_DOCS_DIR = _BACKEND_DIR.parent / "docs"               # docs/
_OUTPUT_FILE = _BACKEND_DIR / "models" / "kssm_chunks.json"

# Map filename stem → (topic_id, subject label for source string)
_PDF_MAP: dict[str, tuple[str, str]] = {
    "ubahan":   ("ubahan",   "Ubahan (Variation)"),
    "matriks":  ("matriks",  "Matriks (Matrices)"),
    "insurans": ("insurans", "Matematik Pengguna: Insurans"),
}

# ── Chunking settings ────────────────────────────────────────────────────────

# Target word count per chunk (approximate).  Smaller → more chunks, more precise
# retrieval.  Larger → fewer chunks, more context per chunk.
TARGET_WORDS = 200

# Minimum words a paragraph must have to be included (skip stray headers/footers).
MIN_PARAGRAPH_WORDS = 15

# When two consecutive paragraphs are both short, merge them.
MERGE_THRESHOLD_WORDS = 80


# ── Extraction helpers ───────────────────────────────────────────────────────

def _clean(text: str) -> str:
    """Normalise whitespace; collapse multiple blank lines to one."""
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _split_paragraphs(text: str) -> list[str]:
    """Split on blank lines; keep only non-trivial paragraphs."""
    raw = [p.strip() for p in text.split("\n\n")]
    return [p for p in raw if len(p.split()) >= MIN_PARAGRAPH_WORDS]


def _merge_short_paragraphs(paragraphs: list[str]) -> list[str]:
    """
    Merge consecutive short paragraphs so chunks aren't too tiny.
    A paragraph is 'short' when it has fewer than MERGE_THRESHOLD_WORDS words.
    """
    merged: list[str] = []
    buffer = ""
    for para in paragraphs:
        if buffer:
            candidate = buffer + "\n" + para
            if len(buffer.split()) < MERGE_THRESHOLD_WORDS:
                buffer = candidate
                continue
            else:
                merged.append(buffer)
                buffer = para
        else:
            buffer = para
    if buffer:
        merged.append(buffer)
    return merged


def _split_into_chunks(paragraphs: list[str]) -> list[str]:
    """
    Group paragraphs into chunks of ~TARGET_WORDS words.
    A new chunk is started when the current chunk exceeds TARGET_WORDS.
    """
    chunks: list[str] = []
    current: list[str] = []
    word_count = 0

    for para in paragraphs:
        para_words = len(para.split())
        if word_count + para_words > TARGET_WORDS and current:
            chunks.append("\n".join(current))
            current = [para]
            word_count = para_words
        else:
            current.append(para)
            word_count += para_words

    if current:
        chunks.append("\n".join(current))

    return chunks


def _detect_chapter(chunk_text: str, page_num: int) -> str:
    """
    Try to extract a chapter/section heading from the chunk.
    Falls back to 'Page N' when no obvious heading is found.

    Heuristics (adjust for your PDF's actual heading style):
      - First line that is ALL CAPS or Title Case and ≤ 8 words.
      - Lines starting with common chapter keywords.
    """
    lines = chunk_text.split("\n")
    for line in lines[:5]:
        stripped = line.strip()
        word_count = len(stripped.split())
        if not stripped or word_count > 10:
            continue
        # All-caps heading
        if stripped.isupper() and word_count <= 8:
            return stripped.title()
        # Title-cased heading (first letter of each word capitalised)
        if stripped.istitle() and word_count <= 8:
            return stripped
        # Explicit section markers
        if re.match(r"^(chapter|section|bab|subtopik|unit)\b", stripped, re.IGNORECASE):
            return stripped
    return f"Page {page_num}"


# ── Main extraction ──────────────────────────────────────────────────────────

def extract_pdf(pdf_path: Path, topic_id: str, topic_label: str) -> list[dict]:
    """
    Extract text from a single PDF and return a list of chunk dicts
    matching the SyllabusChunk schema.
    """
    print(f"  Reading {pdf_path.name} …", end=" ", flush=True)

    page_texts: list[tuple[int, str]] = []  # (page_number, text)

    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            raw = page.extract_text()
            if raw:
                page_texts.append((i, _clean(raw)))

    print(f"{len(page_texts)} pages extracted")

    # ── Combine all pages, then rechunk by TARGET_WORDS ──────────────────
    # We track which page each paragraph came from for chapter detection.
    all_paragraphs: list[tuple[int, str]] = []
    for page_num, text in page_texts:
        for para in _split_paragraphs(text):
            all_paragraphs.append((page_num, para))

    # Merge short consecutive paragraphs
    merged_texts = _merge_short_paragraphs([p for _, p in all_paragraphs])
    # Re-associate page numbers (approximate: use the page of the first paragraph)
    page_lookup: dict[str, int] = {p: pn for pn, p in all_paragraphs}

    # Split into final chunks
    raw_chunks = _split_into_chunks(merged_texts)

    chunks: list[dict] = []
    for idx, chunk_text in enumerate(raw_chunks):
        # Approximate page number for this chunk
        first_para = chunk_text.split("\n")[0]
        approx_page = page_lookup.get(first_para, 1)

        chapter = _detect_chapter(chunk_text, approx_page)
        source = f"KSSM {topic_label}, hlm. {approx_page}"

        chunks.append({
            "id": f"{topic_id}-{idx + 1:03d}",
            "subject": "math",
            "level": "form5",
            "topic_id": topic_id,
            "chapter": chapter,
            "source": source,
            "content": chunk_text,
            "tokens": len(chunk_text.split()),   # word-count proxy
        })

    print(f"    → {len(chunks)} chunks created")
    return chunks


def run():
    all_chunks: list[dict] = []

    for stem, (topic_id, topic_label) in _PDF_MAP.items():
        pdf_path = _DOCS_DIR / f"{stem}.pdf"
        if not pdf_path.exists():
            print(f"WARNING: {pdf_path} not found — skipping.")
            continue
        chunks = extract_pdf(pdf_path, topic_id, topic_label)
        all_chunks.extend(chunks)

    if not all_chunks:
        print("No chunks extracted. Check that PDFs exist in docs/ and are not image-only.")
        sys.exit(1)

    _OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    _OUTPUT_FILE.write_text(
        json.dumps(all_chunks, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\nDone. {len(all_chunks)} total chunks written to {_OUTPUT_FILE}")
    print("Restart the backend — content.py will load kssm_chunks.json automatically.")


if __name__ == "__main__":
    print("KSSM PDF Chunker")
    print("=" * 40)
    run()

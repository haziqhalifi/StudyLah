"use client";

import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FlashcardReadyCardProps {
  setId: string;
  title: string;
  topicId: string;
  numCards: number;
}

// ---------------------------------------------------------------------------
// Topic colours (matches flashcard page)
// ---------------------------------------------------------------------------

const TOPIC_COLORS: Record<string, string> = {
  ubahan: "bg-violet-100 text-violet-700 border-violet-200",
  matriks: "bg-blue-100 text-blue-700 border-blue-200",
  insurans: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const TOPIC_LABELS: Record<string, string> = {
  ubahan: "Ubahan",
  matriks: "Matriks",
  insurans: "Insurans",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FlashcardReadyCard({
  setId,
  title,
  topicId,
  numCards,
}: FlashcardReadyCardProps) {
  const router = useRouter();
  const chipClass =
    TOPIC_COLORS[topicId] ?? "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <div className="mt-2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm max-w-xs">
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl leading-none select-none">🃏</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
            {title}
          </p>
          <span
            className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${chipClass}`}
          >
            {TOPIC_LABELS[topicId] ?? topicId}
          </span>
        </div>
      </div>

      {/* Card count */}
      <p className="text-xs text-gray-500 mb-4">
        {numCards} flashcard{numCards !== 1 ? "s" : ""} ready to study
      </p>

      {/* CTA */}
      <button
        onClick={() => router.push(`/flashcards/${setId}`)}
        className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
      >
        Open flashcards →
      </button>
    </div>
  );
}

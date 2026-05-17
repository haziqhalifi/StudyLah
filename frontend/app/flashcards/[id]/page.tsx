"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchFlashcardSet, FlashcardSet, Flashcard } from "@/lib/api";

// ---------------------------------------------------------------------------
// Topic chip colours
// ---------------------------------------------------------------------------

const TOPIC_COLORS: Record<string, string> = {
  ubahan: "bg-violet-100 text-violet-700",
  matriks: "bg-blue-100 text-blue-700",
  insurans: "bg-emerald-100 text-emerald-700",
};

const TOPIC_LABELS: Record<string, string> = {
  ubahan: "Ubahan",
  matriks: "Matriks",
  insurans: "Insurans",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TopicChip({ topicId }: { topicId: string }) {
  const colour = TOPIC_COLORS[topicId] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${colour}`}>
      {TOPIC_LABELS[topicId] ?? topicId}
    </span>
  );
}

interface CardFaceProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

function CardFace({ card, isFlipped, onFlip }: CardFaceProps) {
  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: "1200px" }}
      onClick={onFlip}
      role="button"
      aria-label={isFlipped ? "Tunjuk soalan" : "Dedahkan jawapan"}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onFlip()}
    >
      {/* Card container — flips on isFlipped */}
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "220px",
        }}
      >
        {/* Front — Question */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white shadow-lg border border-gray-100 p-6"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Soalan
          </span>
          <p className="text-center text-lg font-medium text-gray-800 leading-snug">
            {card.question}
          </p>
          <span className="mt-4 text-xs text-gray-400">Ketik untuk dedahkan jawapan</span>
        </div>

        {/* Back — Answer */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-indigo-600 shadow-lg p-6"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-200">
            Jawapan
          </span>
          <p className="text-center text-lg font-semibold text-white leading-snug">
            {card.answer}
          </p>
          <span className="mt-4 text-xs text-indigo-300">Ketik untuk balik semula</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function FlashcardStudyPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params?.id as string;

  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!setId) return;
    setLoading(true);
    fetchFlashcardSet(setId)
      .then((data) => {
        setFlashcardSet(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Tidak dapat memuatkan kad imbas. Sila cuba lagi.");
        setLoading(false);
      });
  }, [setId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Memuatkan kad imbas…</p>
        </div>
      </div>
    );
  }

  if (error || !flashcardSet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-4">{error ?? "Set tidak dijumpai."}</p>
          <button
            onClick={() => router.back()}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const cards = flashcardSet.cards;
  const total = cards.length;
  const card = cards[currentIndex];

  function goNext() {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((i) => Math.min(i + 1, total - 1)), 150);
  }

  function goPrev() {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((i) => Math.max(i - 1, 0)), 150);
  }

  function handleFlip() {
    setIsFlipped((f) => !f);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Kembali"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{flashcardSet.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{total} kad</p>
        </div>
        <TopicChip topicId={flashcardSet.topic_id} />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-4 pt-8 pb-24 max-w-md mx-auto w-full">
        {/* Progress bar */}
        <div className="w-full mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Kad {currentIndex + 1} daripada {total}</span>
            <span>{Math.round(((currentIndex + 1) / total) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="w-full mb-8">
          <CardFace card={card} isFlipped={isFlipped} onFlip={handleFlip} />
        </div>

        {/* Dot indicators */}
        <div className="flex gap-1.5 mb-8 flex-wrap justify-center">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(i), 150); }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex ? "bg-indigo-500 w-4" : "bg-gray-300"
              }`}
              aria-label={`Pergi ke kad ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:border-indigo-300 hover:text-indigo-600"
          >
            ← Previous
          </button>

          <button
            onClick={handleFlip}
            className="px-5 py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-sm shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Balik
          </button>

          <button
            onClick={goNext}
            disabled={currentIndex === total - 1}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:border-indigo-300 hover:text-indigo-600"
          >
            Next →
          </button>
        </div>

        {/* Completed state */}
        {currentIndex === total - 1 && (
          <div className="mt-8 w-full rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-semibold text-green-800">Anda telah mengulangkaji semua {total} kad!</p>
            <button
              onClick={() => { setCurrentIndex(0); setIsFlipped(false); }}
              className="mt-3 px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              Mula semula
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

export interface FlashcardReadyCardProps {
  setId: string;
  title: string;
  topicId: string;
  numCards: number;
}

const TOPIC_LABELS: Record<string, string> = {
  ubahan: "Ubahan",
  matriks: "Matriks",
  insurans: "Insurans",
};

export default function FlashcardReadyCard({
  setId,
  title,
  topicId,
  numCards,
}: FlashcardReadyCardProps) {
  const router = useRouter();

  return (
    <div className="fc-ready-card">
      <div className="fc-ready-header">
        <span className="fc-ready-icon">🃏</span>
        <div className="fc-ready-info">
          <p className="fc-ready-title">{title}</p>
          <span className={`fc-ready-chip fc-ready-chip--${topicId}`}>
            {TOPIC_LABELS[topicId] ?? topicId}
          </span>
        </div>
      </div>
      <p className="fc-ready-count">
        {numCards} flashcard{numCards !== 1 ? "s" : ""} ready to study
      </p>
      <button
        onClick={() => router.push(`/flashcards/${setId}`)}
        className="fc-ready-btn"
      >
        Open flashcards →
      </button>
    </div>
  );
}

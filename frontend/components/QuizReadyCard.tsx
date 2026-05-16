"use client";

import { useRouter } from "next/navigation";

type QuizReadyCardProps = {
  quizId: string;
  title: string;
  topicId: string;
  questionCount: number;
  onStart?: () => void;
};

const TOPIC_META: Record<string, { label: string; chip: string }> = {
  ubahan: { label: "Ubahan", chip: "chip chip-brand" },
  matriks: { label: "Matriks", chip: "chip chip-warn" },
  insurans: { label: "Insurans", chip: "chip chip-correct" },
};

export default function QuizReadyCard({
  quizId,
  title,
  topicId,
  questionCount,
  onStart,
}: QuizReadyCardProps) {
  const router = useRouter();
  const meta = TOPIC_META[topicId] ?? { label: topicId, chip: "chip" };

  return (
    <div className="sb-quiz-ready card page-enter">
      <div className="sb-quiz-ready-top">
        <span className={meta.chip}>{meta.label}</span>
        <span className="sb-quiz-ready-count">{questionCount} questions</span>
      </div>
      <h3 className="sb-quiz-ready-title">{title}</h3>
      <p className="sb-quiz-ready-sub">
        Your personalised quiz is ready to go.
      </p>
      <div className="review-ready-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={onStart ?? (() => router.push(`/quiz/${quizId}`))}
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}

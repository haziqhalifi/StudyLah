"use client";

import { Question } from "@/lib/api";
import MathText from "@/components/MathText";

interface Props {
  question: Question;
  questionNumber?: number;
  selectedOptionIndex: number | null;
  onSelectOption?: (index: number) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  correctOptionIndex?: number;
  isReview?: boolean;
}

const LETTERS = ["A", "B", "C", "D"];

const DIFFICULTY_CHIP: Record<string, { label: string; cls: string }> = {
  easy:   { label: "Easy",   cls: "chip chip-correct" },
  medium: { label: "Medium", cls: "chip chip-warn"    },
  hard:   { label: "Hard",   cls: "chip chip-wrong"   },
};

export default function QuestionCard({
  question,
  questionNumber,
  selectedOptionIndex,
  onSelectOption,
  showResult = false,
  isCorrect,
  correctOptionIndex,
  isReview = false,
}: Props) {
  const diff = DIFFICULTY_CHIP[question.difficulty] ?? DIFFICULTY_CHIP.medium;

  function optionClass(idx: number): string {
    const base = "option-card";
    if (!showResult) return base + (idx === selectedOptionIndex ? " selected" : "");
    if (idx === correctOptionIndex) return `${base} correct disabled`;
    if (idx === selectedOptionIndex && !isCorrect) return `${base} wrong disabled`;
    return `${base} dimmed disabled`;
  }

  function letterClass(idx: number): string {
    const base = "option-letter";
    if (!showResult && idx === selectedOptionIndex) return `${base} option-letter-selected`;
    if (showResult && idx === correctOptionIndex)   return `${base} option-letter-correct`;
    if (showResult && idx === selectedOptionIndex)  return `${base} option-letter-wrong`;
    return base;
  }

  const cardClass = [
    "card qcard page-enter",
    showResult && isCorrect  ? "qcard-result-correct" : "",
    showResult && !isCorrect ? "qcard-result-wrong"   : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cardClass}>
      <div className="qcard-header">
        <span className="qcard-label">
          {questionNumber ? `Question ${questionNumber}` : question.topic_id.replace(/_/g, " ")}
          {isReview && <span className="chip chip-brand chip-ml">↺ Review</span>}
        </span>
        <span className={diff.cls}>{diff.label}</span>
      </div>

      <div className="font-display qcard-question">
        <MathText>{question.text}</MathText>
      </div>

      <div className="qcard-options">
        {question.options.map((opt, idx) => (
          <button
            type="button"
            key={idx}
            className={optionClass(idx)}
            onClick={() => !showResult && onSelectOption?.(idx)}
            disabled={showResult}
          >
            <span className={letterClass(idx)}>{LETTERS[idx]}</span>
            <span className="option-text">
              <MathText inline>{opt}</MathText>
            </span>

            {showResult && idx === selectedOptionIndex && (
              <span className="option-check">{isCorrect ? "✓" : "✗"}</span>
            )}
            {showResult && idx === correctOptionIndex && idx !== selectedOptionIndex && (
              <span className="option-check option-check-correct">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

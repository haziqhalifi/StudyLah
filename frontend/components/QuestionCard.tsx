"use client";

import { Question } from "@/lib/api";
import MathText from "@/components/MathText";

interface Props {
  question: Question;
  selectedOptionIndex: number | null;
  onSelectOption?: (index: number) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  correctOptionIndex?: number;
}

const LETTERS = ["A", "B", "C", "D"];

export default function QuestionCard({
  question,
  selectedOptionIndex,
  onSelectOption,
  showResult = false,
  isCorrect,
  correctOptionIndex,
}: Props) {
  function optionClass(idx: number): string {
    const base = "option-card";
    if (!showResult)
      return base + (idx === selectedOptionIndex ? " selected" : "");
    if (idx === correctOptionIndex) return `${base} correct disabled`;
    if (idx === selectedOptionIndex && !isCorrect)
      return `${base} wrong disabled`;
    return `${base} dimmed disabled`;
  }

  function letterClass(idx: number): string {
    const base = "option-letter";
    if (!showResult && idx === selectedOptionIndex)
      return `${base} option-letter-selected`;
    if (showResult && idx === correctOptionIndex)
      return `${base} option-letter-correct`;
    if (showResult && idx === selectedOptionIndex)
      return `${base} option-letter-wrong`;
    return base;
  }

  const cardClass = [
    "card qcard page-enter",
    showResult && isCorrect ? "qcard-result-correct" : "",
    showResult && !isCorrect ? "qcard-result-wrong" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div className="qcard-question">
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
            {showResult &&
              idx === correctOptionIndex &&
              idx !== selectedOptionIndex && (
                <span className="option-check option-check-correct">✓</span>
              )}
          </button>
        ))}
      </div>
    </div>
  );
}

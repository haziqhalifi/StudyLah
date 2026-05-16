"use client";

import { Question } from "@/lib/api";

interface Props {
  question: Question;
  questionNumber?: number;
  selectedOptionIndex: number | null;
  onSelectOption?: (index: number) => void;
  correctOptionIndex?: number;
  showResult?: boolean;
  isCorrect?: boolean;
}

const LETTERS = ["A", "B", "C", "D"];

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy:   { bg: "#dcfce7", text: "#15803d" },
  medium: { bg: "#fef9c3", text: "#854d0e" },
  hard:   { bg: "#fee2e2", text: "#991b1b" },
};

export default function QuestionCard({
  question,
  questionNumber,
  selectedOptionIndex,
  onSelectOption,
  showResult = false,
  isCorrect,
}: Props) {
  const diff = DIFFICULTY_COLORS[question.difficulty] ?? DIFFICULTY_COLORS.medium;

  function optionStyle(idx: number): React.CSSProperties {
    const isSelected = idx === selectedOptionIndex;
    const base: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.85rem 1rem",
      borderRadius: 10,
      border: "2px solid",
      cursor: onSelectOption ? "pointer" : "default",
      transition: "all 0.15s",
      marginBottom: "0.6rem",
      fontSize: "0.95rem",
    };

    if (!showResult) {
      return {
        ...base,
        borderColor: isSelected ? "#6c47ff" : "#e5e5e5",
        background: isSelected ? "#ede9ff" : "white",
        color: isSelected ? "#4c1d95" : "#1a1a2e",
        fontWeight: isSelected ? 600 : 400,
      };
    }

    // After submission
    if (isSelected && isCorrect) {
      return { ...base, borderColor: "#16a34a", background: "#dcfce7", color: "#14532d", fontWeight: 700 };
    }
    if (isSelected && !isCorrect) {
      return { ...base, borderColor: "#dc2626", background: "#fee2e2", color: "#7f1d1d", fontWeight: 700 };
    }
    return { ...base, borderColor: "#e5e5e5", background: "white", color: "#9ca3af" };
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        padding: "1.5rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        border: showResult
          ? `2px solid ${isCorrect ? "#16a34a" : "#dc2626"}`
          : "2px solid transparent",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "flex-start" }}>
        <div style={{ color: "#888", fontSize: "0.8rem", fontWeight: 600 }}>
          {questionNumber ? `Q${questionNumber}` : question.topic_id.replace(/_/g, " ")}
        </div>
        <span
          style={{
            background: diff.bg,
            color: diff.text,
            borderRadius: 6,
            padding: "0.2rem 0.65rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "capitalize",
          }}
        >
          {question.difficulty}
        </span>
      </div>

      {/* Question text */}
      <p
        style={{
          fontWeight: 700,
          fontSize: "1.05rem",
          lineHeight: 1.5,
          marginBottom: "1.25rem",
          color: "#1a1a2e",
        }}
      >
        {question.text}
      </p>

      {/* Options */}
      <div>
        {question.options.map((opt, idx) => (
          <div
            key={idx}
            style={optionStyle(idx)}
            onClick={() => !showResult && onSelectOption?.(idx)}
          >
            <span
              style={{
                minWidth: 28,
                height: 28,
                borderRadius: "50%",
                background: idx === selectedOptionIndex ? "#6c47ff" : "#f3f4f6",
                color: idx === selectedOptionIndex ? "white" : "#6b7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.8rem",
                flexShrink: 0,
              }}
            >
              {LETTERS[idx]}
            </span>
            {opt}
            {showResult && idx === selectedOptionIndex && (
              <span style={{ marginLeft: "auto" }}>{isCorrect ? "✓" : "✗"}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

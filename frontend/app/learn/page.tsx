"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAnswer, Question, SubmitAnswerResponse } from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";

export default function LearnPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    const uid = sessionStorage.getItem("userId");
    const qRaw = sessionStorage.getItem("currentQuestion");
    if (!uid || !qRaw) { router.push("/"); return; }
    setUserId(uid);
    setCurrentQuestion(JSON.parse(qRaw));
  }, [router]);

  async function handleSubmit() {
    if (selectedIndex === null || !currentQuestion || !userId) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(userId, currentQuestion.id, selectedIndex);
      setResult(res);
      setQuestionCount((c) => c + 1);
      if (res.is_correct) setCorrectCount((c) => c + 1);
    } catch {
      alert("Failed to submit answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (!result) return;
    sessionStorage.setItem("currentQuestion", JSON.stringify(result.next_question));
    setCurrentQuestion(result.next_question);
    setSelectedIndex(null);
    setResult(null);
  }

  if (!currentQuestion) {
    return <p style={{ color: "#888" }}>Loading question…</p>;
  }

  const accuracy = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;

  return (
    <div>
      {/* Session stats bar */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "0.75rem 1.25rem",
          display: "flex",
          gap: "2rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          fontSize: "0.85rem",
        }}
      >
        <Stat label="Questions" value={questionCount} />
        <Stat label="Correct" value={correctCount} color="#16a34a" />
        <Stat label="Session accuracy" value={`${accuracy}%`} color={accuracy >= 60 ? "#16a34a" : "#dc2626"} />
        {result?.skill_summary && (
          <Stat
            label="Topic level"
            value={result.skill_summary.level}
            color="#6c47ff"
          />
        )}
      </div>

      {/* Review banner (shown every 5 questions) */}
      {questionCount > 0 && questionCount % 5 === 0 && !result && (
        <div
          style={{
            background: "#ede9ff",
            borderRadius: 12,
            padding: "0.75rem 1.25rem",
            marginBottom: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 600, color: "#6c47ff" }}>
            Time to revisit something you found tricky!
          </span>
          <button
            onClick={() => router.push("/review")}
            style={{
              background: "#6c47ff",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "0.4rem 0.9rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Review →
          </button>
        </div>
      )}

      <QuestionCard
        question={currentQuestion}
        selectedOptionIndex={selectedIndex}
        onSelectOption={result ? undefined : setSelectedIndex}
        correctOptionIndex={result ? currentQuestion.options.indexOf(currentQuestion.options[0]) : undefined}
        showResult={result !== null}
        isCorrect={result?.is_correct}
      />

      {result && (
        <ExplanationBlock explanation={result.explanation} isCorrect={result.is_correct} />
      )}

      {!result ? (
        <button
          onClick={handleSubmit}
          disabled={selectedIndex === null || submitting}
          style={{
            marginTop: "1.25rem",
            width: "100%",
            background: selectedIndex === null || submitting ? "#c4b5fd" : "#6c47ff",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "1rem",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: selectedIndex === null || submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Checking…" : "Submit Answer"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
          <button
            onClick={handleNext}
            style={{
              flex: 1,
              background: "#6c47ff",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "1rem",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Next Question →
          </button>
          <button
            onClick={() => router.push("/assessment")}
            style={{
              background: "white",
              color: "#6c47ff",
              border: "2px solid #6c47ff",
              borderRadius: 12,
              padding: "1rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            My Progress
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div style={{ color: "#888", fontSize: "0.75rem", fontWeight: 500 }}>{label}</div>
      <div style={{ fontWeight: 700, color: color ?? "#1a1a2e" }}>{value}</div>
    </div>
  );
}

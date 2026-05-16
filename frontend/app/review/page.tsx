"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getReview, submitAnswer, ReviewItem, Question, SubmitAnswerResponse } from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";

export default function ReviewPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const uid = sessionStorage.getItem("userId");
    if (!uid) { router.push("/"); return; }
    setUserId(uid);

    getReview(uid)
      .then((res) => setReviewItems(res.review_questions))
      .catch(() => alert("Failed to load review questions."))
      .finally(() => setLoading(false));
  }, [router]);

  const currentItem = reviewItems[currentIndex];
  const isDone = currentIndex >= reviewItems.length;

  async function handleSubmit() {
    if (selectedOption === null || !currentItem || !userId) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(userId, currentItem.question.id, selectedOption);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setResult(null);
  }

  if (loading) return <p style={{ color: "#888" }}>Loading review session…</p>;

  if (isDone) {
    return (
      <div style={{ textAlign: "center", paddingTop: "3rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
        <h2 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Review complete!</h2>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>
          You&apos;ve revisited all your weak spots. Keep it up!
        </p>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem", justifyContent: "center" }}>
          <button
            onClick={() => router.push("/learn")}
            style={{ background: "#6c47ff", color: "white", border: "none", borderRadius: 12, padding: "0.85rem 1.5rem", fontWeight: 700, cursor: "pointer" }}
          >
            Continue Learning →
          </button>
          <button
            onClick={() => router.push("/assessment")}
            style={{ background: "white", color: "#6c47ff", border: "2px solid #6c47ff", borderRadius: 12, padding: "0.85rem 1.5rem", fontWeight: 700, cursor: "pointer" }}
          >
            View Progress
          </button>
        </div>
      </div>
    );
  }

  if (reviewItems.length === 0) {
    return (
      <div style={{ textAlign: "center", paddingTop: "3rem" }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.5rem" }}>Nothing to review yet!</h2>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>
          Keep practising and we&apos;ll surface your weak spots here.
        </p>
        <button
          onClick={() => router.push("/learn")}
          style={{ marginTop: "1.5rem", background: "#6c47ff", color: "white", border: "none", borderRadius: 12, padding: "0.85rem 1.5rem", fontWeight: 700, cursor: "pointer" }}
        >
          Go Learn →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "inline-block",
            background: "#fff3cd",
            color: "#92400e",
            borderRadius: 8,
            padding: "0.3rem 0.85rem",
            fontSize: "0.8rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
          }}
        >
          {currentItem.reason === "low_accuracy" ? "Low accuracy – let's fix this!" : "Not seen recently"}
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
          Spaced Repetition Review ({currentIndex + 1}/{reviewItems.length})
        </h1>
        <p style={{ color: "#666", marginTop: "0.3rem" }}>
          These questions are chosen by the AI engine based on where you need the most practice.
        </p>
      </div>

      <QuestionCard
        question={currentItem.question}
        selectedOptionIndex={selectedOption}
        onSelectOption={result ? undefined : setSelectedOption}
        showResult={result !== null}
        isCorrect={result?.is_correct}
      />

      {result && <ExplanationBlock explanation={result.explanation} isCorrect={result.is_correct} />}

      {!result ? (
        <button
          onClick={handleSubmit}
          disabled={selectedOption === null || submitting}
          style={{
            marginTop: "1.25rem",
            width: "100%",
            background: selectedOption === null ? "#c4b5fd" : "#6c47ff",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "1rem",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: selectedOption === null ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Checking…" : "Submit Answer"}
        </button>
      ) : (
        <button
          onClick={handleNext}
          style={{
            marginTop: "1.25rem",
            width: "100%",
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
          {currentIndex + 1 < reviewItems.length ? "Next Review Question →" : "Finish Review →"}
        </button>
      )}
    </div>
  );
}

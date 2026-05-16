"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getReview,
  submitAnswer,
  generateExplanation,
  ReviewItem,
  SubmitAnswerResponse,
} from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";
import AiBadge from "@/components/AiBadge";
import QuizSheet from "@/components/QuizSheet";

const REASON_LABEL: Record<string, string> = {
  low_accuracy: "Low accuracy — let's fix this",
  not_seen_recently: "Not seen recently",
};

export default function ReviewPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);

  useEffect(() => {
    const uid = sessionStorage.getItem("userId");
    if (!uid) {
      router.push("/");
      return;
    }
    setUserId(uid);

    getReview(uid)
      .then((res) => {
        // Show only 'matematik' subject for now
        const filtered = res.review_questions.filter(
          (it) => (it.question.topic_id || "").toLowerCase() === "matematik",
        );
        setItems(filtered);
      })
      .catch(() => alert("Failed to load review questions."))
      .finally(() => setLoading(false));
  }, [router]);

  const item = items[idx];
  const done = idx >= items.length && !loading;
  const empty = !loading && items.length === 0;

  async function handleSubmit() {
    if (selected === null || !item || !userId) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(userId, item.question.id, selected);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setIdx((i) => i + 1);
    setSelected(null);
    setResult(null);
  }

  async function handleGenerateExplanation() {
    if (!result || !item || !userId || selected === null) return;
    setGeneratingExplanation(true);
    try {
      const explanation = await generateExplanation(userId, item.question.id, selected);
      // Update the result with the generated explanation
      setResult({
        ...result,
        explanation,
      });
    } catch {
      alert("Failed to generate explanation. Please try again.");
    } finally {
      setGeneratingExplanation(false);
    }
  }

  if (loading) return <LoadingShell />;

  if (empty)
    return (
      <div className="review-done page-enter">
        <div className="review-done-emoji">📚</div>
        <h2 className="font-display review-done-title">
          Nothing to review yet!
        </h2>
        <p className="review-done-sub">
          Keep practising and we&apos;ll surface your weak spots here.
        </p>
        <div className="review-done-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push("/learn")}
          >
            Go Learn →
          </button>
        </div>
      </div>
    );

  if (done)
    return (
      <div className="review-done page-enter">
        <div className="review-done-emoji">🎉</div>
        <h2 className="font-display review-done-title">Review complete!</h2>
        <p className="review-done-sub">
          You&apos;ve revisited all your weak spots. Keep it up!
        </p>
        <div className="review-done-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push("/learn")}
          >
            Continue Learning →
          </button>
          <button
            type="button"
            className="btn-ghost diag-skip-btn"
            onClick={() => router.push("/assessment")}
          >
            Progress ▤
          </button>
        </div>
      </div>
    );

  const bar = !result ? (
    <button
      type="button"
      className="btn-primary"
      onClick={handleSubmit}
      disabled={selected === null || submitting}
    >
      {submitting ? "Checking…" : "Submit Answer"}
    </button>
  ) : (
    <button type="button" className="btn-primary" onClick={handleNext}>
      {idx + 1 < items.length ? "Next Review →" : "Finish Review →"}
    </button>
  );

  return (
    <QuizSheet open bar={bar} onClose={() => router.push("/")}>
      <div className="ai-cue ai-cue-review review-banner">
        <div className="review-banner-reason">
          {REASON_LABEL[item.reason] ?? item.reason}
        </div>
        <h1 className="font-display review-banner-title">Review mode</h1>
        <p className="review-banner-sub">AI is focusing on your weak spots.</p>
      </div>

      <div className="review-progress-row">
        <span className="review-progress-label">Spaced repetition</span>
        <span className="review-progress-frac">
          {idx + 1} / {items.length}
        </span>
      </div>
      <div className="progress-track review-progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.round(((idx + 1) / items.length) * 100)}%` }}
        />
      </div>

      <AiBadge
        variant="review"
        label={`Review from: ${REASON_LABEL[item.reason] ?? item.reason}`}
      />

      <div className="diag-questions review-questions-gap">
        <QuestionCard
          question={item.question}
          selectedOptionIndex={selected}
          onSelectOption={result ? undefined : setSelected}
          showResult={result !== null}
          isCorrect={result?.is_correct}
          correctOptionIndex={result ? 0 : undefined}
          isReview
        />
      </div>

      {result && (
        <ExplanationBlock
          explanation={result.explanation}
          isCorrect={result.is_correct}
          onGenerateExplanation={handleGenerateExplanation}
          isGenerating={generatingExplanation}
        />
        />
      )}
    </QuizSheet>
  );
}

function LoadingShell() {
  return (
    <div className="page-enter">
      <div className="card skeleton-card-sm review-banner" />
      <div className="card skeleton-card" />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchQuiz,
  submitAnswer,
  generateExplanation,
  QuizDetail,
  Question,
  Explanation,
} from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";
import QuizSheet from "@/components/QuizSheet";

// ---------------------------------------------------------------------------
// Per-question result state
// ---------------------------------------------------------------------------

interface QuestionResult {
  isCorrect: boolean;
  correctOptionIndex: number;
  explanation: Explanation | null;
}

// ---------------------------------------------------------------------------
// Topic display helpers
// ---------------------------------------------------------------------------

const TOPIC_META: Record<string, { name: string; emoji: string; chip: string }> = {
  ubahan:   { name: "Ubahan",   emoji: "📐", chip: "chip chip-brand"   },
  matriks:  { name: "Matriks",  emoji: "🔢", chip: "chip chip-warn"    },
  insurans: { name: "Insurans", emoji: "🛡️", chip: "chip chip-correct" },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params?.id as string;

  // auth
  const [userId, setUserId] = useState<string | null>(null);

  // quiz data
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // progress through questions
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [generatingExp, setGeneratingExp] = useState(false);

  // summary after last question
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Load quiz on mount ────────────────────────────────────────────
  useEffect(() => {
    const uid = sessionStorage.getItem("userId");
    if (!uid) {
      router.push("/");
      return;
    }
    setUserId(uid);

    if (!quizId) return;

    fetchQuiz(quizId)
      .then((data) => setQuiz(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoadingQuiz(false));
  }, [quizId, router]);

  // ── Derived values ────────────────────────────────────────────────
  const questions: Question[] = quiz?.questions ?? [];
  const currentQ: Question | undefined = questions[idx];
  const topicMeta = TOPIC_META[quiz?.topic_id ?? ""] ?? { name: quiz?.topic_id ?? "", emoji: "📚", chip: "chip" };

  // ── Submit answer ─────────────────────────────────────────────────
  async function handleSubmit() {
    if (selected === null || !currentQ || !userId) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(userId, currentQ.id, selected);
      if (res.is_correct) setScore((s) => s + 1);
      setResult({
        isCorrect: res.is_correct,
        // Backend's submit_answer returns an explanation; derive correct index
        // from the explanation presence. The QuestionCard needs correctOptionIndex
        // but backend doesn't expose it — we show correctness visually only.
        correctOptionIndex: selected, // placeholder; see note below
        explanation: res.explanation ?? null,
      });
    } catch (err) {
      console.error("Submit failed:", err);
      setSubmitError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Generate on-demand explanation ───────────────────────────────
  async function handleGenerateExplanation() {
    if (!result || !currentQ || !userId || selected === null) return;
    setGeneratingExp(true);
    try {
      const exp = await generateExplanation(userId, currentQ.id, selected);
      setResult((prev) => prev ? { ...prev, explanation: exp } : prev);
    } catch {
      // silent
    } finally {
      setGeneratingExp(false);
    }
  }

  // ── Advance to next question ──────────────────────────────────────
  function handleNext() {
    if (idx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
      setResult(null);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────
  if (loadingQuiz) return <LoadingShell />;

  // ── Error state ───────────────────────────────────────────────────
  if (loadError || !quiz) {
    return (
      <div className="review-done page-enter">
        <div className="review-done-emoji">😬</div>
        <p className="review-done-sub" style={{ marginBottom: "1.5rem" }}>
          Couldn&apos;t load this quiz. It may have expired.
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ maxWidth: 240, margin: "0 auto" }}
          onClick={() => router.push("/")}
        >
          Go home
        </button>
      </div>
    );
  }

  // ── Finished state ────────────────────────────────────────────────
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const emoji = pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📖";
    const msg =
      pct >= 70
        ? "Great job! You're getting stronger."
        : pct >= 40
        ? "Good effort! Keep practising to improve."
        : "Let's keep going — every attempt builds knowledge.";

    return (
      <div className="review-done page-enter">
        <div className="review-done-emoji">{emoji}</div>
        <h2 className="font-display review-done-title">Quiz Complete!</h2>
        <p className="review-done-sub" style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0.5rem 0" }}>
          Score: {score} / {questions.length} ({pct}%)
        </p>
        <p className="review-done-sub">{msg}</p>
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
            onClick={() => router.push("/progress")}
          >
            View Progress ▤
          </button>
        </div>
      </div>
    );
  }

  // ── Bottom action bar ─────────────────────────────────────────────
  const bar = !result ? (
    <div>
      <div className="review-bar-row">
        <button
          type="button"
          className="btn-primary"
          onClick={() => { setSubmitError(""); handleSubmit(); }}
          disabled={selected === null || submitting}
        >
          {submitting ? "Checking…" : "Check Answer"}
        </button>
        <button
          type="button"
          className="btn-ghost diag-skip-btn"
          onClick={handleNext}
          disabled={submitting}
        >
          Skip
        </button>
      </div>
      {submitError && (
        <p className="quiz-submit-error">{submitError}</p>
      )}
    </div>
  ) : (
    <button type="button" className="btn-primary" onClick={handleNext}>
      {idx + 1 < questions.length ? "Next Question →" : "See Results →"}
    </button>
  );

  // ── Main quiz UI ──────────────────────────────────────────────────
  return (
    <QuizSheet open bar={bar} onClose={() => router.push("/")}>
      {/* Header */}
      <div className="ai-cue ai-cue-review review-banner">
        <div className="review-banner-reason">
          <span className={topicMeta.chip}>{topicMeta.emoji} {topicMeta.name}</span>
        </div>
        <h1 className="font-display review-banner-title">{quiz.title}</h1>
        <p className="review-banner-sub">Your personalised practice set</p>
      </div>

      {/* Progress bar */}
      <div className="review-progress-row">
        <span className="review-progress-label">Question</span>
        <span className="review-progress-frac">
          {idx + 1} / {questions.length}
        </span>
      </div>
      <div className="progress-track review-progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.round(((idx + 1) / questions.length) * 100)}%` }}
        />
      </div>

      {/* Score tracker */}
      <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.5rem" }}>
        Score: {score} correct
      </div>

      {/* Question card */}
      <div className="diag-questions review-questions-gap">
        <QuestionCard
          question={currentQ}
          questionNumber={idx + 1}
          selectedOptionIndex={selected}
          onSelectOption={result ? undefined : setSelected}
          showResult={result !== null}
          isCorrect={result?.isCorrect}
          correctOptionIndex={result?.correctOptionIndex}
        />
      </div>

      {/* Explanation */}
      {result && (
        <ExplanationBlock
          explanation={result.explanation}
          isCorrect={result.isCorrect}
          onGenerateExplanation={handleGenerateExplanation}
          isGenerating={generatingExp}
        />
      )}
    </QuizSheet>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingShell() {
  return (
    <div className="page-enter">
      <div className="card skeleton-card-sm review-banner" />
      <div className="buddy-bubble-skeleton" />
      <div className="card skeleton-card" />
    </div>
  );
}

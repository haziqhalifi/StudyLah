"use client";

import { useEffect, useMemo, useState } from "react";
import OptionCard from "@/components/OptionCard";
import { QuizDetail, QuizSubmitResult, fetchQuizDetail, submitQuiz } from "@/lib/api";

const TOPIC_META: Record<
  QuizDetail["topicId"],
  { label: string; emoji: string; color: string }
> = {
  ubahan:   { label: "Ubahan",   emoji: "📐", color: "var(--brand)" },
  matriks:  { label: "Matriks",  emoji: "🔢", color: "var(--brand)" },
  insurans: { label: "Insurans", emoji: "🛡️", color: "var(--brand)" },
};

interface QuizDrawerProps {
  quizId: string;
  userId: string;
  onClose: () => void;
}

type Phase = "loading" | "error" | "questions" | "results";

export default function QuizDrawer({ quizId, userId, onClose }: QuizDrawerProps) {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPhase("loading");
    setError(null);
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);

    fetchQuizDetail(quizId)
      .then((data) => {
        setQuiz(data);
        setPhase("questions");
      })
      .catch(() => {
        setError("Couldn't load this quiz. Please try again.");
        setPhase("error");
      });
  }, [quizId]);

  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const topicMeta = quiz ? TOPIC_META[quiz.topicId] : null;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  const scoreMessage = useMemo(() => {
    if (!result) return "";
    if (result.percentage >= 80) return "Amazing! You're getting really strong at this. 🎉";
    if (result.percentage >= 50) return "Good effort! Let's review the ones you missed. 💪";
    return "No worries — let's go through this together. 📘";
  }, [result]);

  async function handleSubmit() {
    if (!quiz || submitting || !allAnswered) return;
    setSubmitting(true);
    try {
      const res = await submitQuiz(
        quiz.quizId,
        userId,
        questions.map((q) => ({ questionId: q.id, selectedOptionIndex: answers[q.id] })),
      );
      setResult(res);
      setPhase("results");
    } catch {
      setError("Couldn't submit your quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setError(null);
    setPhase("questions");
  }

  return (
    <>
      <div className="sb-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="sb-panel" role="dialog" aria-label="Practice Quiz">
        {/* Drag handle */}
        <div className="sb-drag-handle" />

        {/* Header */}
        <div className="sb-header">
          <div className="sb-header-left">
            <span className="sb-avatar">{topicMeta?.emoji ?? "🎯"}</span>
            <div>
              <div className="sb-title">{quiz?.title ?? "Practice Quiz"}</div>
              <div className="sb-subtitle">
                {topicMeta ? `${topicMeta.label} · Personalised` : "Loading…"}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="sb-close"
            onClick={onClose}
            aria-label="Close quiz"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="sb-messages" style={{ padding: "1rem" }}>

          {/* ── Loading ── */}
          {phase === "loading" && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[20px] bg-[var(--brand-light)] animate-pulse"
                  style={{ height: 80 }}
                />
              ))}
              <p className="text-center text-sm text-[var(--muted)] mt-4">
                Building your personalised quiz…
              </p>
            </div>
          )}

          {/* ── Error ── */}
          {phase === "error" && (
            <div className="text-center py-10">
              <p className="text-2xl mb-3">😕</p>
              <p className="text-slate-700 font-medium">{error}</p>
              <button
                type="button"
                className="mt-5 px-6 py-2.5 rounded-2xl bg-[var(--brand)] text-white text-sm font-medium"
                onClick={onClose}
              >
                Back to chat
              </button>
            </div>
          )}

          {/* ── Questions ── */}
          {phase === "questions" && quiz && currentQuestion && topicMeta && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span
                    className="px-2 py-0.5 rounded-full text-white text-xs font-medium"
                    style={{ background: topicMeta.color }}
                  >
                    {topicMeta.label}
                  </span>
                  <span>
                    Q{currentIndex + 1} of {questions.length}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--brand-light)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(4, (answeredCount / questions.length) * 100)}%`,
                      background: topicMeta.color,
                    }}
                  />
                </div>
              </div>

              {/* Question card */}
              <div className="rounded-[20px] bg-white border border-[var(--border)] shadow-sm p-4">
                <p className="text-base font-semibold text-slate-900 leading-7">
                  {currentQuestion.text}
                </p>

                <div className="mt-4 space-y-2">
                  {currentQuestion.options.map((opt, i) => (
                    <OptionCard
                      key={i}
                      text={opt}
                      selected={answers[currentQuestion.id] === i}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: i }))
                      }
                    />
                  ))}
                </div>

                {currentQuestion.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {currentQuestion.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand-light)] text-slate-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Prev / Next */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="h-11 rounded-2xl border border-slate-200 bg-white text-slate-800 text-sm font-medium disabled:opacity-40"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="h-11 rounded-2xl border border-slate-200 bg-white text-slate-800 text-sm font-medium disabled:opacity-40"
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={currentIndex >= questions.length - 1}
                >
                  Next
                </button>
              </div>

              {error && (
                <p className="text-sm text-[var(--wrong)] text-center">{error}</p>
              )}
            </div>
          )}

          {/* ── Results ── */}
          {phase === "results" && result && quiz && topicMeta && (
            <div className="space-y-4 pb-4">
              {/* Score banner */}
              <div className="rounded-[20px] bg-white border border-[var(--border)] shadow-sm p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Your score</p>
                    <p className="text-4xl font-semibold text-slate-900">
                      {result.score} / {result.total}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">{scoreMessage}</p>
                  </div>
                  <div
                    className="rounded-full text-white px-4 py-2 text-sm font-semibold shrink-0"
                    style={{ background: topicMeta.color }}
                  >
                    {result.percentage}%
                  </div>
                </div>
              </div>

              {/* Per-question breakdown */}
              {questions.map((q, idx) => {
                const item = result.results[idx];
                if (!item) return null;
                return (
                  <div
                    key={q.id}
                    className="rounded-[20px] bg-white border border-[var(--border)] shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[var(--muted)] font-medium">Q{idx + 1}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.isCorrect
                            ? "bg-[var(--correct-bg)] text-[var(--correct)]"
                            : "bg-[var(--wrong-bg)] text-[var(--wrong)]"
                        }`}
                      >
                        {item.isCorrect ? "✓ Correct" : "✗ Missed"}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{q.text}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Correct:{" "}
                      <span className="font-semibold text-slate-900">
                        {q.options[item.correctOptionIndex]}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-slate-500 leading-5">
                      {item.explanation.text}
                    </p>
                  </div>
                );
              })}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  className="h-11 rounded-2xl border border-slate-200 bg-white text-slate-800 text-sm font-medium"
                  onClick={handleRetry}
                >
                  Try again
                </button>
                <button
                  type="button"
                  className="h-11 rounded-2xl text-white text-sm font-semibold"
                  style={{ background: topicMeta.color }}
                  onClick={onClose}
                >
                  Back to chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky submit button — only during questions phase */}
        {phase === "questions" && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              className="w-full h-12 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
              style={{ background: topicMeta?.color ?? "var(--brand)" }}
              disabled={!allAnswered || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting…" : `Submit Quiz (${answeredCount}/${questions.length})`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}



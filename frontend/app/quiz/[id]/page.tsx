"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StandardQuizShell from "@/components/StandardQuizShell";
import OptionCard from "@/components/OptionCard";
import {
  QuizDetail,
  QuizSubmitResult,
  fetchQuizDetail,
  submitQuiz,
} from "@/lib/api";

type QuizState = {
  userId: string;
  quiz: QuizDetail | null;
  loading: boolean;
  error: string | null;
  answers: Record<string, number>;
  currentIndex: number;
  submitted: boolean;
  result: QuizSubmitResult | null;
  submitting: boolean;
};

export default function QuizPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const quizId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");

  const [state, setState] = useState<QuizState>({
    userId: "",
    quiz: null,
    loading: true,
    error: null,
    answers: {},
    currentIndex: 0,
    submitted: false,
    result: null,
    submitting: false,
  });

  useEffect(() => {
    const storedUserId = sessionStorage.getItem("userId") ?? "";
    if (!storedUserId) {
      router.push("/");
      return;
    }
    if (!quizId) {
      setState((prev) => ({ ...prev, loading: false, error: "ID kuiz tidak ditemui." }));
      return;
    }
    setState((prev) => ({ ...prev, userId: storedUserId, loading: true, error: null }));
    fetchQuizDetail(quizId)
      .then((quiz) =>
        setState((prev) => ({
          ...prev,
          quiz,
          loading: false,
          currentIndex: 0,
          answers: {},
          submitted: false,
          result: null,
        })),
      )
      .catch(() =>
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Kuiz tidak dapat dimuatkan. Sila cuba lagi.",
        })),
      );
  }, [quizId, router]);

  const questions = state.quiz?.questions ?? [];
  const currentQuestion = questions[state.currentIndex];
  const answeredCount = useMemo(() => Object.keys(state.answers).length, [state.answers]);
  const allAnswered =
    questions.length > 0 && questions.every((q) => state.answers[q.id] !== undefined);

  const scoreMessage = useMemo(() => {
    if (!state.result) return "";
    if (state.result.percentage >= 80) return "Hebat! Anda semakin mahir dalam topik ini.";
    if (state.result.percentage >= 50) return "Usaha yang baik! Mari ulang kaji soalan yang terlepas.";
    return "Tak apa, mari kita semak bersama.";
  }, [state.result]);

  async function handleSubmitQuiz() {
    if (!state.quiz || state.submitting || !allAnswered) return;
    setState((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const result = await submitQuiz(
        state.quiz.quizId,
        state.userId,
        questions.map((q) => ({
          questionId: q.id,
          selectedOptionIndex: state.answers[q.id],
        })),
      );
      setState((prev) => ({ ...prev, submitted: true, result, submitting: false }));
    } catch {
      setState((prev) => ({
        ...prev,
        submitting: false,
        error: "Kuiz tidak dapat dihantar. Sila cuba lagi.",
      }));
    }
  }

  function handleTryAgain() {
    setState((prev) => ({
      ...prev,
      answers: {},
      currentIndex: 0,
      submitted: false,
      result: null,
      error: null,
    }));
  }

  // ── Loading ──
  if (state.loading) {
    return (
      <StandardQuizShell
        title="Memuatkan kuiz…"
        progress={0}
        total={1}
        bar={<div />}
      >
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card qcard animate-pulse">
              <div className="h-4 w-24 bg-slate-100 rounded-full mb-4" />
              <div className="h-6 w-4/5 bg-slate-100 rounded-full mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="h-12 bg-slate-100 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </StandardQuizShell>
    );
  }

  // ── Error (no quiz loaded) ──
  if (state.error && !state.quiz) {
    return (
      <StandardQuizShell
        title="Kuiz"
        progress={0}
        total={1}
        onClose={() => router.push("/")}
        bar={
          <button type="button" className="btn-primary" onClick={() => router.push("/")}>
            Kembali ke Utama
          </button>
        }
      >
        <div className="qs-empty-state">
          <p className="qs-empty-emoji">😕</p>
          <p className="qs-empty-text">{state.error}</p>
        </div>
      </StandardQuizShell>
    );
  }

  if (!state.quiz || !currentQuestion) return null;

  // ── Results ──
  if (state.submitted && state.result) {
    const scoreEmoji =
      state.result.percentage >= 80 ? "🎉" : state.result.percentage >= 50 ? "💪" : "📘";

    return (
      <StandardQuizShell
        title="Keputusan Kuiz"
        subtitle={state.quiz.title}
        progress={questions.length}
        total={questions.length}
        onClose={() => router.push("/")}
        bar={
          <div className="learn-actions">
            <button type="button" className="btn-ghost diag-skip-btn" onClick={handleTryAgain}>
              Cuba Semula
            </button>
            <button type="button" className="btn-primary" onClick={() => router.push("/")}>
              Kembali ke Utama
            </button>
          </div>
        }
      >
        {/* Score banner */}
        <div className="card quiz-result-card">
          <div className="quiz-result-banner">
            <span className="quiz-result-emoji">{scoreEmoji}</span>
            <div>
              <p className="quiz-result-score">
                {state.result.score} / {state.result.total}
              </p>
              <p className="quiz-result-msg">{scoreMessage}</p>
            </div>
            <span className="quiz-result-pct">{state.result.percentage}%</span>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const item = state.result?.results[idx];
            if (!item) return null;
            return (
              <div key={q.id} className="card quiz-review-card">
                <div className="quiz-review-row">
                  <span className="quiz-review-num">S{idx + 1}</span>
                  <span
                    className={`chip ${item.isCorrect ? "chip-correct" : "chip-wrong"}`}
                  >
                    {item.isCorrect ? "✓ Betul" : "✗ Terlepas"}
                  </span>
                </div>
                <p className="quiz-review-text">{q.text}</p>
                <p className="quiz-review-answer">
                  Jawapan betul:{" "}
                  <strong>{q.options[item.correctOptionIndex]}</strong>
                </p>
                <p className="quiz-review-explanation">{item.explanation.text}</p>
              </div>
            );
          })}
        </div>
      </StandardQuizShell>
    );
  }

  // ── Question view ──
  const bar = (
    <button
      type="button"
      className="btn-primary"
      disabled={!allAnswered || state.submitting}
      onClick={handleSubmitQuiz}
    >
      {state.submitting
        ? "Menghantar…"
        : allAnswered
          ? "Hantar Kuiz"
          : `Hantar (${answeredCount}/${questions.length} dijawab)`}
    </button>
  );

  return (
    <StandardQuizShell
      title={state.quiz.title}
      subtitle={`Soalan ${state.currentIndex + 1} / ${questions.length}`}
      progress={answeredCount}
      total={questions.length}
      onClose={() => router.push("/")}
      bar={bar}
    >
      {/* Question card */}
      <div className="card qcard">
        <div className="qcard-header">
          <span className="qcard-label">Soalan {state.currentIndex + 1}</span>
        </div>
        <p className="font-display qcard-question">{currentQuestion.text}</p>
        <div className="qcard-options">
          {currentQuestion.options.map((opt, i) => (
            <OptionCard
              key={i}
              index={i}
              text={opt}
              selected={state.answers[currentQuestion.id] === i}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  answers: { ...prev.answers, [currentQuestion.id]: i },
                }))
              }
            />
          ))}
        </div>
      </div>

      {state.error && <p className="diag-error">{state.error}</p>}

      {/* Prev / Next navigation */}
      <div className="learn-actions quiz-nav-actions">
        <button
          type="button"
          className="btn-ghost diag-skip-btn"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              currentIndex: Math.max(0, prev.currentIndex - 1),
            }))
          }
          disabled={state.currentIndex === 0}
        >
          ← Sebelumnya
        </button>
        <button
          type="button"
          className="btn-ghost diag-skip-btn"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              currentIndex: Math.min(questions.length - 1, prev.currentIndex + 1),
            }))
          }
          disabled={state.currentIndex >= questions.length - 1}
        >
          Seterusnya →
        </button>
      </div>
    </StandardQuizShell>
  );
}

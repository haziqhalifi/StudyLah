"use client";

import { useEffect, useMemo, useState } from "react";
import StandardQuizShell from "@/components/StandardQuizShell";
import OptionCard from "@/components/OptionCard";
import { QuizDetail, QuizSubmitResult, fetchQuizDetail, submitQuiz } from "@/lib/api";

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
        setError("Kuiz tidak dapat dimuatkan. Sila cuba lagi.");
        setPhase("error");
      });
  }, [quizId]);

  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  const scoreMessage = useMemo(() => {
    if (!result) return "";
    if (result.percentage >= 80) return "Hebat! Anda semakin mahir dalam topik ini. 🎉";
    if (result.percentage >= 50) return "Usaha yang baik! Mari ulang kaji soalan yang terlepas. 💪";
    return "Tak apa, mari kita semak bersama. 📘";
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
      setError("Kuiz tidak dapat dihantar. Sila cuba lagi.");
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

  // ── Loading ──
  if (phase === "loading") {
    return (
      <StandardQuizShell
        title="Menyediakan kuiz…"
        progress={0}
        total={1}
        onClose={onClose}
        bar={<div />}
      >
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card qcard animate-pulse">
              <div className="h-5 w-3/4 bg-slate-100 rounded-full mb-4" />
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="h-11 bg-slate-100 rounded-2xl mb-2" />
              ))}
            </div>
          ))}
        </div>
      </StandardQuizShell>
    );
  }

  // ── Error ──
  if (phase === "error") {
    return (
      <StandardQuizShell
        title="Kuiz"
        progress={0}
        total={1}
        onClose={onClose}
        bar={
          <button type="button" className="btn-primary" onClick={onClose}>
            Kembali ke chat
          </button>
        }
      >
        <div className="qs-empty-state">
          <p className="qs-empty-emoji">😕</p>
          <p className="qs-empty-text">{error}</p>
        </div>
      </StandardQuizShell>
    );
  }

  // ── Results ──
  if (phase === "results" && result && quiz) {
    const scoreEmoji =
      result.percentage >= 80 ? "🎉" : result.percentage >= 50 ? "💪" : "📘";

    return (
      <StandardQuizShell
        title="Keputusan Kuiz"
        subtitle={quiz.title}
        progress={questions.length}
        total={questions.length}
        onClose={onClose}
        bar={
          <div className="learn-actions">
            <button type="button" className="btn-ghost diag-skip-btn" onClick={handleRetry}>
              Cuba Semula
            </button>
            <button type="button" className="btn-primary" onClick={onClose}>
              Kembali ke chat
            </button>
          </div>
        }
      >
        <div className="card quiz-result-card">
          <div className="quiz-result-banner">
            <span className="quiz-result-emoji">{scoreEmoji}</span>
            <div>
              <p className="quiz-result-score">
                {result.score} / {result.total}
              </p>
              <p className="quiz-result-msg">{scoreMessage}</p>
            </div>
            <span className="quiz-result-pct">{result.percentage}%</span>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const item = result.results[idx];
            if (!item) return null;
            return (
              <div key={q.id} className="card quiz-review-card">
                <div className="quiz-review-row">
                  <span className="quiz-review-num">S{idx + 1}</span>
                  <span className={`chip ${item.isCorrect ? "chip-correct" : "chip-wrong"}`}>
                    {item.isCorrect ? "✓ Betul" : "✗ Terlepas"}
                  </span>
                </div>
                <p className="quiz-review-text">{q.text}</p>
                <p className="quiz-review-answer">
                  Jawapan betul: <strong>{q.options[item.correctOptionIndex]}</strong>
                </p>
                <p className="quiz-review-explanation">{item.explanation.text}</p>
              </div>
            );
          })}
        </div>
      </StandardQuizShell>
    );
  }

  // ── Questions ──
  if (phase !== "questions" || !quiz || !currentQuestion) return null;

  const bar = (
    <button
      type="button"
      className="btn-primary"
      disabled={!allAnswered || submitting}
      onClick={handleSubmit}
    >
      {submitting
        ? "Menghantar…"
        : allAnswered
          ? "Hantar Kuiz"
          : `Hantar (${answeredCount}/${questions.length} dijawab)`}
    </button>
  );

  return (
    <StandardQuizShell
      title={quiz.title}
      subtitle={`Soalan ${currentIndex + 1} / ${questions.length}`}
      progress={answeredCount}
      total={questions.length}
      onClose={onClose}
      bar={bar}
    >
      <div className="card qcard">
        <div className="qcard-header">
          <span className="qcard-label">Soalan {currentIndex + 1}</span>
        </div>
        <p className="font-display qcard-question">{currentQuestion.text}</p>
        <div className="qcard-options">
          {currentQuestion.options.map((opt, i) => (
            <OptionCard
              key={i}
              index={i}
              text={opt}
              selected={answers[currentQuestion.id] === i}
              onClick={() =>
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: i }))
              }
            />
          ))}
        </div>
      </div>

      {error && <p className="diag-error">{error}</p>}

      <div className="learn-actions quiz-nav-actions">
        <button
          type="button"
          className="btn-ghost diag-skip-btn"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          ← Sebelumnya
        </button>
        <button
          type="button"
          className="btn-ghost diag-skip-btn"
          onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
          disabled={currentIndex >= questions.length - 1}
        >
          Seterusnya →
        </button>
      </div>
    </StandardQuizShell>
  );
}

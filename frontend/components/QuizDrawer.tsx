"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import StandardQuizShell from "@/components/StandardQuizShell";
import QuestionCard from "@/components/QuestionCard";
import { QuizDetail, fetchQuizDetail, submitQuiz } from "@/lib/api";

// Lazy-loaded to avoid circular dep: StudyBuddyChat → QuizDrawer → StudyBuddyPanel → StudyBuddyChat
const StudyBuddyPanel = dynamic(() => import("@/components/StudyBuddyPanel"), { ssr: false });

interface QuizDrawerProps {
  quizId: string;
  userId: string;
  onClose: () => void;
}

type Phase = "loading" | "error" | "questions" | "results";

interface QuestionResult {
  isCorrect: boolean;
  correctOptionIndex: number;
  explanation: string;
}

export default function QuizDrawer({ quizId, userId, onClose }: QuizDrawerProps) {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checking, setChecking] = useState(false);
  const [checkedResult, setCheckedResult] = useState<QuestionResult | null>(null);
  const [allResults, setAllResults] = useState<Record<string, QuestionResult>>({});
  const [showBuddy, setShowBuddy] = useState(false);

  useEffect(() => {
    setPhase("loading");
    setError(null);
    setAnswers({});
    setCurrentIndex(0);
    setCheckedResult(null);
    setAllResults({});
    setShowBuddy(false);

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
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isLast = currentIndex === questions.length - 1;

  async function handleCheck() {
    if (!quiz || checking || currentAnswer === undefined || !currentQuestion) return;
    setChecking(true);
    setError(null);
    try {
      const res = await submitQuiz(quiz.quizId, userId, [
        { questionId: currentQuestion.id, selectedOptionIndex: currentAnswer },
      ]);
      const r = res.results[0];
      const qResult: QuestionResult = {
        isCorrect: r.isCorrect,
        correctOptionIndex: r.correctOptionIndex,
        explanation: r.explanation.text,
      };
      setCheckedResult(qResult);
      setAllResults((prev) => ({ ...prev, [currentQuestion.id]: qResult }));
    } catch {
      setError("Gagal menyemak jawapan. Sila cuba lagi.");
    } finally {
      setChecking(false);
    }
  }

  function handleNext() {
    if (isLast) {
      setPhase("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setCheckedResult(null);
      setShowBuddy(false);
    }
  }

  function handleRetry() {
    setAnswers({});
    setCurrentIndex(0);
    setCheckedResult(null);
    setAllResults({});
    setShowBuddy(false);
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
  if (phase === "results") {
    const total = questions.length;
    const score = Object.values(allResults).filter((r) => r.isCorrect).length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const scoreEmoji = percentage >= 80 ? "🎉" : percentage >= 50 ? "💪" : "📘";
    const scoreMessage =
      percentage >= 80
        ? "Hebat! Anda semakin mahir dalam topik ini."
        : percentage >= 50
          ? "Usaha yang baik! Mari ulang kaji soalan yang terlepas."
          : "Tak apa, mari kita semak bersama.";

    return (
      <StandardQuizShell
        title="Keputusan Kuiz"
        subtitle={quiz?.title}
        progress={total}
        total={total}
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
              <p className="quiz-result-score">{score} / {total}</p>
              <p className="quiz-result-msg">{scoreMessage}</p>
            </div>
            <span className="quiz-result-pct">{percentage}%</span>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const r = allResults[q.id];
            if (!r) return null;
            return (
              <div key={q.id} className="card quiz-review-card">
                <div className="quiz-review-row">
                  <span className="quiz-review-num">S{idx + 1}</span>
                  <span className={`chip ${r.isCorrect ? "chip-correct" : "chip-wrong"}`}>
                    {r.isCorrect ? "✓ Betul" : "✗ Terlepas"}
                  </span>
                </div>
                <p className="quiz-review-text">{q.text}</p>
                <p className="quiz-review-answer">
                  Jawapan betul: <strong>{q.options[r.correctOptionIndex]}</strong>
                </p>
                <p className="quiz-review-explanation">{r.explanation}</p>
              </div>
            );
          })}
        </div>
      </StandardQuizShell>
    );
  }

  // ── Questions ──
  if (!quiz || !currentQuestion) return null;

  const bar = !checkedResult ? (
    <button
      type="button"
      className="btn-primary"
      disabled={currentAnswer === undefined || checking}
      onClick={handleCheck}
    >
      {checking ? "Menyemak…" : "Semak"}
    </button>
  ) : (
    <div className={`qs-feedback-panel ${checkedResult.isCorrect ? "qs-feedback-correct" : "qs-feedback-wrong"}`}>
      <div className="qs-feedback-top">
        <span className="qs-feedback-icon">{checkedResult.isCorrect ? "✓" : "✗"}</span>
        <div className="qs-feedback-text">
          <p className="qs-feedback-title">{checkedResult.isCorrect ? "Betul!" : "Jawapan Salah"}</p>
        </div>
      </div>
      <button type="button" className="qs-feedback-btn" onClick={handleNext}>
        {isLast ? "LIHAT KEPUTUSAN" : "SETERUSNYA"} &rsaquo;
      </button>
    </div>
  );

  return (
    <StandardQuizShell
      title={quiz.title}
      subtitle={`Soalan ${currentIndex + 1} / ${questions.length}`}
      progress={currentIndex + (checkedResult ? 1 : 0)}
      total={questions.length}
      onClose={onClose}
      bar={bar}
    >
      <QuestionCard
        question={{
          id: currentQuestion.id,
          text: currentQuestion.text,
          options: currentQuestion.options,
          difficulty: currentQuestion.difficulty,
          topic_id: quiz.topicId,
          tags: currentQuestion.tags,
        }}
        selectedOptionIndex={currentAnswer ?? null}
        onSelectOption={checkedResult ? undefined : (idx) =>
          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: idx }))
        }
        showResult={checkedResult !== null}
        isCorrect={checkedResult?.isCorrect}
        correctOptionIndex={checkedResult?.correctOptionIndex}
      />

      {error && <p className="diag-error">{error}</p>}

      {checkedResult && showBuddy && (
        <StudyBuddyPanel
          userId={userId}
          questionContext={currentQuestion.text}
          topicId={quiz.topicId}
          onClose={() => setShowBuddy(false)}
        />
      )}

      {checkedResult && !showBuddy && (
        <button
          type="button"
          className="sb-fab"
          onClick={() => setShowBuddy(true)}
          aria-label="Tanya Skorrel"
        >
          <img src="/assets/mascot.webp" alt="Skorrel" className="sb-fab-img" />
        </button>
      )}
    </StandardQuizShell>
  );
}

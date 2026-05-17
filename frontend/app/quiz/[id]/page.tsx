"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StandardQuizShell from "@/components/StandardQuizShell";
import QuestionCard from "@/components/QuestionCard";
import StudyBuddyPanel from "@/components/StudyBuddyPanel";
import {
  QuizDetail,
  QuizSubmitResult,
  fetchQuizDetail,
  submitQuiz,
  submitAnswer,
  type Question,
} from "@/lib/api";
import { playSubmitSound, playCorrectSound, playWrongSound } from "@/lib/sounds";

type QuizState = {
  userId: string;
  quiz: QuizDetail | null;
  loading: boolean;
  error: string | null;
  // Per-question state (learn-page style)
  currentIndex: number;
  selected: number | null;
  checking: boolean;
  checked: boolean;
  isCorrect: boolean | null;
  correctOptionIndex: number;
  // Accumulated answers for final submitQuiz
  answers: Record<string, number>;
  sessionStreak: number;
  xp: number;
  showBuddy: boolean;
  // Final submission
  submitting: boolean;
  submitted: boolean;
  result: QuizSubmitResult | null;
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
    currentIndex: 0,
    selected: null,
    checking: false,
    checked: false,
    isCorrect: null,
    correctOptionIndex: -1,
    answers: {},
    sessionStreak: 0,
    xp: 0,
    showBuddy: false,
    submitting: false,
    submitted: false,
    result: null,
  });

  useEffect(() => {
    const storedUserId = sessionStorage.getItem("userId") ?? "";
    if (!storedUserId) {
      router.push("/");
      return;
    }
    const storedXp = parseInt(sessionStorage.getItem("userXp") ?? "0", 10);
    if (!quizId) {
      setState((prev) => ({ ...prev, loading: false, error: "ID kuiz tidak ditemui." }));
      return;
    }
    setState((prev) => ({
      ...prev,
      userId: storedUserId,
      xp: isNaN(storedXp) ? 0 : storedXp,
      loading: true,
      error: null,
    }));
    fetchQuizDetail(quizId)
      .then((quiz) =>
        setState((prev) => ({
          ...prev,
          quiz,
          loading: false,
          currentIndex: 0,
          selected: null,
          checked: false,
          isCorrect: null,
          correctOptionIndex: -1,
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
  const isFinalQ = state.currentIndex === questions.length - 1;
  const checkedCount = useMemo(() => Object.keys(state.answers).length, [state.answers]);

  const scoreMessage = useMemo(() => {
    if (!state.result) return "";
    if (state.result.percentage >= 80) return "Hebat! Anda semakin mahir dalam topik ini.";
    if (state.result.percentage >= 50) return "Usaha yang baik! Mari ulang kaji soalan yang terlepas.";
    return "Tak apa, mari kita semak bersama.";
  }, [state.result]);

  // ── Check current answer via submitAnswer (gives immediate is_correct feedback) ──
  async function handleCheck() {
    if (state.selected === null || !currentQuestion || state.checking) return;
    playSubmitSound();
    setState((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const res = await submitAnswer(state.userId, currentQuestion.id, state.selected);
      const corrIdx = res.is_correct ? state.selected : -1;
      const xpGain = res.is_correct ? 10 : 5;
      const newXp = state.xp + xpGain;
      sessionStorage.setItem("userXp", String(newXp));
      const newStreak = res.is_correct ? state.sessionStreak + 1 : 0;
      setTimeout(() => {
        if (res.is_correct) playCorrectSound();
        else playWrongSound();
      }, 100);
      setState((prev) => ({
        ...prev,
        checking: false,
        checked: true,
        isCorrect: res.is_correct,
        correctOptionIndex: corrIdx,
        answers: { ...prev.answers, [currentQuestion.id]: state.selected! },
        xp: newXp,
        sessionStreak: newStreak,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        checking: false,
        error: "Semakan gagal. Sila cuba lagi.",
      }));
    }
  }

  function handleNext() {
    setState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      selected: null,
      checked: false,
      isCorrect: null,
      correctOptionIndex: -1,
      showBuddy: false,
      error: null,
    }));
  }

  // ── Final submit: calls submitQuiz for consolidated result + explanations ──
  async function handleFinish() {
    if (!state.quiz || state.submitting) return;
    playSubmitSound();
    setState((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const result = await submitQuiz(
        state.quiz.quizId,
        state.userId,
        questions.map((q) => ({
          questionId: q.id,
          selectedOptionIndex: state.answers[q.id] ?? 0,
        })),
      );
      setState((prev) => ({ ...prev, submitting: false, submitted: true, result }));
      setTimeout(() => {
        if (result.percentage >= 50) playCorrectSound();
        else playWrongSound();
      }, 300);
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
      currentIndex: 0,
      selected: null,
      checked: false,
      isCorrect: null,
      correctOptionIndex: -1,
      answers: {},
      sessionStreak: 0,
      showBuddy: false,
      submitted: false,
      result: null,
      error: null,
    }));
  }

  // ── Loading ──
  if (state.loading) {
    return (
      <StandardQuizShell title="Memuatkan kuiz…" progress={0} total={1} bar={<div />}>
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

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const item = state.result?.results[idx];
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

  // ── Question view ──
  const questionForCard: Question = {
    ...currentQuestion,
    topic_id: state.quiz.topicId ?? "ubahan",
  };

  const bar = !state.checked ? (
    <button
      type="button"
      className="btn-primary"
      onClick={handleCheck}
      disabled={state.selected === null || state.checking}
    >
      {state.checking ? "Menyemak…" : "Semak"}
    </button>
  ) : (
    <div className={`qs-feedback-panel ${state.isCorrect ? "qs-feedback-correct" : "qs-feedback-wrong"}`}>
      <div className="qs-feedback-top">
        <span className="qs-feedback-icon">{state.isCorrect ? "✓" : "✗"}</span>
        <div className="qs-feedback-text">
          <p className="qs-feedback-title">{state.isCorrect ? "Betul!" : "Jawapan Salah"}</p>
        </div>
      </div>
      <button
        type="button"
        className="qs-feedback-btn"
        onClick={isFinalQ ? handleFinish : handleNext}
        disabled={state.submitting}
      >
        {state.submitting ? "Menghantar…" : isFinalQ ? "TAMAT KUIZ" : "SETERUSNYA"} &rsaquo;
      </button>
    </div>
  );

  return (
    <StandardQuizShell
      title={state.quiz.title}
      subtitle={`Soalan ${state.currentIndex + 1} / ${questions.length}`}
      label={state.quiz.topicId?.replace(/_/g, " ")}
      progress={checkedCount}
      total={questions.length}
      streak={state.sessionStreak}
      xp={state.xp}
      onClose={() => router.push("/")}
      bar={bar}
    >
      <QuestionCard
        question={questionForCard}
        selectedOptionIndex={state.selected}
        onSelectOption={
          state.checked ? undefined : (i) => setState((prev) => ({ ...prev, selected: i }))
        }
        showResult={state.checked}
        isCorrect={state.isCorrect ?? undefined}
        correctOptionIndex={state.correctOptionIndex}
      />

      {state.error && <p className="diag-error">{state.error}</p>}

      {/* StudyBuddy: FAB appears after checking; expands into panel */}
      {state.checked && state.showBuddy && (
        <StudyBuddyPanel
          userId={state.userId}
          questionContext={currentQuestion.text}
          topicId={state.quiz.topicId}
          onClose={() => setState((prev) => ({ ...prev, showBuddy: false }))}
        />
      )}
      {state.checked && !state.showBuddy && (
        <button
          type="button"
          className="sb-fab"
          onClick={() => setState((prev) => ({ ...prev, showBuddy: true }))}
          aria-label="Tanya Skorrel"
        >
          <img src="/assets/mascot.webp" alt="Skorrel" className="sb-fab-img" />
        </button>
      )}
    </StandardQuizShell>
  );
}

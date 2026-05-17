"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BuddyHeader from "@/components/BuddyHeader";
import BuddyBubble from "@/components/BuddyBubble";
import OptionCard from "@/components/OptionCard";
import {
  QuizDetail,
  QuizSubmitResult,
  fetchQuizDetail,
  submitQuiz,
} from "@/lib/api";

const TOPIC_META: Record<
  QuizDetail["topicId"],
  { label: string; chip: string; emoji: string }
> = {
  ubahan: { label: "Ubahan", chip: "chip chip-brand", emoji: "📐" },
  matriks: { label: "Matriks", chip: "chip chip-warn", emoji: "🔢" },
  insurans: { label: "Insurans", chip: "chip chip-correct", emoji: "🛡️" },
};

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
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "ID kuiz tidak ditemui.",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      userId: storedUserId,
      loading: true,
      error: null,
    }));

    fetchQuizDetail(quizId)
      .then((quiz) => {
        setState((prev) => ({
          ...prev,
          quiz,
          loading: false,
          currentIndex: 0,
          answers: {},
          submitted: false,
          result: null,
        }));
      })
      .catch(() => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Kuiz tidak dapat dimuatkan. Sila cuba lagi.",
        }));
      });
  }, [quizId, router]);

  const topicMeta = state.quiz ? TOPIC_META[state.quiz.topicId] : null;
  const questions = state.quiz?.questions ?? [];
  const currentQuestion = questions[state.currentIndex];
  const answeredCount = useMemo(
    () => Object.keys(state.answers).length,
    [state.answers],
  );
  const allAnswered =
    questions.length > 0 &&
    questions.every((question) => state.answers[question.id] !== undefined);

  const scoreMessage = useMemo(() => {
    if (!state.result) return "";
    if (state.result.percentage >= 80)
      return "Hebat! Anda semakin mahir dalam topik ini.";
    if (state.result.percentage >= 50)
      return "Usaha yang baik! Mari ulang kaji soalan yang terlepas.";
    return "Tak apa, mari kita semak bersama.";
  }, [state.result]);

  async function handleSubmitQuiz() {
    if (!state.quiz || state.submitting || !allAnswered) return;
    setState((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const result = await submitQuiz(
        state.quiz.quizId,
        state.userId,
        questions.map((question) => ({
          questionId: question.id,
          selectedOptionIndex: state.answers[question.id],
        })),
      );
      setState((prev) => ({
        ...prev,
        submitted: true,
        result,
        submitting: false,
      }));
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

  if (state.loading) {
    return <LoadingState />;
  }

  if (state.error && !state.quiz) {
    return (
      <div className="min-h-screen bg-[var(--surface)] pb-24">
        <BuddyHeader
          title="Masa kuiz"
          subtitle="Mari bina set latihan diperibadikan anda."
        />
        <BuddyBubble emoji="😕">{state.error}</BuddyBubble>
        <div className="max-w-md mx-auto px-4 mt-4">
          <button
            type="button"
            className="w-full h-12 rounded-2xl bg-[var(--brand)] text-white font-medium"
            onClick={() => router.push("/")}
          >
            Kembali ke Utama
          </button>
        </div>
      </div>
    );
  }

  if (!state.quiz || !currentQuestion || !topicMeta) {
    return null;
  }

  if (state.submitted && state.result) {
    return (
      <div className="min-h-screen bg-[var(--surface)] pb-24">
        <BuddyHeader title="Quiz complete" subtitle={state.quiz.title} />
        <BuddyBubble
          emoji={
            state.result.percentage >= 80
              ? "🎉"
              : state.result.percentage >= 50
                ? "💪"
                : "📘"
          }
        >
          {scoreMessage}
        </BuddyBubble>

        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="rounded-[28px] bg-white shadow-sm border border-slate-100 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Markah anda</p>
                <div className="text-4xl font-semibold text-slate-900 mt-1">
                  {state.result.score} / {state.result.total}
                </div>
              </div>
              <div className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-medium">
                {state.result.percentage}%
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 mt-4 space-y-3">
          {questions.map((question, index) => {
            const item = state.result?.results[index];
            if (!item) return null;
            const correctAnswer =
              question.options[item.correctOptionIndex] ?? "";
            return (
              <div
                key={question.id}
                className="rounded-[28px] bg-white shadow-sm border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-medium text-slate-500">
                    Q{index + 1}
                  </div>
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${item.isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                  >
                    {item.isCorrect ? "✓ Betul" : "✗ Terlepas"}
                  </div>
                </div>
                <h3 className="text-base font-medium text-slate-900">
                  {question.text}
                </h3>
                <div className="mt-3 text-sm text-slate-600">
                  Jawapan betul:{" "}
                  <span className="font-semibold text-slate-900">
                    {correctAnswer}
                  </span>
                </div>
                <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                  {item.explanation.style.replaceAll("_", " ")}
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-6">
                  {item.explanation.text}
                </p>
              </div>
            );
          })}
        </div>

        <div className="max-w-md mx-auto px-4 mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="h-12 rounded-2xl border border-slate-200 bg-white text-slate-800 font-medium"
            onClick={handleTryAgain}
          >
            Cuba Semula
          </button>
          <button
            type="button"
            className="h-12 rounded-2xl bg-[var(--brand)] text-white font-medium"
            onClick={() => router.push("/")}
          >
            Kembali ke Utama
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-28">
      <BuddyHeader
        title={state.quiz.title}
        subtitle="Latihan kuiz diperibadikan"
      />

      <BuddyBubble emoji={topicMeta.emoji}>
        <div>
          <div>Kuiz {topicMeta.label} sudah sedia.</div>
          <div className="mt-1">
            Soalan {state.currentIndex + 1} daripada {questions.length}. Jawab semua
            soalan sebelum menghantar.
          </div>
        </div>
      </BuddyBubble>

      <div className="max-w-md mx-auto px-4 mt-4">
        <div className="rounded-[28px] bg-white shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
            <span className={topicMeta.chip}>{topicMeta.label}</span>
            <span>
              Q{state.currentIndex + 1} of {questions.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all"
              style={{
                width: `${Math.max(8, (answeredCount / questions.length) * 100)}%`,
              }}
            />
          </div>

          <div className="mt-5 text-base font-semibold text-slate-900 leading-7">
            {currentQuestion.text}
          </div>

          <div className="mt-4 space-y-2">
            {currentQuestion.options.map((option, optionIndex) => (
              <OptionCard
                key={optionIndex}
                text={option}
                selected={state.answers[currentQuestion.id] === optionIndex}
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    answers: {
                      ...prev.answers,
                      [currentQuestion.id]: optionIndex,
                    },
                  }))
                }
              />
            ))}
          </div>

          {currentQuestion.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {currentQuestion.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {state.error && (
          <p className="mt-3 text-sm text-rose-600">{state.error}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            type="button"
            className="h-12 rounded-2xl border border-slate-200 bg-white text-slate-800 font-medium disabled:opacity-40"
            onClick={() =>
              setState((prev) => ({
                ...prev,
                currentIndex: Math.max(0, prev.currentIndex - 1),
              }))
            }
            disabled={state.currentIndex === 0}
          >
            Sebelumnya
          </button>
          <button
            type="button"
            className="h-12 rounded-2xl border border-slate-200 bg-white text-slate-800 font-medium disabled:opacity-40"
            onClick={() =>
              setState((prev) => ({
                ...prev,
                currentIndex: Math.min(
                  questions.length - 1,
                  prev.currentIndex + 1,
                ),
              }))
            }
            disabled={state.currentIndex >= questions.length - 1}
          >
            Seterusnya
          </button>
        </div>

        <div className="fixed inset-x-0 bottom-4 px-4">
          <div className="max-w-md mx-auto rounded-[24px] bg-white shadow-lg border border-slate-100 p-3 flex gap-3">
            <button
              type="button"
              className="flex-1 h-12 rounded-2xl bg-[var(--brand)] text-white font-semibold disabled:bg-slate-300"
              disabled={!allAnswered || state.submitting}
              onClick={handleSubmitQuiz}
            >
              {state.submitting ? "Menghantar…" : "Hantar Kuiz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <BuddyHeader
        title="Memuatkan kuiz"
        subtitle="Membina set diperibadikan anda…"
      />
      <BuddyBubble>Tunggu sebentar — saya sedang menyediakan soalan anda.</BuddyBubble>
      <div className="max-w-md mx-auto px-4 mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] bg-white shadow-sm border border-slate-100 p-4 animate-pulse"
          >
            <div className="h-4 w-24 bg-slate-100 rounded-full" />
            <div className="mt-4 h-6 w-4/5 bg-slate-100 rounded-full" />
            <div className="mt-4 space-y-2">
              <div className="h-12 bg-slate-100 rounded-2xl" />
              <div className="h-12 bg-slate-100 rounded-2xl" />
              <div className="h-12 bg-slate-100 rounded-2xl" />
              <div className="h-12 bg-slate-100 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  startDiagnostic,
  submitDiagnostic,
  Question,
  DiagnosticAnswer,
} from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import QuizSheet from "@/components/QuizSheet";

type Step = "pick" | "quiz";

const SUBJECTS = ["Matematik"];

export default function DiagnosticPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pick");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [starting, setStarting] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    const userId = sessionStorage.getItem("userId");
    if (!userId) {
      router.push("/");
      return;
    }
    setStarting(true);
    setError("");
    try {
      const res = await startDiagnostic(userId, subject);
      setQuestions(res.questions);
      setStep("quiz");
    } catch {
      setError("Gagal memuatkan soalan untuk mata pelajaran ini.");
    } finally {
      setStarting(false);
    }
  }

  function selectOption(questionId: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }));
  }

  async function handleSubmit() {
    const userId = sessionStorage.getItem("userId");
    if (!userId) return;

    const unanswered = questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      setError(
        `${unanswered.length} soalan belum dijawab. Langkau atau jawab sebelum menghantar.`,
      );
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload: DiagnosticAnswer[] = questions.map((q) => ({
        question_id: q.id,
        selected_option_index: answers[q.id] ?? 0,
      }));
      const result = await submitDiagnostic(userId, payload);
      sessionStorage.setItem(
        "currentQuestion",
        JSON.stringify(result.next_question),
      );
      sessionStorage.setItem(
        "skillProfile",
        JSON.stringify(result.skill_profile),
      );
      router.push("/diagnostic/result");
    } catch {
      setError("Penghantaran gagal. Sila cuba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "pick") {
    return (
      <div className="page-enter">
        <div className="diag-header">
          <h1 className="font-display diag-title">Pilih Mata Pelajaran</h1>
          <p className="diag-sub">Pilih mata pelajaran untuk memulakan diagnostik.</p>
        </div>

        <div className="diag-picker-section">
          <p className="diag-picker-label">Mata Pelajaran</p>
          <div className="diag-subject-grid">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`diag-subject-btn ${subject === s ? "active" : ""}`}
                onClick={() => setSubject(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="diag-error">{error}</p>}

        <div className="sticky-bar">
          <button
            type="button"
            className="btn-primary"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? "Memuatkan soalan…" : "Mula Diagnostik →"}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const answered = Object.keys(answers).length;
  const isLast = current === questions.length - 1;
  const allAnswered = answered === questions.length;

  const bar = isLast ? (
    <button
      type="button"
      className="btn-primary"
      onClick={handleSubmit}
      disabled={submitting}
    >
      {submitting
        ? "Menganalisis jawapan anda…"
        : allAnswered
          ? "Hantar & Mula Belajar →"
          : `Hantar (${answered}/${questions.length} dijawab)`}
    </button>
  ) : (
    <div className="learn-actions">
      <button
        type="button"
        className="btn-ghost diag-skip-btn"
        onClick={() => setCurrent((c) => c + 1)}
      >
        Langkau
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={() => setCurrent((c) => c + 1)}
        disabled={answers[q?.id] === undefined}
      >
        Seterusnya →
      </button>
    </div>
  );

  function handleClose() {
    setStep("pick");
    setQuestions([]);
    setCurrent(0);
    setAnswers({});
    setError("");
  }

  return (
    <QuizSheet
      open={step === "quiz"}
      bar={bar}
      onClose={handleClose}
      title="Diagnostik"
      subtitle={`Soalan ${current + 1} / ${questions.length}`}
      label="Matematik"
      progress={answered}
      total={questions.length}
    >

      {q && (
        <QuestionCard
          key={q.id}
          question={q}
          selectedOptionIndex={answers[q.id] ?? null}
          onSelectOption={(idx) => selectOption(q.id, idx)}
        />
      )}

      {error && <p className="diag-error">{error}</p>}
    </QuizSheet>
  );
}

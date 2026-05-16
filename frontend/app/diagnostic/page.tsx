"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startDiagnostic, submitDiagnostic, Question, DiagnosticAnswer } from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";

export default function DiagnosticPage() {
  const router = useRouter();
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [current, setCurrent]       = useState(0);
  const [answers, setAnswers]       = useState<Record<string, number>>({});
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    if (!userId) { router.push("/"); return; }

    startDiagnostic(userId, "Matematik", 3)
      .then((res) => setQuestions(res.questions))
      .catch(() => setError("Failed to load diagnostic questions."))
      .finally(() => setLoading(false));
  }, [router]);

  function selectOption(questionId: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }));
  }

  function handleNext() {
    if (current < questions.length - 1) setCurrent((c) => c + 1);
  }

  function handleSkip() {
    if (current < questions.length - 1) setCurrent((c) => c + 1);
  }

  async function handleSubmit() {
    const userId = sessionStorage.getItem("userId");
    if (!userId) return;

    const unanswered = questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      setError(`${unanswered.length} question(s) unanswered. Skip them or answer before submitting.`);
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
      sessionStorage.setItem("currentQuestion", JSON.stringify(result.next_question));
      sessionStorage.setItem("skillProfile", JSON.stringify(result.skill_profile));
      router.push("/learn");
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingShell />;

  const q            = questions[current];
  const answered     = Object.keys(answers).length;
  const isLast       = current === questions.length - 1;
  const allAnswered  = answered === questions.length;

  return (
    <div>
      {/* Step dots */}
      <div className="diag-step-indicator">
        {questions.map((_, i) => (
          <button
            type="button"
            key={i}
            className={`diag-step-dot ${i === current ? "active" : answers[questions[i]?.id] !== undefined ? "completed" : ""}`}
            onClick={() => setCurrent(i)}
            aria-label={`Go to question ${i + 1}`}
          />
        ))}
      </div>

      {/* Header */}
      <div className="diag-header page-enter">
        <h1 className="font-display diag-title">Diagnostic</h1>
        <p className="diag-sub">
          Answer to personalise your learning path — just do your best!
        </p>
        <div className="diag-progress-row">
          <span className="diag-progress-label">Question {current + 1} of {questions.length}</span>
          <span className="diag-progress-count">{answered} answered</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ ["--bar-w" as string]: `${Math.round((answered / questions.length) * 100)}%` }}
          />
        </div>
      </div>

      {q && (
        <QuestionCard
          key={q.id}
          question={q}
          questionNumber={current + 1}
          selectedOptionIndex={answers[q.id] ?? null}
          onSelectOption={(idx) => selectOption(q.id, idx)}
        />
      )}

      {error && <p className="diag-error">{error}</p>}

      {/* Actions */}
      <div className="sticky-bar">
        {isLast ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Analysing your answers…" : allAnswered ? "Submit & Start Learning →" : `Submit (${answered}/${questions.length} answered)`}
          </button>
        ) : (
          <div className="learn-actions">
            <button type="button" className="btn-ghost diag-skip-btn" onClick={handleSkip}>
              Skip
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleNext}
              disabled={answers[q?.id] === undefined}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="page-enter">
      <div className="diag-header">
        <div className="skeleton-title" />
        <div className="skeleton-sub" />
      </div>
      <div className="card skeleton-card" />
    </div>
  );
}

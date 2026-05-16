"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPapers,
  startDiagnostic,
  submitDiagnostic,
  Question,
  DiagnosticAnswer,
  Paper,
} from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";

type Step = "pick" | "quiz";

export default function DiagnosticPage() {
  const router = useRouter();
  const [step, setStep]             = useState<Step>("pick");
  const [papers, setPapers]         = useState<Paper[]>([]);
  const [subjects, setSubjects]     = useState<string[]>([]);
  const [subject, setSubject]       = useState<string>("");
  const [paperId, setPaperId]       = useState<number | null>(null);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [starting, setStarting]     = useState(false);

  const [questions, setQuestions]   = useState<Question[]>([]);
  const [current, setCurrent]       = useState(0);
  const [answers, setAnswers]       = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    if (!userId) { router.push("/"); return; }

    getPapers()
      .then((res) => {
        setPapers(res.papers);
        const uniqueSubjects = [...new Set(res.papers.map((p) => p.subject))].sort();
        setSubjects(uniqueSubjects);
      })
      .catch(() => setError("Failed to load papers."))
      .finally(() => setLoadingPapers(false));
  }, [router]);

  const filteredPapers = subject
    ? papers.filter((p) => p.subject === subject)
    : [];

  async function handleStart() {
    if (!paperId) return;
    const userId = sessionStorage.getItem("userId");
    if (!userId) return;
    setStarting(true);
    setError("");
    try {
      const res = await startDiagnostic(userId, subject, paperId);
      setQuestions(res.questions);
      setStep("quiz");
    } catch {
      setError("Failed to load questions for this paper.");
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

  if (loadingPapers) return <LoadingShell />;

  if (step === "pick") {
    return (
      <div className="page-enter">
        <div className="diag-header">
          <h1 className="font-display diag-title">Choose Your Paper</h1>
          <p className="diag-sub">Pick a subject and paper to start your diagnostic.</p>
        </div>

        <div className="diag-picker-section">
          <p className="diag-picker-label">Subject</p>
          <div className="diag-subject-grid">
            {subjects.map((s) => (
              <button
                key={s}
                type="button"
                className={`diag-subject-btn ${subject === s ? "active" : ""}`}
                onClick={() => { setSubject(s); setPaperId(null); }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {subject && (
          <div className="diag-picker-section">
            <p className="diag-picker-label">Paper</p>
            <div className="diag-paper-list">
              {filteredPapers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`diag-paper-btn ${paperId === p.id ? "active" : ""}`}
                  onClick={() => setPaperId(p.id)}
                >
                  <span className="diag-paper-title">
                    {p.state ?? p.paper_type.toUpperCase()} {p.year}
                  </span>
                  <span className="diag-paper-sub">{p.paper_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="diag-error">{error}</p>}

        <div className="sticky-bar">
          <button
            type="button"
            className="btn-primary"
            onClick={handleStart}
            disabled={!paperId || starting}
          >
            {starting ? "Loading questions…" : "Start Diagnostic →"}
          </button>
        </div>
      </div>
    );
  }

  const q           = questions[current];
  const answered    = Object.keys(answers).length;
  const isLast      = current === questions.length - 1;
  const allAnswered = answered === questions.length;

  return (
    <div>
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
            style={{ width: `${Math.round((answered / questions.length) * 100)}%` }}
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
            <button type="button" className="btn-ghost diag-skip-btn" onClick={() => setCurrent((c) => c + 1)}>
              Skip
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCurrent((c) => c + 1)}
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QuestionCard from "@/components/QuestionCard";
import QuizSheet from "@/components/QuizSheet";
import {
  DiagnosticAnswer,
  Paper,
  Question,
  getPapers,
  startDiagnostic,
  submitDiagnostic,
} from "@/lib/api";

type Stage = "pick" | "preview" | "quiz";

function isMathPaper(paper: Paper) {
  const subject = (paper.subject ?? "").trim().toLowerCase();
  return subject === "matematik" || subject === "math";
}

function isTrialPaper(paper: Paper) {
  const blob = `${paper.paper_type ?? ""} ${paper.paper_name ?? ""}`.toLowerCase();
  return blob.includes("trial") || blob.includes("percubaan") || blob.includes("exam") || blob.includes("peperiksaan");
}

export default function ExamsPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("pick");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getPapers()
      .then((res) => {
        if (cancelled) return;
        setPapers(res.papers);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load trial papers from Supabase.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const mathPapers = useMemo(() => papers.filter(isMathPaper), [papers]);
  const trialPapers = useMemo(() => {
    const filtered = mathPapers.filter(isTrialPaper);
    return filtered.length > 0 ? filtered : mathPapers;
  }, [mathPapers]);

  const selectedPaper = useMemo(
    () => trialPapers.find((paper) => paper.id === selectedPaperId) ?? null,
    [trialPapers, selectedPaperId],
  );

  async function handlePreviewPaper() {
    const userId = sessionStorage.getItem("userId");
    if (!userId) {
      router.push("/");
      return;
    }

    if (!selectedPaper) {
      setError("Pick a math trial paper first.");
      return;
    }

    setStarting(true);
    setError("");
    try {
      const res = await startDiagnostic(userId, "matematik", selectedPaper.id);
      setQuestions(res.questions);
      setCurrent(0);
      setAnswers({});
      setStage("preview");
    } catch {
      setError("Could not load this paper. Try another one.");
    } finally {
      setStarting(false);
    }
  }

  function handleBeginExam() {
    setStage("quiz");
  }

  function selectOption(questionId: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }));
  }

  async function handleSubmit() {
    const userId = sessionStorage.getItem("userId");
    if (!userId) return;

    const unanswered = questions.filter((question) => answers[question.id] === undefined);
    if (unanswered.length > 0) {
      setError(`${unanswered.length} question(s) unanswered. Answer them before submitting.`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload: DiagnosticAnswer[] = questions.map((question) => ({
        question_id: question.id,
        selected_option_index: answers[question.id] ?? 0,
      }));
      const result = await submitDiagnostic(userId, payload);
      sessionStorage.setItem("currentQuestion", JSON.stringify(result.next_question));
      sessionStorage.setItem("skillProfile", JSON.stringify(result.skill_profile));
      router.push("/materials");
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClosePreview() {
    setStage("pick");
    setQuestions([]);
    setCurrent(0);
    setAnswers({});
    setError("");
  }

  function handleCloseQuiz() {
    setStage("pick");
    setQuestions([]);
    setCurrent(0);
    setAnswers({});
    setError("");
  }

  if (stage === "pick") {
    return (
      <section className="home-dashboard-shell page-enter" aria-label="Exams hub">
        <header className="student-header">
          <div className="student-header-copy">
            <p className="student-time">Trial Papers</p>
            <h1>Choose a Math Trial Paper</h1>
            <div className="student-meta-row">
              <span>Supabase</span>
              <span aria-hidden="true">•</span>
              <span>{loading ? "Loading" : `${trialPapers.length} papers`}</span>
              <span aria-hidden="true">•</span>
              <span>Math only</span>
            </div>
          </div>

        </header>

        <section className="level-card" aria-label="Pick a paper to begin">
          <div className="level-card-content">
            <p className="level-eyebrow">Paper Picker</p>
            <h2>Start with a trial paper that matches the same adaptive flow.</h2>
            <div className="level-progress-row">
              <div className="level-progress-track" aria-hidden="true">
                <div className="level-progress-fill level-progress-fill-full">
                  <span className="level-progress-dot" />
                </div>
              </div>
              <span>{trialPapers.length} available</span>
            </div>
          </div>
          <div className="level-trophy" aria-hidden="true">
            <span className="learn-hub-chip">SPM</span>
          </div>
        </section>

        <div className="home-learning-stack">
          {trialPapers.map((paper, index) => {
            const active = paper.id === selectedPaperId;
            const tone = index % 3 === 0 ? "lesson" : index % 3 === 1 ? "game" : "path";
            return (
              <button
                key={paper.id}
                type="button"
                className={`learning-feature-card learning-feature-${tone} study-select-card${active ? " study-select-card-active" : ""}`}
                onClick={() => setSelectedPaperId(paper.id)}
              >
                <div>
                  <p className="learning-feature-kicker">Math Trial Paper</p>
                  <h2>{paper.paper_name}</h2>
                  <p>
                    {paper.state ? `${paper.state} • ` : ""}
                    {paper.year} • {paper.paper_type || "Paper"}
                  </p>
                  <p className="study-select-subtitle">
                    Paper ID {paper.id} {active ? "• Selected" : "• Tap to select"}
                  </p>
                </div>

                <div className="feature-visual" aria-hidden="true">
                  <div className="feature-blob feature-blob-large" />
                  <div className="feature-blob feature-blob-small" />
                  <div className="feature-mini-card">Q</div>
                </div>
              </button>
            );
          })}

          {!loading && trialPapers.length === 0 && (
            <div className="ai-assistant-card">
              <div className="ai-assistant-avatar" aria-hidden="true">
                !
              </div>
              <div>
                <h2>No math trial papers found</h2>
                <p>Supabase returned no trial papers for Mathematics.</p>
              </div>
            </div>
          )}

          {error && <p className="diag-error">{error}</p>}

          <button
            type="button"
            className="home-action-primary"
            onClick={handlePreviewPaper}
            disabled={starting || loading || !selectedPaper}
          >
            <span className="home-action-icon home-action-icon-light" aria-hidden="true">
              ▶
            </span>
            <span>
              <span className="home-action-label">
                {starting ? "Loading paper..." : "Preview Questions"}
              </span>
              <span className="home-action-sub">See all questions before starting the exam</span>
            </span>
            <span className="home-action-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    );
  }

  if (stage === "preview") {
    return (
      <section className="home-dashboard-shell page-enter" aria-label="Paper preview">
        <header className="student-header">
          <div className="student-header-copy">
            <p className="student-time">Question Preview</p>
            <h1>{selectedPaper?.paper_name ?? "Math Trial Paper"}</h1>
            <div className="student-meta-row">
              <span>{selectedPaper?.state ?? "SPM"}</span>
              <span aria-hidden="true">•</span>
              <span>{selectedPaper?.year}</span>
              <span aria-hidden="true">•</span>
              <span>{questions.length} questions</span>
            </div>
          </div>
          <div className="student-header-actions">
            <button
              type="button"
              className="btn-ghost preview-back-btn"
              onClick={handleClosePreview}
              aria-label="Back to paper list"
            >
              ← Back
            </button>
          </div>
        </header>

        <section className="level-card" aria-label="Paper summary">
          <div className="level-card-content">
            <p className="level-eyebrow">Paper Overview</p>
            <h2>{questions.length} questions ready — review them before you start.</h2>
            <div className="level-progress-row">
              <div className="level-progress-track" aria-hidden="true">
                <div className="level-progress-fill level-progress-fill-full">
                  <span className="level-progress-dot" />
                </div>
              </div>
              <span>{selectedPaper?.paper_type || "Paper 1"}</span>
            </div>
          </div>
          <div className="level-trophy" aria-hidden="true">
            <span className="learn-hub-chip">Math</span>
          </div>
        </section>

        <div className="home-learning-stack">
          {questions.map((q, index) => (
            <div key={q.id} className="ai-assistant-card preview-q-row">
              <div className="ai-assistant-avatar preview-q-num" aria-hidden="true">
                {index + 1}
              </div>
              <div className="preview-q-body">
                <div className="preview-q-meta">
                  <span className={`preview-difficulty preview-difficulty-${q.difficulty}`}>
                    {q.difficulty}
                  </span>
                  {q.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="preview-tag">{tag}</span>
                  ))}
                </div>
                <p className="preview-q-text">
                  {q.text.length > 120 ? `${q.text.slice(0, 120)}…` : q.text}
                </p>
                <p className="preview-q-options-count">{q.options.length} options</p>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="diag-error">{error}</p>}

        <div className="preview-start-wrap">
          <button
            type="button"
            className="home-action-primary"
            onClick={handleBeginExam}
          >
            <span className="home-action-icon home-action-icon-light" aria-hidden="true">
              ▶
            </span>
            <span>
              <span className="home-action-label">Start Exam</span>
              <span className="home-action-sub">Begin answering all {questions.length} questions</span>
            </span>
            <span className="home-action-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    );
  }

  const question = questions[current];
  const answered = Object.keys(answers).length;
  const isLast = current === questions.length - 1;

  const bar = isLast ? (
    <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
      {submitting ? "Analysing your answers…" : `Submit (${answered}/${questions.length})`}
    </button>
  ) : (
    <div className="learn-actions">
      <button type="button" className="btn-ghost diag-skip-btn" onClick={() => setCurrent((value) => value + 1)}>
        Skip
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={() => setCurrent((value) => value + 1)}
        disabled={question ? answers[question.id] === undefined : true}
      >
        Next →
      </button>
    </div>
  );

  return (
    <QuizSheet open={stage === "quiz"} bar={bar} onClose={handleCloseQuiz}>
      <div className="diag-step-indicator">
        <button
          type="button"
          className="quiz-sheet-back"
          onClick={() => setCurrent((value) => Math.max(0, value - 1))}
          disabled={current === 0}
          aria-label="Previous question"
        >
          ←
        </button>
        {questions.map((_, index) => (
          <button
            type="button"
            key={index}
            className={`diag-step-dot ${index === current ? "active" : answers[questions[index]?.id] !== undefined ? "completed" : ""}`}
            onClick={() => setCurrent(index)}
            aria-label={`Go to question ${index + 1}`}
          />
        ))}
      </div>

      <div className="diag-header page-enter">
        <h1 className="font-display diag-title">Math Trial Paper</h1>
        <p className="diag-sub">
          {selectedPaper ? selectedPaper.paper_name : "Answer the paper to personalise your learning path."}
        </p>
        <div className="diag-progress-row">
          <span className="diag-progress-label">
            Question {current + 1} of {questions.length}
          </span>
          <span className="diag-progress-count">{answered} answered</span>
        </div>
        <p className="material-subtitle">Use the dots above to jump between questions.</p>
      </div>

      {question && (
        <QuestionCard
          key={question.id}
          question={question}
          questionNumber={current + 1}
          selectedOptionIndex={answers[question.id] ?? null}
          onSelectOption={(idx) => selectOption(question.id, idx)}
        />
      )}

      {error && <p className="diag-error">{error}</p>}
    </QuizSheet>
  );
}
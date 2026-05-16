"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  submitAnswer,
  startDiagnostic,
  submitDiagnostic,
  getPapers,
  Question,
  SubmitAnswerResponse,
  Paper,
} from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";
import AiBadge from "@/components/AiBadge";

type View = "topics" | "practice";

const SUBJECT_ICONS: Record<string, string> = {
  Matematik: "∑",
  Fizik: "⚛",
  Sejarah: "📜",
  "Bahasa Melayu": "✍",
  "Bahasa Inggeris": "🗣",
};

export default function LearnPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>("topics");

  // Topic picker state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Practice state
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [prevDiff, setPrevDiff] = useState<string | null>(null);
  const [diffShift, setDiffShift] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const uid = sessionStorage.getItem("userId");
    const qRaw = sessionStorage.getItem("currentQuestion");
    if (!uid) {
      router.push("/");
      return;
    }
    setUserId(uid);

    // If coming from diagnostic, go straight to practice
    if (qRaw) {
      const q = JSON.parse(qRaw) as Question;
      setQuestion(q);
      setPrevDiff(q.difficulty);
      setView("practice");
    }

    getPapers()
      .then((res) => {
        // Limit to only 'matematik' subject for now (case-insensitive)
        const filtered = res.papers.filter(
          (p) => (p.subject || "").toLowerCase() === "matematik",
        );
        setPapers(filtered);
        const unique = [...new Set(filtered.map((p) => p.subject))].sort();
        setSubjects(unique);
      })
      .finally(() => setLoadingPapers(false));
  }, [router]);

  async function handlePickSubject(subj: string) {
    if (!userId) return;
    setStarting(true);
    setStartError("");
    try {
      // Pick the first available paper for this subject
      const subjectPapers = papers.filter((p) => p.subject === subj);
      if (!subjectPapers.length) throw new Error("No papers");
      const paper = subjectPapers[0];

      const diagRes = await startDiagnostic(userId, subj, paper.id);
      const answers = diagRes.questions.map((q) => ({
        question_id: q.id,
        selected_option_index: 0,
      }));
      // Use first question directly — skip full diagnostic, just get a question
      const firstQ = diagRes.questions[0];
      sessionStorage.setItem("currentQuestion", JSON.stringify(firstQ));
      setQuestion(firstQ);
      setPrevDiff(firstQ.difficulty);
      setView("practice");
    } catch {
      setStartError("Could not load questions for this subject. Try another.");
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit() {
    if (selected === null || !question || !userId) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(userId, question.id, selected);
      setResult(res);
      setCount((c) => c + 1);
      if (res.is_correct) setCorrect((c) => c + 1);

      const nextDiff = res.next_question?.difficulty;
      if (prevDiff && nextDiff && nextDiff !== prevDiff) {
        const RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
        setDiffShift(RANK[nextDiff] > RANK[prevDiff] ? "up" : "down");
      } else {
        setDiffShift(null);
      }
    } catch {
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (!result?.next_question) return;
    const next = result.next_question;
    sessionStorage.setItem("currentQuestion", JSON.stringify(next));
    setPrevDiff(next.difficulty);
    setQuestion(next);
    setSelected(null);
    setResult(null);
  }

  if (view === "topics") {
    return (
      <div className="page-enter">
        <div className="diag-header">
          <h1 className="font-display diag-title">
            What do you want to practise?
          </h1>
          <p className="diag-sub">
            Pick a subject to get an adaptive question set.
          </p>
        </div>

        {loadingPapers ? (
          <div className="diag-subject-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card skeleton-topic-card" />
            ))}
          </div>
        ) : (
          <div className="learn-topic-grid">
            {subjects.map((s) => {
              const count = papers.filter((p) => p.subject === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  className="learn-topic-card"
                  onClick={() => handlePickSubject(s)}
                  disabled={starting}
                >
                  <span className="learn-topic-icon">
                    {SUBJECT_ICONS[s] ?? "📚"}
                  </span>
                  <span className="learn-topic-name">{s}</span>
                  <span className="learn-topic-meta">
                    {count} paper{count !== 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {startError && <p className="diag-error">{startError}</p>}

        {question && (
          <div className="sticky-bar">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setView("practice")}
            >
              ← Resume previous session
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!question)
    return <div className="page-enter diag-sub">Loading question…</div>;

  const accuracy = count > 0 ? Math.round((correct / count) * 100) : 0;
  const showReview = count > 0 && count % 5 === 0 && !result;
  const isReview = question.tags?.includes("review") ?? false;

  return (
    <div>
      {/* Back to topics */}
      <button
        type="button"
        className="btn-ghost btn-ghost-sm learn-back-btn"
        onClick={() => {
          setView("topics");
          setResult(null);
          setSelected(null);
        }}
      >
        ← Topics
      </button>

      <div className="learn-stats">
        <div className="learn-stat">
          <div className="learn-stat-label">Done</div>
          <div className="learn-stat-value">{count}</div>
        </div>
        <div className="learn-stat">
          <div className="learn-stat-label">Correct</div>
          <div className="learn-stat-value green">{correct}</div>
        </div>
        <div className="learn-stat">
          <div className="learn-stat-label">Accuracy</div>
          <div
            className={`learn-stat-value ${accuracy >= 60 ? "green" : "red"}`}
          >
            {count > 0 ? `${accuracy}%` : "—"}
          </div>
        </div>
        {result?.skill_summary && (
          <div className="learn-stat">
            <div className="learn-stat-label">Level</div>
            <div className="learn-stat-value brand">
              {result.skill_summary.level}
            </div>
          </div>
        )}
      </div>

      <div className="learn-ai-cues">
        {diffShift && <AiBadge variant={diffShift} />}
        {isReview && <AiBadge variant="review" />}
        {result?.explanation && (
          <AiBadge
            variant="style"
            label={`Explanation: ${result.explanation.style.replace(/_/g, " ")}`}
          />
        )}
      </div>

      {showReview && (
        <div className="learn-review-banner">
          <span className="learn-review-banner-text">
            ↺ Time to revisit something tricky!
          </span>
          <button
            type="button"
            className="btn-primary btn-primary-sm"
            onClick={() => router.push("/review")}
          >
            Review
          </button>
        </div>
      )}

      <QuestionCard
        question={question}
        selectedOptionIndex={selected}
        onSelectOption={result ? undefined : setSelected}
        showResult={result !== null}
        isCorrect={result?.is_correct}
        correctOptionIndex={result ? 0 : undefined}
        isReview={isReview}
      />

      {result && (
        <ExplanationBlock
          explanation={result.explanation}
          isCorrect={result.is_correct}
        />
      )}

      <div className="sticky-bar">
        {!result ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={selected === null || submitting}
          >
            {submitting ? "Checking…" : "Submit Answer"}
          </button>
        ) : (
          <div className="learn-actions">
            <button type="button" className="btn-primary" onClick={handleNext}>
              Next Question →
            </button>
            <button
              type="button"
              className="btn-ghost diag-skip-btn"
              onClick={() => router.push("/assessment")}
            >
              Progress ▤
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

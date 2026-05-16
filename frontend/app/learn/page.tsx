"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  submitAnswer,
  generateExplanation,
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
import QuizSheet from "@/components/QuizSheet";
import StudyBuddyPanel from "@/components/StudyBuddyPanel";

type View = "topics" | "practice";

const MATH_F5_TOPICS = [
  {
    id: "ubahan",
    name: "Ubahan",
    subtitle: "Variation",
    icon: "∝",
    desc: "Direct, inverse, joint & partial variation",
  },
  {
    id: "matriks",
    name: "Matriks",
    subtitle: "Matrices",
    icon: "⊞",
    desc: "Matrix operations & simultaneous equations",
  },
  {
    id: "insurans",
    name: "Insurans",
    subtitle: "Insurance",
    icon: "🛡",
    desc: "Premiums, policies & claims",
  },
];

export default function LearnPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>("topics");

  // Topic picker state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Practice state
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  const [count, setCount] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [prevDiff, setPrevDiff] = useState<string | null>(null);
  const [diffShift, setDiffShift] = useState<"up" | "down" | null>(null);
  const [showBuddy, setShowBuddy] = useState(false);

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

  async function handleGenerateExplanation() {
    if (!result || !question || !userId || selected === null) return;
    setGeneratingExplanation(true);
    try {
      const explanation = await generateExplanation(userId, question.id, selected);
      // Update the result with the generated explanation
      setResult({
        ...result,
        explanation,
      });
    } catch {
      alert("Failed to generate explanation. Please try again.");
    } finally {
      setGeneratingExplanation(false);
    }
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
            {MATH_F5_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className="learn-topic-card"
                onClick={() => handlePickSubject("Matematik")}
                disabled={starting}
              >
                <span className="learn-topic-icon">{topic.icon}</span>
                <span className="learn-topic-name">{topic.name}</span>
                <span className="learn-topic-subtitle">{topic.subtitle}</span>
                <span className="learn-topic-meta">{topic.desc}</span>
              </button>
            ))}
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

  const bar = !result ? (
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
  );

  return (
    <QuizSheet open={view === "practice"} bar={bar} onClose={() => { setView("topics"); setResult(null); setSelected(null); setShowBuddy(false); }}>
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
          <div className={`learn-stat-value ${accuracy >= 60 ? "green" : "red"}`}>
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
          onGenerateExplanation={handleGenerateExplanation}
          isGenerating={generatingExplanation}
        />
      )}

      {/* StudyBuddy chat panel — slides in above the sticky bar */}
      {showBuddy && userId && (
        <StudyBuddyPanel
          userId={userId}
          questionContext={question.text}
          onClose={() => setShowBuddy(false)}
        />
      )}

      {/* Floating StudyBuddy button */}
      <button
        type="button"
        className={`sb-fab ${showBuddy ? "sb-fab-active" : ""}`}
        onClick={() => setShowBuddy((v) => !v)}
        aria-label="Ask StudyBuddy"
      >
        {showBuddy ? "✕" : "🤖"}
      </button>
    </QuizSheet>
  );
}

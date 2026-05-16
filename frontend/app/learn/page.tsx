"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAnswer, Question, SubmitAnswerResponse } from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";
import AiBadge from "@/components/AiBadge";

export default function LearnPage() {
  const router = useRouter();
  const [userId, setUserId]             = useState<string | null>(null);
  const [question, setQuestion]         = useState<Question | null>(null);
  const [selected, setSelected]         = useState<number | null>(null);
  const [result, setResult]             = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [count, setCount]               = useState(0);
  const [correct, setCorrect]           = useState(0);
  const [prevDiff, setPrevDiff]         = useState<string | null>(null);
  const [diffShift, setDiffShift]       = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const uid  = sessionStorage.getItem("userId");
    const qRaw = sessionStorage.getItem("currentQuestion");
    if (!uid || !qRaw) { router.push("/"); return; }
    setUserId(uid);
    const q = JSON.parse(qRaw) as Question;
    setQuestion(q);
    setPrevDiff(q.difficulty);
  }, [router]);

  async function handleSubmit() {
    if (selected === null || !question || !userId) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(userId, question.id, selected);
      setResult(res);
      setCount((c) => c + 1);
      if (res.is_correct) setCorrect((c) => c + 1);

      // Detect AI difficulty change for next question
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

  if (!question) return <div className="page-enter diag-sub">Loading question…</div>;

  const accuracy    = count > 0 ? Math.round((correct / count) * 100) : 0;
  const showReview  = count > 0 && count % 5 === 0 && !result;
  const isReview    = question.tags?.includes("review") ?? false;

  return (
    <div>
      {/* Session stats bar */}
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
          <div className={`learn-stat-value ${accuracy >= 60 ? "green" : "red"}`}>{count > 0 ? `${accuracy}%` : "—"}</div>
        </div>
        {result?.skill_summary && (
          <div className="learn-stat">
            <div className="learn-stat-label">Level</div>
            <div className="learn-stat-value brand">{result.skill_summary.level}</div>
          </div>
        )}
      </div>

      {/* AI cues */}
      <div className="learn-ai-cues">
        {diffShift && <AiBadge variant={diffShift} />}
        {isReview   && <AiBadge variant="review" />}
        {result?.explanation && (
          <AiBadge variant="style" label={`Explanation: ${result.explanation.style.replace(/_/g, " ")}`} />
        )}
      </div>

      {/* Spaced-repetition nudge every 5 questions */}
      {showReview && (
        <div className="learn-review-banner">
          <span className="learn-review-banner-text">↺ Time to revisit something tricky!</span>
          <button type="button" className="btn-primary btn-primary-sm" onClick={() => router.push("/review")}>
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

      {result && <ExplanationBlock explanation={result.explanation} isCorrect={result.is_correct} />}

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
            <button type="button" className="btn-ghost diag-skip-btn" onClick={() => router.push("/assessment")}>
              Progress ▤
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

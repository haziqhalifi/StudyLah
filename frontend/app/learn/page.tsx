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
import StudyBuddyChat from "@/components/StudyBuddyChat";
import type { LearningContext } from "@/lib/types";

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
  const [recentAttempts, setRecentAttempts] = useState<
    Array<{ questionId: string; isCorrect: boolean; topicId: string }>
  >([]);
  // correctOptionIndex is tracked separately because SubmitAnswerResponse
  // doesn't return it; we infer it from the answer when correct, else -1.
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(-1);

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

      // Track attempt for learning context sent to StudyBuddy.
      // correctOptionIndex: if answer was correct we know it; otherwise -1
      // (the API doesn't return it, so StudyBuddy will infer from question text).
      const inferredCorrect = res.is_correct ? selected : -1;
      setCorrectOptionIndex(inferredCorrect);
      setRecentAttempts((prev) => [
        ...prev.slice(-9),
        {
          questionId: question.id,
          isCorrect: res.is_correct,
          topicId: question.topic_id,
        },
      ]);

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
    setCorrectOptionIndex(-1);
  }

  async function handleGenerateExplanation() {
    if (!result || !question || !userId || selected === null) return;
    setGeneratingExplanation(true);
    try {
      const explanation = await generateExplanation(
        userId,
        question.id,
        selected,
      );
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
      <section className="home-dashboard-shell page-enter" aria-label="Learning hub">
        <header className="student-header">
          <div className="student-header-copy">
            <p className="student-time">Adaptive Practice</p>
            <h1>What do you want to practise?</h1>
            <div className="student-meta-row">
              <span>Matematik Tingkatan 5</span>
              <span aria-hidden="true">•</span>
              <span>{MATH_F5_TOPICS.length} topics</span>
              <span aria-hidden="true">•</span>
              <span>{loadingPapers ? "Loading" : `${papers.length} trial papers`}</span>
            </div>
          </div>

        </header>

        <section className="level-card" aria-label="Choose a topic to practise">
          <div className="level-card-content">
            <p className="level-eyebrow">Learning Path</p>
            <h2>Pick a topic and jump into adaptive practice.</h2>
            <div className="level-progress-row">
              <div className="level-progress-track" aria-hidden="true">
                <div className="level-progress-fill level-progress-fill-full">
                  <span className="level-progress-dot" />
                </div>
              </div>
              <span>{MATH_F5_TOPICS.length} available</span>
            </div>
          </div>
          <div className="level-trophy" aria-hidden="true">
            <span className="learn-hub-chip">AI</span>
          </div>
        </section>

        {loadingPapers ? (
          <div className="home-learning-stack">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card skeleton-topic-card" />
            ))}
          </div>
        ) : (
          <div className="home-learning-stack">
            {MATH_F5_TOPICS.map((topic, index) => {
              const tone = index === 0 ? "lesson" : index === 1 ? "game" : "path";
              return (
                <button
                  key={topic.id}
                  type="button"
                  className={`learning-feature-card learning-feature-${tone} study-select-card`}
                  onClick={() => handlePickSubject("Matematik")}
                  disabled={starting}
                >
                  <div>
                    <p className="learning-feature-kicker">Matematik Tingkatan 5</p>
                    <h2>{topic.name}</h2>
                    <p>{topic.desc}</p>
                    <p className="study-select-subtitle">{topic.subtitle}</p>
                  </div>

                  <div className="feature-visual" aria-hidden="true">
                    <div className="feature-blob feature-blob-large" />
                    <div className="feature-blob feature-blob-small" />
                    <div className="feature-mini-card">{topic.icon}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {startError && <p className="diag-error">{startError}</p>}

        {question && (
          <div className="home-actions">
            <button
              type="button"
              className="home-action-primary"
              onClick={() => setView("practice")}
            >
              <span className="home-action-icon home-action-icon-light" aria-hidden="true">
                ↺
              </span>
              <span>
                <span className="home-action-label">Resume previous session</span>
                <span className="home-action-sub">Continue where you left off</span>
              </span>
              <span className="home-action-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </section>
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
    <button type="button" className="btn-primary" onClick={handleNext}>
      Next Question →
    </button>
  );

  return (
    <QuizSheet
      open={view === "practice"}
      bar={bar}
      onClose={() => {
        setView("topics");
        setResult(null);
        setSelected(null);
        setShowBuddy(false);
      }}
    >
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
          onGenerateExplanation={handleGenerateExplanation}
          isGenerating={generatingExplanation}
        />
      )}

      {/* Full-screen drawer — rendered outside QuizSheet scroll area via portal-like placement */}
      {userId && (
        <StudyBuddyChat
          userId={userId}
          isOpen={showBuddy}
          onClose={() => setShowBuddy(false)}
          learningContext={
            {
              topicId: (question.topic_id ??
                "ubahan") as LearningContext["topicId"],
              topicName:
                question.topic_id === "matriks"
                  ? "Matriks (Matrices)"
                  : question.topic_id === "insurans"
                    ? "Insurans (Insurance)"
                    : "Ubahan (Variation)",
              currentQuestion: {
                id: question.id,
                text: question.text,
                options: question.options,
                difficulty: question.difficulty,
              },
              lastAttempt: result
                ? {
                    selectedOptionIndex: selected ?? 0,
                    isCorrect: result.is_correct,
                    correctOptionIndex,
                  }
                : undefined,
              recentAttempts,
              pageContext: "learn",
            } satisfies LearningContext
          }
        />
      )}

      {/* FAB — hidden while drawer is open (drawer has its own close button) */}
      {!showBuddy && (
        <button
          type="button"
          className="sb-fab"
          onClick={() => setShowBuddy(true)}
          aria-label="Ask StudyBuddy"
        >
          🤖
        </button>
      )}
    </QuizSheet>
  );
}

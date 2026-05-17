"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  submitAnswer,
  generateExplanation,
  startDiagnostic,
  submitDiagnostic,
  getPapers,
  getAssessment,
  postStudyBuddyMessage,
  Question,
  SubmitAnswerResponse,
  Paper,
  TopicStats,
  ChatMessage,
} from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";
import AiBadge from "@/components/AiBadge";
import QuizSheet from "@/components/QuizSheet";
import StudyBuddyChat from "@/components/StudyBuddyChat";
import MathText from "@/components/MathText";
import type { LearningContext, QuickAction } from "@/lib/types";
import { getChipsForContext } from "@/lib/quickActions";
import { UBAHAN_STEPS } from "@/app/materials/ubahan/data";
import { MATRIKS_STEPS } from "@/app/materials/matriks/data";
import { INSURANS_STEPS } from "@/app/materials/insurans/data";

type View = "topics" | "practice";

const MATH_F5_TOPICS = [
  {
    id: "ubahan",
    name: "Ubahan",
    subtitle: "Variation",
    icon: "∝",
    desc: "Direct, inverse, joint & partial variation",
    steps: UBAHAN_STEPS,
    completionKey: "ubahan_completed_steps_v1",
  },
  {
    id: "matriks",
    name: "Matriks",
    subtitle: "Matrices",
    icon: "⊞",
    desc: "Matrix operations & simultaneous equations",
    steps: MATRIKS_STEPS,
    completionKey: "matriks_completed_steps_v1",
  },
  {
    id: "insurans",
    name: "Insurans",
    subtitle: "Insurance",
    icon: "🛡",
    desc: "Premiums, policies & claims",
    steps: INSURANS_STEPS,
    completionKey: "insurans_completed_steps_v1",
  },
];

function readCompletedSteps(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export default function LearnPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>("topics");

  // Topic picker state
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [nodeProgress, setNodeProgress] = useState<Record<string, { done: number; total: number }>>({});
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

    getAssessment(uid).catch(() => ({ topics: [] })).then((res) => setTopicStats(res.topics));

    const progress: Record<string, { done: number; total: number }> = {};
    for (const topic of MATH_F5_TOPICS) {
      const completed = readCompletedSteps(topic.completionKey);
      progress[topic.id] = { done: completed.size, total: topic.steps.length };
    }
    setNodeProgress(progress);

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
            {(() => {
              const totalNodes = MATH_F5_TOPICS.reduce((s, t) => s + t.steps.length, 0);
              const doneNodes = Object.values(nodeProgress).reduce((s, v) => s + v.done, 0);
              const pct = totalNodes > 0 ? Math.round((doneNodes / totalNodes) * 100) : 0;
              const hasStarted = doneNodes > 0;
              return (
                <>
                  <h2>{hasStarted ? `${doneNodes} of ${totalNodes} nodes unlocked` : "Start from a chapter and move into the subtopic map."}</h2>
                  <div className="level-progress-row">
                    <div className="level-progress-track" aria-hidden="true">
                      <div className="level-progress-fill" style={{ width: `${pct}%` }}>
                        <span className="level-progress-dot" />
                      </div>
                    </div>
                    <span>{hasStarted ? `${pct}%` : `${MATH_F5_TOPICS.length} available`}</span>
                  </div>
                </>
              );
            })()}
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
              const np = nodeProgress[topic.id] ?? { done: 0, total: topic.steps.length };
              const pct = np.total > 0 ? Math.round((np.done / np.total) * 100) : 0;
              const stat = topicStats.find(t => t.topic_id === topic.id);
              const level = stat?.level ?? null;
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
                    <div className="learn-topic-progress-row">
                      <div className="learn-topic-progress-track">
                        <div className="learn-topic-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="learn-topic-progress-label">
                        {np.done}/{np.total} nodes{level ? ` · ${level}` : ""}
                      </span>
                    </div>
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
      <div className="learn-actions">
        <button
          className="btn-primary"
          onClick={() => router.push("/assessment")}
        >
          View Your Progress
        </button>
      </div>

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

      {/* Inline AI chat bar — always visible below the question */}
      {userId && (
        <InlineChatBar
          userId={userId}
          learningContext={{
            topicId: (question.topic_id ?? "ubahan") as LearningContext["topicId"],
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
          }}
          onOpenFull={() => setShowBuddy(true)}
        />
      )}

      {/* Full-screen drawer */}
      {userId && (
        <StudyBuddyChat
          userId={userId}
          isOpen={showBuddy}
          onClose={() => setShowBuddy(false)}
          learningContext={{
            topicId: (question.topic_id ?? "ubahan") as LearningContext["topicId"],
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
          }}
        />
      )}
    </QuizSheet>
  );
}

// ---------------------------------------------------------------------------
// InlineChatBar — embedded AI chat panel shown inside the quiz view
// ---------------------------------------------------------------------------

interface InlineChatBarProps {
  userId: string;
  learningContext: LearningContext;
  onOpenFull: () => void;
}

function InlineChatBar({ userId, learningContext, onOpenFull }: InlineChatBarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chips = getChipsForContext(learningContext);

  useEffect(() => {
    // Reset conversation when question changes
    setMessages([]);
    setInput("");
  }, [learningContext.currentQuestion?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const history: ChatMessage[] = [...messages, userMsg];
    setMessages(history);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);
    try {
      const res = await postStudyBuddyMessage(userId, history, learningContext);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Maaf, ada ralat. Cuba lagi." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleChip(action: QuickAction) {
    send(action.message);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  return (
    <div className="icb-wrap">
      {/* Header */}
      <div className="icb-header">
        <span className="icb-avatar" aria-hidden="true">🤖</span>
        <span className="icb-title">Tanya AI</span>
        <button
          type="button"
          className="icb-expand-btn"
          onClick={onOpenFull}
          aria-label="Buka chat penuh"
        >
          Buka penuh ↗
        </button>
      </div>

      {/* Message thread — only shown once there are messages */}
      {messages.length > 0 && (
        <div className="icb-messages">
          {messages.map((m, i) => (
            <div key={i} className={`icb-bubble icb-bubble--${m.role}`}>
              {m.role === "assistant"
                ? <MathText className="icb-md">{m.content}</MathText>
                : <span>{m.content}</span>
              }
            </div>
          ))}
          {loading && (
            <div className="icb-bubble icb-bubble--assistant">
              <span className="sb-typing"><span /><span /><span /></span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Chips */}
      <div className="icb-chips">
        {chips.map((chip) => (
          <button
            key={chip.actionType + chip.label}
            type="button"
            className="icb-chip"
            onClick={() => handleChip(chip)}
            disabled={loading}
          >
            <span aria-hidden="true">{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="icb-input-wrap">
        <textarea
          ref={inputRef}
          className="icb-input"
          rows={1}
          placeholder="Tanya soalan kamu di sini…"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          className="icb-send"
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          aria-label="Hantar"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

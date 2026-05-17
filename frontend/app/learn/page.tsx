"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  submitAnswer,
  generateExplanation,
  startDiagnostic,
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
import QuizSheet from "@/components/QuizSheet";
import StudyBuddyChat from "@/components/StudyBuddyChat";
import MathText from "@/components/MathText";
import type { LearningContext, QuickAction } from "@/lib/types";
import { getChipsForContext } from "@/lib/quickActions";
import { UBAHAN_STEPS, UBAHAN_SUBTOPICS } from "@/app/materials/ubahan/data";
import { MATRIKS_STEPS, MATRIKS_SUBTOPICS } from "@/app/materials/matriks/data";
import { INSURANS_STEPS, INSURANS_SUBTOPICS } from "@/app/materials/insurans/data";

type View = "topics" | "subtopics" | "practice";

interface SubtopicOption {
  id: string;
  title: string;
}

const MATH_F5_TOPICS = [
  {
    id: "ubahan",
    bab: "Bab 1",
    name: "Ubahan",
    icon: "∝",
    desc: "Ubahan langsung, songsang, bergabung & separa",
    difficulty: "Mudah",
    estimatedTime: "~20 min",
    steps: UBAHAN_STEPS,
    subtopics: UBAHAN_SUBTOPICS as SubtopicOption[],
    completionKey: "ubahan_completed_steps_v1",
    tone: "lesson" as const,
  },
  {
    id: "matriks",
    bab: "Bab 2",
    name: "Matriks",
    icon: "⊞",
    desc: "Operasi matriks & persamaan serentak",
    difficulty: "Sederhana",
    estimatedTime: "~30 min",
    steps: MATRIKS_STEPS,
    subtopics: MATRIKS_SUBTOPICS as SubtopicOption[],
    completionKey: "matriks_completed_steps_v1",
    tone: "game" as const,
  },
  {
    id: "insurans",
    bab: "Bab 3",
    name: "Matematik Pengguna: Insurans",
    icon: "🛡",
    desc: "Premium, polisi & tuntutan pampasan",
    difficulty: "Mudah",
    estimatedTime: "~25 min",
    steps: INSURANS_STEPS,
    subtopics: INSURANS_SUBTOPICS as SubtopicOption[],
    completionKey: "insurans_completed_steps_v1",
    tone: "path" as const,
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

  // Picker state
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [nodeProgress, setNodeProgress] = useState<Record<string, { done: number; total: number }>>({});
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Which topic the user drilled into
  const [activeTopic, setActiveTopic] = useState<typeof MATH_F5_TOPICS[number] | null>(null);
  // Which subtopic was selected (null = "all")
  const [activeSubtopicId, setActiveSubtopicId] = useState<string | null>(null);

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
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(-1);

  // XP & streak state
  const [xp, setXp] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0); // consecutive correct in this session
  const [dailyStreak, setDailyStreak] = useState(0);     // days in a row with activity
  const [xpToast, setXpToast] = useState<{ gain: number; label: string } | null>(null);
  const xpToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const uid = sessionStorage.getItem("userId");
    const qRaw = sessionStorage.getItem("currentQuestion");
    if (!uid) {
      router.push("/");
      return;
    }
    setUserId(uid);

    // Load persisted XP
    const storedXp = parseInt(sessionStorage.getItem("userXp") ?? "0", 10);
    setXp(isNaN(storedXp) ? 0 : storedXp);

    // Load & validate daily streak from localStorage
    const today = new Date().toISOString().slice(0, 10);
    const lastActiveDay = localStorage.getItem("lastActiveDay");
    const storedStreak = parseInt(localStorage.getItem("dailyStreak") ?? "0", 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastActiveDay === today) {
      setDailyStreak(isNaN(storedStreak) ? 1 : storedStreak);
    } else if (lastActiveDay === yesterday) {
      setDailyStreak(isNaN(storedStreak) ? 1 : storedStreak);
    } else {
      // streak broken — reset
      setDailyStreak(0);
    }

    if (qRaw) {
      const q = JSON.parse(qRaw) as Question;
      setQuestion(q);
      setPrevDiff(q.difficulty);
      // Don't auto-open quiz — user sees chapter list first,
      // then can resume via the "Sambung sesi" banner.
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
        const filtered = res.papers.filter(
          (p) => (p.subject || "").toLowerCase() === "matematik",
        );
        setPapers(filtered);
      })
      .finally(() => setLoadingPapers(false));
  }, [router]);

  async function handleStartPractice(topicId: string) {
    if (!userId) return;
    setStarting(true);
    setStartError("");
    try {
      const subjectPapers = papers.filter((p) => p.subject === "Matematik");
      if (!subjectPapers.length) throw new Error("No papers");
      const paper = subjectPapers[0];

      const diagRes = await startDiagnostic(userId, topicId, paper.id);
      const firstQ = diagRes.questions[0];
      sessionStorage.setItem("currentQuestion", JSON.stringify(firstQ));
      setQuestion(firstQ);
      setPrevDiff(firstQ.difficulty);
      // Reset session stats for a fresh session
      setCount(0);
      setCorrect(0);
      setSelected(null);
      setResult(null);
      setDiffShift(null);
      setRecentAttempts([]);
      setCorrectOptionIndex(-1);
      setSessionStreak(0);
      setView("practice");
    } catch {
      setStartError("Tidak dapat memuatkan soalan. Cuba lagi.");
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

      const inferredCorrect = res.is_correct ? selected : -1;
      setCorrectOptionIndex(inferredCorrect);
      setRecentAttempts((prev) => [
        ...prev.slice(-9),
        { questionId: question.id, isCorrect: res.is_correct, topicId: question.topic_id },
      ]);

      const nextDiff = res.next_question?.difficulty;
      if (prevDiff && nextDiff && nextDiff !== prevDiff) {
        const RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
        setDiffShift(RANK[nextDiff] > RANK[prevDiff] ? "up" : "down");
      } else {
        setDiffShift(null);
      }

      // ── XP & streak ────────────────────────────────────────────────
      const xpGain = res.is_correct ? 10 : 5;

      setXp((prev) => {
        const next = prev + xpGain;
        sessionStorage.setItem("userXp", String(next));
        return next;
      });

      const newSessionStreak = res.is_correct ? sessionStreak + 1 : 0;
      setSessionStreak(newSessionStreak);

      // Update daily streak — mark today active
      const today = new Date().toISOString().slice(0, 10);
      const lastActiveDay = localStorage.getItem("lastActiveDay");
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastActiveDay !== today) {
        const newDailyStreak = lastActiveDay === yesterday ? dailyStreak + 1 : 1;
        setDailyStreak(newDailyStreak);
        localStorage.setItem("dailyStreak", String(newDailyStreak));
        localStorage.setItem("lastActiveDay", today);
        sessionStorage.setItem("streak", String(newDailyStreak));
      }

      // Show XP toast
      const toastLabel = res.is_correct && newSessionStreak >= 3
        ? `+${xpGain} XP · ${newSessionStreak} berturut-turut!`
        : `+${xpGain} XP`;
      if (xpToastTimer.current) clearTimeout(xpToastTimer.current);
      setXpToast({ gain: xpGain, label: toastLabel });
      xpToastTimer.current = setTimeout(() => setXpToast(null), 2000);
    } catch {
      alert("Penghantaran gagal. Sila cuba lagi.");
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
      const explanation = await generateExplanation(userId, question.id, selected);
      setResult({ ...result, explanation });
    } catch {
      alert("Gagal menjana penerangan. Sila cuba lagi.");
    } finally {
      setGeneratingExplanation(false);
    }
  }

  // ── VIEW: Chapter picker ────────────────────────────────────────────
  if (view === "topics") {
    return (
      <section className="home-dashboard-shell page-enter" aria-label="Latih — pilih bab">
        <header className="student-header">
          <div className="student-header-copy">
            <p className="student-time">Latihan Adaptif</p>
            <h1>Pilih Bab</h1>
            <div className="student-meta-row">
              <span>Matematik Tingkatan 5</span>
              <span aria-hidden="true">•</span>
              <span>{MATH_F5_TOPICS.length} bab</span>
            </div>
          </div>
        </header>

        {/* Chapter list */}
        <div className="lp-chapter-list">
          {MATH_F5_TOPICS.map((topic) => {
            const np = nodeProgress[topic.id] ?? { done: 0, total: topic.steps.length };
            const pct = np.total > 0 ? Math.round((np.done / np.total) * 100) : 0;
            return (
              <button
                key={topic.id}
                type="button"
                className={`lp-chapter-card lp-chapter-${topic.tone}`}
                onClick={() => { setActiveTopic(topic); setView("subtopics"); }}
              >
                <div className="lp-chapter-left">
                  <p className="lp-chapter-bab">{topic.bab}</p>
                  <h2 className="lp-chapter-name">{topic.name}</h2>
                  <p className="lp-chapter-desc">{topic.desc}</p>
                  <div className="lp-chapter-tags">
                    <span className="lp-tag">{topic.difficulty}</span>
                    <span className="lp-tag">{topic.estimatedTime}</span>
                    <span className="lp-tag">{topic.subtopics.length} subtopik</span>
                  </div>
                  <div className="lp-chapter-progress-row">
                    <div className="lp-chapter-track">
                      <div className="lp-chapter-fill" style={{ "--pct": `${pct}%` } as React.CSSProperties} />
                    </div>
                    {pct === 0
                      ? <span className="lp-chapter-cta">Mula →</span>
                      : <span className="lp-chapter-pct">{pct}%</span>
                    }
                  </div>
                </div>
                <div className="lp-chapter-icon" aria-hidden="true">
                  {topic.icon}
                </div>
              </button>
            );
          })}
        </div>

        {startError && <p className="diag-error">{startError}</p>}

        {question && (
          <div className="home-actions">
            <button
              type="button"
              className="home-action-primary"
              onClick={() => setView("practice")}
            >
              <span className="home-action-icon home-action-icon-light" aria-hidden="true">↺</span>
              <span>
                <span className="home-action-label">Sambung sesi sebelumnya</span>
                <span className="home-action-sub">Teruskan dari tempat anda berhenti</span>
              </span>
              <span className="home-action-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </section>
    );
  }

  // ── VIEW: Subtopic picker ───────────────────────────────────────────
  if (view === "subtopics" && activeTopic) {
    return (
      <section className="home-dashboard-shell page-enter" aria-label="Pilih subtopik">
        <header className="student-header">
          <div className="student-header-copy">
            <button
              type="button"
              className="learn-back-btn"
              onClick={() => setView("topics")}
            >
              ← Kembali
            </button>
            <p className="student-time">{activeTopic.bab}</p>
            <h1>{activeTopic.name}</h1>
            <div className="student-meta-row">
              <span>{activeTopic.subtopics.length} subtopik</span>
              <span aria-hidden="true">•</span>
              <span>{activeTopic.difficulty}</span>
              <span aria-hidden="true">•</span>
              <span>{activeTopic.estimatedTime}</span>
            </div>
          </div>
        </header>

        {/* Practice all subtopics */}
        <button
          type="button"
          className="lp-all-card"
          onClick={() => { setActiveSubtopicId(null); handleStartPractice(activeTopic.id); }}
          disabled={starting}
        >
          <span className="lp-all-icon" aria-hidden="true">⚡</span>
          <div className="lp-all-body">
            <p className="lp-all-title">Semua Subtopik</p>
            <p className="lp-all-sub">AI pilih soalan dari semua bahagian {activeTopic.name}</p>
          </div>
          <span className="lp-arrow" aria-hidden="true">→</span>
        </button>

        <p className="lp-section-label">Atau pilih subtopik tertentu</p>

        {/* Individual subtopics */}
        <div className="lp-subtopic-list">
          {activeTopic.subtopics.map((sub, idx) => (
            <button
              key={sub.id}
              type="button"
              className="lp-subtopic-row"
              onClick={() => { setActiveSubtopicId(sub.id); handleStartPractice(activeTopic.id); }}
              disabled={starting}
            >
              <span className="lp-subtopic-num" aria-hidden="true">{idx + 1}</span>
              <div className="lp-subtopic-body">
                <p className="lp-subtopic-title">{sub.title}</p>
                <p className="lp-subtopic-id">{sub.id}</p>
              </div>
              <span className="lp-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>

        {startError && <p className="diag-error">{startError}</p>}
        {starting && <p className="diag-sub">Memuatkan soalan…</p>}
      </section>
    );
  }

  // ── VIEW: Practice ──────────────────────────────────────────────────
  if (!question)
    return <div className="page-enter diag-sub">Memuatkan soalan…</div>;

  const accuracy = count > 0 ? Math.round((correct / count) * 100) : 0;
  const diff = question.difficulty ?? "easy";
  const diffLabel: Record<string, string> = { easy: "Mudah", medium: "Sederhana", hard: "Sukar" };
  const diffClass: Record<string, string> = { easy: "learn-diff-easy", medium: "learn-diff-medium", hard: "learn-diff-hard" };
  const topicLabel =
    question.topic_id === "matriks" ? "Matriks" :
    question.topic_id === "insurans" ? "Insurans" : "Ubahan";

  // Show selected subtopic name if one was picked
  const activeSubtopicTitle = activeSubtopicId
    ? activeTopic?.subtopics.find(s => s.id === activeSubtopicId)?.title ?? null
    : null;

  const topicDisplayName =
    question.topic_id === "matriks" ? "Matriks (Matrices)" :
    question.topic_id === "insurans" ? "Insurans (Insurance)" : "Ubahan (Variation)";

  const bar = !result ? (
    <button
      type="button"
      className="btn-primary"
      onClick={handleSubmit}
      disabled={selected === null || submitting}
    >
      {submitting ? "Menyemak…" : "Hantar Jawapan"}
    </button>
  ) : (
    <button type="button" className="btn-primary" onClick={handleNext}>
      Soalan Seterusnya →
    </button>
  );

  return (
    <QuizSheet
      open={view === "practice"}
      bar={bar}
      onClose={() => {
        setView("subtopics");
        setResult(null);
        setSelected(null);
        setShowBuddy(false);
      }}
    >
      {/* ── XP toast ── */}
      {xpToast && (
        <div className="xp-toast" aria-live="polite">
          {xpToast.label}
        </div>
      )}

      {/* ── Session stats strip ── */}
      <div className="learn-stats">
        <div className="learn-stat">
          <div className="learn-stat-label">Selesai</div>
          <div className="learn-stat-value">{count}</div>
        </div>
        <div className="learn-stat">
          <div className="learn-stat-label">Betul</div>
          <div className="learn-stat-value green">{correct}</div>
        </div>
        <div className="learn-stat">
          <div className="learn-stat-label">Ketepatan</div>
          <div className={`learn-stat-value ${count === 0 ? "" : accuracy >= 60 ? "green" : "red"}`}>
            {count > 0 ? `${accuracy}%` : "—"}
          </div>
        </div>
        <div className="learn-stat">
          <div className="learn-stat-label">XP</div>
          <div className="learn-stat-value brand">{xp}</div>
        </div>
        {sessionStreak >= 2 && (
          <div className="learn-stat">
            <div className="learn-stat-label">Rentetan</div>
            <div className="learn-stat-value streak">{sessionStreak} 🔥</div>
          </div>
        )}
        {result?.skill_summary && (
          <div className="learn-stat">
            <div className="learn-stat-label">Tahap</div>
            <div className="learn-stat-value brand">{result.skill_summary.level}</div>
          </div>
        )}
      </div>

      {/* ── Question context row ── */}
      <div className="learn-meta-row">
        <span className="learn-meta-topic">
          {activeSubtopicTitle ?? topicLabel}
        </span>
        <span className="learn-meta-sep" aria-hidden="true">·</span>
        <span className={`learn-meta-diff ${diffClass[diff] ?? diffClass.easy}`}>
          {diffLabel[diff] ?? diff}
        </span>
        {diffShift && (
          <span className="learn-meta-shift">
            {diffShift === "up" ? "↑ Naik tahap" : "↓ Turun tahap"}
          </span>
        )}
      </div>

      {/* ── Question card ── */}
      <QuestionCard
        question={question}
        selectedOptionIndex={selected}
        onSelectOption={result ? undefined : setSelected}
        showResult={result !== null}
        isCorrect={result?.is_correct}
        correctOptionIndex={result ? 0 : undefined}
        isReview={false}
      />

      {/* ── Explanation shown after answering ── */}
      {result && (
        <ExplanationBlock
          explanation={result.explanation}
          isCorrect={result.is_correct}
          onGenerateExplanation={handleGenerateExplanation}
          isGenerating={generatingExplanation}
        />
      )}

      {/* ── Inline AI chat ── */}
      {userId && (
        <InlineChatBar
          userId={userId}
          learningContext={{
            topicId: (question.topic_id ?? "ubahan") as LearningContext["topicId"],
            topicName: topicDisplayName,
            currentQuestion: {
              id: question.id,
              text: question.text,
              options: question.options,
              difficulty: question.difficulty,
            },
            lastAttempt: result
              ? { selectedOptionIndex: selected ?? 0, isCorrect: result.is_correct, correctOptionIndex }
              : undefined,
            recentAttempts,
            pageContext: "learn",
          }}
          onOpenFull={() => setShowBuddy(true)}
        />
      )}

      {/* ── Full-screen StudyBuddy drawer ── */}
      {userId && (
        <StudyBuddyChat
          userId={userId}
          isOpen={showBuddy}
          onClose={() => setShowBuddy(false)}
          learningContext={{
            topicId: (question.topic_id ?? "ubahan") as LearningContext["topicId"],
            topicName: topicDisplayName,
            currentQuestion: {
              id: question.id,
              text: question.text,
              options: question.options,
              difficulty: question.difficulty,
            },
            lastAttempt: result
              ? { selectedOptionIndex: selected ?? 0, isCorrect: result.is_correct, correctOptionIndex }
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
// InlineChatBar
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

  function handleChip(action: QuickAction) { send(action.message); }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  return (
    <div className="icb-wrap">
      <div className="icb-header">
        <span className="icb-avatar" aria-hidden="true">🤖</span>
        <span className="icb-title">Tanya AI</span>
        <button type="button" className="icb-expand-btn" onClick={onOpenFull} aria-label="Buka chat penuh">
          Buka penuh ↗
        </button>
      </div>

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
    </div>
  );
}

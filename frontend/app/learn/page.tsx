"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  submitAnswer,
  generateExplanation,
  startDiagnostic,
  getPapers,
  getAssessment,
  Question,
  SubmitAnswerResponse,
  Paper,
  TopicStats,
} from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";
import QuizSheet from "@/components/QuizSheet";
import StudyBuddyChat from "@/components/StudyBuddyChat";
import type { LearningContext } from "@/lib/types";
import { UBAHAN_STEPS, UBAHAN_SUBTOPICS } from "@/app/materials/ubahan/data";
import { MATRIKS_STEPS, MATRIKS_SUBTOPICS } from "@/app/materials/matriks/data";
import {
  INSURANS_STEPS,
  INSURANS_SUBTOPICS,
} from "@/app/materials/insurans/data";

type View = "topics" | "practice";

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
  const [nodeProgress, setNodeProgress] = useState<
    Record<string, { done: number; total: number }>
  >({});
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Which topic the user drilled into
  const [activeTopic, setActiveTopic] = useState<
    (typeof MATH_F5_TOPICS)[number] | null
  >(null);
  // Practice state
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  const [explanation, setExplanation] = useState<import("@/lib/api").Explanation | null>(null);
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

    getAssessment(uid)
      .catch(() => ({ topics: [] }))
      .then((res) => setTopicStats(res.topics));

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

  function pickWeakestSubtopic(
    subtopics: SubtopicOption[],
    stats: TopicStats[],
  ): string {
    // Build a mastery score per subtopic id using topic-level stats as proxy.
    // Lower accuracy → higher weight → more likely to be picked.
    const LEVEL_WEIGHT: Record<string, number> = {
      beginner: 4,
      developing: 3,
      proficient: 2,
      advanced: 1,
    };

    const weights = subtopics.map((sub) => {
      const stat = stats.find((s) => s.topic_id === sub.id);
      if (!stat) return { id: sub.id, w: 4 }; // unseen → highest weight
      const levelW = LEVEL_WEIGHT[stat.level] ?? 2;
      const accuracyW = Math.max(0.1, 1 - stat.accuracy); // low accuracy → higher weight
      return { id: sub.id, w: levelW * accuracyW };
    });

    const total = weights.reduce((s, x) => s + x.w, 0);
    let rand = Math.random() * total;
    for (const { id, w } of weights) {
      rand -= w;
      if (rand <= 0) return id;
    }
    return weights[weights.length - 1].id;
  }

  async function handleStartPractice(topicId: string, subtopicId?: string | null) {
    if (!userId) return;
    setStarting(true);
    setStartError("");
    try {
      const subjectPapers = papers.filter((p) => p.subject === "Matematik");
      if (!subjectPapers.length) throw new Error("No papers");
      const paper = subjectPapers[0];

      // When no specific subtopic is chosen, pick one weighted by mastery weakness
      let resolvedSubtopic = subtopicId ?? undefined;
      if (!resolvedSubtopic && activeTopic) {
        resolvedSubtopic = pickWeakestSubtopic(activeTopic.subtopics, topicStats);
      }

      const diagRes = await startDiagnostic(userId, topicId, paper.id, resolvedSubtopic);
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
      setExplanation(null);
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
    setExplanation(null);
  }

  async function handleGenerateExplanation() {
    if (!result || !question || !userId || selected === null) return;
    setGeneratingExplanation(true);
    try {
      const exp = await generateExplanation(userId, question.id, selected);
      setExplanation(exp);
    } catch {
      alert("Gagal menjana penerangan. Sila cuba lagi.");
    } finally {
      setGeneratingExplanation(false);
    }
  }

  // ── VIEW: Chapter picker ────────────────────────────────────────────
  if (view === "topics") {
    return (
      <section
        className="home-dashboard-shell page-enter"
        aria-label="Latih — pilih bab"
      >
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
            const np = nodeProgress[topic.id] ?? {
              done: 0,
              total: topic.steps.length,
            };
            const pct =
              np.total > 0 ? Math.round((np.done / np.total) * 100) : 0;
            return (
              <button
                key={topic.id}
                type="button"
                className={`lp-chapter-card lp-chapter-${topic.tone}`}
                onClick={() => {
                  setActiveTopic(topic);
                  handleStartPractice(topic.id, null);
                }}
              >
                <div className="lp-chapter-left">
                  <p className="lp-chapter-bab">{topic.bab}</p>
                  <h2 className="lp-chapter-name">{topic.name}</h2>
                  <p className="lp-chapter-desc">{topic.desc}</p>
                  <div className="lp-chapter-tags">
                    <span className="lp-tag">{topic.difficulty}</span>
                    <span className="lp-tag">{topic.estimatedTime}</span>
                    <span className="lp-tag">
                      {topic.subtopics.length} subtopik
                    </span>
                  </div>
                  <div className="lp-chapter-progress-row">
                    <div className="lp-chapter-track">
                      <div
                        className="lp-chapter-fill"
                        style={{ "--pct": `${pct}%` } as React.CSSProperties}
                      />
                    </div>
                    {pct === 0 ? (
                      <span className="lp-chapter-cta">Mula →</span>
                    ) : (
                      <span className="lp-chapter-pct">{pct}%</span>
                    )}
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
              <span
                className="home-action-icon home-action-icon-light"
                aria-hidden="true"
              >
                ↺
              </span>
              <span>
                <span className="home-action-label">
                  Sambung sesi sebelumnya
                </span>
                <span className="home-action-sub">
                  Teruskan dari tempat anda berhenti
                </span>
              </span>
            </button>
          </div>
        )}
      </section>
    );
  }

  // ── VIEW: Practice ──────────────────────────────────────────────────
  if (!question)
    return <div className="page-enter diag-sub">Memuatkan soalan…</div>;

  const diff = question.difficulty ?? "easy";
  const diffLabel: Record<string, string> = {
    easy: "Mudah",
    medium: "Sederhana",
    hard: "Sukar",
  };
  const topicLabel =
    question.topic_id === "matriks"
      ? "Matriks"
      : question.topic_id === "insurans"
        ? "Insurans"
        : "Ubahan";

  const topicDisplayName =
    question.topic_id === "matriks"
      ? "Matriks (Matrices)"
      : question.topic_id === "insurans"
        ? "Insurans (Insurance)"
        : "Ubahan (Variation)";

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
    <div className={`qs-feedback-panel ${result.is_correct ? "qs-feedback-correct" : "qs-feedback-wrong"}`}>
      <div className="qs-feedback-top">
        <span className="qs-feedback-icon">{result.is_correct ? "✓" : "✗"}</span>
        <div className="qs-feedback-text">
          <p className="qs-feedback-title">{result.is_correct ? "Betul!" : "Jawapan Salah"}</p>
          {!result.is_correct && (
            <p className="qs-feedback-hint">Semak penerangan di bawah untuk faham jawapan betul.</p>
          )}
        </div>
      </div>
      <button type="button" className="qs-feedback-btn" onClick={handleNext}>
        SETERUSNYA &rsaquo;
      </button>
    </div>
  );

  return (
    <QuizSheet
      open={view === "practice"}
      bar={bar}
      streak={sessionStreak}
      xp={xp}
      meta={`${topicLabel} · ${diffLabel[diff] ?? diff}`}
      progress={count}
      total={Math.max(10, count)}
      onClose={() => {
        setView("topics");
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


      {/* ── Difficulty shift indicator ── */}
      {diffShift && (
        <div className="learn-meta-row">
          <span className="learn-meta-shift">
            {diffShift === "up" ? "↑ Naik tahap" : "↓ Turun tahap"}
          </span>
        </div>
      )}

      {/* ── Question card ── */}
      <QuestionCard
        question={question}
        selectedOptionIndex={selected}
        onSelectOption={result ? undefined : setSelected}
        showResult={result !== null}
        isCorrect={result?.is_correct}
        correctOptionIndex={result ? 0 : undefined}
      />

      {/* ── Explanation shown after answering ── */}
      {result && (
        <ExplanationBlock
          explanation={explanation}
          isCorrect={result.is_correct}
          onGenerateExplanation={handleGenerateExplanation}
          isGenerating={generatingExplanation}
        />
      )}

      {/* ── StudyBuddy floating action button ── */}
      {userId && (
        <button
          type="button"
          className={`sb-fab${showBuddy ? " sb-fab-active" : ""}`}
          onClick={() => setShowBuddy((v) => !v)}
          aria-label="Open Skorrel"
        >
          <Image src="/assets/mascot.webp" alt="Skorrel" width={30} height={30} />
        </button>
      )}

      {/* ── Full-screen StudyBuddy drawer ── */}
      {userId && (
        <StudyBuddyChat
          userId={userId}
          isOpen={showBuddy}
          onClose={() => setShowBuddy(false)}
          learningContext={{
            topicId: (question.topic_id ??
              "ubahan") as LearningContext["topicId"],
            topicName: topicDisplayName,
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


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { getAssessment, fetchFlashcardSets, fetchUserQuizzes, TopicStats, FlashcardSetSummary, QuizSummary } from "@/lib/api";

// ---------------------------------------------------------------------------
// Static / mock data
// ---------------------------------------------------------------------------

const MOCK_TOPICS: TopicStats[] = [
  { topic_id: "ubahan", accuracy: 0.4, attempts: 10, correct: 4, level: "developing" },
  { topic_id: "matriks", accuracy: 0.2, attempts: 10, correct: 2, level: "beginner" },
  { topic_id: "insurans", accuracy: 0.75, attempts: 8, correct: 6, level: "proficient" },
];

const TOPIC_META: Record<string, { name: string; color: string; bg: string }> = {
  ubahan:   { name: "Ubahan",   color: "#7f65ff", bg: "linear-gradient(135deg,#8e78ff,#b26cff)" },
  matriks:  { name: "Matriks",  color: "#ff6b93", bg: "linear-gradient(135deg,#ff8dc0,#ffb0c9)" },
  insurans: { name: "Insurans", color: "#22c55e", bg: "linear-gradient(135deg,#5bd4bc,#22c55e)" },
};

const LEADERBOARD = [
  { rank: 1, name: "VOLLEYBEAR", xp: 92000, avatar: "🚴" },
  { rank: 2, name: "Clara",      xp: 8000,  avatar: "🦩" },
  { rank: 3, name: "husna",      xp: 5700,  avatar: "🟤" },
  { rank: 4, name: "DeionKingen",xp: 2300,  avatar: "🐧" },
  { rank: 5, name: "You",        xp: 180,   avatar: "🐢", isMe: true },
];

const WEEK_DAYS = ["Ah", "Is", "Se", "Ra", "Kh", "Ju", "Sa"];

function formatXP(xp: number) {
  if (xp >= 1000) return `${(xp / 1000).toFixed(xp % 1000 === 0 ? 0 : 1)}k XP`;
  return `${xp} XP`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="progress-svg-icon">
      {children}
    </svg>
  );
}

function ShareIcon() {
  return (
    <IconBase>
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M12 3v12M8 7l4-4 4 4" />
    </IconBase>
  );
}

function ArrowRightIcon() {
  return (
    <IconBase>
      <path d="M8 12h8M13 8l4 4-4 4" />
    </IconBase>
  );
}

// ---------------------------------------------------------------------------
// Progress Header (matches StudentHeader on home)
// ---------------------------------------------------------------------------

function ProgressHeader({ name, xp, level }: { name: string; xp: number; level: number }) {
  const toNext = 50;
  const pct = Math.round((xp / toNext) * 100);

  return (
    <header className="student-header">
      <div className="student-header-copy">
        <p className="student-time">Kemajuan</p>
        <h1>{name || "Pelajar"}</h1>
        <div className="student-meta-row">
          <span>Tahap {level}</span>
          <span aria-hidden="true">•</span>
          <span>{xp} XP</span>
        </div>
      </div>


    </header>
  );
}

// ---------------------------------------------------------------------------
// XP Progress bar card (like LevelProgressCard on home)
// ---------------------------------------------------------------------------

function XPProgressCard({ xp, level }: { xp: number; level: number }) {
  const toNext = 50;
  const pct = Math.min(Math.round((xp / toNext) * 100), 100);

  return (
    <section className="level-card" aria-label="XP progress">
      <div className="level-card-content">
        <p className="level-eyebrow">Tahap {level}: {toNext} XP</p>
        <h2>Teruskan usaha, kamu hebat!</h2>
        <div className="level-progress-row">
          <div className="level-progress-track" aria-hidden="true">
            <div className="level-progress-fill" style={{ width: `${pct}%` }}>
              <span className="level-progress-dot" />
            </div>
          </div>
          <span>{xp} XP</span>
        </div>
      </div>
      <div className="level-trophy" aria-hidden="true">
        <FlameIcon />
      </div>
    </section>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 54, height: 54 }}>
      <path
        d="M12 2C9.5 6 8 8.5 9 11.5c.4 1.2-.2 2.5-1.5 2.5C6.2 14 5 12.6 5 11c0 4 2 7.5 7 9 5-1.5 7-5 7-9 0-2.5-1.5-5-3-7-1 2.5-2.5 3-3 3-.5 0-1-.5-1-1 0-.5.5-2.5-1-5Z"
        fill="rgba(255,255,255,0.9)"
        stroke="none"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Streak card with week calendar
// ---------------------------------------------------------------------------

function StreakCard({ streak }: { streak: number }) {
  const today = new Date().getDay(); // 0 = Sunday
  const weekStart = 10; // mock: week starts on day 10 of month
  const activeDay = today; // 0-indexed in week

  return (
    <article className="progress-streak-card page-enter">
      <div className="progress-streak-header">
        <div>
          <p className="progress-streak-kicker">Rentetan</p>
          <h2 className="progress-streak-title">{streak} hari!</h2>
        </div>
        <div className="progress-streak-actions">
          <div className="progress-gem-chip">
            <span>💎</span>
            <span>1</span>
          </div>
          <button type="button" className="progress-share-btn" aria-label="Kongsi">
            <ShareIcon />
          </button>
        </div>
      </div>

      {/* Streak milestone hint */}
      <div className="progress-streak-milestone">
        <span className="progress-streak-milestone-icon">🔥</span>
        <span className="progress-streak-milestone-arrow">→</span>
        <span className="progress-streak-milestone-target">🏅</span>
        <span className="progress-streak-milestone-text">10 soalan untuk dapatkan Emas</span>
      </div>

      {/* Week calendar */}
      <div className="progress-week-grid" role="list" aria-label="Aktiviti minggu ini">
        {WEEK_DAYS.map((day, i) => {
          const dateNum = weekStart + i;
          const isToday = i === activeDay;
          const isDone = i < activeDay;
          return (
            <div
              key={day}
              role="listitem"
              className={`progress-week-slot${isToday ? " today" : ""}${isDone ? " done" : ""}`}
            >
              <span className="progress-week-day">{day}</span>
              <span className="progress-week-circle">
                {isDone ? "🔥" : isToday ? "💎" : dateNum}
              </span>
            </div>
          );
        })}
      </div>

      <button type="button" className="progress-gold-btn">
        🎮 Dapatkan rentetan Emas
      </button>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Set progress section
// ---------------------------------------------------------------------------

function SetProgressSection({ topics }: { topics: TopicStats[] }) {
  return (
    <section className="progress-set-section" aria-label="Kemajuan set">
      <div className="progress-section-header">
        <h2 className="progress-section-title">Kemajuan set</h2>
        <button type="button" className="progress-see-all">Lihat semua</button>
      </div>
      <div className="progress-set-list">
        {topics.map((t) => {
          const meta = TOPIC_META[t.topic_id] ?? { name: t.topic_id, color: "#7f65ff", bg: "linear-gradient(135deg,#8e78ff,#b26cff)" };
          const pct = Math.round(t.accuracy * 100);
          const mastered = Math.round(t.correct);
          const total = t.attempts;
          return (
            <article key={t.topic_id} className={`progress-set-card page-enter topic-${t.topic_id}`}>
              <div className="progress-set-ring-wrap">
                <svg className="progress-set-ring" viewBox="0 0 56 56" aria-hidden="true">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                  <circle
                    cx="28" cy="28" r="22" fill="none"
                    className="progress-ring-arc"
                    strokeWidth="5"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 28 28)"
                  />
                </svg>
                <span className="progress-set-ring-pct">{pct}%</span>
              </div>
              <div className="progress-set-info">
                <p className="progress-set-name">{meta.name}</p>
                <p className="progress-set-sub">{mastered} daripada {total} kad dikuasai</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Leaderboard section
// ---------------------------------------------------------------------------

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderboardSection() {
  const [tab, setTab] = useState<"hari" | "minggu" | "bulan" | "sepanjang">("sepanjang");
  const tabs = [
    { key: "hari", label: "Hari" },
    { key: "minggu", label: "Minggu" },
    { key: "bulan", label: "Bulan" },
    { key: "sepanjang", label: "Sepanjang" },
  ] as const;

  return (
    <section className="progress-leaderboard-section" aria-label="Papan kedudukan rakan">
      <h2 className="progress-section-title">Papan kedudukan rakan anda</h2>

      <div className="progress-tab-row" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key ? "true" : "false"}
            type="button"
            className={`progress-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="progress-leaderboard-list">
        {LEADERBOARD.map((entry) => (
          <div
            key={entry.rank}
            className={`progress-lb-row${entry.isMe ? " is-me" : ""}`}
          >
            <span className="progress-lb-rank">
              {MEDAL[entry.rank] ?? entry.rank}
            </span>
            <span className="progress-lb-avatar">{entry.avatar}</span>
            <span className="progress-lb-name">{entry.name}</span>
            <span className="progress-lb-xp">{formatXP(entry.xp)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// My Flashcards section
// ---------------------------------------------------------------------------

function MyFlashcardsSection({ sets }: { sets: FlashcardSetSummary[] }) {
  const router = useRouter();
  if (sets.length === 0) return null;

  return (
    <section className="progress-history-section" aria-label="Kad imbas saya">
      <div className="progress-section-header">
        <h2 className="progress-section-title">Kad Imbas Saya</h2>
        <span className="progress-history-count">{sets.length} set</span>
      </div>
      <div className="progress-history-list">
        {sets.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`progress-history-card progress-history-card--flash topic-${s.topic_id}`}
            onClick={() => router.push(`/flashcards/${s.id}`)}
          >
            <span className="progress-history-icon">🃏</span>
            <div className="progress-history-body">
              <p className="progress-history-title">{s.title}</p>
              <p className="progress-history-sub">{s.card_count} kad · {TOPIC_META[s.topic_id]?.name ?? s.topic_id}</p>
            </div>
            <ArrowRightIcon />
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// My Quizzes section
// ---------------------------------------------------------------------------

function MyQuizzesSection({ quizzes }: { quizzes: QuizSummary[] }) {
  const router = useRouter();
  if (quizzes.length === 0) return null;

  return (
    <section className="progress-history-section" aria-label="Kuiz saya">
      <div className="progress-section-header">
        <h2 className="progress-section-title">Kuiz Saya</h2>
        <span className="progress-history-count">{quizzes.length} kuiz</span>
      </div>
      <div className="progress-history-list">
        {quizzes.map((q) => (
          <button
            key={q.quiz_id}
            type="button"
            className={`progress-history-card progress-history-card--quiz topic-${q.topic_id}`}
            onClick={() => router.push(`/quiz/${q.quiz_id}`)}
          >
            <span className="progress-history-icon">📝</span>
            <div className="progress-history-body">
              <p className="progress-history-title">{q.title}</p>
              <p className="progress-history-sub">{q.question_count} soalan · {TOPIC_META[q.topic_id]?.name ?? q.topic_id}</p>
            </div>
            <ArrowRightIcon />
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Resume learning section (matches home "continue" pattern)
// ---------------------------------------------------------------------------

function ResumeLearningSection({ topics }: { topics: TopicStats[] }) {
  const router = useRouter();
  const first = topics[0];
  if (!first) return null;
  const meta = TOPIC_META[first.topic_id] ?? { name: first.topic_id, color: "#7f65ff", bg: "" };
  const pct = Math.round(first.accuracy * 100);

  return (
    <section className="progress-resume-section" aria-label="Sambung semula">
      <div className="progress-section-header">
        <h2 className="progress-section-title">Sambung semula</h2>
        <button type="button" className="progress-see-all">Lihat semua</button>
      </div>
      <div className="progress-resume-row">
        <article
          className={`progress-resume-card page-enter topic-${first.topic_id}`}
          onClick={() => router.push("/materials")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && router.push("/materials")}
          aria-label={`Sambung ${meta.name}`}
        >
          <div className="progress-set-ring-wrap">
            <svg className="progress-set-ring" viewBox="0 0 56 56" aria-hidden="true">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#e5e7eb" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                className="progress-ring-arc"
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
              />
            </svg>
            <span className="progress-set-ring-pct">{pct}%</span>
          </div>
          <div className="progress-set-info">
            <p className="progress-set-name">{meta.name}</p>
            <p className="progress-set-sub">Kuiz</p>
          </div>
        </article>
        <button
          type="button"
          className="progress-chat-btn"
          aria-label="Buka chat"
          onClick={() => router.push("/")}
        >
          <span>💬</span>
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingShell() {
  return (
    <div className="home-dashboard-shell page-enter">
      <div style={{ height: 72, borderRadius: 20, background: "#e5e7eb" }} />
      <div style={{ height: 154, borderRadius: 30, background: "#e5e7eb" }} />
      <div style={{ height: 220, borderRadius: 30, background: "#e5e7eb" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProgressPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicStats[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSetSummary[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const streak = 1;
  const level = 2;
  const xp = 30;

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    const n = sessionStorage.getItem("userName") ?? "";
    setName(n || "Noob");

    if (!userId) {
      setTopics(MOCK_TOPICS);
      setLoading(false);
      return;
    }

    Promise.all([
      getAssessment(userId).catch(() => ({ topics: MOCK_TOPICS })),
      fetchFlashcardSets(userId).catch(() => []),
      fetchUserQuizzes(userId).catch(() => []),
    ]).then(([assessment, sets, qs]) => {
      setTopics(assessment.topics.length === 0 ? MOCK_TOPICS : assessment.topics);
      setFlashcardSets(sets);
      setQuizzes(qs);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <LoadingShell />;

  return (
    <section className="home-dashboard-shell page-enter" aria-label="Halaman kemajuan">
      <ProgressHeader name={name} xp={xp} level={level} />
      <XPProgressCard xp={xp} level={level} />
      <StreakCard streak={streak} />
      <ResumeLearningSection topics={topics} />
      <MyFlashcardsSection sets={flashcardSets} />
      <MyQuizzesSection quizzes={quizzes} />
      <SetProgressSection topics={topics} />
      <LeaderboardSection />
    </section>
  );
}

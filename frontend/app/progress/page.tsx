"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { getAssessment, fetchFlashcardSets, fetchUserQuizzes, TopicStats, FlashcardSetSummary, QuizSummary } from "@/lib/api";

// ---------------------------------------------------------------------------
// Static meta (display names, colours)
// ---------------------------------------------------------------------------

const TOPIC_META: Record<string, { name: string; color: string; bg: string; icon: string; learnRoute: string; materialsRoute: string }> = {
  ubahan:   { name: "Ubahan",   color: "#7f65ff", bg: "linear-gradient(135deg,#8e78ff,#b26cff)", icon: "∝",  learnRoute: "/learn",     materialsRoute: "/materials/ubahan/subtopics" },
  matriks:  { name: "Matriks",  color: "#ff6b93", bg: "linear-gradient(135deg,#ff8dc0,#ffb0c9)", icon: "⊞",  learnRoute: "/learn",     materialsRoute: "/materials/matriks/subtopics" },
  insurans: { name: "Insurans", color: "#22c55e", bg: "linear-gradient(135deg,#5bd4bc,#22c55e)", icon: "🛡", learnRoute: "/learn",     materialsRoute: "/materials/insurans/subtopics" },
};

const WEEK_DAYS = ["Ah", "Is", "Se", "Ra", "Kh", "Ju", "Sa"];


function levelFromXP(xp: number) {
  return Math.max(1, Math.floor(xp / 50) + 1);
}

// ---------------------------------------------------------------------------
// Icons
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
// Header
// ---------------------------------------------------------------------------

function ProgressHeader({ name, xp, level }: { name: string; xp: number; level: number }) {
  return (
    <header className="student-header">
      <div className="student-header-copy">
        <p className="student-time" style={{ paddingLeft: "0.5rem" }}>Kemajuan</p>
        <h1 style={{ paddingLeft: "0.5rem" }}>{name || "Pelajar"}</h1>
        <div className="student-meta-row" style={{ paddingLeft: "0.5rem" }}>
          <span>Tahap {level}</span>
          <span aria-hidden="true">•</span>
          <span>{xp} XP</span>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// XP card
// ---------------------------------------------------------------------------

function XPProgressCard({ xp, level }: { xp: number; level: number }) {
  const toNext = level * 50;
  const prev = (level - 1) * 50;
  const pct = Math.min(Math.round(((xp - prev) / (toNext - prev)) * 100), 100);

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

// ---------------------------------------------------------------------------
// Streak card
// ---------------------------------------------------------------------------

function StreakCard({ streak }: { streak: number }) {
  const today = new Date().getDay();

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

      <div className="progress-streak-milestone">
        <span className="progress-streak-milestone-icon">🔥</span>
        <span className="progress-streak-milestone-arrow">→</span>
        <span className="progress-streak-milestone-target">🏅</span>
        <span className="progress-streak-milestone-text">10 soalan untuk dapatkan Emas</span>
      </div>

      <div className="progress-week-grid" role="list" aria-label="Aktiviti minggu ini">
        {WEEK_DAYS.map((day, i) => {
          const isToday = i === today;
          const isDone = i < today;
          return (
            <div
              key={day}
              role="listitem"
              className={`progress-week-slot${isToday ? " today" : ""}${isDone ? " done" : ""}`}
            >
              <span className="progress-week-day">{day}</span>
              <span className="progress-week-circle">
                {isDone ? "🔥" : isToday ? "💎" : ""}
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
// Topic Progress cards – clickable, show resource options
// ---------------------------------------------------------------------------

function TopicResourceSheet({
  topic,
  onClose,
}: {
  topic: TopicStats;
  onClose: () => void;
}) {
  const router = useRouter();
  const meta = TOPIC_META[topic.topic_id];
  if (!meta) return null;

  function go(path: string) {
    onClose();
    router.push(path);
  }

  return (
    <div
      className="topic-sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Sumber untuk ${meta.name}`}
      onClick={onClose}
    >
      <div className="topic-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="topic-sheet-handle" />
        <div className="topic-sheet-title-row">
          <span className="topic-sheet-icon">{meta.icon}</span>
          <div>
            <p className="topic-sheet-name">{meta.name}</p>
            <p className="topic-sheet-level">{Math.round(topic.accuracy * 100)}% tepat · {topic.level}</p>
          </div>
        </div>

        <div className="topic-sheet-actions">
          <button
            type="button"
            className={`topic-sheet-btn topic-sheet-btn--learn topic-${topic.topic_id}`}
            onClick={() => go(meta.learnRoute)}
          >
            <span className="topic-sheet-btn-icon">🧠</span>
            <div>
              <p className="topic-sheet-btn-label">Latihan Adaptif</p>
              <p className="topic-sheet-btn-sub">Sambung belajar dengan soalan pintar</p>
            </div>
            <ArrowRightIcon />
          </button>

          <button
            type="button"
            className={`topic-sheet-btn topic-sheet-btn--materials topic-${topic.topic_id}`}
            onClick={() => go(meta.materialsRoute)}
          >
            <span className="topic-sheet-btn-icon">📖</span>
            <div>
              <p className="topic-sheet-btn-label">Bahan Pembelajaran</p>
              <p className="topic-sheet-btn-sub">Lihat nota, latihan & penilaian</p>
            </div>
            <ArrowRightIcon />
          </button>

          <button
            type="button"
            className="topic-sheet-btn topic-sheet-btn--review"
            onClick={() => go("/review")}
          >
            <span className="topic-sheet-btn-icon">🔄</span>
            <div>
              <p className="topic-sheet-btn-label">Ulang Kaji</p>
              <p className="topic-sheet-btn-sub">Ulang soalan yang belum dikuasai</p>
            </div>
            <ArrowRightIcon />
          </button>

          <button
            type="button"
            className="topic-sheet-btn topic-sheet-btn--exam"
            onClick={() => go("/exams")}
          >
            <span className="topic-sheet-btn-icon">📝</span>
            <div>
              <p className="topic-sheet-btn-label">Kertas Peperiksaan</p>
              <p className="topic-sheet-btn-sub">Cuba soalan peperiksaan sebenar</p>
            </div>
            <ArrowRightIcon />
          </button>
        </div>

        <button type="button" className="topic-sheet-close" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}

function SetProgressSection({ topics }: { topics: TopicStats[] }) {
  const [activeTopic, setActiveTopic] = useState<TopicStats | null>(null);

  return (
    <section className="progress-set-section" aria-label="Kemajuan set">
      <div className="progress-section-header">
        <h2 className="progress-section-title">Kemajuan set</h2>
      </div>
      <div className="progress-set-list">
        {topics.map((t) => {
          const meta = TOPIC_META[t.topic_id] ?? { name: t.topic_id, color: "#7f65ff", bg: "" };
          const pct = Math.round(t.accuracy * 100);
          return (
            <article
              key={t.topic_id}
              className={`progress-set-card page-enter topic-${t.topic_id}`}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onClick={() => setActiveTopic(t)}
              onKeyDown={(e) => e.key === "Enter" && setActiveTopic(t)}
              aria-label={`${meta.name} – ${pct}% – ketik untuk lihat sumber`}
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
                <p className="progress-set-sub">{t.correct} / {t.attempts} betul</p>
              </div>
              <span className="progress-set-arrow"><ArrowRightIcon /></span>
            </article>
          );
        })}
      </div>

      {activeTopic && (
        <TopicResourceSheet topic={activeTopic} onClose={() => setActiveTopic(null)} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// My Flashcards
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
// My Quizzes
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
// Resume learning – shows weakest topic
// ---------------------------------------------------------------------------

function ResumeLearningSection({ topics }: { topics: TopicStats[] }) {
  const router = useRouter();
  const [activeTopic, setActiveTopic] = useState<TopicStats | null>(null);

  // Show topic with lowest accuracy first
  const sorted = [...topics].sort((a, b) => a.accuracy - b.accuracy);
  const first = sorted[0];
  if (!first) return null;

  const meta = TOPIC_META[first.topic_id] ?? { name: first.topic_id, color: "#7f65ff", bg: "" };
  const pct = Math.round(first.accuracy * 100);

  return (
    <section className="progress-resume-section" aria-label="Sambung semula">
      <div className="progress-section-header">
        <h2 className="progress-section-title">Sambung semula</h2>
        <button type="button" className="progress-see-all" onClick={() => router.push("/learn")}>
          Semua topik
        </button>
      </div>
      <div className="progress-resume-row">
        <article
          className={`progress-resume-card page-enter topic-${first.topic_id}`}
          onClick={() => setActiveTopic(first)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setActiveTopic(first)}
          aria-label={`Sambung ${meta.name}`}
          style={{ cursor: "pointer" }}
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
            <p className="progress-set-sub">Perlukan perhatian</p>
          </div>
          <span className="progress-set-arrow"><ArrowRightIcon /></span>
        </article>
        <button
          type="button"
          className="progress-chat-btn"
          aria-label="Latihan adaptif"
          onClick={() => router.push("/learn")}
        >
          <span>🧠</span>
        </button>
      </div>

      {activeTopic && (
        <TopicResourceSheet topic={activeTopic} onClose={() => setActiveTopic(null)} />
      )}
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
// Empty state
// ---------------------------------------------------------------------------

function EmptyTopics({ onStart }: { onStart: () => void }) {
  return (
    <section className="progress-empty" aria-label="Tiada data">
      <p className="progress-empty-icon">📊</p>
      <p className="progress-empty-title">Belum ada kemajuan</p>
      <p className="progress-empty-sub">Mulakan latihan untuk melihat statistik anda di sini.</p>
      <button type="button" className="progress-gold-btn" onClick={onStart}>
        Mula Belajar
      </button>
    </section>
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
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    const n = sessionStorage.getItem("userName") ?? "";
    const storedXp = parseInt(sessionStorage.getItem("userXp") ?? "0", 10);
    setName(n || "Pelajar");
    setXp(storedXp);
    setStreak(parseInt(sessionStorage.getItem("streak") ?? "1", 10));

    if (!userId) {
      setLoading(false);
      return;
    }

    Promise.all([
      getAssessment(userId).catch(() => ({ topics: [] as TopicStats[] })),
      fetchFlashcardSets(userId).catch(() => [] as FlashcardSetSummary[]),
      fetchUserQuizzes(userId).catch(() => [] as QuizSummary[]),
    ]).then(([assessment, sets, qs]) => {
      setTopics(assessment.topics);
      setFlashcardSets(sets);
      setQuizzes(qs);
      setLoading(false);
    });
  }, []);

  const level = levelFromXP(xp);

  if (loading) return <LoadingShell />;

  const hasData = topics.length > 0;

  return (
    <section className="home-dashboard-shell page-enter" aria-label="Halaman kemajuan">
      <ProgressHeader name={name} xp={xp} level={level} />
      <XPProgressCard xp={xp} level={level} />
      <StreakCard streak={streak} />
      {hasData ? (
        <>
          <ResumeLearningSection topics={topics} />
          <MyFlashcardsSection sets={flashcardSets} />
          <MyQuizzesSection quizzes={quizzes} />
          <SetProgressSection topics={topics} />
        </>
      ) : (
        <EmptyTopics onStart={() => router.push("/learn")} />
      )}
    </section>
  );
}

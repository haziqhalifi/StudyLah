"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAssessment, fetchFlashcardSets } from "@/lib/api";
import type { TopicStats, FlashcardSetSummary } from "@/lib/api";
import StudyBuddyChat from "@/components/StudyBuddyChat";
import type { LearningContext } from "@/lib/types";

const DEFAULT_STUDENT = {
  name: "Pelajar",
  form: "Tingkatan 5",
  streak: 1,
};

const XP_PER_LEVEL = 50;

function xpToLevel(xp: number) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

function xpProgress(xp: number) {
  return Math.min(Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100), 100);
}

export default function Home() {
  return <HomeDashboard />;
}


function HomeDashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState("guest");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialMsg, setChatInitialMsg] = useState<string | undefined>();
  const [topics, setTopics] = useState<TopicStats[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSetSummary[]>([]);
  const chatContext: LearningContext = {
    topicId: "ubahan",
    topicName: "Ubahan (Variation)",
    pageContext: "general",
  };

  useEffect(() => {
    try {
      const uid = sessionStorage.getItem("userId");
      if (uid) {
        setUserId(uid);
        getAssessment(uid)
          .then((res) => setTopics(res.topics))
          .catch(() => {});
        fetchFlashcardSets(uid)
          .then((sets) => setFlashcardSets(sets))
          .catch(() => {});
      }
      const shown = localStorage.getItem("onboardingDiagnosticShown");
      if (uid && !shown) {
        localStorage.setItem("onboardingDiagnosticShown", "1");
        router.push("/diagnostic");
      }
    } catch {
      // ignore storage errors in restricted environments
    }
  }, [router]);

  return (
    <>
      <section
        className="home-dashboard-shell page-enter"
        aria-label="Papan pemuka pelajar"
      >
        <StudentHeader />
        <LevelProgressCard />
        <DailyMissionCard />
        <FokusHariIni topics={topics} />
        <QuickStatsRow topics={topics} />
        <ResumeLearningSection topics={topics} />
        <QuickFlashcardWidget sets={flashcardSets} />
      </section>
      <FloatingAIButton onClick={() => setChatOpen(true)} />
      <StudyBuddyChat
        userId={userId}
        isOpen={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setChatInitialMsg(undefined);
        }}
        learningContext={chatContext}
        initialMessage={chatInitialMsg}
      />
    </>
  );
}

function useXpState() {
  const [xp, setXp] = useState(0);
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("userXp");
      if (stored) setXp(Number(stored));
    } catch {}
  }, []);
  return xp;
}

const NOTIFICATIONS = [
  {
    id: 1,
    icon: "🔥",
    title: "Streak kamu aktif!",
    body: "Teruskan belajar hari ini untuk kekalkan streak.",
    time: "Baru sahaja",
    unread: true,
  },
  {
    id: 2,
    icon: "⭐",
    title: "Tahniah! Kamu dapat XP baru",
    body: "Kamu telah mendapat 10 XP daripada misi harian.",
    time: "1 jam lalu",
    unread: true,
  },
  {
    id: 3,
    icon: "📚",
    title: "Ulang kaji Matriks",
    body: "Kamu belum menyentuh topik Matriks minggu ini.",
    time: "Semalam",
    unread: false,
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat Pagi";
  if (hour < 15) return "Selamat Tengah Hari";
  if (hour < 19) return "Selamat Petang";
  return "Selamat Malam";
}

function StudentHeader() {
  const [name, setName] = useState(DEFAULT_STUDENT.name);
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const notiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const storedName = sessionStorage.getItem("userName");
      if (storedName) setName(storedName);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!notiOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setNotiOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notiOpen]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  return (
    <header className="student-header">
      <div className="student-header-copy">
        <h1>{getGreeting()}, {name}!</h1>
        <div className="student-meta-row">
          <span>{DEFAULT_STUDENT.form}</span>
        </div>
      </div>

      <div className="student-header-actions">
        <div className="noti-wrapper" ref={notiRef}>
          <button
            className="notification-button"
            type="button"
            aria-label="Buka notifikasi"
            aria-expanded={notiOpen ? "true" : "false"}
            onClick={() => setNotiOpen((v) => !v)}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span
                className="notification-dot"
                aria-label="Notifikasi belum dibaca"
              />
            )}
          </button>

          {notiOpen && (
            <div className="noti-popup" role="dialog" aria-label="Notifikasi">
              <div className="noti-popup-header">
                <span className="noti-popup-title">Notifikasi</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="noti-mark-read"
                    onClick={markAllRead}
                  >
                    Tandakan semua dibaca
                  </button>
                )}
              </div>
              <ul className="noti-list" role="list">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`noti-item${n.unread ? " noti-item--unread" : ""}`}
                  >
                    <span className="noti-item-icon" aria-hidden="true">
                      {n.icon}
                    </span>
                    <div className="noti-item-body">
                      <p className="noti-item-title">{n.title}</p>
                      <p className="noti-item-text">{n.body}</p>
                      <p className="noti-item-time">{n.time}</p>
                    </div>
                    {n.unread && (
                      <span className="noti-item-dot" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <a
          href="/profile"
          className="profile-avatar-btn"
          aria-label="Profil saya"
        >
          <ProfileIcon />
        </a>
      </div>
    </header>
  );
}

function LevelProgressCard() {
  const xp = useXpState();
  const level = xpToLevel(xp);
  const progress = xpProgress(xp);
  const levelLabel =
    progress === 0 && xp === 0
      ? "Ini langkah pertama kamu menuju kejayaan!"
      : `${XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP ke Tahap ${level + 1}`;

  return (
    <section className="level-card" aria-label={`Kemajuan Tahap ${level}`}>
      <div className="level-card-content">
        <p className="level-eyebrow">Tahap {level}</p>
        <h2>{levelLabel}</h2>
        <div className="level-progress-row">
          <div className="level-progress-track" aria-hidden="true">
            <div
              className="level-progress-fill"
              style={{ width: `${progress}%` }}
            >
              <span className="level-progress-dot" />
            </div>
          </div>
          <span>{xp} XP</span>
        </div>
      </div>
      <div className="level-trophy" aria-hidden="true">
        <TrophyIcon />
      </div>
    </section>
  );
}

function DailyMissionCard() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const today = new Date().toDateString();
      const saved = localStorage.getItem("dailyMissionDate");
      if (saved === today) setDone(true);
    } catch {}
  }, []);

  function handleClaim() {
    try {
      localStorage.setItem("dailyMissionDate", new Date().toDateString());
    } catch {}
    router.push("/learn");
  }

  if (done) return null;

  return (
    <button
      type="button"
      className="daily-mission-card"
      onClick={handleClaim}
      aria-label="Misi harian"
    >
      <span className="daily-mission-icon" aria-hidden="true">
        <FireIcon />
      </span>
      <div className="daily-mission-body">
        <p className="daily-mission-label">Misi Hari Ini</p>
        <p className="daily-mission-title">Jawab 5 soalan hari ini</p>
      </div>
      <span className="daily-mission-badge" aria-hidden="true">
        +10 XP
      </span>
    </button>
  );
}

const TOPIC_SUBJECT: Record<string, string> = {
  ubahan: "Matematik",
  matriks: "Matematik",
  insurans: "Matematik",
};

function FokusHariIni({ topics }: { topics: TopicStats[] }) {
  const router = useRouter();

  if (topics.length === 0) return null;

  const weakest = [...topics].sort((a, b) => a.accuracy - b.accuracy)[0];
  const meta = TOPIC_META[weakest.topic_id] ?? { name: weakest.topic_id };
  const pct = Math.round(weakest.accuracy * 100);
  const subject = TOPIC_SUBJECT[weakest.topic_id] ?? "Matematik";

  return (
    <section className="fokus-card" aria-label="Fokus Hari Ini">
      <p className="fokus-eyebrow">
        <span className="fokus-eyebrow-dot" aria-hidden="true" />
        FOKUS HARI INI
      </p>
      <h2 className="fokus-title">
        Ulang kaji dan latih{" "}
        <span className="fokus-highlight">{meta.name}</span>
      </h2>
      <p className="fokus-meta">
        {subject}
        <span className="fokus-meta-sep" aria-hidden="true">
          ·
        </span>
        <span className="fokus-accuracy-dot" aria-hidden="true" />
        {pct}% ketepatan
      </p>
      <button
        type="button"
        className="fokus-cta"
        onClick={() => router.push("/learning")}
        aria-label={`Mula ulang kaji ${meta.name}`}
      >
        <span aria-hidden="true">⚡</span>
        Mula Ulang Kaji →
      </button>
    </section>
  );
}

function ResumeLearningSection({ topics }: { topics: TopicStats[] }) {
  const router = useRouter();

  const sorted = [...topics].sort((a, b) => a.accuracy - b.accuracy);
  if (sorted.length === 0) return null;

  return (
    <section className="progress-resume-section" aria-label="Sambung semula">
      <div className="progress-section-header">
        <h2 className="progress-section-title">Sambung semula</h2>
        <button
          type="button"
          className="progress-see-all"
          onClick={() => router.push("/progress")}
        >
          Lihat kemajuan
        </button>
      </div>
      <div className="progress-set-list-container">
        <div className="progress-set-list">
          {sorted.map((t, i) => {
            const meta = TOPIC_META[t.topic_id] ?? { name: t.topic_id };
            const pct = Math.round(t.accuracy * 100);
            return (
              <article
                key={t.topic_id}
                className={`progress-set-card page-enter topic-${t.topic_id}`}
                role="button"
                tabIndex={0}
                onClick={() => router.push("/learning")}
                onKeyDown={(e) =>
                  e.key === "Enter" && router.push("/learning")
                }
                aria-label={`${meta.name} – ${pct}%`}
              >
                <div className="progress-set-ring-wrap">
                  <svg
                    className="progress-set-ring"
                    viewBox="0 0 56 56"
                    aria-hidden="true"
                  >
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="5"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
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
                  <p className="progress-set-sub">
                    {i === 0
                      ? "Perlukan perhatian"
                      : `${t.correct} / ${t.attempts} betul`}
                  </p>
                </div>
                <span className="progress-set-arrow">›</span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuickStatsRow({ topics }: { topics: TopicStats[] }) {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("streakDays");
      if (stored) setStreak(Number(stored));
    } catch {}
  }, []);

  const mastered = topics.filter(
    (t) => t.level === "proficient" || t.level === "advanced",
  ).length;

  return (
    <div className="quick-stats-row">
      <div className="quick-stat-card">
        <span className="quick-stat-icon" aria-hidden="true">
          🔥
        </span>
        <span className="quick-stat-value">{streak}</span>
        <span className="quick-stat-label">Hari streak</span>
      </div>
      <div className="quick-stat-card">
        <span className="quick-stat-icon" aria-hidden="true">
          ⭐
        </span>
        <span className="quick-stat-value">{mastered}</span>
        <span className="quick-stat-label">Topik mahir</span>
      </div>
      <div className="quick-stat-card">
        <span className="quick-stat-icon" aria-hidden="true">
          📚
        </span>
        <span className="quick-stat-value">{topics.length}</span>
        <span className="quick-stat-label">Topik dipelajari</span>
      </div>
    </div>
  );
}

function QuickFlashcardWidget({ sets }: { sets: FlashcardSetSummary[] }) {
  const router = useRouter();

  if (sets.length === 0) {
    return (
      <button
        type="button"
        className="quick-flashcard-empty"
        onClick={() => router.push("/learn")}
        aria-label="Buat flashcard pertama kamu"
      >
        <span className="quick-flashcard-empty-icon" aria-hidden="true">
          🃏
        </span>
        <div>
          <p className="quick-flashcard-empty-title">Tiada flashcard lagi</p>
          <p className="quick-flashcard-empty-sub">
            Tanya AI untuk jana flashcard baru →
          </p>
        </div>
      </button>
    );
  }

  const recent = sets.slice(0, 3);

  return (
    <div className="quick-flashcard-widget">
      <div className="quick-flashcard-header">
        <h2 className="quick-flashcard-title">Flashcard Saya</h2>
        <button
          type="button"
          className="quick-flashcard-see-all"
          onClick={() => router.push("/progress")}
        >
          Lihat semua
        </button>
      </div>
      <div className="quick-flashcard-list">
        {recent.map((set) => (
          <button
            key={set.id}
            type="button"
            className="quick-flashcard-item"
            onClick={() => router.push(`/flashcards/${set.id}`)}
            aria-label={`Buka flashcard ${set.title}`}
          >
            <div className="quick-flashcard-item-info">
              <span className="quick-flashcard-item-title">{set.title}</span>
              <span className="quick-flashcard-item-count">
                {set.card_count} kad
              </span>
            </div>
            <span className="quick-flashcard-item-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FloatingAIButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="fab-ai"
      onClick={onClick}
      aria-label="Buka Tutor AI"
    >
      <img src="/assets/mascot.webp" alt="Skorrel" className="fab-ai-mascot" />
    </button>
  );
}


const TOPIC_META: Record<string, { name: string }> = {
  ubahan: { name: "Ubahan" },
  matriks: { name: "Matriks" },
  insurans: { name: "Insurans" },
};

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function FireIcon() {
  return (
    <IconBase>
      <path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-2.5-1.5-5-3-6.5 0 2-1 3.5-2 4.5-1-2-1-4.5 0-7Z" />
    </IconBase>
  );
}

function TrophyIcon() {
  return (
    <IconBase>
      <path d="M8 5h8v4.5a4 4 0 0 1-8 0V5Z" />
      <path d="M8 7H5.5A1.5 1.5 0 0 0 4 8.5C4 10.4 5.6 12 8 12M16 7h2.5A1.5 1.5 0 0 1 20 8.5c0 1.9-1.6 3.5-4 3.5M12 13.5V17M9 20h6M10 17h4" />
    </IconBase>
  );
}

function BellIcon() {
  return (
    <IconBase>
      <path d="M18 10.5a6 6 0 0 0-12 0v2.8L4.8 16h14.4L18 13.3v-2.8Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

function ProfileIcon() {
  return (
    <IconBase>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </IconBase>
  );
}

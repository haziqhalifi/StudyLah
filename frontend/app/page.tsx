"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAssessment, getPapers } from "@/lib/api";
import type { TopicStats } from "@/lib/api";
import StudyBuddyChat from "@/components/StudyBuddyChat";
import type { LearningContext } from "@/lib/types";

const DEFAULT_STUDENT = {
  name: "Pelajar",
  form: "Form 5",
  streak: 1,
};

const XP_PER_LEVEL = 50;

function xpToLevel(xp: number) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

function xpProgress(xp: number) {
  return Math.min(Math.round((xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100), 100);
}


export default function Home() {
  return <HomeDashboard />;
}

const TOPIC_NAME_MAP: Record<string, LearningContext["topicId"]> = {
  ubahan: "ubahan",
  matriks: "matriks",
  insurans: "insurans",
};

const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  ubahan: "Ubahan (Variation)",
  matriks: "Matriks (Matrices)",
  insurans: "Insurans",
};

function HomeDashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState("guest");
  const [chatOpen, setChatOpen] = useState(false);
  const [topics, setTopics] = useState<TopicStats[]>([]);
  const [chatContext, setChatContext] = useState<LearningContext>({
    topicId: "ubahan",
    topicName: "Ubahan (Variation)",
    pageContext: "general",
  });

  useEffect(() => {
    try {
      const uid = sessionStorage.getItem("userId");
      if (uid) {
        setUserId(uid);
        getAssessment(uid)
          .then((res) => setTopics(res.topics))
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

  function openChat(topicKey: string, initialMsg?: string) {
    const topicId = TOPIC_NAME_MAP[topicKey] ?? "ubahan";
    setChatContext({
      topicId,
      topicName: TOPIC_DISPLAY_NAMES[topicKey] ?? "Ubahan (Variation)",
      pageContext: "general",
      ...(initialMsg
        ? {
            currentQuestion: {
              id: "home-context",
              text: initialMsg,
              options: [],
              difficulty: "medium" as const,
            },
          }
        : {}),
    });
    setChatOpen(true);
  }

  return (
    <>
      <section
        className="home-dashboard-shell page-enter"
        aria-label="Student home dashboard"
      >
        <StudentHeader />
        <LevelProgressCard />
        <DailyMissionCard />
        <WeakTopicCard topics={topics} />
        <AIChatCard onOpen={openChat} />
        <RecentSessionCard />
      </section>
      <StudyBuddyChat
        userId={userId}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        learningContext={chatContext}
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

function StudentHeader() {
  const [name, setName] = useState(DEFAULT_STUDENT.name);
  const xp = useXpState();

  useEffect(() => {
    try {
      const storedName = sessionStorage.getItem("userName");
      if (storedName) setName(storedName);
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <header className="student-header">
      <div className="student-header-copy">
        <h1>Hello, {name}</h1>
        <div className="student-meta-row">
          <span>{DEFAULT_STUDENT.form}</span>
          <span aria-hidden="true">•</span>
          <span>{xp} XP</span>
        </div>
      </div>

      <div className="student-header-actions">
        <button
          className="notification-button"
          type="button"
          aria-label="Open notifications"
        >
          <BellIcon />
          <span
            className="notification-dot"
            aria-label="Unread notifications"
          />
        </button>
      </div>
    </header>
  );
}

function LevelProgressCard() {
  const xp = useXpState();
  const level = xpToLevel(xp);
  const progress = xpProgress(xp);
  const levelLabel = progress === 0 && xp === 0 ? "This is your first step to greatness!" : `${XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP to Level ${level + 1}`;

  return (
    <section
      className="level-card"
      aria-label={`Level ${level} progress`}
    >
      <div className="level-card-content">
        <p className="level-eyebrow">Level {level}</p>
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

  return (
    <button
      type="button"
      className={`daily-mission-card${done ? " daily-mission-card--done" : ""}`}
      onClick={handleClaim}
      aria-label="Misi harian"
    >
      <span className="daily-mission-icon" aria-hidden="true">
        {done ? <CheckCircleIcon /> : <FireIcon />}
      </span>
      <div className="daily-mission-body">
        <p className="daily-mission-label">Misi Hari Ini</p>
        <p className="daily-mission-title">
          {done ? "Misi selesai! Teruskan streak kamu" : "Jawab 5 soalan hari ini"}
        </p>
      </div>
      {!done && (
        <span className="daily-mission-badge" aria-hidden="true">+10 XP</span>
      )}
    </button>
  );
}

function WeakTopicCard({ topics }: { topics: TopicStats[] }) {
  const router = useRouter();

  const weakest = topics.length > 0
    ? topics.reduce((a, b) => (a.accuracy < b.accuracy ? a : b))
    : null;

  if (!weakest) return null;

  const name = TOPIC_META[weakest.topic_id]?.name ?? weakest.topic_id;
  const pct = Math.round(weakest.accuracy * 100);

  return (
    <button
      type="button"
      className="weak-topic-card"
      onClick={() => router.push("/learn")}
      aria-label={`Topik lemah: ${name}`}
    >
      <span className="weak-topic-icon" aria-hidden="true">
        <TargetIcon />
      </span>
      <div className="weak-topic-body">
        <p className="weak-topic-label">Topik Paling Lemah</p>
        <p className="weak-topic-title">{name}</p>
        <div className="weak-topic-bar-wrap" aria-hidden="true">
          <div className="weak-topic-bar">
            <div className="weak-topic-bar-fill" style={{ "--fill": `${pct}%` } as React.CSSProperties} />
          </div>
          <span className="weak-topic-pct">{pct}% tepat</span>
        </div>
      </div>
      <span className="weak-topic-cta">Ulangkaji &rsaquo;</span>
    </button>
  );
}

const TOPICS = {
  ubahan: {
    label: "Ubahan",
    subtopics: ["Ubahan Langsung", "Ubahan Songsang", "Ubahan Bergabung", "Ubahan Separa"],
  },
  matriks: {
    label: "Matriks",
    subtopics: ["Operasi Matriks", "Penentu Matriks", "Matriks Songsang"],
  },
  insurans: {
    label: "Insurans",
    subtopics: ["Konsep Insurans", "Premium & Polisi", "Tuntutan Insurans"],
  },
} as const;

type TopicKey = keyof typeof TOPICS;


function AIChatCard({ onOpen }: { onOpen: (topicKey: string, msg?: string) => void }) {
  const [selectedTopic, setSelectedTopic] = useState<TopicKey>("ubahan");
  const topic = TOPICS[selectedTopic];

  const topicChips = topic.subtopics.map((sub) => ({
    label: sub,
    message: `Terangkan ${sub} dengan contoh soalan SPM`,
  }));

  return (
    <section className="ai-chat-card" aria-label="AI tutor chat">
      <button
        type="button"
        className="ai-chat-header ai-chat-header-btn"
        onClick={() => onOpen(selectedTopic)}
        aria-label="Buka chat tutor AI"
      >
        <div className="ai-chat-avatar" aria-hidden="true">
          AI
        </div>
        <div className="ai-chat-header-text">
          <h2>Tanya Tutor AI</h2>
          <p className="ai-chat-subtitle">Pilih topik &amp; bab untuk mulakan</p>
        </div>
        <span className="ai-chat-open-hint" aria-hidden="true">
          <ArrowIcon />
        </span>
      </button>

      <div className="ai-topic-tabs" role="tablist" aria-label="Pilih topik">
        {(Object.keys(TOPICS) as TopicKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selectedTopic === key ? "true" : "false"}
            className={`ai-topic-tab${selectedTopic === key ? " active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTopic(key);
            }}
          >
            {TOPICS[key].label}
          </button>
        ))}
      </div>

      <div className="ai-chat-suggestions">
        {topicChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="ai-chat-chip"
            onClick={() => onOpen(selectedTopic, chip.message)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );
}


const TOPIC_META: Record<string, { name: string }> = {
  ubahan:   { name: "Ubahan" },
  matriks:  { name: "Matriks" },
  insurans: { name: "Insurans" },
};

function RecentSessionCard() {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicStats[]>([]);
  const [paperCount, setPaperCount] = useState<number | null>(null);

  useEffect(() => {
    const userId =
      (typeof window !== "undefined" && sessionStorage.getItem("userId")) ||
      "guest";
    getAssessment(userId)
      .then((res) => setTopics(res.topics))
      .catch(() => {});
    getPapers()
      .then((res) => setPaperCount(res.papers.length))
      .catch(() => {});
  }, []);

  const totalAttempts = topics.reduce((s, t) => s + t.attempts, 0);
  const avgAccuracy =
    topics.length > 0
      ? Math.round(
          (topics.reduce((s, t) => s + t.accuracy, 0) / topics.length) * 100,
        )
      : null;

  const weakestTopic = topics.length > 0
    ? topics.reduce((a, b) => (a.accuracy < b.accuracy ? a : b))
    : null;

  return (
    <section className="sambung-section" aria-label="Sambung semula">
      <h2 className="sambung-heading">Sambung semula</h2>
      <div className="sambung-cards">
        {/* Learning progress card */}
        <button
          type="button"
          className="sambung-card sambung-card--learn"
          onClick={() => router.push("/progress")}
          aria-label="Lihat kemajuan pembelajaran"
        >
          <div className="sambung-card-icon" aria-hidden="true">
            <ProgressIcon />
          </div>
          <div className="sambung-card-body">
            <p className="sambung-card-label">Pembelajaran</p>
            <p className="sambung-card-title">
              {weakestTopic
                ? `Fokus: ${TOPIC_META[weakestTopic.topic_id]?.name ?? weakestTopic.topic_id}`
                : "Topik SPM"}
            </p>
            <div className="sambung-card-meta">
              {avgAccuracy !== null ? (
                <>
                  <span className="sambung-pill">{avgAccuracy}%</span>
                  <span>purata tepat</span>
                </>
              ) : (
                <span className="sambung-pill-muted">Mulakan diagnostik</span>
              )}
            </div>
          </div>
          <span className="sambung-card-arrow" aria-hidden="true">
            <ArrowIcon />
          </span>
        </button>

        {/* Exams card */}
        <button
          type="button"
          className="sambung-card sambung-card--exam"
          onClick={() => router.push("/exams")}
          aria-label="Sambung soalan peperiksaan"
        >
          <div className="sambung-card-icon" aria-hidden="true">
            <QuizIcon />
          </div>
          <div className="sambung-card-body">
            <p className="sambung-card-label">Peperiksaan</p>
            <p className="sambung-card-title">Soalan SPM Lepas</p>
            <div className="sambung-card-meta">
              {paperCount !== null ? (
                <>
                  <span className="sambung-pill">{paperCount}</span>
                  <span>kertas tersedia</span>
                </>
              ) : (
                <span className="sambung-pill-muted">{totalAttempts > 0 ? `${totalAttempts} soalan dijawab` : "Mula latihan"}</span>
              )}
            </div>
          </div>
          <span className="sambung-card-arrow" aria-hidden="true">
            <ArrowIcon />
          </span>
        </button>
      </div>
    </section>
  );
}

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function BookIcon() {
  return (
    <IconBase>
      <path d="M5 5.8c0-1 0.8-1.8 1.8-1.8H11v15H6.8A1.8 1.8 0 0 1 5 17.2V5.8Z" />
      <path d="M13 4h4.2c1 0 1.8.8 1.8 1.8v11.4c0 1-.8 1.8-1.8 1.8H13V4Z" />
    </IconBase>
  );
}

function QuizIcon() {
  return (
    <IconBase>
      <path d="M9 5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z" />
      <path d="m9 14 2 2 4-4" />
    </IconBase>
  );
}

function ProgressIcon() {
  return (
    <IconBase>
      <path d="M5 19V9M12 19V5M19 19v-7" />
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

function ArrowIcon() {
  return (
    <IconBase>
      <path d="M8 12h8M13 8l4 4-4 4" />
    </IconBase>
  );
}


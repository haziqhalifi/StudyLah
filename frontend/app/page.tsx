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
  const [chatInitialMsg, setChatInitialMsg] = useState<string | undefined>();
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [topics, setTopics] = useState<TopicStats[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSetSummary[]>([]);
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

  function openChat(topicKey: string, initialMsg?: string) {
    const topicId = TOPIC_NAME_MAP[topicKey] ?? "ubahan";
    setChatContext({
      topicId,
      topicName: TOPIC_DISPLAY_NAMES[topicKey] ?? "Ubahan (Variation)",
      pageContext: "general",
    });
    setChatInitialMsg(initialMsg);
    setChatOpen(true);
  }

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
      <FloatingAIButton onClick={() => setAiSheetOpen(true)} />
      <AIChatSheet
        open={aiSheetOpen}
        onClose={() => setAiSheetOpen(false)}
        onOpen={openChat}
      />
      <StudyBuddyChat
        userId={userId}
        isOpen={chatOpen}
        onClose={() => { setChatOpen(false); setChatInitialMsg(undefined); }}
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

function StudentHeader() {
  const [name, setName] = useState(DEFAULT_STUDENT.name);

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
        <h1>Hai, {name}</h1>
        <div className="student-meta-row">
          <span>{DEFAULT_STUDENT.form}</span>
        </div>
      </div>

      <div className="student-header-actions">
        <button
          className="notification-button"
          type="button"
          aria-label="Buka notifikasi"
        >
          <BellIcon />
          <span
            className="notification-dot"
            aria-label="Notifikasi belum dibaca"
          />
        </button>
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
  const levelLabel = progress === 0 && xp === 0 ? "Ini langkah pertama kamu menuju kejayaan!" : `${XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP ke Tahap ${level + 1}`;

  return (
    <section
      className="level-card"
      aria-label={`Kemajuan Tahap ${level}`}
    >
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
        <span className="fokus-meta-sep" aria-hidden="true">·</span>
        <span className="fokus-accuracy-dot" aria-hidden="true" />
        {pct}% ketepatan
      </p>
      <button
        type="button"
        className="fokus-cta"
        onClick={() => router.push(`/materials/${weakest.topic_id}/subtopics`)}
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
        <button type="button" className="progress-see-all" onClick={() => router.push("/progress")}>
          Lihat kemajuan
        </button>
      </div>
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
              onClick={() => router.push(`/materials/${t.topic_id}/subtopics`)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/materials/${t.topic_id}/subtopics`)}
              aria-label={`${meta.name} – ${pct}%`}
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
                <p className="progress-set-sub">
                  {i === 0 ? "Perlukan perhatian" : `${t.correct} / ${t.attempts} betul`}
                </p>
              </div>
              <span className="progress-set-arrow">›</span>
            </article>
          );
        })}
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

  const mastered = topics.filter((t) => t.level === "proficient" || t.level === "advanced").length;

  return (
    <div className="quick-stats-row">
      <div className="quick-stat-card">
        <span className="quick-stat-icon" aria-hidden="true">🔥</span>
        <span className="quick-stat-value">{streak}</span>
        <span className="quick-stat-label">Hari streak</span>
      </div>
      <div className="quick-stat-card">
        <span className="quick-stat-icon" aria-hidden="true">⭐</span>
        <span className="quick-stat-value">{mastered}</span>
        <span className="quick-stat-label">Topik mahir</span>
      </div>
      <div className="quick-stat-card">
        <span className="quick-stat-icon" aria-hidden="true">📚</span>
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
        <span className="quick-flashcard-empty-icon" aria-hidden="true">🃏</span>
        <div>
          <p className="quick-flashcard-empty-title">Tiada flashcard lagi</p>
          <p className="quick-flashcard-empty-sub">Tanya AI untuk jana flashcard baru →</p>
        </div>
      </button>
    );
  }

  const recent = sets.slice(0, 3);

  return (
    <div className="quick-flashcard-widget">
      <div className="quick-flashcard-header">
        <span className="quick-flashcard-title">🃏 Flashcard Saya</span>
        <button
          type="button"
          className="quick-flashcard-see-all"
          onClick={() => router.push("/progress")}
        >
          Lihat semua →
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
              <span className="quick-flashcard-item-count">{set.card_count} kad</span>
            </div>
            <span className="quick-flashcard-item-arrow" aria-hidden="true">›</span>
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
      <span aria-hidden="true">🤖</span>
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


function AIChatSheet({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (topicKey: string, msg?: string) => void;
}) {
  const [selectedTopic, setSelectedTopic] = useState<TopicKey>("ubahan");
  const [selectedMode, setSelectedMode] = useState<"notes" | "questions" | "flashcard">("notes");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const MODE_CHIPS: { key: "notes" | "questions" | "flashcard"; label: string; emoji: string }[] = [
    { key: "notes", label: "Nota", emoji: "\u{1F4DD}" },
    { key: "questions", label: "Soalan", emoji: "\u2753" },
    { key: "flashcard", label: "Flashcard", emoji: "\u{1F0CF}" },
  ];

  const TOPIC_CHIPS: { key: TopicKey; label: string }[] = [
    { key: "ubahan", label: "Ubahan" },
    { key: "matriks", label: "Matriks" },
    { key: "insurans", label: "Insurans" },
  ];

  const MODE_PROMPT: Record<"notes" | "questions" | "flashcard", string> = {
    notes: `Buat nota ringkas untuk topik ${TOPICS[selectedTopic].label} SPM`,
    questions: `Bagi saya 3 soalan latihan SPM untuk topik ${TOPICS[selectedTopic].label}`,
    flashcard: `Buat 3 flashcard soal-jawab untuk topik ${TOPICS[selectedTopic].label} SPM`,
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleSend() {
    const msg = draft.trim();
    if (!msg) return;
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    onClose();
    onOpen(selectedTopic, msg);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
  }

  return (
    <>
      <div
        className={`ai-sheet-backdrop${open ? " ai-sheet-backdrop--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`ai-sheet${open ? " ai-sheet--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Cikgu AI"
      >
        <div className="ai-sheet-handle" aria-hidden="true" />

        <div className="ai-chat-header">
          <div className="ai-chat-avatar" aria-hidden="true">AI</div>
          <div className="ai-chat-header-text">
            <h2>Tanya Tutor AI</h2>
            <p className="ai-chat-subtitle">Pilih topik &amp; bab untuk mulakan</p>
          </div>
          <button
            type="button"
            className="ai-chat-collapse-btn"
            onClick={onClose}
            aria-label="Tutup Cikgu AI"
          >
            {"\u2715"}
          </button>
        </div>

        <div className="ai-sheet-chip-group">
          <p className="ai-sheet-chip-label">Jenis</p>
          <div className="ai-chat-suggestions">
            {MODE_CHIPS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`ai-chat-chip${selectedMode === m.key ? " active" : ""}`}
                onClick={() => setSelectedMode(m.key)}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ai-sheet-chip-group">
          <p className="ai-sheet-chip-label">Topik</p>
          <div className="ai-chat-suggestions">
            {TOPIC_CHIPS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`ai-chat-chip${selectedTopic === t.key ? " active" : ""}`}
                onClick={() => setSelectedTopic(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="ai-sheet-go-btn"
          onClick={() => { onClose(); onOpen(selectedTopic, MODE_PROMPT[selectedMode]); }}
        >
          {"Mula \u2014 "}{MODE_CHIPS.find(m => m.key === selectedMode)?.emoji} {MODE_CHIPS.find(m => m.key === selectedMode)?.label} {" \u00B7 "}{TOPICS[selectedTopic].label}
        </button>

        <div className="ai-chat-input-wrap">
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            rows={1}
            placeholder={"Taip soalan kamu di sini\u2026"}
            value={draft}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="ai-chat-send"
            onClick={handleSend}
            disabled={!draft.trim()}
            aria-label="Hantar soalan"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}


const TOPIC_META: Record<string, { name: string }> = {
  ubahan:   { name: "Ubahan" },
  matriks:  { name: "Matriks" },
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

function CheckCircleIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
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

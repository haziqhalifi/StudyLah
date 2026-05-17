"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAssessment } from "@/lib/api";
import type { TopicStats } from "@/lib/api";
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
        <WeakTopicCard topics={topics} />
        <AIChatCard onOpenSheet={() => setAiSheetOpen(true)} />
      </section>
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
        <h1 style={{ paddingLeft: "0.5rem" }}>Helo, {name}</h1>
        <div className="student-meta-row" style={{ paddingLeft: "0.5rem" }}>
          <span>{DEFAULT_STUDENT.form}</span>
          <span>{xp} XP</span>
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
      onClick={() => router.push(`/materials/${weakest.topic_id}/subtopics`)}
      aria-label={`Fokus hari ini: ${name}`}
    >
      <span className="weak-topic-icon" aria-hidden="true">
        <TargetIcon />
      </span>
      <div className="weak-topic-body">
        <p className="weak-topic-label">Fokus Hari Ini</p>
        <p className="weak-topic-title">{name}</p>
        <div className="weak-topic-bar-wrap" aria-hidden="true">
          <div className="weak-topic-bar">
            <div className="weak-topic-bar-fill" style={{ "--fill": `${pct}%` } as React.CSSProperties} />
          </div>
          <span className="weak-topic-pct">{pct}% tepat</span>
        </div>
        <span className="weak-topic-cta">Ulangkaji sekarang ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â +10 XP</span>
      </div>
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


function AIChatCard({ onOpenSheet }: { onOpenSheet: () => void }) {
  return (
    <div
      className="ai-chat-collapsed"
      onClick={onOpenSheet}
      role="button"
      tabIndex={0}
      aria-label="Buka Skorrel"
      onKeyDown={(e) => e.key === "Enter" && onOpenSheet()}
    >
      <div className="ai-chat-avatar" aria-hidden="true">
        <img src="/assets/mascot.webp" alt="Skorrel" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <div className="ai-chat-collapsed-text">
        <p className="ai-chat-collapsed-title">Keliru dengan soalan? Tanya je.</p>
        <p className="ai-chat-collapsed-sub">Skorrel sedia membantu</p>
      </div>
      <div className="icb-input-wrap">
        <textarea
          className="icb-input"
          rows={1}
          placeholder={"Tanya soalan kamu di sini\u2026"}
          onFocus={onOpenSheet}
          readOnly
        />
        <button type="button" className="icb-send" disabled aria-label="Hantar">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
        </button>
      </div>
      <div className="icb-chips">
        <button type="button" className="icb-chip" onClick={onOpenSheet}><span aria-hidden="true">{"\u{1F4A1}"}</span>Hint Please</button>
        <button type="button" className="icb-chip" onClick={onOpenSheet}><span aria-hidden="true">{"\u{1F50D}"}</span>Step-by-Step</button>
        <button type="button" className="icb-chip" onClick={onOpenSheet}><span aria-hidden="true">{"\u{1F3AF}"}</span>Practice Quiz</button>
        <button type="button" className="icb-chip" onClick={onOpenSheet}><span aria-hidden="true">{"\u{1F4D6}"}</span>Teach Me This</button>
        <button type="button" className="icb-chip" onClick={onOpenSheet}><span aria-hidden="true">{"\u{1F9D1}\u200D\u{1F3EB}"}</span>Ask AI Coach</button>
      </div>
    </div>
  );
}

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
        aria-label="Skorrel"
      >
        <div className="ai-sheet-handle" aria-hidden="true" />

        <div className="ai-chat-header">
          <div className="ai-chat-avatar" aria-hidden="true">
            <img src="/assets/mascot.webp" alt="Skorrel" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div className="ai-chat-header-text">
            <h2>Tanya Skorrel</h2>
            <p className="ai-chat-subtitle">Pilih topik &amp; bab untuk mulakan</p>
          </div>
          <button
            type="button"
            className="ai-chat-collapse-btn"
            onClick={onClose}
            aria-label="Tutup Skorrel"
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

function TargetIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
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
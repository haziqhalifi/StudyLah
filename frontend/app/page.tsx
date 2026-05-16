"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { postStudyBuddyMessage, getAssessment, getPapers } from "@/lib/api";
import type { ChatMessage, TopicStats, Paper } from "@/lib/api";

const student = {
  name: "Amir",
  form: "Form 4",
  progress: 10,
  level: 1,
  xp: 180,
  streak: 1,
};

const quickActions = [
  { label: "Ambil Kuiz", icon: QuizIcon, href: "/exams", color: "#7f65ff" },
  { label: "Bahan", icon: BookIcon, href: "/materials", color: "#ff8dc0" },
  {
    label: "Kemajuan",
    icon: ProgressIcon,
    href: "/progress",
    color: "#5bd4bc",
  },
] as const;

export default function Home() {
  return <HomeDashboard />;
}

function HomeDashboard() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialMsg, setDrawerInitialMsg] = useState("");

  useEffect(() => {
    try {
      const uid = sessionStorage.getItem("userId");
      const shown = localStorage.getItem("onboardingDiagnosticShown");
      if (uid && !shown) {
        localStorage.setItem("onboardingDiagnosticShown", "1");
        router.push("/diagnostic");
      }
    } catch {
      // ignore storage errors in restricted environments
    }
  }, [router]);

  function openChat(initialMsg = "") {
    setDrawerInitialMsg(initialMsg);
    setDrawerOpen(true);
  }

  return (
    <>
      <section
        className="home-dashboard-shell page-enter"
        aria-label="Student home dashboard"
      >
        <StudentHeader />
        <LevelProgressCard />
        <QuickActionsRow />
        <AIChatCard onOpen={openChat} />
        <RecentSessionCard />
      </section>
      <ChatDrawer
        open={drawerOpen}
        initialMessage={drawerInitialMsg}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

function StudentHeader() {
  return (
    <header className="student-header">
      <div className="student-header-copy">
        <h1>Hello, {student.name}</h1>
        <div className="student-meta-row">
          <span>{student.form}</span>
          <span aria-hidden="true">•</span>
          <span>{student.xp} XP</span>
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
  return (
    <section
      className="level-card"
      aria-label={`Level ${student.level} progress`}
    >
      <div className="level-card-content">
        <p className="level-eyebrow">Level {student.level}</p>
        <h2>This is your first step to greatness!</h2>
        <div className="level-progress-row">
          <div className="level-progress-track" aria-hidden="true">
            <div
              className="level-progress-fill"
              style={{ width: `${student.progress}%` }}
            >
              <span className="level-progress-dot" />
            </div>
          </div>
          <span>{student.progress}%</span>
        </div>
      </div>
      <div className="level-trophy" aria-hidden="true">
        <TrophyIcon />
      </div>
    </section>
  );
}

function QuickActionsRow() {
  const router = useRouter();
  return (
    <div className="quick-actions-row" aria-label="Quick actions">
      {quickActions.map(({ label, icon: Icon, href, color }) => (
        <button
          key={label}
          type="button"
          className="quick-action-btn"
          data-color={color}
          onClick={() => router.push(href)}
        >
          <span className="quick-action-icon">
            <Icon />
          </span>
          <span>{label}</span>
        </button>
      ))}
    </div>
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

const CHAT_CHIPS: { label: string; message: string; topic: TopicKey }[] = [
  { label: "Ubahan Langsung", message: "Terangkan ubahan langsung dengan contoh", topic: "ubahan" },
  { label: "Matriks Songsang", message: "Macam mana nak cari matriks songsang 2×2?", topic: "matriks" },
  { label: "Kiraan Premium", message: "Terangkan cara kira premium insurans", topic: "insurans" },
];

function AIChatCard({ onOpen }: { onOpen: (msg?: string) => void }) {
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
        onClick={() => onOpen()}
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
            onClick={() => onOpen(chip.message)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function ChatDrawer({
  open,
  initialMessage,
  onClose,
}: {
  open: boolean;
  initialMessage: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // When drawer opens with a pre-filled message, send it immediately
  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 100);
    if (initialMessage) {
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMessage]);

  // Reset messages when drawer closes
  useEffect(() => {
    if (!open) setMessages([]);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(next);
    setLoading(true);
    try {
      const userId =
        (typeof window !== "undefined" && sessionStorage.getItem("userId")) ||
        "guest";
      const res = await postStudyBuddyMessage(userId, next);
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Maaf, ada ralat. Cuba lagi." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`chat-drawer-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div
        className={`chat-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-label="AI Tutor Chat"
        aria-modal="true"
      >
        <div className="chat-drawer-handle" aria-hidden="true" />
        <header className="chat-drawer-header">
          <div className="chat-drawer-avatar" aria-hidden="true">
            AI
          </div>
          <div>
            <h2>Tutor AI</h2>
            <p>StudyBuddy — sedia membantu</p>
          </div>
          <button
            type="button"
            className="chat-drawer-close"
            onClick={onClose}
            aria-label="Tutup chat"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="chat-drawer-messages">
          {messages.length === 0 && !loading && (
            <div className="chat-drawer-empty">
              <p>Tanya apa sahaja tentang pelajaran anda!</p>
              <div className="ai-chat-suggestions">
                {CHAT_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className="ai-chat-chip"
                    onClick={() => sendMessage(chip.message)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble chat-bubble-ai chat-bubble-typing">
              <span />
              <span />
              <span />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className="chat-drawer-input-row" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="ai-chat-input"
            type="text"
            placeholder="Tanya soalan..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Chat input"
            disabled={loading}
          />
          <button
            type="submit"
            className="ai-chat-send"
            aria-label="Hantar"
            disabled={loading || !input.trim()}
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </>
  );
}

function RecentSessionCard() {
  const router = useRouter();
  return (
    <section
      className="recent-session-card"
      aria-label="Continue recent session"
    >
      <div className="recent-session-info">
        <p className="recent-session-label">Sambung semula</p>
        <h3>Kuiz Matematik</h3>
        <div className="recent-session-meta">
          <span className="recent-session-progress-pill">25%</span>
          <span>selesai</span>
        </div>
      </div>
      <button
        type="button"
        className="recent-session-btn"
        aria-label="Continue quiz"
        onClick={() => router.push("/exams")}
      >
        <ArrowIcon />
      </button>
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

function SendIcon() {
  return (
    <IconBase>
      <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" />
    </IconBase>
  );
}

function CloseIcon() {
  return (
    <IconBase>
      <path d="M18 6 6 18M6 6l12 12" />
    </IconBase>
  );
}

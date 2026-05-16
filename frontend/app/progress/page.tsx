"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssessment, TopicStats } from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOPIC_META: Record<string, { name: string; emoji: string }> = {
  ubahan:   { name: "Ubahan",   emoji: "📐" },
  matriks:  { name: "Matriks",  emoji: "🔢" },
  insurans: { name: "Insurans", emoji: "🛡️" },
};

// Map the four DB levels → the three AI-engine buckets for display
type DisplayLevel = "weak" | "okay" | "strong";

function toDisplayLevel(level: TopicStats["level"]): DisplayLevel {
  if (level === "beginner") return "weak";
  if (level === "advanced" || level === "proficient") return "strong";
  return "okay";
}

const LEVEL_CONFIG: Record<DisplayLevel, { label: string; bar: string; badge: string }> = {
  weak:   { label: "Weak",   bar: "bg-red-400",    badge: "bg-red-100 text-red-700"    },
  okay:   { label: "Okay",   bar: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700" },
  strong: { label: "Strong", bar: "bg-emerald-500",badge: "bg-emerald-100 text-emerald-700" },
};

// Generate a single "AI buddy" sentence across all three topics
function buildBuddySentence(topics: TopicStats[]): string {
  if (topics.length === 0) return "Complete the diagnostic to get started!";

  const sorted = [...topics].sort((a, b) => a.accuracy - b.accuracy);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  const weakName  = TOPIC_META[weakest.topic_id]?.name  ?? weakest.topic_id;
  const strongName = TOPIC_META[strongest.topic_id]?.name ?? strongest.topic_id;

  if (weakest.topic_id === strongest.topic_id) {
    return `Keep it up — you're making progress in ${weakName}! 🎯`;
  }

  const weakDisplay = toDisplayLevel(weakest.level);
  if (weakDisplay === "weak") {
    return `Let's focus on ${weakName} first, then keep reinforcing ${strongName}. You've got this! 💪`;
  }
  if (weakDisplay === "okay") {
    return `${weakName} is coming along — push it to Strong and you'll be well-rounded. Keep going! 🚀`;
  }
  return `You're strong across the board! A quick review of ${weakName} will keep things sharp. ✨`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TopicCard({ topic }: { topic: TopicStats }) {
  const meta   = TOPIC_META[topic.topic_id] ?? { name: topic.topic_id, emoji: "📚" };
  const dlevel = toDisplayLevel(topic.level);
  const cfg    = LEVEL_CONFIG[dlevel];
  const pct    = Math.round(topic.accuracy * 100);

  return (
    <div className="card topic-card page-enter" style={{ marginBottom: "0.75rem" }}>
      {/* Header row */}
      <div className="topic-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>{meta.emoji}</span>
          <div>
            <h3 className="font-display topic-card-title">{meta.name}</h3>
            <p className="topic-card-sub">
              {topic.attempts} attempted · {topic.correct} correct
            </p>
          </div>
        </div>
        {/* Level badge */}
        <span
          className={`chip ${cfg.badge}`}
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.2rem 0.55rem",
            borderRadius: "999px",
          }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: "0.75rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: "var(--color-muted, #6b7280)",
            marginBottom: "0.3rem",
          }}
        >
          <span>Accuracy</span>
          <span style={{ fontWeight: 700 }}>{pct}%</span>
        </div>
        <div
          className="progress-track"
          style={{ height: "8px", borderRadius: "999px", background: "#e5e7eb", overflow: "hidden" }}
        >
          <div
            className={`${cfg.bar}`}
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: "999px",
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>

      {/* Next milestone hint */}
      {dlevel === "weak" && (
        <p className="topic-card-next" style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#6b7280" }}>
          Reach 40% accuracy to move to Okay ›
        </p>
      )}
      {dlevel === "okay" && (
        <p className="topic-card-next" style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#6b7280" }}>
          Reach 70% accuracy to move to Strong ›
        </p>
      )}
    </div>
  );
}

function BuddyBubble({ message }: { message: string }) {
  return (
    <div
      className="buddy-bubble page-enter"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.6rem",
        padding: "0.85rem 1rem",
        background: "var(--color-surface-alt, #f0f4ff)",
        borderRadius: "1rem",
        marginBottom: "1.25rem",
      }}
    >
      <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>🤖</span>
      <p
        className="buddy-bubble-text"
        style={{ fontSize: "0.88rem", lineHeight: 1.5, margin: 0 }}
      >
        {message}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock data — used when the user has no attempts yet (demo convenience)
// ---------------------------------------------------------------------------

const MOCK_TOPICS: TopicStats[] = [
  { topic_id: "ubahan",   accuracy: 0.4,  attempts: 10, correct: 4,  level: "developing" },
  { topic_id: "matriks",  accuracy: 0.2,  attempts: 10, correct: 2,  level: "beginner"   },
  { topic_id: "insurans", accuracy: 0.75, attempts: 8,  correct: 6,  level: "proficient" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProgressPage() {
  const router = useRouter();
  const [topics, setTopics]   = useState<TopicStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [name, setName]       = useState("");

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    const n      = sessionStorage.getItem("userName") ?? "";
    setName(n);

    if (!userId) {
      router.push("/");
      return;
    }

    // TODO: replace with real API call once the backend is deployed
    getAssessment(userId)
      .then((res) => {
        if (res.topics.length === 0) {
          // No attempts yet — show mock data so the page is useful in the demo
          setTopics(MOCK_TOPICS);
          setUsingMock(true);
        } else {
          setTopics(res.topics);
        }
      })
      .catch(() => {
        // Fallback to mock data if the API is unavailable (e.g. local dev without backend)
        setTopics(MOCK_TOPICS);
        setUsingMock(true);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const buddyMsg = buildBuddySentence(topics);

  if (loading) return <LoadingShell />;

  return (
    <div className="page-enter" style={{ padding: "0 0 6rem" }}>
      {/* Header */}
      <div
        className="assessment-header"
        style={{ marginBottom: "1.25rem" }}
      >
        <h1 className="font-display assessment-title" style={{ fontSize: "1.45rem" }}>
          {name ? `${name}'s Progress` : "Your Progress"}
        </h1>
        <p className="assessment-sub" style={{ fontSize: "0.85rem", color: "#6b7280" }}>
          Based on your practice sessions across all three topics.
        </p>
        {usingMock && (
          <p
            style={{
              fontSize: "0.72rem",
              color: "#9ca3af",
              marginTop: "0.25rem",
              fontStyle: "italic",
            }}
          >
            (Showing sample data — complete the diagnostic to see your real progress.)
          </p>
        )}
      </div>

      {/* AI buddy sentence */}
      <BuddyBubble message={buddyMsg} />

      {/* Topic cards */}
      {topics.map((t) => (
        <TopicCard key={t.topic_id} topic={t} />
      ))}

      {/* Actions */}
      <div
        className="assessment-actions"
        style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "1.5rem" }}
      >
        <button
          type="button"
          className="btn-primary"
          onClick={() => router.push("/learn")}
        >
          Continue Learning →
        </button>
        <button
          type="button"
          className="btn-ghost diag-skip-btn"
          onClick={() => router.push("/review")}
        >
          Review Weak Topics ↺
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingShell() {
  return (
    <div className="page-enter">
      <div className="assessment-header">
        <div className="skeleton-title" />
        <div className="skeleton-sub" />
      </div>
      <div style={{ height: "72px", borderRadius: "1rem", background: "#e5e7eb", marginBottom: "1.25rem" }} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="card topic-card skeleton-card-sm" style={{ marginBottom: "0.75rem" }} />
      ))}
    </div>
  );
}

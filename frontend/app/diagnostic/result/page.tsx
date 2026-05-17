"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchDiagnosticResult,
  createPersonalizedQuiz,
  type DiagnosticResult,
  type TopicDiagnostic,
  type DiagnosticRecommendation,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function levelColor(level: "weak" | "okay" | "strong") {
  if (level === "strong") return "bg-emerald-500";
  if (level === "okay") return "bg-amber-500";
  return "bg-red-500";
}

function levelBadgeClass(level: "weak" | "okay" | "strong") {
  if (level === "strong")
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  if (level === "okay")
    return "bg-amber-100 text-amber-800 border border-amber-200";
  return "bg-red-100 text-red-800 border border-red-200";
}

function levelLabel(level: "weak" | "okay" | "strong") {
  if (level === "strong") return "Strong";
  if (level === "okay") return "Okay";
  return "Needs work";
}

function summaryInterpretation(overallAccuracy: number, topics: TopicDiagnostic[]) {
  const weakTopics = topics.filter((t) => t.level === "weak").map((t) => t.topicName);
  const okayTopics = topics.filter((t) => t.level === "okay").map((t) => t.topicName);
  const strongTopics = topics.filter((t) => t.level === "strong").map((t) => t.topicName);

  if (strongTopics.length === topics.length) return "You're off to a great start across all topics!";
  if (weakTopics.length === 0 && okayTopics.length > 0)
    return `You're doing well — focus on polishing ${okayTopics.join(" and ")} to level up.`;
  if (weakTopics.length > 0 && okayTopics.length === 0 && strongTopics.length === 0)
    return `We'll focus on building your basics in ${weakTopics.join(", ")}.`;

  const parts: string[] = [];
  if (strongTopics.length > 0) parts.push(`strong in ${strongTopics.join(", ")}`);
  if (okayTopics.length > 0) parts.push(`okay in ${okayTopics.join(", ")}`);
  if (weakTopics.length > 0) parts.push(`${weakTopics.join(" and ")} need more practice`);
  return `You're ${parts.join(", but ")}.`;
}

function friendlyHeadline(overallAccuracy: number) {
  if (overallAccuracy >= 0.8) return "Excellent work! Here's your starting point.";
  if (overallAccuracy >= 0.5) return "Good job! Here's your starting point.";
  return "Nice effort! Here's your starting point.";
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 ${className ?? ""}`}
    />
  );
}

function ResultSkeleton() {
  return (
    <div className="page-enter" style={{ padding: "1.5rem", maxWidth: 600, margin: "0 auto" }}>
      <Skeleton className="h-8 w-3/4 mb-3" />
      <Skeleton className="h-5 w-full mb-1" />
      <Skeleton className="h-5 w-2/3 mb-8" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full mb-4" />
      ))}
      <Skeleton className="h-36 w-full mb-4" />
      <Skeleton className="h-12 w-full mb-3" />
      <Skeleton className="h-10 w-2/3 mx-auto" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topic card
// ---------------------------------------------------------------------------

function TopicCard({ topic }: { topic: TopicDiagnostic }) {
  const pct = Math.round(topic.accuracy * 100);
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "1rem 1.25rem",
        boxShadow: "var(--shadow-card)",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
        {/* Left: name + badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)" }}>
              {topic.topicName}
            </span>
            <span
              className={levelBadgeClass(topic.level)}
              style={{ fontSize: "0.7rem", fontWeight: 600, borderRadius: 999, padding: "2px 8px" }}
            >
              {levelLabel(topic.level)}
            </span>
            {topic.level === "weak" && (
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: "2px 7px",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  letterSpacing: "0.03em",
                }}
              >
                High priority
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
            {pct}% correct &middot; {topic.attempts} question{topic.attempts !== 1 ? "s" : ""}
          </p>
          {/* Accuracy bar */}
          <div
            style={{
              width: "100%",
              height: 6,
              background: "#e2e8f0",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              className={levelColor(topic.level)}
              style={{ height: "100%", width: `${pct}%`, borderRadius: 999, transition: "width 0.6s ease" }}
            />
          </div>
        </div>

        {/* Right: large pct */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color:
                topic.level === "strong"
                  ? "#059669"
                  : topic.level === "okay"
                  ? "#d97706"
                  : "#dc2626",
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommendation card
// ---------------------------------------------------------------------------

function RecommendationCard({
  rec,
  topicName,
  isPrimary,
  userId,
  onStart,
  starting,
}: {
  rec: DiagnosticRecommendation;
  topicName: string;
  isPrimary: boolean;
  userId: string;
  onStart: (quizId: string) => void;
  starting: boolean;
}) {
  return (
    <div
      style={{
        background: isPrimary ? "var(--brand-light)" : "var(--card)",
        border: isPrimary ? "1.5px solid var(--brand-muted)" : "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "1.1rem 1.25rem",
        boxShadow: isPrimary ? "var(--shadow-brand)" : "var(--shadow-card)",
        marginBottom: "0.75rem",
      }}
    >
      <p
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: isPrimary ? "var(--brand)" : "var(--muted)",
          marginBottom: "0.3rem",
        }}
      >
        {isPrimary ? "Coach recommends" : "Then try"}
      </p>
      <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)", marginBottom: "0.4rem" }}>
        {rec.title}
      </p>
      <p style={{ fontSize: "0.85rem", color: "var(--ink-2)", lineHeight: 1.55, marginBottom: "0.9rem" }}>
        {rec.message}
      </p>
      <button
        type="button"
        className={isPrimary ? "btn-primary" : "btn-ghost"}
        disabled={starting}
        onClick={() => onStart(rec.topicId)}
        style={{ width: "100%" }}
      >
        {starting
          ? "Creating quiz…"
          : isPrimary
          ? `Start ${topicName} quiz now →`
          : `Do ${topicName} later`}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DiagnosticResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [startingTopicId, setStartingTopicId] = useState<string | null>(null);

  const userId =
    typeof window !== "undefined" ? sessionStorage.getItem("userId") ?? "" : "";

  async function load() {
    if (!userId) {
      router.push("/");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchDiagnosticResult(userId);
      setResult(data);
    } catch {
      setError("I couldn't load your diagnostic results. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartQuiz(topicId: string) {
    if (!userId || !result) return;
    setStartingTopicId(topicId);
    try {
      const rec =
        result.mainRecommendation.topicId === topicId
          ? result.mainRecommendation
          : result.secondaryRecommendation;
      const numQuestions = rec?.suggestedQuizLength ?? 5;
      const quiz = await createPersonalizedQuiz(
        userId,
        topicId as "ubahan" | "matriks" | "insurans",
        numQuestions,
      );
      router.push(`/quiz/${quiz.quizId}`);
    } catch {
      setStartingTopicId(null);
      setError("Failed to create quiz. Please try again.");
    }
  }

  function topicNameFor(topicId: string) {
    return result?.topics.find((t) => t.topicId === topicId)?.topicName ?? topicId;
  }

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) return <ResultSkeleton />;

  // ---------------------------------------------------------------------------
  // Render: error
  // ---------------------------------------------------------------------------

  if (error || !result) {
    return (
      <div
        className="page-enter"
        style={{
          padding: "2rem 1.5rem",
          maxWidth: 480,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>😕</div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--ink)",
            marginBottom: "0.5rem",
          }}
        >
          Something went wrong
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          {error || "I couldn't load your diagnostic results. Please try again."}
        </p>
        <button type="button" className="btn-primary" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: full result
  // ---------------------------------------------------------------------------

  const pctCorrect = Math.round(result.overallAccuracy * 100);
  const isStartingMain = startingTopicId === result.mainRecommendation.topicId;

  return (
    <div
      className="page-enter"
      style={{ padding: "1.5rem", maxWidth: 600, margin: "0 auto", paddingBottom: "6rem" }}
    >
      {/* ── Summary ─────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.6rem",
            fontWeight: 800,
            color: "var(--ink)",
            lineHeight: 1.2,
            marginBottom: "0.5rem",
          }}
        >
          Diagnostic complete
        </h1>
        <p style={{ color: "var(--ink-2)", fontSize: "0.95rem", marginBottom: "0.3rem" }}>
          You got{" "}
          <strong>
            {result.correctQuestions} out of {result.totalQuestions}
          </strong>{" "}
          questions correct ({pctCorrect}%).
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.5 }}>
          {summaryInterpretation(result.overallAccuracy, result.topics)}
        </p>
      </div>

      {/* ── Topic cards ─────────────────────────────────────── */}
      <section style={{ marginBottom: "1.75rem" }}>
        <h2
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "0.75rem",
          }}
        >
          Your topic results
        </h2>
        {result.topics.map((topic) => (
          <TopicCard key={topic.topicId} topic={topic} />
        ))}
      </section>

      {/* ── Recommendations ─────────────────────────────────── */}
      <section style={{ marginBottom: "1.75rem" }}>
        <h2
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "0.75rem",
          }}
        >
          Personalised next steps
        </h2>

        <RecommendationCard
          rec={result.mainRecommendation}
          topicName={topicNameFor(result.mainRecommendation.topicId)}
          isPrimary
          userId={userId}
          onStart={handleStartQuiz}
          starting={isStartingMain}
        />

        {result.secondaryRecommendation && (
          <RecommendationCard
            rec={result.secondaryRecommendation}
            topicName={topicNameFor(result.secondaryRecommendation.topicId)}
            isPrimary={false}
            userId={userId}
            onStart={handleStartQuiz}
            starting={startingTopicId === result.secondaryRecommendation.topicId}
          />
        )}
      </section>

      {/* ── Bottom actions ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          alignItems: "stretch",
        }}
      >
        <button
          type="button"
          className="btn-primary"
          disabled={!!startingTopicId}
          onClick={() => handleStartQuiz(result.mainRecommendation.topicId)}
        >
          {isStartingMain ? "Creating quiz…" : "Start personalised practice →"}
        </button>

        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push("/dashboard")}
          style={{ textAlign: "center" }}
        >
          Go to dashboard
        </button>

        <button
          type="button"
          onClick={() => router.push("/diagnostic/report")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--brand)",
            fontSize: "0.85rem",
            textDecoration: "underline",
            textAlign: "center",
            padding: "0.25rem",
          }}
        >
          View detailed breakdown →
        </button>
      </div>

      {error && (
        <p
          style={{
            marginTop: "1rem",
            color: "var(--wrong)",
            fontSize: "0.85rem",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

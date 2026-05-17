"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchDiagnosticResult,
  createPersonalizedQuiz,
  type DiagnosticResult,
  type TopicDiagnostic,
  type DiagnosticRecommendation,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Tier system: 0–30% NEEDS WORK | 31–60% IMPROVING | 61–85% GOOD | 86–100% STRONG
// ---------------------------------------------------------------------------

type Tier = "needs-work" | "improving" | "good" | "strong";

function getTier(accuracy: number): Tier {
  if (accuracy <= 0.30) return "needs-work";
  if (accuracy <= 0.60) return "improving";
  if (accuracy <= 0.85) return "good";
  return "strong";
}

const TIER_CONFIG: Record<
  Tier,
  { emoji: string; label: string; badgeBg: string; badgeText: string; badgeBorder: string; barColor: string }
> = {
  "needs-work": {
    emoji: "🔴",
    label: "NEEDS WORK",
    badgeBg: "#fef2f2",
    badgeText: "#b91c1c",
    badgeBorder: "#fecaca",
    barColor: "#ef4444",
  },
  improving: {
    emoji: "🟡",
    label: "IMPROVING",
    badgeBg: "#fffbeb",
    badgeText: "#92400e",
    badgeBorder: "#fde68a",
    barColor: "#f59e0b",
  },
  good: {
    emoji: "🟢",
    label: "GOOD",
    badgeBg: "#ecfdf5",
    badgeText: "#065f46",
    badgeBorder: "#a7f3d0",
    barColor: "#10b981",
  },
  strong: {
    emoji: "⭐",
    label: "STRONG",
    badgeBg: "#ede9fe",
    badgeText: "#4c1d95",
    badgeBorder: "#c4b5fd",
    barColor: "#7c3aed",
  },
};

// ---------------------------------------------------------------------------
// Score framing copy
// ---------------------------------------------------------------------------

function scoreContextLine(pct: number): string {
  if (pct <= 15)
    return "Most students score 10–20% on their first try — you're right where everyone starts.";
  if (pct <= 30)
    return "Most students score 15–25% on their first try — you're right on track!";
  if (pct <= 50)
    return "You're scoring above average for a first attempt. Good foundation!";
  if (pct <= 70)
    return "Solid first attempt! You already know more than most incoming students.";
  return "Impressive start! You're well ahead of the curve.";
}

// ---------------------------------------------------------------------------
// AI Diagnosis copy — specific, single-topic
// ---------------------------------------------------------------------------

function buildAiDiagnosis(_topics: TopicDiagnostic[], weakestTopic: TopicDiagnostic): string {
  const name = weakestTopic.topicName;
  const pct = Math.round(weakestTopic.accuracy * 100);
  if (pct === 0) {
    return `${name} is your biggest growth opportunity right now — you haven't had a chance to practise it yet. Start with short 5-min drills on ${name} to build a strong foundation before moving on.`;
  }
  if (pct <= 30) {
    return `${name} needs the most attention (${pct}% correct). Start with short 5-min drills on ${name} to lock in the basics before tackling harder questions.`;
  }
  return `${name} is your weakest area at ${pct}%. A focused 10-min review session on ${name} will help you close this gap quickly.`;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200 ${className ?? ""}`} />
  );
}

function ResultSkeleton() {
  return (
    <div className="page-enter dr-page">
      <Skeleton className="h-40 w-full mb-4 rounded-2xl" />
      <Skeleton className="h-5 w-3/4 mb-6" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full mb-3" />
      ))}
      <Skeleton className="h-32 w-full mb-3" />
      <Skeleton className="h-20 w-full mb-4" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score circle header
// ---------------------------------------------------------------------------

function ScoreHeader({
  correct,
  total,
  pct,
  userName,
}: {
  correct: number;
  total: number;
  pct: number;
  userName?: string;
}) {
  const isLowScore = pct < 30;
  const r = 46;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;

  return (
    <div className="dr-header">
      <span className="dr-xp-pill">+50 XP ✨</span>

      <div className="dr-header-row">
        {/* SVG donut */}
        <div className="dr-circle-wrap">
          <svg
            width="110"
            height="110"
            viewBox="0 0 110 110"
            className="dr-circle-svg"
          >
            <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
            <circle
              cx="55"
              cy="55"
              r={r}
              fill="none"
              stroke="#fff"
              strokeWidth="10"
              strokeDasharray={`${fill} ${circ}`}
              strokeLinecap="round"
              className="dr-circle-arc"
            />
          </svg>
          <div className="dr-circle-inner">
            <span className="dr-circle-pct">{pct}%</span>
            <span className="dr-circle-frac">{correct}/{total}</span>
          </div>
        </div>

        {/* Right copy */}
        <div className="dr-header-copy">
          <p className="dr-greeting">
            {userName ? `Great start, ${userName}! 🎉` : "Great start! 🎉"}
          </p>
          <p className="dr-ready-line">Your personalised diagnosis is ready.</p>
          <p className="dr-context-line">{scoreContextLine(pct)}</p>
        </div>
      </div>

      {isLowScore && (
        <div className="dr-low-score-banner">
          <span className="dr-low-score-icon">💪</span>
          <span>
            Don&apos;t worry — this is just the starting line. Your path is now personalised for you.
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topic card (tiered)
// ---------------------------------------------------------------------------

function TopicCard({
  topic,
  isBest,
}: {
  topic: TopicDiagnostic;
  isBest: boolean;
}) {
  const pct = Math.round(topic.accuracy * 100);
  const tier = getTier(topic.accuracy);
  const cfg = TIER_CONFIG[tier];
  const isZero = topic.accuracy === 0;

  return (
    <div className={`dr-topic-card${isBest ? " dr-topic-card--best" : ""}`}>
      {isBest && <span className="dr-best-tag">📌 Best topic so far</span>}

      <div className="dr-topic-inner">
        <div className="dr-topic-left">
          <div className={`dr-topic-name-row${isBest ? " dr-topic-name-row--offset" : ""}`}>
            <span className="dr-topic-name">{topic.topicName}</span>
            <span
              className="dr-tier-badge"
              style={
                {
                  "--tier-bg": cfg.badgeBg,
                  "--tier-text": cfg.badgeText,
                  "--tier-border": cfg.badgeBorder,
                } as React.CSSProperties
              }
            >
              {cfg.emoji} {cfg.label}
            </span>
          </div>

          <p className="dr-topic-meta">
            {isZero ? "No answers yet" : `${pct}% correct`} &middot;{" "}
            {topic.attempts} question{topic.attempts !== 1 ? "s" : ""}
          </p>

          <div className="dr-bar-track">
            {isZero ? (
              <div className="dr-bar-zero" />
            ) : (
              <div
                className="dr-bar-fill"
                style={
                  {
                    "--bar-width": `${pct}%`,
                    "--bar-color": cfg.barColor,
                  } as React.CSSProperties
                }
              />
            )}
          </div>

          {isZero && <p className="dr-zero-label">Not enough data yet</p>}
        </div>

        <div className="dr-topic-pct">
          <span
            className="dr-pct-num"
            style={
              {
                "--pct-color": isZero ? "#f87171" : cfg.barColor,
              } as React.CSSProperties
            }
          >
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Diagnosis card
// ---------------------------------------------------------------------------

function AiDiagnosisCard({ copy }: { copy: string }) {
  return (
    <div className="dr-ai-card">
      <p className="dr-ai-label">🤖 AI Diagnosis</p>
      <p className="dr-ai-copy">{copy}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Next Step card
// ---------------------------------------------------------------------------

function NextStepCard({
  rec,
  topicName,
  onStart,
  starting,
}: {
  rec: DiagnosticRecommendation;
  topicName: string;
  onStart: () => void;
  starting: boolean;
}) {
  return (
    <div className="dr-next-card">
      <p className="dr-next-label">Next Step</p>
      <p className="dr-next-title">
        → First lesson:{" "}
        <span className="dr-next-title-accent">{topicName}</span>
        {rec.title ? ` – ${rec.title}` : ""}
      </p>
      <p className="dr-next-body">
        {rec.message ||
          `Start with ${rec.suggestedQuizLength} focused questions (~${rec.suggestedQuizLength} min).`}
      </p>
      <button
        type="button"
        className="btn-primary dr-full-btn"
        disabled={starting}
        onClick={onStart}
      >
        {starting ? "Creating quiz…" : "Start My Learning Path →"}
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
  const userName =
    typeof window !== "undefined" ? sessionStorage.getItem("userName") ?? "" : "";

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
      setError("Diagnostic results could not be loaded. Please try again.");
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
      const isMain = result.mainRecommendation.topicId === topicId;
      const rec = isMain ? result.mainRecommendation : result.secondaryRecommendation;
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

  // ── loading ───────────────────────────────────────────────────────────────

  if (loading) return <ResultSkeleton />;

  // ── error ─────────────────────────────────────────────────────────────────

  if (error || !result) {
    return (
      <div className="page-enter dr-error-page">
        <div className="dr-error-emoji">😕</div>
        <h2 className="dr-error-title">Something went wrong</h2>
        <p className="dr-error-body">
          {error || "Diagnostic results could not be loaded. Please try again."}
        </p>
        <button type="button" className="btn-primary" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  // ── derived data ──────────────────────────────────────────────────────────

  const pctCorrect = Math.round(result.overallAccuracy * 100);

  const bestTopicId = [...result.topics].sort((a, b) => b.accuracy - a.accuracy)[0]?.topicId;
  const weakestTopic = [...result.topics].sort((a, b) => a.accuracy - b.accuracy)[0];

  const mainTopicName =
    result.topics.find((t) => t.topicId === result.mainRecommendation.topicId)?.topicName ??
    result.mainRecommendation.topicId;

  const aiDiagnosisCopy = weakestTopic
    ? buildAiDiagnosis(result.topics, weakestTopic)
    : result.mainRecommendation.message;

  const isStartingMain = startingTopicId === result.mainRecommendation.topicId;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-enter dr-page">
      {/* Score header */}
      <ScoreHeader
        correct={result.correctQuestions}
        total={result.totalQuestions}
        pct={pctCorrect}
        userName={userName || undefined}
      />

      {/* Topic breakdown */}
      <section className="dr-section">
        <h2 className="dr-section-label">Topic Breakdown</h2>
        {result.topics.map((topic) => (
          <TopicCard
            key={topic.topicId}
            topic={topic}
            isBest={topic.topicId === bestTopicId}
          />
        ))}
      </section>

      {/* AI Diagnosis */}
      <AiDiagnosisCard copy={aiDiagnosisCopy} />

      {/* Next Step */}
      <NextStepCard
        rec={result.mainRecommendation}
        topicName={mainTopicName}
        onStart={() => handleStartQuiz(result.mainRecommendation.topicId)}
        starting={isStartingMain}
      />

      {/* Secondary recommendation */}
      {result.secondaryRecommendation && (
        <div className="dr-secondary-card">
          <p className="dr-secondary-label">Also consider</p>
          <p className="dr-secondary-body">{result.secondaryRecommendation.message}</p>
          <button
            type="button"
            className="btn-ghost dr-full-btn"
            disabled={!!startingTopicId}
            onClick={() => handleStartQuiz(result.secondaryRecommendation!.topicId)}
          >
            {startingTopicId === result.secondaryRecommendation.topicId
              ? "Creating quiz…"
              : `Try ${result.topics.find((t) => t.topicId === result.secondaryRecommendation!.topicId)?.topicName ?? ""} later`}
          </button>
        </div>
      )}

      {/* Bottom actions */}
      <div className="dr-bottom-actions">
        <button
          type="button"
          className="btn-ghost dr-dashboard-btn"
          onClick={() => router.push("/dashboard")}
        >
          Go to dashboard
        </button>
        <button
          type="button"
          className="dr-link-btn"
          onClick={() => router.push("/diagnostic/report")}
        >
          View detailed breakdown →
        </button>
      </div>

      {error && <p className="dr-error">{error}</p>}
    </div>
  );
}

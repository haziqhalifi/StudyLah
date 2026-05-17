"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchDiagnosticResult,
  createPersonalizedQuiz,
  type DiagnosticResult,
  type TopicDiagnostic,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Tier system
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
    label: "PERLU KERJA",
    badgeBg: "#fef2f2",
    badgeText: "#b91c1c",
    badgeBorder: "#fecaca",
    barColor: "#ef4444",
  },
  improving: {
    emoji: "🟡",
    label: "MENINGKAT",
    badgeBg: "#fffbeb",
    badgeText: "#92400e",
    badgeBorder: "#fde68a",
    barColor: "#f59e0b",
  },
  good: {
    emoji: "🟢",
    label: "BAIK",
    badgeBg: "#ecfdf5",
    badgeText: "#065f46",
    badgeBorder: "#a7f3d0",
    barColor: "#10b981",
  },
  strong: {
    emoji: "⭐",
    label: "KUKUH",
    badgeBg: "#ede9fe",
    badgeText: "#4c1d95",
    badgeBorder: "#c4b5fd",
    barColor: "#7c3aed",
  },
};

// ---------------------------------------------------------------------------
// Copy helpers
// ---------------------------------------------------------------------------

function scoreGrade(pct: number): { emoji: string; label: string } {
  if (pct >= 85) return { emoji: "🏆", label: "Cemerlang!" };
  if (pct >= 65) return { emoji: "⭐", label: "Bagus!" };
  if (pct >= 40) return { emoji: "💪", label: "Boleh Improve!" };
  return { emoji: "🌱", label: "Permulaan Yang Baik!" };
}

function scoreContextLine(pct: number): string {
  if (pct <= 15)
    return "Kebanyakan pelajar skor 10–20% pada percubaan pertama — kamu tepat di mana semua orang bermula.";
  if (pct <= 30)
    return "Kebanyakan pelajar skor 15–25% pada percubaan pertama — kamu berada di landasan yang betul!";
  if (pct <= 50)
    return "Kamu melebihi purata untuk percubaan pertama. Asas yang baik!";
  if (pct <= 70)
    return "Percubaan pertama yang mantap! Kamu sudah tahu lebih banyak daripada kebanyakan pelajar baharu.";
  return "Permulaan yang mengagumkan! Kamu jauh ke hadapan.";
}

function buildAiDiagnosis(topics: TopicDiagnostic[], weakestTopic: TopicDiagnostic): string {
  const name = weakestTopic.topicName;
  const pct = Math.round(weakestTopic.accuracy * 100);
  if (pct === 0) {
    return `${name} adalah peluang pertumbuhan terbesar kamu sekarang — kamu belum sempat berlatih lagi. Mulakan dengan latihan 5-min untuk bina asas yang kukuh.`;
  }
  if (pct <= 30) {
    return `${name} memerlukan perhatian paling banyak (${pct}% betul). Mulakan dengan latihan 5-min untuk kukuhkan asas sebelum cuba soalan lebih susah.`;
  }
  return `${name} adalah kawasan paling lemah kamu pada ${pct}%. Sesi ulang kaji 10-min yang fokus akan membantu kamu menutup jurang ini dengan cepat.`;
}

// Priority label for each topic in the focus path
function focusPriority(tier: Tier, rank: number): { label: string; color: string; bg: string } {
  if (rank === 0 && tier === "needs-work") return { label: "🎯 Utama — Mula di sini", color: "#b91c1c", bg: "#fef2f2" };
  if (rank === 0) return { label: "🎯 Fokus utama", color: "#5b4cf5", bg: "#eef2ff" };
  if (tier === "needs-work") return { label: "⚡ Penting", color: "#92400e", bg: "#fffbeb" };
  if (tier === "improving") return { label: "📈 Tingkatkan", color: "#065f46", bg: "#ecfdf5" };
  return { label: "✅ Maintain", color: "#4c1d95", bg: "#ede9fe" };
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return <div className={`dr2-skeleton ${className ?? ""}`} />;
}

function ResultSkeleton() {
  return (
    <div className="dr2-page page-enter">
      <Skeleton className="dr2-skel-header" />
      <Skeleton className="dr2-skel-row" />
      <Skeleton className="dr2-skel-row" />
      <Skeleton className="dr2-skel-tall" />
      <Skeleton className="dr2-skel-row" />
      <Skeleton className="dr2-skel-btn" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score header — matches LevelProgressCard pattern
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
  const { emoji, label } = scoreGrade(pct);
  const r = 42;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const isLow = pct < 30;

  return (
    <div className="dr2-hero">
      {/* XP pill — top-right */}
      <span className="dr2-xp-pill">+50 XP ✨</span>

      {/* Circle + copy */}
      <div className="dr2-hero-row">
        <div className="dr2-ring-wrap">
          <svg width="100" height="100" viewBox="0 0 100 100" className="dr2-ring-svg">
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="9" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#fff"
              strokeWidth="9"
              strokeDasharray={`${fill} ${circ}`}
              strokeLinecap="round"
              className="dr2-ring-arc"
            />
          </svg>
          <div className="dr2-ring-inner">
            <span className="dr2-ring-pct">{pct}%</span>
            <span className="dr2-ring-frac">{correct}/{total}</span>
          </div>
        </div>

        <div className="dr2-hero-copy">
          <p className="dr2-hero-grade">
            {emoji} {label}
          </p>
          <h1 className="dr2-hero-name">
            {userName ? `Tahniah, ${userName}!` : "Tahniah!"}
          </h1>
          <p className="dr2-hero-sub">Diagnosis peribadi kamu sudah siap.</p>
        </div>
      </div>

      {/* Context pill */}
      <p className="dr2-context-chip">{scoreContextLine(pct)}</p>

      {isLow && (
        <div className="dr2-encouragement">
          <span>💪</span>
          <span>Jangan risau — ini hanya titik permulaan. Laluan kamu kini telah diperibadikan.</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header — matches homepage section headers
// ---------------------------------------------------------------------------

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="dr2-section-head">
      <h2 className="dr2-section-title">{label}</h2>
      {sub && <p className="dr2-section-sub">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topic breakdown card — compact, matches progress-set-card feel
// ---------------------------------------------------------------------------

function TopicBreakdownCard({
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
  const r = 20;
  const circ = 2 * Math.PI * r;
  const arc = (pct / 100) * circ;

  return (
    <div className={`dr2-topic-card${isBest ? " dr2-topic-card--best" : ""}`}>
      {isBest && <span className="dr2-best-tag">📌 Terbaik setakat ini</span>}

      <div className="dr2-topic-inner">
        {/* Mini ring */}
        <div className="dr2-mini-ring-wrap" data-tier={isZero ? "zero" : tier}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
            <circle
              cx="26"
              cy="26"
              r={r}
              fill="none"
              strokeWidth="5"
              strokeDasharray={`${arc} ${circ}`}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
              className="dr2-mini-arc"
            />
          </svg>
          <span className="dr2-mini-pct">
            {pct}%
          </span>
        </div>

        {/* Info */}
        <div className="dr2-topic-info">
          <div className="dr2-topic-name-row">
            <span className="dr2-topic-name">{topic.topicName}</span>
            <span className={`dr2-tier-badge dr2-tier-badge--${tier}`}>
              {cfg.emoji} {cfg.label}
            </span>
          </div>
          <p className="dr2-topic-meta">
            {isZero ? "Tiada jawapan lagi" : `${pct}% betul`} · {topic.attempts} soalan
          </p>
          <div className="dr2-bar-track">
            <div
              className={`dr2-bar-fill dr2-bar-fill--${isZero ? "zero" : tier}`}
              style={{ width: isZero ? "4%" : `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Diagnosis card — matches daily-mission-card energy
// ---------------------------------------------------------------------------

function AiDiagnosisCard({ copy }: { copy: string }) {
  return (
    <div className="dr2-ai-card">
      <div className="dr2-ai-header">
        <span className="dr2-ai-icon">🤖</span>
        <div>
          <p className="dr2-ai-label">AI Diagnosis</p>
          <p className="dr2-ai-sublabel">dikuasakan oleh Skorrel</p>
        </div>
      </div>
      <p className="dr2-ai-copy">{copy}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Focus Path — the new personalized topic roadmap
// ---------------------------------------------------------------------------

function FocusPathCard({
  topic,
  rank,
  onStart,
  starting,
}: {
  topic: TopicDiagnostic;
  rank: number;
  onStart: () => void;
  starting: boolean;
}) {
  const tier = getTier(topic.accuracy);
  const pct = Math.round(topic.accuracy * 100);
  const priority = focusPriority(tier, rank);
  const isPrimary = rank === 0;

  return (
    <div className={`dr2-focus-card${isPrimary ? " dr2-focus-card--primary" : ""}`}>
      <div className="dr2-focus-top">
        <span className={`dr2-focus-priority dr2-focus-priority--${tier}${isPrimary ? "-primary" : ""}`}>
          {priority.label}
        </span>
        <span className="dr2-focus-rank">#{rank + 1}</span>
      </div>

      <div className="dr2-focus-body">
        <div className="dr2-focus-info">
          <p className="dr2-focus-name">{topic.topicName}</p>
          <p className="dr2-focus-meta">
            <span className={`dr2-focus-pct dr2-focus-pct--${isZeroAccuracy(topic) ? "zero" : tier}`}>
              {pct}%
            </span>
            {" "}ketepatan · {topic.attempts} soalan dijawab
          </p>

          {/* Action hint */}
          <p className="dr2-focus-hint">
            {tier === "needs-work"
              ? "Mulakan dengan 5 soalan asas untuk bina keyakinan"
              : tier === "improving"
              ? "Cuba 8 soalan latihan untuk tingkatkan kefahaman"
              : tier === "good"
              ? "Latih 5 soalan sederhana untuk kekalkan momentum"
              : "Teruskan dengan soalan SPM sebenar untuk kekal tajam"}
          </p>
        </div>

        {isPrimary ? (
          <button
            type="button"
            className="btn-primary dr2-focus-btn"
            disabled={starting}
            onClick={onStart}
          >
            {starting ? "Sedang buat kuiz…" : "Mula Sekarang →"}
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost dr2-focus-btn-ghost"
            disabled={starting}
            onClick={onStart}
          >
            {starting ? "…" : "Cuba →"}
          </button>
        )}
      </div>
    </div>
  );
}

function isZeroAccuracy(topic: TopicDiagnostic) {
  return topic.accuracy === 0;
}

// ---------------------------------------------------------------------------
// Strengths + next step insight strip
// ---------------------------------------------------------------------------

function InsightStrip({
  strongestTopic,
  weakestTopic,
}: {
  strongestTopic: TopicDiagnostic;
  weakestTopic: TopicDiagnostic;
}) {
  return (
    <div className="dr2-insight-row">
      <div className="dr2-insight-card dr2-insight-strength">
        <span className="dr2-insight-icon">💡</span>
        <div>
          <p className="dr2-insight-label">Kekuatan</p>
          <p className="dr2-insight-val">{strongestTopic.topicName}</p>
        </div>
      </div>
      <div className="dr2-insight-card dr2-insight-next">
        <span className="dr2-insight-icon">🎯</span>
        <div>
          <p className="dr2-insight-label">Fokus Seterusnya</p>
          <p className="dr2-insight-val">{weakestTopic.topicName}</p>
        </div>
      </div>
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
      setError("Keputusan diagnostik tidak dapat dimuatkan. Sila cuba lagi.");
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
      setError("Gagal buat kuiz. Sila cuba lagi.");
    }
  }

  if (loading) return <ResultSkeleton />;

  if (error || !result) {
    return (
      <div className="page-enter dr2-error-page">
        <div className="dr2-error-emoji">😕</div>
        <h2 className="dr2-error-title">Ada masalah</h2>
        <p className="dr2-error-body">
          {error || "Keputusan diagnostik tidak dapat dimuatkan. Sila cuba lagi."}
        </p>
        <button type="button" className="btn-primary" onClick={load}>
          Cuba lagi
        </button>
      </div>
    );
  }

  // Derived data
  const pctCorrect = Math.round(result.overallAccuracy * 100);
  const sortedByWeakest = [...result.topics].sort((a, b) => a.accuracy - b.accuracy);
  const sortedByStrongest = [...result.topics].sort((a, b) => b.accuracy - a.accuracy);
  const bestTopicId = sortedByStrongest[0]?.topicId;
  const weakestTopic = sortedByWeakest[0];
  const strongestTopic = sortedByStrongest[0];

  const aiDiagnosisCopy = weakestTopic
    ? buildAiDiagnosis(result.topics, weakestTopic)
    : result.mainRecommendation.message;

  return (
    <div className="dr2-page page-enter">

      {/* ── 1. Hero score header ───────────────────────────────────────── */}
      <ScoreHeader
        correct={result.correctQuestions}
        total={result.totalQuestions}
        pct={pctCorrect}
        userName={userName || undefined}
      />

      {/* ── 2. Insight strip (strength / next focus) ─────────────────── */}
      {strongestTopic && weakestTopic && strongestTopic.topicId !== weakestTopic.topicId && (
        <InsightStrip strongestTopic={strongestTopic} weakestTopic={weakestTopic} />
      )}

      {/* ── 3. AI Diagnosis ────────────────────────────────────────────── */}
      <AiDiagnosisCard copy={aiDiagnosisCopy} />

      {/* ── 4. Personalized focus path ─────────────────────────────────── */}
      <section className="dr2-section">
        <SectionHeader
          label="Laluan Fokus Kamu"
          sub="Disusun mengikut keperluan — mulakan dari atas"
        />
        {sortedByWeakest.map((topic, rank) => (
          <FocusPathCard
            key={topic.topicId}
            topic={topic}
            rank={rank}
            onStart={() => handleStartQuiz(topic.topicId)}
            starting={startingTopicId === topic.topicId}
          />
        ))}
      </section>

      {/* ── 5. Full topic breakdown ────────────────────────────────────── */}
      <section className="dr2-section">
        <SectionHeader label="Pecahan Topik" />
        {result.topics.map((topic) => (
          <TopicBreakdownCard
            key={topic.topicId}
            topic={topic}
            isBest={topic.topicId === bestTopicId}
          />
        ))}
      </section>

      {/* ── 6. Bottom nav actions ─────────────────────────────────────── */}
      <div className="dr2-bottom-actions">
        <button
          type="button"
          className="btn-ghost dr2-dashboard-btn"
          onClick={() => router.push("/dashboard")}
        >
          Pergi ke Papan Pemuka
        </button>
        <button
          type="button"
          className="dr2-link-btn"
          onClick={() => router.push("/diagnostic/report")}
        >
          Lihat laporan terperinci →
        </button>
      </div>

      {error && <p className="dr2-error">{error}</p>}
    </div>
  );
}

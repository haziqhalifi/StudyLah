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
// Tier helpers
// ---------------------------------------------------------------------------

type Tier = "needs-work" | "improving" | "good" | "strong";

function getTier(accuracy: number): Tier {
  if (accuracy <= 0.3) return "needs-work";
  if (accuracy <= 0.6) return "improving";
  if (accuracy <= 0.85) return "good";
  return "strong";
}

// ---------------------------------------------------------------------------
// Copy helpers
// ---------------------------------------------------------------------------

function scoreGrade(pct: number): { emoji: string; label: string } {
  if (pct >= 85) return { emoji: "🏆", label: "CEMERLANG!" };
  if (pct >= 65) return { emoji: "⭐", label: "BAGUS!" };
  if (pct >= 40) return { emoji: "💪", label: "BOLEH IMPROVE!" };
  return { emoji: "📋", label: "DIAGNOSTIK SELESAI" };
}


function buildAiDiagnosis(weakestTopic: TopicDiagnostic): string {
  const name = weakestTopic.topicName;
  const pct = Math.round(weakestTopic.accuracy * 100);
  if (pct === 0) return `Awak belum sentuh ${name} lagi — so ini tempat paling best nak start. Markah boleh naik cepat sini.`;
  if (pct <= 30) return `Ok jadi ${name} ni yang paling perlu kita tackle dulu. ${pct}% je betul sekarang, tapi bila asas dah kena betulkan, markah keseluruhan awak boleh melompat.`;
  return `${name} ada ruang besar untuk improve (${pct}% sekarang). Fokus sekejap kat sini, awak akan nampak beza dengan cepat.`;
}

function focusPriorityClass(tier: Tier, isPrimary: boolean): string {
  if (isPrimary) return `dr2-focus-priority dr2-focus-priority--${tier}-primary`;
  return `dr2-focus-priority dr2-focus-priority--${tier}`;
}

function focusPriorityLabel(tier: Tier, isPrimary: boolean): string {
  if (isPrimary && tier === "needs-work") return "🔥 MISI PERTAMA";
  if (isPrimary) return "🎯 FOKUS UTAMA";
  if (tier === "needs-work") return "📈 LANGKAH SETERUSNYA";
  if (tier === "improving")  return "📈 TINGKATKAN";
  return "⚡ PERKUAT KELEBIHAN";
}

function focusHint(tier: Tier, isPrimary: boolean): string {
  if (isPrimary) return "Skorrel dah susun 5 soalan paling sesuai untuk awak — dari paling mudah dulu.";
  if (tier === "needs-work") return "Awak ada asas di sini — kita kukuh teknik yang spesifik untuk tingkatkan lagi.";
  if (tier === "improving")  return "Sikit lagi push dan awak boleh jadikan ni antara topik terkuat awak.";
  if (tier === "good")       return "Latih soalan setara SPM untuk kekalkan standard ni.";
  return "Teruskan dengan soalan SPM sebenar untuk kekal tajam.";
}

function getShortTopicName(fullName: string): string {
  const parts = fullName.split(":");
  return parts.length > 1 ? parts[parts.length - 1].trim() : fullName;
}

function focusBtnLabel(tier: Tier, isPrimary: boolean, topicName: string): string {
  const short = getShortTopicName(topicName);
  if (isPrimary) return `Mula Misi ${short} →`;
  if (tier === "needs-work") return `Kukuh ${short} →`;
  if (tier === "improving")  return `Tingkatkan ${short} →`;
  return `Maintain ${short} →`;
}


// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

const LOADING_STEPS = [
  "Menganalisis jawapan awak…",
  "Mengenal pasti corak kesilapan…",
  "AI sedang mendiagnosis kelemahan…",
  "Menyediakan pelan fokus peribadi…",
];

function ResultSkeleton() {
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dr2-page page-enter">
      <div className="dr2-skeleton dr2-skel-header" />

      <div className="dr2-loading-status">
        <span className="dr2-loading-spinner" />
        <span className="dr2-loading-step">{LOADING_STEPS[stepIndex]}</span>
      </div>

      <div className="dr2-skeleton dr2-skel-row" />
      <div className="dr2-skeleton dr2-skel-row" />
      <div className="dr2-skeleton dr2-skel-tall" />
      <div className="dr2-skeleton dr2-skel-row" />
      <div className="dr2-skeleton dr2-skel-btn" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero header  (mirrors level-card gradient)
// ---------------------------------------------------------------------------

function ScoreHeader({ correct, total, pct, userName }: {
  correct: number; total: number; pct: number; userName?: string;
}) {
  const { emoji, label } = scoreGrade(pct);
  const r = 38;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;

  return (
    <div className="dr2-hero">
      <span className="dr2-xp-pill">+50 XP ✨</span>

      <div className="dr2-hero-row">
        {/* Score ring — same structure as progress-set-ring */}
        <div className="dr2-ring-wrap">
          <svg width="90" height="90" viewBox="0 0 90 90" className="dr2-ring-svg">
            <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
            <circle
              cx="45" cy="45" r={r}
              fill="none" stroke="#fff" strokeWidth="8"
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
          <p className="dr2-hero-grade">{emoji} {label}</p>
          <h1 className="dr2-hero-name">
            {pct >= 65
              ? (userName ? `Tahniah, ${userName}!` : "Tahniah!")
              : (userName ? `${userName}, awak baru buka peta SPM awak.` : "Awak baru buka peta SPM awak.")}
          </h1>
          <p className="dr2-hero-sub">
            {pct >= 65
              ? "Skor yang membanggakan untuk diagnostik pertama!"
              : "Ramai pelajar skip bahagian ni. Awak tak."}
          </p>
        </div>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Insight strip  (mirrors quick-stat-card)
// ---------------------------------------------------------------------------

function InsightStrip({ strongestTopic, weakestTopic }: {
  strongestTopic: TopicDiagnostic; weakestTopic: TopicDiagnostic;
}) {
  return (
    <div className="dr2-insight-row">
      <div className="dr2-insight-card dr2-insight-strength">
        <span className="dr2-insight-icon">✅</span>
        <div>
          <p className="dr2-insight-label">Awak Dah Kuasai</p>
          <p className="dr2-insight-val">{strongestTopic.topicName}</p>
          <p className="dr2-insight-guide">Guna ini sebagai jambatan ke topik lain</p>
        </div>
      </div>
      <div className="dr2-insight-card dr2-insight-next">
        <span className="dr2-insight-icon">🎯</span>
        <div>
          <p className="dr2-insight-label">Mula Di Sini</p>
          <p className="dr2-insight-val">{weakestTopic.topicName}</p>
          <p className="dr2-insight-guide">Impak markah paling besar</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Diagnosis card  (mirrors fokus-card with icon box)
// ---------------------------------------------------------------------------

function AiDiagnosisCard({ copy, misconceptions }: { copy: string; misconceptions: string[] }) {
  return (
    <div className="dr2-ai-card">
      <div className="dr2-ai-header">
        <img src="/assets/mascot.webp" alt="Skorrel" className="dr2-ai-mascot" />
        <div>
          <p className="dr2-ai-label">Skorrel cakap…</p>
          <p className="dr2-ai-sublabel">study partner awak</p>
        </div>
      </div>
      <p className="dr2-ai-copy">{copy}</p>
      {misconceptions.length > 0 && (
        <>
          <p className="dr2-ai-misconceptions-intro">
            Ni yang Skorrel nampak dalam jawapan awak:
          </p>
          <ul className="dr2-ai-misconceptions">
            {misconceptions.map((m, i) => (
              <li key={i} className="dr2-ai-misconception-item">📌 {m}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Focus path card  (primary mirrors fokus-cta; others mirror weak-topic-card)
// ---------------------------------------------------------------------------

function FocusPathCard({ topic, rank, onStart, starting }: {
  topic: TopicDiagnostic; rank: number; onStart: () => void; starting: boolean;
}) {
  const tier = getTier(topic.accuracy);
  const pct = Math.round(topic.accuracy * 100);
  const isPrimary = rank === 0;

  return (
    <div className={`dr2-focus-card${isPrimary ? " dr2-focus-card--primary" : ""}`}>
      <div className="dr2-focus-top">
        <span className={focusPriorityClass(tier, isPrimary)}>
          {focusPriorityLabel(tier, isPrimary)}
        </span>
        <span className="dr2-focus-rank">#{rank + 1}</span>
      </div>

      <div className="dr2-focus-body">
        <div className="dr2-focus-info">
          <p className="dr2-focus-name">{topic.topicName}</p>
          <p className="dr2-focus-meta">
            <span className={`dr2-focus-pct dr2-focus-pct--${topic.accuracy === 0 ? "zero" : tier}`}>
              {pct}%
            </span>
            {" "}ketepatan · {topic.attempts} soalan dijawab
          </p>
          {isPrimary && <p className="dr2-focus-hint">{focusHint(tier, isPrimary)}</p>}
        </div>

        {isPrimary ? (
          <button type="button" className="dr2-focus-btn" disabled={starting} onClick={onStart}>
            {starting ? "Sebentar…" : focusBtnLabel(tier, true, topic.topicName)}
          </button>
        ) : (
          <button type="button" className="dr2-focus-btn-ghost" disabled={starting} onClick={onStart}>
            {starting ? "…" : focusBtnLabel(tier, false, topic.topicName)}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topic breakdown card  (mirrors progress-set-card list)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section header  (mirrors progress-section-header)
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
// Page
// ---------------------------------------------------------------------------

export default function DiagnosticResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [startingTopicId, setStartingTopicId] = useState<string | null>(null);

  const userId   = typeof window !== "undefined" ? sessionStorage.getItem("userId")   ?? "" : "";
  const userName = typeof window !== "undefined" ? sessionStorage.getItem("userName") ?? "" : "";

  async function load() {
    if (!userId) { router.push("/"); return; }
    setLoading(true);
    setError("");
    try {
      setResult(await fetchDiagnosticResult(userId));
    } catch {
      setError("Keputusan diagnostik tidak dapat dimuatkan. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function handleStartQuiz(topicId: string) {
    if (!userId || !result) return;
    setStartingTopicId(topicId);
    try {
      const isMain = result.mainRecommendation.topicId === topicId;
      const rec = isMain ? result.mainRecommendation : result.secondaryRecommendation;
      const quiz = await createPersonalizedQuiz(
        userId,
        topicId as "ubahan" | "matriks" | "insurans",
        rec?.suggestedQuizLength ?? 5,
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
        <p className="dr2-error-body">{error || "Keputusan diagnostik tidak dapat dimuatkan. Sila cuba lagi."}</p>
        <button type="button" className="btn-primary" onClick={load}>Cuba lagi</button>
      </div>
    );
  }

  const pctCorrect       = Math.round(result.overallAccuracy * 100);
  const sortedByWeakest  = [...result.topics].sort((a, b) => a.accuracy - b.accuracy);
  const sortedByStrongest = [...result.topics].sort((a, b) => b.accuracy - a.accuracy);
  const weakestTopic     = sortedByWeakest[0];
  const strongestTopic   = sortedByStrongest[0];

  return (
    <div className="dr2-page page-enter">

      {/* 1 · Hero */}
      <ScoreHeader
        correct={result.correctQuestions}
        total={result.totalQuestions}
        pct={pctCorrect}
        userName={userName || undefined}
      />

      {/* 2 · Insight strip */}
      {strongestTopic && weakestTopic && strongestTopic.topicId !== weakestTopic.topicId && (
        <InsightStrip strongestTopic={strongestTopic} weakestTopic={weakestTopic} />
      )}

      {/* 4 · AI Diagnosis */}
      {weakestTopic && (
        <AiDiagnosisCard copy={buildAiDiagnosis(weakestTopic)} misconceptions={weakestTopic.misconceptions ?? []} />
      )}

      {/* 5 · Personalized focus path */}
      <section className="dr2-section">
        <SectionHeader label="🗺️ Laluan Fokus Awak" sub="Disusun ikut impak — topik atas bagi markah paling banyak bila dikuasai" />
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

      {/* 7 · Actions */}
      <div className="dr2-bottom-actions">
        <button type="button" className="btn-ghost dr2-dashboard-btn" onClick={() => router.push("/dashboard")}>
          Pergi ke Papan Pemuka
        </button>
        <button type="button" className="dr2-link-btn" onClick={() => router.push("/diagnostic/report")}>
          Lihat laporan terperinci →
        </button>
      </div>

      {error && <p className="dr2-error">{error}</p>}
    </div>
  );
}

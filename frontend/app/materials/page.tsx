"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UBAHAN_STEPS } from "./ubahan/data";
import { MATRIKS_STEPS } from "./matriks/data";
import { INSURANS_STEPS } from "./insurans/data";

const BAB_CARDS = [
  {
    id: "ubahan",
    title: "Bab 1: Ubahan",
    subtitle: "Perkaitan antara dua atau lebih pemboleh ubah.",
    href: "/materials/ubahan/subtopics",
    steps: UBAHAN_STEPS,
    completionKey: "ubahan_completed_steps_v1",
    difficulty: "Mudah",
    estimatedTime: "~20 min",
    tone: "lesson" as const,
  },
  {
    id: "matriks",
    title: "Bab 2: Matriks",
    subtitle: "Operasi matriks dan aplikasi persamaan serentak.",
    href: "/materials/matriks/subtopics",
    steps: MATRIKS_STEPS,
    completionKey: "matriks_completed_steps_v1",
    difficulty: "Sederhana",
    estimatedTime: "~30 min",
    tone: "game" as const,
  },
  {
    id: "insurans",
    title: "Bab 3: Matematik Pengguna: Insurans",
    subtitle: "Premium, polisi, dan pengiraan pampasan insurans.",
    href: "/materials/insurans/subtopics",
    steps: INSURANS_STEPS,
    completionKey: "insurans_completed_steps_v1",
    difficulty: "Mudah",
    estimatedTime: "~25 min",
    tone: "path" as const,
  },
];

function readCompletedSteps(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    return (JSON.parse(raw) as string[]).length;
  } catch {
    return 0;
  }
}

export default function MaterialsHubPage() {
  const router = useRouter();
  const [nodeProgress, setNodeProgress] = useState<Record<string, { done: number; total: number }>>({});

  useEffect(() => {
    const progress: Record<string, { done: number; total: number }> = {};
    for (const card of BAB_CARDS) {
      progress[card.id] = { done: readCompletedSteps(card.completionKey), total: card.steps.length };
    }
    setNodeProgress(progress);
  }, []);

  const recommendedId = BAB_CARDS.map((card) => {
    const np = nodeProgress[card.id] ?? { done: 0, total: card.steps.length };
    return { card, pct: np.total > 0 ? Math.round((np.done / np.total) * 100) : 0 };
  }).reduce((best, cur) => (cur.pct < best.pct ? cur : best)).card.id;

  return (
    <section className="home-dashboard-shell page-enter" aria-label="Pilih Bab">
      {/* ── Header ── */}
      <header className="student-header">
        <div className="student-header-copy">
          <p className="student-time" style={{ paddingLeft: "0.5rem" }}>Bahan</p>
          <h1 style={{ paddingLeft: "0.5rem" }}>Pilih Bab</h1>
          <div className="student-meta-row" style={{ paddingLeft: "0.5rem" }}>
            <span>Matematik Tingkatan 5</span>
            <span aria-hidden="true">·</span>
            <span>{BAB_CARDS.length} bab</span>
            <span aria-hidden="true">·</span>
            <span>{BAB_CARDS.reduce((s, c) => s + c.steps.length, 0)} subtopik</span>
          </div>
        </div>
      </header>

      {/* ── Chapter cards ── */}
      <div className="lp-chapter-list">
        {BAB_CARDS.map((card) => {
          const np = nodeProgress[card.id] ?? { done: 0, total: card.steps.length };
          const pct = np.total > 0 ? Math.round((np.done / np.total) * 100) : 0;
          const isRecommended = card.id === recommendedId;
          const isInProgress = pct > 0 && pct < 100;

          return (
            <button
              key={card.id}
              type="button"
              className={`lp-chapter-card lp-chapter-${card.tone}${isRecommended ? " lp-chapter-recommended" : ""}`}
              onClick={() => router.push(card.href)}
            >
              <div className="lp-chapter-left">
                {isRecommended && (
                  <div className="lp-recommended-badge">⭐ Disyorkan hari ini</div>
                )}
                <p className="lp-chapter-bab">{card.title.split(":")[0]}</p>
                <h2 className="lp-chapter-name">{card.title.split(": ").slice(1).join(": ")}</h2>
                <p className="lp-chapter-desc">{card.subtitle}</p>

                <div className="lp-chapter-tags">
                  <span className={`lp-tag lp-tag-diff-${card.difficulty.toLowerCase()}`}>
                    {card.difficulty}
                  </span>
                  <span className="lp-tag lp-tag-time">⏱ {card.estimatedTime}</span>
                </div>

                <div className="lp-chapter-progress-row">
                  <div className="lp-chapter-track">
                    <div
                      className="lp-chapter-fill"
                      style={{ "--pct": `${pct}%` } as React.CSSProperties}
                    />
                  </div>
                  <span className="lp-chapter-pct">{pct}%</span>
                </div>

                <p className="lp-chapter-next-cta">
                  {pct === 100
                    ? "✓ Siap! Ulangkaji untuk kukuhkan lagi →"
                    : isInProgress
                    ? "Sambung subtopik seterusnya →"
                    : "Mulakan dengan contoh mudah →"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

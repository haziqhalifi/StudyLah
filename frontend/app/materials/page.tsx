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

  const totalNodes = BAB_CARDS.reduce((s, c) => s + c.steps.length, 0);
  const doneNodes = Object.values(nodeProgress).reduce((s, v) => s + v.done, 0);
  const overallPct = totalNodes > 0 ? Math.round((doneNodes / totalNodes) * 100) : 0;
  const hasStarted = doneNodes > 0;

  return (
    <section className="home-dashboard-shell page-enter" aria-label="Hab bahan pembelajaran">
      <header className="student-header">
        <div className="student-header-copy">
          <p className="student-time">Bahan</p>
          <h1>Pilih Bab</h1>
          <div className="student-meta-row">
            <span>Matematik Tingkatan 5</span>
            <span aria-hidden="true">•</span>
            <span>{BAB_CARDS.length} bab</span>
            <span>{BAB_CARDS.length} bab</span>
          </div>
        </div>
      </header>

      <section className="level-card" aria-label="Pilih satu bab">
        <div className="level-card-content">
          <p className="level-eyebrow">Laluan Pembelajaran</p>
          <h2>Mulakan dengan satu bab dan teruskan ke peta subtopik.</h2>
          <div className="level-progress-row">
            <div className="w-full h-1.5 rounded-full bg-white/20" aria-hidden="true">
              <div
                className="h-1.5 rounded-full bg-white transition-all duration-500"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <span>{BAB_CARDS.length} tersedia</span>
          </div>
        </div>
        {/* Labeled subtopik badge */}
        <div className="level-trophy" aria-hidden="true">
          <span className="learn-hub-chip text-white/80 text-sm font-medium px-3 py-1 rounded-full bg-white/20">
            {totalNodes} subtopik
          </span>
        </div>
      </section>

      {/* Chapter cards — scrollable with bottom peek affordance */}
      <div className="home-learning-stack pb-32 overflow-y-auto">
        {BAB_CARDS.map((card) => {
          const np = nodeProgress[card.id] ?? { done: 0, total: card.steps.length };
          const pct = np.total > 0 ? Math.round((np.done / np.total) * 100) : 0;
          return (
            <button
              key={card.id}
              type="button"
              className={`learning-feature-card learning-feature-${card.tone} study-select-card`}
              onClick={() => router.push(card.href)}
            >
              <div>
                <h2>{card.title}</h2>
                <p>{card.subtitle}</p>

                {/* Difficulty + estimated time tags */}
                <div className="flex gap-2 mt-2 mb-3">
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {card.difficulty}
                  </span>
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {card.estimatedTime}
                  </span>
                </div>

                {/* Always-visible progress track */}
                <div className="learn-topic-progress-row">
                  <div className="w-full h-1.5 rounded-full bg-white/20">
                    <div
                      className="h-1.5 rounded-full bg-white transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {pct === 0 ? (
                    <span className="text-white/70 text-xs font-medium whitespace-nowrap ml-2">Mula sekarang →</span>
                  ) : (
                    <span className="learn-topic-progress-label">{pct}%</span>
                  )}
                </div>
              </div>
              {/* Floating number badge removed — chapter number is in title text */}
            </button>
          );
        })}
      </div>
    </section>
  );
}

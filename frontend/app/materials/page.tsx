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
  },
  {
    id: "matriks",
    title: "Bab 2: Matriks",
    subtitle: "Operasi matriks dan aplikasi persamaan serentak.",
    href: "/materials/matriks/subtopics",
    steps: MATRIKS_STEPS,
    completionKey: "matriks_completed_steps_v1",
  },
  {
    id: "insurans",
    title: "Bab 3: Matematik Pengguna: Insurans",
    subtitle: "Premium, polisi, dan pengiraan pampasan insurans.",
    href: "/materials/insurans/subtopics",
    steps: INSURANS_STEPS,
    completionKey: "insurans_completed_steps_v1",
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
          </div>
        </div>
      </header>

      <section className="level-card" aria-label="Pilih satu bab">
        <div className="level-card-content">
          <p className="level-eyebrow">Laluan Pembelajaran</p>
          <h2>Mulakan dengan satu bab dan teruskan ke peta subtopik.</h2>
          <div className="level-progress-row">
            <div className="level-progress-track" aria-hidden="true">
              <div className="level-progress-fill" style={{ width: `${overallPct}%` }}>
                <span className="level-progress-dot" />
              </div>
            </div>
            <span>{BAB_CARDS.length} tersedia</span>
          </div>
        </div>
        <div className="level-trophy" aria-hidden="true">
          <span className="learn-hub-chip">5</span>
        </div>
      </section>

      <div className="home-learning-stack">
        {BAB_CARDS.map((card, index) => {
          const tone = index === 0 ? "lesson" : index === 1 ? "game" : "path";
          const np = nodeProgress[card.id] ?? { done: 0, total: card.steps.length };
          const pct = np.total > 0 ? Math.round((np.done / np.total) * 100) : 0;
          return (
            <button
              key={card.id}
              type="button"
              className={`learning-feature-card learning-feature-${tone} study-select-card`}
              onClick={() => router.push(card.href)}
            >
              <div>
                <h2>{card.title}</h2>
                <p>{card.subtitle}</p>
                <div className="learn-topic-progress-row">
                  <div className="learn-topic-progress-track">
                    <div className="learn-topic-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="learn-topic-progress-label">
                    {pct}%
                  </span>
                </div>
              </div>

              <div className="feature-visual" aria-hidden="true">
                <div className="feature-blob feature-blob-large" />
                <div className="feature-blob feature-blob-small" />
                <div className="feature-mini-card">{index + 1}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

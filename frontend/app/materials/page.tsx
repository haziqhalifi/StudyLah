"use client";

import { useRouter } from "next/navigation";

const BAB_CARDS = [
  {
    id: "ubahan",
    title: "Bab 1: Ubahan",
    subtitle: "Perkaitan antara dua atau lebih pemboleh ubah.",
    href: "/materials/ubahan/subtopics",
  },
  {
    id: "matriks",
    title: "Bab 2: Matriks",
    subtitle: "Operasi matriks dan aplikasi persamaan serentak.",
    href: "/materials/matriks/subtopics",
  },
  {
    id: "insurans",
    title: "Bab 3: Matematik Pengguna: Insurans",
    subtitle: "Premium, polisi, dan pengiraan pampasan insurans.",
    href: "/materials/insurans/subtopics",
  },
];

export default function MaterialsHubPage() {
  const router = useRouter();

  return (
    <section className="home-dashboard-shell page-enter" aria-label="Materials hub">
      <header className="student-header">
        <div className="student-header-copy">
          <p className="student-time">Materials</p>
          <h1>Pilih Bab</h1>
          <div className="student-meta-row">
            <span>Matematik Tingkatan 5</span>
            <span aria-hidden="true">•</span>
            <span>{BAB_CARDS.length} chapters</span>
          </div>
        </div>


      </header>

      <section className="level-card" aria-label="Choose a chapter">
        <div className="level-card-content">
          <p className="level-eyebrow">Learning Path</p>
          <h2>Start from a chapter and move into the subtopic map.</h2>
          <div className="level-progress-row">
            <div className="level-progress-track" aria-hidden="true">
              <div className="level-progress-fill level-progress-fill-full">
                <span className="level-progress-dot" />
              </div>
            </div>
            <span>{BAB_CARDS.length} available</span>
          </div>
        </div>
        <div className="level-trophy" aria-hidden="true">
          <span className="learn-hub-chip">5</span>
        </div>
      </section>

      <div className="home-learning-stack">
        {BAB_CARDS.map((card, index) => {
          const tone = index === 0 ? "lesson" : index === 1 ? "game" : "path";
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

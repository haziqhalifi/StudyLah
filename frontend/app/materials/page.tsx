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
    <div className="material-page page-enter">
      <div className="material-header material-header-highlight">
        <p className="material-eyebrow">Matematik Tingkatan 5</p>
        <h1 className="material-title">Pilih Bab</h1>
      </div>

      <div className="material-stack">
        {BAB_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            className="material-header material-header-link"
            onClick={() => router.push(card.href)}
          >
            <p className="material-eyebrow">Matematik Tingkatan 5</p>
            <h2 className="material-title">{card.title}</h2>
            <p className="material-subtitle">{card.subtitle}</p>
            <p className="material-enter-link">Masuk ke subtopic learning map</p>
          </button>
        ))}
      </div>
    </div>
  );
}

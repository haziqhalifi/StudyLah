"use client";

import { useRouter } from "next/navigation";

export default function InsuransBabPage() {
  const router = useRouter();

  return (
    <div className="material-page page-enter">
      <button
        type="button"
        className="material-header material-header-link"
        onClick={() => router.push("/materials/insurans/subtopics")}
      >
        <p className="material-eyebrow">Matematik Tingkatan 5</p>
        <h1 className="material-title">Bab 3: Matematik Pengguna: Insurans</h1>
        <p className="material-subtitle">
          Bab ini memfokuskan kepada pengurusan risiko dan perlindungan kewangan melalui insurans.
        </p>
        <p className="material-enter-link">Masuk ke subtopic learning map</p>
      </button>
    </div>
  );
}


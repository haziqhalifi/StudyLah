"use client";

import { useRouter } from "next/navigation";

export default function MatriksBabPage() {
  const router = useRouter();

  return (
    <div className="material-page page-enter">
      <button
        type="button"
        className="material-header material-header-link"
        onClick={() => router.push("/materials/matriks/subtopics")}
      >
        <p className="material-eyebrow">Matematik Tingkatan 5</p>
        <h1 className="material-title">Bab 2: Matriks</h1>
        <p className="material-subtitle">
          Matriks ialah set nombor yang disusun dalam baris dan lajur untuk membentuk satu tatasusun segi empat tepat atau segi empat sama.
        </p>
        <p className="material-enter-link">Masuk ke subtopic learning map</p>
      </button>
    </div>
  );
}


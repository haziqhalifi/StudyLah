"use client";

import { useRouter } from "next/navigation";

export default function UbahanBabPage() {
  const router = useRouter();

  return (
    <div className="material-page page-enter">
      <button
        type="button"
        className="material-header material-header-link"
        onClick={() => router.push("/materials/ubahan/subtopics")}
      >
        <p className="material-eyebrow">Matematik Tingkatan 5</p>
        <h1 className="material-title">Bab 1: Ubahan</h1>
        <p className="material-subtitle">
          Bab ini merangkumi perkaitan antara dua atau lebih pemboleh ubah.
        </p>
        <p className="material-enter-link">Masuk ke subtopic learning map</p>
      </button>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("userName") ?? "";
    setName(stored || "Pelajar");
  }, []);

  function startEdit() {
    setDraftName(name);
    setEditingName(true);
    setSaved(false);
  }

  function saveName() {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    sessionStorage.setItem("userName", trimmed);
    setName(trimmed);
    setEditingName(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function cancelEdit() {
    setEditingName(false);
  }

  return (
    <section className="home-dashboard-shell page-enter" aria-label="Tetapan">
      {/* Header */}
      <header className="student-header">
        <div className="student-header-copy">
          <p className="student-time">Akaun</p>
          <h1>Tetapan</h1>
        </div>
      </header>

      {/* Profile card */}
      <article className="settings-card page-enter">
        <div className="settings-card-label">Profil</div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Nama paparan</span>
            {!editingName && (
              <span className="settings-row-value">{name}</span>
            )}
          </div>

          {editingName ? (
            <div className="settings-name-edit">
              <input
                className="settings-name-input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") cancelEdit();
                }}
                autoFocus
                maxLength={40}
                placeholder="Masukkan nama…"
                aria-label="Nama paparan"
              />
              <div className="settings-name-actions">
                <button type="button" className="btn-primary" onClick={saveName}>
                  Simpan
                </button>
                <button type="button" className="btn-ghost" onClick={cancelEdit}>
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="settings-edit-btn" onClick={startEdit}>
              Edit
            </button>
          )}
        </div>

        {saved && (
          <p className="settings-saved-hint" aria-live="polite">
            Nama disimpan!
          </p>
        )}
      </article>

      {/* About card */}
      <article className="settings-card page-enter page-enter-delay-1">
        <div className="settings-card-label">Tentang</div>

        <div className="settings-row settings-row--static">
          <span className="settings-row-title">Aplikasi</span>
          <span className="settings-row-value">StudyLah</span>
        </div>
        <div className="settings-row settings-row--static">
          <span className="settings-row-title">Versi</span>
          <span className="settings-row-value">1.0.0</span>
        </div>
        <div className="settings-row settings-row--static">
          <span className="settings-row-title">Matapelajaran</span>
          <span className="settings-row-value">Matematik Tambahan SPM</span>
        </div>
      </article>
    </section>
  );
}

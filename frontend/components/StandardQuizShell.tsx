"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface StandardQuizShellProps {
  title: string;
  subtitle?: string;
  progress: number;
  total: number;
  onClose?: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  bar: React.ReactNode;
  open?: boolean;
  showStats?: boolean;
  label?: string;
  /** Live session streak (consecutive correct answers) */
  streak?: number;
  /** Live XP total for this session */
  xp?: number;
  /** Quiz metadata shown next to mascot, e.g. "Ubahan · Mudah" */
  meta?: string;
  /** Whether the current question is flagged */
  flagged?: boolean;
  /** Called when the user toggles the flag button */
  onToggleFlag?: () => void;
}

export default function StandardQuizShell({
  title,
  subtitle,
  progress,
  total,
  onClose,
  headerRight,
  children,
  bar,
  open = true,
  showStats = true,
  label,
  streak = 0,
  xp = 0,
  meta,
  flagged = false,
  onToggleFlag,
}: StandardQuizShellProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Sync mute state with sounds lib — store in sessionStorage so sounds.ts can read it
  useEffect(() => {
    sessionStorage.setItem("soundMuted", muted ? "1" : "0");
  }, [muted]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("quiz-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("quiz-open");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("quiz-open");
    };
  }, [open]);

  useEffect(() => {
    if (fillRef.current) {
      const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
      fillRef.current.style.width = `${pct}%`;
    }
  }, [progress, total]);

  if (!open) return null;

  return (
    <div className="qs-shell">
      {/* ── Header row 1: close | mascot + meta | timer ── */}
      <header className="qs-header">
        <div className="qs-header-left">
          {onClose ? (
            <button
              type="button"
              className="qs-icon-btn"
              onClick={onClose}
              aria-label="Tutup"
            >
              ✕
            </button>
          ) : (
            <div className="qs-icon-placeholder" />
          )}
          {label && (
            <div className="qs-label-stack">
              <span className="qs-label-topic">{label}</span>
            </div>
          )}
        </div>

        <div className="qs-header-center">
          <Image
            src="/assets/mascot.webp"
            alt="Skorrel"
            width={28}
            height={28}
            className="qs-mascot-icon"
          />
          <div className="qs-header-meta">
            <span className="qs-title">{title}</span>
            {meta && <span className="qs-meta-tag">{meta}</span>}
            {subtitle && <span className="qs-subtitle">{subtitle}</span>}
          </div>
        </div>

        <div className="qs-header-timer">
          {headerRight ?? <div className="qs-icon-placeholder" />}
        </div>
      </header>

      {/* ── Header row 2: live streak + XP ── */}
      {showStats && (
        <div className="qs-stats-bar">
          <span className={`qs-stat qs-stat-streak${streak >= 2 ? " qs-stat-streak--active" : ""}`}>
            <span className="qs-stat-icon">🔥</span>
            <span className="qs-stat-val">{streak}</span>
          </span>
          <span className="qs-stat qs-stat-xp">
            <span className="qs-stat-icon">⚡</span>
            <span className="qs-stat-val">{xp} XP</span>
          </span>
          <span className="qs-stats-spacer" />
          <button
            type="button"
            className={`qs-stat-icon-btn${muted ? " qs-stat-icon-btn--muted" : ""}`}
            aria-label={muted ? "Hidupkan bunyi" : "Redam bunyi"}
            title={muted ? "Hidupkan bunyi" : "Redam bunyi"}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            type="button"
            className={`qs-stat-icon-btn${flagged ? " qs-stat-icon-btn--flagged" : ""}`}
            aria-label={flagged ? "Nyahbenderakan" : "Tandakan soalan"}
            title={flagged ? "Nyahbenderakan" : "Tandakan soalan"}
            onClick={() => onToggleFlag?.()}
          >
            🚩
          </button>
          <button
            type="button"
            className="qs-stat-icon-btn"
            aria-label="Tetapan"
            title="Tetapan"
            onClick={() => setShowSettings((s) => !s)}
          >
            ⚙️
          </button>
        </div>
      )}

      {/* ── Settings panel ── */}
      {showSettings && (
        <div className="qs-settings-panel" role="dialog" aria-label="Tetapan kuiz">
          <div className="qs-settings-row">
            <span className="qs-settings-label">Bunyi kesan</span>
            <button
              type="button"
              className={`qs-settings-toggle${muted ? "" : " qs-settings-toggle--on"}`}
              onClick={() => setMuted((m) => !m)}
              aria-pressed={muted ? "false" : "true"}
            >
              {muted ? "Mati" : "Hidup"}
            </button>
          </div>
          <div className="qs-settings-row">
            <span className="qs-settings-label">Tandakan soalan ini</span>
            <button
              type="button"
              className={`qs-settings-toggle${flagged ? " qs-settings-toggle--on" : ""}`}
              onClick={() => onToggleFlag?.()}
              aria-pressed={flagged ? "true" : "false"}
            >
              {flagged ? "Ditandakan" : "Tandakan"}
            </button>
          </div>
          <button
            type="button"
            className="qs-settings-close"
            onClick={() => setShowSettings(false)}
          >
            Tutup
          </button>
        </div>
      )}

      {/* ── Progress bar ── */}
      <div
        className="qs-progress-track"
        role="progressbar"
        aria-label={`${total > 0 ? Math.round((progress / total) * 100) : 0}% selesai`}
      >
        <div className="qs-progress-track-inner">
          <div className="qs-progress-fill" ref={fillRef} />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="qs-scroll">{children}</div>

      {/* ── Sticky bottom bar ── */}
      <div className="qs-bar">{bar}</div>
    </div>
  );
}

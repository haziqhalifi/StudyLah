"use client";

import { useEffect, useRef } from "react";
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
}: StandardQuizShellProps) {
  const fillRef = useRef<HTMLDivElement>(null);

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
          <button type="button" className="qs-stat-icon-btn" aria-label="Bunyi">🔊</button>
          <button type="button" className="qs-stat-icon-btn" aria-label="Tandakan">🚩</button>
          <button type="button" className="qs-stat-icon-btn" aria-label="Tetapan">⚙️</button>
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

"use client";

import { useEffect, useRef } from "react";

interface StandardQuizShellProps {
  /** Page title shown in header center */
  title: string;
  /** Optional subtitle shown below title */
  subtitle?: string;
  /** Number of questions answered / completed so far */
  progress: number;
  /** Total questions */
  total: number;
  /** Close / back handler — renders ✕ button when provided */
  onClose?: () => void;
  /** Optional right-side element (e.g. timer) */
  headerRight?: React.ReactNode;
  /** Scrollable body */
  children: React.ReactNode;
  /** Sticky bottom action bar */
  bar: React.ReactNode;
  /** Whether the shell is visible (false = render nothing) */
  open?: boolean;
}

/**
 * Single unified quiz shell used by all quiz flows.
 * Matches the reference screenshot: light background, branded progress bar,
 * centered title header, scrollable body, sticky bottom bar.
 */
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
      {/* ── Header ── */}
      <header className="qs-header">
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

        <div className="qs-header-center">
          <span className="qs-title">{title}</span>
          {subtitle && <span className="qs-subtitle">{subtitle}</span>}
        </div>

        <div className="qs-header-timer">
          {headerRight ?? <div className="qs-icon-placeholder" />}
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div
        className="qs-progress-track"
        role="progressbar"
        aria-label={`${total > 0 ? Math.round((progress / total) * 100) : 0}% selesai`}
      >
        <div className="qs-progress-fill" ref={fillRef}>
          <span className="qs-progress-dot" />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="qs-scroll">{children}</div>

      {/* ── Sticky bottom bar ── */}
      <div className="qs-bar">{bar}</div>
    </div>
  );
}

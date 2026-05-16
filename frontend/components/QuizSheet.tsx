"use client";

import { useEffect, useRef } from "react";

interface QuizSheetProps {
  open: boolean;
  children: React.ReactNode;
  bar: React.ReactNode;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  progress?: number;
  total?: number;
  timer?: React.ReactNode;
}

export default function QuizSheet({
  open,
  children,
  bar,
  onClose,
  title,
  subtitle,
  progress = 0,
  total = 1,
  timer,
}: QuizSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
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

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="qs-shell" ref={ref}>
      <header className="qs-header">
        {onClose && (
          <button type="button" className="qs-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
        <div className="qs-header-center">
          {title && <span className="qs-title">{title}</span>}
          {subtitle && <span className="qs-subtitle">{subtitle}</span>}
        </div>
        {timer && <div className="qs-header-timer">{timer}</div>}
      </header>

      <div
        className="qs-progress-track"
        role="progressbar"
        title={`${pct}% complete`}
      >
        <div className="qs-progress-fill" ref={fillRef}>
          <span className="qs-progress-dot" />
        </div>
      </div>

      <div className="qs-scroll">{children}</div>
      <div className="qs-bar">{bar}</div>
    </div>
  );
}

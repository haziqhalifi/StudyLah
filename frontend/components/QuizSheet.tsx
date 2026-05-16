"use client";

import { useEffect, useRef } from "react";

interface QuizSheetProps {
  open: boolean;
  children: React.ReactNode;
  bar: React.ReactNode;
  onClose?: () => void;
}

export default function QuizSheet({ open, children, bar, onClose }: QuizSheetProps) {
  const ref = useRef<HTMLDivElement>(null);

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

  if (!open) return null;

  return (
    <div className="quiz-sheet" ref={ref}>
      {onClose && (
        <div className="quiz-sheet-header">
          <button type="button" className="quiz-sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
      )}
      <div className="quiz-sheet-scroll">{children}</div>
      <div className="quiz-sheet-bar">{bar}</div>
    </div>
  );
}

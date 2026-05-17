"use client";

import StandardQuizShell from "@/components/StandardQuizShell";

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

/**
 * Thin wrapper kept for backward compatibility with MaterialQuizSession,
 * diagnostic, exam, and review pages. Delegates to StandardQuizShell.
 */
export default function QuizSheet({
  open,
  children,
  bar,
  onClose,
  title = "",
  subtitle,
  progress = 0,
  total = 1,
  timer,
}: QuizSheetProps) {
  return (
    <StandardQuizShell
      open={open}
      title={title}
      subtitle={subtitle}
      progress={progress}
      total={total}
      onClose={onClose}
      headerRight={timer}
      bar={bar}
    >
      {children}
    </StandardQuizShell>
  );
}

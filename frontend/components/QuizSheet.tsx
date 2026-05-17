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
  showStats?: boolean;
  label?: string;
  streak?: number;
  xp?: number;
  meta?: string;
}

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
  showStats,
  label,
  streak,
  xp,
  meta,
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
      showStats={showStats}
      label={label}
      streak={streak}
      xp={xp}
      meta={meta}
    >
      {children}
    </StandardQuizShell>
  );
}

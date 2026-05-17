"use client";

interface BuddyHeaderProps {
  title: string;
  subtitle?: string;
}

export default function BuddyHeader({ title, subtitle }: BuddyHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center text-white text-sm flex-shrink-0">
          🤖
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-[var(--ink)] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[var(--muted)] truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}


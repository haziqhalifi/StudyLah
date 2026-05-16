"use client";

interface BuddyHeaderProps {
  title: string;
  subtitle?: string;
}

export default function BuddyHeader({ title, subtitle }: BuddyHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-[#f6f7fb] border-b border-slate-100 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1f5eff] flex items-center justify-center text-white text-sm flex-shrink-0">
          🤖
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-900 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

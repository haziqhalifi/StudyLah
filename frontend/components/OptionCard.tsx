"use client";

interface OptionCardProps {
  text: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function OptionCard({
  text,
  selected,
  onClick,
  disabled = false,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-colors",
        selected
          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--ink)] hover:border-[var(--brand-muted)]",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      {text}
    </button>
  );
}


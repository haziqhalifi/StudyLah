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
          ? "border-[#1f5eff] bg-[#1f5eff]/5 text-[#1f5eff]"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      {text}
    </button>
  );
}

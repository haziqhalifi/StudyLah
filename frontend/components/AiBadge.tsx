"use client";

type AiBadgeVariant = "up" | "down" | "review" | "style";

interface Props {
  variant: AiBadgeVariant;
  label?: string;
}

const PRESETS: Record<AiBadgeVariant, { icon: string; defaultLabel: string; cls: string }> = {
  up:     { icon: "↑", defaultLabel: "AI raised difficulty",  cls: "ai-cue ai-cue-up"     },
  down:   { icon: "↓", defaultLabel: "AI eased difficulty",   cls: "ai-cue ai-cue-down"   },
  review: { icon: "↺", defaultLabel: "Review from earlier",   cls: "ai-cue ai-cue-review" },
  style:  { icon: "✦", defaultLabel: "AI tailored for you",   cls: "ai-cue ai-cue-review" },
};

export default function AiBadge({ variant, label }: Props) {
  const { icon, defaultLabel, cls } = PRESETS[variant];
  return (
    <span className={cls}>
      <span className="ai-pulse" />
      {icon} {label ?? defaultLabel}
    </span>
  );
}

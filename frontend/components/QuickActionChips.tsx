"use client";

import type { QuickAction } from "@/lib/types";

interface QuickActionChipsProps {
  actions: QuickAction[];
  onActionSelect: (action: QuickAction) => void;
  disabled?: boolean;
}

export default function QuickActionChips({
  actions,
  onActionSelect,
  disabled = false,
}: QuickActionChipsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="sb-chips-row" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.actionType + action.label}
          type="button"
          className="sb-chip"
          onClick={() => onActionSelect(action)}
          disabled={disabled}
          aria-label={action.label}
        >
          <span className="sb-chip-emoji" aria-hidden="true">
            {action.emoji}
          </span>
          <span className="sb-chip-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

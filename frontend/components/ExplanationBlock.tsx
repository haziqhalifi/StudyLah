"use client";

import { Explanation, ExplanationStyle } from "@/lib/api";

interface Props {
  explanation: Explanation;
  isCorrect: boolean;
}

const STYLE_META: Record<
  ExplanationStyle,
  { label: string; icon: string; accent: string; bg: string }
> = {
  step_by_step:   { label: "Step-by-step breakdown",  icon: "🪜", accent: "#2563eb", bg: "#eff6ff" },
  analogy:        { label: "Analogy explanation",      icon: "💡", accent: "#d97706", bg: "#fffbeb" },
  formula_first:  { label: "Formula approach",         icon: "📐", accent: "#7c3aed", bg: "#f5f3ff" },
  shortcut_tips:  { label: "Shortcut & tips",          icon: "⚡", accent: "#059669", bg: "#ecfdf5" },
};

export default function ExplanationBlock({ explanation, isCorrect }: Props) {
  const meta = STYLE_META[explanation.style];

  return (
    <div
      style={{
        marginTop: "1.25rem",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      }}
    >
      {/* Result banner */}
      <div
        style={{
          background: isCorrect ? "#16a34a" : "#dc2626",
          color: "white",
          padding: "0.6rem 1.25rem",
          fontWeight: 700,
          fontSize: "0.95rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        {isCorrect ? "✓ Correct!" : "✗ Not quite — here's why:"}
      </div>

      {/* Explanation body */}
      <div style={{ background: meta.bg, padding: "1.25rem" }}>
        {/* Style badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "white",
            border: `1.5px solid ${meta.accent}`,
            color: meta.accent,
            borderRadius: 8,
            padding: "0.25rem 0.75rem",
            fontSize: "0.78rem",
            fontWeight: 700,
            marginBottom: "0.9rem",
          }}
        >
          <span>{meta.icon}</span>
          {meta.label}
        </div>

        {/* Explanation text */}
        <p
          style={{
            color: "#1a1a2e",
            lineHeight: 1.7,
            whiteSpace: "pre-line",
            fontSize: "0.95rem",
          }}
        >
          {explanation.text}
        </p>
      </div>
    </div>
  );
}

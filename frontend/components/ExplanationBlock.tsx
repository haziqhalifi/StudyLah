"use client";

import { useState } from "react";
import { Explanation, ExplanationStyle } from "@/lib/api";
import MathText from "@/components/MathText";

interface Props {
  explanation?: Explanation | null;
  isCorrect: boolean;
  onGenerateExplanation?: () => Promise<void>;
  isGenerating?: boolean;
}

const STYLE_META: Record<ExplanationStyle, { label: string; icon: string; cls: string }> = {
  step_by_step:  { label: "Step-by-step",   icon: "🪜", cls: "expblock-step"     },
  analogy:       { label: "Analogy",         icon: "💡", cls: "expblock-analogy"  },
  formula_first: { label: "Formula",         icon: "📐", cls: "expblock-formula"  },
  shortcut_tips: { label: "Shortcut tip",    icon: "⚡", cls: "expblock-shortcut" },
};

export default function ExplanationBlock({
  explanation,
  isCorrect,
  onGenerateExplanation,
  isGenerating = false,
}: Props) {
  // If no explanation yet, show generate button
  if (!explanation) {
    return (
      <div className="expblock card page-enter">
        {/* Result banner */}
        <div className={`expblock-banner ${isCorrect ? "expblock-banner-correct" : "expblock-banner-wrong"}`}>
          <span className="expblock-banner-icon">{isCorrect ? "✓" : "✗"}</span>
          {isCorrect ? "Correct!" : "Not quite — here's why"}
        </div>

        {/* Body */}
        <div className="expblock-body">
          <p className="expblock-text" style={{ color: "#888", fontSize: "0.95rem", marginBottom: "1rem" }}>
            Want to understand this better? Let me generate a personalized explanation.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={onGenerateExplanation}
            disabled={isGenerating}
            style={{ width: "100%" }}
          >
            {isGenerating ? "Generating…" : "Generate Explanation"}
          </button>
        </div>
      </div>
    );
  }

  const meta = STYLE_META[explanation.style] ?? STYLE_META.step_by_step;
  const hasSteps = explanation.style === "step_by_step" && explanation.steps && explanation.steps.length > 0;

  return (
    <div className={`expblock card page-enter ${meta.cls}`}>
      {/* Result banner */}
      <div className={`expblock-banner ${isCorrect ? "expblock-banner-correct" : "expblock-banner-wrong"}`}>
        <span className="expblock-banner-icon">{isCorrect ? "✓" : "✗"}</span>
        {isCorrect ? "Correct!" : "Not quite — here's why"}
      </div>

      {/* Body */}
      <div className="expblock-body">
        {/* AI style chip */}
        <span className="expblock-style-chip">
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
        </span>

        <MathText className="expblock-text">{explanation.text}</MathText>

        {hasSteps && (
          <ol className="expblock-steps">
            {explanation.steps!.map((step, i) => (
              <li key={i} className="expblock-step-item">
                <span className="expblock-step-number">{i + 1}</span>
                <MathText className="expblock-step-text">{step}</MathText>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

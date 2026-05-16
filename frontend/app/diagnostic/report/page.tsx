"use client";

import { useRouter } from "next/navigation";

const PLACEHOLDER_SECTIONS = [
  { title: "Topic Breakdown", icon: "📊", description: "Deep-dive accuracy per subtopic and question type." },
  { title: "Question-level Analysis", icon: "🔍", description: "See every question you attempted with your answer vs the correct one." },
  { title: "Time Trends", icon: "📈", description: "Track how your accuracy improves across sessions over time." },
  { title: "Difficulty Profile", icon: "⚡", description: "Understand which difficulty levels challenge you most." },
];

export default function DiagnosticReportPage() {
  const router = useRouter();

  return (
    <div
      className="page-enter"
      style={{ padding: "1.5rem", maxWidth: 560, margin: "0 auto", paddingBottom: "6rem" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--ink)",
            lineHeight: 1.2,
            marginBottom: "0.4rem",
          }}
        >
          Detailed Report
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          A richer breakdown of your diagnostic performance is coming soon. Check back after a few more practice sessions!
        </p>
      </div>

      {/* Placeholder sections */}
      <div style={{ marginBottom: "2rem" }}>
        {PLACEHOLDER_SECTIONS.map((section) => (
          <div
            key={section.title}
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--r-lg)",
              padding: "1rem 1.25rem",
              marginBottom: "0.75rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
              opacity: 0.8,
            }}
          >
            <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{section.icon}</span>
            <div>
              <p
                style={{
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  color: "var(--ink-2)",
                  marginBottom: "0.15rem",
                }}
              >
                {section.title}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.45 }}>
                {section.description}
              </p>
            </div>
            <span
              style={{
                marginLeft: "auto",
                flexShrink: 0,
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                background: "var(--brand-light)",
                color: "var(--brand)",
                borderRadius: 999,
                padding: "3px 8px",
                border: "1px solid var(--brand-muted)",
              }}
            >
              Soon
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => router.push("/diagnostic/result")}
        >
          ← Back to results
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push("/")}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}

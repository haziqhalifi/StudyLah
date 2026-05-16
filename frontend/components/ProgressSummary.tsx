"use client";

import { TopicStats, Level } from "@/lib/api";

interface Props {
  topics: TopicStats[];
}

const LEVEL_META: Record<Level, { color: string; bg: string; emoji: string }> = {
  beginner:   { color: "#dc2626", bg: "#fee2e2", emoji: "🌱" },
  developing: { color: "#d97706", bg: "#fef3c7", emoji: "📈" },
  proficient: { color: "#2563eb", bg: "#dbeafe", emoji: "🎯" },
  advanced:   { color: "#16a34a", bg: "#dcfce7", emoji: "🏆" },
};

function formatTopicLabel(topicId: string) {
  return topicId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProgressSummary({ topics }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {topics.map((t) => {
        const meta = LEVEL_META[t.level];
        const pct = Math.round(t.accuracy * 100);

        return (
          <div
            key={t.topic_id}
            style={{
              background: "white",
              borderRadius: 16,
              padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {/* Topic header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>
                  {meta.emoji} {formatTopicLabel(t.topic_id)}
                </h3>
                <p style={{ color: "#888", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
                  {t.attempts} question{t.attempts !== 1 ? "s" : ""} attempted · {t.correct} correct
                </p>
              </div>
              <span
                style={{
                  background: meta.bg,
                  color: meta.color,
                  borderRadius: 8,
                  padding: "0.3rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "capitalize",
                }}
              >
                {t.level}
              </span>
            </div>

            {/* Accuracy bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#666", fontWeight: 600 }}>Accuracy</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: meta.color }}>{pct}%</span>
              </div>
              <div style={{ background: "#f3f4f6", borderRadius: 99, height: 10 }}>
                <div
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${meta.color}, ${meta.bg === "#fee2e2" ? "#f87171" : meta.color})`,
                    height: "100%",
                    borderRadius: 99,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>

            {/* Next milestone hint */}
            {t.level !== "advanced" && (
              <p style={{ fontSize: "0.78rem", color: "#888", marginTop: "0.75rem" }}>
                {t.level === "beginner" && "Reach 40% accuracy to move to Developing"}
                {t.level === "developing" && "Reach 65% accuracy to move to Proficient"}
                {t.level === "proficient" && "Reach 85% accuracy to unlock Advanced"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

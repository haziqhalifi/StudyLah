"use client";

import { TopicStats, Level } from "@/lib/api";

interface Props {
  topics: TopicStats[];
}

const LEVEL_META: Record<Level, { chip: string; fill: string; label: string; next: string }> = {
  beginner: { chip: "chip chip-wrong", fill: "progress-fill wrong-fill", label: "Asas", next: "40% ke Tahap Berkembang" },
  developing: { chip: "chip chip-warn", fill: "progress-fill warn-fill", label: "Berkembang", next: "65% ke Tahap Mahir" },
  proficient: { chip: "chip chip-brand", fill: "progress-fill", label: "Mahir", next: "85% ke Tahap Cemerlang" },
  advanced: { chip: "chip chip-correct", fill: "progress-fill correct-fill", label: "Cemerlang", next: "" },
};

function fmtTopic(id: string) {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProgressSummary({ topics }: Props) {
  return (
    <div className="progress-summary">
      {topics.map((t) => {
        const meta = LEVEL_META[t.level];
        const pct = Math.round(t.accuracy * 100);
        return (
          <div key={t.topic_id} className="card topic-card page-enter">
            <div className="topic-card-header">
              <div>
                <h3 className="font-display topic-card-title">{fmtTopic(t.topic_id)}</h3>
                <p className="topic-card-sub">{t.attempts} cubaan · {t.correct} betul</p>
              </div>
              <span className={meta.chip}>{meta.label}</span>
            </div>

            <div className="topic-card-bar-row">
              <span className="topic-card-bar-label">Ketepatan</span>
              <span className="topic-card-bar-pct">{pct}%</span>
            </div>
            <div className="progress-track">
              <div className={meta.fill} style={{ width: `${pct}%` }} />
            </div>

            {meta.next && <p className="topic-card-next">{meta.next}</p>}
          </div>
        );
      })}
    </div>
  );
}


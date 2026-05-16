"use client";

import { TopicStats, Level } from "@/lib/api";

interface Props {
  topics: TopicStats[];
}

const LEVEL_META: Record<Level, { chip: string; fill: string; label: string; next: string }> = {
  beginner:   { chip: "chip chip-wrong",    fill: "progress-fill wrong-fill",   label: "Beginner",   next: "40% to Developing" },
  developing: { chip: "chip chip-warn",     fill: "progress-fill warn-fill",    label: "Developing", next: "65% to Proficient"  },
  proficient: { chip: "chip chip-brand",    fill: "progress-fill",              label: "Proficient", next: "85% to Advanced"    },
  advanced:   { chip: "chip chip-correct",  fill: "progress-fill correct-fill", label: "Advanced",   next: ""                   },
};

function fmtTopic(id: string) {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProgressSummary({ topics }: Props) {
  return (
    <div className="progress-summary">
      {topics.map((t) => {
        const meta = LEVEL_META[t.level];
        const pct  = Math.round(t.accuracy * 100);
        return (
          <div key={t.topic_id} className="card topic-card page-enter">
            <div className="topic-card-header">
              <div>
                <h3 className="font-display topic-card-title">{fmtTopic(t.topic_id)}</h3>
                <p className="topic-card-sub">{t.attempts} attempted · {t.correct} correct</p>
              </div>
              <span className={meta.chip}>{meta.label}</span>
            </div>

            <div className="topic-card-bar-row">
              <span className="topic-card-bar-label">Accuracy</span>
              <span className="topic-card-bar-pct">{pct}%</span>
            </div>
            <div className="progress-track">
              {/* width driven via CSS custom property to avoid inline style warning */}
              <div
                className={meta.fill}
                style={{ ["--bar-w" as string]: `${pct}%` }}
              />
            </div>

            {meta.next && (
              <p className="topic-card-next">{meta.next}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

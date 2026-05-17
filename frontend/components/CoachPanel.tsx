"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchCoachSummary,
  createPersonalizedQuiz,
  CoachSummaryResponse,
  CoachSuggestion,
  CoachTopicStats,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CoachPanelProps {
  userId: string;
}

// ---------------------------------------------------------------------------
// Badge colours by suggestion type
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<
  CoachSuggestion["type"],
  { label: string; className: string }
> = {
  focus_topic: {
    label: "Focus",
    className: "bg-[var(--wrong-bg)] text-[var(--wrong)]",
  },
  do_quiz: {
    label: "Quiz",
    className: "bg-[var(--info-bg)] text-[var(--info)]",
  },
  do_review: {
    label: "Review",
    className: "bg-[var(--warn-bg)] text-[var(--warn)]",
  },
  celebration: {
    label: "Well done",
    className: "bg-[var(--correct-bg)] text-[var(--correct)]",
  },
  consistency_nudge: {
    label: "Come back",
    className: "bg-[var(--brand-light)] text-[var(--brand)]",
  },
};

// ---------------------------------------------------------------------------
// Accuracy pill colour
// ---------------------------------------------------------------------------

function accuracyColor(accuracy: number): string {
  if (accuracy >= 0.75) return "text-[var(--correct)]";
  if (accuracy >= 0.4) return "text-[var(--warn)]";
  return "text-[var(--wrong)]";
}

// ---------------------------------------------------------------------------
// Skeleton placeholder
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2">
      <div className="h-3 w-1/3 rounded bg-gray-200" />
      <div className="h-4 w-3/4 rounded bg-gray-200" />
      <div className="h-3 w-full rounded bg-gray-200" />
      <div className="h-3 w-5/6 rounded bg-gray-200" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topic bar row
// ---------------------------------------------------------------------------

function TopicRow({ topic }: { topic: CoachTopicStats }) {
  const pct = Math.round(topic.accuracy * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-20 shrink-0 font-medium text-gray-700">
        {topic.topic_name}
      </span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            topic.accuracy >= 0.75
              ? "bg-[var(--correct)]"
              : topic.accuracy >= 0.4
              ? "bg-[var(--warn)]"
              : "bg-[var(--wrong)]"
          }`}
          style={{ width: topic.attempts === 0 ? "2px" : `${pct}%` }}
        />
      </div>
      <span className={`w-9 text-right font-semibold tabular-nums ${accuracyColor(topic.accuracy)}`}>
        {topic.attempts === 0 ? "—" : `${pct}%`}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggestion card
// ---------------------------------------------------------------------------

function SuggestionCard({
  suggestion,
  userId,
}: {
  suggestion: CoachSuggestion;
  userId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const badge = TYPE_BADGE[suggestion.type];

  async function handleCta() {
    if (!suggestion.cta_action) return;
    const action = suggestion.cta_action as Record<string, unknown>;

    if (action.type === "start_quiz") {
      setLoading(true);
      try {
        const topicId = action.topicId as "ubahan" | "matriks" | "insurans";
        const length = (action.length as number | undefined) ?? 5;
        const result = await createPersonalizedQuiz(userId, topicId, length);
        router.push(`/quiz/${result.quizId}`);
      } catch {
        // silent — user can retry
      } finally {
        setLoading(false);
      }
    } else if (action.type === "start_review") {
      router.push("/review");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
        {suggestion.priority === "high" && (
          <span className="text-xs text-[var(--wrong)] font-medium">● Priority</span>
        )}
      </div>

      <p className="font-semibold text-gray-800 text-sm leading-snug">
        {suggestion.title}
      </p>
      <p className="text-xs text-gray-500 leading-relaxed">{suggestion.message}</p>

      {suggestion.cta_label && (
        <button
          type="button"
          onClick={handleCta}
          disabled={loading}
          className="mt-1 w-full rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white
                     transition hover:bg-[var(--brand-dark)] active:scale-95 disabled:opacity-60"
        >
          {loading ? "Loading…" : suggestion.cta_label}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CoachPanel({ userId }: CoachPanelProps) {
  const [data, setData] = useState<CoachSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchCoachSummary(userId)
      .then(setData)
      .catch((err) => {
        console.error("[CoachPanel] fetchCoachSummary failed:", err);
        setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, [userId]);

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--wrong-bg)] bg-[var(--wrong-bg)] p-4 text-sm text-[var(--wrong)]">
        <p className="font-semibold">Could not load AI Coach</p>
        <p className="mt-1 text-xs opacity-75">{error}</p>
      </div>
    );
  }

  // Loading skeleton
  if (!data) {
    return (
      <section className="space-y-3">
        <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
        <SkeletonCard />
        <SkeletonCard />
      </section>
    );
  }

  const { snapshot, suggestions } = data;
  const triedTopics = snapshot.topics.filter((t) => t.attempts > 0);

  // Summary line
  const summaryLine = (() => {
    if (triedTopics.length === 0) {
      return "You haven't answered any questions yet. Start below!";
    }
    const weakest = [...triedTopics].sort((a, b) => a.accuracy - b.accuracy)[0];
    return (
      `You've answered ${snapshot.total_questions_answered} question${snapshot.total_questions_answered !== 1 ? "s" : ""} so far` +
      (weakest
        ? `. ${weakest.topic_name} is your weakest topic (${Math.round(weakest.accuracy * 100)}%).`
        : ".")
    );
  })();

  return (
    <section className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-gray-900">Your AI Coach</h2>
        <p className="text-xs text-gray-500 mt-0.5">{summaryLine}</p>
      </div>

      {/* Topic accuracy bars — only shown if any attempts exist */}
      {triedTopics.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Topic accuracy
          </p>
          {snapshot.topics.map((t) => (
            <TopicRow key={t.topic_id} topic={t} />
          ))}
        </div>
      )}

      {/* Suggestion cards */}
      {suggestions.length > 0 ? (
        <div className="space-y-3">
          {suggestions.slice(0, 3).map((s) => (
            <SuggestionCard key={s.id} suggestion={s} userId={userId} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500 text-center">
          No recommendations right now — check back after some practice!
        </div>
      )}
    </section>
  );
}


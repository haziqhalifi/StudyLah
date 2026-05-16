"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getReview,
  submitReviewAnswer,
  generateExplanation,
  ReviewItem,
  ReviewSubmitResponse,
} from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";
import AiBadge from "@/components/AiBadge";
import QuizSheet from "@/components/QuizSheet";
import StudyBuddyChat from "@/components/StudyBuddyChat";
import type { LearningContext } from "@/lib/types";

// ── Buddy message copy ────────────────────────────────────────────
// Adjust these strings to tune the "buddy" tone
const REASON_BUDDY: Record<string, string> = {
  low_accuracy:
    "Heads up — accuracy was low on this one last time. Let's nail it together! 💪",
  not_seen_recently:
    "You haven't seen this in a while. A quick refresh keeps it locked in! 🔄",
  weak_topic:
    "This topic needs a bit of love. We've got this! 🌱",
};

const REASON_LABEL: Record<string, string> = {
  low_accuracy: "Low accuracy",
  not_seen_recently: "Not seen recently",
  weak_topic: "Weak topic",
};

// Tags that get a coloured chip under the question header
const TAG_CHIP: Record<string, { label: string; cls: string }> = {
  ubahan:   { label: "Ubahan",   cls: "chip chip-brand"   },
  matriks:  { label: "Matriks",  cls: "chip chip-warn"    },
  insurans: { label: "Insurans", cls: "chip chip-correct" },
  review:   { label: "↺ Review", cls: "chip chip-brand"   },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Page ─────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();

  // TODO: replace hard-coded fallback with real auth/context
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<ReviewSubmitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showBuddy, setShowBuddy] = useState(false);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);

  function loadReview(uid: string) {
    setLoading(true);
    setError(false);
    getReview(uid)
      .then((res) => setItems(res.review_questions))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const uid = sessionStorage.getItem("userId");
    if (!uid) {
      router.push("/");
      return;
    }
    setUserId(uid);
    loadReview(uid);
  }, [router]);

  const item = items[idx];
  const done = !loading && !error && idx >= items.length;
  const empty = !loading && !error && items.length === 0;

  async function handleSubmit() {
    if (selected === null || !item || !userId) return;
    setSubmitting(true);
    try {
      const res = await submitReviewAnswer(userId, item.question.id, selected);
      setResult(res);
    } catch {
      // swallow — user can retry via "Next" or close
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setIdx((i) => i + 1);
    setSelected(null);
    setResult(null);
  }

  function handleSkip() {
    setIdx((i) => i + 1);
    setSelected(null);
    setResult(null);
  }

  async function handleGenerateExplanation() {
    if (!result || !item || !userId || selected === null) return;
    setGeneratingExplanation(true);
    try {
      const explanation = await generateExplanation(
        userId,
        item.question.id,
        selected,
      );
      setResult({ ...result, explanation });
    } catch {
      // silent — ExplanationBlock will keep showing the generate button
    } finally {
      setGeneratingExplanation(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) return <LoadingShell />;

  // ── Error ─────────────────────────────────────────────────────
  if (error)
    return (
      <div className="review-done page-enter">
        <div className="review-done-emoji">😬</div>
        <p className="review-done-sub" style={{ marginBottom: "1.5rem" }}>
          I couldn&apos;t load your review questions right now. Give it another
          shot!
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ maxWidth: 240, margin: "0 auto" }}
          onClick={() => userId && loadReview(userId)}
        >
          Try again
        </button>
      </div>
    );

  // ── Empty ─────────────────────────────────────────────────────
  if (empty)
    return (
      <div className="review-done page-enter">
        <div className="review-done-emoji">📚</div>
        <h2 className="font-display review-done-title">
          Nothing to review yet!
        </h2>
        <p className="review-done-sub">
          Keep practising and I&apos;ll surface your weak spots here.
        </p>
        <div className="review-done-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push("/materials")}
          >
            Go Learn →
          </button>
        </div>
      </div>
    );

  // ── All done ──────────────────────────────────────────────────
  if (done)
    return (
      <div className="review-done page-enter">
        <div className="review-done-emoji">🎉</div>
        <h2 className="font-display review-done-title">Review complete!</h2>
        {/* TODO: add a small confetti animation here */}
        <p className="review-done-sub">
          Nice! You&apos;ve cleared today&apos;s review. I&apos;ll bring things
          back later if we still need to work on them.
        </p>
        <div className="review-done-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push("/materials")}
          >
            Continue Learning →
          </button>
          <button
            type="button"
            className="btn-ghost diag-skip-btn"
            onClick={() => router.push("/assessment")}
          >
            Progress ▤
          </button>
        </div>
      </div>
    );

  // ── Tags chips ────────────────────────────────────────────────
  const tagChips = item.question.tags
    .filter((t) => TAG_CHIP[t.toLowerCase()])
    .map((t) => TAG_CHIP[t.toLowerCase()]);

  // ── Bottom action bar ─────────────────────────────────────────
  const bar = !result ? (
    <div className="review-bar-row">
      <button
        type="button"
        className="btn-primary"
        onClick={handleSubmit}
        disabled={selected === null || submitting}
      >
        {submitting ? "Checking…" : "Check answer"}
      </button>
      {/* Skip keeps session moving without penalising the user */}
      <button
        type="button"
        className="btn-ghost diag-skip-btn"
        onClick={handleSkip}
        disabled={submitting}
      >
        Skip
      </button>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <button type="button" className="btn-primary" onClick={handleNext}>
        {idx + 1 < items.length ? "Next review question →" : "Finish Review →"}
      </button>
      {/* Next-review time hint from spaced-repetition engine */}
      {result.next_review_at && (
        <p className="review-next-hint">
          I&apos;ll bring this back around{" "}
          <strong>{formatTime(result.next_review_at)}</strong> if needed.
        </p>
      )}
    </div>
  );

  return (
    <QuizSheet open bar={bar} onClose={() => router.push("/")}>
      {/* ── Header banner ── */}
      <div className="ai-cue ai-cue-review review-banner">
        <div className="review-banner-reason">
          {REASON_LABEL[item.reason] ?? item.reason}
        </div>
        <h1 className="font-display review-banner-title">Review time 😉</h1>
        <p className="review-banner-sub">
          I&apos;m bringing back things you might forget.
        </p>
      </div>

      {/* ── Progress ── */}
      <div className="review-progress-row">
        <span className="review-progress-label">Spaced repetition</span>
        <span className="review-progress-frac">
          {idx + 1} / {items.length}
        </span>
      </div>
      <div className="progress-track review-progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${Math.round(((idx + 1) / items.length) * 100)}%`,
          }}
        />
      </div>

      {/* ── Buddy bubble ── */}
      {/* TODO: add a subtle slide-in animation when the message changes */}
      <div className="buddy-bubble page-enter">
        <span className="buddy-bubble-avatar">🤖</span>
        <p className="buddy-bubble-text">
          {REASON_BUDDY[item.reason] ??
            "Let's revisit this one together. You've got this!"}
        </p>
      </div>

      {/* ── AI badge + topic tag chips ── */}
      <div className="review-meta-row">
        <AiBadge
          variant="review"
          label={REASON_LABEL[item.reason] ?? item.reason}
        />
        {tagChips.map((chip, i) => (
          <span key={i} className={chip.cls}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* ── Question ── */}
      <div className="diag-questions review-questions-gap">
        <QuestionCard
          question={item.question}
          selectedOptionIndex={selected}
          onSelectOption={result ? undefined : setSelected}
          showResult={result !== null}
          isCorrect={result?.is_correct}
          correctOptionIndex={result ? 0 : undefined}
          isReview
        />
      </div>

      {/* ── Explanation ── */}
      {result && (
        <ExplanationBlock
          explanation={result.explanation}
          isCorrect={result.is_correct}
          onGenerateExplanation={handleGenerateExplanation}
          isGenerating={generatingExplanation}
        />
      )}

      {/* StudyBuddy — context-aware for the current review question */}
      {userId && (
        <StudyBuddyChat
          userId={userId}
          isOpen={showBuddy}
          onClose={() => setShowBuddy(false)}
          learningContext={
            {
              topicId: (item.question.topic_id ?? "ubahan") as LearningContext["topicId"],
              topicName:
                item.question.topic_id === "matriks"
                  ? "Matriks (Matrices)"
                  : item.question.topic_id === "insurans"
                    ? "Insurans (Insurance)"
                    : "Ubahan (Variation)",
              currentQuestion: {
                id: item.question.id,
                text: item.question.text,
                options: item.question.options,
                difficulty: item.question.difficulty,
              },
              lastAttempt: result
                ? {
                    selectedOptionIndex: selected ?? 0,
                    isCorrect: result.is_correct,
                    correctOptionIndex: 0,
                  }
                : undefined,
              pageContext: "review",
            } satisfies LearningContext
          }
        />
      )}

      {!showBuddy && (
        <button
          type="button"
          className="sb-fab"
          onClick={() => setShowBuddy(true)}
          aria-label="Ask StudyBuddy"
        >
          🤖
        </button>
      )}
    </QuizSheet>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────
function LoadingShell() {
  return (
    <div className="page-enter">
      <div className="card skeleton-card-sm review-banner" />
      <div className="buddy-bubble-skeleton" />
      <div className="card skeleton-card" />
    </div>
  );
}

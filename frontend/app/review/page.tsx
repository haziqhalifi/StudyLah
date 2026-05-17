"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getReview,
  submitReviewAnswer,
  generateExplanation,
  ReviewItem,
  ReviewSubmitResponse,
  ReviewStatus,
} from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";
import AiBadge from "@/components/AiBadge";
import QuizSheet from "@/components/QuizSheet";
import StudyBuddyChat from "@/components/StudyBuddyChat";
import type { LearningContext } from "@/lib/types";

// ── Buddy message copy ────────────────────────────────────────────
const REASON_BUDDY: Record<string, string> = {
  low_accuracy:
    "Perhatian — ketepatan rendah pada kali lepas. Kita boleh buat lebih baik! 💪",
  not_seen_recently:
    "Anda belum lihat ini sejak lama. Ulangkaji pantas untuk kekalkan ingatan! 🔄",
  weak_topic: "Topik ini perlu sedikit perhatian. Kita boleh! 🌱",
  new: "Soalan baru — mari lihat bagaimana anda! 🆕",
  overdue: "Yang ini sudah lama menunggu — bagus anda mengulangkajinya sekarang! ⏰",
  due_for_review: "Tepat pada masanya! Mari kekalkan ingatan anda. 🎯",
  learning: "Mari kerjakan ini bersama! 📖",
};

const REASON_LABEL: Record<string, string> = {
  low_accuracy: "Ketepatan rendah",
  not_seen_recently: "Lama tidak dilihat",
  weak_topic: "Topik lemah",
  new: "Soalan baru",
  overdue: "Tertunggak",
  due_for_review: "Ulangkaji berjadual",
  learning: "Masih belajar",
};

// ── Spaced-rep status badges ──────────────────────────────────────
const STATUS_BADGE: Record<ReviewStatus, { label: string; cls: string }> = {
  learning:  { label: "Belajar",    cls: "chip chip-warn"    },
  reviewing: { label: "Mengulang",  cls: "chip chip-brand"   },
  mastered:  { label: "Dikuasai",   cls: "chip chip-correct" },
};

// Tags that get a coloured chip under the question header
const TAG_CHIP: Record<string, { label: string; cls: string }> = {
  ubahan:   { label: "Ubahan",   cls: "chip chip-brand"   },
  matriks:  { label: "Matriks",  cls: "chip chip-warn"    },
  insurans: { label: "Insurans", cls: "chip chip-correct" },
  review:   { label: "↺ Ulang Kaji", cls: "chip chip-brand"   },
};

function formatIntervalDays(days: number): string {
  if (days < 1) return "lewat hari ini";
  if (Math.round(days) === 1) return "esok";
  return `${Math.round(days)} hari`;
}

// ── Page ─────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [caughtUp, setCaughtUp] = useState(false);
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
      .then((res) => {
        setItems(res.review_items);
        setCaughtUp(res.caught_up);
      })
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
  const done = !loading && !error && idx >= items.length && items.length > 0;
  const empty = !loading && !error && (items.length === 0 || caughtUp);

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
      // silent — ExplanationBlock keeps showing the generate button
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
        <p className="review-done-sub review-done-sub-spaced">
          Soalan ulang kaji tidak dapat dimuatkan. Cuba lagi!
        </p>
        <button
          type="button"
          className="btn-primary review-done-button"
          onClick={() => userId && loadReview(userId)}
        >
          Cuba lagi
        </button>
      </div>
    );

  // ── All caught up (spaced-rep: no items due yet) ──────────────
  if (empty)
    return (
      <div className="review-done page-enter">
        <div className="review-done-emoji">✅</div>
        <h2 className="font-display review-done-title">
          {caughtUp ? "Anda sudah selesai!" : "Tiada yang perlu diulang kaji lagi!"}
        </h2>
        <p className="review-done-sub">
          {caughtUp
            ? "Anda telah selesai ulangkaji berjadual hari ini. Saya akan bawa kembali soalan pada masa yang sesuai untuk kekalkan ingatan anda — itulah pengulangan jarak."
            : "Teruskan berlatih dan saya akan tunjukkan titik lemah anda di sini setelah anda menjawab beberapa soalan."}
        </p>
        <div className="review-done-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push("/materials")}
          >
            {caughtUp ? "Teruskan Belajar →" : "Pergi Belajar →"}
          </button>
          {caughtUp && (
            <button
              type="button"
              className="btn-ghost diag-skip-btn"
              onClick={() => router.push("/assessment")}
            >
              Kemajuan ▤
            </button>
          )}
        </div>
      </div>
    );

  // ── All done ──────────────────────────────────────────────────
  if (done)
    return (
      <div className="review-done page-enter">
        <div className="review-done-emoji">🎉</div>
        <h2 className="font-display review-done-title">Ulang kaji selesai!</h2>
        <p className="review-done-sub">
          Bagus! Anda telah selesai ulangkaji hari ini. Saya akan jadualkan sesi seterusnya pada masa yang sesuai.
        </p>
        <div className="review-done-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push("/materials")}
          >
            Teruskan Belajar →
          </button>
          <button
            type="button"
            className="btn-ghost diag-skip-btn"
            onClick={() => router.push("/assessment")}
          >
            Kemajuan ▤
          </button>
        </div>
      </div>
    );

  // ── Tags chips ────────────────────────────────────────────────
  const tagChips = item.question.tags
    .filter((t) => TAG_CHIP[t.toLowerCase()])
    .map((t) => TAG_CHIP[t.toLowerCase()]);

  const statusBadge = STATUS_BADGE[item.status];

  // ── Bottom action bar ─────────────────────────────────────────
  const bar = !result ? (
    <div className="review-bar-row">
      <button
        type="button"
        className="btn-primary"
        onClick={handleSubmit}
        disabled={selected === null || submitting}
      >
        {submitting ? "Menyemak…" : "Semak jawapan"}
      </button>
      <button
        type="button"
        className="btn-ghost diag-skip-btn"
        onClick={handleSkip}
        disabled={submitting}
      >
        Langkau
      </button>
    </div>
  ) : (
    <div className="review-next-stack">
      <button type="button" className="btn-primary" onClick={handleNext}>
        {idx + 1 < items.length ? "Soalan ulang kaji seterusnya →" : "Selesai Ulang Kaji →"}
      </button>

      {/* Spaced-rep feedback after submit */}
      {result.review_state && (
        <p className="review-next-hint">
          {result.review_state.status === "mastered" ? (
            <>
              Soalan <strong>dikuasai</strong> — saya akan simpan sehingga masa yang sesuai. 🏆
            </>
          ) : (
            <>
              Ulang kaji seterusnya dalam{" "}
              <strong>
                {formatIntervalDays(result.review_state.interval_days)}
              </strong>
              {result.review_state.status === "learning"
                ? " — teruskan berlatih, anda pasti berjaya!"
                : " — kemajuan yang hebat!"}
            </>
          )}
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
        <h1 className="font-display review-banner-title">Masa ulang kaji 😉</h1>
        <p className="review-banner-sub">
          Saya membawa kembali perkara yang mungkin anda lupa.
        </p>
      </div>

      {/* ── Progress ── */}
      <div className="review-progress-row">
        <span className="review-progress-label">Pengulangan jarak</span>
        <span className="review-progress-frac">
          {idx + 1} / {items.length}
        </span>
      </div>
      <div className="review-progress-track review-progress-dots" aria-hidden="true">
        {items.map((_, progressIndex) => (
          <span
            key={progressIndex}
            className={`review-progress-dot ${progressIndex <= idx ? "active" : ""}`}
          />
        ))}
      </div>

      {/* ── Buddy bubble ── */}
      <div className="buddy-bubble page-enter">
        <span className="buddy-bubble-avatar">🤖</span>
        <p className="buddy-bubble-text">
          {REASON_BUDDY[item.reason] ??
            "Mari ulang kaji ini bersama. Anda boleh!"}
        </p>
      </div>

      {/* ── AI badge + status chip + overdue flag + topic chips ── */}
      <div className="review-meta-row">
        <AiBadge
          variant="review"
          label={REASON_LABEL[item.reason] ?? item.reason}
        />
        {/* SR status badge: Learning / Reviewing / Mastered */}
        {statusBadge && (
          <span className={statusBadge.cls}>{statusBadge.label}</span>
        )}
        {/* Overdue flag — shown when question missed its scheduled window */}
        {item.is_overdue && (
          <span className="chip chip-warn" title="Ini sudah tertunggak — bagus anda mengulangkajinya sekarang!">
            Tertunggak
          </span>
        )}
        {tagChips.map((chip, i) => (
          <span key={i} className={chip.cls}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* ── Overdue context note ── */}
      {item.is_overdue && (
        <p className="review-overdue-note">
          Ini sudah tertunggak — bagus anda mengulangkajinya sekarang!
        </p>
      )}

      {/* ── Question ── */}
      <div className="diag-questions review-questions-gap">
        <QuestionCard
          question={item.question}
          selectedOptionIndex={selected}
          onSelectOption={result ? undefined : setSelected}
          showResult={result !== null}
          isCorrect={result?.is_correct}
          correctOptionIndex={result ? result.correct_option_index : undefined}
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
                    correctOptionIndex: result.correct_option_index,
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
          aria-label="Tanya StudyBuddy"
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

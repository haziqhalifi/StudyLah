"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createUser,
  startOnboarding,
  submitOnboarding,
  type OnboardingDiagnosticResponse,
  type OnboardingQuestion,
} from "@/lib/api";
import MathText from "@/components/MathText";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "welcome" | "profile" | "quiz" | "analyzing" | "result";

interface SlotState {
  selected: number;
  isCorrect: boolean;
  revealed: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LETTERS = ["A", "B", "C", "D"];
const FEEDBACK_MS = 1500;

const DIALOGUES: Record<string, string[]> = {
  welcome: [
    "Hi! I'm Skorrel 🐿️ Think of me as your personal guide to acing SPM Matematik. Let's set up your learning path!",
  ],
  profile: [
    "Fill in your details below so I can set up your perfect learning path. Let's get those A's!",
  ],
  quiz_start: ["First question — let's go! 🚀"],
  quiz_correct: [
    "Amazing! You got it! 🎉",
    "Correct! You're on fire! 🔥",
    "Yes! Keep it up! ⭐",
    "Brilliant work! 💪",
  ],
  quiz_wrong: [
    "Oops! No worries, keep going! 💪",
    "Not quite — but that's how we learn! 📚",
    "Mistakes make us stronger! 🌱",
  ],
  quiz_mid: ["Halfway there! 🎯", "Almost done! Keep the momentum! ⚡"],
  analyzing: [
    "Let me look at your answers... 🔍",
    "Analysing with Google AI! 🧮",
  ],
  result: [
    "Your personalised path is ready! 🚀",
    "Check out your diagnosis! 📊",
  ],
};

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function TypewriterText({
  text,
  speed = 28,
  onStart,
  onDone,
}: {
  text: string;
  speed?: number;
  onStart?: () => void;
  onDone?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    onStart?.();
    if (!text.length) {
      onDone?.();
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{displayed}</>;
}

function topicTier(accuracy: number): { label: string; cls: string } {
  if (accuracy >= 0.75) return { label: "✓ MASTERED", cls: "strong" };
  if (accuracy >= 0.5) return { label: "○ GETTING THERE", cls: "medium" };
  return { label: "↑ NEEDS WORK", cls: "weak" };
}

function topicEmoji(topic: string) {
  if (topic.toLowerCase().includes("ubahan")) return "📐";
  if (topic.toLowerCase().includes("matriks")) return "🔢";
  if (topic.toLowerCase().includes("insurans")) return "📋";
  return "📘";
}

function getPersonalizedRoute(diag: OnboardingDiagnosticResponse): string {
  const weakest =
    [...diag.by_topic]
      .sort((a, b) => a.accuracy - b.accuracy)[0]
      ?.topic?.toLowerCase() ?? "";
  if (weakest.includes("ubahan")) return "/materials/ubahan/subtopics";
  if (weakest.includes("matriks")) return "/materials/matriks/subtopics";
  if (weakest.includes("insurans")) return "/materials/insurans/subtopics";
  return "/materials";
}

function getWeakestTopicName(diag: OnboardingDiagnosticResponse): string {
  return (
    [...diag.by_topic].sort((a, b) => a.accuracy - b.accuracy)[0]?.topic ??
    "Lessons"
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("welcome");
  const [dialogue, setDialogue] = useState(pick(DIALOGUES.welcome));
  const [dialogueKey, setDialogueKey] = useState(0);
  const [isTalking, setIsTalking] = useState(false);

  // Profile
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [form, setForm] = useState("4");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Quiz
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [qKey, setQKey] = useState(0);
  const [slotStates, setSlotStates] = useState<Record<number, SlotState>>({});
  const [score, setScore] = useState(0);
  const answersRef = useRef<Record<string, number>>({});

  // Result
  const [result, setResult] = useState<OnboardingDiagnosticResponse | null>(
    null,
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showDialogue(key: string) {
    setDialogue(pick(DIALOGUES[key] ?? DIALOGUES.welcome));
    setDialogueKey((k) => k + 1);
  }

  const progress = (() => {
    if (step === "welcome") return 0;
    if (step === "profile") return 4;
    if (step === "quiz")
      return 8 + Math.round((qIndex / (questions.length || 10)) * 88);
    if (step === "analyzing") return 98;
    return 100;
  })();

  // ── Profile submit ─────────────────────────────────────────────────────────

  async function handleStartQuiz() {
    if (!name.trim() || !school.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const userId =
        sessionStorage.getItem("userId") ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `user-${Date.now()}`);
      sessionStorage.setItem("userId", userId);
      sessionStorage.setItem("onboardingName", name.trim());
      sessionStorage.setItem("onboardingSchool", school.trim());
      sessionStorage.setItem("onboardingForm", form);

      await createUser(userId, name.trim());
      const res = await startOnboarding(
        name.trim(),
        school.trim(),
        Number(form),
      );

      setSessionId(res.session_id);
      setQuestions(res.questions);
      setQIndex(0);
      setQKey((k) => k + 1);
      setSlotStates({});
      setScore(0);
      answersRef.current = {};
      setStep("quiz");
      showDialogue("quiz_start");
    } catch {
      setError(
        "Unable to start onboarding. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Option pick ────────────────────────────────────────────────────────────

  function handlePick(optionIdx: number) {
    const q = questions[qIndex];
    if (!q || slotStates[qIndex]?.revealed) return;

    const isCorrect = optionIdx === q.correct_index;
    answersRef.current[q.id] = optionIdx;
    if (isCorrect) setScore((s) => s + 1);

    setSlotStates((prev) => ({
      ...prev,
      [qIndex]: { selected: optionIdx, isCorrect, revealed: true },
    }));
    showDialogue(isCorrect ? "quiz_correct" : "quiz_wrong");

    setTimeout(() => {
      const isLast = qIndex === questions.length - 1;
      if (isLast) {
        handleFinishQuiz();
      } else {
        const next = qIndex + 1;
        setQIndex(next);
        setQKey((k) => k + 1);
        showDialogue(
          next === Math.floor(questions.length / 2)
            ? "quiz_mid"
            : isCorrect
              ? "quiz_correct"
              : "quiz_wrong",
        );
      }
    }, FEEDBACK_MS);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleFinishQuiz() {
    setStep("analyzing");
    showDialogue("analyzing");

    const minDelay = new Promise<void>((r) => setTimeout(r, 2500));
    const payload = questions.map((q) => ({
      question_id: q.id,
      selected_option_index: answersRef.current[q.id] ?? -1,
    }));

    try {
      const [res] = await Promise.all([
        submitOnboarding(sessionId, payload),
        minDelay,
      ]);
      localStorage.setItem("onboardingDiagnosticShown", "1");
      setResult(res);
      setStep("result");
      showDialogue("result");
    } catch {
      setError("AI diagnostic failed. Please retry.");
      setStep("quiz");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const currentQ = questions[qIndex];
  const currentSlot = slotStates[qIndex];

  function optionClass(idx: number) {
    if (!currentSlot?.revealed) return "ob-option";
    if (idx === currentQ?.correct_index) return "ob-option ob-correct";
    if (idx === currentSlot.selected && !currentSlot.isCorrect)
      return "ob-option ob-wrong";
    return "ob-option ob-dimmed";
  }

  return (
    <div className={`ob-page ${step === "result" ? "ob-page--result" : ""}`}>
      {/* Fixed progress bar */}
      <div className="ob-progress-track">
        <div
          className="ob-progress-fill ob-progress-fill-dynamic"
          data-pct={progress}
        />
      </div>
      <ProgressFillDriver pct={progress} />

      {/* Back button — above mascot on profile step */}
      {step === "profile" && (
        <button
          type="button"
          className="ob-back-btn"
          onClick={() => {
            setStep("welcome");
            showDialogue("welcome");
          }}
          aria-label="Back"
        >
          ‹
        </button>
      )}

      {/* Mascot + dialogue — profile step only (side-by-side) */}
      {step === "profile" && (
        <div className="ob-mascot-row">
          <span
            style={{
              display: "inline-block",
              transform: "scaleX(-1)",
              flexShrink: 0,
            }}
          >
            <Image
              src="/assets/mascot.webp"
              alt="Skorrel"
              width={104}
              height={104}
              className={`ob-mascot-img${isTalking ? " ob-mascot-talking" : ""}`}
              style={{ width: "104px", height: "104px" }}
              priority
            />
          </span>
          <div className="ob-dialogue" key={dialogueKey}>
            <TypewriterText
              text={dialogue}
              onStart={() => setIsTalking(true)}
              onDone={() => setIsTalking(false)}
            />
          </div>
        </div>
      )}

      {/* ── WELCOME ────────────────────────────────────────────────────────── */}
      {step === "welcome" && (
        <>
          <div className="ob-welcome-layout">
            {/* Bubble: normal flow, grows downward */}
            <div className="ob-dialogue ob-dialogue--above" key={dialogueKey}>
              <TypewriterText text={dialogue} />
            </div>
            {/* Mascot: absolutely anchored at bottom, never moves */}
            <div className="ob-mascot-wrapper">
              <Image
                src="/assets/mascot.webp"
                alt="Skorrel"
                width={180}
                height={180}
                className="ob-mascot-center"
                style={{ width: "180px", height: "180px" }}
                priority
              />
            </div>
          </div>

          <div className="ob-sticky-cta">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setStep("profile");
                showDialogue("profile");
              }}
            >
              Let&apos;s Start! 🚀
            </button>
          </div>
        </>
      )}

      {/* ── PROFILE ────────────────────────────────────────────────────────── */}
      {step === "profile" && (
        <>
          <div className="ob-form">
            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-name">
                Your Name
              </label>
              <input
                id="ob-name"
                className="ob-input"
                type="text"
                placeholder="e.g. Ahmad Haziq"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-school">
                School
              </label>
              <input
                id="ob-school"
                className="ob-input"
                type="text"
                placeholder="e.g. SMK Taman Desa"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                autoComplete="organization"
              />
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-form">
                Form
              </label>
              <select
                id="ob-form"
                className="ob-input ob-select"
                value={form}
                onChange={(e) => setForm(e.target.value)}
              >
                {[1, 2, 3, 4, 5].map((f) => (
                  <option key={f} value={f}>
                    Form {f}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="ob-form-error">{error}</p>}
          </div>

          <div className="ob-sticky-cta">
            <button
              type="button"
              className="btn-primary"
              onClick={handleStartQuiz}
              disabled={loading}
            >
              {loading ? "Loading questions..." : "Start Quiz →"}
            </button>
          </div>
        </>
      )}

      {/* ── QUIZ ───────────────────────────────────────────────────────────── */}
      {step === "quiz" && currentQ && (
        <>
          {/* Counter + score */}
          <div className="ob-quiz-header">
            <span className="ob-q-counter">
              Question {qIndex + 1} / {questions.length}
            </span>
            <span className="ob-score-chip">⭐ {score} correct</span>
          </div>

          {/* Dot mini-progress */}
          <div className="ob-dots-row">
            {questions.map((_, i) => {
              const slot = slotStates[i];
              return (
                <div
                  key={i}
                  className={[
                    "ob-dot",
                    i === qIndex ? "ob-dot-active" : "",
                    slot
                      ? slot.isCorrect
                        ? "ob-dot-correct"
                        : "ob-dot-wrong"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              );
            })}
          </div>

          {/* Question card — keyed so slide animation re-fires on advance */}
          <div className="ob-question-enter" key={qKey}>
            <div className="ob-topic-tag">
              {topicEmoji(currentQ.topic)} {currentQ.topic}
            </div>

            <p className="ob-q-text">
              <MathText>{currentQ.text}</MathText>
            </p>

            <div className="ob-options">
              {currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={optionClass(idx)}
                  onClick={() => handlePick(idx)}
                  disabled={!!currentSlot?.revealed}
                >
                  <span className="ob-option-letter">{LETTERS[idx]}</span>
                  <span className="ob-option-text">
                    <MathText inline>{opt}</MathText>
                  </span>
                  {currentSlot?.revealed && idx === currentQ.correct_index && (
                    <span className="ob-option-check ob-option-check-correct">
                      ✓
                    </span>
                  )}
                  {currentSlot?.revealed &&
                    idx === currentSlot.selected &&
                    !currentSlot.isCorrect && (
                      <span className="ob-option-check ob-option-check-wrong">
                        ✗
                      </span>
                    )}
                </button>
              ))}
            </div>

            {currentSlot?.revealed && (
              <p className="ob-next-hint">
                {currentSlot.isCorrect
                  ? "Correct! Next question loading…"
                  : `The correct answer was ${LETTERS[currentQ.correct_index]}. Moving on…`}
              </p>
            )}
          </div>

          {error && <p className="ob-form-error">{error}</p>}
        </>
      )}

      {/* ── ANALYZING ──────────────────────────────────────────────────────── */}
      {step === "analyzing" && (
        <div className="ob-analyzing">
          <Image
            src="/assets/mascot.webp"
            alt="Lah analysing"
            width={110}
            height={110}
            className="ob-analyzing-mascot"
          />
          <h2 className="ob-analyzing-title">Analysing your results…</h2>
          <p className="ob-analyzing-sub">
            Google AI is building your personalised
            <br />
            SPM learning path 🗺️
          </p>
          <div className="ob-spinner" />
          <div className="ob-bounce-dots">
            <div className="ob-bounce-dot" />
            <div className="ob-bounce-dot" />
            <div className="ob-bounce-dot" />
          </div>
        </div>
      )}

      {/* ── RESULT ─────────────────────────────────────────────────────────── */}
      {step === "result" && result && (
        <ResultScreen
          result={result}
          userName={name}
          onContinue={() => router.push(getPersonalizedRoute(result))}
          weakestTopic={getWeakestTopicName(result)}
        />
      )}
    </div>
  );
}

// ─── Progress fill driver (avoids inline style on the fill bar) ───────────────

function ProgressFillDriver({ pct }: { pct: number }) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".ob-progress-fill-dynamic");
    if (el) el.style.width = `${pct}%`;
  }, [pct]);
  return null;
}

// ─── Result Screen ────────────────────────────────────────────────────────────

const RING_R = 52;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

function ResultScreen({
  result,
  userName,
  weakestTopic: _weakestTopic,
  onContinue,
}: {
  result: OnboardingDiagnosticResponse;
  userName: string;
  weakestTopic: string;
  onContinue: () => void;
}) {
  const pct = Math.round((result.score / result.total) * 100);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    let raf: number;
    const duration = 950;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplayScore(Math.round(eased * result.score));
      setDisplayPct(Math.round(eased * pct));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ringColor =
    pct >= 70 ? "var(--correct)" : pct >= 45 ? "#f59e0b" : "var(--wrong)";
  const ringOffset = CIRCUMFERENCE - (CIRCUMFERENCE * displayPct) / 100;

  return (
    <>
      {/* Score hero */}
      <div className="ob-result-hero">
        <div className="ob-score-ring-wrap">
          <svg
            className="ob-score-svg"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle className="ob-score-svg-track" cx="60" cy="60" r={RING_R} />
            <circle
              className="ob-score-svg-fill"
              cx="60"
              cy="60"
              r={RING_R}
              style={{ stroke: ringColor, strokeDashoffset: ringOffset }}
            />
          </svg>
          <div className="ob-score-circle" style={{ borderColor: ringColor }}>
            <span className="ob-score-number">
              {displayScore}
              <span className="ob-score-denom-inline">/{result.total}</span>
            </span>
            <span className="ob-score-denom">{displayPct}%</span>
          </div>
        </div>
        <p className="ob-xp-line ob-result-fadein ob-delay-1">
          +50 XP earned for completing your diagnosis!
        </p>
        <h2 className="ob-result-title ob-result-fadein ob-delay-2">
          {pct >= 70 ? "Excellent" : pct >= 45 ? "Good effort" : "Great start"},{" "}
          {userName || "student"}! 🎉
        </h2>
        <p className="ob-result-sub ob-result-fadein ob-delay-3">
          Your personalised diagnosis is ready
        </p>
      </div>

      {/* Topic breakdown */}
      {result.by_topic.length > 0 && (
        <section className="ob-breakdown-section">
          <p className="ob-breakdown-label">Topic Breakdown</p>
          {result.by_topic.map((t, i) => {
            const tier = topicTier(t.accuracy);
            return (
              <div
                key={t.topic}
                className="ob-topic-card ob-result-fadein"
                style={{ animationDelay: `${0.6 + i * 0.12}s` }}
              >
                <div className="ob-topic-row">
                  <span className="ob-topic-name">
                    {topicEmoji(t.topic)} {t.topic}
                  </span>
                  <span className={`ob-topic-badge ${tier.cls}`}>
                    {tier.label}
                  </span>
                </div>
                <p className="ob-topic-score">
                  {t.correct}/{t.total} correct
                </p>
                <div className="ob-topic-bar-track">
                  <div
                    className={`ob-topic-bar-fill ${tier.cls}`}
                    style={{ width: `${Math.round(t.accuracy * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* AI Recommendation */}
      <div className="ob-ai-card">
        <div className="ob-ai-label">
          <span>✦</span> AI Diagnosis
        </div>
        <p className="ob-ai-text">{result.recommendation}</p>
      </div>

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div className="ob-list-card">
          <h4 className="ob-list-title">
            <span className="ob-list-icon ob-list-icon-correct">✅</span> Your
            Strengths
          </h4>
          {result.strengths.map((s, i) => (
            <div key={i} className="ob-list-item">
              <span className="ob-list-bullet ob-list-bullet-correct">•</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Next step */}
      {result.next_step && (
        <div className="ob-list-card ob-list-card-last">
          <h4 className="ob-list-title">
            <span className="ob-list-icon ob-list-icon-brand">🎯</span> Next
            Step
          </h4>
          <div className="ob-list-item">
            <span className="ob-list-bullet ob-list-bullet-brand">→</span>
            <span>{result.next_step}</span>
          </div>
        </div>
      )}

      <div className="ob-sticky-cta ob-sticky-cta--floating">
        <button type="button" className="btn-primary" onClick={onContinue}>
          Start My Learning Path →
        </button>
      </div>
    </>
  );
}

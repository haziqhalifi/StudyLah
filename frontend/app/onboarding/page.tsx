"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createUser,
  startOnboarding,
  submitOnboarding,
  submitAnswer as apiSubmitAnswer,
  generateExplanation,
  type Explanation,
  type OnboardingDiagnosticResponse,
  type OnboardingQuestion,
} from "@/lib/api";
import QuizSheet from "@/components/QuizSheet";
import QuestionCard from "@/components/QuestionCard";
import ExplanationBlock from "@/components/ExplanationBlock";
import StudyBuddyPanel from "@/components/StudyBuddyPanel";
import {
  playSubmitSound,
  playCorrectSound,
  playWrongSound,
} from "@/lib/sounds";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "welcome" | "profile" | "quiz" | "analyzing" | "result";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIALOGUES: Record<string, string[]> = {
  welcome: [
    "Hi! I'm Skorrel 🐿️ Think of me as your personal guide to acing SPM Matematik. Let's set up your learning path!",
  ],
  profile: [
    "Fill in your details below so I can set up your perfect learning path. Let's get those A's!",
  ],
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
  if (weakest.includes("ubahan")) return "/learning";
  if (weakest.includes("matriks")) return "/learning";
  if (weakest.includes("insurans")) return "/learning";
  return "/learning";
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
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [showBuddy, setShowBuddy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const answersRef = useRef<Record<string, number>>({});

  // Result
  const [result, setResult] = useState<OnboardingDiagnosticResponse | null>(
    null,
  );

  useEffect(() => {
    const uid = sessionStorage.getItem("userId");
    setUserId(uid);
    const storedXp = parseInt(sessionStorage.getItem("userXp") ?? "0", 10);
    setXp(isNaN(storedXp) ? 0 : storedXp);
  }, []);

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
      const uid =
        sessionStorage.getItem("userId") ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `user-${Date.now()}`);
      sessionStorage.setItem("userId", uid);
      sessionStorage.setItem("userName", name.trim());
      sessionStorage.setItem("onboardingName", name.trim());
      sessionStorage.setItem("onboardingSchool", school.trim());
      sessionStorage.setItem("onboardingForm", form);

      await createUser(uid, name.trim());
      const res = await startOnboarding(
        name.trim(),
        school.trim(),
        Number(form),
      );

      setSessionId(res.session_id);
      setQuestions(res.questions);
      setQIndex(0);
      setSelected(null);
      setSubmitted(false);
      setScore(0);
      setSessionStreak(0);
      answersRef.current = {};
      setUserId(uid);
      setStep("quiz");
    } catch {
      setError(
        "Unable to start onboarding. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Submit answer ──────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (selected === null) return;
    const q = questions[qIndex];
    if (!q) return;

    playSubmitSound();

    const isCorrect = selected === q.correct_index;
    answersRef.current[q.id] = selected;

    if (isCorrect) {
      setScore((s) => s + 1);
      setSessionStreak((s) => s + 1);
      setTimeout(playCorrectSound, 100);
    } else {
      setSessionStreak(0);
      setTimeout(playWrongSound, 100);
    }

    const xpGain = isCorrect ? 10 : 5;
    setXp((prev) => {
      const next = prev + xpGain;
      sessionStorage.setItem("userXp", String(next));
      return next;
    });

    if (userId) {
      apiSubmitAnswer(userId, q.id, selected).catch(() => {});
    }

    setSubmitted(true);
  }

  async function handleGenerateExplanation() {
    const q = questions[qIndex];
    if (!userId || selected === null || !q) return;
    setIsGeneratingExplanation(true);
    try {
      const exp = await generateExplanation(userId, q.id, selected);
      setExplanation(exp);
    } catch {
      // silently ignore
    } finally {
      setIsGeneratingExplanation(false);
    }
  }

  // ── Next question / finish ─────────────────────────────────────────────────

  function handleNext() {
    const isLast = qIndex === questions.length - 1;
    if (isLast) {
      handleFinishQuiz();
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
      setSubmitted(false);
      setExplanation(null);
      setShowBuddy(false);
    }
  }

  // ── Submit quiz ────────────────────────────────────────────────────────────

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

  // ── QUIZ step — identical UI to learn page quiz ───────────────────────────
  if (step === "quiz" && currentQ) {
    const quizQuestion = {
      id: currentQ.id,
      text: currentQ.text,
      options: currentQ.options,
      topic_id: currentQ.topic,
      difficulty: "sederhana" as const,
      tags: [] as string[],
    };

    const isCorrect = selected === currentQ.correct_index;
    const isFinalQ = qIndex === questions.length - 1;
    const done = qIndex + (submitted ? 1 : 0);

    const bar = !submitted ? (
      <button
        type="button"
        className="btn-primary"
        disabled={selected === null}
        onClick={handleSubmit}
      >
        Hantar Jawapan
      </button>
    ) : (
      <div
        className={`qs-feedback-panel ${isCorrect ? "qs-feedback-correct" : "qs-feedback-wrong"}`}
      >
        <div className="qs-feedback-top">
          <span className="qs-feedback-icon">{isCorrect ? "✓" : "✗"}</span>
          <div className="qs-feedback-text">
            <p className="qs-feedback-title">
              {isCorrect ? "Betul!" : "Jawapan Salah"}
            </p>
            {!isCorrect && (
              <p className="qs-feedback-hint">
                Semak jawapan betul yang ditunjukkan di atas.
              </p>
            )}
          </div>
        </div>
        <button type="button" className="qs-feedback-btn" onClick={handleNext}>
          {isFinalQ ? "TAMAT SESI" : "SETERUSNYA"} &rsaquo;
        </button>
      </div>
    );

    return (
      <QuizSheet
        open
        onClose={() => {
          setStep("welcome");
          showDialogue("welcome");
        }}
        title="Diagnostic Quiz"
        subtitle={`Soalan ${qIndex + 1} / ${questions.length}`}
        progress={done}
        total={questions.length}
        streak={sessionStreak}
        xp={xp}
        bar={bar}
      >
        <QuestionCard
          question={quizQuestion}
          selectedOptionIndex={selected}
          onSelectOption={submitted ? undefined : setSelected}
          showResult={submitted}
          isCorrect={isCorrect}
          correctOptionIndex={currentQ.correct_index}
        />

        {submitted && (
          <ExplanationBlock
            explanation={explanation}
            isCorrect={isCorrect}
            onGenerateExplanation={handleGenerateExplanation}
            isGenerating={isGeneratingExplanation}
          />
        )}

        {submitted && showBuddy && userId && (
          <StudyBuddyPanel
            userId={userId}
            questionContext={currentQ.text}
            onClose={() => setShowBuddy(false)}
          />
        )}

        {submitted && !showBuddy && (
          <button
            type="button"
            className="sb-fab"
            onClick={() => setShowBuddy(true)}
            aria-label="Tanya Skorrel"
          >
            <img
              src="/assets/mascot.webp"
              alt="Skorrel"
              className="sb-fab-img"
            />
          </button>
        )}
      </QuizSheet>
    );
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
          <span className="ob-mascot-flip">
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
            <div className="ob-dialogue ob-dialogue--above" key={dialogueKey}>
              <TypewriterText text={dialogue} />
            </div>
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

// ─── TopicCard (uses ref to set dynamic CSS vars without inline styles) ───────

function TopicCard({
  topic,
  correct,
  total,
  accuracy,
  tier,
  index,
}: {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
  tier: { label: string; cls: string };
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current)
      cardRef.current.style.animationDelay = `${0.6 + index * 0.12}s`;
    if (barRef.current)
      barRef.current.style.width = `${Math.round(accuracy * 100)}%`;
  }, [index, accuracy]);

  return (
    <div ref={cardRef} className="ob-topic-card ob-result-fadein">
      <div className="ob-topic-row">
        <span className="ob-topic-name">
          {topicEmoji(topic)} {topic}
        </span>
        <span className={`ob-topic-badge ${tier.cls}`}>{tier.label}</span>
      </div>
      <p className="ob-topic-score">
        {correct}/{total} correct
      </p>
      <div className="ob-topic-bar-track">
        <div ref={barRef} className={`ob-topic-bar-fill ${tier.cls}`} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const ringFillRef = useRef<SVGCircleElement>(null);
  const ringCircleRef = useRef<HTMLDivElement>(null);

  const ringColor =
    pct >= 70 ? "var(--correct)" : pct >= 45 ? "#f59e0b" : "var(--wrong)";

  useEffect(() => {
    let raf: number;
    const duration = 950;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      const score = Math.round(eased * result.score);
      const pctNow = Math.round(eased * pct);
      const offset = CIRCUMFERENCE - (CIRCUMFERENCE * pctNow) / 100;
      setDisplayScore(score);
      setDisplayPct(pctNow);
      if (ringFillRef.current) {
        ringFillRef.current.style.strokeDashoffset = String(offset);
        ringFillRef.current.style.stroke = ringColor;
      }
      if (ringCircleRef.current) {
        ringCircleRef.current.style.borderColor = ringColor;
      }
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              ref={ringFillRef}
              className="ob-score-svg-fill"
              cx="60"
              cy="60"
              r={RING_R}
            />
          </svg>
          <div ref={ringCircleRef} className="ob-score-circle">
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
              <TopicCard
                key={t.topic}
                topic={t.topic}
                correct={t.correct}
                total={t.total}
                accuracy={t.accuracy}
                tier={tier}
                index={i}
              />
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

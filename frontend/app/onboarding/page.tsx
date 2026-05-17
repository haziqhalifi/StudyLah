"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createUser,
  startOnboarding,
  submitOnboarding,
  submitAnswer as apiSubmitAnswer,
  type OnboardingDiagnosticResponse,
  type OnboardingQuestion,
} from "@/lib/api";
import QuizSheet from "@/components/QuizSheet";
import QuestionCard from "@/components/QuestionCard";
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
    "Hmm, interesting results! 🤔",
    "Analysing with Google AI! 🧮",
    "Almost there, building your path... 📚",
    "This looks promising! 🌟",
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
  if (accuracy >= 0.75) return { label: "✓ MANTAP!", cls: "strong" };
  if (accuracy >= 0.5) return { label: "Dah ok, jom mantapkan lagi", cls: "medium" };
  return { label: "Fokus utama kamu", cls: "weak" };
}

function topicEmoji(topic: string) {
  if (topic.toLowerCase().includes("ubahan")) return "📐";
  if (topic.toLowerCase().includes("matriks")) return "🔢";
  if (topic.toLowerCase().includes("insurans")) return "📋";
  return "📘";
}

function topicPracticeCta(_topic: string, accuracy: number): { text: string; time: string } {
  const pct = Math.round(accuracy * 100);
  if (pct === 0) return { text: "Mulakan dengan contoh mudah →", time: "~8 min" };
  if (accuracy < 0.5) return { text: "Latih soalan seterusnya →", time: "~10 min" };
  return { text: "Ulang kaji soalan lagi →", time: "~8 min" };
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

const ANALYZING_MESSAGES = [
  "Let me look at your answers... 🔍",
  "Hmm, interesting results! 🤔",
  "Analysing with Google AI! 🧮",
  "Almost there, building your path... 📚",
  "This looks promising! 🌟",
];

function AnalyzingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % ANALYZING_MESSAGES.length);
        setVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(cycle);
  }, []);

  return (
    <div className="ob-analyzing">
      <div className="ob-analyzing-bubble" data-visible={visible}>
        <span>{ANALYZING_MESSAGES[msgIndex]}</span>
        <div className="ob-bubble-dots">
          <span /><span /><span />
        </div>
      </div>
      <Image
        src="/assets/mascot.webp"
        alt="Skorrel analysing"
        width={120}
        height={120}
        className="ob-analyzing-mascot ob-analyzing-mascot--talking"
      />
    </div>
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


  // ── Next question / finish ─────────────────────────────────────────────────

  function handleNext() {
    const isLast = qIndex === questions.length - 1;
    if (isLast) {
      handleFinishQuiz();
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
      setSubmitted(false);
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
      difficulty: "medium" as const,
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
        Semak
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

        {submitted && showBuddy && userId && (
          <StudyBuddyPanel
            userId={userId}
            questionContext={currentQ.text}
            topicId={currentQ.topic}
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
        <AnalyzingScreen />
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

// ─── TopicCard — bold data-forward card with animated fill bar ───────────────

function TopicCard({
  topic,
  correct,
  total,
  accuracy,
  tier,
  index,
  isWeakest,
  onPractice,
}: {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
  tier: { label: string; cls: string };
  index: number;
  isWeakest: boolean;
  onPractice: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pct = Math.round(accuracy * 100);
  const cta = topicPracticeCta(topic, accuracy);

  useEffect(() => {
    if (cardRef.current)
      cardRef.current.style.animationDelay = `${0.4 + index * 0.15}s`;
    const t = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = `${pct}%`;
    }, 100);
    return () => clearTimeout(t);
  }, [index, pct]);

  return (
    <div
      ref={cardRef}
      className={`ob2-topic-card ob-result-fadein ob2-topic-card--${tier.cls}${isWeakest ? " ob2-topic-card--featured" : ""}`}
    >
      <div className="ob2-topic-header">
        <span className="ob2-topic-emoji">{topicEmoji(topic)}</span>
        <div className="ob2-topic-info">
          <div className="ob2-topic-name-row">
            <span className="ob2-topic-name">{topic}</span>
            {isWeakest && (
              <span className="ob2-recommended-badge">Disyorkan sekarang</span>
            )}
          </div>
          <span className="ob2-topic-score">{correct}/{total} betul · {pct}%</span>
        </div>
        <span className={`ob2-tier-badge ob2-tier-badge--${tier.cls}`}>
          {pct}%
        </span>
      </div>
      <div className="ob2-bar-track">
        <div ref={barRef} className={`ob2-bar-fill ob2-bar-fill--${tier.cls}`} />
      </div>
      <div className="ob2-topic-footer">
        <span className="ob2-tier-label">{tier.label}</span>
        <button type="button" className="ob2-topic-cta-btn" onClick={onPractice}>
          {cta.text}
          <span className="ob2-topic-cta-meta">{cta.time}</span>
        </button>
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

  const grade =
    pct >= 70 ? { label: "Excellent", emoji: "🏆", mod: "high" }
    : pct >= 45 ? { label: "Good effort", emoji: "💪", mod: "mid" }
    : { label: "Great start", emoji: "🌱", mod: "low" };

  const sortedTopics = [...result.by_topic].sort((a, b) => a.accuracy - b.accuracy);
  const weakestTopic = sortedTopics[0];
  const weakestTopicName = weakestTopic?.topic ?? "";

  function getRouteForTopic(topicName: string): string {
    const t = topicName.toLowerCase();
    if (t.includes("ubahan")) return "/materials/ubahan/subtopics";
    if (t.includes("matriks")) return "/materials/matriks/subtopics";
    if (t.includes("insurans")) return "/materials/insurans/subtopics";
    return "/materials";
  }

  // suppress unused-variable warning — kept to satisfy call-site signature
  void getRouteForTopic;

  return (
    <div className="ob2-result-page">

      {/* ── HERO ── */}
      <div className={`ob2-hero ob2-hero--${grade.mod}`}>
        <div className="ob2-hero-noise" aria-hidden="true" />

        {/* XP pill */}
        <div className="ob2-xp-pill ob-result-fadein">
          <span className="ob2-xp-bolt">⚡</span>+50 XP
        </div>

        {/* Score ring */}
        <div className="ob2-ring-wrap">
          <svg className="ob2-ring-svg" viewBox="0 0 140 140" aria-hidden="true">
            <defs>
              <filter id="ring-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle className="ob2-ring-track" cx="70" cy="70" r={RING_R} />
            <circle
              ref={ringFillRef}
              className="ob2-ring-fill"
              cx="70" cy="70" r={RING_R}
              filter="url(#ring-glow)"
            />
          </svg>
          <div className="ob2-ring-inner">
            <span className="ob2-ring-score" ref={ringCircleRef}>
              {displayScore}<span className="ob2-ring-total">/{result.total}</span>
            </span>
            <span className="ob2-ring-pct">{displayPct}%</span>
          </div>
        </div>

        {/* Headline */}
        <h2 className="ob2-hero-title ob-result-fadein">
          {grade.emoji} {grade.label}, {userName || "pelajar"}!
        </h2>
        <p className="ob2-hero-sub ob-result-fadein">
          Ini diagnosis awal tahap SPM kamu.
        </p>

        {/* Primary CTA — weakest topic */}
        {weakestTopicName && (
          <button
            type="button"
            className="ob2-hero-cta ob-result-fadein"
            onClick={() => onContinue()}
          >
            <span className="ob2-hero-cta-main">
              Latih topik paling lemah sekarang →
            </span>
            <span className="ob2-hero-cta-sub">
              5 soalan {weakestTopicName} · ~10 min · +10 XP
            </span>
          </button>
        )}
      </div>

      {/* ── BODY ── */}
      <div className="ob2-body">

        {/* Topic performance */}
        {result.by_topic.length > 0 && (
          <section className="ob2-section">
            <h3 className="ob2-section-title">
              <span className="ob2-section-dot" />
              Prestasi Topik
            </h3>
            <div className="ob2-topics-grid">
              {sortedTopics.map((t, i) => {
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
                    isWeakest={t.topic === weakestTopicName}
                    onPractice={() => onContinue()}
                  />
                );
              })}
            </div>
            <p className="ob2-learning-path-note">
              🌱 Kami telah tetapkan <strong>Fokus Hari Ini</strong> dan <strong>Laluan Pembelajaran</strong> berdasarkan keputusan ini.
              {" "}<button type="button" className="ob2-learning-path-link" onClick={() => onContinue()}>Lihat pelan penuh →</button>
            </p>
          </section>
        )}

        {/* AI Diagnosis */}
        <section className="ob2-section ob-result-fadein">
          <h3 className="ob2-section-title">
            <span className="ob2-section-dot ob2-section-dot--brand" />
            AI Diagnosis
          </h3>
          <div className="ob2-ai-card">
            <span className="ob2-ai-sparkle">✦</span>
            <p className="ob2-ai-text">{result.recommendation}</p>
          </div>
        </section>

        {/* Strengths + Next Step side-by-side */}
        <div className="ob2-two-col">
          {result.strengths.length > 0 && (
            <div className="ob2-insight-card ob2-insight-card--green ob-result-fadein">
              <div className="ob2-insight-header">
                <span className="ob2-insight-icon">✅</span>
                <span className="ob2-insight-label">Kekuatan</span>
              </div>
              <ul className="ob2-insight-list">
                {result.strengths.map((s, i) => (
                  <li key={i} className="ob2-insight-item">
                    <span className="ob2-insight-bullet" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.next_step && (
            <div className="ob2-insight-card ob2-insight-card--brand ob-result-fadein">
              <div className="ob2-insight-header">
                <span className="ob2-insight-icon">🎯</span>
                <span className="ob2-insight-label">Langkah Seterusnya</span>
              </div>
              <p className="ob2-insight-next">{result.next_step}</p>
            </div>
          )}
        </div>

        {/* Secondary actions */}
        <div className="ob2-secondary-actions ob-result-fadein">
          <p className="ob2-secondary-label">Pilihan lain:</p>
          <button type="button" className="ob2-secondary-btn" onClick={onContinue}>
            Ikut pelan auto →
          </button>
          <button type="button" className="ob2-secondary-btn ob2-secondary-btn--ghost" onClick={() => window.location.reload()}>
            Ulang buat diagnostik nanti →
          </button>
        </div>
      </div>
    </div>
  );
}

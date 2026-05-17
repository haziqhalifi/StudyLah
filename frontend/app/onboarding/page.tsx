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

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Step = "welcome" | "profile" | "quiz" | "analyzing" | "result";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DIALOGUES: Record<string, string[]> = {
  welcome: [
    "Hai! Saya Skorrel 🐿️ Anggap saya sebagai pembimbing peribadi anda untuk menguasai Matematik SPM. Jom kita bina laluan pembelajaran anda",
  ],
  profile: [
    "Isi maklumat anda di bawah supaya saya boleh menetapkan laluan pembelajaran yang sesuai untuk anda. Mari kita dapatkan A's!",
  ],
  analyzing: [
    "Biar Skorrel semak jawapan anda dulu...🔍",
    "Hmm, keputusan yang menarik! 🤔",
    "Sedang dianalisis dengan Google AI! 🧮",
    "Hampir siap, Skorrel sedang bina laluan pembelajaran anda...📚",
    "Nampak macam ada perkembangan yang baik! 🌟",
  ],
  result: [
    "Laluan peribadi anda sudah sedia! 🚀",
    "Periksa diagnosis anda! 📊",
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

function WordTypewriterText({
  text,
  speed = 220,
  startDelay = 500,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
}) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (!words.length) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setVisibleCount((prev) => {
          if (prev >= words.length) {
            if (intervalId) clearInterval(intervalId);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, startDelay]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{words.slice(0, visibleCount).join(" ")}</>;
}

function topicHighlightByRank(
  index: number,
  total: number,
): { label: string; cls: "weak" | "medium" | "strong" } {
  if (index === 0) return { label: "FOKUS UTAMA KAMU", cls: "weak" };
  if (index === total - 1) return { label: "MANTAP", cls: "strong" };
  return { label: "LATIH LAGI", cls: "medium" };
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
    "Pelajaran"
  );
}

function localizeResultText(text: string): string {
  if (!text) return text;
  return text
    .replace(
      "You've got a baseline in Ubahan! Let's focus next on Matriks with short daily drills, then revise mistakes using worked examples.",
      "Anda sudah ada asas dalam Ubahan! Seterusnya, fokus pada Matriks dengan latihan ringkas harian, kemudian semak semula kesilapan menggunakan contoh penyelesaian.",
    )
    .replace(
      "Start your personalized lesson path on the weakest topic.",
      "Mulakan laluan pembelajaran peribadi anda pada topik paling lemah.",
    );
}

const ANALYZING_MESSAGES = [
  "Biar saya semak jawapan anda... 🔍",
  "Hmm, keputusan yang menarik! 🤔",
  "Sedang dianalisis dengan Google AI! 🧮",
  "Hampir siap, sedang bina laluan anda... 📚",
  "Nampak sangat memberangsangkan! 🌟",
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
          <span />
          <span />
          <span />
        </div>
      </div>
      <Image
        src="/assets/mascot.webp"
        alt="Skorrel sedang menganalisis"
        width={120}
        height={120}
        className="ob-analyzing-mascot ob-analyzing-mascot--talking"
      />
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Profile submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleStartQuiz() {
    if (!name.trim() || !school.trim()) {
      setError("Sila isi semua medan.");
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
        "Tidak dapat memulakan onboarding. Semak sambungan anda dan cuba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  // â”€â”€ Submit answer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Next question / finish â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Submit quiz â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      setError("Diagnostik AI gagal. Sila cuba semula.");
      setStep("quiz");
    }
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const currentQ = questions[qIndex];

  // â”€â”€ QUIZ step â€” identical UI to learn page quiz â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        title="Kuiz Diagnostik"
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

      {/* Back button â€” above mascot on profile step */}
      {step === "profile" && (
        <button
          type="button"
          className="ob-back-btn"
          onClick={() => {
            setStep("welcome");
            showDialogue("welcome");
          }}
          aria-label="Kembali"
        >
          ‹
        </button>
      )}

      {/* Mascot + dialogue â€” profile step only (side-by-side) */}
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

      {/* â”€â”€ WELCOME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              Jom Mula ! 🚀
            </button>
          </div>
        </>
      )}

      {/* â”€â”€ PROFILE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {step === "profile" && (
        <>
          <div className="ob-form">
            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-name">
                Nama Anda
              </label>
              <input
                id="ob-name"
                className="ob-input"
                type="text"
                placeholder="cth. Ahmad Haziq"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-school">
                Sekolah
              </label>
              <input
                id="ob-school"
                className="ob-input"
                type="text"
                placeholder="cth. SMK Taman Desa"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                autoComplete="organization"
              />
            </div>
            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-form">
                Tingkatan
              </label>
              <select
                id="ob-form"
                className="ob-input ob-select"
                value={form}
                onChange={(e) => setForm(e.target.value)}
              >
                {[1, 2, 3, 4, 5].map((f) => (
                  <option key={f} value={f}>
                    Tingkatan {f}
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
              {loading ? "Memuatkan soalan..." : "Mulakan Kuiz →"}
            </button>
          </div>
        </>
      )}

      {/* â”€â”€ ANALYZING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {step === "analyzing" && <AnalyzingScreen />}

      {/* â”€â”€ RESULT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {step === "result" && result && (
        <ResultScreen
          result={result}
          userName={name}
          onContinue={() => router.push(getPersonalizedRoute(result))}
          onDashboard={() => router.push("/dashboard")}
          weakestTopic={getWeakestTopicName(result)}
        />
      )}
    </div>
  );
}

// â”€â”€â”€ Progress fill driver (avoids inline style on the fill bar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProgressFillDriver({ pct }: { pct: number }) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".ob-progress-fill-dynamic");
    if (el) el.style.width = `${pct}%`;
  }, [pct]);
  return null;
}

// â”€â”€â”€ Result Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ TopicCard â€” compact read-only card with animated fill bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TopicCard({
  topic,
  highlight,
  index,
  isWeakest,
  onPractice,
}: {
  topic: string;
  highlight: { label: string; cls: "weak" | "medium" | "strong" };
  index: number;
  isWeakest: boolean;
  onPractice?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cta = isWeakest ? "Latih sekarang →" : "Ulang kaji →";

  useEffect(() => {
    if (cardRef.current)
      cardRef.current.style.animationDelay = `${0.4 + index * 0.15}s`;
  }, [index]);

  return (
    <div
      ref={cardRef}
      className={`ob2-topic-card ob-result-fadein ob2-topic-card--${highlight.cls}${isWeakest ? " ob2-topic-card--featured" : ""}`}
    >
      <div className="ob2-topic-header">
        <span className="ob2-topic-emoji">{topicEmoji(topic)}</span>
        <div className="ob2-topic-info">
          <div className="ob2-topic-name-row">
            <span className="ob2-topic-name">{topic}</span>
            <span
              className={`ob2-recommended-badge ob2-recommended-badge--${highlight.cls}`}
            >
              {highlight.label}
            </span>
          </div>
        </div>
      </div>
      <div className="ob2-topic-footer">
        <button
          type="button"
          className="ob2-topic-cta-btn"
          onClick={onPractice}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResultScreen({
  result,
  userName,
  weakestTopic: _weakestTopic,
  onContinue,
  onDashboard,
}: {
  result: OnboardingDiagnosticResponse;
  userName: string;
  weakestTopic: string;
  onContinue: () => void;
  onDashboard: () => void;
}) {
  const pct = Math.round((result.score / result.total) * 100);

  const grade =
    pct >= 70
      ? { label: "Cemerlang", emoji: "🏆", mod: "high" }
      : pct >= 45
        ? { label: "Usaha yang baik", emoji: "💪", mod: "mid" }
        : { label: "Permulaan yang baik", emoji: "🌱", mod: "low" };

  const sortedTopics = [...result.by_topic].sort(
    (a, b) => a.accuracy - b.accuracy,
  );
  const visibleTopics = sortedTopics;
  const weakestTopic = sortedTopics[0];
  const weakestTopicName = weakestTopic?.topic ?? "";

  function getRouteForTopic(topicName: string): string {
    const t = topicName.toLowerCase();
    if (t.includes("ubahan")) return "/learning";
    if (t.includes("matriks")) return "/learning";
    if (t.includes("insurans")) return "/learning";
    return "/learning";
  }

  // suppress unused-variable warning â€” kept to satisfy call-site signature
  void getRouteForTopic;

  return (
    <div className="ob2-result-page">
      {/* â”€â”€ HERO â”€â”€ */}
      <div className={`ob2-hero ob2-hero--${grade.mod}`}>
        <div className="ob2-hero-noise" aria-hidden="true" />

        <div className="ob2-mascot-cloud ob-result-fadein">
          <WordTypewriterText text={`${grade.label}, ${userName || "pelajar"}!`} />
        </div>

        <div className="ob2-result-mascot ob-result-fadein" aria-hidden="true">
          <Image
            src="/assets/mascot.webp"
            alt=""
            width={108}
            height={108}
            className="ob2-result-mascot-img"
            priority
          />
        </div>

        <p className="ob2-hero-sub ob-result-fadein">
          Ini diagnosis awal tahap SPM kamu.
        </p>

      </div>

      {/* â”€â”€ BODY â”€â”€ */}
      <div className="ob2-body">
        {/* Topic perTingkatanance */}
        {visibleTopics.length > 0 && (
          <section className="ob2-section">
            <h3 className="ob2-section-title">
              <span className="ob2-section-dot" />
              Prestasi Topik
            </h3>
            <div className="ob2-topics-grid">
              {visibleTopics.map((t, i) => {
                const highlight = topicHighlightByRank(i, visibleTopics.length);
                return (
                  <TopicCard
                    key={t.topic}
                    topic={t.topic}
                    highlight={highlight}
                    index={i}
                    isWeakest={t.topic === weakestTopicName}
                    onPractice={onContinue}
                  />
                );
              })}
            </div>
          </section>
        )}

      </div>

      <button
        type="button"
        className="ob2-secondary-btn ob2-floating-plan-btn"
        onClick={onContinue}
      >
        <span className="ob2-hero-cta-main">Belajar {weakestTopicName} sekarang</span>
      </button>
    </div>
  );
}

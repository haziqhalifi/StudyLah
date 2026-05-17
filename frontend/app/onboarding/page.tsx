"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createUser,
  startOnboarding,
  submitOnboarding,
  submitAnswer as apiSubmitAnswer,
  createPersonalizedQuiz,
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

// â"€â"€â"€ Types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

type Step = "welcome" | "profile" | "quiz" | "analyzing" | "result";

// â"€â"€â"€ Constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// ─── Tier helpers (result screen) ─────────────────────────────────────────

type Tier = "needs-work" | "improving" | "good" | "strong";

function getTier(accuracy: number): Tier {
  if (accuracy <= 0.3) return "needs-work";
  if (accuracy <= 0.6) return "improving";
  if (accuracy <= 0.85) return "good";
  return "strong";
}

const TIER_LABEL: Record<Tier, { emoji: string; label: string }> = {
  "needs-work": { emoji: "🔴", label: "PERLU KERJA" },
  improving:    { emoji: "🟡", label: "MENINGKAT"  },
  good:         { emoji: "🟢", label: "BAIK"       },
  strong:       { emoji: "⭐", label: "KUKUH"      },
};

function scoreGrade(pct: number): { emoji: string; label: string } {
  if (pct >= 85) return { emoji: "🏆", label: "Cemerlang!" };
  if (pct >= 65) return { emoji: "⭐", label: "Bagus!" };
  if (pct >= 40) return { emoji: "💪", label: "Boleh Improve!" };
  return { emoji: "🌱", label: "Permulaan Yang Baik!" };
}

function scoreContextLine(pct: number): string {
  if (pct <= 15) return "Kebanyakan pelajar skor 10–20% pada percubaan pertama — kamu tepat di mana semua orang bermula.";
  if (pct <= 30) return "Kebanyakan pelajar skor 15–25% pada percubaan pertama — kamu berada di landasan yang betul!";
  if (pct <= 50) return "Kamu melebihi purata untuk percubaan pertama. Asas yang baik!";
  if (pct <= 70) return "Percubaan pertama yang mantap! Kamu sudah tahu lebih banyak daripada kebanyakan pelajar baharu.";
  return "Permulaan yang mengagumkan! Kamu jauh ke hadapan.";
}

function focusHint(tier: Tier): string {
  if (tier === "needs-work") return "Mulakan dengan 5 soalan asas untuk bina keyakinan";
  if (tier === "improving")  return "Cuba 8 soalan latihan untuk tingkatkan kefahaman";
  if (tier === "good")       return "Latih 5 soalan sederhana untuk kekalkan momentum";
  return "Teruskan dengan soalan SPM sebenar untuk kekal tajam";
}

function topicNameToId(name: string): "ubahan" | "matriks" | "insurans" {
  const n = name.toLowerCase();
  if (n.includes("ubahan")) return "ubahan";
  if (n.includes("matriks")) return "matriks";
  return "insurans";
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

// â"€â"€â"€ Main Page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

  // â"€â"€ Helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

  // â"€â"€ Profile submit â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

  // â"€â"€ Submit answer â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

  // â"€â"€ Next question / finish â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

  // â"€â"€ Submit quiz â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

  // â"€â"€ Render â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const currentQ = questions[qIndex];

  // â"€â"€ QUIZ step â€" identical UI to learn page quiz â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

  // Render result outside ob-page to avoid double padding with dr2-page
  if (step === "result" && result) {
    return (
      <>
        <div className="ob-progress-track">
          <div className="ob-progress-fill ob-progress-fill-dynamic" data-pct={progress} />
        </div>
        <ProgressFillDriver pct={progress} />
        <ResultScreen
          result={result}
          userName={name}
          userId={userId ?? ""}
          onDashboard={() => router.push("/dashboard")}
        />
      </>
    );
  }

  return (
    <div className="ob-page">
      {/* Fixed progress bar */}
      <div className="ob-progress-track">
        <div
          className="ob-progress-fill ob-progress-fill-dynamic"
          data-pct={progress}
        />
      </div>
      <ProgressFillDriver pct={progress} />

      {/* Back button â€" above mascot on profile step */}
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

      {/* Mascot + dialogue â€" profile step only (side-by-side) */}
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

      {/* â"€â"€ WELCOME â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
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

      {/* â"€â"€ PROFILE â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
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

      {/* ── ANALYZING ────────────────────────────────────────────────────────── */}
      {step === "analyzing" && <AnalyzingScreen />}
    </div>
  );
}

// â"€â"€â"€ Progress fill driver (avoids inline style on the fill bar) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function ProgressFillDriver({ pct }: { pct: number }) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".ob-progress-fill-dynamic");
    if (el) el.style.width = `${pct}%`;
  }, [pct]);
  return null;
}

// ─── Result Screen (mirrors diagnostic/result UI) ─────────────────────────

function ResultScreen({
  result,
  userName,
  userId,
  onDashboard,
}: {
  result: OnboardingDiagnosticResponse;
  userName: string;
  userId: string;
  onDashboard: () => void;
}) {
  const router = useRouter();
  const [startingTopicId, setStartingTopicId] = useState<string | null>(null);
  const [quizError, setQuizError] = useState("");

  const pct             = Math.round((result.score / result.total) * 100);
  const sortedByWeakest  = [...result.by_topic].sort((a, b) => a.accuracy - b.accuracy);
  const sortedByStrongest = [...result.by_topic].sort((a, b) => b.accuracy - a.accuracy);
  const weakestTopic   = sortedByWeakest[0];
  const strongestTopic = sortedByStrongest[0];
  const bestTopicName  = sortedByStrongest[0]?.topic;
  const { emoji, label } = scoreGrade(pct);

  const ringR    = 38;
  const ringCirc = 2 * Math.PI * ringR;
  const ringFill = (pct / 100) * ringCirc;

  async function handleStartQuiz(topicName: string) {
    if (!userId) return;
    const topicId = topicNameToId(topicName);
    setStartingTopicId(topicName);
    setQuizError("");
    try {
      const quiz = await createPersonalizedQuiz(userId, topicId, 5);
      router.push(`/quiz/${quiz.quizId}`);
    } catch {
      setStartingTopicId(null);
      setQuizError("Gagal buat kuiz. Sila cuba lagi.");
    }
  }

  return (
    <div className="dr2-page page-enter">

      {/* 1 · Hero */}
      <div className="dr2-hero">
        <span className="dr2-xp-pill">+50 XP ✨</span>

        <div className="dr2-hero-row">
          <div className="dr2-ring-wrap">
            <svg width="90" height="90" viewBox="0 0 90 90" className="dr2-ring-svg">
              <circle cx="45" cy="45" r={ringR} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="45" cy="45" r={ringR}
                fill="none" stroke="#fff" strokeWidth="8"
                strokeDasharray={`${ringFill} ${ringCirc}`}
                strokeLinecap="round"
                className="dr2-ring-arc"
              />
            </svg>
            <div className="dr2-ring-inner">
              <span className="dr2-ring-pct">{pct}%</span>
              <span className="dr2-ring-frac">{result.score}/{result.total}</span>
            </div>
          </div>

          <div className="dr2-hero-copy">
            <p className="dr2-hero-grade">{emoji} {label}</p>
            <h1 className="dr2-hero-name">
              {userName ? `Tahniah, ${userName}!` : "Tahniah!"}
            </h1>
            <p className="dr2-hero-sub">Diagnosis peribadi kamu sudah siap.</p>
          </div>
        </div>

        <p className="dr2-context-chip">{scoreContextLine(pct)}</p>

        {pct < 30 && (
          <div className="dr2-encouragement">
            <span>💪</span>
            <span>Jangan risau — ini hanya titik permulaan. Laluan kamu kini telah diperibadikan.</span>
          </div>
        )}
      </div>

      {/* 2 · Insight strip */}
      {strongestTopic && weakestTopic && strongestTopic.topic !== weakestTopic.topic && (
        <div className="dr2-insight-row">
          <div className="dr2-insight-card dr2-insight-strength">
            <span className="dr2-insight-icon">💡</span>
            <div>
              <p className="dr2-insight-label">Kekuatan</p>
              <p className="dr2-insight-val">{strongestTopic.topic}</p>
            </div>
          </div>
          <div className="dr2-insight-card dr2-insight-next">
            <span className="dr2-insight-icon">🎯</span>
            <div>
              <p className="dr2-insight-label">Fokus Seterusnya</p>
              <p className="dr2-insight-val">{weakestTopic.topic}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3 · AI Diagnosis */}
      <div className="dr2-ai-card">
        <div className="dr2-ai-header">
          <span className="dr2-ai-icon-box">🤖</span>
          <div>
            <p className="dr2-ai-label">AI Diagnosis</p>
            <p className="dr2-ai-sublabel">dikuasakan oleh Skorrel</p>
          </div>
        </div>
        <p className="dr2-ai-copy">{result.recommendation}</p>
      </div>

      {/* 4 · Personalized focus path */}
      <section className="dr2-section">
        <div className="dr2-section-head">
          <h2 className="dr2-section-title">Laluan Fokus Kamu</h2>
          <p className="dr2-section-sub">Disusun mengikut keperluan — mulakan dari atas</p>
        </div>
        {sortedByWeakest.map((t, rank) => {
          const tier       = getTier(t.accuracy);
          const tpct       = Math.round(t.accuracy * 100);
          const isPrimary  = rank === 0;
          const isStarting = startingTopicId === t.topic;

          const priorityLabel =
            isPrimary && tier === "needs-work" ? "🎯 Utama — Mula di sini"
            : isPrimary                        ? "🎯 Fokus utama"
            : tier === "needs-work"            ? "⚡ Penting"
            : tier === "improving"             ? "📈 Tingkatkan"
            :                                    "✅ Maintain";

          return (
            <div key={t.topic} className={`dr2-focus-card${isPrimary ? " dr2-focus-card--primary" : ""}`}>
              <div className="dr2-focus-top">
                <span className={`dr2-focus-priority dr2-focus-priority--${tier}${isPrimary ? "-primary" : ""}`}>
                  {priorityLabel}
                </span>
                <span className="dr2-focus-rank">#{rank + 1}</span>
              </div>
              <div className="dr2-focus-body">
                <div className="dr2-focus-info">
                  <p className="dr2-focus-name">{t.topic}</p>
                  <p className="dr2-focus-meta">
                    <span className={`dr2-focus-pct dr2-focus-pct--${t.accuracy === 0 ? "zero" : tier}`}>
                      {tpct}%
                    </span>
                    {" "}ketepatan · {t.total} soalan dijawab
                  </p>
                  <p className="dr2-focus-hint">{focusHint(tier)}</p>
                </div>
                {isPrimary ? (
                  <button type="button" className="dr2-focus-btn" disabled={!!startingTopicId} onClick={() => handleStartQuiz(t.topic)}>
                    {isStarting ? "Sebentar…" : "Mula →"}
                  </button>
                ) : (
                  <button type="button" className="dr2-focus-btn-ghost" disabled={!!startingTopicId} onClick={() => handleStartQuiz(t.topic)}>
                    {isStarting ? "…" : "Cuba →"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* 5 · Topic breakdown */}
      <section className="dr2-section">
        <div className="dr2-section-head">
          <h2 className="dr2-section-title">Pecahan Topik</h2>
        </div>
        <div className="dr2-topic-list">
          {result.by_topic.map((t) => {
            const tier   = getTier(t.accuracy);
            const tpct   = Math.round(t.accuracy * 100);
            const isBest = t.topic === bestTopicName;
            const isZero = t.accuracy === 0;
            const mr     = 22;
            const mcirc  = 2 * Math.PI * mr;
            const arc    = (tpct / 100) * mcirc;
            const { emoji: tEmoji, label: tLabel } = TIER_LABEL[tier];

            return (
              <div key={t.topic} className={`dr2-topic-card${isBest ? " dr2-topic-card--best" : ""}`}>
                {isBest && <span className="dr2-best-tag">⭐ Terbaik setakat ini</span>}
                <div className="dr2-topic-inner">
                  <div className="dr2-mini-ring-wrap" data-tier={isZero ? "zero" : tier}>
                    <svg width="56" height="56" viewBox="0 0 56 56" className="dr2-mini-svg">
                      <circle cx="28" cy="28" r={mr} fill="none" stroke="#e5e7eb" strokeWidth="5" />
                      <circle
                        cx="28" cy="28" r={mr}
                        fill="none" strokeWidth="5"
                        strokeDasharray={`${arc} ${mcirc}`}
                        strokeLinecap="round"
                        transform="rotate(-90 28 28)"
                        className="dr2-mini-arc"
                      />
                    </svg>
                    <span className="dr2-mini-pct">{tpct}%</span>
                  </div>
                  <div className="dr2-topic-info">
                    <div className="dr2-topic-name-row">
                      <span className="dr2-topic-name">{t.topic}</span>
                      <span className={`dr2-tier-badge dr2-tier-badge--${tier}`}>
                        {tEmoji} {tLabel}
                      </span>
                    </div>
                    <p className="dr2-topic-meta">
                      {isZero ? "Tiada jawapan lagi" : `${tpct}% betul`} · {t.total} soalan
                    </p>
                    <div className="dr2-bar-track">
                      <div
                        className={`dr2-bar-fill dr2-bar-fill--${isZero ? "zero" : tier}`}
                        style={{ width: isZero ? "4%" : `${tpct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6 · Actions */}
      <div className="dr2-bottom-actions">
        <button type="button" className="btn-ghost dr2-dashboard-btn" onClick={onDashboard}>
          Pergi ke Papan Pemuka
        </button>
      </div>

      {quizError && <p className="dr2-error">{quizError}</p>}
    </div>
  );
}

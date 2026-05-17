"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, startOnboarding, submitOnboarding } from "@/lib/api";
import type {
  OnboardingDiagnosticResponse,
  OnboardingQuestion,
} from "@/lib/api";

type Step = "welcome" | "profile" | "quiz" | "loading" | "result";

function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SparkleIcon() {
  return (
    <IconBase>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </IconBase>
  );
}

function UserIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </IconBase>
  );
}

function CheckIcon() {
  return (
    <IconBase>
      <path d="M20 6L9 17l-5-5" />
    </IconBase>
  );
}

function BrainIcon() {
  return (
    <IconBase>
      <path d="M9.5 2a2.5 2.5 0 0 1 5 0M12 2v2M9 6.5a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3" />
      <path d="M6 9.5H4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h2M18 9.5h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2" />
      <path d="M9 13.5v4a1.5 1.5 0 0 0 3 0v-4M15 13.5v4a1.5 1.5 0 0 0-3 0" />
    </IconBase>
  );
}

function TrophyIcon() {
  return (
    <IconBase>
      <path d="M8 5h8v4.5a4 4 0 0 1-8 0V5Z" />
      <path d="M8 7H5.5A1.5 1.5 0 0 0 4 8.5C4 10.4 5.6 12 8 12M16 7h2.5A1.5 1.5 0 0 1 20 8.5c0 1.9-1.6 3.5-4 3.5M12 13.5V17M9 20h6M10 17h4" />
    </IconBase>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [form, setForm] = useState("5");

  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<OnboardingDiagnosticResponse | null>(null);
  const [error, setError] = useState("");

  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  function getPersonalizedRoute(diag: OnboardingDiagnosticResponse): string {
    const weakestTopic = [...diag.by_topic].sort((a, b) => a.accuracy - b.accuracy)[0]?.topic?.toLowerCase() ?? "";
    if (weakestTopic.includes("ubahan")) return "/materials/ubahan/subtopics";
    if (weakestTopic.includes("matriks")) return "/materials/matriks/subtopics";
    if (weakestTopic.includes("insurans")) return "/materials/insurans/subtopics";
    return "/materials";
  }

  function getPersonalizedBabName(diag: OnboardingDiagnosticResponse): string {
    const weakestTopic = [...diag.by_topic].sort((a, b) => a.accuracy - b.accuracy)[0]?.topic ?? "";
    if (!weakestTopic) return "Pelajaran";
    return weakestTopic;
  }

  const current = questions[index];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const canSubmitProfile = name.trim() && school.trim();

  async function beginQuiz(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmitProfile) return;

    setError("");
    try {
      const userId =
        (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
        `user-${Date.now()}`;
      sessionStorage.setItem("userId", userId);
      await createUser(userId, name.trim());

      const res = await startOnboarding(name.trim(), school.trim(), Number(form));
      setSessionId(res.session_id);
      setQuestions(res.questions);
      setIndex(0);
      setAnswers({});
      setStep("quiz");
    } catch {
      setError("Tidak dapat memulakan onboarding. Sila cuba lagi.");
    }
  }

  function handlePick(optionIndex: number) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }));

    const isCorrect = optionIndex === current.correct_index;
    setFeedback(isCorrect ? "correct" : "wrong");

    window.setTimeout(() => {
      setFeedback(null);
      if (index < questions.length - 1) {
        setIndex((v) => v + 1);
      }
    }, 520);
  }

  async function finishQuiz() {
    setStep("loading");
    setError("");
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        selected_option_index: answers[q.id] ?? -1,
      }));
      const res = await submitOnboarding(sessionId, payload);
      setResult(res);
      localStorage.setItem("onboardingDiagnosticShown", "1");
      setStep("result");
    } catch {
      setError("Gagal menjana diagnostik AI. Sila cuba lagi.");
      setStep("quiz");
    }
  }

  const stepNode = useMemo(() => {
    if (step === "welcome") {
      return (
        <div className="ob-card page-enter">
          {/* gradient hero banner */}
          <div className="ob-hero">
            <div className="ob-hero-icon" aria-hidden="true">
              <SparkleIcon />
            </div>
            <div className="ob-hero-glow" aria-hidden="true" />
          </div>

          <div className="ob-body">
            <p className="ob-eyebrow">StudyLah AI</p>
            <h1 className="ob-title">Mari ketahui tahap pengetahuan anda!</h1>
            <p className="ob-sub">
              Jawab beberapa soalan ringkas supaya kami boleh peribadikan perjalanan pembelajaran SPM anda.
            </p>

            <div className="ob-features-row">
              <div className="ob-feature-pill">
                <span className="ob-feature-dot ob-feature-dot--brand" />
                Dikuasai AI
              </div>
              <div className="ob-feature-pill">
                <span className="ob-feature-dot ob-feature-dot--green" />
                Kuiz 5 min
              </div>
              <div className="ob-feature-pill">
                <span className="ob-feature-dot ob-feature-dot--pink" />
                Diperibadikan
              </div>
            </div>

            <button className="btn-primary ob-cta" type="button" onClick={() => setStep("profile")}>
              Jom Mula
            </button>
          </div>
        </div>
      );
    }

    if (step === "profile") {
      return (
        <form className="ob-card page-enter" onSubmit={beginQuiz}>
          <div className="ob-card-header">
            <div className="ob-icon-badge ob-icon-badge--purple" aria-hidden="true">
              <UserIcon />
            </div>
            <div>
              <p className="ob-eyebrow">Langkah 1 daripada 2</p>
              <h2 className="ob-title-sm">Ceritakan tentang diri anda</h2>
            </div>
          </div>

          <div className="ob-fields">
            <label className="ob-field">
              <span className="ob-field-label">Nama Penuh</span>
              <input
                className="ob-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth. Ahmad Haziq"
                required
              />
            </label>

            <label className="ob-field">
              <span className="ob-field-label">Sekolah</span>
              <input
                className="ob-input"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="cth. SMK Taman Muda"
                required
              />
            </label>

            <label className="ob-field">
              <span className="ob-field-label">Tingkatan</span>
              <select className="ob-input ob-select" value={form} onChange={(e) => setForm(e.target.value)}>
                {[1, 2, 3, 4, 5].map((f) => (
                  <option key={f} value={f}>{`Tingkatan ${f}`}</option>
                ))}
              </select>
            </label>
          </div>

          <button className="btn-primary ob-cta" type="submit" disabled={!canSubmitProfile}>
            Mula Kuiz
          </button>
        </form>
      );
    }

    if (step === "loading") {
      return (
        <div className="ob-card ob-card--center page-enter">
          <div className="ob-loading-ring" aria-hidden="true">
            <div className="ob-loading-inner">
              <BrainIcon />
            </div>
          </div>
          <h2 className="ob-title-sm">Menganalisis jawapan anda&hellip;</h2>
          <p className="ob-sub">AI sedang menyediakan kekuatan, kelemahan, dan laluan pelajaran seterusnya anda.</p>
          <div className="ob-dots" aria-hidden="true">
            <span className="ob-dot ob-dot--1" />
            <span className="ob-dot ob-dot--2" />
            <span className="ob-dot ob-dot--3" />
          </div>
        </div>
      );
    }

    if (step === "result" && result) {
      const personalizedRoute = getPersonalizedRoute(result);
      const personalizedBabName = getPersonalizedBabName(result);
      const scorePct = Math.round((result.score / result.total) * 100);
      const scoreColor = scorePct >= 70 ? "ob-score--green" : scorePct >= 40 ? "ob-score--brand" : "ob-score--warn";

      return (
        <div className="ob-card page-enter">
          {/* score hero */}
          <div className="ob-result-hero">
            <div className="ob-trophy-badge" aria-hidden="true">
              <TrophyIcon />
            </div>
            <div>
              <p className="ob-eyebrow">Diagnostik AI Anda</p>
              <p className={`ob-score ${scoreColor}`}>{result.score}<span className="ob-score-total">/{result.total}</span></p>
            </div>
            <div className="ob-result-hero-glow" aria-hidden="true" />
          </div>

          {/* score bar */}
          <div className="ob-score-bar-wrap">
            <div className="ob-score-bar">
              <div className="ob-score-bar-fill" style={{ "--fill": `${scorePct}%` } as React.CSSProperties} />
            </div>
            <span className="ob-score-bar-label">{scorePct}%</span>
          </div>

          <div className="ob-result-grid">
            <div className="ob-result-section ob-result-section--green">
              <p className="ob-result-label">
                <span className="ob-result-dot ob-result-dot--green" />
                Kekuatan
              </p>
              <ul className="ob-result-list">
                {result.strengths.length
                  ? result.strengths.map((s) => <li key={s}><CheckIcon />{s}</li>)
                  : <li>Teruskan berlatih untuk temui kekuatan anda!</li>}
              </ul>
            </div>
            <div className="ob-result-section ob-result-section--warn">
              <p className="ob-result-label">
                <span className="ob-result-dot ob-result-dot--warn" />
                Kawasan Tumpuan
              </p>
              <ul className="ob-result-list">
                {result.weaknesses.length
                  ? result.weaknesses.map((w) => <li key={w}><span className="ob-list-dash">—</span>{w}</li>)
                  : <li>Hebat — tiada subtopik lemah dikesan!</li>}
              </ul>
            </div>
          </div>

          <div className="ob-reco-card">
            <p className="ob-reco-label">Cadangan AI</p>
            <p className="ob-reco-text">{result.recommendation}</p>
            <p className="ob-next-text">{result.next_step}</p>
          </div>

          <button className="btn-primary ob-cta" type="button" onClick={() => router.push(personalizedRoute)}>
            Teruskan ke {personalizedBabName}
          </button>
        </div>
      );
    }

    return null;
  }, [step, canSubmitProfile, name, school, form, result, router]);

  return (
    <section className="ob-shell" aria-label="Student onboarding">
      {step === "quiz" && current && (
        <div className="ob-quiz-wrap page-enter">
          {/* quiz header */}
          <div className="ob-quiz-header">
            <div className="ob-quiz-meta">
              <p className="ob-eyebrow">Soalan {index + 1} daripada {questions.length}</p>
              <p className="ob-quiz-topic-label">{current.topic}</p>
            </div>
            <div className="ob-quiz-counter">
              <span>{index + 1}</span>
              <span className="ob-quiz-counter-sep">/{questions.length}</span>
            </div>
          </div>

          <div className="ob-quiz-progress-track">
            <div className="ob-quiz-progress-fill" style={{ "--fill": `${progress}%` } as React.CSSProperties} />
          </div>

          <article key={current.id} className="ob-question-card onboard-slide-in">
            <h3 className="ob-question-text">{current.text}</h3>

            <div className="ob-options">
              {current.options.map((opt, i) => {
                const selected = answers[current.id] === i;
                const isCorrectPick = selected && i === current.correct_index;
                const isWrongPick = selected && i !== current.correct_index;
                return (
                  <button
                    key={`${current.id}-${i}`}
                    type="button"
                    className={`ob-option ${selected ? "ob-option--selected" : ""} ${isCorrectPick ? "ob-option--correct" : ""} ${isWrongPick ? "ob-option--wrong" : ""} ${feedback === "wrong" && isWrongPick ? "onboard-shake" : ""}`}
                    onClick={() => handlePick(i)}
                    disabled={feedback !== null}
                  >
                    <span className={`ob-option-letter ${isCorrectPick ? "ob-option-letter--correct" : ""} ${isWrongPick ? "ob-option-letter--wrong" : ""} ${selected && !isCorrectPick && !isWrongPick ? "ob-option-letter--selected" : ""}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="ob-option-text">{opt}</span>
                    {isCorrectPick && <span className="ob-option-check" aria-label="Betul"><CheckIcon /></span>}
                  </button>
                );
              })}
            </div>
          </article>

          {index === questions.length - 1 && answers[current.id] !== undefined && feedback === null && (
            <button className="btn-primary ob-cta" type="button" onClick={finishQuiz}>
              Hantar &amp; Dapatkan Diagnostik AI
            </button>
          )}
        </div>
      )}

      {step !== "quiz" && stepNode}
      {error && <p className="diag-error" role="alert">{error}</p>}
    </section>
  );
}

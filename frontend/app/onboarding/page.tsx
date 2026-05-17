"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, startOnboarding, submitOnboarding } from "@/lib/api";
import type {
  OnboardingDiagnosticResponse,
  OnboardingQuestion,
} from "@/lib/api";

type Step = "welcome" | "profile" | "quiz" | "loading" | "result";

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
    if (!weakestTopic) return "Lessons";
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
      setError("Unable to start onboarding. Please try again.");
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
      setError("Failed to generate AI diagnostic. Please retry.");
      setStep("quiz");
    }
  }

  const stepNode = useMemo(() => {
    if (step === "welcome") {
      return (
        <div className="onboard-card page-enter">
          <div className="onboard-mascot" aria-hidden="true">??</div>
          <h1 className="onboard-title">Let&apos;s find out what you know! ??</h1>
          <p className="onboard-sub">
            Answer a few quick questions so we can personalise your SPM learning journey.
          </p>
          <button className="btn-primary" type="button" onClick={() => setStep("profile")}>
            Let&apos;s Start
          </button>
        </div>
      );
    }

    if (step === "profile") {
      return (
        <form className="onboard-card page-enter" onSubmit={beginQuiz}>
          <div className="onboard-mascot" aria-hidden="true">??</div>
          <h2 className="onboard-title-sm">Tell us about you</h2>

          <label className="auth-field onboard-field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label className="auth-field onboard-field">
            <span>School</span>
            <input value={school} onChange={(e) => setSchool(e.target.value)} required />
          </label>

          <label className="auth-field onboard-field">
            <span>Form</span>
            <select value={form} onChange={(e) => setForm(e.target.value)}>
              {[1, 2, 3, 4, 5].map((f) => (
                <option key={f} value={f}>{`Form ${f}`}</option>
              ))}
            </select>
          </label>

          <button className="btn-primary" type="submit" disabled={!canSubmitProfile}>
            Start Quiz
          </button>
        </form>
      );
    }

    if (step === "loading") {
      return (
        <div className="onboard-card page-enter">
          <div className="onboard-mascot">??</div>
          <h2 className="onboard-title-sm">Analysing your answers...</h2>
          <p className="onboard-sub">Google AI is preparing your strengths, weaknesses, and next lesson path.</p>
          <div className="onboard-loader" aria-hidden="true" />
        </div>
      );
    }

    if (step === "result" && result) {
      const personalizedRoute = getPersonalizedRoute(result);
      const personalizedBabName = getPersonalizedBabName(result);
      return (
        <div className="onboard-card page-enter">
          <div className="onboard-mascot">??</div>
          <h2 className="onboard-title-sm">Your AI Diagnostic</h2>
          <p className="onboard-score">{result.score} / {result.total}</p>

          <div className="onboard-result-grid">
            <div>
              <p className="onboard-result-label">Strengths</p>
              <ul className="onboard-result-list">
                {result.strengths.length ? result.strengths.map((s) => <li key={s}>{s}</li>) : <li>No strong subtopic yet</li>}
              </ul>
            </div>
            <div>
              <p className="onboard-result-label">Weaker Areas</p>
              <ul className="onboard-result-list">
                {result.weaknesses.length ? result.weaknesses.map((w) => <li key={w}>{w}</li>) : <li>No weak subtopic detected</li>}
              </ul>
            </div>
          </div>

          <p className="onboard-reco">{result.recommendation}</p>
          <p className="onboard-next">Next: {result.next_step}</p>

          <button className="btn-primary" type="button" onClick={() => router.push(personalizedRoute)}>
            Continue To {personalizedBabName}
          </button>
        </div>
      );
    }

    return null;
  }, [step, canSubmitProfile, name, school, form, result, router]);

  return (
    <section className="onboard-shell" aria-label="Student onboarding">
      {step === "quiz" && current && (
        <div className="onboard-quiz-wrap page-enter">
          <div className="onboard-top-row">
            <div className="onboard-mascot-small">??</div>
            <span className="onboard-progress-copy">Question {index + 1} of {questions.length}</span>
          </div>

          <div className="progress-track onboard-progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <article key={current.id} className="onboard-question-card onboard-slide-in">
            <p className="onboard-topic-chip">{current.topic}</p>
            <h3 className="onboard-question-title">{current.text}</h3>

            <div className="onboard-options">
              {current.options.map((opt, i) => {
                const selected = answers[current.id] === i;
                const isCorrectPick = selected && i === current.correct_index;
                const isWrongPick = selected && i !== current.correct_index;
                return (
                  <button
                    key={`${current.id}-${i}`}
                    type="button"
                    className={`option-card ${selected ? "selected" : ""} ${isCorrectPick ? "correct" : ""} ${isWrongPick ? "wrong" : ""} ${feedback === "wrong" ? "onboard-shake" : ""}`}
                    onClick={() => handlePick(i)}
                    disabled={feedback !== null}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                    <span className="option-text">{opt}</span>
                  </button>
                );
              })}
            </div>
          </article>

          {index === questions.length - 1 && answers[current.id] !== undefined && feedback === null && (
            <button className="btn-primary" type="button" onClick={finishQuiz}>
              Submit & Get AI Diagnostic
            </button>
          )}
        </div>
      )}

      {step !== "quiz" && stepNode}
      {error && <p className="diag-error">{error}</p>}
    </section>
  );
}

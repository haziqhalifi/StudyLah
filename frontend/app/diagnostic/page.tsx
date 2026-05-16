"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startDiagnostic, submitDiagnostic, Question, DiagnosticAnswer } from "@/lib/api";
import QuestionCard from "@/components/QuestionCard";

export default function DiagnosticPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    if (!userId) { router.push("/"); return; }

    startDiagnostic(userId, "quadratic_equations")
      .then((res) => setQuestions(res.questions))
      .catch(() => setError("Failed to load diagnostic questions."))
      .finally(() => setLoading(false));
  }, [router]);

  function selectOption(questionId: string, index: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }

  async function handleSubmit() {
    const userId = sessionStorage.getItem("userId");
    if (!userId) return;

    const answeredAll = questions.every((q) => answers[q.id] !== undefined);
    if (!answeredAll) {
      setError("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload: DiagnosticAnswer[] = questions.map((q) => ({
        question_id: q.id,
        selected_option_index: answers[q.id],
      }));

      const result = await submitDiagnostic(userId, payload);
      // Pass first question to learn page via sessionStorage
      sessionStorage.setItem("currentQuestion", JSON.stringify(result.next_question));
      sessionStorage.setItem("skillProfile", JSON.stringify(result.skill_profile));
      router.push("/learn");
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageShell><p style={{ color: "#888" }}>Loading diagnostic…</p></PageShell>;

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <PageShell>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Diagnostic Assessment</h1>
        <p style={{ color: "#666", marginTop: "0.4rem" }}>
          Answer these questions so we can personalise your learning path. No pressure — just do your best!
        </p>
        <div style={{ marginTop: "1rem", background: "#e5e5e5", borderRadius: 99, height: 8 }}>
          <div
            style={{
              width: `${progress}%`,
              background: "#6c47ff",
              height: "100%",
              borderRadius: 99,
              transition: "width 0.3s",
            }}
          />
        </div>
        <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.4rem" }}>
          {answeredCount} / {questions.length} answered
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            questionNumber={i + 1}
            selectedOptionIndex={answers[q.id] ?? null}
            onSelectOption={(idx) => selectOption(q.id, idx)}
          />
        ))}
      </div>

      {error && (
        <p style={{ color: "#dc2626", marginTop: "1rem", fontWeight: 600 }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || answeredCount < questions.length}
        style={{
          marginTop: "2rem",
          width: "100%",
          background: submitting || answeredCount < questions.length ? "#c4b5fd" : "#6c47ff",
          color: "white",
          border: "none",
          borderRadius: 12,
          padding: "1rem",
          fontSize: "1rem",
          fontWeight: 700,
          cursor: submitting || answeredCount < questions.length ? "not-allowed" : "pointer",
        }}
      >
        {submitting ? "Analysing your answers…" : "Submit & Start Learning →"}
      </button>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

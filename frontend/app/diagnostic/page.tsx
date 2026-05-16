"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressIndicator, QuestionCard } from "@/components/MvpCards";
import { diagnosticQuestions } from "@/lib/mvpData";

export default function DiagnosticPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    const name = sessionStorage.getItem("userName");
    if (!name) {
      router.push("/");
      return;
    }
    setStudentName(name);
  }, [router]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  function selectOption(questionId: string, optionIndex: number) {
    setError("");
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  }

  function submitDiagnostic() {
    const answeredAll = diagnosticQuestions.every((question) => answers[question.id] !== undefined);
    if (!answeredAll) {
      setError("Answer all 5 questions before submitting your diagnostic.");
      return;
    }

    sessionStorage.setItem("diagnosticAnswers", JSON.stringify(answers));
    router.push("/analysis");
  }

  return (
    <div className="pageStack">
      <section className="pageHero compactHero">
        <span className="eyebrow">SPM Mathematics Diagnostic</span>
        <h1>{studentName ? `${studentName}, let's find your Maths profile` : "Diagnostic Questions"}</h1>
        <p>Five quick questions across Algebra, Quadratic Functions, Trigonometry, Probability, and Statistics.</p>
      </section>

      <ProgressIndicator current={answeredCount} total={diagnosticQuestions.length} />

      <div className="questionStack">
        {diagnosticQuestions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            questionNumber={index + 1}
            selectedOptionIndex={answers[question.id] ?? null}
            onSelectOption={(optionIndex) => selectOption(question.id, optionIndex)}
          />
        ))}
      </div>

      {error && <p className="formError">{error}</p>}

      <button
        className="primaryButton fullWidth"
        disabled={answeredCount < diagnosticQuestions.length}
        onClick={submitDiagnostic}
        type="button"
      >
        Submit Diagnostic
      </button>
    </div>
  );
}

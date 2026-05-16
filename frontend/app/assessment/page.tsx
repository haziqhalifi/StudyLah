"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AssessmentCard, QuestionCard } from "@/components/MvpCards";
import {
  assessmentQuestions,
  buildDiagnosticResult,
  getStoredAnswers,
  type DiagnosticResult,
} from "@/lib/mvpData";

export default function AssessmentPage() {
  const router = useRouter();
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("diagnosticResult");
    if (raw) {
      setResult(JSON.parse(raw) as DiagnosticResult);
      return;
    }

    const name = sessionStorage.getItem("userName");
    const diagnosticAnswers = getStoredAnswers();
    if (!name || Object.keys(diagnosticAnswers).length === 0) {
      router.push("/");
      return;
    }

    const builtResult = buildDiagnosticResult(name, diagnosticAnswers);
    sessionStorage.setItem("diagnosticResult", JSON.stringify(builtResult));
    setResult(builtResult);
  }, [router]);

  const score = assessmentQuestions.filter(
    (question) => answers[question.id] === question.correctOptionIndex
  ).length;

  function submitAssessment() {
    const answeredAll = assessmentQuestions.every((question) => answers[question.id] !== undefined);
    if (!answeredAll) {
      setError("Complete every assessment question before submitting.");
      return;
    }
    setSubmitted(true);
    setError("");
  }

  if (!result) return null;

  return (
    <div className="pageStack">
      <section className="pageHero compactHero">
        <span className="eyebrow">Assessment</span>
        <h1>Short mastery check</h1>
        <p>Use this quiz to check whether your revision and practice are turning into accuracy.</p>
      </section>

      {submitted && (
        <AssessmentCard
          score={score}
          total={assessmentQuestions.length}
          recommendedTopics={result.recommendedTopics}
        />
      )}

      <div className="questionStack">
        {assessmentQuestions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            questionNumber={index + 1}
            selectedOptionIndex={answers[question.id] ?? null}
            onSelectOption={(optionIndex) => {
              setAnswers((current) => ({ ...current, [question.id]: optionIndex }));
              setError("");
            }}
            showFeedback={submitted}
          />
        ))}
      </div>

      {error && <p className="formError">{error}</p>}

      {!submitted ? (
        <button className="primaryButton fullWidth" onClick={submitAssessment} type="button">
          Submit Assessment
        </button>
      ) : (
        <div className="buttonRow">
          <button className="secondaryButton" onClick={() => router.push("/practice")} type="button">
            More Practice
          </button>
          <button className="primaryButton" onClick={() => router.push("/journey")} type="button">
            Back to Journey
          </button>
        </div>
      )}
    </div>
  );
}

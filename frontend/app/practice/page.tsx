"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PracticeQuestionCard, getTopicIds } from "@/components/MvpCards";
import {
  buildDiagnosticResult,
  getPersonalizedPracticeQuestions,
  getStoredAnswers,
  type DiagnosticResult,
} from "@/lib/mvpData";

export default function PersonalizedPracticePage() {
  const router = useRouter();
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("diagnosticResult");
    if (raw) {
      setResult(JSON.parse(raw) as DiagnosticResult);
      return;
    }

    const name = sessionStorage.getItem("userName");
    const answers = getStoredAnswers();
    if (!name || Object.keys(answers).length === 0) {
      router.push("/");
      return;
    }

    const builtResult = buildDiagnosticResult(name, answers);
    sessionStorage.setItem("diagnosticResult", JSON.stringify(builtResult));
    setResult(builtResult);
  }, [router]);

  const questions = useMemo(() => {
    if (!result) return [];
    return getPersonalizedPracticeQuestions(
      getTopicIds(result.weakTopics),
      getTopicIds(result.strongTopics)
    );
  }, [result]);

  const currentQuestion = questions[currentIndex];
  const completed = currentIndex >= questions.length;
  const correctCount = Object.values(practiceAnswers).filter(Boolean).length;

  function checkAnswer() {
    if (!currentQuestion || selectedOptionIndex === null) {
      setError("Choose an answer before checking.");
      return;
    }

    const isCorrect = selectedOptionIndex === currentQuestion.correctOptionIndex;
    setPracticeAnswers((current) => ({ ...current, [currentQuestion.id]: isCorrect }));
    setShowFeedback(true);
    setError("");
  }

  function nextQuestion() {
    setCurrentIndex((index) => index + 1);
    setSelectedOptionIndex(null);
    setShowFeedback(false);
  }

  if (!result) return null;

  if (completed) {
    return (
      <div className="pageStack">
        <section className="pageHero compactHero">
          <span className="eyebrow">Practice Complete</span>
          <h1>{correctCount}/{questions.length} correct</h1>
          <p>Your weak topics were prioritized first, with a few stronger-topic questions added for reinforcement.</p>
        </section>
        <div className="buttonRow">
          <button className="secondaryButton" onClick={() => router.push("/journey")} type="button">
            Back to Journey
          </button>
          <button className="primaryButton" onClick={() => router.push("/assessment")} type="button">
            Take Assessment
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="pageStack">
      <section className="pageHero compactHero">
        <span className="eyebrow">Personalized Practice</span>
        <h1>Question {currentIndex + 1} of {questions.length}</h1>
        <p>Weak topics appear first, then stronger topics are mixed in to keep your skills fresh.</p>
      </section>

      <PracticeQuestionCard
        question={currentQuestion}
        selectedOptionIndex={selectedOptionIndex}
        showFeedback={showFeedback}
        onSelectOption={(index) => {
          setSelectedOptionIndex(index);
          setError("");
        }}
      />

      {error && <p className="formError">{error}</p>}

      {!showFeedback ? (
        <button className="primaryButton fullWidth" onClick={checkAnswer} type="button">
          Check Answer
        </button>
      ) : (
        <button className="primaryButton fullWidth" onClick={nextQuestion} type="button">
          {currentIndex + 1 === questions.length ? "Finish Practice" : "Next Question"}
        </button>
      )}
    </div>
  );
}

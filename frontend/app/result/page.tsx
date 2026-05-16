"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RecommendedTopicCard,
  ResultSummaryCard,
  TopicStrengthCard,
} from "@/components/MvpCards";
import type { DiagnosticResult } from "@/lib/mvpData";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("diagnosticResult");
    if (!raw) {
      router.push("/diagnostic");
      return;
    }
    setResult(JSON.parse(raw) as DiagnosticResult);
  }, [router]);

  if (!result) return null;

  return (
    <div className="pageStack">
      <section className="pageHero compactHero">
        <span className="eyebrow">Performance Result</span>
        <h1>{result.studentName}'s Maths diagnostic</h1>
        <p>{result.feedbackMessage}</p>
      </section>

      <ResultSummaryCard result={result} />

      <div className="twoColumn">
        <TopicStrengthCard title="Strong topics" topics={result.strongTopics} tone="strong" />
        <TopicStrengthCard title="Weak topics" topics={result.weakTopics} tone="weak" />
      </div>

      <section className="contentCard">
        <div className="cardHeader">
          <h2>Answer breakdown</h2>
          <span className="topicBadge">5 MCQ</span>
        </div>
        <div className="answerBreakdown">
          {result.correctAnswers.map((question) => (
            <span className="breakdownItem correct" key={question.id}>{question.topicLabel}: Correct</span>
          ))}
          {result.incorrectAnswers.map((question) => (
            <span className="breakdownItem wrong" key={question.id}>{question.topicLabel}: Incorrect</span>
          ))}
        </div>
      </section>

      <section className="pageSection">
        <div className="sectionHeader">
          <h2>Recommended topics to improve</h2>
          <p>Start here before moving into personalized practice.</p>
        </div>
        <div className="cardGrid">
          {result.recommendedTopics.map((topic) => (
            <RecommendedTopicCard href={`/learn/${topic.id}`} key={topic.id} topic={topic} />
          ))}
        </div>
      </section>

      <button className="primaryButton fullWidth" onClick={() => router.push("/journey")} type="button">
        Continue to Learning Journey
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LearningJourneyCard, RecommendedTopicCard } from "@/components/MvpCards";
import type { DiagnosticResult } from "@/lib/mvpData";

export default function LearningJourneyPage() {
  const router = useRouter();
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("diagnosticResult");
    if (!raw) {
      router.push("/result");
      return;
    }
    setResult(JSON.parse(raw) as DiagnosticResult);
  }, [router]);

  if (!result) return null;

  const firstTopic = result.recommendedTopics[0];

  return (
    <div className="pageStack">
      <section className="pageHero compactHero">
        <span className="eyebrow">Learning Journey</span>
        <h1>Your 3-stage SPM Maths path</h1>
        <p>Learn the key idea, practise with personalized MCQs, then complete a short mastery check.</p>
      </section>

      <div className="journeyGrid">
        <LearningJourneyCard
          stage="learning"
          title="Learning"
          description={`Begin with ${firstTopic.label} and review the concept, formula, and worked example.`}
          href={`/learn/${firstTopic.id}`}
        />
        <LearningJourneyCard
          stage="practice"
          title="Practice"
          description="Answer weak-topic questions first, followed by reinforcement from stronger areas."
          href="/practice"
        />
        <LearningJourneyCard
          stage="assessment"
          title="Assessment"
          description="Take a short quiz to check whether your topic mastery is improving."
          href="/assessment"
        />
      </div>

      <section className="pageSection">
        <div className="sectionHeader">
          <h2>Recommended learning order</h2>
          <p>Based on your diagnostic answers.</p>
        </div>
        <div className="cardGrid">
          {result.recommendedTopics.map((topic) => (
            <RecommendedTopicCard href={`/learn/${topic.id}`} key={topic.id} topic={topic} />
          ))}
        </div>
      </section>
    </div>
  );
}

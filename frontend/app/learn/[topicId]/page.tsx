"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTopic, practiceQuestions, type TopicId } from "@/lib/mvpData";

const topicIds = ["algebra", "quadratic_functions", "trigonometry", "probability", "statistics"];

export default function LearningTopicPage() {
  const params = useParams<{ topicId: string }>();
  const router = useRouter();
  const topicId = topicIds.includes(params.topicId) ? (params.topicId as TopicId) : "algebra";
  const topic = getTopic(topicId);
  const examplePractice = useMemo(
    () => practiceQuestions.find((question) => question.topicId === topic.id),
    [topic.id]
  );

  return (
    <div className="pageStack">
      <section className="pageHero compactHero">
        <span className="eyebrow">Learning Topic</span>
        <h1>{topic.label}</h1>
        <p>{topic.shortExplanation}</p>
      </section>

      <section className="contentCard">
        <div className="cardHeader">
          <h2>Key formula or concept</h2>
          <span className="topicBadge">Learn</span>
        </div>
        <p className="formulaBox">{topic.keyConcept}</p>
      </section>

      <section className="contentCard">
        <div className="cardHeader">
          <h2>Example question</h2>
          <span className="topicBadge">Worked example</span>
        </div>
        <p className="exampleQuestion">{topic.exampleQuestion}</p>
        <div className="feedbackBox good">
          <strong>Solution</strong>
          <p>{topic.exampleAnswer}</p>
        </div>
      </section>

      {examplePractice && (
        <section className="contentCard">
          <div className="cardHeader">
            <h2>Preview practice</h2>
            <span className="topicBadge">{examplePractice.topicLabel}</span>
          </div>
          <p className="exampleQuestion">{examplePractice.text}</p>
        </section>
      )}

      <div className="buttonRow">
        <button className="secondaryButton" onClick={() => router.push("/journey")} type="button">
          Back to Journey
        </button>
        <button className="primaryButton" onClick={() => router.push("/practice")} type="button">
          Start Practice
        </button>
      </div>
    </div>
  );
}

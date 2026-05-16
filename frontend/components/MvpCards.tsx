"use client";

import type { DiagnosticResult, MvpQuestion, StageId, TopicContent, TopicId } from "@/lib/mvpData";

const LETTERS = ["A", "B", "C", "D"];

export function ProgressIndicator({ current, total }: { current: number; total: number }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="progressBlock">
      <div className="progressLabel">
        <span>{current} of {total} answered</span>
        <strong>{percentage}%</strong>
      </div>
      <div className="progressTrack">
        <div className="progressFill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function OptionButton({
  label,
  letter,
  selected,
  correct,
  wrong,
  disabled,
  onClick,
}: {
  label: string;
  letter?: string;
  selected: boolean;
  correct?: boolean;
  wrong?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const className = [
    "optionButton",
    selected ? "optionSelected" : "",
    correct ? "optionCorrect" : "",
    wrong ? "optionWrong" : "",
  ].join(" ");

  return (
    <button className={className} disabled={disabled} onClick={onClick} type="button">
      {letter && <span className="answerLetter">{letter}</span>}
      <span>{label}</span>
    </button>
  );
}

export function QuestionCard({
  question,
  questionNumber,
  selectedOptionIndex,
  onSelectOption,
  showFeedback = false,
}: {
  question: MvpQuestion;
  questionNumber?: number;
  selectedOptionIndex: number | null;
  onSelectOption: (index: number) => void;
  showFeedback?: boolean;
}) {
  return (
    <article className="questionCard">
      <div className="cardHeader">
        <span className="eyebrow">{questionNumber ? `Question ${questionNumber}` : "Practice"}</span>
        <span className="topicBadge">{question.topicLabel}</span>
      </div>
      <h2 className="questionText">{question.text}</h2>
      <div className="optionList">
        {question.options.map((option, index) => {
          const selected = selectedOptionIndex === index;
          const isCorrect = showFeedback && question.correctOptionIndex === index;
          const isWrong = showFeedback && selected && question.correctOptionIndex !== index;

          return (
            <button
              className={[
                "answerOption",
                selected ? "answerSelected" : "",
                isCorrect ? "answerCorrect" : "",
                isWrong ? "answerWrong" : "",
              ].join(" ")}
              disabled={showFeedback}
              key={option}
              onClick={() => onSelectOption(index)}
              type="button"
            >
              <span className="answerLetter">{LETTERS[index]}</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {showFeedback && (
        <div className={selectedOptionIndex === question.correctOptionIndex ? "feedbackBox good" : "feedbackBox needsWork"}>
          <strong>{selectedOptionIndex === question.correctOptionIndex ? "Correct" : "Review this"}</strong>
          <p>{question.explanation}</p>
        </div>
      )}
    </article>
  );
}

export function AIAnalysisLoader() {
  return (
    <section className="loaderPanel" aria-live="polite">
      <div className="loaderPulse">AI</div>
      <h1>Analysing your diagnostic</h1>
      <p>Checking your answers, mapping topic strengths, and preparing your recommended SPM Maths path.</p>
      <div className="analysisSteps">
        <span>Score calculated</span>
        <span>Topics profiled</span>
        <span>Journey prepared</span>
      </div>
    </section>
  );
}

export function ResultSummaryCard({ result }: { result: DiagnosticResult }) {
  return (
    <section className="summaryGrid">
      <div className="metricCard primaryMetric">
        <span>Total score</span>
        <strong>{result.score}/{result.totalQuestions}</strong>
      </div>
      <div className="metricCard">
        <span>Correct</span>
        <strong>{result.correctAnswers.length}</strong>
      </div>
      <div className="metricCard">
        <span>Incorrect</span>
        <strong>{result.incorrectAnswers.length}</strong>
      </div>
    </section>
  );
}

export function TopicStrengthCard({ title, topics, tone }: { title: string; topics: TopicContent[]; tone: "strong" | "weak" }) {
  return (
    <section className="contentCard">
      <div className="cardHeader">
        <h2>{title}</h2>
        <span className={tone === "strong" ? "statusPill strong" : "statusPill weak"}>
          {topics.length} topic{topics.length === 1 ? "" : "s"}
        </span>
      </div>
      {topics.length === 0 ? (
        <p className="mutedText">No topics in this group yet.</p>
      ) : (
        <div className="topicChipList">
          {topics.map((topic) => <span className="topicChip" key={topic.id}>{topic.label}</span>)}
        </div>
      )}
    </section>
  );
}

export function RecommendedTopicCard({ topic, href }: { topic: TopicContent; href: string }) {
  return (
    <a className="recommendedCard" href={href}>
      <span className="topicBadge">{topic.label}</span>
      <h3>{topic.keyConcept}</h3>
      <p>{topic.shortExplanation}</p>
    </a>
  );
}

export function LearningJourneyCard({
  stage,
  title,
  description,
  href,
}: {
  stage: StageId;
  title: string;
  description: string;
  href: string;
}) {
  const number = stage === "learning" ? "01" : stage === "practice" ? "02" : "03";

  return (
    <a className="journeyCard" href={href}>
      <span className="journeyNumber">{number}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="textLink">Open stage</span>
    </a>
  );
}

export function PracticeQuestionCard({
  question,
  selectedOptionIndex,
  showFeedback,
  onSelectOption,
}: {
  question: MvpQuestion;
  selectedOptionIndex: number | null;
  showFeedback: boolean;
  onSelectOption: (index: number) => void;
}) {
  return (
    <QuestionCard
      question={question}
      selectedOptionIndex={selectedOptionIndex}
      onSelectOption={onSelectOption}
      showFeedback={showFeedback}
    />
  );
}

export function AssessmentCard({
  score,
  total,
  recommendedTopics,
}: {
  score: number;
  total: number;
  recommendedTopics: TopicContent[];
}) {
  const mastered = score >= Math.ceil(total * 0.7);

  return (
    <section className="contentCard">
      <div className="cardHeader">
        <h2>Assessment result</h2>
        <span className={mastered ? "statusPill strong" : "statusPill weak"}>
          {mastered ? "Ready to advance" : "Keep practising"}
        </span>
      </div>
      <p className="largeScore">{score}/{total}</p>
      <p className="mutedText">
        {mastered
          ? "You are showing solid mastery in this check."
          : `Revise ${recommendedTopics.map((topic) => topic.label).join(", ")} before trying again.`}
      </p>
    </section>
  );
}

export function getTopicIds(topics: TopicContent[]): TopicId[] {
  return topics.map((topic) => topic.id);
}

"use client";

import { useMemo, useState } from "react";
import QuizSheet from "@/components/QuizSheet";
import QuestionCard from "@/components/QuestionCard";
import StudyBuddyPanel from "@/components/StudyBuddyPanel";
import { Question } from "@/lib/api";

type ChapterKey = "ubahan" | "matriks" | "insurans";

type StepLite = {
  id: string;
  no: number;
  type: "Content" | "Exercise" | "Assessment";
  title: string;
  prompt: string;
  task?: string;
  answer?: string;
};

type SubtopicLite = {
  id: string;
  title: string;
};

type Props = {
  chapter: ChapterKey;
  step: StepLite;
  subtopic: SubtopicLite;
  onClose: () => void;
  onContinue: () => void;
};

function chapterTopicId(chapter: ChapterKey): string {
  if (chapter === "ubahan") return "Matematik Bab 1: Ubahan";
  if (chapter === "matriks") return "Matematik Bab 2: Matriks";
  return "Matematik Bab 3: Insurans";
}

function buildQuestion(chapter: ChapterKey, step: StepLite, subtopic: SubtopicLite): { question: Question; correctIndex: number } {
  const correct = step.answer ?? "Gunakan konsep subtopik ini secara langkah demi langkah.";
  const distractor1 = step.task ?? "Teruskan dengan langkah rawak tanpa semakan formula.";
  const distractor2 =
    chapter === "ubahan"
      ? "Abaikan pemalar k dan fokus pada nombor akhir sahaja."
      : chapter === "matriks"
      ? "Abaikan syarat saiz matriks sebelum operasi."
      : "Abaikan istilah polisi dan terus pilih premium paling rendah.";
  const distractor3 = "Buat anggaran tanpa menunjukkan sebarang langkah kerja.";

  return {
    question: {
      id: `${step.id}-quiz`,
      topic_id: chapterTopicId(chapter),
      text: `${step.prompt}\n\n${subtopic.id} ${subtopic.title}: pilih langkah paling tepat untuk menjawab soalan ini.`,
      options: [correct, distractor1, distractor2, distractor3],
      difficulty: step.type === "Assessment" ? "hard" : "medium",
      tags: [chapter, step.type.toLowerCase()],
    },
    correctIndex: 0,
  };
}

export default function MaterialQuizSession({ chapter, step, subtopic, onClose, onContinue }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showBuddy, setShowBuddy] = useState(false);

  const userId = typeof window !== "undefined" ? sessionStorage.getItem("userId") : null;
  const { question, correctIndex } = useMemo(() => buildQuestion(chapter, step, subtopic), [chapter, step, subtopic]);

  const isCorrect = selected === correctIndex;
  const done = submitted ? 1 : 0;
  const correct = submitted && isCorrect ? 1 : 0;
  const accuracy = submitted ? (isCorrect ? "100%" : "0%") : "—";

  const bar = !submitted ? (
    <button type="button" className="btn-primary" disabled={selected === null} onClick={() => setSubmitted(true)}>
      Submit Answer
    </button>
  ) : (
    <button type="button" className="btn-primary" onClick={onContinue}>
      Continue
    </button>
  );

  return (
    <QuizSheet open bar={bar} onClose={onClose}>
      <div className="learn-stats">
        <div className="learn-stat">
          <div className="learn-stat-label">Done</div>
          <div className="learn-stat-value">{done}</div>
        </div>
        <div className="learn-stat">
          <div className="learn-stat-label">Correct</div>
          <div className="learn-stat-value green">{correct}</div>
        </div>
        <div className="learn-stat">
          <div className="learn-stat-label">Accuracy</div>
          <div className={`learn-stat-value ${submitted && !isCorrect ? "red" : submitted ? "green" : "red"}`}>{accuracy}</div>
        </div>
      </div>

      <div className="learn-ai-cues" />

      <QuestionCard
        question={question}
        selectedOptionIndex={selected}
        onSelectOption={submitted ? undefined : setSelected}
        showResult={submitted}
        isCorrect={isCorrect}
        correctOptionIndex={correctIndex}
      />

      {showBuddy && userId && (
        <StudyBuddyPanel userId={userId} questionContext={question.text} onClose={() => setShowBuddy(false)} />
      )}

      <button
        type="button"
        className={`sb-fab ${showBuddy ? "sb-fab-active" : ""}`}
        onClick={() => setShowBuddy((v) => !v)}
        aria-label="Ask StudyBuddy"
      >
        {showBuddy ? "✕" : "🤖"}
      </button>
    </QuizSheet>
  );
}

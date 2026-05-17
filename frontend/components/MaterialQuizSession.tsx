"use client";

import { useMemo, useState } from "react";
import QuizSheet from "@/components/QuizSheet";
import QuestionCard from "@/components/QuestionCard";
import StudyBuddyPanel from "@/components/StudyBuddyPanel";
import { Question } from "@/lib/api";
import { MaterialMcq } from "@/app/materials/ubahan/data";

type ChapterKey = "ubahan" | "matriks" | "insurans";

type StepLite = {
  id: string;
  no: number;
  type: "Content" | "Exercise" | "Assessment";
  title: string;
  prompt?: string;
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
  materialQuestions?: MaterialMcq[];
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

function mapMaterialQuestion(chapter: ChapterKey, item: MaterialMcq): { question: Question; correctIndex: number } {
  return {
    question: {
      id: item.id,
      topic_id: chapterTopicId(chapter),
      text: item.text,
      options: item.options,
      difficulty: item.difficulty === "Mudah" ? "easy" : item.difficulty === "Sederhana" ? "medium" : "hard",
      tags: [chapter, "material", item.subtopicId, `kategori:${item.difficulty}`],
    },
    correctIndex: item.answerIndex,
  };
}

export default function MaterialQuizSession({ chapter, step, subtopic, materialQuestions, onClose, onContinue }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showBuddy, setShowBuddy] = useState(false);

  const userId = typeof window !== "undefined" ? sessionStorage.getItem("userId") : null;
  const questionSet = useMemo(() => {
    if (materialQuestions && materialQuestions.length > 0) {
      return materialQuestions.map((q) => mapMaterialQuestion(chapter, q));
    }
    return [buildQuestion(chapter, step, subtopic)];
  }, [chapter, materialQuestions, step, subtopic]);

  const current = questionSet[currentIndex];
  const question = current.question;
  const correctIndex = current.correctIndex;

  const isCorrect = selected === correctIndex;
  const done = currentIndex + (submitted ? 1 : 0);
  const total = questionSet.length;
  const finalStep = submitted && currentIndex === total - 1;
  const displayedCorrect = correctCount + (submitted && isCorrect ? 1 : 0);
  const accuracy = done > 0 ? `${Math.round((displayedCorrect / done) * 100)}%` : "-";

  function submitAnswer() {
    if (selected === null) return;
    if (selected === correctIndex) setCorrectCount((prev) => prev + 1);
    setSubmitted(true);
  }

  function nextQuestion() {
    if (currentIndex >= total - 1) return;
    setCurrentIndex((prev) => prev + 1);
    setSelected(null);
    setSubmitted(false);
  }

  const bar = !submitted ? (
    <button type="button" className="btn-primary" disabled={selected === null} onClick={submitAnswer}>
      Hantar Jawapan
    </button>
  ) : finalStep ? (
    <button type="button" className="btn-primary" onClick={onContinue}>
      Tamat Sesi
    </button>
  ) : (
    <button type="button" className="btn-primary" onClick={nextQuestion}>
      Soalan Seterusnya
    </button>
  );

  return (
    <QuizSheet open bar={bar} onClose={onClose} progress={done} total={total}>
      <div className="learn-stats">
        <div className="learn-stat">
          <div className="learn-stat-label">Selesai</div>
          <div className="learn-stat-value">{done}</div>
        </div>
        <div className="learn-stat">
          <div className="learn-stat-label">Betul</div>
          <div className="learn-stat-value green">{displayedCorrect}</div>
        </div>
        <div className="learn-stat">
          <div className="learn-stat-label">Ketepatan</div>
          <div className={`learn-stat-value ${submitted && !isCorrect ? "red" : submitted ? "green" : "red"}`}>{accuracy}</div>
        </div>
      </div>

      <div className="learn-ai-cues" />

      <QuestionCard
        question={question}
        questionNumber={currentIndex + 1}
        selectedOptionIndex={selected}
        onSelectOption={submitted ? undefined : setSelected}
        showResult={submitted}
        isCorrect={isCorrect}
        correctOptionIndex={correctIndex}
      />

      {showBuddy && userId && (
        <StudyBuddyPanel userId={userId} questionContext={question.text} onClose={() => setShowBuddy(false)} />
      )}

      {!showBuddy && (
        <button
          type="button"
          className="sb-fab"
          onClick={() => setShowBuddy(true)}
          aria-label="Tanya Skorrel"
        >
          <img src="/assets/mascot.webp" alt="Skorrel" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </button>
      )}
    </QuizSheet>
  );
}

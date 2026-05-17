"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import QuizSheet from "@/components/QuizSheet";
import QuestionCard from "@/components/QuestionCard";
import StudyBuddyPanel from "@/components/StudyBuddyPanel";
import {
  Question,
  Explanation,
  submitAnswer as apiSubmitAnswer,
  generateExplanation,
} from "@/lib/api";
import { MaterialMcq } from "@/app/materials/ubahan/data";
import {
  playSubmitSound,
  playCorrectSound,
  playWrongSound,
} from "@/lib/sounds";
import ExplanationBlock from "@/components/ExplanationBlock";

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

function buildQuestion(
  chapter: ChapterKey,
  step: StepLite,
  subtopic: SubtopicLite,
): { question: Question; correctIndex: number } {
  const correct =
    step.answer ?? "Gunakan konsep subtopik ini secara langkah demi langkah.";
  const distractor1 =
    step.task ?? "Teruskan dengan langkah rawak tanpa semakan formula.";
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

function mapMaterialQuestion(
  chapter: ChapterKey,
  item: MaterialMcq,
): { question: Question; correctIndex: number } {
  return {
    question: {
      id: item.id,
      topic_id: chapterTopicId(chapter),
      text: item.text,
      options: item.options,
      difficulty:
        item.difficulty === "Mudah"
          ? "easy"
          : item.difficulty === "Sederhana"
            ? "medium"
            : "hard",
      tags: [
        chapter,
        "material",
        item.subtopicId,
        `kategori:${item.difficulty}`,
      ],
    },
    correctIndex: item.answerIndex,
  };
}

export default function MaterialQuizSession({
  chapter,
  step,
  subtopic,
  materialQuestions,
  onClose,
  onContinue,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [showBuddy, setShowBuddy] = useState(false);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [flaggedIndices, setFlaggedIndices] = useState<Set<number>>(new Set());
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    const uid = sessionStorage.getItem("userId");
    setUserId(uid);

    const storedXp = parseInt(sessionStorage.getItem("userXp") ?? "0", 10);
    setXp(isNaN(storedXp) ? 0 : storedXp);
  }, []);
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

  async function handleSubmit() {
    if (selected === null) return;
    playSubmitSound();

    const correct = selected === correctIndex;
    if (correct) {
      setCorrectCount((prev) => prev + 1);
      setSessionStreak((prev) => prev + 1);
      setTimeout(playCorrectSound, 100);
    } else {
      setSessionStreak(0);
      setTimeout(playWrongSound, 100);
    }

    const xpGain = correct ? 10 : 5;
    setXp((prev) => {
      const next = prev + xpGain;
      sessionStorage.setItem("userXp", String(next));
      return next;
    });

    const today = new Date().toISOString().slice(0, 10);
    const lastActiveDay = localStorage.getItem("lastActiveDay");
    if (lastActiveDay !== today) {
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .slice(0, 10);
      const stored = parseInt(localStorage.getItem("dailyStreak") ?? "0", 10);
      const newDailyStreak =
        lastActiveDay === yesterday ? (isNaN(stored) ? 1 : stored) + 1 : 1;
      localStorage.setItem("dailyStreak", String(newDailyStreak));
      localStorage.setItem("lastActiveDay", today);
      sessionStorage.setItem("streak", String(newDailyStreak));
    }

    if (userId) {
      apiSubmitAnswer(userId, question.id, selected).catch(() => {});
    }

    setSubmitted(true);
  }

  async function handleGenerateExplanation() {
    if (!userId || selected === null) return;
    setIsGeneratingExplanation(true);
    try {
      const exp = await generateExplanation(userId, question.id, selected);
      setExplanation(exp);
    } catch {
      // silently ignore — user can retry
    } finally {
      setIsGeneratingExplanation(false);
    }
  }

  function nextQuestion() {
    if (currentIndex >= total - 1) return;
    setCurrentIndex((prev) => prev + 1);
    setSelected(null);
    setSubmitted(false);
    setShowBuddy(false);
    setExplanation(null);
  }

  function toggleFlag() {
    setFlaggedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  }

  function handleFinish() {
    const flaggedList = Array.from(flaggedIndices);
    if (flaggedList.length > 0) {
      setReviewIndex(0);
      setReviewMode(true);
    } else {
      onContinue();
    }
  }

  const bar = !submitted ? (
    <button
      type="button"
      className="btn-primary"
      disabled={selected === null}
      onClick={handleSubmit}
    >
      Semak
    </button>
  ) : (
    <div
      className={`qs-feedback-panel ${isCorrect ? "qs-feedback-correct" : "qs-feedback-wrong"}`}
    >
      <div className="qs-feedback-top">
        <span className="qs-feedback-icon">{isCorrect ? "✓" : "✗"}</span>
        <div className="qs-feedback-text">
          <p className="qs-feedback-title">
            {isCorrect ? "Betul!" : "Jawapan Salah"}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="qs-feedback-btn"
        onClick={finalStep ? handleFinish : nextQuestion}
      >
        {finalStep ? "TAMAT SESI" : "SETERUSNYA"} &rsaquo;
      </button>
    </div>
  );

  const flaggedList = Array.from(flaggedIndices);

  if (reviewMode) {
    const reviewQ = questionSet[flaggedList[reviewIndex]];
    const isLast = reviewIndex === flaggedList.length - 1;
    const reviewBar = (
      <div className="qs-feedback-panel qs-feedback-correct">
        <div className="qs-feedback-top">
          <span className="qs-feedback-icon">🚩</span>
          <div className="qs-feedback-text">
            <p className="qs-feedback-title">Semakan soalan ditandakan</p>
            <p className="qs-feedback-hint">
              {reviewIndex + 1} / {flaggedList.length}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="qs-feedback-btn"
          onClick={isLast ? onContinue : () => setReviewIndex((i) => i + 1)}
        >
          {isLast ? "SELESAI" : "SETERUSNYA"} &rsaquo;
        </button>
      </div>
    );
    return (
      <QuizSheet
        open
        bar={reviewBar}
        onClose={onClose}
        progress={reviewIndex + 1}
        total={flaggedList.length}
        streak={sessionStreak}
        xp={xp}
        title={`Semakan: ${step.title}`}
        meta={`${flaggedList.length} soalan ditandakan`}
      >
        <QuestionCard
          question={reviewQ.question}
          selectedOptionIndex={reviewQ.correctIndex}
          showResult
          isCorrect
          correctOptionIndex={reviewQ.correctIndex}
        />
      </QuizSheet>
    );
  }

  return (
    <QuizSheet
      open
      bar={bar}
      onClose={onClose}
      progress={done}
      total={total}
      streak={sessionStreak}
      xp={xp}
      flagged={flaggedIndices.has(currentIndex)}
      onToggleFlag={toggleFlag}
    >
      <QuestionCard
        question={question}
        selectedOptionIndex={selected}
        onSelectOption={submitted ? undefined : setSelected}
        showResult={submitted}
        isCorrect={isCorrect}
        correctOptionIndex={correctIndex}
      />

      {submitted && (
        <ExplanationBlock
          explanation={explanation}
          isCorrect={isCorrect}
          onGenerateExplanation={handleGenerateExplanation}
          isGenerating={isGeneratingExplanation}
        />
      )}

      {submitted && showBuddy && userId && (
        <StudyBuddyPanel
          userId={userId}
          questionContext={question.text}
          onClose={() => setShowBuddy(false)}
        />
      )}

      {submitted && !showBuddy && (
        <button
          type="button"
          className="sb-fab"
          onClick={() => setShowBuddy(true)}
          aria-label="Tanya Skorrel"
        >
          <img
            src="/assets/mascot.webp"
            alt="Skorrel"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </button>
      )}
    </QuizSheet>
  );
}

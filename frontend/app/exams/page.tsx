"use client";

import { useEffect, useMemo, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import QuizSheet from "@/components/QuizSheet";
import { Paper, Question, getPapers } from "@/lib/api";

const SUPABASE_URL = "https://pxzyfiysxzwihjplrfvo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4enlmaXlzeHp3aWhqcGxyZnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTU2OTQsImV4cCI6MjA4OTA5MTY5NH0.NjUwwYGELfBI7MzaAmV_L26n45MVWrrpa2okuxA8VJM";

type Stage = "pick" | "quiz";

interface RawQuestion {
  id: number;
  question: string | null;
  options: string[];
  correct_index: number;
  difficulty: string;
  topic: string | null;
}

function mapQuestion(raw: RawQuestion): Question {
  return {
    id: String(raw.id),
    text: raw.question ?? "",
    options: raw.options ?? [],
    difficulty: (raw.difficulty as Question["difficulty"]) ?? "medium",
    topic_id: raw.topic ?? "",
    tags: raw.topic ? [raw.topic] : [],
  };
}

async function getQuestionsByPaper(paperId: number): Promise<Question[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/questions?select=id,question,options,correct_index,difficulty,topic&paper_id=eq.${paperId}&order=question_number`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) throw new Error(`Failed to fetch questions (${res.status})`);
  const rows: RawQuestion[] = await res.json();
  return rows.map(mapQuestion);
}

function isMathPaper(paper: Paper) {
  const subject = (paper.subject ?? "").trim().toLowerCase();
  return subject === "matematik" || subject === "math";
}

function isTrialPaper(paper: Paper) {
  return (paper.paper_type ?? "").toLowerCase() === "trial";
}

export default function ExamsPage() {
  const [stage, setStage] = useState<Stage>("pick");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPaperId, setLoadingPaperId] = useState<number | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Set of paper IDs that have been completed (all questions answered)
  const [completedPaperIds, setCompletedPaperIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getPapers()
      .then((res) => { if (!cancelled) setPapers(res.papers); })
      .catch(() => { if (!cancelled) setError("Failed to load papers."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const trialPapers = useMemo(() => {
    const math = papers.filter(isMathPaper);
    const trial = math.filter(isTrialPaper);
    return trial.length > 0 ? trial : math;
  }, [papers]);

  function isPaperUnlocked(index: number): boolean {
    if (index === 0) return true;
    const prevPaper = trialPapers[index - 1];
    return prevPaper ? completedPaperIds.has(prevPaper.id) : false;
  }

  async function handlePickPaper(paper: Paper, index: number) {
    if (loadingPaperId !== null || !isPaperUnlocked(index)) return;
    setLoadingPaperId(paper.id);
    setError("");
    try {
      const qs = await getQuestionsByPaper(paper.id);
      if (qs.length === 0) throw new Error("No questions found for this paper.");
      setSelectedPaper(paper);
      setQuestions(qs);
      setCurrent(0);
      setAnswers({});
      setStage("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load questions.");
    } finally {
      setLoadingPaperId(null);
    }
  }

  function selectOption(questionId: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }));
  }

  function handleCloseQuiz() {
    // Mark paper as completed if all questions were answered
    if (selectedPaper && questions.length > 0 && Object.keys(answers).length === questions.length) {
      setCompletedPaperIds((prev) => new Set([...prev, selectedPaper.id]));
    }
    setStage("pick");
    setQuestions([]);
    setCurrent(0);
    setAnswers({});
    setError("");
  }

  if (stage === "pick") {
    return (
      <section className="home-dashboard-shell page-enter" aria-label="Exams hub">
        <header className="student-header">
          <div className="student-header-copy">
            <p className="student-time">Trial Papers</p>
            <h1>Choose a Math Trial Paper</h1>
            <div className="student-meta-row">
              <span>{loading ? "Loading…" : `${trialPapers.length} papers`}</span>
              <span aria-hidden="true">•</span>
              <span>Matematik</span>
              <span aria-hidden="true">•</span>
              <span>SPM</span>
            </div>
          </div>
        </header>

        <section className="level-card" aria-label="Pick a paper to begin">
          <div className="level-card-content">
            <p className="level-eyebrow">Paper Picker</p>
            <h2>Tap a paper to start the exam instantly.</h2>
            <div className="level-progress-row">
              <div className="level-progress-track" aria-hidden="true">
                <div className="level-progress-fill level-progress-fill-full">
                  <span className="level-progress-dot" />
                </div>
              </div>
              <span>{trialPapers.length} available</span>
            </div>
          </div>
          <div className="level-trophy" aria-hidden="true">
            <span className="learn-hub-chip">SPM</span>
          </div>
        </section>

        <div className="home-learning-stack">
          {trialPapers.map((paper, index) => {
            const isLoading = loadingPaperId === paper.id;
            const unlocked = isPaperUnlocked(index);
            const completed = completedPaperIds.has(paper.id);
            const tone = index % 3 === 0 ? "lesson" : index % 3 === 1 ? "game" : "path";
            const statusLabel = isLoading ? "Loading questions…" : !unlocked ? "Complete the previous paper to unlock" : completed ? "Completed — tap to retry" : "Tap to start";
            return (
              <button
                key={paper.id}
                type="button"
                className={`learning-feature-card learning-feature-${tone}${isLoading ? " study-select-card-active" : ""}${!unlocked ? " exams-paper-locked" : ""}`}
                onClick={() => handlePickPaper(paper, index)}
                disabled={loadingPaperId !== null || !unlocked}
              >
                <div>
                  <p className="learning-feature-kicker">{paper.year} · {paper.paper_type}</p>
                  <h2>{paper.state ?? "SPM"}</h2>
                  <p>{paper.paper_name}</p>
                  <p className="study-select-subtitle">{statusLabel}</p>
                </div>
                <div className="feature-visual" aria-hidden="true">
                  <div className="feature-blob feature-blob-large" />
                  <div className="feature-blob feature-blob-small" />
                  <div className="feature-mini-card">
                    {isLoading ? "…" : !unlocked ? "🔒" : completed ? "✓" : "Q"}
                  </div>
                </div>
              </button>
            );
          })}

          {!loading && trialPapers.length === 0 && (
            <div className="ai-assistant-card">
              <div className="ai-assistant-avatar" aria-hidden="true">!</div>
              <div>
                <h2>No math trial papers found</h2>
                <p>Check your Supabase connection.</p>
              </div>
            </div>
          )}

          {error && <p className="diag-error">{error}</p>}
        </div>
      </section>
    );
  }

  const question = questions[current];
  const answered = Object.keys(answers).length;
  const isLast = current === questions.length - 1;

  const bar = (
    <div className="qs-nav-bar">
      <button
        type="button"
        className="qs-nav-icon-btn"
        onClick={() => setCurrent((v) => v - 1)}
        disabled={current === 0}
        aria-label="Previous question"
      >
        ←
      </button>
      <button
        type="button"
        className="qs-nav-icon-btn"
        onClick={() => setCurrent((v) => v + 1)}
        disabled={isLast}
        aria-label="Next question"
      >
        →
      </button>
    </div>
  );

  const paperSubtitle = [
    selectedPaper?.paper_name,
    selectedPaper?.paper_type,
    selectedPaper?.year,
    selectedPaper?.state,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <QuizSheet
      open={stage === "quiz"}
      bar={bar}
      onClose={handleCloseQuiz}
      title="Matematik"
      subtitle={paperSubtitle}
      progress={current + 1}
      total={questions.length}
    >
      {question && (
        <QuestionCard
          key={question.id}
          question={question}
          questionNumber={current + 1}
          selectedOptionIndex={answers[question.id] ?? null}
          onSelectOption={(idx) => selectOption(question.id, idx)}
        />
      )}

      {error && <p className="qs-error">{error}</p>}
    </QuizSheet>
  );
}

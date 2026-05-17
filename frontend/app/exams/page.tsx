"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import QuizSheet from "@/components/QuizSheet";
import { Paper, Question, getPapers } from "@/lib/api";

const SUPABASE_URL = "https://pxzyfiysxzwihjplrfvo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4enlmaXlzeHp3aWhqcGxyZnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTU2OTQsImV4cCI6MjA4OTA5MTY5NH0.NjUwwYGELfBI7MzaAmV_L26n45MVWrrpa2okuxA8VJM";

const EXAM_DURATION_SECONDS = 90 * 60; // 1h 30m

type Stage = "pick" | "quiz" | "results";

interface RawQuestion {
  id: number;
  question: string | null;
  options: string[];
  correct_index: number;
  difficulty: string;
  topic: string | null;
}

interface RawQuestionWithCorrect extends RawQuestion {}

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

async function getQuestionsByPaper(paperId: number): Promise<{ questions: Question[]; correctMap: Record<string, number> }> {
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
  const rows: RawQuestionWithCorrect[] = await res.json();
  const questions = rows.map(mapQuestion);
  const correctMap: Record<string, number> = {};
  rows.forEach((r) => { correctMap[String(r.id)] = r.correct_index; });
  return { questions, correctMap };
}

function isMathPaper(paper: Paper) {
  const subject = (paper.subject ?? "").trim().toLowerCase();
  return subject === "matematik" || subject === "math";
}

function isTrialPaper(paper: Paper) {
  return (paper.paper_type ?? "").toLowerCase() === "trial";
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamsPage() {
  const [stage, setStage] = useState<Stage>("pick");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPaperId, setLoadingPaperId] = useState<number | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [correctMap, setCorrectMap] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [completedPaperIds, setCompletedPaperIds] = useState<Set<number>>(new Set());

  // Timer state
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPapers()
      .then((res) => { if (!cancelled) setPapers(res.papers); })
      .catch(() => { if (!cancelled) setError("Gagal memuatkan kertas."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Start/stop timer when quiz stage changes
  useEffect(() => {
    if (stage === "quiz") {
      setTimeLeft(EXAM_DURATION_SECONDS);
      setTimedOut(false);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimedOut(true);
            setStage("results");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

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
      const { questions: qs, correctMap: cm } = await getQuestionsByPaper(paper.id);
      if (qs.length === 0) throw new Error("Tiada soalan dijumpai untuk kertas ini.");
  setSelectedPaper(paper);
      setQuestions(qs);
      setCorrectMap(cm);
      setCurrent(0);
      setAnswers({});
      setStage("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tidak dapat memuatkan soalan.");
    } finally {
      setLoadingPaperId(null);
    }
  }

  function selectOption(questionId: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }));
  }

  function handleSubmit() {
    if (selectedPaper) {
      setCompletedPaperIds((prev) => new Set([...prev, selectedPaper.id]));
    }
    setStage("results");
  }

  function handleCloseQuiz() {
    setStage("pick");
    setQuestions([]);
    setCorrectMap({});
    setCurrent(0);
    setAnswers({});
    setError("");
    setTimedOut(false);
  }

  // ── Pick stage ─────────────────────────────────────────────────────
  if (stage === "pick") {
    return (
      <section className="home-dashboard-shell page-enter" aria-label="Exams hub">
        <header className="student-header">
          <div className="student-header-copy">
            <p className="student-time">Kertas Percubaan</p>
            <h1>Pilih Kertas Percubaan Matematik</h1>
            <div className="student-meta-row">
              <span>{loading ? "Memuatkan…" : `${trialPapers.length} kertas`}</span>
              <span aria-hidden="true">•</span>
              <span>Matematik</span>
              <span aria-hidden="true">•</span>
              <span>SPM</span>
            </div>
          </div>
        </header>

        <section className="level-card" aria-label="Pick a paper to begin">
          <div className="level-card-content">
            <p className="level-eyebrow">Pemilih Kertas</p>
            {(() => {
              const completedCount = completedPaperIds.size;
              const total = trialPapers.length;
              const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
              return (
                <>
                  <h2>{completedCount === 0 ? "Ketik kertas untuk mula peperiksaan dengan segera." : `${completedCount} daripada ${total} kertas selesai`}</h2>
                  <div className="level-progress-row">
                    <div className="level-progress-track" aria-hidden="true">
                      <div className="level-progress-fill" style={{ width: `${pct}%` }}>
                        <span className="level-progress-dot" />
                      </div>
                    </div>
                    <span>{completedCount === 0 ? `${total} tersedia` : `${pct}% selesai`}</span>
                  </div>
                </>
              );
            })()}
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
            const statusLabel = isLoading ? "Memuatkan soalan…" : !unlocked ? "Selesaikan kertas sebelum untuk buka kunci" : completed ? "Selesai — ketik untuk cuba semula" : "Ketik untuk mula";
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
                <h2>Tiada kertas percubaan matematik dijumpai</h2>
                <p>Semak sambungan Supabase anda.</p>
              </div>
            </div>
          )}

          {error && <p className="diag-error">{error}</p>}
        </div>
      </section>
    );
  }

  // ── Results stage ──────────────────────────────────────────────────
  if (stage === "results") {
    const total = questions.length;
    const attempted = Object.keys(answers).length;
    const correct = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] === correctMap[q.id]).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "E";
    const emoji = pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪";

    return (
      <div className="qs-shell">
        <header className="qs-header">
          <button type="button" className="qs-icon-btn" onClick={handleCloseQuiz} aria-label="Close">✕</button>
          <div className="qs-header-center">
            <span className="qs-title">Keputusan</span>
            <span className="qs-subtitle">{selectedPaper?.paper_name}</span>
          </div>
        </header>

        <div className="qs-scroll">
          {timedOut && (
            <div className="exam-timeout-banner">
              ⏰ Masa tamat! Jawapan anda telah dihantar.
            </div>
          )}

          {/* Score card */}
          <div className="exam-score-card">
            <div className="exam-score-emoji">{emoji}</div>
            <div className="exam-score-grade">{grade}</div>
            <div className="exam-score-fraction">{correct} / {total}</div>
            <div className="exam-score-pct">{pct}%</div>
            <div className="exam-score-sub">{attempted < total ? `${total - attempted} tidak dijawab` : "Semua soalan dijawab"}</div>
          </div>

          {/* Per-question breakdown */}
          <div className="exam-review-list">
            {questions.map((q, i) => {
              const userIdx = answers[q.id];
              const corrIdx = correctMap[q.id];
              const answered = userIdx !== undefined;
              const isCorrect = answered && userIdx === corrIdx;
              return (
                <div key={q.id} className={`exam-review-item${isCorrect ? " exam-review-correct" : answered ? " exam-review-wrong" : " exam-review-skipped"}`}>
                  <div className="exam-review-top">
                    <span className="exam-review-num">Q{i + 1}</span>
                    <span className={`exam-review-badge${isCorrect ? " badge-correct" : answered ? " badge-wrong" : " badge-skipped"}`}>
                      {isCorrect ? "✓ Betul" : answered ? "✗ Salah" : "— Dilangkau"}
                    </span>
                  </div>
                  <p className="exam-review-text">{q.text}</p>
                  {answered && !isCorrect && (
                    <p className="exam-review-your">Jawapan anda: <strong>{q.options[userIdx]}</strong></p>
                  )}
                  <p className="exam-review-correct-ans">Betul: <strong>{q.options[corrIdx]}</strong></p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="qs-bar">
          <div className="learn-actions">
            <button type="button" className="btn-ghost" onClick={handleCloseQuiz}>Kembali</button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setCurrent(0);
                setAnswers({});
                setStage("quiz");
              }}
            >
              Cuba Semula
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz stage ─────────────────────────────────────────────────────
  const question = questions[current];
  const answered = Object.keys(answers).length;
  const isLast = current === questions.length - 1;
  const isWarning = timeLeft <= 300; // last 5 min
  const isCritical = timeLeft <= 60;

  const bar = (
    <div className="qs-nav-bar">
      <button
        type="button"
        className="qs-nav-icon-btn"
        onClick={() => setCurrent((v) => v - 1)}
        disabled={current === 0}
        aria-label="Soalan sebelumnya"
      >
        ←
      </button>
      <button
        type="button"
        className="qs-nav-icon-btn"
        onClick={() => setCurrent((v) => v + 1)}
        disabled={isLast}
        aria-label="Soalan seterusnya"
      >
        →
      </button>
      {answered === questions.length && (
        <button
          type="button"
          className="qs-nav-submit"
          onClick={handleSubmit}
          aria-label="Hantar peperiksaan"
        >
          Hantar
        </button>
      )}
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
      timer={
        <span className={`exam-timer${isWarning ? " exam-timer-warn" : ""}${isCritical ? " exam-timer-critical" : ""}`}>
          ⏱ {formatTime(timeLeft)}
        </span>
      }
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

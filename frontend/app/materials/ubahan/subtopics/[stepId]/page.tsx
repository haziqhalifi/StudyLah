"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MaterialQuizSession from "@/components/MaterialQuizSession";
import MathText from "@/components/MathText";
import { MaterialMcq, UBAHAN_QUESTION_BANK, UBAHAN_STEPS, UBAHAN_SUBTOPICS } from "../../data";

type LessonPage = {
  title: string;
  lines: string[];
};

const COMPLETION_KEY = "ubahan_completed_steps_v1";
const MATH_LINE_PATTERN = /[$=]|\\frac|\\times|\\neq|\\left|\\right|\\begin|\\end/;

function buildPages(step: (typeof UBAHAN_STEPS)[number], subtopic: (typeof UBAHAN_SUBTOPICS)[number]): LessonPage[] {
  const conceptLines = [subtopic.meaning];
  if (subtopic.relation) conceptLines.push(`Hubungan Ubahan: ${subtopic.relation}`);
  if (subtopic.equation) conceptLines.push(`Bentuk Persamaan: ${subtopic.equation}`);
  if (subtopic.generalForm) conceptLines.push(`Bentuk Umum: ${subtopic.generalForm}`);
  if (subtopic.graph) conceptLines.push(`Graf: ${subtopic.graph}`);

  return [
    {
      title: `No.${step.no} ${step.title}`,
      lines: [step.prompt].filter((l): l is string => !!l),
    },
    {
      title: `${subtopic.id} ${subtopic.title}`,
      lines: conceptLines,
    },
    {
      title: step.type === "Assessment" ? "Tugasan Pentaksiran" : "Tugasan",
      lines: [
        step.task ?? "Ulangkaji konsep ini dan pastikan anda boleh menerangkan semula dengan ayat sendiri.",
        step.answer ?? "Pastikan anda faham definisi, bentuk persamaan, dan penggunaan pemalar k.",
      ],
    },
  ];
}

export default function UbahanStepPage() {
  const router = useRouter();
  const params = useParams<{ stepId: string }>();
  const [pageIndex, setPageIndex] = useState(0);
  const [showAppreciation, setShowAppreciation] = useState(false);

  const step = useMemo(
    () => UBAHAN_STEPS.find((item) => item.id === params.stepId) ?? null,
    [params.stepId]
  );

  const subtopic = useMemo(() => {
    if (!step) return null;
    return UBAHAN_SUBTOPICS.find((item) => item.id === step.subtopicId) ?? null;
  }, [step]);

  const pages = useMemo(() => {
    if (!step || !subtopic) return [];
    return buildPages(step, subtopic);
  }, [step, subtopic]);

  const sessionQuestions = useMemo(() => {
    if (!step) return [] as MaterialMcq[];

    if (step.id === "ubahan-final-exam") {
      const bySubtopic = ["1.1", "1.2", "1.3"].flatMap((sid) => {
        const pool = UBAHAN_QUESTION_BANK.filter((q) => q.subtopicId === sid);
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 5);
      });
      return bySubtopic.sort(() => Math.random() - 0.5);
    }

    if (step.type === "Exercise") {
      return UBAHAN_QUESTION_BANK.filter((q) => q.subtopicId === step.subtopicId).sort(() => Math.random() - 0.5);
    }

    return [] as MaterialMcq[];
  }, [step]);

  if (!step || !subtopic) {
    return (
      <div className="material-step-page page-enter">
        <section className="material-viewer material-viewer-standalone">
          <div className="material-viewer-top">
            <button type="button" className="material-close-btn" onClick={() => router.push("/materials/ubahan/subtopics")}>
              Tutup
            </button>
            <p className="material-viewer-step">Langkah tidak dijumpai</p>
          </div>
          <div className="material-viewer-body">
            <h2>Langkah tidak dijumpai</h2>
          </div>
        </section>
      </div>
    );
  }

  const isLastPage = pages.length > 0 && pageIndex === pages.length - 1;

  function closePage() {
    router.push("/materials/ubahan/subtopics");
  }

  function nextPage() {
    setPageIndex((previous) => Math.min(previous + 1, pages.length - 1));
  }

  function submitStep() {
    setShowAppreciation(true);
  }

  function continueToMap() {
    if (!step) {
      router.push("/materials/ubahan/subtopics");
      return;
    }
    const raw = localStorage.getItem(COMPLETION_KEY);
    const current = raw ? (JSON.parse(raw) as string[]) : [];
    if (!current.includes(step.id)) current.push(step.id);
    localStorage.setItem(COMPLETION_KEY, JSON.stringify(current));
    router.push("/materials/ubahan/subtopics");
  }

  function isMathLine(line: string) {
    return MATH_LINE_PATTERN.test(line) || line.startsWith("Bentuk") || line.startsWith("Formula");
  }

  if (step.type !== "Content") {
    return (
      <MaterialQuizSession
        chapter="ubahan"
        step={step}
        subtopic={subtopic}
        materialQuestions={sessionQuestions}
        onClose={closePage}
        onContinue={continueToMap}
      />
    );
  }

  return (
    <div className="material-step-page page-enter">
      {!showAppreciation ? (
        <section className="material-viewer material-viewer-standalone">
          <div className="material-viewer-top">
            <button type="button" className="material-close-btn" onClick={closePage}>
              Tutup
            </button>
            <p className="material-viewer-step">
              {subtopic.id} {subtopic.title}
            </p>
          </div>

          <div className="material-viewer-body">
            <p className="material-viewer-page">
              Halaman {pageIndex + 1} / {pages.length}
            </p>
            <h2>{pages[pageIndex]?.title}</h2>
            {pages[pageIndex]?.lines.map((line) =>
              isMathLine(line) ? (
                <div key={line} className="material-math-line">
                  <MathText>{line}</MathText>
                </div>
              ) : (
                <p key={line}>{line}</p>
              )
            )}
          </div>

          <div className="material-viewer-footer">
            {!isLastPage ? (
              <button type="button" className="btn-primary material-viewer-cta" onClick={nextPage}>
                Seterusnya
              </button>
            ) : (
              <button type="button" className="btn-primary material-viewer-cta" onClick={submitStep}>
                Hantar
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="material-celebrate material-celebrate-standalone">
          <div className="material-confetti" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, index) => (
              <span
                key={index}
                className="material-confetti-piece"
                style={
                  {
                    "--c-left": `${(index * 19) % 100}%`,
                    "--c-delay": `${(index % 6) * 0.1}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <h2>Tahniah</h2>
          <p>{`No.${step.no} selesai. Bulatan akan dikemas kini sebagai selesai.`}</p>
          <button type="button" className="btn-primary material-viewer-cta" onClick={continueToMap}>
            Teruskan
          </button>
        </section>
      )}
    </div>
  );
}

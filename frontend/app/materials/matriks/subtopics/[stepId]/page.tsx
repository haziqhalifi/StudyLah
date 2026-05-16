"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MaterialQuizSession from "@/components/MaterialQuizSession";
import { MATRIKS_STEPS, MATRIKS_SUBTOPICS } from "../../data";

type LessonPage = {
  title: string;
  lines: string[];
};

const COMPLETION_KEY = "matriks_completed_steps_v1";

function buildPages(step: (typeof MATRIKS_STEPS)[number], subtopic: (typeof MATRIKS_SUBTOPICS)[number]): LessonPage[] {
  const conceptLines = [subtopic.meaning];
  if (subtopic.relation) conceptLines.push(`Hubungan Penting: ${subtopic.relation}`);
  if (subtopic.equation) conceptLines.push(`Formula / Bentuk: ${subtopic.equation}`);
  if (subtopic.generalForm) conceptLines.push(`Nota Tambahan: ${subtopic.generalForm}`);
  if (subtopic.graph) conceptLines.push(`Graf / Bentuk: ${subtopic.graph}`);

  return [
    {
      title: `No.${step.no} ${step.title}`,
      lines: [step.prompt],
    },
    {
      title: `${subtopic.id} ${subtopic.title}`,
      lines: conceptLines,
    },
    {
      title: step.type === "Assessment" ? "Assessment Task" : "Task",
      lines: [
        step.task ?? "Ulangkaji konsep ini dan pastikan anda boleh menerangkan semula dengan ayat sendiri.",
        step.answer ?? "Pastikan anda faham syarat operasi dan langkah pengiraan.",
      ],
    },
  ];
}

export default function MatriksStepPage() {
  const router = useRouter();
  const params = useParams<{ stepId: string }>();
  const [pageIndex, setPageIndex] = useState(0);
  const [showAppreciation, setShowAppreciation] = useState(false);

  const step = useMemo(
    () => MATRIKS_STEPS.find((item) => item.id === params.stepId) ?? null,
    [params.stepId]
  );

  const subtopic = useMemo(() => {
    if (!step) return null;
    return MATRIKS_SUBTOPICS.find((item) => item.id === step.subtopicId) ?? null;
  }, [step]);

  const pages = useMemo(() => {
    if (!step || !subtopic) return [];
    return buildPages(step, subtopic);
  }, [step, subtopic]);

  if (!step || !subtopic) {
    return (
      <div className="material-step-page page-enter">
        <section className="material-viewer material-viewer-standalone">
          <div className="material-viewer-top">
            <button type="button" className="material-close-btn" onClick={() => router.push("/materials/matriks/subtopics")}>
              Close
            </button>
            <p className="material-viewer-step">Step not found</p>
          </div>
          <div className="material-viewer-body">
            <h2>Step tidak dijumpai</h2>
          </div>
        </section>
      </div>
    );
  }

  const isLastPage = pages.length > 0 && pageIndex === pages.length - 1;

  function closePage() {
    router.push("/materials/matriks/subtopics");
  }

  function nextPage() {
    setPageIndex((previous) => Math.min(previous + 1, pages.length - 1));
  }

  function submitStep() {
    setShowAppreciation(true);
  }

  function continueToMap() {
    if (!step) {
      router.push("/materials/matriks/subtopics");
      return;
    }
    const raw = sessionStorage.getItem(COMPLETION_KEY);
    const current = raw ? (JSON.parse(raw) as string[]) : [];
    if (!current.includes(step.id)) current.push(step.id);
    sessionStorage.setItem(COMPLETION_KEY, JSON.stringify(current));
    router.push("/materials/matriks/subtopics");
  }

  if (step.type !== "Content") {
    return (
      <MaterialQuizSession
        chapter="matriks"
        step={step}
        subtopic={subtopic}
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
              Close
            </button>
            <p className="material-viewer-step">
              {subtopic.id} {subtopic.title}
            </p>
          </div>

          <div className="material-viewer-body">
            <p className="material-viewer-page">
              Page {pageIndex + 1} / {pages.length}
            </p>
            <h2>{pages[pageIndex]?.title}</h2>
            {pages[pageIndex]?.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="material-viewer-footer">
            {!isLastPage ? (
              <button type="button" className="btn-primary material-viewer-cta" onClick={nextPage}>
                Next
              </button>
            ) : (
              <button type="button" className="btn-primary material-viewer-cta" onClick={submitStep}>
                Submit
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
          <h2>Great Work</h2>
          <p>{`No.${step.no} complete. Circle akan dikemaskini sebagai completed.`}</p>
          <button type="button" className="btn-primary material-viewer-cta" onClick={continueToMap}>
            Continue
          </button>
        </section>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MATRIKS_STEPS, MATRIKS_SUBTOPICS } from "../data";

const COMPLETION_KEY = "matriks_completed_steps_v1";

function getStepTone(type: (typeof MATRIKS_STEPS)[number]["type"]) {
  if (type === "Content") return "material-node-content";
  if (type === "Exercise") return "material-node-exercise";
  return "material-node-assessment";
}

function stepTypeLabel(type: (typeof MATRIKS_STEPS)[number]["type"]) {
  if (type === "Content") return "Kandungan";
  if (type === "Exercise") return "Latihan";
  return "Pentaksiran";
}

export default function MatriksSubtopicsPage() {
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [currentSubtopicId, setCurrentSubtopicId] = useState(MATRIKS_SUBTOPICS[0].id);

  const stickyHeadRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const circleRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function syncCompletedFromStorage() {
    const raw = localStorage.getItem(COMPLETION_KEY);
    if (!raw) {
      setCompletedIds([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setCompletedIds(parsed);
      else setCompletedIds([]);
    } catch {
      setCompletedIds([]);
    }
  }

  useEffect(() => {
    const handleResume = () => syncCompletedFromStorage();
    syncCompletedFromStorage();
    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleResume);
    return () => {
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, []);

  useEffect(() => {
    let raf = 0;

    const updateCurrentSubtopic = () => {
      const stickyBottom = (stickyHeadRef.current?.getBoundingClientRect().bottom ?? 92) + 8;
      let activeIndex = 0;

      rowRefs.current.forEach((row, index) => {
        if (!row) return;
        const rect = row.getBoundingClientRect();
        if (rect.top <= stickyBottom) {
          activeIndex = index;
        }
      });

      const closestStep = MATRIKS_STEPS[activeIndex];
      if (!closestStep) return;
      if (closestStep.subtopicId !== currentSubtopicId) {
        setCurrentSubtopicId(closestStep.subtopicId);
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateCurrentSubtopic);
    };

    updateCurrentSubtopic();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [currentSubtopicId]);


  function isCompleted(stepId: string) {
    return completedIds.includes(stepId);
  }

  function isUnlocked(index: number) {
    if (index === 0) return true;
    const previousStep = MATRIKS_STEPS[index - 1];
    return completedIds.includes(previousStep.id);
  }

  function handleCircleClick(step: (typeof MATRIKS_STEPS)[number], index: number) {
    if (!isUnlocked(index) && !isCompleted(step.id)) return;
    router.push(`/materials/matriks/subtopics/${step.id}`);
  }

  return (
    <>
      <header
        ref={(node) => {
          stickyHeadRef.current = node;
        }}
        className="material-current-head"
      >
        <div className="material-header-top-row">
          <button
            type="button"
            onClick={() => router.push("/materials/matriks")}
            className="material-back-btn"
            aria-label="Kembali ke Matriks"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <p className="material-eyebrow">📖 Matematik</p>
        </div>
        <h1 className="material-title">Bab 2: Matriks</h1>
        <p className="material-subtitle">Scroll untuk tukar subtopik semasa.</p>
      </header>

      <div className="material-page page-enter">
      <section className="material-vertical-map" aria-label="Peta pembelajaran menegak">
        <div className="material-vertical-line" aria-hidden="true" />
        {MATRIKS_STEPS.map((step, index) => {
          const completed = isCompleted(step.id);
          const unlocked = isUnlocked(index);
          const sideClass = index % 2 === 0 ? "left" : "right";
          const locked = !unlocked && !completed;

          return (
            <div
              key={step.id}
              ref={(node) => {
                rowRefs.current[index] = node;
              }}
              className={`material-zig-row ${sideClass}`}
            >
              <button
                ref={(node) => {
                  circleRefs.current[index] = node;
                }}
                type="button"
                className={[
                  "material-zig-circle",
                  getStepTone(step.type),
                  completed ? "completed" : "",
                  locked ? "locked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleCircleClick(step, index)}
                disabled={locked}
                aria-label={`${stepTypeLabel(step.type)} ${step.no}: ${step.title}${locked ? " (terkunci)" : completed ? " (selesai)" : ""}`}
              >
                {completed ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : locked ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : (
                  <span className="material-zig-no">{step.no}</span>
                )}
              </button>

              <div className={`material-zig-meta${locked ? " locked-meta" : ""}`}>
                <p className="material-zig-kicker">{stepTypeLabel(step.type)}</p>
                <p className="material-zig-title">{step.title}</p>
                <p className="material-zig-sub">{step.prompt}</p>
              </div>
            </div>
          );
        })}
      </section>
      </div>
    </>
  );
}


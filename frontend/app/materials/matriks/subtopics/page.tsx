"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MATRIKS_STEPS, MATRIKS_SUBTOPICS } from "../data";

const COMPLETION_KEY = "matriks_completed_steps_v1";

function getStepTone(type: (typeof MATRIKS_STEPS)[number]["type"]) {
  if (type === "Content") return "material-node-content";
  if (type === "Exercise") return "material-node-exercise";
  return "material-node-assessment";
}

export default function MatriksSubtopicsPage() {
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [currentSubtopicId, setCurrentSubtopicId] = useState(MATRIKS_SUBTOPICS[0].id);

  const stickyHeadRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const circleRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function syncCompletedFromStorage() {
    const raw = sessionStorage.getItem(COMPLETION_KEY);
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

  const currentSubtopic = useMemo(
    () => MATRIKS_SUBTOPICS.find((subtopic) => subtopic.id === currentSubtopicId) ?? MATRIKS_SUBTOPICS[0],
    [currentSubtopicId]
  );

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
    <div className="material-page page-enter">
      <header
        ref={(node) => {
          stickyHeadRef.current = node;
        }}
        className="material-current-head"
      >
        <p className="material-eyebrow">Bab 2</p>
        <h1 className="material-title">
          {currentSubtopic.id} {currentSubtopic.title}
        </h1>
        <p className="material-subtitle">Scroll map untuk tukar fokus subtopic semasa.</p>
      </header>

      <section className="material-vertical-map" aria-label="Learning map menegak">
        <div className="material-vertical-line" aria-hidden="true" />
        {MATRIKS_STEPS.map((step, index) => {
          const completed = isCompleted(step.id);
          const unlocked = isUnlocked(index);
          const sideClass = index % 2 === 0 ? "left" : "right";

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
                  !unlocked && !completed ? "locked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleCircleClick(step, index)}
                disabled={!unlocked && !completed}
              >
                <span className="material-zig-no">{completed ? "OK" : step.no}</span>
              </button>

              <div className={`material-zig-meta ${sideClass}`}>
                <p className="material-zig-kicker">{step.type}</p>
                <p className="material-zig-title">{`No.${step.no} ${step.title}`}</p>
                <p className="material-zig-sub">{step.prompt}</p>
                {!unlocked && !completed ? <p className="material-zig-lock">Complete previous circle.</p> : null}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}


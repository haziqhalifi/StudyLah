"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UBAHAN_STEPS }  from "@/app/materials/ubahan/data";
import { MATRIKS_STEPS }  from "@/app/materials/matriks/data";
import { INSURANS_STEPS } from "@/app/materials/insurans/data";

// ─── Chapter config ──────────────────────────────────────────────────────────

const CHAPTERS = [
  {
    id:            "ubahan",
    title:         "Bab 1: Ubahan",
    steps:         UBAHAN_STEPS,
    completionKey: "ubahan_completed_steps_v1",
    color:         "#7c65ff",
    dark:          "#5a45d4",
    stepRoute:     (id: string) => `/materials/ubahan/subtopics/${id}`,
  },
  {
    id:            "matriks",
    title:         "Bab 2: Matriks",
    steps:         MATRIKS_STEPS,
    completionKey: "matriks_completed_steps_v1",
    color:         "#ff4b9e",
    dark:          "#d4387e",
    stepRoute:     (id: string) => `/materials/matriks/subtopics/${id}`,
  },
  {
    id:            "insurans",
    title:         "Bab 3: Insurans",
    steps:         INSURANS_STEPS,
    completionKey: "insurans_completed_steps_v1",
    color:         "#2ec486",
    dark:          "#1d9463",
    stepRoute:     (id: string) => `/materials/insurans/subtopics/${id}`,
  },
] as const;

type ChapterId = (typeof CHAPTERS)[number]["id"];

// Snake-path x-offsets (px) cycling per step index
const SNAKE = [0, 55, 80, 55, 0, -55, -80, -55];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readCompleted(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function stepTypeLabel(type: string) {
  if (type === "Content")  return "Kandungan";
  if (type === "Exercise") return "Latihan";
  return "Peperiksaan";
}

// SVG icons per step type + state
function NodeIcon({ type, state }: { type: string; state: "active" | "done" | "locked" }) {
  const color = state === "locked" ? "#9ca3af" : "#fff";
  if (state === "done") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (state === "locked") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  // Active — icon per type
  if (type === "Content") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill={color} stroke="none">
        <path d="M12 2l2.9 6.3 6.8.6-5 4.7 1.5 6.8L12 17l-6.2 3.4 1.5-6.8-5-4.7 6.8-.6z" />
      </svg>
    );
  }
  if (type === "Exercise") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v16M18 4v16M6 12h12M3 6h3M18 6h3M3 18h3M18 18h3" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5h8v4.5a4 4 0 0 1-8 0V5Z" />
      <path d="M8 7H5.5A1.5 1.5 0 0 0 4 8.5C4 10.4 5.6 12 8 12M16 7h2.5A1.5 1.5 0 0 1 20 8.5c0 1.9-1.6 3.5-4 3.5M12 13.5V17M9 20h6" />
    </svg>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function LearningPage() {
  const router = useRouter();
  const headerRef    = useRef<HTMLElement | null>(null);
  const chapterRefs  = useRef<Array<HTMLDivElement | null>>([]);
  const nodeRefs     = useRef<Record<string, HTMLDivElement | null>>({});
  const latestMap    = useRef<Record<ChapterId, string[]>>({ ubahan: [], matriks: [], insurans: [] });

  const [currentChapterId, setCurrentChapterId] = useState<ChapterId>("ubahan");
  const [completedMap, setCompletedMap] = useState<Record<ChapterId, string[]>>({
    ubahan: [], matriks: [], insurans: [],
  });

  function scrollToActive(map: Record<ChapterId, string[]>) {
    for (const chapter of CHAPTERS) {
      const completed = map[chapter.id] ?? [];
      for (let i = 0; i < chapter.steps.length; i++) {
        const unlocked = i === 0 || completed.includes(chapter.steps[i - 1].id);
        if (unlocked && !completed.includes(chapter.steps[i].id)) {
          const el = nodeRefs.current[`${chapter.id}-${i}`];
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
    }
  }

  function syncCompletions(scroll = false) {
    const map: Record<ChapterId, string[]> = {
      ubahan:   readCompleted("ubahan_completed_steps_v1"),
      matriks:  readCompleted("matriks_completed_steps_v1"),
      insurans: readCompleted("insurans_completed_steps_v1"),
    };
    latestMap.current = map;
    setCompletedMap(map);
    if (scroll) setTimeout(() => scrollToActive(latestMap.current), 250);
  }

  useEffect(() => {
    // On mount: load completions then scroll to active if there's any progress
    syncCompletions();
    const hasProgress = Object.values(latestMap.current).some(a => a.length > 0);
    if (hasProgress) setTimeout(() => scrollToActive(latestMap.current), 350);

    // On focus/return (e.g. tab switch): sync and scroll
    const h = () => syncCompletions(true);
    window.addEventListener("focus", h);
    window.addEventListener("pageshow", h);
    document.addEventListener("visibilitychange", h);
    return () => {
      window.removeEventListener("focus", h);
      window.removeEventListener("pageshow", h);
      document.removeEventListener("visibilitychange", h);
    };
  }, []);

  // Scroll → update banner
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const bottom = (headerRef.current?.getBoundingClientRect().bottom ?? 200) + 8;
      let active = 0;
      chapterRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= bottom) active = i;
      });
      const ch = CHAPTERS[active];
      if (ch && ch.id !== currentChapterId) setCurrentChapterId(ch.id as ChapterId);
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [currentChapterId]);

  const currentChapter = useMemo(
    () => CHAPTERS.find(c => c.id === currentChapterId) ?? CHAPTERS[0],
    [currentChapterId],
  );

  const totalSteps = CHAPTERS.reduce((s, c) => s + c.steps.length, 0);
  const totalDone  = CHAPTERS.reduce((s, c) => s + (completedMap[c.id]?.length ?? 0), 0);
  const overallPct = totalSteps > 0 ? Math.round((totalDone / totalSteps) * 100) : 0;

  return (
    <>
      {/* ── Floating banner ───────────────────────────────────────────── */}
      <header
        ref={node => { headerRef.current = node; }}
        className="material-current-head lp-banner"
        style={{ borderColor: currentChapter.color + "40" }}
      >
        <div className="material-header-top-row">
          <button type="button" className="material-back-btn" onClick={() => router.back()} aria-label="Kembali">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <p className="material-eyebrow">📖 Matematik</p>
        </div>
        <h1 className="material-title lp-banner-title" style={{ color: currentChapter.color }}>
          {currentChapter.title}
        </h1>
        <div className="lp-overall-progress">
          <div className="lp-progress-track">
            <div className="lp-progress-fill" style={{ width: `${overallPct}%`, background: currentChapter.color }} />
          </div>
          <span className="lp-progress-label">{totalDone}/{totalSteps} selesai</span>
        </div>
      </header>

      {/* ── Snake path ────────────────────────────────────────────────── */}
      <div className="lp-snake-content">
        {CHAPTERS.map((chapter, chapterIdx) => {
          const completed = completedMap[chapter.id] ?? [];
          const isCompleted = (id: string) => completed.includes(id);
          const isUnlocked  = (idx: number) => idx === 0 || completed.includes(chapter.steps[idx - 1].id);
          const activeIdx   = chapter.steps.findIndex((s, i) => isUnlocked(i) && !isCompleted(s.id));

          return (
            <div
              key={chapter.id}
              ref={node => { chapterRefs.current[chapterIdx] = node; }}
              style={{ width: "100%" }}
            >
              {/* Chapter title separator — all chapters */}
              <div className="lp-section-sep">
                <div className="lp-section-sep-line" />
                <span className="lp-section-sep-text" style={{ color: chapter.color }}>{chapter.title}</span>
                <div className="lp-section-sep-line" />
              </div>

              {/* Nodes */}
              {chapter.steps.map((step, stepIdx) => {
                const done    = isCompleted(step.id);
                const active  = stepIdx === activeIdx;
                const locked  = !isUnlocked(stepIdx) && !done;
                const offset  = SNAKE[stepIdx % SNAKE.length];
                const state   = done ? "done" : active ? "active" : "locked";

                // 3D color
                const bg   = done ? "#58cc02" : active ? chapter.color : "#e5e5e5";
                const dark = done ? "#46a302" : active ? chapter.dark  : "#afafaf";

                return (
                  <div key={step.id} className="lp-node-row">
                    <div
                      className="lp-node-wrap"
                      ref={el => { nodeRefs.current[`${chapter.id}-${stepIdx}`] = el; }}
                      style={{ transform: `translateX(${offset}px)` }}
                    >
                      {/* START label on active node */}
                      {active && (
                        <div className="lp-start-label" style={{ borderColor: chapter.color, color: chapter.color }}>
                          MULA
                          <div className="lp-start-arrow" style={{ borderTopColor: chapter.color }} />
                        </div>
                      )}

                      {/* 3D node circle */}
                      <button
                        type="button"
                        className={`lp-node-circle${active ? " lp-node-active" : ""}${done ? " lp-node-done" : ""}${locked ? " lp-node-locked" : ""}`}
                        style={{
                          background:  `radial-gradient(circle at 38% 38%, ${bg}ee, ${bg}99)`,
                          boxShadow:   `0 6px 0 ${dark}, 0 10px 20px ${dark}55`,
                        } as React.CSSProperties}
                        onClick={() => { if (!locked) router.push(chapter.stepRoute(step.id)); }}
                        disabled={locked}
                        aria-label={step.title}
                      >
                        {/* Inner highlight ring on active */}
                        {active && (
                          <div className="lp-node-ring" style={{ borderColor: chapter.color + "55" }} />
                        )}
                        <NodeIcon type={step.type} state={state} />
                      </button>

                      {/* Type tag */}
                      <span
                        className="lp-node-tag"
                        style={{
                          background: locked ? "#f3f4f6" : chapter.color + "18",
                          color:      locked ? "#9ca3af" : chapter.color,
                          borderColor: locked ? "#e5e7eb" : chapter.color + "40",
                        }}
                      >
                        {stepTypeLabel(step.type)}
                      </span>

                      {/* Step label */}
                      <p className="lp-node-label" style={{ color: locked ? "#9ca3af" : "#374151" }}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* All done */}
        <div className="lp-finish">
          <div className="lp-finish-icon">🏆</div>
          <p className="lp-finish-text">Laluan selesai!</p>
          <p className="lp-finish-sub">Semua bab telah ditamatkan.</p>
        </div>
      </div>
    </>
  );
}

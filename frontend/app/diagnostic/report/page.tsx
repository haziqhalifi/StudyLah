"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchDiagnosticReport,
  DiagnosticReport,
  TopicReport,
  QuestionAttemptDetail,
} from "@/lib/api";

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function levelClasses(level: string) {
  if (level === "strong") return { ring: "border-emerald-500 text-emerald-600", badge: "bg-emerald-100 text-emerald-800" };
  if (level === "okay") return { ring: "border-amber-500 text-amber-600", badge: "bg-amber-100 text-amber-800" };
  return { ring: "border-red-500 text-red-600", badge: "bg-red-100 text-red-800" };
}

function QuestionRow({ q }: { q: QuestionAttemptDetail }) {
  return (
    <div className="flex gap-2 items-start py-2 border-b border-gray-100 last:border-0">
      <span className={`flex-shrink-0 font-bold text-sm mt-0.5 ${q.isCorrect ? "text-emerald-600" : "text-red-500"}`}>
        {q.isCorrect ? "✓" : "✗"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug mb-0.5">{q.questionText}</p>
        <p className="text-xs text-gray-400">
          {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
          {!q.isCorrect && (
            <> &middot; Correct: option {q.correctOptionIndex + 1} &middot; You chose: option {q.selectedOptionIndex + 1}</>
          )}
        </p>
      </div>
    </div>
  );
}

function TopicSection({ topic }: { topic: TopicReport }) {
  const [expanded, setExpanded] = useState(false);
  const cls = levelClasses(topic.level);

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-3 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left bg-transparent border-0 cursor-pointer"
      >
        <span className={`flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center font-extrabold text-xs ${cls.ring}`}>
          {pct(topic.accuracy)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 m-0">{topic.topicName}</p>
          <p className="text-xs text-gray-500 m-0">
            {topic.correct}/{topic.attempts} correct &middot;{" "}
            <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold ${cls.badge}`}>
              {topic.level.toUpperCase()}
            </span>
          </p>
        </div>
        <span className="text-gray-400 text-xs flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-5 pt-3 pb-4">
          {topic.questions.length === 0 ? (
            <p className="text-sm text-gray-400">No questions recorded.</p>
          ) : (
            topic.questions.map((q, idx) => (
              <QuestionRow key={`${q.questionId}-${idx}`} q={q} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function DiagnosticReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("studylah_user_id");
    if (!userId) {
      setError("No user session found. Please complete the diagnostic first.");
      setLoading(false);
      return;
    }
    fetchDiagnosticReport(userId)
      .then(setReport)
      .catch((e: Error) => setError(e?.message ?? "Failed to load report."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter px-6 pt-6 pb-24 max-w-xl mx-auto">
      <div className="mb-7">
        <div className="text-4xl mb-2">📋</div>
        <h1 className="font-extrabold text-2xl leading-tight mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Detailed Report
        </h1>
        {report && (
          <p className="text-sm text-gray-500 leading-relaxed">
            {report.correctQuestions}/{report.totalQuestions} correct overall &mdash; {pct(report.overallAccuracy)} accuracy
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading your report…</p>}

      {error && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {report && (
        <div className="mb-8">
          {report.topics.map((topic) => (
            <TopicSection key={topic.topicId} topic={topic} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button type="button" className="btn-primary" onClick={() => router.push("/diagnostic/result")}>
          ← Back to results
        </button>
        <button type="button" className="btn-ghost" onClick={() => router.push("/")}>
          Go to dashboard
        </button>
      </div>
    </div>
  );
}

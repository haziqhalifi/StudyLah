"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssessment, TopicStats } from "@/lib/api";
import ProgressSummary from "@/components/ProgressSummary";

export default function AssessmentPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    const n = sessionStorage.getItem("userName") ?? "";
    setName(n);
    if (!userId) {
      router.push("/");
      return;
    }

    getAssessment(userId)
      .then((res) => setTopics(res.topics))
      .catch(() => setError("Failed to load assessment data."))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <LoadingShell />;

  return (
    <div>
      <div className="assessment-header page-enter">
        <h1 className="font-display assessment-title">
          {name ? `${name}'s progress` : "Your Progress"}
        </h1>
        <p className="assessment-sub">
          The AI engine uses this to personalise your next questions.
        </p>
      </div>

      {error && <p className="diag-error">{error}</p>}

      {topics.length === 0 ? (
        <div className="card assessment-empty page-enter">
          <p className="assessment-empty-title">No data yet</p>
          <p className="assessment-empty-sub">
            Complete the diagnostic to get started!
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push("/diagnostic")}
          >
            Start Diagnostic →
          </button>
        </div>
      ) : (
        <ProgressSummary topics={topics} />
      )}

      <div className="assessment-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => router.push("/materials")}
        >
          Continue Learning →
        </button>
        <button
          type="button"
          className="btn-ghost diag-skip-btn"
          onClick={() => router.push("/review")}
        >
          Review ↺
        </button>
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="page-enter">
      <div className="assessment-header">
        <div className="skeleton-title" />
        <div className="skeleton-sub" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card topic-card skeleton-card-sm" />
      ))}
    </div>
  );
}

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

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    if (!userId) { router.push("/"); return; }

    getAssessment(userId)
      .then((res) => setTopics(res.topics))
      .catch(() => setError("Failed to load assessment data."))
      .finally(() => setLoading(false));
  }, [router]);

  const userName = typeof window !== "undefined" ? sessionStorage.getItem("userName") : "";

  if (loading) return <p style={{ color: "#888" }}>Loading assessment…</p>;

  return (
    <div>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.4rem" }}>
        Your Progress{userName ? `, ${userName}` : ""}
      </h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Here&apos;s a snapshot of how you&apos;re doing. The AI engine uses this to personalise your next questions.
      </p>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {topics.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: "2rem",
            textAlign: "center",
            color: "#888",
          }}
        >
          No data yet. Complete the diagnostic to get started!
          <br />
          <button
            onClick={() => router.push("/diagnostic")}
            style={{
              marginTop: "1rem",
              background: "#6c47ff",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "0.75rem 1.5rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Start Diagnostic
          </button>
        </div>
      ) : (
        <ProgressSummary topics={topics} />
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
        <button
          onClick={() => router.push("/learn")}
          style={{
            flex: 1,
            background: "#6c47ff",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "1rem",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Continue Learning →
        </button>
        <button
          onClick={() => router.push("/review")}
          style={{
            background: "white",
            color: "#6c47ff",
            border: "2px solid #6c47ff",
            borderRadius: 12,
            padding: "1rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Review Weak Topics
        </button>
      </div>
    </div>
  );
}

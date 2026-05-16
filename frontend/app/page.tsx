"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function handleStart() {
    if (!name.trim()) return;
    setLoading(true);
    const userId = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    sessionStorage.setItem("userId", userId);
    sessionStorage.setItem("userName", name.trim());
    sessionStorage.removeItem("diagnosticAnswers");
    sessionStorage.removeItem("diagnosticResult");
    router.push("/diagnostic");
  }

  return (
    <div style={{ textAlign: "center", paddingTop: "3rem" }}>
      <div
        style={{
          display: "inline-block",
          background: "#6c47ff",
          color: "white",
          borderRadius: 12,
          padding: "0.4rem 1rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          letterSpacing: "0.05em",
          marginBottom: "1.2rem",
        }}
      >
        AI-NATIVE LEARNING
      </div>

      <h1 style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "1rem" }}>
        Learn smarter, not harder
      </h1>
      <p style={{ color: "#555", maxWidth: 480, margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
        StudyLah adapts to <em>your</em> pace and learning style. Our AI engine analyses your
        answers, identifies gaps, and personalises every explanation and question just for you.
      </p>

      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "2rem",
          boxShadow: "0 4px 24px rgba(108,71,255,0.1)",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", textAlign: "left" }}>
          What&apos;s your name?
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleStart()}
          placeholder="e.g. Aisha, Ravi, Jun Wei..."
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            border: "2px solid #e5e5e5",
            borderRadius: 10,
            fontSize: "1rem",
            marginBottom: "1rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleStart}
          disabled={loading || !name.trim()}
          style={{
            width: "100%",
            background: loading || !name.trim() ? "#c4b5fd" : "#6c47ff",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "0.85rem",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: loading || !name.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Starting..." : "Start Diagnostic ->"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          justifyContent: "center",
          marginTop: "3rem",
          flexWrap: "wrap",
        }}
      >
        {[
          { icon: "AI", label: "AI-adaptive questions" },
          { icon: "Tip", label: "Personalised explanations" },
          { icon: "Loop", label: "Spaced repetition" },
          { icon: "Data", label: "Live progress tracking" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            style={{
              background: "white",
              borderRadius: 12,
              padding: "0.75rem 1.25rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#444",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <strong style={{ color: "#6c47ff", marginRight: 6 }}>{icon}</strong> {label}
          </div>
        ))}
      </div>
    </div>
  );
}

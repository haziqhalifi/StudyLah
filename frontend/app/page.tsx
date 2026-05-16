"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createUser } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [existing, setExisting] = useState<string | null>(null);

  useEffect(() => {
    const n = sessionStorage.getItem("userName");
    if (n) setExisting(n);
  }, []);

  async function handleStart() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const userId = trimmed.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
      await createUser(userId, trimmed);
      sessionStorage.setItem("userId", userId);
      sessionStorage.setItem("userName", trimmed);
      router.push("/diagnostic");
    } catch {
      setError("Cannot reach server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  if (existing) {
    return <Dashboard name={existing} onReset={() => { sessionStorage.clear(); setExisting(null); }} />;
  }

  return (
    <div className="page-enter">
      <div className="home-greeting">
        <p className="home-greeting-eyebrow">AI-Native Learning</p>
        <h1 className="font-display home-greeting-title home-hero-title">
          Study smarter,<br />not harder.
        </h1>
        <p className="home-greeting-sub">
          Adaptive questions · Personalised explanations · Spaced repetition
        </p>
      </div>

      <div className="home-name-card">
        <h1 className="font-display">What&apos;s your name?</h1>
        <p>We&apos;ll personalise every question and explanation just for you.</p>

        <input
          className="home-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
          placeholder="e.g. Aisha, Ravi, Jun Wei…"
          autoFocus
        />
        {error && <p className="home-error">{error}</p>}

        <button
          type="button"
          className="btn-primary"
          onClick={handleStart}
          disabled={loading || !name.trim()}
        >
          {loading ? "Starting…" : "Start Diagnostic →"}
        </button>
      </div>

      <div className="home-features">
        {[
          { icon: "🧠", label: "AI-adaptive questions"    },
          { icon: "💡", label: "Personalised explanations" },
          { icon: "↺",  label: "Spaced repetition"        },
          { icon: "▤",  label: "Live progress tracking"   },
        ].map(({ icon, label }) => (
          <div key={label} className="home-feature-pill">
            <span>{icon}</span> {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ name, onReset }: { name: string; onReset: () => void }) {
  const router = useRouter();

  const actions = [
    {
      href: "/learn",
      label: "Continue practice",
      sub: "Pick up where you left off",
      icon: "✦",
      iconCls: "home-action-icon home-action-icon-light",
      primary: true,
    },
    {
      href: "/diagnostic",
      label: "New diagnostic",
      sub: "Re-assess your knowledge",
      icon: "◎",
      iconCls: "home-action-icon home-action-icon-brand",
      primary: false,
    },
    {
      href: "/review",
      label: "Quick review",
      sub: "Spaced repetition — your weak spots",
      icon: "↺",
      iconCls: "home-action-icon home-action-icon-review",
      primary: false,
    },
  ];

  return (
    <div>
      <div className="home-greeting">
        <p className="home-greeting-eyebrow">StudyLah</p>
        <h1 className="font-display home-greeting-title">
          Hi {name},<br />ready to practise?
        </h1>
        <p className="home-greeting-sub">Your AI tutor is ready.</p>
      </div>

      <div className="home-actions">
        {actions.map(({ href, label, sub, icon, iconCls, primary }) =>
          primary ? (
            <button
              type="button"
              key={href}
              className="home-action-primary"
              onClick={() => router.push(href)}
            >
              <span className={iconCls}>{icon}</span>
              <span>
                <span className="home-action-label home-action-label-white">{label}</span>
                <span className="home-action-sub home-action-sub-white">{sub}</span>
              </span>
              <span className="home-action-arrow">→</span>
            </button>
          ) : (
            <button
              type="button"
              key={href}
              className="home-action-secondary"
              onClick={() => router.push(href)}
            >
              <span className={iconCls}>{icon}</span>
              <span>
                <span className="home-action-label">{label}</span>
                <span className="home-action-sub home-action-sub-muted">{sub}</span>
              </span>
              <span className="home-action-arrow">→</span>
            </button>
          )
        )}
      </div>

      <p className="home-section-title">Quick links</p>
      <div className="home-quicklinks">
        <button
          type="button"
          className="btn-ghost btn-ghost-sm"
          onClick={() => router.push("/assessment")}
        >
          My Progress ▤
        </button>
        <button
          type="button"
          className="btn-ghost btn-ghost-sm btn-ghost-neutral"
          onClick={onReset}
        >
          Switch user
        </button>
      </div>
    </div>
  );
}

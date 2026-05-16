"use client";

import { useState } from "react";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "statistics" | "badges">("overview");

  return (
    <main className="app-main">
      <section className="profile-page page-enter" aria-label="Student profile">
        <header className="profile-topbar" aria-label="Profile actions">
          <button type="button" className="profile-icon-button" aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18 9 12l6-6M10 12h10" />
            </svg>
          </button>
          <div className="profile-topbar-actions">
            <button type="button" className="profile-icon-button profile-reward-button" aria-label="View rewards">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 12v8H4v-8M3 8h18v4H3V8ZM12 8v12M12 8H8.5a2 2 0 1 1 2-2c0 1.2.7 2 1.5 2ZM12 8h3.5a2 2 0 1 0-2-2c0 1.2-.7 2-1.5 2Z" />
              </svg>
            </button>
            <button type="button" className="profile-icon-button" aria-label="Search">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4" />
              </svg>
            </button>
            <button type="button" className="profile-icon-button" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 10.5a6 6 0 0 0-12 0v2.8L4.8 16h14.4L18 13.3v-2.8ZM10 18a2 2 0 0 0 4 0" />
              </svg>
              <span className="profile-notification-dot" />
            </button>
            <button type="button" className="profile-icon-button" aria-label="Settings">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 12a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
              </svg>
            </button>
          </div>
        </header>

        <section className="profile-header-card" aria-label="Student information">
          <div className="profile-identity">
            <div className="profile-avatar" aria-hidden="true">A</div>
            <div>
              <p className="profile-kicker">Student Profile</p>
              <h1>Amir</h1>
              <p className="profile-school-line">Science Stream · Form 4</p>
              <p className="profile-exam-line">SPM 2026 Candidate</p>
            </div>
          </div>
          <div className="profile-learning-stats" aria-label="Learning progress statistics">
            <div className="profile-stat-card">
              <strong>3</strong>
              <span>completed</span>
            </div>
            <div className="profile-stat-card">
              <strong>15</strong>
              <span>total</span>
            </div>
            <div className="profile-stat-card">
              <strong>180</strong>
              <span>XP</span>
            </div>
          </div>
        </section>

        <div className="profile-actions">
          <button type="button" className="profile-primary-action">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3.5 20c.7-3.6 3-6 6.5-6 2 0 3.7.8 4.8 2.2M18 9v6M15 12h6" />
            </svg>
            Find Friends
          </button>
          <button type="button" className="profile-action-icon" aria-label="Edit profile">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM13.8 7.2l3 3" />
            </svg>
          </button>
          <button type="button" className="profile-action-icon" aria-label="Share profile">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.7 16.3l6.6-3.6M8.7 7.7l6.6 3.6" />
            </svg>
          </button>
        </div>

        <nav className="profile-tabs" aria-label="Profile sections">
          <button
            type="button"
            className={`profile-tab${activeTab === "overview" ? " active" : ""}`}
            aria-pressed={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={`profile-tab${activeTab === "statistics" ? " active" : ""}`}
            aria-pressed={activeTab === "statistics"}
            onClick={() => setActiveTab("statistics")}
          >
            Statistics
          </button>
          <button
            type="button"
            className={`profile-tab${activeTab === "badges" ? " active" : ""}`}
            aria-pressed={activeTab === "badges"}
            onClick={() => setActiveTab("badges")}
          >
            Badges
          </button>
        </nav>

        <div className="profile-tab-panel">
          {activeTab === "overview" && (
            <div className="profile-tab-stack">
              <section className="profile-invite-card">
                <div>
                  <p className="profile-card-label">Bonus XP</p>
                  <h2>Invite friends and learn together</h2>
                  <p>Get bonus XP when your friends complete their first lesson.</p>
                </div>
                <button type="button" className="profile-small-action">Invite Friend</button>
              </section>

              <section className="profile-leaderboard-card">
                <div>
                  <p className="profile-card-label">Leaderboard</p>
                  <h2>My Rank</h2>
                  <p>Position #12</p>
                  <span>Form 4 · Science Stream</span>
                </div>
                <button type="button" className="profile-floating-action" aria-label="Open leaderboard">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </section>

              <section className="profile-summary-card">
                <p className="profile-card-label">Learning Summary</p>
                <div className="profile-summary-grid">
                  <div className="profile-stat-card">
                    <strong>Level 1</strong>
                    <span>Current level</span>
                  </div>
                  <div className="profile-stat-card">
                    <strong>10%</strong>
                    <span>Progress</span>
                  </div>
                  <div className="profile-stat-card">
                    <strong>Quadratic Functions</strong>
                    <span>Weak topic</span>
                  </div>
                  <div className="profile-stat-card">
                    <strong>Algebra</strong>
                    <span>Strong topic</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "statistics" && (
            <div className="profile-tab-stack">
              <section className="profile-summary-card">
                <p className="profile-card-label">Statistics</p>
                <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Coming soon…</p>
              </section>
            </div>
          )}

          {activeTab === "badges" && (
            <div className="profile-tab-stack">
              <section className="profile-summary-card">
                <p className="profile-card-label">Badges</p>
                <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Coming soon…</p>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

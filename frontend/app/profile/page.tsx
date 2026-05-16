"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

const student = {
  name: "Amir",
  form: "Form 4",
  stream: "Science Stream",
  targetExam: "SPM 2026",
  level: 1,
  progress: 10,
  xp: 180,
  completedLessons: 3,
  totalLessons: 15,
  weakTopic: "Quadratic Functions",
  strongTopic: "Algebra",
  streak: 2,
  rank: "#12",
  badges: ["First Step", "Algebra Starter", "Practice Beginner"],
};

const tabs = ["Overview", "Statistics", "Badges"] as const;
type ProfileTab = (typeof tabs)[number];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("Overview");

  return (
    <section className="profile-page page-enter" aria-label="Student profile">
      <ProfileTopBar />
      <ProfileHeader />
      <ProfileActionButtons />
      <ProfileTabs activeTab={activeTab} onSelect={setActiveTab} />

      <div className="profile-tab-panel">
        {activeTab === "Overview" && <OverviewTab />}
        {activeTab === "Statistics" && <StatisticsTab />}
        {activeTab === "Badges" && <BadgesTab />}
      </div>
    </section>
  );
}

function ProfileTopBar() {
  const router = useRouter();

  return (
    <header className="profile-topbar" aria-label="Profile actions">
      <button
        type="button"
        className="profile-icon-button"
        aria-label="Go back"
        onClick={() => router.back()}
      >
        <ArrowLeftIcon />
      </button>

      <div className="profile-topbar-actions">
        <button
          type="button"
          className="profile-icon-button profile-reward-button"
          aria-label="View rewards"
          onClick={() => console.log("Rewards clicked")}
        >
          <GiftIcon />
        </button>
        <button
          type="button"
          className="profile-icon-button"
          aria-label="Search"
          onClick={() => console.log("Search clicked")}
        >
          <SearchIcon />
        </button>
        <button
          type="button"
          className="profile-icon-button"
          aria-label="Notifications"
          onClick={() => console.log("Notifications clicked")}
        >
          <BellIcon />
          <span className="profile-notification-dot" />
        </button>
        <button
          type="button"
          className="profile-icon-button"
          aria-label="Settings"
          onClick={() => console.log("Settings clicked")}
        >
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}

function ProfileHeader() {
  return (
    <section className="profile-header-card" aria-label="Student information">
      <div className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">
          {student.name.charAt(0)}
        </div>
        <div>
          <p className="profile-kicker">Student Profile</p>
          <h1>{student.name}</h1>
          <p className="profile-school-line">
            {student.stream} · {student.form}
          </p>
          <p className="profile-exam-line">{student.targetExam} Candidate</p>
        </div>
      </div>

      <div className="profile-learning-stats" aria-label="Learning progress statistics">
        <ProfileStatCard label="completed" value={String(student.completedLessons)} />
        <ProfileStatCard label="total" value={String(student.totalLessons)} />
        <ProfileStatCard label="XP" value={String(student.xp)} />
      </div>
    </section>
  );
}

function ProfileActionButtons() {
  return (
    <div className="profile-actions">
      <button
        type="button"
        className="profile-primary-action"
        onClick={() => console.log("Find Friends clicked")}
      >
        <UserPlusIcon />
        Find Friends
      </button>
      <button
        type="button"
        className="profile-action-icon"
        aria-label="Edit profile"
        onClick={() => console.log("Edit Profile clicked")}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        className="profile-action-icon"
        aria-label="Share profile"
        onClick={() => console.log("Share Profile clicked")}
      >
        <ShareIcon />
      </button>
    </div>
  );
}

function ProfileTabs({
  activeTab,
  onSelect,
}: {
  activeTab: ProfileTab;
  onSelect: (tab: ProfileTab) => void;
}) {
  return (
    <nav className="profile-tabs" aria-label="Profile sections">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`profile-tab${activeTab === tab ? " active" : ""}`}
          aria-pressed={activeTab === tab}
          onClick={() => onSelect(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}

function OverviewTab() {
  return (
    <div className="profile-tab-stack">
      <section className="profile-invite-card">
        <div>
          <p className="profile-card-label">Bonus XP</p>
          <h2>Invite friends and learn together</h2>
          <p>Get bonus XP when your friends complete their first lesson.</p>
        </div>
        <button
          type="button"
          className="profile-small-action"
          onClick={() => console.log("Invite Friend clicked")}
        >
          Invite Friend
        </button>
      </section>

      <section className="profile-leaderboard-card">
        <div>
          <p className="profile-card-label">Leaderboard</p>
          <h2>My Rank</h2>
          <p>Position {student.rank}</p>
          <span>{student.form} · {student.stream}</span>
        </div>
        <button
          type="button"
          className="profile-floating-action"
          aria-label="Open leaderboard"
          onClick={() => console.log("Leaderboard clicked")}
        >
          <PlusIcon />
        </button>
      </section>

      <section className="profile-summary-card">
        <p className="profile-card-label">Learning Summary</p>
        <div className="profile-summary-grid">
          <ProfileStatCard label="Current level" value={`Level ${student.level}`} />
          <ProfileStatCard label="Progress" value={`${student.progress}%`} />
          <ProfileStatCard label="Weak topic" value={student.weakTopic} />
          <ProfileStatCard label="Strong topic" value={student.strongTopic} />
        </div>
      </section>
    </div>
  );
}

function StatisticsTab() {
  return (
    <div className="profile-tab-stack">
      <div className="profile-stat-grid">
        <section className="profile-metric-card">
          <p className="profile-card-label">Level {student.level}</p>
          <h2>Beginner</h2>
          <span>0 XP needed to next stage</span>
          <div className="profile-progress-track" aria-hidden="true">
            <div style={{ width: `${student.progress}%` }} />
          </div>
        </section>
        <section className="profile-metric-card">
          <p className="profile-card-label">Learning points</p>
          <h2>{student.xp} XP</h2>
          <span>Earned from lessons and quizzes</span>
        </section>
      </div>

      <section className="profile-growth-card">
        <p className="profile-card-label">Current Growth</p>
        <h2>Learning Streak</h2>
        <strong>{student.streak} days</strong>
        <p>Keep going to grow your streak!</p>
      </section>

      <section className="profile-info-card">
        <p className="profile-card-label">Topic Performance</p>
        <div className="profile-performance-list">
          <ProfileStatCard label="Strongest topic" value={student.strongTopic} />
          <ProfileStatCard label="Topic to improve" value={student.weakTopic} />
          <ProfileStatCard
            label="Completed lessons"
            value={`${student.completedLessons} / ${student.totalLessons}`}
          />
        </div>
      </section>
    </div>
  );
}

function BadgesTab() {
  const badgeList = [
    ...student.badges.map((badge) => ({ label: badge, locked: false })),
    { label: "Locked Badge", locked: true },
    { label: "Locked Badge", locked: true },
  ];

  return (
    <div className="profile-badge-grid">
      {badgeList.map((badge, index) => (
        <BadgeCard key={`${badge.label}-${index}`} {...badge} />
      ))}
    </div>
  );
}

function ProfileStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function BadgeCard({ label, locked }: { label: string; locked: boolean }) {
  return (
    <article className={`profile-badge-card${locked ? " locked" : ""}`}>
      <div className="profile-badge-medal" aria-hidden="true">
        {locked ? <LockIcon /> : <GiftIcon />}
      </div>
      <h2>{label}</h2>
      <p>{locked ? "Keep learning to unlock" : "Unlocked"}</p>
    </article>
  );
}

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function ArrowLeftIcon() {
  return <IconBase><path d="M15 18 9 12l6-6M10 12h10" /></IconBase>;
}

function GiftIcon() {
  return <IconBase><path d="M20 12v8H4v-8M3 8h18v4H3V8ZM12 8v12M12 8H8.5a2 2 0 1 1 2-2c0 1.2.7 2 1.5 2ZM12 8h3.5a2 2 0 1 0-2-2c0 1.2-.7 2-1.5 2Z" /></IconBase>;
}

function SearchIcon() {
  return <IconBase><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4" /></IconBase>;
}

function BellIcon() {
  return <IconBase><path d="M18 10.5a6 6 0 0 0-12 0v2.8L4.8 16h14.4L18 13.3v-2.8ZM10 18a2 2 0 0 0 4 0" /></IconBase>;
}

function SettingsIcon() {
  return <IconBase><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 12a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" /></IconBase>;
}

function UserPlusIcon() {
  return <IconBase><path d="M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3.5 20c.7-3.6 3-6 6.5-6 2 0 3.7.8 4.8 2.2M18 9v6M15 12h6" /></IconBase>;
}

function PencilIcon() {
  return <IconBase><path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM13.8 7.2l3 3" /></IconBase>;
}

function ShareIcon() {
  return <IconBase><path d="M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.7 16.3l6.6-3.6M8.7 7.7l6.6 3.6" /></IconBase>;
}

function PlusIcon() {
  return <IconBase><path d="M12 5v14M5 12h14" /></IconBase>;
}

function LockIcon() {
  return <IconBase><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Z" /></IconBase>;
}

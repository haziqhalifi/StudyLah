"use client";

import { useState } from "react";
import type { ReactNode } from "react";

const student = {
  name: "Amir",
  form: "Form 4",
  progress: 10,
  level: 1,
  xp: 180,
};

const categories = [
  { label: "Lessons", icon: BookIcon },
  { label: "Games", icon: GameIcon },
  { label: "Stories", icon: StoryIcon },
  { label: "Activities", icon: ActivityIcon },
  { label: "Discover", icon: CompassIcon },
];

const cards = [
  {
    title: "Lessons",
    description: "Fun learning lessons that help you grow smarter daily.",
    tone: "lesson",
  },
  {
    title: "Games",
    description:
      "Practice your skills through quick challenges and interactive quizzes.",
    tone: "game",
  },
  {
    title: "Learning Path",
    description:
      "Follow your AI-recommended journey from lesson to practice and mastery.",
    tone: "path",
  },
] as const;

export default function Home() {
  return <HomeDashboard />;
}

function HomeDashboard() {
  const [activeCategory, setActiveCategory] = useState("Lessons");

  return (
    <section
      className="home-dashboard-shell page-enter"
      aria-label="Student home dashboard"
    >
      <StudentHeader />
      <LevelProgressCard />
      <CategoryShortcut
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <div className="home-learning-stack" aria-label="Learning sections">
        {cards.map((card) => (
          <LearningFeatureCard key={card.title} {...card} />
        ))}
      </div>

      <AIAssistantCard />
    </section>
  );
}

function StudentHeader() {
  return (
    <header className="student-header">
      <div className="student-header-copy">
        <h1>Hello, {student.name}</h1>
        <div className="student-meta-row">
          <span>{student.form}</span>
          <span aria-hidden="true">•</span>
          <span>Progress {student.progress}%</span>
          <span aria-hidden="true">•</span>
          <span>{student.xp} XP</span>
        </div>
      </div>

      <div className="student-header-actions">
        <button
          className="notification-button"
          type="button"
          aria-label="Open notifications"
        >
          <BellIcon />
          <span
            className="notification-dot"
            aria-label="Unread notifications"
          />
        </button>
      </div>
    </header>
  );
}

function LevelProgressCard() {
  return (
    <section
      className="level-card"
      aria-label={`Level ${student.level} progress`}
    >
      <div className="level-card-content">
        <p className="level-eyebrow">Level {student.level}</p>
        <h2>This is your first step to greatness!</h2>
        <div className="level-progress-row">
          <div className="level-progress-track" aria-hidden="true">
            <div
              className="level-progress-fill"
              style={{ width: `${student.progress}%` }}
            >
              <span className="level-progress-dot" />
            </div>
          </div>
          <span>{student.progress}%</span>
        </div>
      </div>
      <div className="level-trophy" aria-hidden="true">
        <TrophyIcon />
      </div>
    </section>
  );
}

function CategoryShortcut({
  activeCategory,
  onSelect,
}: {
  activeCategory: string;
  onSelect: (category: string) => void;
}) {
  return (
    <nav className="category-shortcuts" aria-label="Learning categories">
      {categories.map(({ label, icon: Icon }) => {
        const active = label === activeCategory;
        return (
          <button
            type="button"
            key={label}
            className={`category-shortcut${active ? " active" : ""}`}
            aria-pressed={active}
            onClick={() => onSelect(label)}
          >
            <span className="category-icon">
              <Icon />
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function LearningFeatureCard({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: "lesson" | "game" | "path";
}) {
  return (
    <article className={`learning-feature-card learning-feature-${tone}`}>
      <div>
        <p className="learning-feature-kicker">
          {tone === "path" ? "Journey" : title}
        </p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button
        type="button"
        className="feature-arrow-button"
        aria-label={`Open ${title}`}
        onClick={() => (window.location.href = "/materials")}
      >
        <ArrowIcon />
      </button>
      <FeatureVisual tone={tone} />
    </article>
  );
}

function FeatureVisual({ tone }: { tone: "lesson" | "game" | "path" }) {
  if (tone === "path") {
    return (
      <div className="feature-visual path-visual" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className="feature-visual" aria-hidden="true">
      <div className="feature-blob feature-blob-large" />
      <div className="feature-blob feature-blob-small" />
      <div className="feature-mini-card">
        {tone === "lesson" ? <BookIcon /> : <GameIcon />}
      </div>
    </div>
  );
}

function AIAssistantCard() {
  return (
    <section
      className="ai-assistant-card"
      aria-label="AI learning assistant recommendation"
    >
      <div className="ai-assistant-avatar" aria-hidden="true">
        AI
      </div>
      <div>
        <h2>AI Learning Assistant</h2>
        <p>
          Start with Quadratic Functions Lesson. I selected this because your
          diagnostic shows this is one of your weak topics.
        </p>
      </div>
    </section>
  );
}

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function BookIcon() {
  return (
    <IconBase>
      <path d="M5 5.8c0-1 0.8-1.8 1.8-1.8H11v15H6.8A1.8 1.8 0 0 1 5 17.2V5.8Z" />
      <path d="M13 4h4.2c1 0 1.8.8 1.8 1.8v11.4c0 1-.8 1.8-1.8 1.8H13V4Z" />
    </IconBase>
  );
}

function GameIcon() {
  return (
    <IconBase>
      <path d="M8 10h8c2.2 0 4 1.8 4 4v1.5c0 1.4-1.1 2.5-2.5 2.5-.8 0-1.5-.4-2-1l-.9-1.2H9.4L8.5 17c-.5.6-1.2 1-2 1A2.5 2.5 0 0 1 4 15.5V14c0-2.2 1.8-4 4-4Z" />
      <path d="M8 13v2M7 14h2M16.5 13.3h.1M18 15h.1" />
    </IconBase>
  );
}

function StoryIcon() {
  return (
    <IconBase>
      <path d="M6 4h9l3 3v13H6V4Z" />
      <path d="M15 4v4h4M9 11h6M9 15h6" />
    </IconBase>
  );
}

function ActivityIcon() {
  return (
    <IconBase>
      <path d="M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 20c.4-3 2.2-5 5-5s4.6 2 5 5M12 20c.4-2.5 2-4 4.5-4 1.8 0 3.1.8 3.8 2.2" />
    </IconBase>
  );
}

function CompassIcon() {
  return (
    <IconBase>
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="m14.8 9.2-1.2 4.4-4.4 1.2 1.2-4.4 4.4-1.2Z" />
    </IconBase>
  );
}

function TrophyIcon() {
  return (
    <IconBase>
      <path d="M8 5h8v4.5a4 4 0 0 1-8 0V5Z" />
      <path d="M8 7H5.5A1.5 1.5 0 0 0 4 8.5C4 10.4 5.6 12 8 12M16 7h2.5A1.5 1.5 0 0 1 20 8.5c0 1.9-1.6 3.5-4 3.5M12 13.5V17M9 20h6M10 17h4" />
    </IconBase>
  );
}

function BellIcon() {
  return (
    <IconBase>
      <path d="M18 10.5a6 6 0 0 0-12 0v2.8L4.8 16h14.4L18 13.3v-2.8Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

function ArrowIcon() {
  return (
    <IconBase>
      <path d="M8 12h8M13 8l4 4-4 4" />
    </IconBase>
  );
}

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

const tabs = ["Ringkasan", "Statistik", "Lencana"] as const;
type ProfileTab = (typeof tabs)[number];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("Ringkasan");

  return (
    <section className="profile-page page-enter" aria-label="Profil pelajar">
      <ProfileTopBar />
      <ProfileHeader />
      <ProfileActionButtons />
      <ProfileTabs activeTab={activeTab} onSelect={setActiveTab} />

      <div className="profile-tab-panel">
        {activeTab === "Ringkasan" && <OverviewTab />}
        {activeTab === "Statistik" && <StatisticsTab />}
        {activeTab === "Lencana" && <BadgesTab />}
      </div>
    </section>
  );
}

function ProfileTopBar() {
  const router = useRouter();

  return (
    <header className="profile-topbar" aria-label="Tindakan profil">
      <button
        type="button"
        className="profile-icon-button"
        aria-label="Kembali"
        onClick={() => router.back()}
      >
        <ArrowLeftIcon />
      </button>

      <div className="profile-topbar-actions">
        <button type="button" className="profile-icon-button profile-reward-button" aria-label="Lihat ganjaran">
          <GiftIcon />
        </button>
        <button type="button" className="profile-icon-button" aria-label="Cari">
          <SearchIcon />
        </button>
        <button type="button" className="profile-icon-button" aria-label="Notifikasi">
          <BellIcon />
          <span className="profile-notification-dot" />
        </button>
        <button type="button" className="profile-icon-button" aria-label="Tetapan">
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}

function ProfileHeader() {
  return (
    <section className="profile-header-card" aria-label="Maklumat pelajar">
      <div className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">
          {student.name.charAt(0)}
        </div>
        <div>
          <p className="profile-kicker">Profil Pelajar</p>
          <h1>{student.name}</h1>
          <p className="profile-school-line">
            {student.stream} · {student.form}
          </p>
          <p className="profile-exam-line">Calon {student.targetExam}</p>
        </div>
      </div>

      <div className="profile-learning-stats" aria-label="Statistik kemajuan pembelajaran">
        <ProfileStatCard label="siap" value={String(student.completedLessons)} />
        <ProfileStatCard label="jumlah" value={String(student.totalLessons)} />
        <ProfileStatCard label="XP" value={String(student.xp)} />
      </div>
    </section>
  );
}

function ProfileActionButtons() {
  return (
    <div className="profile-actions">
      <button type="button" className="profile-primary-action" onClick={() => console.log("Cari Rakan diklik")}>
        <UserPlusIcon />
        Cari Rakan
      </button>
      <button
        type="button"
        className="profile-action-icon"
        aria-label="Edit profil"
        onClick={() => console.log("Edit Profil diklik")}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        className="profile-action-icon"
        aria-label="Kongsi profil"
        onClick={() => console.log("Kongsi Profil diklik")}
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
    <nav className="profile-tabs" aria-label="Bahagian profil">
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
          <h2>Jemput rakan dan belajar bersama</h2>
          <p>Dapatkan bonus XP apabila rakan anda menamatkan pelajaran pertama mereka.</p>
        </div>
        <button type="button" className="profile-small-action" onClick={() => console.log("Jemput Rakan diklik")}>
          Jemput Rakan
        </button>
      </section>

      <section className="profile-leaderboard-card">
        <div>
          <p className="profile-card-label">Papan Kedudukan</p>
          <h2>Kedudukan Saya</h2>
          <p>Kedudukan {student.rank}</p>
          <span>{student.form}</span>
        </div>
        <button type="button" className="profile-floating-action" aria-label="Buka papan kedudukan">
          <PlusIcon />
        </button>
      </section>

      <section className="profile-summary-card">
        <p className="profile-card-label">Ringkasan Pembelajaran</p>
        <div className="profile-summary-grid">
          <ProfileStatCard label="Tahap semasa" value={`Tahap ${student.level}`} />
          <ProfileStatCard label="Kemajuan" value={`${student.progress}%`} />
          <ProfileStatCard label="Topik lemah" value={student.weakTopic} />
          <ProfileStatCard label="Topik kuat" value={student.strongTopic} />
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
          <p className="profile-card-label">Kad Tahap</p>
          <h2>Tahap {student.level}</h2>
          <span>Permulaan · 0 XP diperlukan ke tahap seterusnya</span>
          <div className="profile-progress-track" aria-hidden="true">
            <div style={{ width: `${student.progress}%` }} />
          </div>
        </section>

        <section className="profile-metric-card">
          <p className="profile-card-label">Kad XP</p>
          <h2>{student.xp} XP</h2>
          <span>Mata pembelajaran</span>
        </section>
      </div>

      <section className="profile-growth-card">
        <p className="profile-card-label">Perkembangan Semasa</p>
        <h2>Rentetan Belajar</h2>
        <strong>{student.streak} hari</strong>
        <p>Teruskan usaha untuk panjangkan rentetan anda!</p>
      </section>

      <section className="profile-info-card">
        <p className="profile-card-label">Prestasi Topik</p>
        <div className="profile-performance-list">
          <ProfileStatCard label="Topik terkuat" value={student.strongTopic} />
          <ProfileStatCard label="Topik perlu dibaiki" value={student.weakTopic} />
          <ProfileStatCard label="Pelajaran selesai" value={`${student.completedLessons} / ${student.totalLessons}`} />
        </div>
      </section>
    </div>
  );
}

function BadgesTab() {
  const badgeList = [
    ...student.badges.map((badge) => ({ label: badge, locked: false })),
    { label: "Lencana Terkunci", locked: true },
    { label: "Lencana Terkunci", locked: true },
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
      <p>{locked ? "Terus belajar untuk buka kunci" : "Sudah dibuka"}</p>
    </article>
  );
}

function IconBase({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>;
}

function ArrowLeftIcon() {
  return (
    <IconBase>
      <path d="M15 18 9 12l6-6M10 12h10" />
    </IconBase>
  );
}

function GiftIcon() {
  return (
    <IconBase>
      <path d="M20 12v8H4v-8M3 8h18v4H3V8ZM12 8v12M12 8H8.5a2 2 0 1 1 2-2c0 1.2.7 2 1.5 2ZM12 8h3.5a2 2 0 1 0-2-2c0 1.2-.7 2-1.5 2Z" />
    </IconBase>
  );
}

function SearchIcon() {
  return (
    <IconBase>
      <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4" />
    </IconBase>
  );
}

function BellIcon() {
  return (
    <IconBase>
      <path d="M18 10.5a6 6 0 0 0-12 0v2.8L4.8 16h14.4L18 13.3v-2.8ZM10 18a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

function SettingsIcon() {
  return (
    <IconBase>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 12a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
    </IconBase>
  );
}

function UserPlusIcon() {
  return (
    <IconBase>
      <path d="M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3.5 20c.7-3.6 3-6 6.5-6 2 0 3.7.8 4.8 2.2M18 9v6M15 12h6" />
    </IconBase>
  );
}

function PencilIcon() {
  return (
    <IconBase>
      <path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM13.8 7.2l3 3" />
    </IconBase>
  );
}

function ShareIcon() {
  return (
    <IconBase>
      <path d="M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.7 16.3l6.6-3.6M8.7 7.7l6.6 3.6" />
    </IconBase>
  );
}

function PlusIcon() {
  return (
    <IconBase>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

function LockIcon() {
  return (
    <IconBase>
      <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Z" />
    </IconBase>
  );
}


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

// ── Thresholds for feature unlock ──────────────────────────────────────────
const LEADERBOARD_UNLOCK_QUESTIONS = 5;
const ANALYTICS_UNLOCK_QUESTIONS = 10;
const STREAK_SHOW_FROM_DAY = 2;

interface StudentData {
  name: string;
  form: string;
  stream: string;
  targetExam: string;
  level: number;
  xpProgress: number; // 0–100 (% to next level)
  xpToNextLevel: number;
  xp: number;
  questionsAnswered: number;
  topicsCompleted: number;
  weakTopic: string | null;
  strongTopic: string | null;
  streak: number;
  rank: number | null;
  totalRanked: number;
  badges: BadgeData[];
  lastSession: string | null; // ISO date string
}

interface BadgeData {
  id: string;
  label: string;
  desc: string;
  unlockAt: string;
  earned: boolean;
}

const ALL_BADGES: BadgeData[] = [
  { id: "first-q", label: "Soalan Pertama", desc: "Jawab soalan pertama anda", unlockAt: "Jawab 1 soalan", earned: false },
  { id: "streak-3", label: "3 Hari Berturut", desc: "Belajar 3 hari berturut-turut", unlockAt: "Capai rentetan 3 hari", earned: false },
  { id: "topic-1", label: "Topik Pertama", desc: "Siapkan 1 topik penuh", unlockAt: "Siapkan 1 topik", earned: false },
  { id: "ten-q", label: "Pelajar Tekun", desc: "Jawab 10 soalan", unlockAt: "Jawab 10 soalan", earned: false },
  { id: "streak-7", label: "Seminggu Penuh", desc: "Belajar 7 hari berturut-turut", unlockAt: "Capai rentetan 7 hari", earned: false },
  { id: "top10", label: "Top 10", desc: "Masuk 10 teratas papan kedudukan", unlockAt: "Capai kedudukan top 10", earned: false },
];

const DEFAULT_STUDENT: StudentData = {
  name: "Pelajar",
  form: "Tingkatan 5",
  stream: "Aliran Sains",
  targetExam: "SPM 2026",
  level: 1,
  xpProgress: 0,
  xpToNextLevel: 100,
  xp: 0,
  questionsAnswered: 0,
  topicsCompleted: 0,
  weakTopic: null,
  strongTopic: null,
  streak: 0,
  rank: null,
  totalRanked: 0,
  badges: ALL_BADGES,
  lastSession: null,
};

const tabs = ["Ringkasan", "Statistik", "Lencana"] as const;
type ProfileTab = (typeof tabs)[number];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("Ringkasan");
  const [student, setStudent] = useState<StudentData>(DEFAULT_STUDENT);

  useEffect(() => {
    try {
      const storedName = sessionStorage.getItem("userName");
      const storedXp = sessionStorage.getItem("userXp");
      const storedAnswered = sessionStorage.getItem("questionsAnswered");
      const storedTopics = sessionStorage.getItem("topicsCompleted");
      const storedStreak = sessionStorage.getItem("streak");

      setStudent((prev) => ({
        ...prev,
        name: storedName ?? prev.name,
        xp: storedXp ? Number(storedXp) : prev.xp,
        questionsAnswered: storedAnswered ? Number(storedAnswered) : prev.questionsAnswered,
        topicsCompleted: storedTopics ? Number(storedTopics) : prev.topicsCompleted,
        streak: storedStreak ? Number(storedStreak) : prev.streak,
      }));
    } catch {
      // ignore storage errors
    }
  }, []);

  const isNewUser = student.questionsAnswered === 0;
  const canSeeLeaderboard = student.questionsAnswered >= LEADERBOARD_UNLOCK_QUESTIONS;
  const canSeeAnalytics = student.questionsAnswered >= ANALYTICS_UNLOCK_QUESTIONS;

  return (
    <section className="profile-page page-enter" aria-label="Profil pelajar">
      <ProfileTopBar />
      <ProfileHeader student={student} />
      <ProfileActionButtons isNewUser={isNewUser} />
      <ProfileTabs activeTab={activeTab} onSelect={setActiveTab} />

      <div className="profile-tab-panel">
        {activeTab === "Ringkasan" && (
          <OverviewTab
            student={student}
            isNewUser={isNewUser}
            canSeeLeaderboard={canSeeLeaderboard}
            canSeeAnalytics={canSeeAnalytics}
          />
        )}
        {activeTab === "Statistik" && (
          <StatisticsTab student={student} canSeeAnalytics={canSeeAnalytics} />
        )}
        {activeTab === "Lencana" && <BadgesTab badges={student.badges} />}
      </div>
    </section>
  );
}

// ── Top bar ─────────────────────────────────────────────────────────────────

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

// ── Profile header ───────────────────────────────────────────────────────────

function ProfileHeader({ student }: { student: StudentData }) {
  const levelLabel = `Tahap ${student.level}`;
  const xpLabel = `${student.xp} XP`;

  return (
    <section className="profile-header-card" aria-label="Maklumat pelajar">
      <div className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">
          {student.name.charAt(0).toUpperCase()}
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

      {/* Redesigned stats row — clear, meaningful labels */}
      <div className="profile-learning-stats" aria-label="Statistik kemajuan pembelajaran">
        <ProfileStatPill
          value={String(student.questionsAnswered)}
          label="Soalan Dijawab"
          accent={student.questionsAnswered > 0}
        />
        <ProfileStatPill
          value={String(student.topicsCompleted)}
          label="Topik Selesai"
          accent={student.topicsCompleted > 0}
        />
        <ProfileStatPill
          value={xpLabel}
          label={levelLabel}
          accent={student.xp > 0}
          highlight
        />
      </div>
    </section>
  );
}

function ProfileStatPill({
  value,
  label,
  accent = false,
  highlight = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`profile-stat-card${highlight ? " profile-stat-card--xp" : ""}${accent || highlight ? " profile-stat-card--accent" : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

// ── Action buttons ───────────────────────────────────────────────────────────

function ProfileActionButtons({ isNewUser }: { isNewUser: boolean }) {
  const router = useRouter();

  return (
    <div className="profile-actions">
      {isNewUser ? (
        <button
          type="button"
          className="profile-primary-action"
          onClick={() => router.push("/learn")}
        >
          <ZapIcon />
          Mulakan Latihan Pertama
        </button>
      ) : (
        <button
          type="button"
          className="profile-primary-action"
          onClick={() => router.push("/learn")}
        >
          <ZapIcon />
          Sambung Belajar
        </button>
      )}
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

// ── Tabs ─────────────────────────────────────────────────────────────────────

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

// ── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  student,
  isNewUser,
  canSeeLeaderboard,
  canSeeAnalytics,
}: {
  student: StudentData;
  isNewUser: boolean;
  canSeeLeaderboard: boolean;
  canSeeAnalytics: boolean;
}) {
  const router = useRouter();

  return (
    <div className="profile-tab-stack">
      {/* ── Continue / Start card ── */}
      {isNewUser ? (
        <section className="profile-start-card">
          <div className="profile-start-card-icon" aria-hidden="true">🚀</div>
          <div className="profile-start-card-body">
            <p className="profile-card-label">Mula Sekarang</p>
            <h2>Selamat datang ke StudyLah!</h2>
            <p>Jawab soalan pertama anda dan mula bina momentum untuk SPM.</p>
          </div>
          <button
            type="button"
            className="profile-cta-btn"
            onClick={() => router.push("/learn")}
          >
            Mula →
          </button>
        </section>
      ) : (
        <section className="profile-continue-card">
          <div className="profile-continue-left">
            <p className="profile-card-label">Teruskan</p>
            <h2>Sambung Sesi Terdahulu</h2>
            <p>{student.questionsAnswered} soalan dijawab setakat ini</p>
          </div>
          <button
            type="button"
            className="profile-cta-btn profile-cta-btn--outline"
            onClick={() => router.push("/learn")}
          >
            Sambung →
          </button>
        </section>
      )}

      {/* ── Leaderboard ── */}
      <section className="profile-leaderboard-card">
        <div>
          <p className="profile-card-label">Papan Kedudukan</p>
          <h2>Kedudukan Saya</h2>
          {canSeeLeaderboard ? (
            <>
              <p className="profile-rank-value">
                {student.rank != null ? `#${student.rank}` : "Belum diranking"}
              </p>
              <span>{student.form} · Minggu ini</span>
            </>
          ) : (
            <>
              <p className="profile-rank-locked">🔒 Belum dibuka</p>
              <span className="profile-rank-hint">
                Jawab lagi {LEADERBOARD_UNLOCK_QUESTIONS - student.questionsAnswered} soalan untuk masuk papan kedudukan
              </span>
            </>
          )}
        </div>
        <div className="profile-leaderboard-visual" aria-hidden="true">
          {canSeeLeaderboard ? <TrophyIcon /> : <LockIcon />}
        </div>
      </section>

      {/* ── Learning summary ── */}
      <section className="profile-summary-card">
        <p className="profile-card-label">Analisis Pembelajaran</p>
        {canSeeAnalytics ? (
          <div className="profile-summary-grid">
            <ProfileStatPill label="Tahap Semasa" value={`Tahap ${student.level}`} />
            <ProfileStatPill label="Jumlah XP" value={`${student.xp} XP`} accent />
            <ProfileStatPill
              label="Topik Paling Lemah"
              value={student.weakTopic ?? "—"}
            />
            <ProfileStatPill
              label="Topik Paling Kuat"
              value={student.strongTopic ?? "—"}
            />
          </div>
        ) : (
          <div className="profile-analytics-gate">
            <p className="profile-analytics-gate-icon" aria-hidden="true">📊</p>
            <p className="profile-analytics-gate-title">Analisis belum tersedia</p>
            <p className="profile-analytics-gate-sub">
              Jawab {ANALYTICS_UNLOCK_QUESTIONS - student.questionsAnswered} lagi soalan untuk buka analisis topik kuat &amp; lemah anda.
            </p>
            <div className="profile-gate-track">
              <div
                className="profile-gate-fill"
                style={{ "--pct": `${Math.min(100, (student.questionsAnswered / ANALYTICS_UNLOCK_QUESTIONS) * 100)}%` } as React.CSSProperties}
              />
            </div>
            <p className="profile-gate-count">
              {student.questionsAnswered} / {ANALYTICS_UNLOCK_QUESTIONS} soalan
            </p>
          </div>
        )}
      </section>

      {/* ── Referral — placed AFTER progress, not at top ── */}
      <section className="profile-invite-card">
        <div>
          <p className="profile-card-label">Bonus XP</p>
          <h2>Jemput rakan, belajar bersama</h2>
          <p>Dapat +50 XP apabila rakan anda siapkan pelajaran pertama mereka.</p>
        </div>
        <button
          type="button"
          className="profile-small-action"
          onClick={() => console.log("Jemput Rakan diklik")}
        >
          Jemput
        </button>
      </section>
    </div>
  );
}

// ── Statistics tab ───────────────────────────────────────────────────────────

function StatisticsTab({
  student,
  canSeeAnalytics,
}: {
  student: StudentData;
  canSeeAnalytics: boolean;
}) {
  const showStreak = student.streak >= STREAK_SHOW_FROM_DAY;

  return (
    <div className="profile-tab-stack">
      {/* Level + XP grid */}
      <div className="profile-stat-grid">
        <section className="profile-metric-card">
          <p className="profile-card-label">Tahap</p>
          <h2>Tahap {student.level}</h2>
          <span>
            {student.xpProgress} / {student.xpToNextLevel} XP ke Tahap {student.level + 1}
          </span>
          <div className="profile-progress-track" aria-label={`${student.xpProgress} daripada ${student.xpToNextLevel} XP`}>
            <div style={{ "--pct": `${(student.xpProgress / Math.max(1, student.xpToNextLevel)) * 100}%` } as React.CSSProperties} />
          </div>
        </section>

        <section className="profile-metric-card">
          <p className="profile-card-label">Mata XP</p>
          <h2>{student.xp} XP</h2>
          <span>Dikumpulkan sejak mula</span>
          {student.xp === 0 && (
            <p className="profile-metric-hint">Jawab soalan untuk mulakan kiraan XP</p>
          )}
        </section>
      </div>

      {/* Activity summary */}
      <section className="profile-info-card">
        <p className="profile-card-label">Aktiviti Pembelajaran</p>
        <div className="profile-performance-list">
          <ProfileStatRow
            label="Soalan dijawab"
            value={`${student.questionsAnswered} soalan`}
            empty={student.questionsAnswered === 0}
            emptyHint="Belum ada soalan dijawab"
          />
          <ProfileStatRow
            label="Topik diselesaikan"
            value={`${student.topicsCompleted} topik`}
            empty={student.topicsCompleted === 0}
            emptyHint="Siapkan 1 topik untuk mula kira"
          />
        </div>
      </section>

      {/* Streak */}
      {showStreak ? (
        <section className="profile-growth-card">
          <p className="profile-card-label">Rentetan Belajar</p>
          <h2>Belajar Setiap Hari</h2>
          <strong>{student.streak} hari 🔥</strong>
          <p>Teruskan usaha — jangan putus rentetannya!</p>
        </section>
      ) : (
        <section className="profile-growth-card profile-growth-card--muted">
          <p className="profile-card-label">Rentetan Belajar</p>
          <h2>Mulakan Hari Ini!</h2>
          <strong>0 hari</strong>
          <p>Belajar setiap hari untuk bina rentetan dan dapatkan bonus XP.</p>
        </section>
      )}

      {/* Topic performance — gated */}
      <section className="profile-info-card">
        <p className="profile-card-label">Prestasi Topik</p>
        {canSeeAnalytics ? (
          <div className="profile-performance-list">
            <ProfileStatRow
              label="Topik paling kuat"
              value={student.strongTopic ?? "—"}
              empty={!student.strongTopic}
              emptyHint="Belum cukup data"
            />
            <ProfileStatRow
              label="Topik perlu dibaiki"
              value={student.weakTopic ?? "—"}
              empty={!student.weakTopic}
              emptyHint="Belum cukup data"
            />
          </div>
        ) : (
          <div className="profile-analytics-gate profile-analytics-gate--compact">
            <p className="profile-analytics-gate-title">
              📊 Jawab {ANALYTICS_UNLOCK_QUESTIONS - student.questionsAnswered} lagi soalan untuk buka analisis ini
            </p>
            <div className="profile-gate-track profile-gate-track--spaced">
              <div
                className="profile-gate-fill"
                style={{ "--pct": `${Math.min(100, (student.questionsAnswered / ANALYTICS_UNLOCK_QUESTIONS) * 100)}%` } as React.CSSProperties}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileStatRow({
  label,
  value,
  empty,
  emptyHint,
}: {
  label: string;
  value: string;
  empty?: boolean;
  emptyHint?: string;
}) {
  return (
    <div className="profile-stat-row">
      <span className="profile-stat-row-label">{label}</span>
      {empty ? (
        <span className="profile-stat-row-hint">{emptyHint}</span>
      ) : (
        <strong className="profile-stat-row-value">{value}</strong>
      )}
    </div>
  );
}

// ── Badges tab ───────────────────────────────────────────────────────────────

function BadgesTab({ badges }: { badges: BadgeData[] }) {
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="profile-tab-stack">
      {earned.length === 0 && (
        <div className="profile-badge-empty">
          <p className="profile-badge-empty-icon" aria-hidden="true">🏅</p>
          <p className="profile-badge-empty-title">Belum ada lencana diraih</p>
          <p className="profile-badge-empty-sub">
            Siapkan cabaran di bawah untuk buka lencana pertama anda!
          </p>
        </div>
      )}

      {earned.length > 0 && (
        <>
          <p className="profile-badge-section-label">Diraih ({earned.length})</p>
          <div className="profile-badge-grid">
            {earned.map((b) => (
              <BadgeCard key={b.id} badge={b} />
            ))}
          </div>
        </>
      )}

      <p className="profile-badge-section-label">
        {earned.length === 0 ? "Cara buka lencana" : `Belum dibuka (${locked.length})`}
      </p>
      <div className="profile-badge-grid">
        {locked.map((b) => (
          <BadgeCard key={b.id} badge={b} />
        ))}
      </div>
    </div>
  );
}

function BadgeCard({ badge }: { badge: BadgeData }) {
  return (
    <article className={`profile-badge-card${badge.earned ? "" : " locked"}`}>
      <div className="profile-badge-medal" aria-hidden="true">
        {badge.earned ? <StarIcon /> : <LockIcon />}
      </div>
      <h2>{badge.label}</h2>
      <p>{badge.earned ? badge.desc : badge.unlockAt}</p>
    </article>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
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

function ZapIcon() {
  return (
    <IconBase>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
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

function TrophyIcon() {
  return (
    <IconBase>
      <path d="M7 3H5v6a7 7 0 0 0 14 0V3h-2M3 3h18M12 16v4M8 20h8" />
    </IconBase>
  );
}

function StarIcon() {
  return (
    <IconBase>
      <path d="M12 2l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.8 3 1.1-6.5L2.6 8.9l6.5-.9L12 2Z" />
    </IconBase>
  );
}

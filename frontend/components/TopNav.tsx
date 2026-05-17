"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TOPICS = [
  { id: "ubahan",   label: "Ubahan",   href: "/learn?topic=ubahan",   emoji: "∝" },
  { id: "matriks",  label: "Matriks",  href: "/learn?topic=matriks",  emoji: "⊞" },
  { id: "insurans", label: "Insurans", href: "/learn?topic=insurans",  emoji: "🛡" },
];

const PAPERS = [
  { id: "trial", label: "Kertas Percubaan", href: "/examination", emoji: "📄" },
];

const SHOW_ON: string[] = [];

function TopNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (!SHOW_ON.some((p) => pathname.startsWith(p))) return null;

  const isExams = pathname.startsWith("/examination");
  const activeTopic = searchParams.get("topic");

  return (
    <nav className="top-nav" aria-label="Topik & Kertas">
      <div className="top-nav-scroll">
        <span className="top-nav-group-label">Topik</span>
        {TOPICS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={`top-nav-chip${!isExams && activeTopic === t.id ? " top-nav-chip--active" : ""}`}
          >
            <span className="top-nav-chip-emoji" aria-hidden="true">{t.emoji}</span>
            {t.label}
          </Link>
        ))}
        <span className="top-nav-divider" aria-hidden="true" />
        <span className="top-nav-group-label">Kertas</span>
        {PAPERS.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className={`top-nav-chip${isExams ? " top-nav-chip--active" : ""}`}
          >
            <span className="top-nav-chip-emoji" aria-hidden="true">{p.emoji}</span>
            {p.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function TopNav() {
  return (
    <Suspense>
      <TopNavInner />
    </Suspense>
  );
}

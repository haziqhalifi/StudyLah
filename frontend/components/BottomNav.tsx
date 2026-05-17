"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/", icon: HomeIcon, label: "Utama" },
  { href: "/learning", icon: BookIcon, label: "Belajar" },
  { href: "/learn", icon: PencilIcon, label: "Latih" },
  { href: "/examination", icon: ExamIcon, label: "Peperiksaan" },
  { href: "/progress", icon: ProgressIcon, label: "Kemajuan" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const hiddenRoutes = ["/sign-in", "/sign-up", "/onboarding"];
  if (hiddenRoutes.includes(pathname)) return null;

  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`bottom-nav-item${active ? " active" : ""}`}
          >
            <span className="bottom-nav-icon">
              <Icon />
            </span>
            <span className="bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function HomeIcon() {
  return (
    <IconBase>
      <path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4v-8.5Z" />
    </IconBase>
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

function PencilIcon() {
  return (
    <IconBase>
      <path d="M4 20h4l9.5-9.5-4-4L4 16v4ZM16.5 5.5l2 2a1 1 0 0 1 0 1.4l-1.5 1.5-4-4 1.5-1.5a1 1 0 0 1 1.4 0l.6.6Z" />
    </IconBase>
  );
}

function ExamIcon() {
  return (
    <IconBase>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </IconBase>
  );
}

function ProgressIcon() {
  return (
    <IconBase>
      <path d="M5 19V9M12 19V5M19 19v-7" />
    </IconBase>
  );
}

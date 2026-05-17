"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/", icon: HomeIcon, label: "Utama" },
  { href: "/materials", icon: BookIcon, label: "Pelajaran" },
  { href: "/exams", icon: PathIcon, label: "Peperiksaan" },
  { href: "/progress", icon: ProgressIcon, label: "Kemajuan" },
  { href: "/profile", icon: ProfileIcon, label: "Profil" },
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

function PathIcon() {
  return (
    <IconBase>
      <path d="M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 5h4.5A3.5 3.5 0 0 1 16 8.5v0A3.5 3.5 0 0 1 12.5 12H11a3 3 0 0 0 0 6h5" />
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

function ProfileIcon() {
  return (
    <IconBase>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </IconBase>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/", icon: HomeIcon, label: "Home" },
  { href: "/learn", icon: BookIcon, label: "Lessons" },
  { href: "/diagnostic", icon: PathIcon, label: "Journey" },
  { href: "/assessment", icon: ProgressIcon, label: "Progress" },
  { href: "/review", icon: SettingsIcon, label: "Settings" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
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

function SettingsIcon() {
  return (
    <IconBase>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19 12a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
    </IconBase>
  );
}

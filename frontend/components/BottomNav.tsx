"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/", icon: HomeIcon, label: "Home" },
  { href: "/materials", icon: BookIcon, label: "Learning" },
  { href: "/diagnostic", icon: AddIcon, label: "Add" },
  { href: "/assessment", icon: SetIcon, label: "Set" },
  { href: "/profile", icon: ProfileIcon, label: "Profile" },
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

function AddIcon() {
  return (
    <IconBase>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

function SetIcon() {
  return (
    <IconBase>
      <path d="M5 7h14M7 12h10M9 17h6" />
    </IconBase>
  );
}

function ProfileIcon() {
  return (
    <IconBase>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20c.8-3.7 3.4-6 7.5-6s6.7 2.3 7.5 6" />
    </IconBase>
  );
}

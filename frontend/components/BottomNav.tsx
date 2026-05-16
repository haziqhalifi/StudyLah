"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",           icon: "⌂",  label: "Home"       },
  { href: "/diagnostic", icon: "◎",  label: "Diagnostic" },
  { href: "/learn",      icon: "✦",  label: "Learn"      },
  { href: "/assessment", icon: "▤",  label: "Progress"   },
  { href: "/review",     icon: "↺",  label: "Review"     },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`bottom-nav-item${active ? " active" : ""}`}
          >
            <span className="bottom-nav-icon">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

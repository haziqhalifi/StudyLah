"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/exam", icon: "📝", label: "Exam" },
  { href: "/learn", icon: "📚", label: "Learn" },
  { href: "/kemajuan", icon: "🏆", label: "Kemajuan" },
  { href: "/profile", icon: "👤", label: "Profile" },
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

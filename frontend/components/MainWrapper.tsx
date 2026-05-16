"use client";

import { usePathname } from "next/navigation";

const FULLSCREEN_PATHS = ["/diagnostic", "/learn", "/review"];

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullscreen = FULLSCREEN_PATHS.includes(pathname);

  return (
    <main className={`app-main${fullscreen ? " app-main--fullscreen" : ""}`}>
      {children}
    </main>
  );
}

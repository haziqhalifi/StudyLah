// components/SplashScreen.tsx
"use client";

import { useEffect } from "react";

export default function SplashScreen() {
  useEffect(() => {
    const splash = document.getElementById("splash-screen");
    if (!splash) return;

    splash.style.transition = "opacity 0.5s ease";
    splash.style.opacity = "0";
    splash.addEventListener("transitionend", () => splash.remove(), {
      once: true,
    });
  }, []);

  return null;
}

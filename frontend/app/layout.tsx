import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import BottomNav from "@/components/BottomNav";
import "./responsive-math.css";
import SplashScreen from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "StudyLah – AI-Powered Learning",
  description: "Adaptive learning engine for SPM students",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4F6FAE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/assets/mascot.webp"
          as="image"
          type="image/webp"
        />
      </head>
      <body>
        {/* 1. Add splash div — inline styles so it works before Tailwind loads */}
        <div
          id="splash-screen"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999, // higher than BottomNav's z-index
            background: "#edf2fa", // match your app's bg color
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* your logo/spinner here */}
          <img
            src="/assets/mascot.webp"
            alt="StudyLah Logo"
            width={200}
            height={200}
            loading="eager"
            decoding="sync"
            style={{ objectFit: "contain" }}
          />
        </div>

        <div className="app-shell">
          <main className="app-main">{children}</main>
        </div>

        <BottomNav />

        {/* 2. Add dismissal component — must be a client component */}
        <SplashScreen />
      </body>
    </html>
  );
}

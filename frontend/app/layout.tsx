import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyLah – AI-Powered Learning",
  description: "Adaptive learning engine for SPM students",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav
          style={{
            background: "#6c47ff",
            color: "white",
            padding: "0.75rem 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          <span style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
            StudyLah
          </span>
          <a href="/" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
            Home
          </a>
          <a href="/diagnostic" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
            Diagnostic
          </a>
          <a href="/learn" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
            Learn
          </a>
          <a href="/assessment" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
            Assessment
          </a>
          <a href="/review" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
            Review
          </a>
        </nav>
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>{children}</main>
      </body>
    </html>
  );
}

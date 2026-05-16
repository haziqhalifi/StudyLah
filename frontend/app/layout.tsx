import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyLah - AI-Powered Learning",
  description: "Adaptive learning engine for SPM students",
};

const links = [
  { href: "/", label: "Home" },
  { href: "/diagnostic", label: "Diagnostic" },
  { href: "/result", label: "Result" },
  { href: "/journey", label: "Journey" },
  { href: "/practice", label: "Practice" },
  { href: "/assessment", label: "Assessment" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="topNav">
          <span className="brandMark">StudyLah</span>
          <div className="navLinks">
            {links.map((link) => (
              <a href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </nav>
        <main className="appShell">{children}</main>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import BottomNav from "@/components/BottomNav";
import "./responsive-math.css";

export const metadata: Metadata = {
  title: "StudyLah – AI-Powered Learning",
  description: "Adaptive learning engine for SPM students",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#5B4CF5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <main className="app-main">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}

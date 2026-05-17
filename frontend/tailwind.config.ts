import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4F6FAE",
          dark:    "#3F5B92",
          light:   "#EDF2FA",
          muted:   "#C7D4E8",
        },
        secondary: "#7A8FB8",
        accent: "#2F9D8F",
        ink:   "#1F2937",
        muted: "#64748B",
        surface: "#F5F7FB",
        card:    "#FFFFFF",
        correct: "#2E8B57",
        wrong:   "#C65A5A",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.10)",
        brand: "0 4px 16px rgba(79,111,174,0.22)",
      },
      animation: {
        "fade-up": "fadeUp 0.3s ease both",
        "pulse-brand": "pulseBrand 2s ease-in-out infinite",
        "slide-in": "slideIn 0.25s ease both",
        "pop": "pop 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-6px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pop: {
          "0%":   { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)" },
        },
        pulseBrand: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Base neutrals
        surface: {
          DEFAULT: "#0f0f13",
          1: "#16161d",
          2: "#1c1c26",
          3: "#222230",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.06)",
          subtle: "rgba(255,255,255,0.03)",
        },
        // Module accent colours
        tasks: {
          DEFAULT: "#3b82f6",
          light: "#60a5fa",
          muted: "rgba(59,130,246,0.15)",
        },
        events: {
          DEFAULT: "#ec4899",
          light: "#f472b6",
          muted: "rgba(236,72,153,0.15)",
        },
        studies: {
          DEFAULT: "#a855f7",
          light: "#c084fc",
          muted: "rgba(168,85,247,0.15)",
        },
        workouts: {
          DEFAULT: "#f97316",
          light: "#fb923c",
          muted: "rgba(249,115,22,0.15)",
        },
        habits: {
          DEFAULT: "#22c55e",
          light: "#4ade80",
          muted: "rgba(34,197,94,0.15)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

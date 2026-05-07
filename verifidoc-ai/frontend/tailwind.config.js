/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void:    "#050508",
        surface: "#0d0d14",
        panel:   "#12121c",
        border:  "#1e1e30",
        accent:  "#00e5ff",
        warn:    "#ffb300",
        danger:  "#ff3b3b",
        safe:    "#00e676",
        muted:   "#4a4a6a",
        text:    "#e2e2f0",
        dim:     "#8888aa",
      },
      fontFamily: {
        mono:  ["'JetBrains Mono'", "monospace"],
        sans:  ["'Syne'", "sans-serif"],
        body:  ["'DM Sans'", "sans-serif"],
      },
      animation: {
        "pulse-slow":  "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "scan":        "scan 2s linear infinite",
        "glow":        "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        glow: {
          "0%":   { boxShadow: "0 0 5px #00e5ff44" },
          "100%": { boxShadow: "0 0 20px #00e5ff99, 0 0 40px #00e5ff33" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)",
        "scanline":
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.015) 2px, rgba(0,229,255,0.015) 4px)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
    },
  },
  plugins: [],
};

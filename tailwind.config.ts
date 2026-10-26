import type { Config } from "tailwindcss";

// Cores definidas como variáveis em globals.css (tema claro e escuro).
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        panel: v("panel"),
        panel2: v("panel2"),
        line: v("line"),
        ink: v("ink"),
        mute: v("mute"),
        side: v("side"),
        ok: v("ok"),
        warn: v("warn"),
        bad: v("bad"),
        info: v("info"),
        accent: v("accent"),
        brand: { navy: "#0B1E4F", blue: v("brand-blue"), cyan: v("brand-cyan"), green: v("brand-green") },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "system-ui", "sans-serif"],
        brand: ["var(--font-brand)", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 27 61 / 0.04), 0 1px 3px rgb(15 27 61 / 0.06)",
        lift: "0 10px 30px -12px rgb(15 27 61 / 0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;

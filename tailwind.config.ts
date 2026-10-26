import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b1020",
        panel: "#111830",
        panel2: "#16203d",
        line: "#24304f",
        ink: "#e6ebf5",
        mute: "#8b97b3",
        brand: { green: "#22c55e", blue: "#3b82f6", cyan: "#06b6d4" },
      },
      fontFamily: { sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;

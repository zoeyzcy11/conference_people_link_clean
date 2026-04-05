import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#162332",
        mist: "#f6f1e8",
        panel: "#fffaf3",
        line: "#ded4c4",
        accent: "#194057",
        accent2: "#4c7464"
      },
      fontFamily: {
        sans: ["Noto Sans SC", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Noto Sans SC", "sans-serif"]
      },
      boxShadow: {
        panel: "0 18px 48px rgba(20, 24, 30, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;

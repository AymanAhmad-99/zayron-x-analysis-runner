import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        "surface-soft": "#F7F7F5",
        ink: "#111111",
        muted: "#666666",
        "brand-orange": "#FF6B00",
        "brand-blue": "#00A8FF",
        "status-critical": "#D92D20",
        "status-success": "#22C55E",
        "border-subtle": "#EAEAEA",
        "workspace-base": "#050505",
        "workspace-surface": "#101214",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Fraunces", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "Geist Mono", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

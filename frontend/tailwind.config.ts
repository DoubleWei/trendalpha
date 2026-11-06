import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        // 多空語意色：只改 globals.css 的 --bull / --bear 即可整站切換（例如台灣慣用紅漲綠跌）
        bull: "hsl(var(--bull))",
        bear: "hsl(var(--bear))",
        neutral: "hsl(var(--neutral))",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      keyframes: {
        "alert-bull": {
          "0%,100%": { boxShadow: "0 0 0 1px hsl(var(--bull) / .35), 0 0 12px -2px hsl(var(--bull) / .25)" },
          "50%": { boxShadow: "0 0 0 1px hsl(var(--bull) / .9), 0 0 32px 0 hsl(var(--bull) / .45)" },
        },
        "alert-bear": {
          "0%,100%": { boxShadow: "0 0 0 1px hsl(var(--bear) / .35), 0 0 12px -2px hsl(var(--bear) / .25)" },
          "50%": { boxShadow: "0 0 0 1px hsl(var(--bear) / .9), 0 0 32px 0 hsl(var(--bear) / .45)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        "ping-slow": { "75%,100%": { transform: "scale(2.2)", opacity: "0" } },
      },
      animation: {
        "alert-bull": "alert-bull 1.6s ease-in-out infinite",
        "alert-bear": "alert-bear 1.6s ease-in-out infinite",
        "fade-up": "fade-up .6s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 2.2s linear infinite",
        "ping-slow": "ping-slow 2s cubic-bezier(0,0,.2,1) infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;

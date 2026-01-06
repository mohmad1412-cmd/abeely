/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        // Unified status colors
        complete: "var(--status-complete)",
        pending: "var(--status-pending)",
        active: "var(--status-active)",
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          accent: "var(--border-accent)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(30, 150, 140, 0.3)",
        "glow-lg": "0 0 40px rgba(30, 150, 140, 0.4)",
        "glow-accent": "0 0 20px rgba(21, 54, 89, 0.3)",
        premium: "0 10px 40px -10px rgba(30, 150, 140, 0.15)",
        card: "0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(30, 150, 140, 0.08)",
        "card-hover": "0 10px 30px -5px rgba(30, 150, 140, 0.15)",
        float: "0 20px 50px -15px rgba(30, 150, 140, 0.2)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-from-top-2": {
          "0%": { transform: "translateY(-0.5rem)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-bottom-2": {
          "0%": { transform: "translateY(0.5rem)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-right-2": {
          "0%": { transform: "translateX(0.5rem)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-from-left-2": {
          "0%": { transform: "translateX(-0.5rem)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "zoom-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)", opacity: "1" },
          "50%": { transform: "translateY(-25%)", opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "fade-up": "fade-up 0.4s ease-out",
        "slide-in-from-top-2": "slide-in-from-top-2 0.2s ease-out",
        "slide-in-from-bottom-2": "slide-in-from-bottom-2 0.2s ease-out",
        "slide-in-from-right-2": "slide-in-from-right-2 0.3s ease-out",
        "slide-in-from-left-2": "slide-in-from-left-2 0.2s ease-out",
        "zoom-in": "zoom-in 0.2s ease-out",
        shimmer: "shimmer 2s infinite linear",
        "pulse-soft": "pulse-soft 2s infinite",
        "bounce-soft": "bounce-soft 1s infinite",
        "spin-slow": "spin 3s linear infinite",
        float: "float 3s ease-in-out infinite",
        wiggle: "wiggle 0.5s ease-in-out",
        "bounce-dot": "bounce 1s infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand": "linear-gradient(135deg, #1E968C 0%, #153659 100%)",
        "gradient-brand-light": "linear-gradient(135deg, #2db5a9 0%, #1e4a73 100%)",
        shimmer:
          "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
      },
    },
  },
  plugins: [],
};

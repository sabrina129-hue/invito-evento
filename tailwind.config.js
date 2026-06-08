/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,css}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
      },
      fontFamily: {
        title: ["var(--font-title)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        input: "var(--radius-input)",
        button: "var(--radius-button)",
      },
      spacing: {
        section: "2rem",
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

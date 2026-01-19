/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,css}"],
  theme: {
    extend: {
      colors: {
        primary: "#883650",
        secondary: "#684855",
        background: "#FAFAFA",
        text: "#1F2937",
        muted: "#6B7280",
      },
      fontFamily: {
        title: ["Playfair Display", "serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "1.5rem",
      },
      spacing: {
        section: "2rem",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,css}"],
  theme: {
    extend: {
      colors: {
        primary: "#C08497",
        secondary: "#F5E6EC",
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

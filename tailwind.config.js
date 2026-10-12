/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#121214",
        surface: {
          DEFAULT: "#18181b",
          card: "#1e1e24",
          hover: "#27272f",
          border: "#2e2e38",
        },
        vibra: {
          50: "#faf5f6",
          100: "#f4ebed",
          200: "#ead9dd",
          300: "#d9bec4",
          400: "#bf9ba4",
          500: "#9c7882",
          600: "#86626c",
          700: "#6e4f57",
          800: "#5c4349",
          900: "#4f3c41",
          950: "#2d1f23",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

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
        background: "#EDEEE8",
        foreground: "#26282A",
        caliza: {
          5: "#EDEEE8",
          10: "#E2E3DB",
          20: "#CFD1C7",
          30: "#B6B9AD",
        },
        grafito: {
          55: "#676B63",
        },
        basalto: {
          90: "#26282A",
        },
        higo: {
          30: "#C9B2B7",
          60: "#8A6C74",
          70: "#71545B",
        },
        neblina: {
          30: "#C2D0D6",
          60: "#6F8894",
          70: "#566E7B",
        },
        oxido: {
          65: "#8F5346",
        },
        surface: {
          DEFAULT: "#EDEEE8",
          card: "#EDEEE8",
          hover: "#E2E3DB",
          border: "#CFD1C7",
        },
        vibra: {
          50: "#F7F3F4",
          100: "#EFE6E8",
          200: "#DFCDD2",
          300: "#C9B2B7",
          400: "#A68990",
          500: "#71545B",
          600: "#61474D",
          700: "#503A3F",
          800: "#423034",
          900: "#36272B",
          950: "#22181A",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      fontFamily: {
        display: ["var(--font-bricolage)", "system-ui", "-apple-system", "sans-serif"],
        sans: ["var(--font-poppins)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "neu-elevated": "-7px -7px 15px #FFFFFF, 7px 7px 16px rgba(150, 154, 140, 0.42)",
        "neu-rank1": "-11px -11px 20px #FFFFFF, 11px 11px 22px rgba(150, 154, 140, 0.48)",
        "neu-sunken": "inset -6px -6px 12px #FFFFFF, inset 6px 6px 13px rgba(150, 154, 140, 0.52)",
        "neu-sm": "-4px -4px 10px #FFFFFF, 4px 4px 11px rgba(150, 154, 140, 0.36)",
      },
      transitionTimingFunction: {
        vibra: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

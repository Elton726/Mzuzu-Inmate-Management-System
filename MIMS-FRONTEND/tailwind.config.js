/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
      extend: {
        colors: {
          malawiBlack: '#000000',
          malawiRed: '#D71920',
          malawiGold: '#FFD700',
          malawiGreen: '#00843D',
        },
      },
  },
  plugins: [],
}
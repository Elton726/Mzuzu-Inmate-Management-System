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
          app: {
            bg: 'rgb(var(--primary-bg) / <alpha-value>)',
            surface: 'rgb(var(--surface-bg) / <alpha-value>)',
            surfaceMuted: 'rgb(var(--surface-muted) / <alpha-value>)',
            border: 'rgb(var(--surface-border) / <alpha-value>)',
            accent: 'rgb(var(--primary-accent) / <alpha-value>)',
            accentHover: 'rgb(var(--primary-accent-hover) / <alpha-value>)',
            text: 'rgb(var(--text-main) / <alpha-value>)',
            muted: 'rgb(var(--text-secondary) / <alpha-value>)',
          },
        },
      },
  },
  plugins: [],
}

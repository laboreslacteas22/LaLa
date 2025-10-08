/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-darkgreen': '#3c4220',
        'brand-green': '#7a8a4a',
        'brand-lightgreen': '#a5b57a',
        'brand-cream': '#fdf8e1',
        'brand-bg': '#fefcf5',
      },
      keyframes: {
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.2s ease-out',
      }
    }
  },
  plugins: [],
}
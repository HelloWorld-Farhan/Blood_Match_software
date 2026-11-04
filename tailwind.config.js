/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: '#0E0E10',
        charcoal: '#2A2A2F',
        burgundy: '#6A040F',
        crimson: '#D00000',
        brand: {
          white: '#FFFFFF',
          cream: '#F5F1EF',
          crimson: '#D72638',
          wine: '#7A0C17',
          taupe: '#D9C7C2',
          dark: '#1A1D20',
          panel: '#FFFFFF',
          burgundy: '#7A0C17',
          red: '#D72638',
        },
        blood: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#D00000',
          600: '#D00000',
          700: '#B91C1C',
          800: '#6A040F',
          900: '#450A0A',
          950: '#0E0E10',
        },
        slate: {
          850: '#1e1e24',
          900: '#141418',
          950: '#0E0E10',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

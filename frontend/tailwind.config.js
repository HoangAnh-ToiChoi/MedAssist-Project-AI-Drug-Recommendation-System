/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // Mau sac thuong hieu MedAssist
      colors: {
        primary: {
          DEFAULT: '#00F0FF',
          50:  '#E8FDF9',
          100: '#C5F9EF',
          200: '#9EF5E3',
          300: '#77EED7',
          400: '#57E5CB',
          500: '#00F0FF',
          600: '#00D8E6',
          700: '#00B0CC',
          800: '#0088A3',
          900: '#00607A',
        },
        secondary: {
          DEFAULT: '#8A2BE2',
          50:  '#F5EAFE',
          100: '#E9C9FD',
          200: '#DCA5FB',
          300: '#CD80F9',
          400: '#BD5BF6',
          500: '#8A2BE2',
          600: '#7A24CB',
          700: '#671CA3',
          800: '#52147D',
          900: '#3D0A56',
        },
        dark: {
          bg: '#0B0B0C',
          card: 'rgba(23, 23, 26, 0.7)',
          border: 'rgba(255, 255, 255, 0.08)',
          muted: '#8e8e93',
        },
        neon: {
          blue: '#00F0FF',
          purple: '#8A2BE2',
          pink: '#FF007F',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

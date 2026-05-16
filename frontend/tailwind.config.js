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
          DEFAULT: '#1F4E79',
          50:  '#E8F0F9',
          100: '#C5D8EF',
          200: '#9EBFE3',
          300: '#77A5D7',
          400: '#5790CB',
          500: '#1F4E79',
          600: '#1A4267',
          700: '#153554',
          800: '#102842',
          900: '#0A1B2F',
        },
        secondary: {
          DEFAULT: '#2E75B6',
          50:  '#EAF2FB',
          100: '#C9DFF4',
          200: '#A5CAEC',
          300: '#80B5E4',
          400: '#5BA0DC',
          500: '#2E75B6',
          600: '#26629A',
          700: '#1E4E7D',
          800: '#163A61',
          900: '#0E2745',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

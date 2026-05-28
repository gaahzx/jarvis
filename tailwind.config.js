/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EBF2F8',
          100: '#D5E8F0',
          500: '#2E75B6',
          600: '#1F4E79',
          700: '#163657',
          900: '#0B1F36',
        },
      },
    },
  },
  plugins: [],
};

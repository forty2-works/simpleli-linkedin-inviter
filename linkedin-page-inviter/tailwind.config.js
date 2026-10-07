/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'linkedin-blue': 'var(--linkedin-blue)',
        'linkedin-dark-blue': 'var(--linkedin-dark-blue)',
        'linkedin-light-blue': 'var(--linkedin-light-blue)',
        'linkedin-gray': 'var(--linkedin-gray)',
        'linkedin-light-gray': 'var(--linkedin-light-gray)',
        'warning-orange': 'var(--warning-orange)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}; 
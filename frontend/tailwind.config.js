/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#060810',
        surface: '#0d1117',
        card: '#141923',
        border: '#1e2535',
        whoop: '#FF3B5C',
        'whoop-dim': 'rgba(255,59,92,0.15)',
        garmin: '#4FC3F7',
        'garmin-dim': 'rgba(79,195,247,0.15)',
        muted: '#6b7990',
      },
    },
  },
  plugins: [],
}

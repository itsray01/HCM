/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Original light palette ───────────────────────────────────────────
        cream:      '#F9F6F1',
        ink:        '#2D2417',
        terracotta: '#C8956C',
        surface:    '#FFFFFF',
        gold:       '#D4A843',
        maroon:     '#880E4F',
        fun:        '#0288D1',
        airbnb:     '#FF5252',

        // ── Extras for highlight system ──────────────────────────────────────
        amber: '#E8921A',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

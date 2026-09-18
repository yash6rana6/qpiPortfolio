/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Hero-only tokens — untouched, Hero.jsx depends on these exact values.
        obsidian: '#09090B',
        midnight: '#14141B',
        'vice-pink': '#FF2A85',
        'sunburst-cyan': '#00F0FF',
        'loader-yellow': '#FFCC00',

        // Summer palette — used everywhere except Hero.
        sand: '#FFF6E8',
        'sand-deep': '#FFE8C4',
        coral: '#FF6B5B',
        mango: '#FFB627',
        ocean: '#00B4D8',
        palm: '#1FAE8E',
        papaya: '#FF9F1C',
        ink: '#2B1B12'
      },
      fontFamily: {
        display: ['"Neue Montreal"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        body: ['Inter', '"Helvetica Neue"', 'Arial', 'sans-serif']
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      boxShadow: {
        'glow-vice': '0 0 30px rgba(255, 42, 133, 0.55)',
        'glow-cyan': '0 0 30px rgba(0, 240, 255, 0.45)',
        'glow-coral': '0 0 30px rgba(255, 107, 91, 0.5)',
        'glow-mango': '0 0 30px rgba(255, 182, 39, 0.5)',
        'glow-ocean': '0 0 30px rgba(0, 180, 216, 0.45)'
      }
    }
  },
  plugins: []
}

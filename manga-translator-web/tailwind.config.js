/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        manga: {
          bg: '#1a1a2e',
          panel: '#16213e',
          accent: '#e94560',
          text: '#eaeaea',
          muted: '#a0a0b0',
          surface: '#0f3460',
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.ts',
    './popup.html',
  ],
  prefix: 'mt-',
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
          success: '#4ade80',
          warning: '#fbbf24',
          error: '#f87171',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'slide-out': 'slideOut 0.3s ease-in forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'pulse-dot': 'pulseDot 1.4s infinite ease-in-out both',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
  important: '#manga-translator-root',
};

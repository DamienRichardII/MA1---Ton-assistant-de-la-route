/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ma1: {
          navy: '#0a1628',
          'navy-light': '#0f2035',
          'navy-mid': '#132d4a',
          teal: '#3a9db0',
          sky: '#7ec8e3',
          'sky-bright': '#a8dce8',
          ice: '#d0eaf2',
          node: '#5bb8d0',
          gold: '#e8b84d',
          green: '#2ed573',
          red: '#ff4757',
          purple: '#a55eea',
          orange: '#ffa502',
        },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['Nunito Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'ma1': '22px',
        'ma1-xl': '28px',
      },
      backdropBlur: {
        'ma1': '60px',
        'ma1-md': '40px',
        'ma1-sm': '24px',
      },
      animation: {
        'glow-drift': 'glowDrift 35s ease-in-out infinite alternate',
        'breathe': 'breathe 4s ease-in-out infinite',
        'msg-in': 'msgIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot': 'pulseDot 2.5s infinite',
      },
      keyframes: {
        glowDrift: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '100%': { transform: 'translate(40px,25px) scale(1.06)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        msgIn: {
          from: { opacity: '0', transform: 'translateY(14px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
    },
  },
  plugins: [],
};

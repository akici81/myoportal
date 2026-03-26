import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        // Rumeli Üniversitesi Kurumsal Renkleri
        primary: {
          DEFAULT: '#B71C1C',
          50: '#FFF5F5',
          100: '#FFEBEE',
          200: '#FFCDD2',
          300: '#EF9A9A',
          400: '#E57373',
          500: '#EF5350',
          600: '#E53935',
          700: '#D32F2F',
          800: '#C62828',
          900: '#B71C1C',
          950: '#7F1212',
        },
        // Nötr Palet (Beyaz Tema)
        surface: {
          DEFAULT: '#FFFFFF',
          50: '#F7F8FA',
          100: '#F1F3F7',
          200: '#E4E7EE',
          300: '#D1D5DE',
        },
      },
      backgroundColor: {
        'card': '#FFFFFF',
        'card-hover': '#FFFFFF',
      },
      borderColor: {
        DEFAULT: '#E4E7EE',
        'card': '#E4E7EE',
      },
      textColor: {
        DEFAULT: '#111827',
        'muted': '#6B7280',
        'faint': '#9CA3AF',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(20px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
    },
  },
  plugins: [],
}
export default config

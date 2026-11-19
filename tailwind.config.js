/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        accent: {
          DEFAULT: '#4f46e5',
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        neutral: {
          DEFAULT: '#64748b',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      maxWidth: {
        'page': '80rem',
      },
      borderRadius: {
        'control': '0.5rem',
        'card': '0.875rem',
        'panel': '1rem',
      },
      boxShadow: {
        'header': '0 1px 2px 0 rgb(15 23 42 / 0.06)',
        'card': '0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
        'card-hover': '0 10px 25px -5px rgb(15 23 42 / 0.1), 0 4px 10px -4px rgb(15 23 42 / 0.06)',
        'auth': '0 20px 40px -12px rgb(15 23 42 / 0.14), 0 4px 12px -2px rgb(15 23 42 / 0.06)',
        'modal': '0 24px 48px -12px rgb(15 23 42 / 0.22)',
      },
      width: {
        'a4': '21cm',
      },
      minHeight: {
        'a4': '29.7cm',
      },
      spacing: {
        'a4-p': '0.5cm', // A4 page margin
      },
      screens: {
        'print': {'raw': 'print'},
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@headlessui/tailwindcss')
  ],
}

/** @type {import('tailwindcss').Config} */
const cssVar = (name, fallback) => `rgb(var(${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:   'rgb(var(--color-primary-50) / <alpha-value>)',
          100:  'rgb(var(--color-primary-100) / <alpha-value>)',
          200:  'rgb(var(--color-primary-200) / <alpha-value>)',
          300:  'rgb(var(--color-primary-300) / <alpha-value>)',
          400:  'rgb(var(--color-primary-400) / <alpha-value>)',
          500:  'rgb(var(--color-primary-500) / <alpha-value>)',
          600:  'rgb(var(--color-primary-600) / <alpha-value>)',
          700:  'rgb(var(--color-primary-700) / <alpha-value>)',
          800:  'rgb(var(--color-primary-800) / <alpha-value>)',
          900:  'rgb(var(--color-primary-900) / <alpha-value>)',
        },
        // gray 色系改为低饱和偏暖色调（色相~30°，饱和度~10-20%）
        // 确保各种主题色下文字都清晰可读且视觉温馨
        gray: {
          50:  '#FAF8F5',  // 极浅暖白
          100: '#F5F0EA',  // 浅暖米
          200: '#EAE3D9',  // 暖米灰
          300: '#D4C9B8',  // 浅暖灰
          400: '#B0A493',  // 中浅暖灰
          500: '#8A7E6E',  // 中暖灰
          600: '#6B5F50',  // 中深暖灰
          700: '#524739',  // 深暖灰
          800: '#3D3328',  // 更深暖棕灰
          900: '#2A2219',  // 极深暖棕
        },
        english: { 50: '#f0fdf4', 500: '#22c55e', 600: '#16a34a' },
        education: { 50: '#fefce8', 500: '#eab308', 600: '#ca8a04' },
        politics: { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626' },
      },
    },
  },
  plugins: [],
};

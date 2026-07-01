/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          900: '#171717',
          750: '#1C1C1C',
          700: '#202020',
          600: '#2E2E2E',
          500: '#3E3E3E',
        },
        well: '#1C1C1C',
        accent: '#3ECF8E',
        'accent-hi': '#4ADE9C',
        loss: '#F1565B',
        muted: '#A0A0A0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '6px',
        panel: '8px',
      },
      keyframes: {
        rowIn: {
          '0%': { opacity: '0', transform: 'translateY(-7px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'row-in': 'rowIn 0.28s cubic-bezier(0.22,1,0.36,1)',
      },
    },
  },
  plugins: [],
}

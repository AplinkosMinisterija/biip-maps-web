/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  mode: 'jit',
  theme: {
    screens: {
      xs: '480px',
      ...defaultTheme.screens,
    },
    extend: {
      fontSize: {
        xxs: '.6875rem',
        xxxs: '.6rem',
      },
      // Public hunting data hub (/hunting/data): the tokens of the medziokle.biip.lt
      // WordPress site, so the embedded page matches the site around it.
      colors: {
        brand: {
          DEFAULT: '#004650',
          hover: '#00323a',
          50: '#e6eff0',
          100: 'rgba(0, 70, 80, 0.1)',
          secondary: '#006e82',
          tint: '#7fa2a7',
        },
        ink: { DEFAULT: '#121926', muted: '#4b5565' },
        line: { DEFAULT: '#cdd5df', soft: '#e3e8ef', strong: '#7c8a9c' },
        band: '#ecf1f2',
        page: '#f8fafc',
        coral: { DEFAULT: '#f89572', bg: '#fff2ee', ink: '#8a3b1f' },
      },
      fontFamily: {
        hub: ['"Noto Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        kpi: ['"Atkinson Hyperlegible"', '"Noto Sans"', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

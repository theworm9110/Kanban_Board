import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        board: {
          bg: '#0d1117',
          column: '#161b22',
          card: '#21262d',
          border: '#30363d',
        },
      },
    },
  },
  plugins: [],
};
export default config;

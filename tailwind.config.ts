import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'old-lace':     '#FDF5E6',
        'ballpark':     '#1B4D3E',
        'stitch-red':   '#B22222',
        'sandstone':    '#D2B48C',
        'ink':          '#2C2C2C',
        'muted':        '#6B7280',
        'playoff-gold': '#CFB53B',
        'playoff-dark': '#1A1A2E',
      },
      fontFamily: {
        headline: ['"Roboto Slab"', 'Georgia', '"Times New Roman"', 'serif'],
        stat:     ['"JetBrains Mono"', 'Consolas', '"Courier New"', 'monospace'],
        body:     ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
                   'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      spacing: {
        'gutter':    '1rem',
        'gutter-lg': '1.5rem',
        'gutter-xl': '2rem',
      },
      maxWidth: {
        'ledger': '1200px',
      },
      borderRadius: {
        'card':   '0.375rem',
        'button': '0.25rem',
      },
      boxShadow: {
        'ledger': '0 2px 8px rgba(0, 0, 0, 0.12)',
        'card':   '0 1px 4px rgba(0, 0, 0, 0.08)',
        'stamp':  '2px 2px 0px rgba(178, 34, 34, 0.3)',
      },
      borderWidth: {
        'spine': '4px',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('postseason', '[data-theme="postseason"] &');
    }),
  ],
};

export default config;

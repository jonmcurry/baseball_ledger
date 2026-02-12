import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        scoreboard: {
          DEFAULT: 'var(--color-scoreboard)',
          light: 'var(--color-scoreboard-light)',
          dark: 'var(--color-scoreboard-dark)',
          text: 'var(--color-scoreboard-text)',
        },
        cream: {
          DEFAULT: 'var(--color-cream)',
          dark: 'var(--color-cream-dark)',
        },
        parchment: 'var(--color-parchment)',
        stitch: {
          DEFAULT: 'var(--color-stitch)',
          light: 'var(--color-stitch-light)',
        },
        leather: {
          DEFAULT: 'var(--color-leather)',
          dark: 'var(--color-leather-dark)',
        },
        gold: {
          DEFAULT: 'var(--color-gold)',
          light: 'var(--color-gold-light)',
          dark: 'var(--color-gold-dark)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          light: 'var(--color-ink-light)',
        },
        wood: {
          DEFAULT: 'var(--color-wood)',
          light: 'var(--color-wood-light)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          light: 'var(--color-muted-light)',
        },
        grass: 'var(--color-grass)',
        dirt: 'var(--color-dirt)',
        chalk: 'var(--color-chalk)',
      },
      fontFamily: {
        headline: ['var(--font-headline)', 'serif'],
        display: ['var(--font-display)', 'serif'],
        stat: ['var(--font-stat)', 'monospace'],
        body: ['var(--font-body)', 'sans-serif'],
        scoreboard: ['var(--font-scoreboard)', 'sans-serif'],
      },
      backgroundImage: {
        'paper-texture': "var(--pattern-paper)",
        'wood-pattern': "var(--pattern-wood)",
        'stitch-pattern': "var(--pattern-stitch)",
      },
      boxShadow: {
        'card-depth': 'var(--shadow-card)',
        'ledger-bind': 'inset 5px 0 10px rgba(0,0,0,0.1)',
        'scoreboard': 'var(--shadow-scoreboard)',
      },
      spacing: {
        'gutter': 'var(--gutter)',
        'gutter-lg': 'var(--gutter-lg)',
        'gutter-xl': 'var(--gutter-xl)',
      },
      maxWidth: {
        'ledger': 'var(--max-width-ledger)',
      },
      borderRadius: {
        'card': 'var(--radius-card)',
        'button': 'var(--radius-sm)',
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

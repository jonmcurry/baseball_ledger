import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Heritage Editorial design tokens */
        surface: {
          base: 'var(--surface-base)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
          highlight: 'var(--surface-highlight)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          secondary: 'var(--accent-secondary)',
        },
        semantic: {
          success: 'var(--semantic-success)',
          danger: 'var(--semantic-danger)',
          warning: 'var(--semantic-warning)',
          info: 'var(--semantic-info)',
        },

        /* Legacy token aliases -- resolve existing class names */
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

        /* Legacy color aliases from original design */
        'ballpark': 'var(--accent-primary)',
        'old-lace': 'var(--surface-raised)',
        'sandstone': 'var(--border-default)',
        'stitch-red': 'var(--semantic-danger)',
      },
      fontFamily: {
        headline: ['var(--font-headline)', 'serif'],
        display: ['var(--font-display)', 'serif'],
        stat: ['var(--font-stat)', 'monospace'],
        body: ['var(--font-body)', 'serif'],
        scoreboard: ['var(--font-stat)', 'monospace'],
      },
      backgroundImage: {
        'paper-texture': 'var(--pattern-paper)',
        'wood-pattern': 'var(--pattern-wood)',
        'stitch-pattern': 'var(--pattern-stitch)',
      },
      boxShadow: {
        'card-depth': 'var(--shadow-card)',
        'ledger-bind': 'none',
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
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'editorial-in': 'editorial-fade-in 600ms ease-out forwards',
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

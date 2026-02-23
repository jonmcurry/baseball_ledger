/**
 * SplashPage -- "The Front Gate"
 *
 * Full-viewport broadsheet front page with dramatic masthead,
 * editorial rules, and newspaper-style dateline.
 */

import { Link } from 'react-router-dom';
import { usePageTitle } from '@hooks/usePageTitle';

function formatDateline(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return now.toLocaleDateString('en-US', options).toUpperCase();
}

export function SplashPage() {
  usePageTitle('Home');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base px-gutter-lg py-gutter-xl relative animate-editorial-in">
      {/* Dateline */}
      <p className="dateline mb-gutter">{formatDateline()}</p>

      {/* Double rule above masthead */}
      <hr className="rule-double w-full max-w-lg" style={{ marginTop: 0 }} />

      {/* Masthead logotype */}
      <h1 className="font-headline text-type-6 md:text-type-7 font-black tracking-tight leading-none text-[var(--text-primary)] text-center">
        Baseball Ledger
      </h1>

      {/* Decorative rule with crimson diamond */}
      <div className="flex items-center gap-4 mt-3" aria-hidden="true">
        <div className="h-px w-16 md:w-24 bg-[var(--border-default)]" />
        <div className="w-1.5 h-1.5 bg-[var(--accent-secondary)]" />
        <div className="h-px w-16 md:w-24 bg-[var(--border-default)]" />
      </div>

      {/* Subtitle as editorial deck */}
      <p className="deck mt-2 text-center max-w-md">
        The Continuing Record of America's Pastime
      </p>

      {/* Tagline */}
      <p className="byline mt-1">
        Tabletop Baseball Simulation -- Est. 2024
      </p>

      {/* Double rule below subtitle */}
      <hr className="rule-double w-full max-w-lg" />

      {/* CTAs */}
      <div className="flex gap-gutter-lg">
        <Link
          to="/leagues/new"
          className="btn-vintage btn-vintage-primary"
        >
          Create a League
        </Link>
        <Link
          to="/leagues/join"
          className="btn-vintage btn-vintage-gold"
        >
          Join a League
        </Link>
      </div>

      {/* Fine print */}
      <p className="mt-gutter-xl font-body text-type-0 text-[var(--text-tertiary)] text-center max-w-sm">
        Draft the greatest players from 1901 to 2025 and simulate
        full seasons of baseball history.
      </p>
    </div>
  );
}

export default SplashPage;

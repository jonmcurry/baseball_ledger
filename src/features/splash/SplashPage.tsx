/**
 * SplashPage
 *
 * Heritage Editorial landing page with dramatic serif typography
 * and generous whitespace.
 */

import { Link } from 'react-router-dom';
import { usePageTitle } from '@hooks/usePageTitle';

export function SplashPage() {
  usePageTitle('Home');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base p-gutter-xl">
      <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tight text-[var(--text-primary)]">
        Baseball Ledger
      </h1>

      {/* Thin decorative rule */}
      <div className="flex items-center gap-4 mt-4" aria-hidden="true">
        <div className="h-px w-16 bg-[var(--border-default)]" />
        <div className="w-1.5 h-1.5 bg-[var(--accent-secondary)]" />
        <div className="h-px w-16 bg-[var(--border-default)]" />
      </div>

      <p className="mt-4 font-body text-lg italic text-[var(--text-secondary)]">
        Tabletop Baseball Simulation
      </p>

      <div className="mt-gutter-xl flex gap-gutter-lg">
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
    </div>
  );
}

export default SplashPage;

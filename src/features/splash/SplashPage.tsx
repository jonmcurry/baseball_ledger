/**
 * SplashPage
 *
 * Landing page with "Create a League" and "Join a League" options.
 */

import { Link } from 'react-router-dom';
import { usePageTitle } from '@hooks/usePageTitle';

export function SplashPage() {
  usePageTitle('Home');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base p-gutter-xl">
      <h1 className="font-headline text-4xl font-bold text-ballpark">Baseball Ledger</h1>
      <p className="mt-gutter text-lg text-ink">APBA Baseball Simulation</p>
      <div className="mt-gutter-xl flex gap-gutter-lg">
        <Link
          to="/leagues/new"
          className="rounded-button bg-ballpark px-6 py-3 font-medium text-ink shadow-card hover:opacity-90"
        >
          Create a League
        </Link>
        <Link
          to="/leagues/join"
          className="rounded-button border-2 border-ballpark px-6 py-3 font-medium text-ballpark shadow-card hover:bg-ballpark/10"
        >
          Join a League
        </Link>
      </div>
    </div>
  );
}

export default SplashPage;

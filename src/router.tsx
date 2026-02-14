/**
 * Router
 *
 * Application routing with lazy-loaded feature pages.
 * SplashPage and LoginPage are eagerly loaded.
 * All /leagues/* routes are lazy-loaded with ErrorBoundary + Suspense + LoadingLedger.
 *
 * Per SRD 19.3: 13 routes covering all feature pages.
 */

import { createBrowserRouter, Navigate, Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { SplashPage } from '@features/splash/SplashPage';
import { LoginPage } from '@features/auth/LoginPage';
import { AuthGuard } from '@features/auth/AuthGuard';
import { AuthenticatedLayout } from '@features/auth/AuthenticatedLayout';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { ErrorBoundary } from '@components/feedback/ErrorBoundary';

// Lazy-loaded feature pages
const DashboardPage = lazy(() =>
  import('@features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const LeagueConfigPage = lazy(() =>
  import('@features/league/LeagueConfigPage').then((m) => ({ default: m.LeagueConfigPage })),
);
const JoinLeaguePage = lazy(() =>
  import('@features/league/JoinLeaguePage').then((m) => ({ default: m.JoinLeaguePage })),
);
const DraftBoardPage = lazy(() =>
  import('@features/draft/DraftBoardPage').then((m) => ({ default: m.DraftBoardPage })),
);
const RosterPage = lazy(() =>
  import('@features/roster/RosterPage').then((m) => ({ default: m.RosterPage })),
);
const StatsPage = lazy(() =>
  import('@features/stats/StatsPage').then((m) => ({ default: m.StatsPage })),
);
const StandingsPage = lazy(() =>
  import('@features/standings/StandingsPage').then((m) => ({ default: m.StandingsPage })),
);
const GameViewerPage = lazy(() =>
  import('@features/game-viewer/GameViewerPage').then((m) => ({ default: m.GameViewerPage })),
);
const PlayoffsPage = lazy(() =>
  import('@features/playoffs/PlayoffsPage').then((m) => ({ default: m.PlayoffsPage })),
);
const ArchivePage = lazy(() =>
  import('@features/archive/ArchivePage').then((m) => ({ default: m.ArchivePage })),
);
const TransactionsPage = lazy(() =>
  import('@features/transactions/TransactionsPage').then((m) => ({
    default: m.TransactionsPage,
  })),
);

/**
 * Per REQ-COMP-007 / REQ-ERR-010: each lazy-loaded route is wrapped
 * in both an ErrorBoundary (catches render errors + chunk-load failures)
 * and Suspense (shows LoadingLedger while lazy chunk loads).
 */
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingLedger />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base p-gutter-xl">
      <h1 className="font-headline text-4xl font-bold text-stitch-red">404</h1>
      <p className="mt-gutter text-lg text-ink">Page not found</p>
      <Link
        to="/"
        className="mt-gutter-lg rounded-button bg-ballpark px-6 py-2 font-medium text-old-lace hover:opacity-90"
      >
        Return Home
      </Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SplashPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/leagues',
    element: <AuthGuard />,
    children: [
      {
        path: 'join',
        element: (
          <LazyPage>
            <JoinLeaguePage />
          </LazyPage>
        ),
      },
      {
        path: 'new',
        element: (
          <LazyPage>
            <LeagueConfigPage />
          </LazyPage>
        ),
      },
      {
        path: ':leagueId',
        element: <AuthenticatedLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: (
              <LazyPage>
                <DashboardPage />
              </LazyPage>
            ),
          },
          {
            path: 'config',
            element: (
              <LazyPage>
                <LeagueConfigPage />
              </LazyPage>
            ),
          },
          {
            path: 'draft',
            element: (
              <LazyPage>
                <DraftBoardPage />
              </LazyPage>
            ),
          },
          {
            path: 'roster',
            element: (
              <LazyPage>
                <RosterPage />
              </LazyPage>
            ),
          },
          {
            path: 'stats',
            element: (
              <LazyPage>
                <StatsPage />
              </LazyPage>
            ),
          },
          {
            path: 'standings',
            element: (
              <LazyPage>
                <StandingsPage />
              </LazyPage>
            ),
          },
          {
            path: 'game/:gameId',
            element: (
              <LazyPage>
                <GameViewerPage />
              </LazyPage>
            ),
          },
          {
            path: 'playoffs',
            element: (
              <LazyPage>
                <PlayoffsPage />
              </LazyPage>
            ),
          },
          {
            path: 'archive',
            element: (
              <LazyPage>
                <ArchivePage />
              </LazyPage>
            ),
          },
          {
            path: 'transactions',
            element: (
              <LazyPage>
                <TransactionsPage />
              </LazyPage>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

/**
 * LeagueConfigPage
 *
 * League creation and configuration page.
 * Uses useAuth for the current user, and league-service for creation.
 * Shows animated progress indicator during the ~60s creation process.
 *
 * Layer 7: Feature page. Composes hooks + shared components.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LeagueConfigForm } from './LeagueConfigForm';
import { InviteKeyDisplay } from '@components/data-display/InviteKeyDisplay';
import type { LeagueFormData } from './LeagueConfigForm';
import * as leagueService from '@services/league-service';
import { usePageTitle } from '@hooks/usePageTitle';

/** Estimated creation stages with cumulative progress targets. */
const CREATION_STAGES = [
  { pct: 8, label: 'Generating teams...' },
  { pct: 20, label: 'Loading player database...' },
  { pct: 45, label: 'Building player cards...' },
  { pct: 70, label: 'Populating player pool...' },
  { pct: 90, label: 'Finalizing league setup...' },
  { pct: 95, label: 'Almost there...' },
] as const;

/** Total estimated creation time in ms. */
const ESTIMATED_DURATION_MS = 60_000;

function getStageLabel(pct: number): string {
  for (let i = CREATION_STAGES.length - 1; i >= 0; i--) {
    if (pct >= CREATION_STAGES[i].pct) return CREATION_STAGES[i].label;
  }
  return CREATION_STAGES[0].label;
}

export function LeagueConfigPage() {
  usePageTitle('League Setup');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInviteKey, setCreatedInviteKey] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(0);

  // Animated progress timer during creation
  useEffect(() => {
    if (!isSubmitting) {
      setProgress(0);
      return;
    }
    startTimeRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      // Asymptotic curve: rises quickly at first, slows toward 95%
      const t = Math.min(elapsed / ESTIMATED_DURATION_MS, 1);
      const pct = Math.min(Math.round(95 * (1 - Math.exp(-3 * t))), 95);
      setProgress(pct);
    };
    tick();
    const id = setInterval(tick, 400);
    return () => clearInterval(id);
  }, [isSubmitting]);

  async function handleSubmit(config: LeagueFormData) {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const league = await leagueService.createLeague({
        name: config.name,
        teamCount: config.teamCount,
        yearRangeStart: config.yearRangeStart,
        yearRangeEnd: config.yearRangeEnd,
        injuriesEnabled: config.injuriesEnabled,
      });
      setProgress(100);
      setCreatedInviteKey(league.inviteKey ?? null);
      // Brief pause at 100% so user sees completion
      await new Promise((r) => setTimeout(r, 400));
      navigate(`/leagues/${league.id}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create league');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Create a League</h2>

      {error && <ErrorBanner severity="error" message={error} />}

      {createdInviteKey && (
        <InviteKeyDisplay inviteKey={createdInviteKey} />
      )}

      {isSubmitting ? (
        <div className="space-y-6 py-8" role="status" aria-live="polite">
          {/* Status label */}
          <p className="text-center font-stat text-sm text-[var(--text-secondary)]">
            {getStageLabel(progress)}
          </p>

          {/* Progress bar */}
          <div className="mx-auto max-w-sm">
            <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-overlay)] shadow-inner">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

          {/* Percentage */}
          <p className="text-center font-scoreboard text-2xl text-[var(--accent-primary)]">
            {progress}%
          </p>

          {/* Decorative baseball stitching animation */}
          <div className="flex justify-center">
            <svg
              className="animate-spin-slow h-8 w-8 text-[var(--accent-primary)] opacity-40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 2.5C9.5 6 9.5 10 8 14s-1.5 6.5 0 9.5" />
              <path d="M16 2.5C14.5 6 14.5 10 16 14s1.5 6.5 0 9.5" />
            </svg>
          </div>
        </div>
      ) : (
        <LeagueConfigForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}

export default LeagueConfigPage;

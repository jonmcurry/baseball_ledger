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
import { DeleteLeagueButton } from './DeleteLeagueButton';
import { InviteKeyDisplay } from '@components/data-display/InviteKeyDisplay';
import type { LeagueFormData } from './LeagueConfigForm';
import * as leagueService from '@services/league-service';
import { useLeagueStore } from '@stores/leagueStore';
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
  const league = useLeagueStore((s) => s.league);
  const isExistingLeague = !!league;
  const isCommissioner = league?.commissionerId === user?.id;
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
      if (isExistingLeague) {
        // Update existing league settings
        const updated = await leagueService.updateLeague(league.id, {
          name: config.name,
          injuriesEnabled: config.injuriesEnabled,
          negroLeaguesEnabled: config.negroLeaguesEnabled,
        });
        useLeagueStore.getState().setActiveLeague(updated);
      } else {
        // Create new league
        const newLeague = await leagueService.createLeague({
          name: config.name,
          teamCount: config.teamCount,
          yearRangeStart: config.yearRangeStart,
          yearRangeEnd: config.yearRangeEnd,
          injuriesEnabled: config.injuriesEnabled,
          negroLeaguesEnabled: config.negroLeaguesEnabled,
        });
        setProgress(100);
        setCreatedInviteKey(newLeague.inviteKey ?? null);
        await new Promise((r) => setTimeout(r, 400));
        navigate(`/leagues/${newLeague.id}/dashboard`);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err && typeof err === 'object' && 'message' in err)
            ? String((err as { message: unknown }).message)
            : isExistingLeague ? 'Failed to update league' : 'Failed to create league';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="toolbar">
        <h2 className="toolbar-label">{isExistingLeague ? 'League Settings' : 'Create a League'}</h2>
      </div>

      {error && <ErrorBanner severity="error" message={error} />}

      {(createdInviteKey || (isExistingLeague && league.inviteKey)) && (
        <div className="mt-gutter">
          <InviteKeyDisplay inviteKey={(createdInviteKey ?? league!.inviteKey)!} />
        </div>
      )}

      {isSubmitting ? (
        <div className="space-y-6 py-8 mt-gutter" role="status" aria-live="polite">
          {/* Status label */}
          <p className="text-center font-stat text-sm text-[var(--text-secondary)]">
            {getStageLabel(progress)}
          </p>

          {/* Progress bar */}
          <div className="mx-auto max-w-sm">
            <div className="h-3 overflow-hidden bg-[var(--surface-overlay)] shadow-inner">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all duration-500 ease-out"
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
              className="animate-spin-slow h-12 w-12 opacity-50"
              viewBox="0 0 100 100"
              fill="none"
            >
              {/* Ball */}
              <circle cx="50" cy="50" r="46" fill="#f5f0e8" stroke="#c8b89a" strokeWidth="2" />
              {/* Left seam -- wide C-arc bowing far left */}
              <path d="M 36 8 Q 0 50 36 92" stroke="#c8372d" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Left stitches -- cross through seam perpendicular to curve */}
              <line x1="23" y1="18" x2="31" y2="24" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="29" x2="25" y2="35" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14" y1="40" x2="24" y2="44" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="13" y1="50" x2="23" y2="50" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14" y1="56" x2="24" y2="60" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="65" x2="25" y2="71" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="23" y1="76" x2="31" y2="82" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              {/* Right seam -- wide C-arc bowing far right */}
              <path d="M 64 8 Q 100 50 64 92" stroke="#c8372d" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Right stitches -- cross through seam perpendicular to curve */}
              <line x1="69" y1="24" x2="77" y2="18" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="75" y1="35" x2="83" y2="29" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="76" y1="44" x2="86" y2="40" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="77" y1="50" x2="87" y2="50" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="76" y1="60" x2="86" y2="56" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="75" y1="71" x2="83" y2="65" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="69" y1="82" x2="77" y2="76" stroke="#c8372d" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="mt-gutter">
          <LeagueConfigForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isEditing={isExistingLeague}
            initialValues={isExistingLeague ? {
              name: league.name,
              teamCount: league.teamCount,
              yearRangeStart: league.yearRangeStart,
              yearRangeEnd: league.yearRangeEnd,
              injuriesEnabled: league.injuriesEnabled,
              negroLeaguesEnabled: league.negroLeaguesEnabled,
            } : undefined}
          />
        </div>
      )}

      {/* Danger zone: delete league (REQ-LGE-010) -- commissioner only */}
      {isExistingLeague && isCommissioner && !isSubmitting && (
        <div className="mt-gutter-xl border-t border-stitch-red/30 pt-gutter-lg">
          <h3 className="font-headline text-lg font-bold text-stitch-red">Danger Zone</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Permanently delete this league and all associated data.
          </p>
          <div className="mt-gutter">
            <DeleteLeagueButton
              leagueId={league.id}
              leagueName={league.name}
              onDeleted={() => {
                useLeagueStore.getState().clearLeague();
                navigate('/leagues/new');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LeagueConfigPage;

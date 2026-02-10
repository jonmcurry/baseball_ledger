/**
 * LeagueConfigPage
 *
 * League creation and configuration page.
 * Uses useAuth for the current user, and league-service for creation.
 *
 * Layer 7: Feature page. Composes hooks + shared components.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LeagueConfigForm } from './LeagueConfigForm';
import { InviteKeyDisplay } from './InviteKeyDisplay';
import type { LeagueFormData } from './LeagueConfigForm';
import * as leagueService from '@services/league-service';

export function LeagueConfigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInviteKey, setCreatedInviteKey] = useState<string | null>(null);

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
      setCreatedInviteKey(league.inviteKey ?? null);
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

      <LeagueConfigForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}

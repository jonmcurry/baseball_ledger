/**
 * JoinLeaguePage
 *
 * Page for joining an existing league via invite code.
 *
 * Layer 7: Feature page. Composes hooks + shared components.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { Input } from '@components/forms/Input';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import * as leagueService from '@services/league-service';
import { usePageTitle } from '@hooks/usePageTitle';

export function JoinLeaguePage() {
  usePageTitle('Join League');
  const { user, isInitialized } = useAuth();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isInitialized) {
    return <LoadingLedger message="Loading..." />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await leagueService.joinLeague(inviteCode.trim());
      navigate(`/leagues/${result.leagueId}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid invite code');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Join a League</h2>
      <p className="text-sm text-muted">
        Enter the invite code provided by your league commissioner.
      </p>

      {error && <ErrorBanner severity="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-gutter-lg">
        <Input
          value={inviteCode}
          onChange={setInviteCode}
          name="inviteCode"
          label="Invite Code"
          placeholder="Enter invite code..."
        />

        <button
          type="submit"
          disabled={isSubmitting || !inviteCode.trim()}
          className="rounded-button bg-ballpark px-6 py-2 font-medium text-old-lace hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Joining...' : 'Join League'}
        </button>
      </form>
    </div>
  );
}

export default JoinLeaguePage;

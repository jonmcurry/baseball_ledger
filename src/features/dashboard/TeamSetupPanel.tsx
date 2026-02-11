/**
 * TeamSetupPanel
 *
 * Setup phase dashboard panel showing all teams organized by division,
 * with invite key, ownership badges, and "Start Draft" button.
 *
 * REQ-LGE-004: Display auto-generated team names.
 * REQ-LGE-005: Show AL/NL division assignments.
 * REQ-LGE-006: Ownership status (Commissioner / Player / CPU).
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { InviteKeyDisplay } from '@components/data-display/InviteKeyDisplay';
import type { TeamSummary } from '@lib/types/league';

export interface TeamSetupPanelProps {
  teams: TeamSummary[];
  isCommissioner: boolean;
  userId: string | null;
  onStartDraft: () => void;
  isStartingDraft: boolean;
  inviteKey: string;
}

function ownerBadge(team: TeamSummary, userId: string | null): string {
  if (!team.ownerId) return 'CPU';
  if (team.ownerId === userId) return 'You';
  return 'Player';
}

function badgeClass(badge: string): string {
  switch (badge) {
    case 'You':
      return 'bg-ballpark text-old-lace';
    case 'Player':
      return 'bg-sandstone text-ink';
    default:
      return 'bg-muted/20 text-muted';
  }
}

const DIVISIONS = ['East', 'South', 'West', 'North'] as const;

export function TeamSetupPanel({
  teams,
  isCommissioner,
  userId,
  onStartDraft,
  isStartingDraft,
  inviteKey,
}: TeamSetupPanelProps) {
  const alTeams = teams.filter((t) => t.leagueDivision === 'AL');
  const nlTeams = teams.filter((t) => t.leagueDivision === 'NL');

  function renderLeague(label: string, leagueTeams: TeamSummary[]) {
    return (
      <div>
        <h4 className="mb-2 font-headline text-sm font-bold text-ballpark">{label}</h4>
        <div className="space-y-3">
          {DIVISIONS.map((div) => {
            const divTeams = leagueTeams.filter((t) => t.division === div);
            if (divTeams.length === 0) return null;
            return (
              <div key={div}>
                <p className="mb-1 text-xs font-medium text-muted">{div}</p>
                <div className="space-y-1">
                  {divTeams.map((team) => {
                    const badge = ownerBadge(team, userId);
                    return (
                      <div
                        key={team.id}
                        className="flex items-center justify-between rounded-card border border-sandstone/60 bg-old-lace/50 px-3 py-2"
                      >
                        <span className="text-sm font-medium text-ink">
                          {team.city} {team.name}
                        </span>
                        <span
                          className={`rounded-button px-2 py-0.5 text-xs font-medium ${badgeClass(badge)}`}
                        >
                          {badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-gutter-lg">
      <InviteKeyDisplay inviteKey={inviteKey} />

      <div>
        <h3 className="mb-3 font-headline text-lg font-bold text-ballpark">Teams</h3>
        <div className="grid gap-gutter md:grid-cols-2">
          {renderLeague('American League', alTeams)}
          {renderLeague('National League', nlTeams)}
        </div>
      </div>

      {isCommissioner && (
        <div className="flex justify-center pt-gutter">
          <button
            type="button"
            onClick={onStartDraft}
            disabled={isStartingDraft}
            className="rounded-button bg-ballpark px-6 py-2.5 font-headline text-sm font-bold text-old-lace hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStartingDraft ? 'Starting Draft...' : 'Start Draft'}
          </button>
        </div>
      )}
    </div>
  );
}

export default TeamSetupPanel;

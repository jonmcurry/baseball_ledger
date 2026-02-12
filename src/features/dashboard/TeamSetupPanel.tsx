/**
 * TeamSetupPanel
 *
 * Vintage program-style team roster display during setup phase.
 * Golden era aesthetic with league/division organization.
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

function badgeStyles(badge: string): string {
  switch (badge) {
    case 'You':
      return 'bg-[var(--color-gold)] text-[var(--color-ink)]';
    case 'Player':
      return 'bg-[var(--color-ballpark)] text-[var(--color-cream)]';
    default:
      return 'bg-[var(--color-muted)]/20 text-[var(--color-muted)]';
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

  function renderLeague(label: string, shortLabel: string, leagueTeams: TeamSummary[]) {
    return (
      <div className="vintage-card">
        {/* League header */}
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full font-headline text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--color-ballpark) 0%, #5C1A1A 100%)',
              color: 'var(--color-cream)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {shortLabel}
          </div>
          <h4 className="font-headline text-lg font-bold uppercase tracking-wider text-[var(--color-ballpark)]">
            {label}
          </h4>
        </div>

        {/* Divisions */}
        <div className="space-y-4">
          {DIVISIONS.map((div) => {
            const divTeams = leagueTeams.filter((t) => t.division === div);
            if (divTeams.length === 0) return null;
            return (
              <div key={div}>
                <p className="mb-2 font-stat text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
                  {div} Division
                </p>
                <div className="space-y-1">
                  {divTeams.map((team) => {
                    const badge = ownerBadge(team, userId);
                    return (
                      <div
                        key={team.id}
                        className="flex items-center justify-between rounded border border-[var(--color-sandstone)]/50 bg-[var(--color-sandstone)]/10 px-3 py-2 transition-colors hover:bg-[var(--color-sandstone)]/20"
                      >
                        <span className="font-stat text-sm font-medium text-[var(--color-ink)]">
                          {team.city} {team.name}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 font-stat text-[10px] font-bold uppercase tracking-wider ${badgeStyles(badge)}`}
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

      {/* Teams header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ballpark)]/20">
          <svg
            className="h-5 w-5 text-[var(--color-ballpark)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        </div>
        <h3 className="font-headline text-xl font-bold uppercase tracking-wider text-[var(--color-ballpark)]">
          League Rosters
        </h3>
      </div>

      {/* League grids */}
      <div className="grid gap-gutter md:grid-cols-2">
        {renderLeague('American League', 'AL', alTeams)}
        {renderLeague('National League', 'NL', nlTeams)}
      </div>

      {/* Start Draft button */}
      {isCommissioner && (
        <div className="flex justify-center pt-gutter">
          <button
            type="button"
            onClick={onStartDraft}
            disabled={isStartingDraft}
            className="btn-vintage-primary text-lg"
          >
            {isStartingDraft ? 'Starting Draft...' : 'Start Draft'}
          </button>
        </div>
      )}
    </div>
  );
}

export default TeamSetupPanel;

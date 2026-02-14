/**
 * TeamSetupPanel
 *
 * Compact league overview during initial setup phase.
 * Summary stats, user team highlight, league tabs with division grid.
 *
 * REQ-LGE-004: Display auto-generated team names.
 * REQ-LGE-005: Show AL/NL division assignments.
 * REQ-LGE-006: Ownership status (Commissioner / Player / CPU).
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useState } from 'react';
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

const DIVISIONS = ['East', 'Central', 'West'] as const;

export function TeamSetupPanel({
  teams,
  isCommissioner,
  userId,
  onStartDraft,
  isStartingDraft,
  inviteKey,
}: TeamSetupPanelProps) {
  const [activeLeague, setActiveLeague] = useState<'AL' | 'NL'>('AL');

  const alTeams = teams.filter((t) => t.leagueDivision === 'AL');
  const nlTeams = teams.filter((t) => t.leagueDivision === 'NL');
  const leagueTeams = activeLeague === 'AL' ? alTeams : nlTeams;

  const userTeam = teams.find((t) => t.ownerId === userId);
  const playerCount = teams.filter((t) => t.ownerId !== null).length;

  const divisionSet = new Set<string>();
  for (const t of teams) {
    divisionSet.add(`${t.leagueDivision}-${t.division}`);
  }

  return (
    <div className="space-y-gutter-lg">
      <InviteKeyDisplay inviteKey={inviteKey} />

      <div className="vintage-card">
        {/* Header */}
        <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-[var(--accent-primary)] mb-4">
          League Overview
        </h3>

        {/* Summary stats */}
        <div className="flex items-center gap-6 mb-6">
          <div className="text-center">
            <span className="block font-stat text-2xl font-bold text-[var(--text-primary)]">{teams.length}</span>
            <span className="font-stat text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Teams</span>
          </div>
          <div className="h-8 w-px bg-[var(--border-default)]" />
          <div className="text-center">
            <span className="block font-stat text-2xl font-bold text-[var(--text-primary)]">2</span>
            <span className="font-stat text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Leagues</span>
          </div>
          <div className="h-8 w-px bg-[var(--border-default)]" />
          <div className="text-center">
            <span className="block font-stat text-2xl font-bold text-[var(--text-primary)]">{divisionSet.size}</span>
            <span className="font-stat text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Divisions</span>
          </div>
          <div className="h-8 w-px bg-[var(--border-default)]" />
          <div className="text-center">
            <span className="block font-stat text-2xl font-bold text-[var(--text-primary)]">{playerCount}</span>
            <span className="font-stat text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Players</span>
          </div>
        </div>

        {/* User team highlight */}
        {userTeam && (
          <div className="mb-6 rounded border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 px-4 py-3">
            <span className="font-stat text-[10px] uppercase tracking-widest text-[var(--accent-primary)]">Your Team</span>
            <p className="mt-0.5 font-headline text-lg font-bold text-[var(--text-primary)]">
              {userTeam.city} {userTeam.name}
              <span className="ml-2 font-stat text-sm font-normal text-[var(--text-secondary)]">
                {userTeam.leagueDivision} {userTeam.division}
              </span>
            </p>
          </div>
        )}

        {/* League tabs */}
        <div className="flex gap-1 mb-4 border-b border-[var(--border-default)]">
          <button
            type="button"
            onClick={() => setActiveLeague('AL')}
            className={`px-4 py-2 font-headline text-sm uppercase tracking-wider transition-colors -mb-px ${
              activeLeague === 'AL'
                ? 'border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            American League
          </button>
          <button
            type="button"
            onClick={() => setActiveLeague('NL')}
            className={`px-4 py-2 font-headline text-sm uppercase tracking-wider transition-colors -mb-px ${
              activeLeague === 'NL'
                ? 'border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            National League
          </button>
        </div>

        {/* Division grid */}
        <div className="grid grid-cols-3 gap-4">
          {DIVISIONS.map((div) => {
            const divTeams = leagueTeams.filter((t) => t.division === div);
            if (divTeams.length === 0) return null;
            return (
              <div key={div}>
                <p className="mb-2 font-stat text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                  {div}
                </p>
                <div className="space-y-1">
                  {divTeams.map((team) => {
                    const isUser = team.ownerId === userId;
                    const isPlayer = team.ownerId !== null && !isUser;
                    return (
                      <div
                        key={team.id}
                        className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                          isUser
                            ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-medium'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        <span className="font-stat">{team.name}</span>
                        {isUser && (
                          <span className="rounded bg-[var(--accent-primary)] px-1.5 py-0.5 font-stat text-[9px] font-bold uppercase text-[var(--surface-base)]">
                            You
                          </span>
                        )}
                        {isPlayer && (
                          <span className="rounded bg-[var(--semantic-info)]/20 px-1.5 py-0.5 font-stat text-[9px] font-bold uppercase text-[var(--semantic-info)]">
                            Player
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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

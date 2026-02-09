/**
 * Mock League Service
 *
 * Layer 3 stub that provides hardcoded league data for development.
 * Will be replaced with real Supabase service when Docker is available.
 */

import type { LeagueSummary, TeamSummary, DivisionStandings } from '@lib/types/league';
import type { ScheduleDay } from '@lib/types/schedule';

const MOCK_LEAGUE: LeagueSummary = {
  id: 'league-mock-001',
  name: 'Baseball Ledger Demo',
  commissionerId: 'user-mock-001',
  inviteKey: 'DEMO-2024',
  teamCount: 8,
  yearRangeStart: 1990,
  yearRangeEnd: 1995,
  injuriesEnabled: true,
  status: 'regular_season',
  currentDay: 81,
};

const MOCK_TEAMS: TeamSummary[] = [
  { id: 'al-e1', name: 'Eagles', city: 'Eastern', ownerId: 'user-mock-001', managerProfile: 'balanced', leagueDivision: 'AL', division: 'East', wins: 55, losses: 35, runsScored: 480, runsAllowed: 380 },
  { id: 'al-e2', name: 'Hawks', city: 'Harbor', ownerId: null, managerProfile: 'aggressive', leagueDivision: 'AL', division: 'East', wins: 48, losses: 42, runsScored: 420, runsAllowed: 400 },
  { id: 'al-w1', name: 'Wolves', city: 'Western', ownerId: null, managerProfile: 'analytical', leagueDivision: 'AL', division: 'West', wins: 52, losses: 38, runsScored: 460, runsAllowed: 390 },
  { id: 'al-w2', name: 'Bears', city: 'Mountain', ownerId: null, managerProfile: 'conservative', leagueDivision: 'AL', division: 'West', wins: 44, losses: 46, runsScored: 370, runsAllowed: 410 },
  { id: 'nl-e1', name: 'Tigers', city: 'Northern', ownerId: null, managerProfile: 'balanced', leagueDivision: 'NL', division: 'East', wins: 58, losses: 32, runsScored: 510, runsAllowed: 350 },
  { id: 'nl-e2', name: 'Lions', city: 'Central', ownerId: null, managerProfile: 'aggressive', leagueDivision: 'NL', division: 'East', wins: 45, losses: 45, runsScored: 400, runsAllowed: 410 },
  { id: 'nl-w1', name: 'Panthers', city: 'Southern', ownerId: null, managerProfile: 'analytical', leagueDivision: 'NL', division: 'West', wins: 50, losses: 40, runsScored: 440, runsAllowed: 400 },
  { id: 'nl-w2', name: 'Jaguars', city: 'Coastal', ownerId: null, managerProfile: 'conservative', leagueDivision: 'NL', division: 'West', wins: 40, losses: 50, runsScored: 360, runsAllowed: 430 },
];

export async function fetchLeague(): Promise<LeagueSummary> {
  return MOCK_LEAGUE;
}

export async function fetchTeams(): Promise<TeamSummary[]> {
  return [...MOCK_TEAMS];
}

export async function fetchStandings(): Promise<DivisionStandings[]> {
  const divisions = new Map<string, TeamSummary[]>();
  for (const team of MOCK_TEAMS) {
    const key = `${team.leagueDivision}-${team.division}`;
    const group = divisions.get(key) ?? [];
    group.push(team);
    divisions.set(key, group);
  }

  return [...divisions.entries()].map(([key, teams]) => {
    const [leagueDivision, division] = key.split('-');
    return {
      leagueDivision: leagueDivision as 'AL' | 'NL',
      division,
      teams: [...teams].sort((a, b) => b.wins - a.wins),
    };
  });
}

export async function fetchSchedule(): Promise<ScheduleDay[]> {
  // Generate a few mock schedule days
  const days: ScheduleDay[] = [];
  for (let d = 1; d <= 5; d++) {
    days.push({
      dayNumber: 80 + d,
      games: [
        { id: `g-${80 + d}-0`, homeTeamId: 'al-e1', awayTeamId: 'al-e2', homeScore: d === 1 ? 5 : null, awayScore: d === 1 ? 3 : null, isComplete: d === 1, gameLogId: d === 1 ? 'log-1' : null },
        { id: `g-${80 + d}-1`, homeTeamId: 'al-w1', awayTeamId: 'al-w2', homeScore: d === 1 ? 2 : null, awayScore: d === 1 ? 7 : null, isComplete: d === 1, gameLogId: d === 1 ? 'log-2' : null },
        { id: `g-${80 + d}-2`, homeTeamId: 'nl-e1', awayTeamId: 'nl-e2', homeScore: d === 1 ? 4 : null, awayScore: d === 1 ? 1 : null, isComplete: d === 1, gameLogId: d === 1 ? 'log-3' : null },
        { id: `g-${80 + d}-3`, homeTeamId: 'nl-w1', awayTeamId: 'nl-w2', homeScore: d === 1 ? 6 : null, awayScore: d === 1 ? 6 : null, isComplete: d === 1, gameLogId: d === 1 ? 'log-4' : null },
      ],
    });
  }
  return days;
}

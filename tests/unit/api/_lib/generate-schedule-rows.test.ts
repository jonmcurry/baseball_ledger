/**
 * Tests for Schedule Generation + DB Insert
 *
 * REQ-SCH-001 through REQ-SCH-004: Schedule generation wiring.
 *
 * Mocks the schedule generator and Supabase client to verify:
 * - Teams are fetched and mapped to TeamSummary[]
 * - generateSchedule is called with correct params
 * - ScheduleDay[] output is flattened to DB rows and inserted
 * - Generator id field is NOT passed (DB auto-generates UUIDs)
 * - Errors from team fetch or insert are propagated
 */

vi.mock('@lib/schedule/generator', () => ({
  generateSchedule: vi.fn(),
}));

vi.mock('@lib/rng/seeded-rng', () => {
  const MockRNG = vi.fn().mockImplementation(function () { return {}; });
  return { SeededRNG: MockRNG };
});

import { generateAndInsertSchedule } from '../../../../api/_lib/generate-schedule-rows';
import { generateSchedule } from '@lib/schedule/generator';
import { SeededRNG } from '@lib/rng/seeded-rng';
import type { ScheduleDay } from '@lib/types/schedule';

const mockGenerateSchedule = vi.mocked(generateSchedule);
const MockSeededRNG = vi.mocked(SeededRNG);

const mockTeamRows = [
  {
    id: 'team-1',
    name: 'Yankees',
    city: 'New York',
    owner_id: 'user-1',
    manager_profile: 'aggressive',
    league_division: 'AL',
    division: 'East',
    wins: 0,
    losses: 0,
    runs_scored: 0,
    runs_allowed: 0,
    home_wins: 0,
    home_losses: 0,
    away_wins: 0,
    away_losses: 0,
  },
  {
    id: 'team-2',
    name: 'Red Sox',
    city: 'Boston',
    owner_id: 'user-2',
    manager_profile: 'balanced',
    league_division: 'AL',
    division: 'East',
    wins: 0,
    losses: 0,
    runs_scored: 0,
    runs_allowed: 0,
    home_wins: 0,
    home_losses: 0,
    away_wins: 0,
    away_losses: 0,
  },
];

const mockScheduleDays: ScheduleDay[] = [
  {
    dayNumber: 1,
    games: [
      {
        id: 'g-1-0-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        homeScore: null,
        awayScore: null,
        isComplete: false,
        gameLogId: null,
      },
    ],
  },
  {
    dayNumber: 2,
    games: [
      {
        id: 'g-2-0-2',
        homeTeamId: 'team-2',
        awayTeamId: 'team-1',
        homeScore: null,
        awayScore: null,
        isComplete: false,
        gameLogId: null,
      },
    ],
  },
];

function createMockSupabase(options: {
  teamRows?: typeof mockTeamRows;
  teamError?: { message: string } | null;
  insertError?: { message: string } | null;
} = {}) {
  const selectChain = {
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: options.teamRows ?? mockTeamRows,
            error: options.teamError ?? null,
          }),
        }),
      }),
    }),
  };

  const insertFn = vi.fn().mockResolvedValue({
    error: options.insertError ?? null,
  });

  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'teams') {
      return { select: vi.fn().mockReturnValue(selectChain) };
    }
    if (table === 'schedule') {
      return { insert: insertFn };
    }
    return {};
  });

  return { client: { from: fromFn } as any, fromFn, insertFn, selectChain };
}

describe('generateAndInsertSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateSchedule.mockReturnValue(mockScheduleDays);
    MockSeededRNG.mockImplementation(function () { return {} as any; });
  });

  it('fetches teams and calls generateSchedule with TeamSummary array', async () => {
    const { client } = createMockSupabase();

    await generateAndInsertSchedule(client, 'league-1');

    expect(mockGenerateSchedule).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'team-1',
          name: 'Yankees',
          city: 'New York',
          ownerId: 'user-1',
          managerProfile: 'aggressive',
          leagueDivision: 'AL',
          division: 'East',
          wins: 0,
          losses: 0,
          runsScored: 0,
          runsAllowed: 0,
          homeWins: 0,
          homeLosses: 0,
          awayWins: 0,
          awayLosses: 0,
          streak: '-',
          lastTenWins: 0,
          lastTenLosses: 0,
        }),
        expect.objectContaining({
          id: 'team-2',
          name: 'Red Sox',
          city: 'Boston',
        }),
      ]),
      expect.any(Object),
    );
  });

  it('maps DB snake_case columns to camelCase TeamSummary fields', async () => {
    const { client } = createMockSupabase();

    await generateAndInsertSchedule(client, 'league-1');

    const teams = mockGenerateSchedule.mock.calls[0][0];
    expect(teams[0]).toEqual({
      id: 'team-1',
      name: 'Yankees',
      city: 'New York',
      ownerId: 'user-1',
      managerProfile: 'aggressive',
      leagueDivision: 'AL',
      division: 'East',
      wins: 0,
      losses: 0,
      runsScored: 0,
      runsAllowed: 0,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0,
      streak: '-',
      lastTenWins: 0,
      lastTenLosses: 0,
    });
  });

  it('flattens ScheduleDay[] into rows with league_id and day_number', async () => {
    const { client, insertFn } = createMockSupabase();

    await generateAndInsertSchedule(client, 'league-1');

    expect(insertFn).toHaveBeenCalledWith([
      {
        league_id: 'league-1',
        day_number: 1,
        home_team_id: 'team-1',
        away_team_id: 'team-2',
      },
      {
        league_id: 'league-1',
        day_number: 2,
        home_team_id: 'team-2',
        away_team_id: 'team-1',
      },
    ]);
  });

  it('does not pass generator id field to DB insert', async () => {
    const { client, insertFn } = createMockSupabase();

    await generateAndInsertSchedule(client, 'league-1');

    const rows = insertFn.mock.calls[0][0];
    for (const row of rows) {
      expect(row).not.toHaveProperty('id');
      expect(row).not.toHaveProperty('game_log_id');
      expect(row).not.toHaveProperty('is_complete');
    }
  });

  it('throws if team fetch fails', async () => {
    const { client } = createMockSupabase({
      teamRows: [],
      teamError: { message: 'DB down' },
    });

    await expect(generateAndInsertSchedule(client, 'league-1'))
      .rejects.toEqual(expect.objectContaining({
        category: 'DATA',
        code: 'QUERY_FAILED',
      }));
  });

  it('throws if schedule insert fails', async () => {
    const { client } = createMockSupabase({
      insertError: { message: 'Insert failed' },
    });

    await expect(generateAndInsertSchedule(client, 'league-1'))
      .rejects.toEqual(expect.objectContaining({
        category: 'DATA',
        code: 'INSERT_FAILED',
      }));
  });

  it('returns totalDays and totalGames counts', async () => {
    const { client } = createMockSupabase();

    const result = await generateAndInsertSchedule(client, 'league-1');

    expect(result).toEqual({ totalDays: 2, totalGames: 2 });
  });
});

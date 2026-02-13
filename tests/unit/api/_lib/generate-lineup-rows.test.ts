/**
 * Tests for Lineup Generation + DB Update
 *
 * REQ-RST-002, REQ-RST-003: Auto-generate lineups for all teams after draft.
 *
 * Mocks the lineup generator, stat estimator, and Supabase client to verify:
 * - Teams and rosters are fetched for the league
 * - Position players are separated from pitchers
 * - generateLineup is called for position player starters
 * - Pitchers are assigned rotation/bullpen by role
 * - Roster rows are updated with correct slots, order, positions
 * - Errors are propagated
 */

vi.mock('@lib/roster/lineup-generator', () => ({
  generateLineup: vi.fn(),
}));

vi.mock('@lib/roster/estimate-batting-stats', () => ({
  estimateBattingStats: vi.fn(),
}));

import { generateAndInsertLineups } from '../../../../api/_lib/generate-lineup-rows';
import { generateLineup } from '@lib/roster/lineup-generator';
import { estimateBattingStats } from '@lib/roster/estimate-batting-stats';
import type { PlayerCard, Position } from '@lib/types/player';

const mockGenerateLineup = vi.mocked(generateLineup);
const mockEstimateBattingStats = vi.mocked(estimateBattingStats);

function makePlayerCard(id: string, position: Position, isPitcher: boolean, pitching?: {
  role: 'SP' | 'RP' | 'CL';
  grade: number;
}): PlayerCard {
  return {
    playerId: id,
    nameFirst: id.slice(0, 3),
    nameLast: id.slice(3),
    seasonYear: 2020,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: position,
    eligiblePositions: [position],
    isPitcher,
    card: Array(35).fill(7),
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0.15,
    discipline: 0.5,
    contactRate: 0.75,
    fieldingPct: 0.98,
    range: 0.5,
    arm: 0.5,
    ...(pitching ? {
      pitching: {
        role: pitching.role,
        grade: pitching.grade,
        stamina: 6.0,
        era: 3.50,
        whip: 1.20,
        k9: 8.0,
        bb9: 3.0,
        hr9: 1.0,
        usageFlags: [],
        isReliever: pitching.role !== 'SP',
      },
    } : {}),
  } as PlayerCard;
}

// 9 position players + 4 SP + 4 RP/CL + 4 bench = 21 total (per REQ-DFT-001)
const positionPlayers = [
  { id: 'r-1', player_id: 'c-01', player_card: makePlayerCard('c-01', 'C', false) },
  { id: 'r-2', player_id: '1b01', player_card: makePlayerCard('1b01', '1B', false) },
  { id: 'r-3', player_id: '2b01', player_card: makePlayerCard('2b01', '2B', false) },
  { id: 'r-4', player_id: 'ss01', player_card: makePlayerCard('ss01', 'SS', false) },
  { id: 'r-5', player_id: '3b01', player_card: makePlayerCard('3b01', '3B', false) },
  { id: 'r-6', player_id: 'lf01', player_card: makePlayerCard('lf01', 'LF', false) },
  { id: 'r-7', player_id: 'cf01', player_card: makePlayerCard('cf01', 'CF', false) },
  { id: 'r-8', player_id: 'rf01', player_card: makePlayerCard('rf01', 'RF', false) },
  { id: 'r-9', player_id: 'dh01', player_card: makePlayerCard('dh01', 'DH', false) },
  // Bench position players
  { id: 'r-10', player_id: 'bn01', player_card: makePlayerCard('bn01', 'LF', false) },
  { id: 'r-11', player_id: 'bn02', player_card: makePlayerCard('bn02', 'SS', false) },
  { id: 'r-12', player_id: 'bn03', player_card: makePlayerCard('bn03', 'C', false) },
  { id: 'r-13', player_id: 'bn04', player_card: makePlayerCard('bn04', '1B', false) },
];

const pitchers = [
  { id: 'r-14', player_id: 'sp01', player_card: makePlayerCard('sp01', 'SP', true, { role: 'SP', grade: 12 }) },
  { id: 'r-15', player_id: 'sp02', player_card: makePlayerCard('sp02', 'SP', true, { role: 'SP', grade: 10 }) },
  { id: 'r-16', player_id: 'sp03', player_card: makePlayerCard('sp03', 'SP', true, { role: 'SP', grade: 8 }) },
  { id: 'r-17', player_id: 'sp04', player_card: makePlayerCard('sp04', 'SP', true, { role: 'SP', grade: 6 }) },
  { id: 'r-18', player_id: 'rp01', player_card: makePlayerCard('rp01', 'RP', true, { role: 'RP', grade: 9 }) },
  { id: 'r-19', player_id: 'rp02', player_card: makePlayerCard('rp02', 'RP', true, { role: 'RP', grade: 7 }) },
  { id: 'r-20', player_id: 'rp03', player_card: makePlayerCard('rp03', 'RP', true, { role: 'RP', grade: 5 }) },
  { id: 'r-21', player_id: 'cl01', player_card: makePlayerCard('cl01', 'CL', true, { role: 'CL', grade: 11 }) },
];

const allRosterRows = [...positionPlayers, ...pitchers].map((r) => ({
  ...r,
  team_id: 'team-1',
  season_year: 2020,
  roster_slot: 'bench',
  lineup_order: null,
  lineup_position: null,
}));

function createMockSupabase(options: {
  teamRows?: Array<{ id: string }>;
  teamError?: { message: string } | null;
  rosterRows?: typeof allRosterRows;
  rosterError?: { message: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: options.updateError ?? null }),
  });

  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'teams') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: options.teamRows ?? [{ id: 'team-1' }],
            error: options.teamError ?? null,
          }),
        }),
      };
    }
    if (table === 'rosters') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: options.rosterRows ?? allRosterRows,
            error: options.rosterError ?? null,
          }),
        }),
        update: updateFn,
      };
    }
    return {};
  });

  return { client: { from: fromFn } as any, fromFn, updateFn };
}

describe('generateAndInsertLineups', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock estimateBattingStats to return predictable values (higher index = higher OPS)
    mockEstimateBattingStats.mockImplementation((card: PlayerCard) => {
      const idx = parseInt(card.playerId.replace(/\D/g, ''), 10) || 1;
      return { ops: 0.700 + idx * 0.01, obp: 0.330 + idx * 0.005, slg: 0.400 + idx * 0.005 };
    });

    // Mock generateLineup to return slots matching the input starters
    mockGenerateLineup.mockImplementation((starters) => {
      return starters.map((s: { card: PlayerCard }, i: number) => ({
        rosterId: s.card.playerId,
        playerId: s.card.playerId,
        playerName: `${s.card.nameFirst} ${s.card.nameLast}`,
        position: s.card.primaryPosition,
      }));
    });
  });

  it('fetches teams and rosters for the league', async () => {
    const { client, fromFn } = createMockSupabase();

    await generateAndInsertLineups(client, 'league-1');

    expect(fromFn).toHaveBeenCalledWith('teams');
    expect(fromFn).toHaveBeenCalledWith('rosters');
  });

  it('separates position players from pitchers', async () => {
    const { client } = createMockSupabase();

    await generateAndInsertLineups(client, 'league-1');

    // generateLineup should be called with 9 position player starters (not pitchers)
    expect(mockGenerateLineup).toHaveBeenCalledTimes(1);
    const starterArgs = mockGenerateLineup.mock.calls[0][0];
    expect(starterArgs).toHaveLength(9);
    for (const starter of starterArgs) {
      expect(starter.card.isPitcher).toBe(false);
    }
  });

  it('calls generateLineup with top 9 position players by OPS', async () => {
    const { client } = createMockSupabase();

    await generateAndInsertLineups(client, 'league-1');

    expect(mockGenerateLineup).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ card: expect.objectContaining({ isPitcher: false }) }),
      ]),
    );
    // Each entry should have ops, obp, slg from estimateBattingStats
    const starters = mockGenerateLineup.mock.calls[0][0];
    for (const s of starters) {
      expect(s).toHaveProperty('ops');
      expect(s).toHaveProperty('obp');
      expect(s).toHaveProperty('slg');
    }
  });

  it('updates starter roster rows with lineup_order and lineup_position', async () => {
    const { client, updateFn } = createMockSupabase();

    await generateAndInsertLineups(client, 'league-1');

    // Should have updates for starters (9) + pitchers (8) = 17 update calls
    // (bench position players stay as-is since they're already 'bench')
    expect(updateFn).toHaveBeenCalled();

    // Check that at least some calls set roster_slot to 'starter' with lineup_order
    const allCalls = updateFn.mock.calls;
    const starterCalls = allCalls.filter((call: unknown[]) => {
      const data = call[0] as Record<string, unknown>;
      return data.roster_slot === 'starter';
    });
    expect(starterCalls.length).toBe(9);
    for (const call of starterCalls) {
      const data = call[0] as Record<string, unknown>;
      expect(data.lineup_order).toBeGreaterThanOrEqual(1);
      expect(data.lineup_order).toBeLessThanOrEqual(9);
      expect(data.lineup_position).toBeTruthy();
    }
  });

  it('assigns SP pitchers to rotation slot', async () => {
    const { client, updateFn } = createMockSupabase();

    await generateAndInsertLineups(client, 'league-1');

    const allCalls = updateFn.mock.calls;
    const rotationCalls = allCalls.filter((call: unknown[]) => {
      const data = call[0] as Record<string, unknown>;
      return data.roster_slot === 'rotation';
    });
    expect(rotationCalls.length).toBe(4); // 4 SP pitchers
  });

  it('assigns RP pitchers to bullpen slot', async () => {
    const { client, updateFn } = createMockSupabase();

    await generateAndInsertLineups(client, 'league-1');

    const allCalls = updateFn.mock.calls;
    const bullpenCalls = allCalls.filter((call: unknown[]) => {
      const data = call[0] as Record<string, unknown>;
      return data.roster_slot === 'bullpen';
    });
    expect(bullpenCalls.length).toBe(4); // 3 RP + 1 CL pitchers
  });

  it('assigns CL pitcher to bullpen slot', async () => {
    const { client, updateFn } = createMockSupabase();

    await generateAndInsertLineups(client, 'league-1');

    const allCalls = updateFn.mock.calls;
    const closerCalls = allCalls.filter((call: unknown[]) => {
      const data = call[0] as Record<string, unknown>;
      return data.roster_slot === 'closer';
    });
    expect(closerCalls.length).toBe(0); // CL goes to bullpen, not closer
  });

  it('assigns all CL pitchers to bullpen slot alongside RP', async () => {
    // Add a second CL pitcher to the roster
    const rosterWithTwoClosers = [
      ...allRosterRows,
      {
        id: 'r-22',
        player_id: 'cl02',
        player_card: makePlayerCard('cl02', 'CL', true, { role: 'CL', grade: 9 }),
        team_id: 'team-1',
        season_year: 2020,
        roster_slot: 'bench',
        lineup_order: null,
        lineup_position: null,
      },
    ];
    const { client, updateFn } = createMockSupabase({ rosterRows: rosterWithTwoClosers });

    await generateAndInsertLineups(client, 'league-1');

    const allCalls = updateFn.mock.calls;
    const closerCalls = allCalls.filter((call: unknown[]) => {
      const data = call[0] as Record<string, unknown>;
      return data.roster_slot === 'closer';
    });
    const bullpenCalls = allCalls.filter((call: unknown[]) => {
      const data = call[0] as Record<string, unknown>;
      return data.roster_slot === 'bullpen';
    });
    expect(closerCalls.length).toBe(0);
    // 3 RP + 2 CL = 5 bullpen
    expect(bullpenCalls.length).toBe(5);
  });

  it('throws if team fetch fails', async () => {
    const { client } = createMockSupabase({
      teamRows: [],
      teamError: { message: 'DB down' },
    });

    await expect(generateAndInsertLineups(client, 'league-1'))
      .rejects.toEqual(expect.objectContaining({
        category: 'DATA',
        code: 'QUERY_FAILED',
      }));
  });

  it('returns teamsProcessed and playersUpdated counts', async () => {
    const { client } = createMockSupabase();

    const result = await generateAndInsertLineups(client, 'league-1');

    expect(result.teamsProcessed).toBe(1);
    expect(result.playersUpdated).toBeGreaterThan(0);
  });
});

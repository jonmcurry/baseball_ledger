/**
 * Tests for loadTeamConfig, selectStartingPitcher, createFallbackPitcher
 *
 * Shared roster loading used by both regular season and playoff simulation.
 */

import {
  loadTeamConfig,
  selectStartingPitcher,
  createFallbackPitcher,
} from '../../../../api/_lib/load-team-config';
import type { PlayerCard } from '@lib/types/player';

function mockPlayerCard(id: string, overrides: Partial<PlayerCard> = {}): Record<string, unknown> {
  return {
    playerId: id,
    nameFirst: 'Player',
    nameLast: id.toUpperCase(),
    seasonYear: 2023,
    primaryPosition: 'RF',
    isPitcher: false,
    card: new Array(35).fill(7),
    powerRating: 17,
    ...overrides,
  } as unknown as Record<string, unknown>;
}

function mockPitcherCard(id: string): Record<string, unknown> {
  return mockPlayerCard(id, {
    isPitcher: true,
    primaryPosition: 'SP' as any,
    pitching: {
      role: 'SP',
      grade: 10,
      stamina: 7,
      era: 3.50,
      whip: 1.20,
      k9: 8.5,
      bb9: 2.5,
      hr9: 1.0,
      usageFlags: [],
      isReliever: false,
    },
  } as any);
}

function createMockSupabase(rosterEntries: Record<string, unknown>[], managerProfile = 'balanced') {
  const rostersBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: rosterEntries, error: null }).then(resolve),
  };

  const teamsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { manager_profile: managerProfile },
      error: null,
    }),
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: { manager_profile: managerProfile }, error: null }).then(resolve),
  };

  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'rosters') return rostersBuilder;
    if (table === 'teams') return teamsBuilder;
    return rostersBuilder;
  });

  return { client: { from: fromFn } as any, fromFn, rostersBuilder, teamsBuilder };
}

describe('loadTeamConfig', () => {
  it('builds lineup from starters sorted by lineup_order', async () => {
    const entries = [
      { player_id: 'p3', player_card: mockPlayerCard('p3'), roster_slot: 'starter', lineup_order: 3, lineup_position: '1B' },
      { player_id: 'p1', player_card: mockPlayerCard('p1'), roster_slot: 'starter', lineup_order: 1, lineup_position: 'CF' },
      { player_id: 'p2', player_card: mockPlayerCard('p2'), roster_slot: 'starter', lineup_order: 2, lineup_position: 'SS' },
      { player_id: 'sp1', player_card: mockPitcherCard('sp1'), roster_slot: 'rotation', lineup_order: null, lineup_position: null },
    ];
    const { client } = createMockSupabase(entries);

    const config = await loadTeamConfig(client, 'team-1');

    expect(config.lineup).toHaveLength(3);
    expect(config.lineup[0].playerId).toBe('p1');
    expect(config.lineup[1].playerId).toBe('p2');
    expect(config.lineup[2].playerId).toBe('p3');
    expect(config.lineup[0].position).toBe('CF');
  });

  it('builds batterCards map from starters and bench', async () => {
    const entries = [
      { player_id: 'p1', player_card: mockPlayerCard('p1'), roster_slot: 'starter', lineup_order: 1, lineup_position: 'CF' },
      { player_id: 'b1', player_card: mockPlayerCard('b1'), roster_slot: 'bench', lineup_order: null, lineup_position: null },
      { player_id: 'sp1', player_card: mockPitcherCard('sp1'), roster_slot: 'rotation', lineup_order: null, lineup_position: null },
    ];
    const { client } = createMockSupabase(entries);

    const config = await loadTeamConfig(client, 'team-1');

    expect(config.batterCards.size).toBe(2);
    expect(config.batterCards.has('p1')).toBe(true);
    expect(config.batterCards.has('b1')).toBe(true);
    expect(config.batterCards.has('sp1')).toBe(false);
  });

  it('returns full rotation array', async () => {
    const entries = [
      { player_id: 'sp1', player_card: mockPitcherCard('sp1'), roster_slot: 'rotation', lineup_order: null, lineup_position: null },
      { player_id: 'sp2', player_card: mockPitcherCard('sp2'), roster_slot: 'rotation', lineup_order: null, lineup_position: null },
      { player_id: 'sp3', player_card: mockPitcherCard('sp3'), roster_slot: 'rotation', lineup_order: null, lineup_position: null },
    ];
    const { client } = createMockSupabase(entries);

    const config = await loadTeamConfig(client, 'team-1');

    expect(config.rotation).toHaveLength(3);
    expect(config.rotation[0].playerId).toBe('sp1');
    expect(config.rotation[2].playerId).toBe('sp3');
  });

  it('sets startingPitcher to first rotation entry', async () => {
    const entries = [
      { player_id: 'sp1', player_card: mockPitcherCard('sp1'), roster_slot: 'rotation', lineup_order: null, lineup_position: null },
      { player_id: 'sp2', player_card: mockPitcherCard('sp2'), roster_slot: 'rotation', lineup_order: null, lineup_position: null },
    ];
    const { client } = createMockSupabase(entries);

    const config = await loadTeamConfig(client, 'team-1');

    expect(config.startingPitcher.playerId).toBe('sp1');
  });

  it('uses fallback pitcher when rotation is empty', async () => {
    const entries = [
      { player_id: 'p1', player_card: mockPlayerCard('p1'), roster_slot: 'starter', lineup_order: 1, lineup_position: 'CF' },
    ];
    const { client } = createMockSupabase(entries);

    const config = await loadTeamConfig(client, 'team-1');

    expect(config.startingPitcher.playerId).toBe('fallback-pitcher');
    expect(config.rotation).toHaveLength(0);
  });

  it('builds bullpen from bullpen roster entries', async () => {
    const entries = [
      { player_id: 'rp1', player_card: mockPitcherCard('rp1'), roster_slot: 'bullpen', lineup_order: null, lineup_position: null },
      { player_id: 'rp2', player_card: mockPitcherCard('rp2'), roster_slot: 'bullpen', lineup_order: null, lineup_position: null },
    ];
    const { client } = createMockSupabase(entries);

    const config = await loadTeamConfig(client, 'team-1');

    expect(config.bullpen).toHaveLength(2);
    expect(config.bullpen[0].playerId).toBe('rp1');
  });

  it('returns closer or null', async () => {
    const entriesWithCloser = [
      { player_id: 'cl1', player_card: mockPitcherCard('cl1'), roster_slot: 'closer', lineup_order: null, lineup_position: null },
    ];
    const { client: c1 } = createMockSupabase(entriesWithCloser);
    const config1 = await loadTeamConfig(c1, 'team-1');
    expect(config1.closer).not.toBeNull();
    expect(config1.closer!.playerId).toBe('cl1');

    const { client: c2 } = createMockSupabase([]);
    const config2 = await loadTeamConfig(c2, 'team-2');
    expect(config2.closer).toBeNull();
  });

  it('reads managerStyle from teams table', async () => {
    const { client } = createMockSupabase([], 'aggressive');

    const config = await loadTeamConfig(client, 'team-1');

    expect(config.managerStyle).toBe('aggressive');
  });
});

describe('selectStartingPitcher', () => {
  it('cycles through rotation using modular index', () => {
    const rotation = [
      { playerId: 'sp1' } as PlayerCard,
      { playerId: 'sp2' } as PlayerCard,
      { playerId: 'sp3' } as PlayerCard,
      { playerId: 'sp4' } as PlayerCard,
      { playerId: 'sp5' } as PlayerCard,
    ];

    expect(selectStartingPitcher(rotation, 0).playerId).toBe('sp1');
    expect(selectStartingPitcher(rotation, 1).playerId).toBe('sp2');
    expect(selectStartingPitcher(rotation, 4).playerId).toBe('sp5');
    expect(selectStartingPitcher(rotation, 5).playerId).toBe('sp1');
    expect(selectStartingPitcher(rotation, 7).playerId).toBe('sp3');
  });

  it('returns fallback when rotation is empty', () => {
    const result = selectStartingPitcher([], 0);

    expect(result.playerId).toBe('fallback-pitcher');
  });
});

describe('createFallbackPitcher', () => {
  it('returns a valid pitcher card', () => {
    const pitcher = createFallbackPitcher();

    expect(pitcher.playerId).toBe('fallback-pitcher');
    expect(pitcher.nameFirst).toBe('Default');
    expect(pitcher.nameLast).toBe('Pitcher');
  });
});

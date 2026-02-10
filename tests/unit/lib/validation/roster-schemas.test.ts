/**
 * Tests for Roster Validation Schemas (REQ-ERR-005, REQ-ERR-006)
 *
 * rosterActionSchema: add/drop player from roster
 * tradeSchema: trade players between teams
 * lineupSchema: set lineup of 9 starters with positions
 */

import {
  rosterActionSchema,
  tradeSchema,
  lineupSchema,
} from '@lib/validation/roster-schemas';

// ---------------------------------------------------------------------------
// rosterActionSchema
// ---------------------------------------------------------------------------

describe('rosterActionSchema', () => {
  const validAdd = {
    action: 'add',
    teamId: '550e8400-e29b-41d4-a716-446655440000',
    playerId: 'ruthba01',
  };

  it('accepts valid add action', () => {
    const result = rosterActionSchema.safeParse(validAdd);
    expect(result.success).toBe(true);
  });

  it('accepts valid drop action', () => {
    const result = rosterActionSchema.safeParse({ ...validAdd, action: 'drop' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid action type', () => {
    const result = rosterActionSchema.safeParse({ ...validAdd, action: 'trade' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid teamId (not UUID)', () => {
    const result = rosterActionSchema.safeParse({ ...validAdd, teamId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects empty playerId', () => {
    const result = rosterActionSchema.safeParse({ ...validAdd, playerId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing action field', () => {
    const { action, ...noAction } = validAdd;
    const result = rosterActionSchema.safeParse(noAction);
    expect(result.success).toBe(false);
  });

  it('rejects missing teamId', () => {
    const { teamId, ...noTeam } = validAdd;
    const result = rosterActionSchema.safeParse(noTeam);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tradeSchema
// ---------------------------------------------------------------------------

describe('tradeSchema', () => {
  const validTrade = {
    team1Id: '550e8400-e29b-41d4-a716-446655440001',
    team2Id: '550e8400-e29b-41d4-a716-446655440002',
    team1PlayerIds: ['ruthba01', 'gehrilo01'],
    team2PlayerIds: ['coMDe01'],
  };

  it('accepts valid trade', () => {
    const result = tradeSchema.safeParse(validTrade);
    expect(result.success).toBe(true);
  });

  it('rejects same team IDs', () => {
    const result = tradeSchema.safeParse({
      ...validTrade,
      team2Id: validTrade.team1Id,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty player arrays on both sides', () => {
    const result = tradeSchema.safeParse({
      ...validTrade,
      team1PlayerIds: [],
      team2PlayerIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts one side with no players (release trade)', () => {
    const result = tradeSchema.safeParse({
      ...validTrade,
      team2PlayerIds: [],
    });
    // At least one side must have players
    expect(result.success).toBe(true);
  });

  it('rejects invalid team1Id (not UUID)', () => {
    const result = tradeSchema.safeParse({ ...validTrade, team1Id: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects non-string player IDs', () => {
    const result = tradeSchema.safeParse({ ...validTrade, team1PlayerIds: [123] });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = tradeSchema.safeParse({ team1Id: validTrade.team1Id });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// lineupSchema
// ---------------------------------------------------------------------------

describe('lineupSchema', () => {
  const validLineup = {
    entries: [
      { playerId: 'player1', position: 'C', lineupOrder: 1 },
      { playerId: 'player2', position: '1B', lineupOrder: 2 },
      { playerId: 'player3', position: '2B', lineupOrder: 3 },
      { playerId: 'player4', position: 'SS', lineupOrder: 4 },
      { playerId: 'player5', position: '3B', lineupOrder: 5 },
      { playerId: 'player6', position: 'LF', lineupOrder: 6 },
      { playerId: 'player7', position: 'CF', lineupOrder: 7 },
      { playerId: 'player8', position: 'RF', lineupOrder: 8 },
      { playerId: 'player9', position: 'DH', lineupOrder: 9 },
    ],
  };

  it('accepts valid 9-entry lineup', () => {
    const result = lineupSchema.safeParse(validLineup);
    expect(result.success).toBe(true);
  });

  it('rejects lineup with fewer than 9 entries', () => {
    const result = lineupSchema.safeParse({
      entries: validLineup.entries.slice(0, 8),
    });
    expect(result.success).toBe(false);
  });

  it('rejects lineup with more than 9 entries', () => {
    const result = lineupSchema.safeParse({
      entries: [
        ...validLineup.entries,
        { playerId: 'player10', position: 'DH', lineupOrder: 10 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid position', () => {
    const bad = structuredClone(validLineup);
    bad.entries[0].position = 'XX';
    const result = lineupSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('accepts all valid positions', () => {
    const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
    const entries = positions.map((pos, i) => ({
      playerId: `player${i + 1}`,
      position: pos,
      lineupOrder: i + 1,
    }));
    const result = lineupSchema.safeParse({ entries });
    expect(result.success).toBe(true);
  });

  it('rejects lineupOrder outside 1-9', () => {
    const bad = structuredClone(validLineup);
    bad.entries[0].lineupOrder = 0;
    const result = lineupSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects empty playerId in entry', () => {
    const bad = structuredClone(validLineup);
    bad.entries[0].playerId = '';
    const result = lineupSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

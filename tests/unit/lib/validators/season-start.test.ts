/**
 * Tests for canStartSeason validator
 *
 * REQ-SCH-009: Validates preconditions for starting a new season
 * after archive (rosters remain, new schedule generated).
 */

import { canStartSeason } from '@lib/validators/season-start';

describe('canStartSeason', () => {
  it('returns canStart=true when all conditions met', () => {
    const result = canStartSeason('setup', 2, 30, 21);
    expect(result).toEqual({ canStart: true, reason: null });
  });

  it('returns canStart=false when status is not setup', () => {
    const result = canStartSeason('regular_season', 2, 30, 21);
    expect(result.canStart).toBe(false);
    expect(result.reason).toMatch(/setup/i);
  });

  it('returns canStart=false when seasonYear is 1 (fresh league)', () => {
    const result = canStartSeason('setup', 1, 30, 21);
    expect(result.canStart).toBe(false);
    expect(result.reason).toMatch(/draft/i);
  });

  it('returns canStart=false when teamCount < 2', () => {
    const result = canStartSeason('setup', 2, 1, 21);
    expect(result.canStart).toBe(false);
    expect(result.reason).toMatch(/team/i);
  });

  it('returns canStart=false when minRosterSize < 21', () => {
    const result = canStartSeason('setup', 2, 30, 15);
    expect(result.canStart).toBe(false);
    expect(result.reason).toMatch(/roster/i);
  });
});

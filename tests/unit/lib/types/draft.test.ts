import type { DraftPickResult, DraftState } from '@lib/types/draft';

describe('Draft types', () => {
  describe('DraftPickResult', () => {
    it('records a completed pick', () => {
      const pick: DraftPickResult = {
        round: 1,
        pick: 3,
        teamId: 'team-001',
        playerId: 'ruthba01',
        playerName: 'Babe Ruth',
        position: 'RF',
        isComplete: false,
        nextTeamId: 'team-002',
      };
      expect(pick.round).toBe(1);
      expect(pick.playerName).toBe('Babe Ruth');
      expect(pick.isComplete).toBe(false);
    });

    it('supports final pick (nextTeamId = null)', () => {
      const lastPick: DraftPickResult = {
        round: 21,
        pick: 12,
        teamId: 'team-012',
        playerId: 'bondba01',
        playerName: 'Barry Bonds',
        position: 'LF',
        isComplete: true,
        nextTeamId: null,
      };
      expect(lastPick.isComplete).toBe(true);
      expect(lastPick.nextTeamId).toBeNull();
    });
  });

  describe('DraftState', () => {
    it('represents a draft in progress', () => {
      const state: DraftState = {
        leagueId: 'league-001',
        status: 'in_progress',
        currentRound: 3,
        currentPick: 7,
        currentTeamId: 'team-007',
        picks: [],
        totalRounds: 21,
        pickTimerSeconds: 60,
      };
      expect(state.status).toBe('in_progress');
      expect(state.totalRounds).toBe(21);
      expect(state.pickTimerSeconds).toBe(60);
    });

    it('represents a completed draft', () => {
      const state: DraftState = {
        leagueId: 'league-001',
        status: 'completed',
        currentRound: 21,
        currentPick: 12,
        currentTeamId: null,
        picks: [],
        totalRounds: 21,
        pickTimerSeconds: 60,
      };
      expect(state.status).toBe('completed');
      expect(state.currentTeamId).toBeNull();
    });
  });
});

import type { ScheduleGameSummary, ScheduleDay } from '@lib/types/schedule';

describe('Schedule types', () => {
  describe('ScheduleGameSummary', () => {
    it('represents a scheduled but unplayed game', () => {
      const game: ScheduleGameSummary = {
        id: 'game-001',
        homeTeamId: 'team-001',
        awayTeamId: 'team-002',
        homeScore: null,
        awayScore: null,
        isComplete: false,
        gameLogId: null,
      };
      expect(game.isComplete).toBe(false);
      expect(game.homeScore).toBeNull();
    });

    it('represents a completed game', () => {
      const game: ScheduleGameSummary = {
        id: 'game-001',
        homeTeamId: 'team-001',
        awayTeamId: 'team-002',
        homeScore: 5,
        awayScore: 3,
        isComplete: true,
        gameLogId: 'log-001',
      };
      expect(game.isComplete).toBe(true);
      expect(game.homeScore).toBe(5);
      expect(game.gameLogId).toBe('log-001');
    });
  });

  describe('ScheduleDay', () => {
    it('groups games by day number', () => {
      const day: ScheduleDay = {
        dayNumber: 1,
        games: [
          {
            id: 'g1', homeTeamId: 't1', awayTeamId: 't2',
            homeScore: null, awayScore: null, isComplete: false, gameLogId: null,
          },
          {
            id: 'g2', homeTeamId: 't3', awayTeamId: 't4',
            homeScore: null, awayScore: null, isComplete: false, gameLogId: null,
          },
        ],
      };
      expect(day.dayNumber).toBe(1);
      expect(day.games).toHaveLength(2);
    });
  });
});

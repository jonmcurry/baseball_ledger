import {
  OutcomeCategory,
} from '@lib/types/game';
import type {
  BaseState,
  OutcomeTableEntry,
  LineupSlot,
  GamePitcherStats,
  BattingLine,
  PitchingLine,
  TeamState,
  GameState,
  BoxScore,
  GameResult,
} from '@lib/types/game';

describe('Game types', () => {
  describe('BaseState', () => {
    it('represents runners on bases (null = empty)', () => {
      const bases: BaseState = { first: 'ruthba01', second: null, third: null };
      expect(bases.first).toBe('ruthba01');
      expect(bases.second).toBeNull();
    });

    it('represents bases loaded', () => {
      const loaded: BaseState = { first: 'player1', second: 'player2', third: 'player3' };
      expect(loaded.first).toBeTruthy();
      expect(loaded.second).toBeTruthy();
      expect(loaded.third).toBeTruthy();
    });
  });

  describe('OutcomeCategory', () => {
    it('has correct enum values for hits', () => {
      expect(OutcomeCategory.SINGLE_CLEAN).toBe(15);
      expect(OutcomeCategory.HOME_RUN).toBe(19);
      expect(OutcomeCategory.TRIPLE).toBe(18);
    });

    it('has correct enum values for outs', () => {
      expect(OutcomeCategory.GROUND_OUT).toBe(21);
      expect(OutcomeCategory.STRIKEOUT_SWINGING).toBe(26);
      expect(OutcomeCategory.DOUBLE_PLAY).toBe(32);
    });

    it('has correct enum values for walks/HBP', () => {
      expect(OutcomeCategory.WALK).toBe(27);
      expect(OutcomeCategory.HIT_BY_PITCH).toBe(29);
    });

    it('has correct enum values for rare events', () => {
      expect(OutcomeCategory.WILD_PITCH).toBe(37);
      expect(OutcomeCategory.SPECIAL_EVENT).toBe(40);
    });

    it('has 26 total values', () => {
      const numericValues = Object.values(OutcomeCategory).filter(
        (v) => typeof v === 'number'
      );
      expect(numericValues).toHaveLength(26);
    });
  });

  describe('OutcomeTableEntry', () => {
    it('encodes IDT row with frequency, thresholds, and outcome', () => {
      const entry: OutcomeTableEntry = {
        frequencyWeight: 3,
        thresholdLow: 7,
        thresholdHigh: 14,
        outcomeIndex: OutcomeCategory.SINGLE_CLEAN,
      };
      expect(entry.frequencyWeight).toBeGreaterThanOrEqual(1);
      expect(entry.frequencyWeight).toBeLessThanOrEqual(5);
      expect(entry.outcomeIndex).toBe(15);
    });
  });

  describe('LineupSlot', () => {
    it('links a roster entry to a batting order position', () => {
      const slot: LineupSlot = {
        rosterId: 'roster-123',
        playerId: 'ruthba01',
        playerName: 'Babe Ruth',
        position: 'RF',
      };
      expect(slot.playerId).toBe('ruthba01');
      expect(slot.position).toBe('RF');
    });
  });

  describe('GamePitcherStats', () => {
    it('tracks in-game pitching performance', () => {
      const stats: GamePitcherStats = {
        IP: 7.0, H: 5, R: 2, ER: 2, BB: 1, SO: 9, HR: 1, BF: 27, pitchCount: 98,
      };
      expect(stats.IP).toBe(7.0);
      expect(stats.SO).toBe(9);
    });
  });

  describe('BattingLine', () => {
    it('captures per-player game batting stats', () => {
      const line: BattingLine = {
        playerId: 'ruthba01',
        AB: 4, R: 2, H: 3, doubles: 1, triples: 0, HR: 1, RBI: 3,
        BB: 1, SO: 0, SB: 0, CS: 0, HBP: 0, SF: 0,
      };
      expect(line.H).toBe(3);
    });
  });

  describe('PitchingLine', () => {
    it('captures per-pitcher game stats with decision', () => {
      const line: PitchingLine = {
        playerId: 'koufasa01',
        IP: 9.0, H: 3, R: 0, ER: 0, BB: 1, SO: 12, HR: 0, BF: 30,
        decision: 'W',
      };
      expect(line.decision).toBe('W');
    });

    it('supports null decision for no-decision pitchers', () => {
      const line: PitchingLine = {
        playerId: 'pitcher01',
        IP: 3.0, H: 4, R: 3, ER: 3, BB: 2, SO: 2, HR: 1, BF: 16,
        decision: null,
      };
      expect(line.decision).toBeNull();
    });
  });

  describe('GameState', () => {
    it('represents a mid-game snapshot', () => {
      const mockTeamState: TeamState = {
        teamId: 'team-1',
        lineup: [],
        currentPitcher: {} as never,
        bullpen: [],
        closer: null,
        benchPlayers: [],
        pitcherStats: {
          IP: 0, H: 0, R: 0, ER: 0, BB: 0, SO: 0, HR: 0, BF: 0, pitchCount: 0,
        },
        pitchersUsed: [],
      };

      const state: GameState = {
        homeTeam: mockTeamState,
        awayTeam: { ...mockTeamState, teamId: 'team-2' },
        inning: 3,
        halfInning: 'top',
        outs: 1,
        bases: { first: null, second: 'player1', third: null },
        homeScore: 2,
        awayScore: 1,
        isComplete: false,
        playByPlay: [],
        currentBatterIndex: 4,
        pitcherFatigue: 2.1,
        baseSituation: 2,
        consecutiveHitsWalks: 0,
      };
      expect(state.inning).toBe(3);
      expect(state.halfInning).toBe('top');
      expect(state.isComplete).toBe(false);
    });
  });

  describe('BoxScore', () => {
    it('has line score and totals', () => {
      const box: BoxScore = {
        lineScore: {
          away: [0, 0, 1, 0, 2, 0, 0, 0, 1],
          home: [1, 0, 0, 3, 0, 0, 1, 0, 0],
        },
        awayHits: 8, homeHits: 11,
        awayErrors: 1, homeErrors: 0,
      };
      expect(box.lineScore.away).toHaveLength(9);
      expect(box.homeHits).toBe(11);
    });
  });

  describe('GameResult', () => {
    it('has all required output fields', () => {
      const result: GameResult = {
        gameId: 'game-001',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        homeScore: 5,
        awayScore: 4,
        innings: 9,
        winningPitcherId: 'pitcher1',
        losingPitcherId: 'pitcher2',
        savePitcherId: 'pitcher3',
        boxScore: {
          lineScore: { away: [0, 0, 1, 0, 2, 0, 0, 0, 1], home: [1, 0, 0, 3, 0, 0, 1, 0, 0] },
          awayHits: 8, homeHits: 11, awayErrors: 1, homeErrors: 0,
        },
        playerBattingLines: [],
        playerPitchingLines: [],
        playByPlay: [],
      };
      expect(result.innings).toBe(9);
      expect(result.savePitcherId).toBe('pitcher3');
    });

    it('supports null save pitcher', () => {
      const result: GameResult = {
        gameId: 'game-002',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        homeScore: 10,
        awayScore: 2,
        innings: 9,
        winningPitcherId: 'pitcher1',
        losingPitcherId: 'pitcher2',
        savePitcherId: null,
        boxScore: {
          lineScore: { away: [0, 0, 0, 1, 0, 0, 1, 0, 0], home: [3, 0, 2, 0, 1, 4, 0, 0, 0] },
          awayHits: 5, homeHits: 14, awayErrors: 2, homeErrors: 0,
        },
        playerBattingLines: [],
        playerPitchingLines: [],
        playByPlay: [],
      };
      expect(result.savePitcherId).toBeNull();
    });
  });
});

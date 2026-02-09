import type { RosterEntry, LineupUpdate } from '@lib/types/roster';
import type { PlayerCard } from '@lib/types/player';

describe('Roster types', () => {
  const mockCard: PlayerCard = {
    playerId: 'ruthba01',
    nameFirst: 'Babe',
    nameLast: 'Ruth',
    seasonYear: 1927,
    battingHand: 'L',
    throwingHand: 'L',
    primaryPosition: 'RF',
    eligiblePositions: ['RF', 'LF', '1B'],
    isPitcher: false,
    card: Array(35).fill(0),
    powerRating: 21,
    archetype: { byte33: 1, byte34: 0 },
    speed: 0.45,
    power: 0.426,
    discipline: 0.78,
    contactRate: 0.86,
    fieldingPct: 0.968,
    range: 0.55,
    arm: 0.70,
  };

  describe('RosterEntry', () => {
    it('represents a starter in the lineup', () => {
      const entry: RosterEntry = {
        id: 'roster-001',
        playerId: 'ruthba01',
        playerCard: mockCard,
        rosterSlot: 'starter',
        lineupOrder: 4,
        lineupPosition: 'RF',
      };
      expect(entry.rosterSlot).toBe('starter');
      expect(entry.lineupOrder).toBe(4);
      expect(entry.lineupPosition).toBe('RF');
    });

    it('represents a bench player', () => {
      const entry: RosterEntry = {
        id: 'roster-002',
        playerId: 'benchp01',
        playerCard: { ...mockCard, playerId: 'benchp01' },
        rosterSlot: 'bench',
        lineupOrder: null,
        lineupPosition: null,
      };
      expect(entry.rosterSlot).toBe('bench');
      expect(entry.lineupOrder).toBeNull();
    });

    it('supports all roster slot types', () => {
      const slots: RosterEntry['rosterSlot'][] = [
        'starter', 'bench', 'rotation', 'bullpen', 'closer',
      ];
      expect(slots).toHaveLength(5);
    });
  });

  describe('LineupUpdate', () => {
    it('specifies a lineup position change', () => {
      const update: LineupUpdate = {
        rosterId: 'roster-001',
        lineupOrder: 3,
        lineupPosition: '1B',
        rosterSlot: 'starter',
      };
      expect(update.lineupOrder).toBe(3);
      expect(update.lineupPosition).toBe('1B');
    });

    it('can move a player to bench (null lineup)', () => {
      const update: LineupUpdate = {
        rosterId: 'roster-001',
        lineupOrder: null,
        lineupPosition: null,
        rosterSlot: 'bench',
      };
      expect(update.lineupOrder).toBeNull();
      expect(update.rosterSlot).toBe('bench');
    });
  });
});

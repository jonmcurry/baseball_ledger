import type {
  CardValue,
  Position,
  PlayerArchetype,
  PitcherAttributes,
  PlayerCard,
} from '@lib/types/player';
import { generateApbaCard, generatePitcherApbaCard } from '@lib/card-generator/apba-card-generator';

describe('Player types', () => {
  describe('CardValue', () => {
    it('is a number alias (0-42 range)', () => {
      const val: CardValue = 13;
      expect(val).toBe(13);
    });
  });

  describe('Position', () => {
    it('accepts all valid position strings', () => {
      const positions: Position[] = [
        'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH',
        'SP', 'RP', 'CL',
      ];
      expect(positions).toHaveLength(12);
    });
  });

  describe('PlayerArchetype', () => {
    it('encodes byte33 and byte34 flags', () => {
      const standardRH: PlayerArchetype = { byte33: 7, byte34: 0 };
      expect(standardRH.byte33).toBe(7);

      const speedster: PlayerArchetype = { byte33: 6, byte34: 0 };
      expect(speedster.byte33).toBe(6);

      const powerHitter: PlayerArchetype = { byte33: 1, byte34: 0 };
      expect(powerHitter.byte33).toBe(1);
    });
  });

  describe('PitcherAttributes', () => {
    it('has all required pitching fields', () => {
      const pitcher: PitcherAttributes = {
        role: 'SP',
        grade: 15,
        stamina: 7.2,
        era: 1.12,
        whip: 0.878,
        k9: 10.3,
        bb9: 1.8,
        hr9: 0.5,
        usageFlags: ['Y', 'Z'],
        isReliever: false,
      };
      expect(pitcher.grade).toBe(15);
      expect(pitcher.role).toBe('SP');
      expect(pitcher.usageFlags).toContain('Y');
    });

    it('supports reliever configuration', () => {
      const reliever: PitcherAttributes = {
        role: 'CL',
        grade: 12,
        stamina: 1.1,
        era: 2.10,
        whip: 1.05,
        k9: 12.0,
        bb9: 2.5,
        hr9: 0.7,
        usageFlags: ['W', 'X'],
        isReliever: true,
      };
      expect(reliever.isReliever).toBe(true);
      expect(reliever.role).toBe('CL');
    });
  });

  describe('PlayerCard', () => {
    it('has identity, card, and attribute fields', () => {
      const card: PlayerCard = {
        playerId: 'ruthba01',
        nameFirst: 'Babe',
        nameLast: 'Ruth',
        seasonYear: 1927,
        battingHand: 'L',
        throwingHand: 'L',
        primaryPosition: 'RF',
        eligiblePositions: ['RF', 'LF', '1B'],
        isPitcher: false,
        apbaCard: generateApbaCard({
          PA: 600, walkRate: 0.15, strikeoutRate: 0.10, homeRunRate: 0.10,
          singleRate: 0.15, doubleRate: 0.05, tripleRate: 0.01, sbRate: 0.10,
          iso: 0.350, hbpRate: 0.005, sfRate: 0.01, shRate: 0, gdpRate: 0.02,
        }, { byte33: 1, byte34: 0 }),
        card: Array(35).fill(0) as CardValue[],
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
      expect(card.playerId).toBe('ruthba01');
      expect(card.card).toHaveLength(35);
      expect(card.powerRating).toBe(21);
      expect(card.isPitcher).toBe(false);
      expect(card.pitching).toBeUndefined();
    });

    it('supports pitcher card with pitching attributes', () => {
      const card: PlayerCard = {
        playerId: 'koufasa01',
        nameFirst: 'Sandy',
        nameLast: 'Koufax',
        seasonYear: 1966,
        battingHand: 'R',
        throwingHand: 'L',
        primaryPosition: 'SP',
        eligiblePositions: ['SP'],
        isPitcher: true,
        apbaCard: generatePitcherApbaCard(),
        card: Array(35).fill(0) as CardValue[],
        powerRating: 13,
        archetype: { byte33: 0, byte34: 6 },
        speed: 0.2,
        power: 0.05,
        discipline: 0.15,
        contactRate: 0.4,
        fieldingPct: 0.95,
        range: 0.6,
        arm: 0.85,
        pitching: {
          role: 'SP',
          grade: 15,
          stamina: 7.5,
          era: 1.73,
          whip: 0.855,
          k9: 9.28,
          bb9: 1.62,
          hr9: 0.67,
          usageFlags: ['Y', 'Z'],
          isReliever: false,
        },
      };
      expect(card.isPitcher).toBe(true);
      expect(card.pitching?.grade).toBe(15);
    });
  });
});

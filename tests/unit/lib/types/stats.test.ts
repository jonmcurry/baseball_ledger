import type { BattingStats, PitchingStats } from '@lib/types/stats';

describe('Stats types', () => {
  describe('BattingStats', () => {
    it('has all counting stats', () => {
      const stats: BattingStats = {
        G: 154, AB: 590, R: 177, H: 204,
        doubles: 44, triples: 16, HR: 59, RBI: 171,
        SB: 17, CS: 4, BB: 145, SO: 81,
        IBB: 0, HBP: 4, SH: 0, SF: 7, GIDP: 8,
        BA: 0.346, OBP: 0.489, SLG: 0.772, OPS: 1.261,
      };
      expect(stats.HR).toBe(59);
      expect(stats.OPS).toBeCloseTo(1.261);
    });
  });

  describe('PitchingStats', () => {
    it('has all counting and derived stats', () => {
      const stats: PitchingStats = {
        G: 41, GS: 41, W: 31, L: 4, SV: 0,
        IP: 346.2, H: 264, R: 101, ER: 87, HR: 17,
        BB: 58, SO: 239, HBP: 3,
        BF: 1366, WP: 5, BK: 0,
        CG: 30, SHO: 4, HLD: 0, BS: 0,
        ERA: 2.26, WHIP: 0.930,
      };
      expect(stats.W).toBe(31);
      expect(stats.ERA).toBeCloseTo(2.26);
    });
  });
});

import {
  assignDivisions,
  type DivisionAssignment,
} from '@lib/league/division-assignment';

// ---------------------------------------------------------------------------
// assignDivisions (REQ-LGE-005)
// ---------------------------------------------------------------------------
describe('assignDivisions (REQ-LGE-005)', () => {
  it('returns one assignment per team', () => {
    const result = assignDivisions(8);
    expect(result).toHaveLength(8);
  });

  it('splits teams evenly into AL and NL', () => {
    const result = assignDivisions(12);
    const al = result.filter((r) => r.leagueDivision === 'AL');
    const nl = result.filter((r) => r.leagueDivision === 'NL');
    expect(al.length).toBe(6);
    expect(nl.length).toBe(6);
  });

  it('assigns valid divisions (East/South/West/North)', () => {
    const validDivisions = ['East', 'South', 'West', 'North'];
    const result = assignDivisions(16);
    for (const r of result) {
      expect(validDivisions).toContain(r.division);
    }
  });

  it('assigns unique team indices', () => {
    const result = assignDivisions(20);
    const indices = result.map((r) => r.teamIndex);
    expect(new Set(indices).size).toBe(20);
  });

  it('team indices are 0-based sequential', () => {
    const result = assignDivisions(8);
    const indices = result.map((r) => r.teamIndex).sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  // Edge cases: specific team counts
  describe('4 teams', () => {
    const result = assignDivisions(4);

    it('splits 2 AL, 2 NL', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      const nl = result.filter((r) => r.leagueDivision === 'NL');
      expect(al.length).toBe(2);
      expect(nl.length).toBe(2);
    });
  });

  describe('8 teams', () => {
    const result = assignDivisions(8);

    it('splits 4 AL, 4 NL', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      const nl = result.filter((r) => r.leagueDivision === 'NL');
      expect(al.length).toBe(4);
      expect(nl.length).toBe(4);
    });

    it('each league has one team per division', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      const alDivs = al.map((r) => r.division);
      expect(new Set(alDivs).size).toBe(4);
    });
  });

  describe('16 teams', () => {
    const result = assignDivisions(16);

    it('splits 8 AL, 8 NL', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      expect(al.length).toBe(8);
    });

    it('each division has exactly 2 teams per league', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      const divCounts = new Map<string, number>();
      for (const r of al) {
        divCounts.set(r.division, (divCounts.get(r.division) ?? 0) + 1);
      }
      for (const count of divCounts.values()) {
        expect(count).toBe(2);
      }
    });
  });

  describe('32 teams', () => {
    const result = assignDivisions(32);

    it('splits 16 AL, 16 NL', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      expect(al.length).toBe(16);
    });

    it('each division has 4 teams per league', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      const divCounts = new Map<string, number>();
      for (const r of al) {
        divCounts.set(r.division, (divCounts.get(r.division) ?? 0) + 1);
      }
      for (const count of divCounts.values()) {
        expect(count).toBe(4);
      }
    });
  });

  describe('12 teams (uneven division)', () => {
    const result = assignDivisions(12);

    it('no division has more than 1 team difference from another in same league', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      const divCounts = new Map<string, number>();
      for (const r of al) {
        divCounts.set(r.division, (divCounts.get(r.division) ?? 0) + 1);
      }
      const counts = [...divCounts.values()];
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      expect(maxCount - minCount).toBeLessThanOrEqual(1);
    });
  });

  describe('6 teams', () => {
    const result = assignDivisions(6);

    it('splits 3 AL, 3 NL', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      expect(al.length).toBe(3);
    });
  });

  // Validation
  it('throws for count less than 4', () => {
    expect(() => assignDivisions(2)).toThrow();
  });

  it('throws for odd count', () => {
    expect(() => assignDivisions(7)).toThrow();
  });

  it('throws for count greater than 32', () => {
    expect(() => assignDivisions(34)).toThrow();
  });
});

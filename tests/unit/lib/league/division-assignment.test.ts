import {
  assignDivisions,
  type DivisionAssignment,
} from '@lib/league/division-assignment';

// ---------------------------------------------------------------------------
// assignDivisions (REQ-LGE-005)
// 3 divisions per league: East, Central, West
// Allowed team counts: 18, 24, 30
// ---------------------------------------------------------------------------
describe('assignDivisions (REQ-LGE-005)', () => {
  it('returns one assignment per team', () => {
    const result = assignDivisions(18);
    expect(result).toHaveLength(18);
  });

  it('splits teams evenly into AL and NL', () => {
    const result = assignDivisions(24);
    const al = result.filter((r) => r.leagueDivision === 'AL');
    const nl = result.filter((r) => r.leagueDivision === 'NL');
    expect(al.length).toBe(12);
    expect(nl.length).toBe(12);
  });

  it('assigns valid divisions (East/Central/West)', () => {
    const validDivisions = ['East', 'Central', 'West'];
    const result = assignDivisions(18);
    for (const r of result) {
      expect(validDivisions).toContain(r.division);
    }
  });

  it('assigns unique team indices', () => {
    const result = assignDivisions(24);
    const indices = result.map((r) => r.teamIndex);
    expect(new Set(indices).size).toBe(24);
  });

  it('team indices are 0-based sequential', () => {
    const result = assignDivisions(18);
    const indices = result.map((r) => r.teamIndex).sort((a, b) => a - b);
    expect(indices).toEqual(Array.from({ length: 18 }, (_, i) => i));
  });

  // Specific team counts
  describe('18 teams', () => {
    const result = assignDivisions(18);

    it('splits 9 AL, 9 NL', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      const nl = result.filter((r) => r.leagueDivision === 'NL');
      expect(al.length).toBe(9);
      expect(nl.length).toBe(9);
    });

    it('each division has 3 teams per league', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      const divCounts = new Map<string, number>();
      for (const r of al) {
        divCounts.set(r.division, (divCounts.get(r.division) ?? 0) + 1);
      }
      expect(divCounts.get('East')).toBe(3);
      expect(divCounts.get('Central')).toBe(3);
      expect(divCounts.get('West')).toBe(3);
    });
  });

  describe('24 teams', () => {
    const result = assignDivisions(24);

    it('splits 12 AL, 12 NL', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      expect(al.length).toBe(12);
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

  describe('30 teams', () => {
    const result = assignDivisions(30);

    it('splits 15 AL, 15 NL', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      expect(al.length).toBe(15);
    });

    it('each division has 5 teams per league', () => {
      const al = result.filter((r) => r.leagueDivision === 'AL');
      const divCounts = new Map<string, number>();
      for (const r of al) {
        divCounts.set(r.division, (divCounts.get(r.division) ?? 0) + 1);
      }
      for (const count of divCounts.values()) {
        expect(count).toBe(5);
      }
    });
  });

  // Validation
  it('throws for count not in allowed set', () => {
    expect(() => assignDivisions(4)).toThrow();
    expect(() => assignDivisions(8)).toThrow();
    expect(() => assignDivisions(16)).toThrow();
    expect(() => assignDivisions(32)).toThrow();
    expect(() => assignDivisions(12)).toThrow();
  });

  it('throws for odd count', () => {
    expect(() => assignDivisions(7)).toThrow();
  });

  it('throws for count below 18', () => {
    expect(() => assignDivisions(2)).toThrow();
  });

  it('throws for count above 30', () => {
    expect(() => assignDivisions(34)).toThrow();
  });
});

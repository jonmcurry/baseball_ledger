import type {
  LeagueStatus,
  ManagerProfile,
  LeagueSummary,
  TeamSummary,
  DivisionStandings,
} from '@lib/types/league';

describe('League types', () => {
  describe('LeagueStatus', () => {
    it('accepts all valid status values', () => {
      const statuses: LeagueStatus[] = [
        'setup', 'drafting', 'regular_season', 'playoffs', 'completed',
      ];
      expect(statuses).toHaveLength(5);
    });
  });

  describe('ManagerProfile', () => {
    it('defines decision thresholds for conservative manager', () => {
      const conservative: ManagerProfile = {
        name: 'Connie Mack',
        style: 'conservative',
        stealAttemptThreshold: 0.2,
        buntThreshold: 0.5,
        hitAndRunThreshold: 0.15,
        pinchHitThreshold: 0.3,
        intentionalWalkThreshold: 0.6,
        pitcherPullThreshold: 0.4,
        aggressiveBaserunning: 0.2,
        lateInningMultiplier: 1.1,
        extraInningMultiplier: 1.2,
      };
      expect(conservative.style).toBe('conservative');
      expect(conservative.stealAttemptThreshold).toBeLessThan(0.5);
    });

    it('defines decision thresholds for aggressive manager', () => {
      const aggressive: ManagerProfile = {
        name: 'Billy Martin',
        style: 'aggressive',
        stealAttemptThreshold: 0.7,
        buntThreshold: 0.3,
        hitAndRunThreshold: 0.6,
        pinchHitThreshold: 0.6,
        intentionalWalkThreshold: 0.3,
        pitcherPullThreshold: 0.7,
        aggressiveBaserunning: 0.8,
        lateInningMultiplier: 1.3,
        extraInningMultiplier: 1.5,
      };
      expect(aggressive.style).toBe('aggressive');
      expect(aggressive.stealAttemptThreshold).toBeGreaterThan(0.5);
    });
  });

  describe('LeagueSummary', () => {
    it('has all required league metadata', () => {
      const league: LeagueSummary = {
        id: 'league-001',
        name: 'Golden Era Classic',
        commissionerId: 'user-123',
        inviteKey: 'abc123def456',
        teamCount: 12,
        yearRangeStart: 1920,
        yearRangeEnd: 1960,
        injuriesEnabled: false,
        status: 'drafting',
        currentDay: 0,
      };
      expect(league.teamCount).toBe(12);
      expect(league.status).toBe('drafting');
    });
  });

  describe('TeamSummary', () => {
    it('supports human-owned teams', () => {
      const team: TeamSummary = {
        id: 'team-001',
        name: 'Sluggers',
        city: 'New York',
        ownerId: 'user-456',
        managerProfile: 'balanced',
        leagueDivision: 'AL',
        division: 'East',
        wins: 87,
        losses: 75,
        runsScored: 720,
        runsAllowed: 695,
      };
      expect(team.ownerId).toBe('user-456');
    });

    it('supports CPU-controlled teams (null ownerId)', () => {
      const cpuTeam: TeamSummary = {
        id: 'team-002',
        name: 'Pitchers',
        city: 'Boston',
        ownerId: null,
        managerProfile: 'analytical',
        leagueDivision: 'NL',
        division: 'West',
        wins: 65,
        losses: 97,
        runsScored: 580,
        runsAllowed: 810,
      };
      expect(cpuTeam.ownerId).toBeNull();
    });
  });

  describe('DivisionStandings', () => {
    it('groups teams by division sorted by wins', () => {
      const standings: DivisionStandings = {
        leagueDivision: 'AL',
        division: 'East',
        teams: [
          {
            id: 't1', name: 'A', city: 'NY', ownerId: 'u1', managerProfile: 'balanced',
            leagueDivision: 'AL', division: 'East', wins: 95, losses: 67,
            runsScored: 800, runsAllowed: 650,
          },
          {
            id: 't2', name: 'B', city: 'BOS', ownerId: 'u2', managerProfile: 'aggressive',
            leagueDivision: 'AL', division: 'East', wins: 87, losses: 75,
            runsScored: 720, runsAllowed: 695,
          },
        ],
      };
      expect(standings.teams[0].wins).toBeGreaterThan(standings.teams[1].wins);
    });
  });
});

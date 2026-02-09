import {
  buildBoxScore,
  buildLineScore,
  assignPitcherDecisions,
  buildEmptyBattingLine,
  buildEmptyPitchingLine,
  type InningRuns,
} from '@lib/simulation/game-result';
import type { PitchingLine } from '@lib/types/game';

// ---------------------------------------------------------------------------
// buildLineScore
// ---------------------------------------------------------------------------
describe('buildLineScore (REQ-SIM-016)', () => {
  it('accumulates runs per inning from play-by-play entries', () => {
    const inningRuns: InningRuns[] = [
      { inning: 1, halfInning: 'top', runs: 0 },
      { inning: 1, halfInning: 'bottom', runs: 2 },
      { inning: 2, halfInning: 'top', runs: 1 },
      { inning: 2, halfInning: 'bottom', runs: 0 },
      { inning: 3, halfInning: 'top', runs: 0 },
      { inning: 3, halfInning: 'bottom', runs: 3 },
    ];
    const result = buildLineScore(inningRuns, 3);
    expect(result.away).toEqual([0, 1, 0]);
    expect(result.home).toEqual([2, 0, 3]);
  });

  it('handles 9-inning game', () => {
    const inningRuns: InningRuns[] = [];
    for (let i = 1; i <= 9; i++) {
      inningRuns.push({ inning: i, halfInning: 'top', runs: i === 1 ? 1 : 0 });
      inningRuns.push({ inning: i, halfInning: 'bottom', runs: i === 5 ? 2 : 0 });
    }
    const result = buildLineScore(inningRuns, 9);
    expect(result.away.length).toBe(9);
    expect(result.home.length).toBe(9);
    expect(result.away[0]).toBe(1);
    expect(result.home[4]).toBe(2);
  });

  it('handles extra innings', () => {
    const inningRuns: InningRuns[] = [];
    for (let i = 1; i <= 11; i++) {
      inningRuns.push({ inning: i, halfInning: 'top', runs: 0 });
      inningRuns.push({ inning: i, halfInning: 'bottom', runs: i === 11 ? 1 : 0 });
    }
    const result = buildLineScore(inningRuns, 11);
    expect(result.away.length).toBe(11);
    expect(result.home.length).toBe(11);
    expect(result.home[10]).toBe(1);
  });

  it('handles skipped bottom of 9th (home team winning)', () => {
    const inningRuns: InningRuns[] = [];
    for (let i = 1; i <= 9; i++) {
      inningRuns.push({ inning: i, halfInning: 'top', runs: i === 1 ? 3 : 0 });
      if (i < 9) {
        inningRuns.push({ inning: i, halfInning: 'bottom', runs: i === 1 ? 5 : 0 });
      }
    }
    const result = buildLineScore(inningRuns, 9);
    expect(result.away.length).toBe(9);
    // Home may have shorter array if bottom skipped
    expect(result.home.length).toBeLessThanOrEqual(9);
  });
});

// ---------------------------------------------------------------------------
// buildBoxScore
// ---------------------------------------------------------------------------
describe('buildBoxScore (REQ-SIM-016)', () => {
  it('builds box score with line score and totals', () => {
    const lineScore = {
      away: [0, 1, 0, 0, 0, 0, 0, 2, 0],
      home: [1, 0, 0, 0, 3, 0, 0, 0, 0],
    };
    const box = buildBoxScore(lineScore, 7, 5, 1, 2);
    expect(box.lineScore).toEqual(lineScore);
    expect(box.awayHits).toBe(7);
    expect(box.homeHits).toBe(5);
    expect(box.awayErrors).toBe(1);
    expect(box.homeErrors).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// assignPitcherDecisions
// ---------------------------------------------------------------------------
describe('assignPitcherDecisions (REQ-SIM-016)', () => {
  function makePitchingLine(playerId: string, ip: number, isStarter: boolean = false): PitchingLine & { isStarter: boolean; teamSide: 'home' | 'away' } {
    return {
      playerId,
      IP: ip,
      H: 0, R: 0, ER: 0, BB: 0, SO: 0, HR: 0, BF: 0,
      decision: null,
      isStarter,
      teamSide: 'home',
    };
  }

  it('assigns W to winning team starter who pitched 5+ innings', () => {
    const lines = [
      { ...makePitchingLine('sp-home', 7, true), teamSide: 'home' as const },
      { ...makePitchingLine('sp-away', 8, true), teamSide: 'away' as const },
    ];
    const result = assignPitcherDecisions(lines, 5, 3);
    const winner = result.find((l) => l.playerId === 'sp-home');
    expect(winner?.decision).toBe('W');
  });

  it('assigns L to losing team starter', () => {
    const lines = [
      { ...makePitchingLine('sp-home', 7, true), teamSide: 'home' as const },
      { ...makePitchingLine('sp-away', 8, true), teamSide: 'away' as const },
    ];
    const result = assignPitcherDecisions(lines, 5, 3);
    const loser = result.find((l) => l.playerId === 'sp-away');
    expect(loser?.decision).toBe('L');
  });

  it('assigns SV to closer who finished with lead <= 3', () => {
    const lines = [
      { ...makePitchingLine('sp-home', 6, true), teamSide: 'home' as const },
      { ...makePitchingLine('cl-home', 3, false), teamSide: 'home' as const },
      { ...makePitchingLine('sp-away', 9, true), teamSide: 'away' as const },
    ];
    const result = assignPitcherDecisions(lines, 5, 3);
    const closer = result.find((l) => l.playerId === 'cl-home');
    expect(closer?.decision).toBe('SV');
  });

  it('does not assign SV when lead > 3', () => {
    const lines = [
      { ...makePitchingLine('sp-home', 6, true), teamSide: 'home' as const },
      { ...makePitchingLine('cl-home', 3, false), teamSide: 'home' as const },
      { ...makePitchingLine('sp-away', 9, true), teamSide: 'away' as const },
    ];
    const result = assignPitcherDecisions(lines, 8, 3);
    const closer = result.find((l) => l.playerId === 'cl-home');
    expect(closer?.decision).toBeNull();
  });

  it('assigns W to reliever when starter pitched < 5 IP', () => {
    const lines = [
      { ...makePitchingLine('sp-home', 3, true), teamSide: 'home' as const },
      { ...makePitchingLine('rp-home', 6, false), teamSide: 'home' as const },
      { ...makePitchingLine('sp-away', 9, true), teamSide: 'away' as const },
    ];
    const result = assignPitcherDecisions(lines, 5, 3);
    const reliever = result.find((l) => l.playerId === 'rp-home');
    expect(reliever?.decision).toBe('W');
  });
});

// ---------------------------------------------------------------------------
// buildEmptyBattingLine / buildEmptyPitchingLine
// ---------------------------------------------------------------------------
describe('buildEmptyBattingLine / buildEmptyPitchingLine', () => {
  it('creates zeroed batting line with correct playerId', () => {
    const line = buildEmptyBattingLine('player1');
    expect(line.playerId).toBe('player1');
    expect(line.AB).toBe(0);
    expect(line.H).toBe(0);
    expect(line.HR).toBe(0);
    expect(line.RBI).toBe(0);
  });

  it('creates zeroed pitching line with correct playerId', () => {
    const line = buildEmptyPitchingLine('pitcher1');
    expect(line.playerId).toBe('pitcher1');
    expect(line.IP).toBe(0);
    expect(line.H).toBe(0);
    expect(line.ER).toBe(0);
    expect(line.decision).toBeNull();
  });
});

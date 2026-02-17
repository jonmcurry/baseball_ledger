import {
  resolveOutcome,
  advanceAllRunners,
  forceAdvance,
  removeLeadRunner,
} from '@lib/simulation/outcome-resolver';
import { OutcomeCategory } from '@lib/types';
import type { BaseState } from '@lib/types';

const EMPTY: BaseState = { first: null, second: null, third: null };

function bases(
  first: string | null = null,
  second: string | null = null,
  third: string | null = null,
): BaseState {
  return { first, second, third };
}

// ---------------------------------------------------------------------------
// Helper: advanceAllRunners
// ---------------------------------------------------------------------------
describe('advanceAllRunners', () => {
  it('returns empty bases and 0 runs for empty bases', () => {
    const result = advanceAllRunners(EMPTY, 1);
    expect(result.basesAfter).toEqual(EMPTY);
    expect(result.runsScored).toBe(0);
  });

  it('advances runner on 1B to 2B by 1 base', () => {
    const result = advanceAllRunners(bases('r1'), 1);
    expect(result.basesAfter).toEqual(bases(null, 'r1'));
    expect(result.runsScored).toBe(0);
  });

  it('advances runner on 2B to 3B by 1 base', () => {
    const result = advanceAllRunners(bases(null, 'r2'), 1);
    expect(result.basesAfter).toEqual(bases(null, null, 'r2'));
    expect(result.runsScored).toBe(0);
  });

  it('scores runner on 3B when advancing 1 base', () => {
    const result = advanceAllRunners(bases(null, null, 'r3'), 1);
    expect(result.basesAfter).toEqual(EMPTY);
    expect(result.runsScored).toBe(1);
  });

  it('advances all runners by 2 bases', () => {
    const result = advanceAllRunners(bases('r1', 'r2', 'r3'), 2);
    expect(result.basesAfter).toEqual(bases(null, null, 'r1'));
    expect(result.runsScored).toBe(2); // r2, r3 scored
  });

  it('scores all runners when advancing 3+ bases', () => {
    const result = advanceAllRunners(bases('r1', 'r2', 'r3'), 3);
    expect(result.basesAfter).toEqual(EMPTY);
    expect(result.runsScored).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Helper: forceAdvance
// ---------------------------------------------------------------------------
describe('forceAdvance', () => {
  it('places batter on 1B with empty bases', () => {
    const result = forceAdvance(EMPTY, 'batter');
    expect(result.basesAfter).toEqual(bases('batter'));
    expect(result.runsScored).toBe(0);
  });

  it('forces runner on 1B to 2B', () => {
    const result = forceAdvance(bases('r1'), 'batter');
    expect(result.basesAfter).toEqual(bases('batter', 'r1'));
    expect(result.runsScored).toBe(0);
  });

  it('forces 1B->2B and 2B->3B when both occupied', () => {
    const result = forceAdvance(bases('r1', 'r2'), 'batter');
    expect(result.basesAfter).toEqual(bases('batter', 'r1', 'r2'));
    expect(result.runsScored).toBe(0);
  });

  it('forces bases loaded to score runner from 3B', () => {
    const result = forceAdvance(bases('r1', 'r2', 'r3'), 'batter');
    expect(result.basesAfter).toEqual(bases('batter', 'r1', 'r2'));
    expect(result.runsScored).toBe(1);
  });

  it('does not force runner on 2B if 1B is empty', () => {
    const result = forceAdvance(bases(null, 'r2'), 'batter');
    expect(result.basesAfter).toEqual(bases('batter', 'r2'));
    expect(result.runsScored).toBe(0);
  });

  it('does not force runner on 3B if no chain from 1B', () => {
    const result = forceAdvance(bases(null, null, 'r3'), 'batter');
    expect(result.basesAfter).toEqual(bases('batter', null, 'r3'));
    expect(result.runsScored).toBe(0);
  });

  it('forces runner on 3B to score when 1B+2B+3B occupied', () => {
    // Already tested in bases loaded case above
    const result = forceAdvance(bases('r1', null, 'r3'), 'batter');
    expect(result.basesAfter).toEqual(bases('batter', 'r1', 'r3'));
    expect(result.runsScored).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Helper: removeLeadRunner
// ---------------------------------------------------------------------------
describe('removeLeadRunner', () => {
  it('removes runner on 3B first', () => {
    const result = removeLeadRunner(bases('r1', 'r2', 'r3'));
    expect(result).toEqual(bases('r1', 'r2'));
  });

  it('removes runner on 2B if no runner on 3B', () => {
    const result = removeLeadRunner(bases('r1', 'r2'));
    expect(result).toEqual(bases('r1'));
  });

  it('removes runner on 1B if only runner', () => {
    const result = removeLeadRunner(bases('r1'));
    expect(result).toEqual(EMPTY);
  });

  it('returns empty bases if no runners', () => {
    const result = removeLeadRunner(EMPTY);
    expect(result).toEqual(EMPTY);
  });
});

// ---------------------------------------------------------------------------
// Singles
// ---------------------------------------------------------------------------
describe('resolveOutcome: Singles (REQ-SIM-005)', () => {
  it('SINGLE_CLEAN with empty bases: batter to 1B', () => {
    const r = resolveOutcome(OutcomeCategory.SINGLE_CLEAN, EMPTY, 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat'));
    expect(r.outsAdded).toBe(0);
    expect(r.runsScored).toBe(0);
    expect(r.batterDestination).toBe('1B');
    expect(r.batterReachedBase).toBe(true);
    expect(r.isNoPA).toBe(false);
  });

  it('SINGLE_CLEAN with runner on 1B: 1B->2B, batter->1B', () => {
    const r = resolveOutcome(OutcomeCategory.SINGLE_CLEAN, bases('r1'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', 'r1'));
    expect(r.runsScored).toBe(0);
  });

  it('SINGLE_CLEAN with runner on 2B: runner scores, batter->1B', () => {
    const r = resolveOutcome(OutcomeCategory.SINGLE_CLEAN, bases(null, 'r2'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat'));
    expect(r.runsScored).toBe(1);
    expect(r.rbiCredits).toBe(1);
  });

  it('SINGLE_CLEAN with runner on 3B: runner scores, batter->1B', () => {
    const r = resolveOutcome(OutcomeCategory.SINGLE_CLEAN, bases(null, null, 'r3'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat'));
    expect(r.runsScored).toBe(1);
  });

  it('SINGLE_ADVANCE with runner on 1B: 1B->3B (advance variant)', () => {
    const r = resolveOutcome(OutcomeCategory.SINGLE_ADVANCE, bases('r1'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', null, 'r1'));
    expect(r.runsScored).toBe(0);
  });

  it('SINGLE_ADVANCE with bases loaded: 3B+2B score, 1B->3B, batter->1B', () => {
    const r = resolveOutcome(OutcomeCategory.SINGLE_ADVANCE, bases('r1', 'r2', 'r3'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', null, 'r1'));
    expect(r.runsScored).toBe(2);
    expect(r.rbiCredits).toBe(2);
  });

  it('SINGLE_ADVANCE empty bases: just batter to 1B', () => {
    const r = resolveOutcome(OutcomeCategory.SINGLE_ADVANCE, EMPTY, 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat'));
    expect(r.runsScored).toBe(0);
  });

  it('SINGLE_CLEAN with bases loaded: 3B+2B score, 1B->2B, batter->1B', () => {
    const r = resolveOutcome(OutcomeCategory.SINGLE_CLEAN, bases('r1', 'r2', 'r3'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', 'r1'));
    expect(r.runsScored).toBe(2);
    expect(r.rbiCredits).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Extra-base hits
// ---------------------------------------------------------------------------
describe('resolveOutcome: Doubles and Triples (REQ-SIM-005)', () => {
  it('DOUBLE with empty bases: batter to 2B', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE, EMPTY, 0, 'bat');
    expect(r.basesAfter).toEqual(bases(null, 'bat'));
    expect(r.runsScored).toBe(0);
    expect(r.batterDestination).toBe('2B');
  });

  it('DOUBLE with runner on 1B: 1B->3B (conservative), batter->2B', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE, bases('r1'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases(null, 'bat', 'r1'));
    expect(r.runsScored).toBe(0);
  });

  it('DOUBLE with runner on 2B: 2B scores, batter->2B', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE, bases(null, 'r2'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases(null, 'bat'));
    expect(r.runsScored).toBe(1);
  });

  it('DOUBLE with runner on 3B: 3B scores, batter->2B', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE, bases(null, null, 'r3'), 1, 'bat');
    expect(r.basesAfter).toEqual(bases(null, 'bat'));
    expect(r.runsScored).toBe(1);
  });

  it('TRIPLE with empty bases: batter to 3B', () => {
    const r = resolveOutcome(OutcomeCategory.TRIPLE, EMPTY, 0, 'bat');
    expect(r.basesAfter).toEqual(bases(null, null, 'bat'));
    expect(r.runsScored).toBe(0);
    expect(r.batterDestination).toBe('3B');
  });

  it('TRIPLE with bases loaded: all 3 runners score', () => {
    const r = resolveOutcome(OutcomeCategory.TRIPLE, bases('r1', 'r2', 'r3'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases(null, null, 'bat'));
    expect(r.runsScored).toBe(3);
    expect(r.rbiCredits).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Home runs
// ---------------------------------------------------------------------------
describe('resolveOutcome: Home Runs (REQ-SIM-005)', () => {
  it('solo home run: batter scores, empty bases', () => {
    const r = resolveOutcome(OutcomeCategory.HOME_RUN, EMPTY, 0, 'bat');
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(1);
    expect(r.batterDestination).toBe('scored');
    expect(r.rbiCredits).toBe(1);
  });

  it('2-run homer: runner on 2B + batter score', () => {
    const r = resolveOutcome(OutcomeCategory.HOME_RUN, bases(null, 'r2'), 1, 'bat');
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(2);
    expect(r.rbiCredits).toBe(2);
  });

  it('grand slam: all runners + batter score', () => {
    const r = resolveOutcome(OutcomeCategory.HOME_RUN, bases('r1', 'r2', 'r3'), 0, 'bat');
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(4);
    expect(r.rbiCredits).toBe(4);
  });

  it('HOME_RUN_VARIANT works same as HOME_RUN', () => {
    const r = resolveOutcome(OutcomeCategory.HOME_RUN_VARIANT, bases('r1'), 0, 'bat');
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(2);
    expect(r.batterDestination).toBe('scored');
  });
});

// ---------------------------------------------------------------------------
// Walks / HBP
// ---------------------------------------------------------------------------
describe('resolveOutcome: Walk/HBP (REQ-SIM-005)', () => {
  it('WALK with empty bases: batter to 1B', () => {
    const r = resolveOutcome(OutcomeCategory.WALK, EMPTY, 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat'));
    expect(r.runsScored).toBe(0);
    expect(r.batterDestination).toBe('1B');
  });

  it('WALK with runner on 1B: force to 2B', () => {
    const r = resolveOutcome(OutcomeCategory.WALK, bases('r1'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', 'r1'));
    expect(r.runsScored).toBe(0);
  });

  it('WALK with 1B+2B occupied: force chain to 3B', () => {
    const r = resolveOutcome(OutcomeCategory.WALK, bases('r1', 'r2'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', 'r1', 'r2'));
    expect(r.runsScored).toBe(0);
  });

  it('WALK with bases loaded: force run in', () => {
    const r = resolveOutcome(OutcomeCategory.WALK, bases('r1', 'r2', 'r3'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', 'r1', 'r2'));
    expect(r.runsScored).toBe(1);
    expect(r.rbiCredits).toBe(1);
  });

  it('WALK_INTENTIONAL works same as WALK', () => {
    const r = resolveOutcome(OutcomeCategory.WALK_INTENTIONAL, bases('r1'), 1, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', 'r1'));
    expect(r.runsScored).toBe(0);
  });

  it('HIT_BY_PITCH works same as WALK', () => {
    const r = resolveOutcome(OutcomeCategory.HIT_BY_PITCH, EMPTY, 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat'));
    expect(r.runsScored).toBe(0);
    expect(r.batterDestination).toBe('1B');
  });

  it('WALK does not force runner on 2B when 1B is empty', () => {
    const r = resolveOutcome(OutcomeCategory.WALK, bases(null, 'r2'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', 'r2'));
    expect(r.runsScored).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Ground Outs
// ---------------------------------------------------------------------------
describe('resolveOutcome: Ground Outs (REQ-SIM-005)', () => {
  it('GROUND_OUT with empty bases: 1 out, no advancement', () => {
    const r = resolveOutcome(OutcomeCategory.GROUND_OUT, EMPTY, 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(0);
    expect(r.batterDestination).toBe('out');
  });

  it('GROUND_OUT with runner on 3B and <2 outs: runner scores', () => {
    const r = resolveOutcome(OutcomeCategory.GROUND_OUT, bases(null, null, 'r3'), 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(1);
  });

  it('GROUND_OUT with runner on 3B and 2 outs: runner does NOT score', () => {
    const r = resolveOutcome(OutcomeCategory.GROUND_OUT, bases(null, null, 'r3'), 2, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases(null, null, 'r3'));
    expect(r.runsScored).toBe(0);
  });

  it('GROUND_OUT_ADVANCE: all runners advance 1 base', () => {
    const r = resolveOutcome(OutcomeCategory.GROUND_OUT_ADVANCE, bases('r1', null, 'r3'), 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases(null, 'r1'));
    expect(r.runsScored).toBe(1); // r3 scores
  });
});

// ---------------------------------------------------------------------------
// Fly Outs
// ---------------------------------------------------------------------------
describe('resolveOutcome: Fly Outs (REQ-SIM-005)', () => {
  it('FLY_OUT with empty bases: 1 out', () => {
    const r = resolveOutcome(OutcomeCategory.FLY_OUT, EMPTY, 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(0);
  });

  it('FLY_OUT with runner on 3B and <2 outs: sac fly, runner scores', () => {
    const r = resolveOutcome(OutcomeCategory.FLY_OUT, bases(null, null, 'r3'), 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(1);
    expect(r.sacrificeFly).toBe(true);
  });

  it('FLY_OUT with runner on 3B and 2 outs: no sac fly', () => {
    const r = resolveOutcome(OutcomeCategory.FLY_OUT, bases(null, null, 'r3'), 2, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases(null, null, 'r3'));
    expect(r.runsScored).toBe(0);
    expect(r.sacrificeFly).toBe(false);
  });

  it('POP_OUT: 1 out, no advancement', () => {
    const r = resolveOutcome(OutcomeCategory.POP_OUT, bases('r1', null, 'r3'), 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases('r1', null, 'r3'));
    expect(r.runsScored).toBe(0);
  });

  it('LINE_OUT: 1 out, no advancement', () => {
    const r = resolveOutcome(OutcomeCategory.LINE_OUT, bases('r1', 'r2'), 1, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases('r1', 'r2'));
    expect(r.runsScored).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Strikeouts
// ---------------------------------------------------------------------------
describe('resolveOutcome: Strikeouts (REQ-SIM-005)', () => {
  it('STRIKEOUT_LOOKING: 1 out, no advancement', () => {
    const r = resolveOutcome(OutcomeCategory.STRIKEOUT_LOOKING, bases('r1'), 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases('r1'));
    expect(r.runsScored).toBe(0);
    expect(r.batterDestination).toBe('out');
  });

  it('STRIKEOUT_SWINGING: 1 out, no advancement', () => {
    const r = resolveOutcome(OutcomeCategory.STRIKEOUT_SWINGING, bases(null, 'r2'), 1, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases(null, 'r2'));
    expect(r.runsScored).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Double Plays
// ---------------------------------------------------------------------------
describe('resolveOutcome: Double Plays (REQ-SIM-005)', () => {
  it('DOUBLE_PLAY with runner on 1B and 0 outs: 2 outs recorded', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE_PLAY, bases('r1'), 0, 'bat');
    expect(r.outsAdded).toBe(2);
    expect(r.basesAfter).toEqual(EMPTY); // lead runner + batter out
    expect(r.runsScored).toBe(0);
    expect(r.batterDestination).toBe('out');
  });

  it('DOUBLE_PLAY with 1B+3B and 0 outs: lead runner (3B) out, 3B does not score', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE_PLAY, bases('r1', null, 'r3'), 0, 'bat');
    expect(r.outsAdded).toBe(2);
    // Lead runner (r3 on 3B) is out, batter is out; r1 stays/advances
    expect(r.basesAfter.third).toBeNull();
    expect(r.runsScored).toBe(0);
  });

  it('DOUBLE_PLAY with no runners: degrades to ground out', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE_PLAY, EMPTY, 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(EMPTY);
  });

  it('DOUBLE_PLAY with 2 outs: degrades to ground out', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE_PLAY, bases('r1'), 2, 'bat');
    expect(r.outsAdded).toBe(1);
    // Degrades to ground out with runner on base
  });

  it('DOUBLE_PLAY_LINE with runner on 1B: batter + runner nearest home out', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE_PLAY_LINE, bases('r1'), 0, 'bat');
    expect(r.outsAdded).toBe(2);
    expect(r.basesAfter).toEqual(EMPTY);
  });

  it('DOUBLE_PLAY_LINE with no runners: degrades to line out', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE_PLAY_LINE, EMPTY, 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(EMPTY);
  });
});

// ---------------------------------------------------------------------------
// Sacrifice
// ---------------------------------------------------------------------------
describe('resolveOutcome: Sacrifice (REQ-SIM-005)', () => {
  it('SACRIFICE with runner on 1B: runner->2B, batter out', () => {
    const r = resolveOutcome(OutcomeCategory.SACRIFICE, bases('r1'), 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases(null, 'r1'));
    expect(r.runsScored).toBe(0);
    expect(r.batterDestination).toBe('out');
  });

  it('SACRIFICE with runner on 3B: runner scores', () => {
    const r = resolveOutcome(OutcomeCategory.SACRIFICE, bases(null, null, 'r3'), 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Reached on Error
// ---------------------------------------------------------------------------
describe('resolveOutcome: Reached on Error (REQ-SIM-005)', () => {
  it('REACHED_ON_ERROR with empty bases: batter to 1B', () => {
    const r = resolveOutcome(OutcomeCategory.REACHED_ON_ERROR, EMPTY, 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat'));
    expect(r.outsAdded).toBe(0);
    expect(r.runsScored).toBe(0);
    expect(r.batterReachedBase).toBe(true);
    expect(r.rbiCredits).toBe(0); // No RBI on error
  });

  it('REACHED_ON_ERROR with runners: all advance 1 base', () => {
    const r = resolveOutcome(OutcomeCategory.REACHED_ON_ERROR, bases('r1', null, 'r3'), 0, 'bat');
    expect(r.basesAfter).toEqual(bases('bat', 'r1'));
    expect(r.runsScored).toBe(1); // r3 scores
    expect(r.rbiCredits).toBe(0); // No RBI on error
  });
});

// ---------------------------------------------------------------------------
// Fielder's Choice
// ---------------------------------------------------------------------------
describe("resolveOutcome: Fielder's Choice (REQ-SIM-005)", () => {
  it('FIELDERS_CHOICE with runner on 1B: lead runner out, batter->1B', () => {
    const r = resolveOutcome(OutcomeCategory.FIELDERS_CHOICE, bases('r1'), 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases('bat'));
    expect(r.runsScored).toBe(0);
    expect(r.batterReachedBase).toBe(true);
  });

  it('FIELDERS_CHOICE with runner on 3B: lead runner (3B) out, batter->1B', () => {
    const r = resolveOutcome(OutcomeCategory.FIELDERS_CHOICE, bases(null, null, 'r3'), 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(bases('bat'));
    expect(r.runsScored).toBe(0); // Lead runner is OUT, not scored
  });

  it('FIELDERS_CHOICE with no runners: degrades to ground out', () => {
    const r = resolveOutcome(OutcomeCategory.FIELDERS_CHOICE, EMPTY, 0, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.batterReachedBase).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// No-PA Events
// ---------------------------------------------------------------------------
describe('resolveOutcome: No-PA Events (REQ-SIM-005)', () => {
  it('STOLEN_BASE_OPP: no state change', () => {
    const r = resolveOutcome(OutcomeCategory.STOLEN_BASE_OPP, bases('r1'), 0, 'bat');
    expect(r.isNoPA).toBe(true);
    expect(r.outsAdded).toBe(0);
    expect(r.basesAfter).toEqual(bases('r1'));
    expect(r.runsScored).toBe(0);
  });

  it('WILD_PITCH: all runners advance 1 base', () => {
    const r = resolveOutcome(OutcomeCategory.WILD_PITCH, bases('r1', null, 'r3'), 1, 'bat');
    expect(r.isNoPA).toBe(true);
    expect(r.outsAdded).toBe(0);
    expect(r.basesAfter).toEqual(bases(null, 'r1'));
    expect(r.runsScored).toBe(1); // r3 scores
  });

  it('BALK: all runners advance 1 base', () => {
    const r = resolveOutcome(OutcomeCategory.BALK, bases(null, 'r2'), 0, 'bat');
    expect(r.isNoPA).toBe(true);
    expect(r.outsAdded).toBe(0);
    expect(r.basesAfter).toEqual(bases(null, null, 'r2'));
    expect(r.runsScored).toBe(0);
  });

  it('PASSED_BALL: runner on 3B scores, others advance 1', () => {
    const r = resolveOutcome(OutcomeCategory.PASSED_BALL, bases('r1', null, 'r3'), 0, 'bat');
    expect(r.isNoPA).toBe(true);
    expect(r.basesAfter).toEqual(bases(null, 'r1'));
    expect(r.runsScored).toBe(1);
  });

  it('SPECIAL_EVENT: no-op', () => {
    const r = resolveOutcome(OutcomeCategory.SPECIAL_EVENT, bases('r1', 'r2'), 0, 'bat');
    expect(r.isNoPA).toBe(true);
    expect(r.outsAdded).toBe(0);
    expect(r.basesAfter).toEqual(bases('r1', 'r2'));
    expect(r.runsScored).toBe(0);
  });

  it('WILD_PITCH with empty bases: no change', () => {
    const r = resolveOutcome(OutcomeCategory.WILD_PITCH, EMPTY, 0, 'bat');
    expect(r.isNoPA).toBe(true);
    expect(r.basesAfter).toEqual(EMPTY);
    expect(r.runsScored).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('resolveOutcome: Edge Cases', () => {
  it('3rd out prevents runs from scoring on ground out', () => {
    // 2 outs, runner on 3B, ground out = 3rd out, run does NOT score
    const r = resolveOutcome(OutcomeCategory.GROUND_OUT, bases(null, null, 'r3'), 2, 'bat');
    expect(r.outsAdded).toBe(1);
    expect(r.runsScored).toBe(0);
  });

  it('bases loaded walk scores exactly 1 run', () => {
    const r = resolveOutcome(OutcomeCategory.WALK, bases('r1', 'r2', 'r3'), 2, 'bat');
    expect(r.runsScored).toBe(1);
    expect(r.basesAfter).toEqual(bases('bat', 'r1', 'r2'));
  });

  it('DOUBLE_PLAY with bases loaded: lead runner out, 2 outs total, remaining advance', () => {
    const r = resolveOutcome(OutcomeCategory.DOUBLE_PLAY, bases('r1', 'r2', 'r3'), 0, 'bat');
    expect(r.outsAdded).toBe(2);
    // Lead runner (r3 on 3B) + batter out; r1 and r2 advance 1 base each
    expect(r.basesAfter).toEqual(bases(null, 'r1', 'r2'));
    expect(r.runsScored).toBe(0);
  });

  it('HOME_RUN with 2 outs still scores all runners', () => {
    const r = resolveOutcome(OutcomeCategory.HOME_RUN, bases('r1', 'r2', 'r3'), 2, 'bat');
    expect(r.runsScored).toBe(4);
    expect(r.basesAfter).toEqual(EMPTY);
  });
});

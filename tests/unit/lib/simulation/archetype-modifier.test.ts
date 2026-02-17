import {
  applyArchetypeModifier,
  isPowerArchetype,
  isSpeedArchetype,
  isContactSpeedArchetype,
  computeArchetypeFlags,
  ARCHETYPE_SPEED,
  ARCHETYPE_POWER,
  ARCHETYPE_CONTACT,
  ARCHETYPE_DEFENSE,
} from '@lib/simulation/archetype-modifier';
import { OutcomeCategory } from '@lib/types';
import type { PlayerArchetype } from '@lib/types';
import { SeededRNG } from '@lib/rng/seeded-rng';

// Archetype constants
const POWER_RH: PlayerArchetype = { byte33: 1, byte34: 0 };
const POWER_LH: PlayerArchetype = { byte33: 1, byte34: 1 };
const SPEED: PlayerArchetype = { byte33: 6, byte34: 0 };
const CONTACT_SPEED: PlayerArchetype = { byte33: 0, byte34: 2 };
const ELITE_DEFENSE: PlayerArchetype = { byte33: 8, byte34: 0 };
const STANDARD_RH: PlayerArchetype = { byte33: 7, byte34: 0 };
const STANDARD_LH: PlayerArchetype = { byte33: 0, byte34: 1 };
const PITCHER: PlayerArchetype = { byte33: 0, byte34: 6 };
const UTILITY: PlayerArchetype = { byte33: 5, byte34: 0 };

// ---------------------------------------------------------------------------
// Archetype detection helpers
// ---------------------------------------------------------------------------
describe('isPowerArchetype', () => {
  it('returns true for (1,0) power RH', () => {
    expect(isPowerArchetype(POWER_RH)).toBe(true);
  });

  it('returns true for (1,1) power LH', () => {
    expect(isPowerArchetype(POWER_LH)).toBe(true);
  });

  it('returns false for speed archetype', () => {
    expect(isPowerArchetype(SPEED)).toBe(false);
  });

  it('returns false for standard archetypes', () => {
    expect(isPowerArchetype(STANDARD_RH)).toBe(false);
    expect(isPowerArchetype(STANDARD_LH)).toBe(false);
  });
});

describe('isSpeedArchetype', () => {
  it('returns true for (6,0) speed', () => {
    expect(isSpeedArchetype(SPEED)).toBe(true);
  });

  it('returns false for power archetype', () => {
    expect(isSpeedArchetype(POWER_RH)).toBe(false);
  });
});

describe('isContactSpeedArchetype', () => {
  it('returns true for (0,2) contact+speed', () => {
    expect(isContactSpeedArchetype(CONTACT_SPEED)).toBe(true);
  });

  it('returns false for speed archetype', () => {
    expect(isContactSpeedArchetype(SPEED)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Power archetype modifier (SERD: baked into card, no runtime modifier)
// ---------------------------------------------------------------------------
describe('applyArchetypeModifier: Power (1,0)/(1,1) (SERD - no runtime modifier)', () => {
  it('does not modify FLY_OUT for power hitters (baked into card)', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.FLY_OUT, POWER_RH, rng);
    expect(result.outcome).toBe(OutcomeCategory.FLY_OUT);
    expect(result.modified).toBe(false);
  });

  it('does not modify any outcome for power hitters', () => {
    const rng = new SeededRNG(42);
    const outcomes = [
      OutcomeCategory.SINGLE_CLEAN,
      OutcomeCategory.DOUBLE,
      OutcomeCategory.GROUND_OUT,
      OutcomeCategory.WALK,
      OutcomeCategory.STRIKEOUT_SWINGING,
      OutcomeCategory.FLY_OUT,
      OutcomeCategory.HOME_RUN,
    ];

    for (const oc of outcomes) {
      const result = applyArchetypeModifier(oc, POWER_RH, rng);
      expect(result.outcome).toBe(oc);
      expect(result.modified).toBe(false);
    }
  });

  it('power LH (1,1) also has no runtime modifier', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.FLY_OUT, POWER_LH, rng);
    expect(result.outcome).toBe(OutcomeCategory.FLY_OUT);
    expect(result.modified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Speed archetype modifier
// ---------------------------------------------------------------------------
describe('applyArchetypeModifier: Speed (6,0) (REQ-SIM-004 step 6)', () => {
  it('flags stolen base opportunity on SINGLE_CLEAN', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.SINGLE_CLEAN, SPEED, rng);
    expect(result.outcome).toBe(OutcomeCategory.SINGLE_CLEAN); // Outcome unchanged
    expect(result.triggerStolenBaseCheck).toBe(true);
  });

  it('flags stolen base opportunity on SINGLE_ADVANCE', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.SINGLE_ADVANCE, SPEED, rng);
    expect(result.triggerStolenBaseCheck).toBe(true);
  });

  it('flags stolen base opportunity on WALK', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.WALK, SPEED, rng);
    expect(result.triggerStolenBaseCheck).toBe(true);
  });

  it('flags stolen base opportunity on HIT_BY_PITCH', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.HIT_BY_PITCH, SPEED, rng);
    expect(result.triggerStolenBaseCheck).toBe(true);
  });

  it('does not flag SB on doubles, triples, HR', () => {
    const rng = new SeededRNG(42);
    for (const oc of [OutcomeCategory.DOUBLE, OutcomeCategory.TRIPLE, OutcomeCategory.HOME_RUN]) {
      const result = applyArchetypeModifier(oc, SPEED, rng);
      expect(result.triggerStolenBaseCheck).toBe(false);
    }
  });

  it('does not flag SB on outs', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.GROUND_OUT, SPEED, rng);
    expect(result.triggerStolenBaseCheck).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Contact+Speed archetype modifier (SERD: baked into card, no runtime modifier)
// ---------------------------------------------------------------------------
describe('applyArchetypeModifier: Contact+Speed (0,2) (SERD - no runtime modifier)', () => {
  it('does not modify STRIKEOUT_SWINGING (contact bonus baked into card)', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.STRIKEOUT_SWINGING, CONTACT_SPEED, rng);
    expect(result.outcome).toBe(OutcomeCategory.STRIKEOUT_SWINGING);
    expect(result.modified).toBe(false);
  });

  it('does not modify STRIKEOUT_LOOKING (contact bonus baked into card)', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.STRIKEOUT_LOOKING, CONTACT_SPEED, rng);
    expect(result.outcome).toBe(OutcomeCategory.STRIKEOUT_LOOKING);
    expect(result.modified).toBe(false);
  });

  it('does not modify any outcome for contact+speed hitters', () => {
    const rng = new SeededRNG(42);
    const outcomes = [
      OutcomeCategory.SINGLE_CLEAN,
      OutcomeCategory.FLY_OUT,
      OutcomeCategory.WALK,
      OutcomeCategory.HOME_RUN,
      OutcomeCategory.STRIKEOUT_SWINGING,
      OutcomeCategory.STRIKEOUT_LOOKING,
      OutcomeCategory.GROUND_OUT,
      OutcomeCategory.DOUBLE,
    ];

    for (const oc of outcomes) {
      const result = applyArchetypeModifier(oc, CONTACT_SPEED, rng);
      expect(result.outcome).toBe(oc);
      expect(result.modified).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Non-modifying archetypes
// ---------------------------------------------------------------------------
describe('applyArchetypeModifier: Non-modifying archetypes', () => {
  it('elite defense (8,0) does not modify any outcome', () => {
    const rng = new SeededRNG(42);
    const outcomes = [
      OutcomeCategory.FLY_OUT,
      OutcomeCategory.STRIKEOUT_SWINGING,
      OutcomeCategory.SINGLE_CLEAN,
      OutcomeCategory.HOME_RUN,
    ];

    for (const oc of outcomes) {
      const result = applyArchetypeModifier(oc, ELITE_DEFENSE, rng);
      expect(result.outcome).toBe(oc);
      expect(result.modified).toBe(false);
    }
  });

  it('standard RH (7,0) does not modify any outcome', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.FLY_OUT, STANDARD_RH, rng);
    expect(result.outcome).toBe(OutcomeCategory.FLY_OUT);
    expect(result.modified).toBe(false);
  });

  it('standard LH (0,1) does not modify any outcome', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.STRIKEOUT_LOOKING, STANDARD_LH, rng);
    expect(result.outcome).toBe(OutcomeCategory.STRIKEOUT_LOOKING);
    expect(result.modified).toBe(false);
  });

  it('pitcher (0,6) does not modify any outcome', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.FLY_OUT, PITCHER, rng);
    expect(result.outcome).toBe(OutcomeCategory.FLY_OUT);
    expect(result.modified).toBe(false);
  });

  it('utility (5,0) does not modify any outcome', () => {
    const rng = new SeededRNG(42);
    const result = applyArchetypeModifier(OutcomeCategory.STRIKEOUT_SWINGING, UTILITY, rng);
    expect(result.outcome).toBe(OutcomeCategory.STRIKEOUT_SWINGING);
    expect(result.modified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Archetype Bitfield Flags (Ghidra confirmed, offset 0x44)
// ---------------------------------------------------------------------------
describe('Archetype bitfield constants (Ghidra confirmed)', () => {
  it('ARCHETYPE_SPEED is 0x01', () => {
    expect(ARCHETYPE_SPEED).toBe(0x01);
  });

  it('ARCHETYPE_POWER is 0x02', () => {
    expect(ARCHETYPE_POWER).toBe(0x02);
  });

  it('ARCHETYPE_CONTACT is 0x04', () => {
    expect(ARCHETYPE_CONTACT).toBe(0x04);
  });

  it('ARCHETYPE_DEFENSE is 0x08', () => {
    expect(ARCHETYPE_DEFENSE).toBe(0x08);
  });
});

describe('computeArchetypeFlags() (Ghidra byte33/byte34 -> bitfield)', () => {
  it('(6,0) speed -> ARCHETYPE_SPEED', () => {
    expect(computeArchetypeFlags(SPEED)).toBe(ARCHETYPE_SPEED);
  });

  it('(1,0) power RH -> ARCHETYPE_POWER', () => {
    expect(computeArchetypeFlags(POWER_RH)).toBe(ARCHETYPE_POWER);
  });

  it('(1,1) power LH -> ARCHETYPE_POWER', () => {
    expect(computeArchetypeFlags(POWER_LH)).toBe(ARCHETYPE_POWER);
  });

  it('(0,2) contact+speed -> ARCHETYPE_CONTACT | ARCHETYPE_SPEED', () => {
    expect(computeArchetypeFlags(CONTACT_SPEED)).toBe(ARCHETYPE_CONTACT | ARCHETYPE_SPEED);
  });

  it('(8,0) elite defense -> ARCHETYPE_DEFENSE', () => {
    expect(computeArchetypeFlags(ELITE_DEFENSE)).toBe(ARCHETYPE_DEFENSE);
  });

  it('(7,0) standard RH -> 0x00 (no flags)', () => {
    expect(computeArchetypeFlags(STANDARD_RH)).toBe(0x00);
  });

  it('(0,1) standard LH -> 0x00 (no flags)', () => {
    expect(computeArchetypeFlags(STANDARD_LH)).toBe(0x00);
  });

  it('(0,6) pitcher -> 0x00 (no flags)', () => {
    expect(computeArchetypeFlags(PITCHER)).toBe(0x00);
  });

  it('(5,0) utility -> 0x00 (no flags)', () => {
    expect(computeArchetypeFlags(UTILITY)).toBe(0x00);
  });

  it('supports bitwise checks matching Ghidra symbol outcomes', () => {
    // Symbol 43 (+): (speed|power) &0x03 != 0 -> hit
    const speedFlags = computeArchetypeFlags(SPEED);
    const powerFlags = computeArchetypeFlags(POWER_RH);
    const stdFlags = computeArchetypeFlags(STANDARD_RH);

    expect(speedFlags & 0x03).not.toBe(0);  // speed -> hit on symbol 43
    expect(powerFlags & 0x03).not.toBe(0);  // power -> hit on symbol 43
    expect(stdFlags & 0x03).toBe(0);         // standard -> no hit on symbol 43

    // Symbol 46 (.): (contact|defense) &0x0C != 0 -> out
    const contactFlags = computeArchetypeFlags(CONTACT_SPEED);
    const defenseFlags = computeArchetypeFlags(ELITE_DEFENSE);

    expect(contactFlags & 0x0C).not.toBe(0); // contact -> out on symbol 46
    expect(defenseFlags & 0x0C).not.toBe(0); // defense -> out on symbol 46
    expect(speedFlags & 0x0C).toBe(0);        // speed -> no out on symbol 46
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------
describe('applyArchetypeModifier: Determinism', () => {
  it('produces identical results with same seed', () => {
    const results1: OutcomeCategory[] = [];
    const results2: OutcomeCategory[] = [];

    for (let i = 0; i < 50; i++) {
      const rng1 = new SeededRNG(999);
      const rng2 = new SeededRNG(999);
      results1.push(applyArchetypeModifier(OutcomeCategory.FLY_OUT, POWER_RH, rng1).outcome);
      results2.push(applyArchetypeModifier(OutcomeCategory.FLY_OUT, POWER_RH, rng2).outcome);
    }

    expect(results1).toEqual(results2);
  });
});

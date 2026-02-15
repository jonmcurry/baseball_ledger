# Implementation Plan: Ghidra Findings into Simulation Engine

Based on reverse engineering findings in `docs/ghidra-decompilation-findings.md`.

## Summary of Changes

The Ghidra decompilation of WINBB.EXE revealed 5 key differences between our
current simulation engine and the real APBA BBW 3.0:

| # | Area | Current | Real BBW (Ghidra) |
|---|------|---------|-------------------|
| 1 | IDT active range | [5, 25] | [15, 23] |
| 2 | Grade adjustment | Fatigue only | 5 stacked layers |
| 3 | Platoon | Card modification | Grade modification |
| 4 | Archetype flags | byte33/byte34 pairs | Bitfield at 0x44 |
| 5 | Umpire decision | None | Post-resolution override |

## Checklist

### Phase 1: IDT Active Range Fix
- [ ] Update `IDT_ACTIVE_LOW` from 5 to 15 in `plate-appearance.ts`
- [ ] Update `IDT_ACTIVE_HIGH` from 25 to 23 in `plate-appearance.ts`
- [ ] Update comments and doc strings
- [ ] Update `plate-appearance.test.ts` constant assertions
- [ ] Update `isIDTActive()` test cases for new range
- [ ] Verify realism tests still pass with adjusted ranges

### Phase 2: 5-Layer Grade Adjustment
- [ ] Add `GradeContext` interface to `pitching.ts` (pitcher state, game state)
- [ ] Add `RELIEF_PENALTY = 2`, `FRESH_BONUS = 5`, `FRESH_GRADE_MAX = 20`, `PLATOON_GRADE_MAX = 30`
- [ ] Add `RANDOM_VARIANCE_TABLE` (40-entry signed adjustment table)
- [ ] Implement `computeGameGrade(pitcher, context, rng)` with all 5 layers:
  - Layer 1: Fatigue delta (current grade - start grade)
  - Layer 2: Relief pitcher penalty (-2, unless closer type 7)
  - Layer 3: Fresh pitcher bonus (+5, clamped to 20)
  - Layer 4: Platoon matchup (same-hand: grade += platoon value, clamped to 30)
  - Layer 5: Random variance (random(40) -> table lookup, added to grade)
- [ ] Keep `computeEffectiveGrade()` for removal logic (backward compat)
- [ ] Write tests for each layer independently
- [ ] Write test for all 5 layers stacked
- [ ] Update `resolvePlateAppearance()` doc to reference `computeGameGrade()`

### Phase 3: Platoon Rework
- [ ] Add `computePlatoonGradeAdjustment()` to `platoon.ts`
  - Same-hand matchup: return positive grade adjustment (pitcher advantage)
  - Opposite-hand: return 0 (no adjustment)
  - Switch hitter: always 0 (no same-hand match)
- [ ] Deprecate `applyPlatoonAdjustment()` (card modification)
- [ ] Integrate into `computeGameGrade()` layer 4
- [ ] Update platoon tests for grade-based approach
- [ ] Keep `hasPlatoonAdvantage()` as utility (still useful for UI)

### Phase 4: Archetype Flag Bitfield
- [ ] Add `archetypeFlags: number` field to `PlayerArchetype` interface
- [ ] Add `computeArchetypeFlags(byte33, byte34)` conversion function
- [ ] Define constants: `ARCHETYPE_SPEED = 0x01`, `ARCHETYPE_POWER = 0x02`,
      `ARCHETYPE_CONTACT = 0x04`, `ARCHETYPE_DEFENSE = 0x08`
- [ ] Update `applyArchetypeModifier()` to use bitfield checks
- [ ] Update archetype tests for bitfield approach
- [ ] Preserve backward compat: keep byte33/byte34, add computed flags

### Phase 5: Umpire Decision Post-Check
- [ ] Add `checkUmpireDecision(outcome, rng)` function
- [ ] Umpire can override certain outcomes (force outcome code 2)
- [ ] Integrate as final step in PA resolution
- [ ] Add tests for umpire override scenarios

### Phase 6: Test Adjustments and Validation
- [ ] Run full test suite: `npx vitest run`
- [ ] Adjust realism-check ranges if needed (BA, walk, K rates)
- [ ] Verify determinism tests still pass
- [ ] Verify real APBA card validation tests pass
- [ ] Run TypeScript compiler: `npx tsc --noEmit`

### Phase 7: Finalize
- [ ] Update `docs/changelog.md`
- [ ] Commit to GitHub with descriptive message

## Architecture Decision: Grade Computation Flow

### Before (current):
```
1. applyPlatoonAdjustment(card) -> modified card
2. resolvePlateAppearance(card, simpleGrade, rng) -> result
3. applyArchetypeModifier(outcome, archetype, rng) -> modified outcome
```

### After (matching BBW):
```
1. computeGameGrade(pitcher, context, rng) -> effective grade (5 layers)
2. resolvePlateAppearance(card, effectiveGrade, rng) -> result (IDT [15,23])
3. checkUmpireDecision(outcome, rng) -> final outcome
```

Platoon moves from card modification to grade modification (layer 4).
Archetype flags are used during PA resolution for symbol outcomes (card values 43-48).

## Data Not Yet Extracted

The following data tables exist in WINBB.EXE but their contents have not been
extracted from the binary:

- `DATA[0x382A]`: 24-byte IDT bitmap table (which rows active per card value)
- `DATA[0x382B]`: IDT frequency weight table
- `DATA[0x3802]`: 40-byte random variance adjustment table

For now, we use reasonable defaults:
- Bitmap: all IDT rows active (no gating)
- Variance table: small signed adjustments centered around 0

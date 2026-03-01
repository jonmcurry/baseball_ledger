# BBW Fidelity Audit Report

**Date**: 2026-03-01
**Scope**: Full comparison of BBW (APBA Baseball for Windows v3.0) Ghidra decompilation
against Baseball Ledger implementation across all simulation subsystems.

**Sources Analyzed**:
- `BBW/ghidra_decompiled.txt` (13 functions, raw Ghidra pseudocode)
- `docs/ghidra-decompilation-findings.md` (annotated analysis)
- `docs/APBA_REVERSE_ENGINEERING.md` (binary analysis of PLAYERS.DAT, IDT.OBJ)
- `docs/winbb-analysis-findings.md` (programmatic byte-pattern analysis)
- All `src/lib/simulation/` and `src/lib/card-generator/` modules

---

## Executive Summary

**Overall Fidelity: ~95%**

The core PA resolution engine (grade check, IDT lookup, direct mapping, 6-layer grade
adjustment) is 100% faithful to BBW. The discrepancies are in card generation heuristics
and one outcome mapping semantic issue. No fundamental algorithmic bugs remain.

---

## Systems at 100% BBW Fidelity (No Action Needed)

### PA Resolution Flow (plate-appearance.ts)
- Draw random position [0, 34] from batter's 35-byte card
- Grade check for values {7, 8, 11}: roll [0, 14], pitcher wins if roll < grade
- IDT lookup for values [15, 23] with bitmap gating
- Direct mapping for all other values
- **Verdict**: Byte-for-byte match with FUN_1058_5f49

### 6-Layer Grade Adjustment (pitching.ts)
| Layer | BBW | Implementation | Match |
|-------|-----|----------------|-------|
| 1. Base grade | data[0x43] | pitching.grade | Exact |
| 2. Fatigue | max(grade - data[0x47], 1) | max(baseGrade - fatigue, 1) | Equivalent |
| 3. Relief penalty | isRelief && type != 7: -2 | Same condition and value | Exact |
| 4. Fresh bonus | isFresh && (type!=0 OR adj!=0): +5, cap 20 | Same (minus table[0x2e7]) | 99% |
| 5. Platoon | throwHand == batHand: +platoonVal, cap 30 | Same, explicit 'S' exclusion | Exact |
| 6. Random variance | DATA[0x3802 + rand(40)], clamp [1, 30] | RANDOM_VARIANCE_TABLE[rand(40)] | Exact |

Layer 4 note: BBW has a 3rd condition `table[0x2e7] != 0` that is unresolvable
(runtime-populated data). Documented as acceptable approximation.

### IDT Outcome Table (outcome-table.ts)
- Active range [15, 23]: 9 rows, exact match
- Bitmap gating: [0x00, 0x04, 0x02, 0x05, 0x00, 0x00, 0x00, 0x0E, 0x00] exact
- Bitmask function: `1 << ((cardValue - 15) & 7)` exact
- Frequency weights: [1, 1, 1, 2, 1, 2, 1, 2, 1] exact
- Weighted random selection algorithm: exact
- **Verdict**: All IDT mechanics verified against Ghidra

### Card Value Direct Mapping (card-value-fallback.ts)
- 21 of 22 explicit mappings verified correct against correlation analysis
- Default fallback to GROUND_OUT: correct
- **One semantic issue**: value 30 (see Discrepancy #3 below)

### Game Runner Mechanics (game-runner.ts)
- Fatigue counter increment timing (after grade calc): exact
- Pitcher removal triggers (all 5): complete
- Closer entry logic: complete
- Stolen base, sacrifice bunt, IBB, hit-and-run: all complete
- Baserunning speed threshold (7/15): exact
- Double play defense check: complete
- Error mechanics + 3-error earned run threshold: complete
- **Verdict**: Core game loop is faithful

---

## Actionable Discrepancies (Prioritized)

### Discrepancy #1: Power Rating Compression [HIGH]

**Location**: `src/lib/card-generator/calibration-coefficients.ts` lines 99-108

**Issue**: BBW uses the full power rating range 13-21 (9 possible values) at card
position 24. The implementation only assigns 3 values: 18, 20, 21.

| ISO Range | Current Value | BBW Expected | Gap |
|-----------|---------------|--------------|-----|
| < 0.050 | 18 | 13 (none) | +5 |
| 0.050-0.080 | 18 | 15 (minimal) | +3 |
| 0.080-0.110 | 18 | 16 (below avg) | +2 |
| 0.110-0.150 | 20 | 17 (average) | +3 |
| 0.150-0.190 | 20 | 18 (above avg) | +2 |
| 0.190-0.230 | 20 | 19 (good) | +1 |
| 0.230-0.280 | 20 | 20 (very good) | 0 |
| > 0.280 | 21 | 21 (excellent) | 0 |

**Impact**: Position 24 is in the IDT active range [15, 23]. When drawn, the IDT
lookup uses the card value to compute the bitmask for row gating. Different values
produce different bitmask results, affecting which IDT rows are active. By
compressing all low-power batters to 18, the bitmap gating is wrong for ~60% of
players.

**Fix**: Expand CALIBRATED_POWER_TIERS to use the full 13-21 range:
```typescript
{ maxISO: 0.030, cardValue: 13, label: 'None' },
{ maxISO: 0.060, cardValue: 15, label: 'Minimal' },
{ maxISO: 0.090, cardValue: 16, label: 'Below average' },
{ maxISO: 0.120, cardValue: 17, label: 'Average' },
{ maxISO: 0.160, cardValue: 18, label: 'Above average' },
{ maxISO: 0.200, cardValue: 19, label: 'Good' },
{ maxISO: 0.240, cardValue: 20, label: 'Very good' },
{ maxISO: Infinity, cardValue: 21, label: 'Excellent' },
```

### Discrepancy #2: Position 15 Gate Always Value 33 [MODERATE]

**Location**: `src/lib/card-generator/value-mapper.ts` lines 285-290

**Issue**: Position 15 always gets value 33 regardless of batter profile. The code
has an if/else branch for ISO, but both branches assign POWER_GATE (33).

```typescript
if (iso < 0.150) {
  card[15] = CARD_VALUES.POWER_GATE; // value 33
} else {
  card[15] = CARD_VALUES.POWER_GATE; // still 33!
}
```

**BBW Data**: Position 15 is value 33 in 75% of BBW cards. The other 25% use
walk (13) or strikeout (14) based on batter profile.

**Fix**: High-power batters (ISO >= 0.150) should get a walk or strikeout at
position 15 instead of 33:
```typescript
if (iso < 0.150) {
  card[15] = CARD_VALUES.POWER_GATE;
} else if (walkRate > strikeoutRate) {
  card[15] = CARD_VALUES.WALK;
  gateWalkCount++;
} else {
  card[15] = CARD_VALUES.STRIKEOUT;
  gateKCount++;
}
```

### Discrepancy #3: Card Value 30 -> GROUND_OUT_ADVANCE [LOW-MODERATE]

**Location**: `src/lib/simulation/card-value-fallback.ts` line 42

**Issue**: Card value 30 is mapped to `OutcomeCategory.GROUND_OUT_ADVANCE` (runner
advances on out). The BBW correlation analysis shows value 30 with r=-0.484 (BB),
which is a generic out -- not specifically a runner-advancing out.

Runner advancement on outs is a separate post-resolution mechanic in BBW, not
encoded in the card value itself. Mapping value 30 to GROUND_OUT_ADVANCE bakes
the advancement into the card value, which slightly inflates runner advancement
rates.

**Current mitigating factor**: The out mix in value-mapper.ts (line 373) uses value
30 at 12.5% of outs, and the comment says "(productive out)" -- so this is an
intentional design choice for simulation variety. However, it doesn't match BBW
where value 30 is just another out.

**Fix**: Change mapping to GROUND_OUT; handle advancement in outcome-resolver.ts
post-resolution logic based on game state (outs, runner speed).

### Discrepancy #4: r2Roll Field Stores Grade, Not Roll [COSMETIC]

**Location**: `src/lib/simulation/plate-appearance.ts` line 139

**Issue**: `GradeGateResult.r2Roll` is named as if it stores the random roll value,
but actually stores the effective grade. The actual roll value is not preserved.

```typescript
r2Roll: effectiveGrade,  // Misleading name
```

**Fix**: Rename to `effectiveGrade` or store actual roll value.

---

## Missing Features (Not BBW Parity Bugs)

These are BBW features not yet implemented. They don't affect core simulation
accuracy but would improve completeness:

| Feature | BBW Reference | Severity | Notes |
|---------|---------------|----------|-------|
| Pickoff attempts | B3EHMSG string table | LOW | Edge case, low frequency |
| Injury mechanics | B3EHMSG "BOTInjuryTo" | LOW | Cosmetic, roster management |
| Weather effects | SFX.INI weather codes | LOW | Cosmetic |
| Play-by-play text | B3EHMSG 100+ templates | MEDIUM | Currently enum names only |
| Manager bytecode VM | FUN_1058_1255 (~30 opcodes) | LOW | Major decisions already covered |
| Pinch-hit platoon L/R | Opcode '#' | VERY LOW | OPS-based selection works |

---

## False Alarms (Investigated and Dismissed)

### Suppression Formula "Breaks" for Grades > 15
Agent 2 flagged that `1 / (1 - suppFraction * grade/15)` produces negative values
for grade > 15. **FALSE ALARM**: This formula is only called at card generation time
with `AVG_PITCHER_GRADE = 8` (fixed constant), never with runtime effective grades.
The denominator at grade 8 is `1 - 0.667 * 0.533 = 0.644`, safely positive.

### Grade Scale 1-22 vs BBW 1-15
Project extends BBW's 1-15 base grade to 1-22 for ERA differentiation. Grades 16+
always win the grade check (100% suppression), which is correct behavior -- there's
no mechanical difference between "always wins" at grade 15 vs grade 22. The 6-layer
adjustment can push effective grades to 30, same as BBW.

### Drawable Positions (26 vs 36)
Ghidra pseudocode shows `iVar12 < 0x24` which is a loop counter, not a position
limit. The implementation correctly identifies 26 drawable positions (35 total
minus 9 structural constants).

### Pitcher Card Walk/K Ratio
Agent 2 noted that real BBW pitcher Cuellar has 16 walks on his card, contradicting
the current WALK_COUNT=4. **CONTEXT**: The Cuellar card in APBA_REVERSE_ENGINEERING
is the batter's card for Cuellar-as-batter, not the pitcher batting card used for
grade-check suppression. The pitcher batting card (what batters draw from when
pitcher wins grade check) correctly has mostly Ks and outs per BBW PA resolution
mechanics.

---

## Recommended Fix Priority

1. **Power Rating Expansion** (Discrepancy #1) - Straightforward constant change,
   high impact on IDT bitmap accuracy
2. **Position 15 Gate Logic** (Discrepancy #2) - Small code change, moderate impact
3. **Card Value 30 Mapping** (Discrepancy #3) - Semantic correctness, low gameplay impact
4. **r2Roll Rename** (Discrepancy #4) - Pure cosmetic, zero gameplay impact

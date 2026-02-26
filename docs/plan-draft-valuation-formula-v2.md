# Draft Valuation Formula v2 - Fix Drafting Holes

## Context

Analysis of a 30-team, 21-round draft (630 picks) revealed systematic drafting problems:

1. **SB coefficient negligible (0.1)**: 50 stolen bases adds only 5 points. Speed players
   like Rickey Henderson get no differentiation from slow players with similar OPS.
2. **Fielding percentage is a constant**: All MLB players have .940-1.000 fielding pct, so
   `fieldingPct * 20` gives ~19-20 pts to everyone (~1 pt spread). Provides no defensive
   differentiation.
3. **One-year wonders overdrafted**: Babe Herman (1 great year) drafted R1 while Hank Aaron
   (20 great years, elite defense, speed) falls to R10. Poor defenders with fluky OPS years
   rank alongside complete players because the defense metric is meaningless.

## Root Cause

The batter formula `(OPS * 115) + (SB * 0.1) + (fieldingPct * 20) + positionBonus` has two
broken components:
- SB * 0.1 is negligible -- essentially zero contribution
- fieldingPct * 20 is a constant -- no variance between players

This means the formula is effectively `(OPS * 115) + ~20 + positionBonus`, which ranks
purely by OPS + position. Complete players (speed + defense + power) are indistinguishable
from one-dimensional sluggers.

## Fix 1: Increase SB coefficient from 0.1 to 0.3

- 50 SB = 15 pts (was 5 pts) -- meaningful contribution
- 130 SB (Henderson-level) = 39 pts -- differentiates elite speed
- 2 SB (slow player) = 0.6 pts -- minimal impact
- Still can't overcome large OPS gaps: 0.295 OPS difference = 33.9 pts > 48 SB * 0.3 = 14.4

## Fix 2: Replace fieldingPct with range+arm defense rating

Replace `fieldingPct * 20` (constant ~19-20 pts) with `defenseRating * 15` where
`defenseRating = (range + arm) / 2` (0.0-1.0 scale).

- Elite defender (range=0.9, arm=0.9): 0.9 * 15 = 13.5 pts
- Average defender (range=0.5, arm=0.5): 0.5 * 15 = 7.5 pts
- Poor defender (range=0.2, arm=0.2): 0.2 * 15 = 3.0 pts
- Spread: 10.5 pts (vs ~1 pt currently)

This naturally penalizes one-year wonders (who tend to be poor defenders) and rewards
complete players (who tend to have good range and arm).

## Impact Analysis

Before / After examples:
- Hank Aaron 1959 (1.013 OPS, 30 SB, good defense): 142 -> 145 (+3)
- Babe Herman 1930 (1.067 OPS, 16 SB, poor defense): 147 -> 138 (-9)
- Willie Mays 1955 (1.002 OPS, 24 SB, elite defense): 147 -> 151 (+4)
- Norm Cash 1961 (1.149 OPS, 11 SB, avg defense, 1B): 154 -> 145 (-9)

Aaron and Mays rise; Herman and Cash drop. One-year wonders get properly penalized.

## New Formula

```
Batter: (OPS * 115) + (SB * 0.3) + (defenseRating * 15) + positionBonus
         where defenseRating = (range + arm) / 2
```

Pitcher formulas unchanged.

## Files Modified

- `src/lib/draft/ai-valuation.ts` -- Formula changes
- `tests/unit/lib/draft/ai-valuation.test.ts` -- Updated + new tests
- `docs/changelog.md` -- Entry

## Test Plan (TDD)

- [ ] New: complete player outscores one-year wonder with higher peak OPS
- [ ] New: SB * 0.3 gives 50 SB = 15 pts
- [ ] New: defense metric produces 10+ pt spread between elite and poor defenders
- [ ] Updated: existing regression tests adjusted for new formula
- [ ] All existing tests still pass

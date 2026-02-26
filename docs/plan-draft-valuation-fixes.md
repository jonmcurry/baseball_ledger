# Draft Valuation Fixes Plan

## Problem
AI draft is overvaluing mediocre catchers with small sample sizes (e.g., Don Padgett 2.5 WAR
drafted round 2) while HOF catchers (Johnny Bench) fall to round 17. Root causes:

1. **No PA scaling for batters** -- Pitchers get IP scaling (`min(1.0, IP/150)`) but batters
   get full credit regardless of plate appearances. One-season wonders with 100 PA and fluky
   OPS outvalue full-season stars.
2. **Catcher bonus too high** -- +15 is the largest position bonus and dominates the formula,
   inflating any catcher with decent OPS.
3. **No PA minimum** -- September call-ups with 50 PA and a hot streak get same treatment as
   600 PA regulars.

## Fixes

### 1. Add PA scaling for batters
- New function: `computePaScaleFactor(pa: number): number` returns `min(1.0, pa / 400)`
- PA derived from `mlbBattingStats` as `AB + BB` (approximation; HBP/SF/SH not in our stats)
- Applied in `calculatePlayerValue` when `mlbBattingStats` available (mirrors pitcher IP scaling)
- Effect: 100 PA = 0.25x, 200 PA = 0.50x, 400+ PA = 1.0x

### 2. Reduce catcher position bonus
- Change `C: 15` to `C: 8` in `POSITION_BONUSES`
- Still rewards positional scarcity (8 > SS at 12? No, 8 < SS 12, which is correct -- C is
  premium defensively but SS has higher offensive opportunity cost)
- Adjust to: C=8, keep all others unchanged

### 3. PA minimum via scaling
- The PA scaling formula inherently handles this: a player with <200 PA gets at most 0.50x
  value, making them non-competitive for early rounds
- No separate hard cutoff needed -- the continuous scaling is cleaner

## Test Plan (TDD per Rule 11)

- [ ] `computePaScaleFactor` returns correct values (1.0 at 400+, 0.5 at 200, proportional)
- [ ] Catcher bonus is now 8 (not 15)
- [ ] Low-PA catcher (200 PA, 1.049 OPS) does NOT outvalue high-PA HOF catcher (580 PA, .837 OPS)
- [ ] `calculatePlayerValue` applies PA scaling when mlbBattingStats available
- [ ] Full-PA batter outscores same-stats low-PA batter
- [ ] Existing cross-position and regression tests still pass (with updated catcher bonus expectations)

## Files Modified
- `src/lib/draft/ai-valuation.ts` -- Core changes
- `tests/unit/lib/draft/ai-valuation.test.ts` -- New + updated tests
- `docs/changelog.md` -- Entry for this change

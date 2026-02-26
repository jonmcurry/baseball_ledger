# Fix Pitcher IP Tracking and HBP Double-Counting

## Problem

Season stats for pitchers and batters are inaccurate due to two bugs in game-runner.ts:

### Bug 1 (Critical): IP only credited to last pitcher per half-inning

In game-runner.ts lines 900-914, IP is credited ONLY when state.outs >= 3 and ONLY to the
current pitcher, always as exactly 1.0 IP. When a pitcher is pulled mid-inning:
- The pulled starter gets 0 IP for their partial outs
- The finishing reliever gets 1.0 IP instead of their actual fraction
- On walkoffs (outs < 3), no pitcher gets any IP credit

Effects: starter ERAs inflated, reliever IPs massively overcounted.

### Bug 2 (Moderate): HBP counted as BB

HBP outcomes increment both BB and HBP for batters (double-counting). For pitchers,
HBP fires isWalkOutcome -> pitchingLine.BB++ but PitchingLine lacks HBP field.

Effects: inflated BB counts for batters and pitchers, wrong OBP, WHIP, FIP.

## Fixes

- [x] Track outs per pitcher per half-inning using a Map
- [x] Credit proper fractional IP at end of each half-inning
- [x] Add HBP field to PitchingLine type
- [x] Separate HBP handling from BB in game-runner.ts
- [x] Accumulate pitcher HBP in stats accumulator
- [x] Write tests (TDD per Rule 11)
- [x] Update changelog.md

## Files Modified
- src/lib/simulation/game-runner.ts
- src/lib/types/game.ts
- src/lib/simulation/game-result.ts
- src/lib/stats/accumulator.ts
- tests/unit/lib/stats/accumulator.test.ts
- docs/changelog.md

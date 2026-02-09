# Phase 5: Schedule & Statistics

**Status**: COMPLETE
**Start date**: 2026-02-09
**Requirements**: REQ-SCH-001--006, REQ-STS-001--004, REQ-LGE-008

## Tasks

| # | Task | Files | Tests | Status |
|---|------|-------|-------|--------|
| 0 | Types + Error Codes | `types/schedule.ts`, `errors/error-codes.ts` | 0 | DONE |
| 1 | Derived Stats Calculator | `stats/derived.ts` | 34 | DONE |
| 2 | Stats Accumulator | `stats/accumulator.ts` | 21 | DONE |
| 3 | Standings Calculator | `stats/standings.ts` | 20 | DONE |
| 4 | League Leaders | `stats/leaders.ts` | 20 | DONE |
| 5 | Schedule Generator | `schedule/generator.ts` | 24 | DONE |
| 6 | Playoff Bracket | `schedule/playoff-bracket.ts` | 21 | DONE |

**Total**: 140 new tests (953 + 140 = 1,093 total across 58 test files)

## Key Decisions

- **IP arithmetic**: Baseball notation (.1 = 1/3, .2 = 2/3) with `ipToDecimal` and `addIP` functions
- **Schedule algorithm**: Circle method for round-robin pairing, division weight parameter for intra-vs-inter frequency
- **Playoff format**: 2025 MLB (6 teams per league), adapts gracefully for smaller leagues (4 teams skips WC round)
- **Qualification thresholds**: MLB standard: 3.1 PA/team game for batters, 1 IP/team game for pitchers
- **Immutability**: All stat accumulation and playoff game recording returns new objects

## Deferred

- Sub-phases 4B-4D (infrastructure, services/API, state/UI) remain deferred until Docker is available for local Supabase

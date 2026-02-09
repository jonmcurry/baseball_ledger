# Requirement-to-Test Traceability Matrix

REQ-TEST-011: All requirements have mapped test cases.

## Simulation Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-SIM-001 Game state machine | `tests/unit/lib/simulation/engine.test.ts` |
| REQ-SIM-002 Game state management | `tests/unit/lib/simulation/engine.test.ts` |
| REQ-SIM-003 Outcome table binary search | `tests/unit/lib/simulation/outcome-table.test.ts` |
| REQ-SIM-004 Card lookup + pitcher grade | `tests/unit/lib/simulation/plate-appearance.test.ts` |
| REQ-SIM-005 Outcome resolution | `tests/unit/lib/simulation/outcome-resolver.test.ts` |
| REQ-SIM-006 Base running | `tests/unit/lib/simulation/baserunner.test.ts` |
| REQ-SIM-007 Defense/errors | `tests/unit/lib/simulation/defense.test.ts` |
| REQ-SIM-008 Stolen bases | `tests/unit/lib/simulation/stolen-base.test.ts` |
| REQ-SIM-009 Pitching management | `tests/unit/lib/simulation/pitching.test.ts` |
| REQ-SIM-010 Manager AI | `tests/unit/lib/simulation/manager-ai.test.ts` |
| REQ-SIM-011 Bunt resolution | `tests/unit/lib/simulation/bunt-resolver.test.ts` |
| REQ-SIM-012 Archetype modifiers | `tests/unit/lib/simulation/archetype-modifier.test.ts` |
| REQ-SIM-013 Platoon advantage | `tests/unit/lib/simulation/platoon.test.ts` |
| REQ-SIM-014 Power rating | `tests/unit/lib/simulation/power-rating.test.ts` |
| REQ-SIM-015 Game runner orchestrator | `tests/unit/lib/simulation/game-runner.test.ts` |
| REQ-SIM-016 Post-game output | `tests/unit/lib/simulation/game-result.test.ts` |

## Card Generation Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-CARD-001 Card structure | `tests/unit/lib/card-gen/card-structure.test.ts` |
| REQ-CARD-002 Card values | `tests/unit/lib/card-gen/card-values.test.ts` |
| REQ-CARD-003 Card generator | `tests/unit/lib/card-gen/card-generator.test.ts` |
| REQ-CARD-004 Pitcher attributes | `tests/unit/lib/card-gen/pitcher-generator.test.ts` |
| REQ-CARD-005 Archetype flags | `tests/unit/lib/card-gen/archetype-flags.test.ts` |

## CSV/Data Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-CSV-001 CSV parsing | `tests/unit/lib/csv/parser.test.ts` |
| REQ-CSV-002 Batting loader | `tests/unit/lib/csv/batting-loader.test.ts` |
| REQ-CSV-003 Pitching loader | `tests/unit/lib/csv/pitching-loader.test.ts` |
| REQ-CSV-004 People loader | `tests/unit/lib/csv/people-loader.test.ts` |
| REQ-CSV-005 Fielding loader | `tests/unit/lib/csv/fielding-loader.test.ts` |
| REQ-CSV-006 Player pool | `tests/unit/lib/csv/player-pool.test.ts` |

## Stats Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STS-001 Derived stats | `tests/unit/lib/stats/derived.test.ts` |
| REQ-STS-002 Standings | `tests/unit/lib/stats/standings.test.ts` |
| REQ-STS-003 League leaders | `tests/unit/lib/stats/leaders.test.ts` |
| REQ-STS-004 Team aggregates | `tests/unit/lib/stats/leaders.test.ts` |
| REQ-STS-005 Traditional/Advanced toggle | `tests/unit/features/stats/StatsPage.test.tsx`, `tests/unit/stores/statsStore.test.ts` |

## API Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-API-001 League CRUD | `tests/unit/api/leagues/index.test.ts`, `tests/unit/api/leagues/[id]/index.test.ts` |
| REQ-API-002 Team management | `tests/unit/api/leagues/[id]/teams/index.test.ts`, `tests/unit/api/leagues/[id]/teams/[tid].test.ts` |
| REQ-API-003 Draft endpoints | `tests/unit/api/leagues/[id]/draft/start.test.ts`, `tests/unit/api/leagues/[id]/draft/pick.test.ts`, `tests/unit/api/leagues/[id]/draft/state.test.ts` |
| REQ-API-004 Simulation endpoint | `tests/unit/api/leagues/[id]/simulate.test.ts` |
| REQ-API-005 Stats endpoints | `tests/unit/api/leagues/[id]/stats/batting.test.ts`, `tests/unit/api/leagues/[id]/stats/pitching.test.ts`, `tests/unit/api/leagues/[id]/stats/team.test.ts` |
| REQ-API-006 AI endpoints | `tests/unit/api/ai/commentary.test.ts`, `tests/unit/api/ai/game-summary.test.ts`, `tests/unit/api/ai/trade-eval.test.ts`, `tests/unit/api/ai/draft-reasoning.test.ts`, `tests/unit/api/ai/manager-explanation.test.ts` |
| REQ-API-007 Auth middleware | `tests/unit/api/_lib/auth.test.ts` |
| REQ-API-008 Response envelope | `tests/unit/api/_lib/response.test.ts`, `tests/unit/api/_lib/errors.test.ts` |

## State Management Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-001 Auth store | `tests/unit/stores/authStore.test.ts` |
| REQ-STATE-002 League store | `tests/unit/stores/leagueStore.test.ts` |
| REQ-STATE-003 Draft store | `tests/unit/stores/draftStore.test.ts` |
| REQ-STATE-015 Stats store | `tests/unit/stores/statsStore.test.ts`, `tests/unit/stores/statsStore-async.test.ts` |

## Service Layer Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-SVC-001 API client | `tests/unit/services/api-client.test.ts` |
| REQ-SVC-002 League service | `tests/unit/services/league-service.test.ts` |
| REQ-SVC-003 Team service | `tests/unit/services/team-service.test.ts` |
| REQ-SVC-004 Draft service | `tests/unit/services/draft-service.test.ts` |
| REQ-SVC-005 Stats service | `tests/unit/services/stats-service.test.ts` |
| REQ-SVC-006 Simulation service | `tests/unit/services/simulation-service.test.ts` |
| REQ-SVC-007 AI service | `tests/unit/services/ai-service.test.ts` |

## NFR Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-NFR-001 Single game < 500ms | `tests/bench/simulation.bench.ts` |
| REQ-NFR-002 Season < 60s | `tests/bench/simulation.bench.ts` |
| REQ-NFR-003 CSV parse < 10s | `tests/bench/csv-parse.bench.ts` |
| REQ-NFR-007 Determinism | `tests/unit/lib/simulation/determinism.test.ts` |
| REQ-NFR-008 Web Worker | `tests/unit/workers/simulation-worker.test.ts`, `tests/unit/lib/simulation/worker-api.test.ts` |
| REQ-NFR-009 Binary search | `tests/unit/lib/simulation/outcome-table.test.ts` |
| REQ-NFR-010 Day-batched bulk sim | `tests/unit/lib/simulation/season-runner.test.ts` |
| REQ-NFR-011 PapaParse streaming | `tests/unit/lib/csv/parser.test.ts` |
| REQ-NFR-014 PostgreSQL transactions | `tests/unit/api/_lib/simulate-day.test.ts` |
| REQ-NFR-017 Code splitting | `vite.config.ts` (manual chunks config) |
| REQ-NFR-018 Font optimization | `index.html` (preload + subset) |

## UI/Component Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-SCH-009 Stamp animation | `tests/unit/components/feedback/StampAnimation.test.tsx` |
| REQ-COMP-001 StatTable | `tests/unit/components/data-display/StatTable.test.tsx` |
| REQ-COMP-002 Pagination | `tests/unit/components/data-display/Pagination.test.tsx` |
| REQ-COMP-003 ErrorBanner | `tests/unit/components/feedback/ErrorBanner.test.tsx` |
| REQ-COMP-004 LoadingLedger | `tests/unit/components/feedback/LoadingLedger.test.tsx` |
| REQ-COMP-005 TypewriterText | `tests/unit/components/feedback/TypewriterText.test.tsx` |
| REQ-COMP-011 CSS animations | `src/styles/globals.css` (stamp-slam, cursor-blink, prefers-reduced-motion) |

## Test Requirements

| Requirement | Coverage |
|-------------|----------|
| REQ-TEST-003 Statement coverage >= 60% | `vitest.config.ts` coverage thresholds |
| REQ-TEST-004 Branch coverage >= 50% | `vitest.config.ts` coverage thresholds |
| REQ-TEST-011 Traceability matrix | This file |
| REQ-TEST-012 Performance benchmarks | `tests/bench/simulation.bench.ts`, `tests/bench/csv-parse.bench.ts` |
| REQ-TEST-014 Determinism test | `tests/unit/lib/simulation/determinism.test.ts` |
| REQ-TEST-017 Multi-browser E2E | `playwright.config.ts` (Firefox, WebKit projects) |

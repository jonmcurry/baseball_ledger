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
| REQ-CARD-001 Card structure | `tests/unit/lib/card-generator/structural.test.ts` |
| REQ-CARD-002 Card values | `tests/unit/lib/card-generator/value-mapper.test.ts`, `tests/unit/lib/card-generator/rate-calculator.test.ts` |
| REQ-CARD-003 Card generator | `tests/unit/lib/card-generator/generator.test.ts` |
| REQ-CARD-004 Pitcher attributes | `tests/unit/lib/card-generator/pitcher-card.test.ts`, `tests/unit/lib/card-generator/pitcher-grade.test.ts` |
| REQ-CARD-005 Archetype flags | `tests/unit/lib/card-generator/archetype.test.ts` |

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
| REQ-NFR-018 Self-hosted fonts | `tests/unit/styles/fonts.test.ts` |

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

## Phase 10: Feature UI Requirements

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-COMP-002 Postseason theme | `tests/unit/hooks/usePostseasonTheme.test.ts`, `src/styles/globals.css` |
| REQ-COMP-006 Input | `tests/unit/components/forms/Input.test.tsx` |
| REQ-COMP-007 Select | `tests/unit/components/forms/Select.test.tsx` |
| REQ-COMP-008 Toggle | `tests/unit/components/forms/Toggle.test.tsx` |
| REQ-COMP-009 ConfirmDialog | `tests/unit/components/forms/ConfirmDialog.test.tsx` |
| REQ-COMP-010 DiamondField | `tests/unit/components/baseball/DiamondField.test.tsx` |
| REQ-COMP-012 PlayerCardDisplay | `tests/unit/components/baseball/PlayerCardDisplay.test.tsx` |
| REQ-COMP-013 Scoreboard | `tests/unit/components/baseball/Scoreboard.test.tsx` |
| REQ-COMP-014 ProgressBar | `tests/unit/components/feedback/ProgressBar.test.tsx` |
| REQ-STATE-003 Draft store | `tests/unit/stores/draftStore.test.ts` |
| REQ-STATE-014 Realtime progress | `tests/unit/hooks/useRealtimeProgress.test.ts` |
| REQ-NFR-020 Realtime progress hook | `tests/unit/hooks/useRealtimeProgress.test.ts` |
| REQ-UI-001 League config page | `tests/unit/features/league/LeagueConfigPage.test.tsx` |
| REQ-UI-002 Join league page | `tests/unit/features/league/JoinLeaguePage.test.tsx` |
| REQ-UI-003 Draft board page | `tests/unit/features/draft/DraftBoardPage.test.tsx`, `tests/unit/features/draft/DraftTicker.test.tsx`, `tests/unit/features/draft/AvailablePlayersTable.test.tsx`, `tests/unit/features/draft/PickTimer.test.tsx`, `tests/unit/features/draft/RosterPreviewPanel.test.tsx` |
| REQ-UI-004 Roster management | `tests/unit/features/roster/RosterPage.test.tsx`, `tests/unit/features/roster/LineupDiamond.test.tsx`, `tests/unit/features/roster/BenchPanel.test.tsx`, `tests/unit/features/roster/PitchingRotation.test.tsx` |
| REQ-UI-005 Game viewer | `tests/unit/features/game-viewer/GameViewerPage.test.tsx`, `tests/unit/features/game-viewer/PlayByPlayFeed.test.tsx`, `tests/unit/features/game-viewer/BoxScoreDisplay.test.tsx`, `tests/unit/features/game-viewer/GameStatePanel.test.tsx` |
| REQ-UI-006 Transactions page | `tests/unit/features/transactions/TransactionsPage.test.tsx`, `tests/unit/features/transactions/AddDropForm.test.tsx`, `tests/unit/features/transactions/TradeForm.test.tsx`, `tests/unit/features/transactions/TransactionLog.test.tsx` |
| REQ-UI-007 Playoffs page | `tests/unit/features/playoffs/PlayoffsPage.test.tsx`, `tests/unit/features/playoffs/PlayoffBracketView.test.tsx`, `tests/unit/features/playoffs/SeriesCard.test.tsx` |
| REQ-UI-008 Archive page | `tests/unit/features/archive/ArchivePage.test.tsx`, `tests/unit/features/archive/SeasonDetail.test.tsx` |
| REQ-UI-009 Player profile modal | `tests/unit/components/baseball/PlayerProfileModal.test.tsx` |
| REQ-UI-010 AI commentary | `tests/unit/features/game-viewer/CommentaryPanel.test.tsx` |
| REQ-UI-SIM Playoff sim lock | `tests/unit/features/dashboard/SimulationControls.test.tsx` |

## Infrastructure Requirements (Phase 12-14)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-ENV-003/004 Client config | `tests/unit/lib/config.test.ts` |
| REQ-ENV-005 Server config | `tests/unit/api/_lib/config.test.ts` |
| REQ-ERR-005 Roster validation | `tests/unit/lib/validation/roster-schemas.test.ts` |
| REQ-ERR-005 Simulation validation | `tests/unit/lib/validation/simulation-schemas.test.ts` |
| REQ-ERR-013/014 Structured logging | `tests/unit/api/_lib/logger.test.ts` |
| REQ-ERR-015/016 DB retry | `tests/unit/api/_lib/db-retry.test.ts` |
| REQ-ERR-015/016 Client retry | `tests/unit/services/api-client.test.ts` (fetchWithRetry tests) |
| REQ-ERR-019/020 PG error mapping | `tests/unit/api/_lib/postgres-errors.test.ts` |
| REQ-STS-003 Stats sorting | `tests/unit/features/stats/StatsPage.test.tsx` (sorting tests) |
| REQ-UI-008 Roster interactions | `tests/unit/features/roster/RosterPage.test.tsx` (bench-to-lineup tests) |

## Test Requirements

| Requirement | Coverage |
|-------------|----------|
| REQ-TEST-003 Statement coverage >= 60% | `vitest.config.ts` coverage thresholds |
| REQ-TEST-004 Branch coverage >= 50% | `vitest.config.ts` coverage thresholds |
| REQ-TEST-011 Traceability matrix | This file |
| REQ-TEST-012 Performance benchmarks | `tests/bench/simulation.bench.ts`, `tests/bench/csv-parse.bench.ts` |
| REQ-TEST-014 Determinism test | `tests/unit/lib/simulation/determinism.test.ts` |
| REQ-TEST-017 Multi-browser E2E | `playwright.config.ts` (Firefox, WebKit projects) |

## Phase 17-22: SRD Gap Closure

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-AI-002 Hit-and-run decision | `tests/unit/lib/simulation/manager-ai.test.ts` (hitAndRun describe) |
| REQ-AI-002 Pinch-hit decision | `tests/unit/lib/simulation/manager-ai.test.ts` (pinchHit describe) |
| REQ-AI-002 Aggressive baserunning | `tests/unit/lib/simulation/manager-ai.test.ts` (aggressiveBaserunning describe) |
| REQ-DFT-001 Draft engine orchestrator | `tests/unit/lib/draft/draft-engine.test.ts` |
| REQ-DFT-002 Draft turn validation | `tests/unit/lib/draft/draft-engine.test.ts` |
| REQ-DFT-005 Draft table stat columns | `tests/unit/features/draft/AvailablePlayersTable.test.tsx` |
| REQ-DFT-006 AI drafter compositor | `tests/unit/lib/draft/ai-drafter.test.ts` |
| REQ-DFT-007 AI draft reasoning | `tests/unit/lib/draft/ai-drafter.test.ts` |
| REQ-RST-005 Transaction service | `tests/unit/services/transaction-service.test.ts` |
| REQ-LGE-003 Invite key display | `tests/unit/features/league/InviteKeyDisplay.test.tsx` |
| REQ-LGE-010 Delete league | `tests/unit/features/league/DeleteLeagueButton.test.tsx` |
| REQ-UI-007 Results ticker | `tests/unit/features/dashboard/ResultsTicker.test.tsx` |
| REQ-STS-005 FIP calculation | `tests/unit/lib/stats/derived.test.ts` (FIP describe) |
| REQ-UI-009 Player profile modal | `tests/unit/components/baseball/PlayerProfileModal.test.tsx` |
| REQ-UI-010 Commentary panel | `tests/unit/features/game-viewer/CommentaryPanel.test.tsx` |
| REQ-NFR-018 Self-hosted fonts | `tests/unit/styles/fonts.test.ts` |
| REQ-ARCH-004a Default exports | All `src/components/` and `src/features/` `.tsx` files |

## Phase 23-24: Playoff Pipeline + AI Wiring

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-LGE-008 Playoff bracket advancement | `tests/unit/lib/schedule/playoff-advancement.test.ts` |
| REQ-LGE-008 Full playoff bracket | `tests/unit/lib/schedule/full-playoff-bracket.test.ts` |
| REQ-LGE-008 Bracket persistence | `tests/unit/api/leagues/[id]/playoff-bracket-persistence.test.ts` |
| REQ-LGE-008 Season-to-playoffs transition | `tests/unit/api/_lib/playoff-transition.test.ts` |
| REQ-LGE-008 Playoff game simulation | `tests/unit/api/_lib/simulate-playoff-game.test.ts` |
| REQ-LGE-008 Playoffs UI | `tests/unit/features/playoffs/PlayoffsPage.test.tsx` |
| REQ-AI-006 Commentary wiring | `tests/unit/hooks/useCommentary.test.ts`, `tests/unit/features/game-viewer/CommentarySection.test.tsx` |
| REQ-AI-006 Game summary wiring | `tests/unit/hooks/useGameSummary.test.ts`, `tests/unit/features/game-viewer/GameSummaryPanel.test.tsx` |
| REQ-AI-006 Trade evaluation wiring | `tests/unit/hooks/useTradeEvaluation.test.ts`, `tests/unit/features/transactions/TradeEvaluationPanel.test.tsx` |
| REQ-AI-006 Draft reasoning wiring | `tests/unit/hooks/useDraftReasoning.test.ts`, `tests/unit/features/draft/DraftReasoningPanel.test.tsx` |
| REQ-AI-006 Manager decisions | `tests/unit/lib/ai/decision-detector.test.ts`, `tests/unit/hooks/useManagerExplanations.test.ts`, `tests/unit/features/game-viewer/ManagerDecisionsPanel.test.tsx` |
| REQ-AI-007 AI opt-in per item | All 5 `useManager*`/`use*` hook tests verify enhance/fetch is optional |
| REQ-AI-008 Graceful degradation | `tests/unit/hooks/useManagerExplanations.test.ts` (failure keeps template), all hook tests |

## Phase 25: League Creation Pipeline

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-DATA-002 Player pool table | `tests/unit/lib/types/player-pool-db.test.ts` |
| REQ-DATA-002 CSV pipeline orchestrator | `tests/unit/lib/csv/load-pipeline.test.ts` |
| REQ-DATA-002 CSV file reader | `tests/unit/api/_lib/load-csvs.test.ts` |
| REQ-DATA-002 League creation pipeline | `tests/unit/api/leagues/index.test.ts` (pipeline tests) |
| REQ-DATA-002 Available players endpoint | `tests/unit/api/leagues/[id]/players.test.ts` |
| REQ-DATA-002 Draft store fetch players | `tests/unit/stores/draftStore-players.test.ts` |
| REQ-DFT-001 Draft marks player_pool | `tests/unit/api/leagues/[id]/draft.test.ts` (player_pool marking tests) |

## Phase 26: Game Simulation Integration

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-NFR-010 Day-batched simulation wiring | `tests/unit/api/leagues/[id]/simulate.test.ts` (DayResult, team configs, simulateDayOnServer) |
| REQ-NFR-014 Atomic commit via RPC | `tests/unit/api/_lib/simulate-day.test.ts`, `tests/unit/api/leagues/[id]/simulate.test.ts` |
| REQ-LGE-008 Shared team config loader | `tests/unit/api/_lib/load-team-config.test.ts` |
| REQ-LGE-008 Playoff shared module | `tests/unit/api/_lib/simulate-playoff-game.test.ts` |

## Phase 27: API Route Consolidation

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-API-002 Consolidated teams endpoint | `tests/unit/api/leagues/[id]/teams.test.ts` (GET, PATCH, POST) |
| REQ-API-005 Consolidated stats endpoint | `tests/unit/api/leagues/[id]/stats.test.ts` (batting, pitching, team, standings) |
| REQ-API-003 Consolidated draft endpoint | `tests/unit/api/leagues/[id]/draft.test.ts` (state, pick, available players) |

## Phase 28: Schedule Generation Wiring

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-SCH-001 Schedule generation on draft completion | `tests/unit/api/_lib/generate-schedule-rows.test.ts` |
| REQ-SCH-002 Schedule fetch + day filter | `tests/unit/api/leagues/[id]/schedule.test.ts` (GET handler) |

## Phase 29: Lineup Update API

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-RST-002 Lineup save via PATCH | `tests/unit/api/leagues/[id]/teams.test.ts` (PATCH lineup update tests) |
| REQ-RST-003 Lineup slot/order/position | `tests/unit/api/leagues/[id]/teams.test.ts` (roster slot assignment tests) |

## Phase 30: Post-Draft Lineup Auto-Generation

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-RST-002 Auto-generated lineups | `tests/unit/api/_lib/generate-lineup-rows.test.ts` |
| REQ-RST-003 Estimated batting stats | `tests/unit/api/_lib/generate-lineup-rows.test.ts` (estimateBattingStats tests) |

## Phase 31: Client-Driven Multi-Day Simulation

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-010 Simulation store | `tests/unit/stores/simulationStore.test.ts` |
| REQ-STATE-011 Async simulation actions | `tests/unit/stores/simulationStore-async.test.ts` |
| REQ-NFR-021 Chunked client-driven sim | `tests/unit/stores/simulationStore-async.test.ts` (day loop, progress tracking) |

## Phase 32: Post-Simulation Dashboard Refresh

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-014 Cache invalidation on sim complete | `tests/unit/hooks/useRealtimeProgress.test.ts` (fetchLeagueData on completion) |
| REQ-SCH-007 Simulation notification | `tests/unit/features/dashboard/SimulationNotification.test.tsx` |
| REQ-UI-007 Results ticker | `tests/unit/features/dashboard/ResultsTicker.test.tsx` |

## Phase 33: Season Completion Ceremony

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-SCH-009 Season complete detection | `tests/unit/features/dashboard/SeasonCompletePanel.test.tsx` |
| REQ-LGE-009 Champion announcement | `tests/unit/features/dashboard/SeasonCompletePanel.test.tsx` (StampAnimation, champion display) |

## Phase 34: Playoff Dashboard Integration

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-LGE-009 Playoff status panel | `tests/unit/features/dashboard/PlayoffStatusPanel.test.tsx` |
| REQ-SCH-007 Playoff simulation notifications | `tests/unit/features/dashboard/SimulationNotification.test.tsx` (playoff message override) |

## Phase 35: Draft Pick Timer Enforcement

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-DFT-004 Draft timer hook | `tests/unit/features/draft/hooks/useDraftTimer.test.ts` |
| REQ-DFT-004 Timer UI component | `tests/unit/features/draft/PickTimer.test.tsx` |
| REQ-DFT-004 Auto-pick on expiry | `tests/unit/lib/draft/auto-pick-selector.test.ts` (selectBestAvailable) |

## Phase 36: Free Agent Pickup Flow

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-RST-005 Add/drop form | `tests/unit/features/transactions/AddDropForm.test.tsx` |
| REQ-RST-005 Player pool transform | `tests/unit/lib/transforms/player-pool-transform.test.ts` (transformPoolRows) |

## Phase 37: Transaction History Persistence

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-RST-005 Transaction row transform | `tests/unit/lib/transforms/transaction-transform.test.ts` (transformTransactionRows) |
| REQ-RST-005 Transaction API write + read | `tests/unit/api/leagues/[id]/teams.test.ts` (transaction insertion, history fetch) |

## Phase 38: CPU Trade Auto-Evaluation

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-RST-005 Trade eval request builder | `tests/unit/lib/transforms/trade-eval-request-builder.test.ts` (buildTradeEvalRequest) |
| REQ-AI-006 CPU manager trade evaluation | `tests/unit/api/leagues/[id]/teams.test.ts` (CPU trade accept/reject/counter) |

## Phase 39: Season Archive Enrichment

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-SCH-009 Archive data builder | `tests/unit/lib/transforms/archive-builder.test.ts` (buildArchiveData) |
| REQ-SCH-009 Archive API snapshot | `tests/unit/api/leagues/[id]/archive.test.ts` (champion, standings, leaders) |

## Phase 40: Start New Season Flow

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-SCH-009 Season start validator | `tests/unit/lib/validators/season-start.test.ts` (canStartSeason) |
| REQ-SCH-009 New season panel | `tests/unit/features/dashboard/NewSeasonPanel.test.tsx` |
| REQ-SCH-009 Start season API | `tests/unit/api/leagues/[id]/schedule.test.ts` (POST handler) |

## Phase 41: Persist Migration Infrastructure

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-009 Store migration config | `tests/unit/stores/persist-migration.test.ts` (createMigrationConfig) |
| REQ-STATE-009 Sequential migration runner | `tests/unit/stores/persist-migration.test.ts` (version chaining, fallback) |

## Phase 42: Accessibility Focus Trap + Page Titles

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-COMP-012 Focus trap hook | `tests/unit/hooks/useFocusTrap.test.ts` (Tab/Shift+Tab cycling, Escape, focus save/restore) |
| REQ-COMP-013 Page title hook | `tests/unit/hooks/usePageTitle.test.ts` (document.title with suffix, restore on unmount) |
| REQ-COMP-012 ConfirmDialog focus trap | `tests/unit/components/forms/ConfirmDialog.test.tsx` (Tab wrap, focus restore) |
| REQ-COMP-012 PlayerProfileModal focus | `tests/unit/components/baseball/PlayerProfileModal.test.tsx` (Escape, first element focus) |

## Phase 43: WCAG ARIA Compliance Audit

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-COMP-012 ConfirmDialog alertdialog role | `tests/unit/components/forms/ConfirmDialog.test.tsx` (alertdialog ARIA test) |
| REQ-COMP-012 DiamondField group role | `tests/unit/components/baseball/DiamondField.test.tsx` (group role + lineup label) |
| REQ-COMP-012 LineScore table caption | `tests/unit/components/baseball/LineScore.test.tsx` (caption accessibility) |
| REQ-COMP-012 Pagination aria-current | `tests/unit/components/data-display/Pagination.test.tsx` (aria-current="page") |
| REQ-COMP-012 StatTable grid role | `tests/unit/components/data-display/StatTable.test.tsx` (grid role, aria-sort="none") |
| REQ-COMP-012 LoadingLedger aria-label | `tests/unit/components/feedback/LoadingLedger.test.tsx` (aria-label matching message) |
| REQ-COMP-012 DraftTicker aria-live | `tests/unit/features/draft/DraftTicker.test.tsx` (aria-live="polite", label) |

## Phase 44: Feature-Level Error Boundaries

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-ERR-010 Per-feature error boundary | `tests/unit/components/feedback/ErrorBoundary.test.tsx` (chunk-load failure test) |
| REQ-ERR-011 Error recovery UI | `tests/unit/components/feedback/ErrorBoundary.test.tsx` (Try Again, Return to Dashboard) |
| REQ-COMP-007 ErrorBoundary wraps Suspense | `src/router.tsx` (LazyPage wrapper: ErrorBoundary > Suspense > lazy component) |

## Phase 45: Traceability Matrix Update

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-TEST-011 Matrix maintenance | `tests/TRACEABILITY.md` (matrix updated through Phase 44) |

## Phase 46: Per-Directory Coverage Thresholds

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-TEST-003 Statement coverage >= 60% | `vitest.config.ts` (9 per-directory thresholds) |
| REQ-TEST-004 Branch coverage >= 50% | `vitest.config.ts` (9 per-directory thresholds) |

## Phase 47: Responsive Design

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-UI-013 Single breakpoint responsive | `tests/unit/styles/responsive.test.tsx` (AppShell, Header, StandingsTable, StatTable, DiamondField, PlayerCardDisplay) |
| REQ-COMP-010 Hamburger menu | `tests/unit/styles/responsive.test.tsx` (Header hamburger toggle, aria-expanded) |
| REQ-NFR-018 Font-display swap | `tests/unit/styles/fonts.test.ts` (font-display: swap, Latin unicode-range) |

## Phase 48: Immer Middleware for draftStore

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-005 Immer middleware | `tests/unit/stores/draftStore.test.ts` (all existing tests pass unchanged with immer) |

## Phase 49: League Deletion CASCADE Verification

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-LGE-010 League deletion cascades | `tests/unit/migrations/cascade-delete.test.ts` (8 league_id FK, 1 team_id FK, root entity, file count) |

## Phase 50: Client Network Request Retry

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-ERR-015 Client retry (2 retries, exponential) | `tests/unit/services/api-client.test.ts` (retry on 500, 429, network error; no retry on 4xx) |
| REQ-ERR-016 Retry logging | `tests/unit/services/api-client.test.ts` (WARN per attempt, ERROR on exhaustion) |

## Phase 51: localStorage Fallback Warning + Traceability

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-010 Safe localStorage fallback | `tests/unit/stores/storage-factory.test.ts` (isMemoryFallback detection, memory storage correctness) |
| REQ-STATE-010 WARN banner display | `tests/unit/features/auth/AuthenticatedLayout.test.tsx` (ErrorBanner shown/hidden based on storage availability) |
| REQ-TEST-011 Traceability update | `tests/TRACEABILITY.md` (matrix updated through Phase 51) |

## Phase 52: DevTools Conditional + Responsive SimControls + WARN Logging

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-016 DevTools conditional | `tests/unit/stores/devtools-conditional.test.ts` (6 stores verified `enabled: import.meta.env.DEV`) |
| REQ-COMP-010 SimulationControls responsive | `tests/unit/styles/responsive.test.tsx` (2x2 mobile grid layout) |
| REQ-ERR-018 WARN logging on fallback | `tests/unit/stores/storage-factory.test.ts` (console.warn on in-memory activation) |

## Phase 53: Stale-While-Revalidate Cache Invalidation

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-011 Cross-store cache invalidation | `tests/unit/stores/cache-invalidation.test.ts` (sim complete, lineup save, league switch, logout) |
| REQ-STATE-012 isStale + invalidateCache | `tests/unit/stores/leagueStore.test.ts`, `tests/unit/stores/leagueStore-async.test.ts` (isStale, invalidateLeagueCache, clearLeague) |
| REQ-STATE-012 isStale + invalidateCache | `tests/unit/stores/rosterStore.test.ts`, `tests/unit/stores/rosterStore-async.test.ts` (isStale, invalidateRosterCache, clearRoster) |
| REQ-STATE-012 isStale + invalidateCache | `tests/unit/stores/statsStore.test.ts`, `tests/unit/stores/statsStore-async.test.ts` (isStale, invalidateStatsCache, clearStats) |

## Phase 54: Auth Lifecycle + npm Scripts Verification

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-015 Auth lifecycle | `tests/unit/stores/authStore-async.test.ts` (session refetch, no-session clear, signout reset) |
| REQ-TEST-018 npm scripts | `tests/unit/config/npm-scripts.test.ts` (7 required scripts verified) |

## Phase 55: Pagination Fix + DB Constraint + Playoff Enforcement

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-NFR-019 Server-side pagination alignment | `tests/unit/stores/statsStore.test.ts` (pageSize=50, version=2) |
| REQ-LGE-007 One user per team per league | `tests/unit/migrations/unique-owner-per-league.test.ts` (unique index, partial WHERE, file count) |
| REQ-LGE-009 Playoff one-game-at-a-time | `tests/unit/api/leagues/[id]/simulate.test.ts` (REQ-LGE-009 explicit test) |

## Phase 56: Architecture + Scope + Environment Structural Tests

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-ARCH-001 Seven-layer architecture | `tests/unit/config/architecture.test.ts` (7 expected layer dirs) |
| REQ-ARCH-002 No upward imports | `tests/unit/config/architecture.test.ts` (stores !-> features, services !-> stores/features, lib !-> stores/services/features) |
| REQ-ARCH-003 Path aliases | `tests/unit/config/architecture.test.ts` (7 aliases in tsconfig.json) |
| REQ-ARCH-004 Naming conventions | `tests/unit/config/architecture.test.ts` (PascalCase components, use*.ts hooks, *Store.ts stores) |
| REQ-ARCH-004a Default exports | `tests/unit/config/architecture.test.ts` (all .tsx files have export default) |
| REQ-ARCH-005 No God files | `tests/unit/config/architecture.test.ts` (stores<300, services<200, hooks<200, lib<1000) |
| REQ-SCOPE-002 Feature-scoped naming | `tests/unit/config/scope-rules.test.ts` (feature hooks follow use*.ts) |
| REQ-SCOPE-003 No cross-feature imports | `tests/unit/config/scope-rules.test.ts` (no @features/x from @features/y) |
| REQ-SCOPE-004 Promotion on 2nd consumer | InviteKeyDisplay promoted from league to shared (Phase 56) |
| REQ-SCOPE-005 Fixed-home artifacts | `tests/unit/config/scope-rules.test.ts` (services in src/services/, stores in src/stores/) |
| REQ-SCOPE-007 Tests mirror source | `tests/unit/config/scope-rules.test.ts` (test dirs mirror src layers) |
| REQ-ENV-002 .env.example | `tests/unit/config/environment.test.ts` (exists, all vars, no real creds) |
| REQ-ENV-003 Client config module | `tests/unit/config/environment.test.ts` (src/lib/config.ts exists) |
| REQ-ENV-005 Server config module | `tests/unit/config/environment.test.ts` (api/_lib/config.ts exists) |
| REQ-ENV-006 vite-env.d.ts | `tests/unit/config/environment.test.ts` (ImportMetaEnv, VITE_SUPABASE_*) |
| REQ-ENV-007 vercel.json | `tests/unit/config/environment.test.ts` (rewrites, headers) |
| REQ-ENV-008 .gitignore secrets | `tests/unit/config/environment.test.ts` (.env.local excluded, .env.example not) |

## Previously Implemented Requirements (Traceability Backfill)

### Authentication (REQ-AUTH)

| Requirement | Test File(s) / Implementation |
|-------------|-------------|
| REQ-AUTH-001 Supabase email/password auth | `tests/unit/stores/authStore.test.ts`, `tests/unit/stores/authStore-async.test.ts` |
| REQ-AUTH-002 Permission model | `tests/unit/api/_lib/auth.test.ts` (requireAuth middleware) |
| REQ-AUTH-003 Invite key validation | `tests/unit/api/leagues/[id]/index.test.ts` (join league tests) |

### AI (REQ-AI)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-AI-001 Manager profiles | `tests/unit/lib/simulation/manager-ai.test.ts` (4 profiles tested) |
| REQ-AI-003 Reliever selection | `tests/unit/lib/simulation/pitching.test.ts` (reliever/closer selection) |
| REQ-AI-004 Stolen base decisions | `tests/unit/lib/simulation/manager-ai.test.ts` (steal decision tests) |
| REQ-AI-005 CPU manager usage | `tests/unit/lib/simulation/manager-ai.test.ts` (profile-driven decisions) |

### Data (REQ-DATA)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-DATA-001 CSV file loading | `tests/unit/lib/csv/parser.test.ts`, `tests/unit/lib/csv/batting-loader.test.ts`, etc. |
| REQ-DATA-003 Name cache | `tests/unit/lib/csv/people-loader.test.ts` (playerID -> name mapping) |
| REQ-DATA-004 PlayerCard generation | `tests/unit/lib/card-generator/generator.test.ts` |
| REQ-DATA-005 Card algorithm | `tests/unit/lib/card-generator/value-mapper.test.ts`, `tests/unit/lib/card-generator/rate-calculator.test.ts` |
| REQ-DATA-005a Pitcher grade | `tests/unit/lib/card-generator/pitcher-grade.test.ts` |
| REQ-DATA-006 League averages | `tests/unit/lib/card-generator/generator.test.ts` (normalization) |
| REQ-DATA-007 Database schema + RLS | `supabase/migrations/`, `supabase/tests/` (40 pgTAP assertions) |
| REQ-DATA-008 Batting stats tracked | `tests/unit/lib/stats/derived.test.ts` (BA, OBP, SLG, OPS, etc.) |
| REQ-DATA-009 Pitching stats tracked | `tests/unit/lib/stats/derived.test.ts` (ERA, WHIP, K/9, FIP, etc.) |

### Draft (REQ-DFT)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-DFT-003 Vertical scrolling ticker | `tests/unit/features/draft/DraftTicker.test.tsx` |
| REQ-DFT-008 Post-draft roster validation | `tests/unit/lib/draft/draft-engine.test.ts` (completion validation) |

### Error Handling (REQ-ERR)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-ERR-001 AppError instances | `tests/unit/lib/types/errors.test.ts`, `tests/unit/api/_lib/errors.test.ts` |
| REQ-ERR-002 ErrorCode union | `src/lib/types/errors.ts` (type definition) |
| REQ-ERR-003 ApiErrorResponse envelope | `tests/unit/api/_lib/errors.test.ts` |
| REQ-ERR-004 X-Request-Id header | `tests/unit/api/_lib/response.test.ts` (requestId in all responses) |
| REQ-ERR-007 Zod to AppError | `tests/unit/api/_lib/validate.test.ts` (validation -> structured error) |
| REQ-ERR-009 Two error boundaries | `tests/unit/components/feedback/ErrorBoundary.test.tsx`, `src/router.tsx` |
| REQ-ERR-012 ErrorBanner for user actions | `tests/unit/components/feedback/ErrorBanner.test.tsx` |
| REQ-ERR-017 Graceful degradation | `tests/unit/hooks/useManagerExplanations.test.ts` (AI failure keeps template) |

### League (REQ-LGE)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-LGE-001 League creation form | `tests/unit/features/league/LeagueConfigPage.test.tsx` |
| REQ-LGE-002 Commissioner | `tests/unit/api/leagues/index.test.ts` (creating user = commissioner) |
| REQ-LGE-004 Auto-generate team names | `tests/unit/lib/draft/draft-engine.test.ts` (team name generation) |
| REQ-LGE-005 Division assignment | `tests/unit/lib/draft/draft-engine.test.ts` (AL/NL, 4 divisions) |
| REQ-LGE-006 Join via invite key | `tests/unit/features/league/JoinLeaguePage.test.tsx`, `tests/unit/api/leagues/[id]/index.test.ts` |

### Roster (REQ-RST)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-RST-001 21-player roster | `tests/unit/lib/validation/roster-schemas.test.ts` |
| REQ-RST-004 Lineup validation | `tests/unit/lib/validation/roster-schemas.test.ts`, `tests/unit/api/leagues/[id]/teams.test.ts` |

### Schedule (REQ-SCH)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-SCH-003 Round-robin schedule | `tests/unit/lib/schedule/generator.test.ts` (162-game balanced) |
| REQ-SCH-004 Every team plays each day | `tests/unit/lib/schedule/generator.test.ts` (daily assignments) |
| REQ-SCH-005 Simulation buttons | `tests/unit/features/dashboard/SimulationControls.test.tsx` (Day/Week/Month/Season) |
| REQ-SCH-006 Post-sim stat updates | `tests/unit/hooks/useRealtimeProgress.test.ts` (fetchLeagueData on completion) |
| REQ-SCH-008 Playoff transition | `tests/unit/api/_lib/playoff-transition.test.ts` |

### Simulation Detail (REQ-SIM)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-SIM-003a Outcome index mapping | `tests/unit/lib/simulation/outcome-table.test.ts` |
| REQ-SIM-004a Direct card value fallback | `tests/unit/lib/simulation/plate-appearance.test.ts` |
| REQ-SIM-004b Platoon adjustment | `tests/unit/lib/simulation/platoon.test.ts` |
| REQ-SIM-004c Bunt resolution | `tests/unit/lib/simulation/bunt-resolver.test.ts` |

### State Management (REQ-STATE)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-STATE-004 Async action pattern | `tests/unit/stores/leagueStore-async.test.ts`, all *-async.test.ts files |
| REQ-STATE-006 Atomic selectors | `src/hooks/useLeague.ts`, `src/hooks/useAuth.ts` (selector patterns) |
| REQ-STATE-007 Derived state in hooks | `src/hooks/` (14 hooks compose stores, no derived state in stores) |
| REQ-STATE-008 Persist middleware | `tests/unit/stores/persist-migration.test.ts`, `tests/unit/stores/statsStore.test.ts` |
| REQ-STATE-013 Realtime in hooks | `tests/unit/hooks/useRealtimeProgress.test.ts` |

### NFR (additional)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-NFR-004 Virtualized scrolling | `src/components/data-display/StatTable.tsx` (TanStack Virtual) |
| REQ-NFR-005 Data scoping via RLS | `supabase/migrations/00010_enable_rls.sql`, `supabase/migrations/00011_create_rls_policies.sql` |
| REQ-NFR-006 Claude API timeout | `tests/unit/services/ai-service.test.ts` (10s timeout) |
| REQ-NFR-012 Cards from Supabase | `tests/unit/api/leagues/[id]/draft.test.ts` (player pool from DB) |
| REQ-NFR-013 Zustand persist cache | `tests/unit/stores/persist-migration.test.ts` |
| REQ-NFR-015 Database indexes | `supabase/migrations/00009_create_indexes.sql` |
| REQ-NFR-016 Standings on teams table | `supabase/migrations/00002_create_teams.sql` (wins/losses/runs columns) |

### Test Strategy (REQ-TEST)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-TEST-001 Three-layer pyramid | `vitest.config.ts`, `playwright.config.ts`, `tests/bench/` |
| REQ-TEST-005 Mock rules | All test files follow layer-appropriate mocking |
| REQ-TEST-006 Pure logic zero mocks | `tests/unit/lib/simulation/*.test.ts` (no mocks in pure logic tests) |
| REQ-TEST-008 Test fixtures | `tests/fixtures/` (mock data factories) |
| REQ-TEST-013 Benchmarks non-blocking | `.github/workflows/ci.yml` (benchmarks run as separate step) |
| REQ-TEST-015 CI pipeline | `.github/workflows/ci.yml` (lint, type-check, vitest, bench, e2e) |
| REQ-TEST-016 Vitest config | `vitest.config.ts` (globals, path aliases, coverage thresholds) |

### UI Pages (additional)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-UI-011 Season Archive Page | `tests/unit/features/archive/ArchivePage.test.tsx`, `tests/unit/features/archive/SeasonDetail.test.tsx` |
| REQ-UI-012 Playoff Theme Switch | `tests/unit/hooks/usePostseasonTheme.test.ts`, `src/styles/globals.css` |

## Phase 57: Secrets Management + Migration Standards

### Environment (REQ-ENV-009, REQ-ENV-010)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-ENV-009 Three-environment secret storage | `tests/unit/config/environment.test.ts` (secrets-management.md structure) |
| REQ-ENV-010 API key rotation policy | `tests/unit/config/environment.test.ts` (rotation documentation) |

### Migration Standards (REQ-MIG-002, REQ-MIG-003, REQ-MIG-007, REQ-MIG-008)

| Requirement | Test File(s) |
|-------------|-------------|
| REQ-MIG-002 5-digit prefix + snake_case naming | `tests/unit/migrations/migration-standards.test.ts` |
| REQ-MIG-003 Header comment block | `tests/unit/migrations/migration-standards.test.ts` |
| REQ-MIG-007 Seed data (users, league, teams, schedule) | `tests/unit/migrations/migration-standards.test.ts` |
| REQ-MIG-008 Idempotent ON CONFLICT seeds | `tests/unit/migrations/migration-standards.test.ts` |

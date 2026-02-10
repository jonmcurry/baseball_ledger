# Changelog

## 2026-02-10 - SRD Gap Closure (Phases 17-18)

### Phase 17: Manager AI Completion (REQ-AI-002)
- Extended `GameSituation` with optional `bestBenchOps`, `batterOps`, `platoonAdvantage` fields
- Added `evaluateHitAndRunDecision()` -- runner on 1B only, < 2 outs, baseFactor = contactRate
- Added `evaluatePinchHitDecision()` -- bench OPS vs batter OPS, platoon advantage multiplier
- Added `evaluateAggressiveBaserunning()` -- extra-base advance on singles, baseFactor = runnerSpeed
- Integrated all 3 decisions into `game-runner.ts`:
  - Hit-and-run: DP converted to GROUND_OUT_ADVANCE, runner advances extra base on single
  - Pinch-hit: best bench player by OPS swaps into lineup permanently
  - Aggressive baserunning: runner on 2B scores on single, runner on 1B advances to 3B
- Added `homeBench`/`awayBench` to `RunGameConfig`, local mutable batter card copies for determinism

### Phase 18: Draft Engine + AI Drafter (REQ-DFT-001/002/006/007/008, REQ-AI-008)
- **Created `src/lib/draft/draft-engine.ts`** -- State machine composing draft-order + ai-strategy + roster-validator
  - `initializeDraft()`, `getCurrentPickingTeam()`, `getAvailablePool()`, `submitDraftPick()`, `isDraftComplete()`, `completeDraft()`
  - Turn validation, snake-draft order management, post-draft roster auto-fill
- **Created `src/lib/draft/ai-drafter.ts`** -- Composes ai-strategy + template-draft-reasoning
  - `makeAIPick()` selects player via AI strategy, generates template-based reasoning
  - `runFullAIDraft()` iterates all picks for AI-controlled teams, skips human teams
- **Updated `api/leagues/[id]/draft.ts`**:
  - `handleStart` generates and stores draft order via `generateDraftOrder()`
  - `handlePick` validates turn order via `getPickingTeam()`, checks for completion, transitions to `regular_season`
  - Added `handleAutoPick` action for timer-expired auto-picks (commissioner-only)
- **Updated `src/services/draft-service.ts`** -- added `autoPick()` function
- **Updated `src/services/index.ts`** -- exported `autoPick`

### Metrics
- Vitest: 2,099 -> 2,173 (+74 tests, 185 test files)
- New test files: `draft-engine.test.ts` (33), `ai-drafter.test.ts` (12)
- Updated: `manager-ai.test.ts` (+17), `game-runner.test.ts` (+4), `draft.test.ts` (+5), `draft-service.test.ts` (+2)
- TypeScript: clean build, no errors
- Vite: production build succeeds

## 2026-02-10 - SRD Gap Closure (Phases 12-16)

### Phase 12: Database Schema + Config
- **12A:** Migration `00014_alter_game_logs_columns.sql` adding `game_id`, `innings`, pitcher IDs, `batting_lines`, `pitching_lines` to `game_logs`
- **12B:** Client config module `src/lib/config.ts` (REQ-ENV-003/004) with fail-fast validation of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **12C:** Server config module `api/_lib/config.ts` (REQ-ENV-005) with `getServerConfig()` lazy initialization

### Phase 13: Error Handling Hardening
- **13A:** PostgreSQL error code mapping (REQ-ERR-019/020) in `api/_lib/errors.ts` -- maps PG codes 23505, 23503, 23502, 23514, 40001, 57014, 42P01 to structured error categories with constraint-to-message lookup
- **13B:** Structured JSON logging `api/_lib/logger.ts` (REQ-ERR-013/014) -- `{ timestamp, level, requestId, code, message, context }` format
- **13C:** DB retry wrapper `api/_lib/db-retry.ts` (REQ-ERR-015/016) -- 3 retries, exponential backoff (200/400/800ms), retries transient errors only

### Phase 14: Validation Schemas
- **14A:** Roster schemas `src/lib/validation/roster-schemas.ts` (REQ-ERR-005) -- `rosterActionSchema`, `tradeSchema`, `lineupSchema` with Zod
- **14B:** Simulation/team schemas `src/lib/validation/simulation-schemas.ts` (REQ-ERR-006) -- `simulateSchema`, `updateTeamSchema`

### Phase 15: Wire Up UI Features
- **15A:** Dashboard simulation controls (REQ-SCH-005) -- wired `onSimulate` to `runSimulation` with scope-to-days mapping
- **15B:** GameViewer tabs (REQ-UI-010) -- Play-by-Play / Box Score tab navigation with PlayByPlayFeed and BoxScoreDisplay
- **15C:** ArchivePage data + StampAnimation (REQ-UI-011, REQ-SCH-009) -- `useArchive` hook fetches from API, StampAnimation renders on season completion
- **15D:** PlayoffsPage live bracket (REQ-UI-012) -- `generatePlayoffBracket()` from standings data
- **15E:** RosterPage interactions (REQ-UI-008) -- position selection + bench-to-lineup swap via `updateRosterSlot`, with displaced starter sent to bench
- **15F:** StatsPage sorting (REQ-STS-003) -- client-side sorting with smart defaults (ERA ascending, batting stats descending), fixed nested stats property resolution bug

### Phase 16: Cleanup
- Deleted 3 stale mock service files (`mock-league-service.ts`, `mock-stats-service.ts`, `mock-roster-service.ts`)
- Removed 6 empty placeholder directories and ~35 redundant `.gitkeep` files from directories with real content
- Fixed TRACEABILITY.md: corrected `card-gen/` paths to `card-generator/`, added Phase 12-15 requirement entries
- Cleaned stale comments referencing deleted mock services

### Metrics
- Vitest: 1,978 -> 2,099 (+121 tests, 183 test files)
- TypeScript: clean build, no errors
- Vite: production build succeeds (3.05s)

## 2026-02-09 - API Route Consolidation (24 -> 12 Serverless Functions)

### Changed
- Consolidated 24 API route handlers into 12 to fit Vercel Hobby plan limit
- **Merge A:** 5 AI endpoints -> `api/ai/index.ts` with `?feature=` query param routing
- **Merge B:** 3 Stats endpoints -> `api/leagues/[id]/stats.ts` with `?type=batting|pitching|team`
- **Merge C:** 3 Draft endpoints -> `api/leagues/[id]/draft.ts` (GET=state, POST action=start|pick)
- **Merge D:** 2 Archive endpoints -> `api/leagues/[id]/archive.ts` (GET=list, POST=archive)
- **Merge E:** join.ts merged into `api/leagues/[id]/index.ts` as POST method
- **Merge F:** 3 Teams endpoints -> `api/leagues/[id]/teams.ts` with `?tid=` and `?include=roster`
- Updated 5 client services: ai-service, stats-service, draft-service, league-service, roster-service

### Removed
- 17 handler files (5 AI, 3 stats, 3 draft, 1 archives, 1 join, 4 teams)
- 17 corresponding test files (consolidated into 4 new unified test files)

### Metrics
- Vitest: 1,985 -> 1,978 (175 test files) -- all passing
- Serverless functions: 24 -> 12 (within Vercel Hobby plan limit)

## 2026-02-09 - Phase 11: Final Polish & Hardening

### Added
- **StatTable Virtualization** (Sub-phase 11A, REQ-NFR-004):
  - Integrated `@tanstack/react-virtual` into `StatTable.tsx` for datasets > 50 rows
  - Scroll container with `max-h-[600px]`, spacer rows, sticky thead
  - 600-row datasets render < 50 DOM rows; small datasets unchanged
- **Trade Execution Logic** (Sub-phase 11B, REQ-RST-005, REQ-RST-006):
  - `src/lib/draft/trade-validator.ts` -- Pure function validating roster composition post-swap
  - Extended `api/leagues/[id]/transactions.ts` with atomic trade handler (delete + insert pattern)
  - Rewrote `TradeForm.tsx` with player selection checkboxes for both sides
- **Anonymous Auth** (Sub-phase 11C, REQ-AUTH-001):
  - Added `loginAsGuest()` to `useAuth` hook via `supabase.auth.signInAnonymously()`
  - Added "Play as Guest" button to `LoginPage.tsx`
- **Web Worker Integration** (Sub-phase 11D, REQ-NFR-008):
  - `src/hooks/useWorkerSimulation.ts` -- React hook wrapping `simulateGameInWorker()`
  - Wired into `GameViewerPage.tsx` for client-side game replay with status display
- **pgTAP RLS Tests** (Sub-phase 11E, REQ-MIG-009):
  - Replaced `ok(true)` placeholders in all 6 pgTAP test files with 40 real assertions
  - Tests cover commissioner/member/outsider SELECT, INSERT, UPDATE, DELETE per table
  - Tables: leagues (8), teams (8), rosters (8), schedule (6), season_stats (6), game_logs (4)
- **GitHub Actions CI** (Sub-phase 11F, REQ-TEST-015):
  - `.github/workflows/ci.yml` -- Lint + type-check (app + API) + vitest coverage + benchmarks
  - `.github/workflows/e2e.yml` -- Playwright chromium-only for CI
- **E2E Test Expansion** (Sub-phase 11G, REQ-TEST-017):
  - 3 page objects: `login.page.ts`, `dashboard.page.ts`, `league-config.page.ts`
  - Auth fixture: `fixtures/auth.ts` with Supabase route interception
  - 5 new spec files: `guest-login.spec.ts` (3), `league-creation.spec.ts` (5), `draft-board.spec.ts` (4), `simulation.spec.ts` (4), `roster.spec.ts` (4)

### Modified
- `playwright.config.ts` -- CI-only single browser (chromium) via `process.env.CI` check
- `src/features/transactions/TransactionsPage.tsx` -- Passes `targetRoster` prop to TradeForm

### Metrics
- Vitest: 1,946 -> 1,985 (+39 new, 187 test files)
- E2E: 15 -> 35 (+20 new, 9 spec files)
- pgTAP: 0 -> 40 assertions (6 SQL test files)
- Sub-phases: 11A-11G (virtualization, trade, anon auth, worker, pgTAP, CI, E2E)
- All SRD gaps from audit closed

## 2026-02-09 - Phase 10: Feature UI Implementation

### Added
- **Shared Form Components** (Sub-phase 10A):
  - `src/components/forms/Input.tsx` -- Text input with label, error state, aria-describedby
  - `src/components/forms/Select.tsx` -- Dropdown with label and SelectOption type
  - `src/components/forms/Toggle.tsx` -- Accessible switch with role="switch", aria-checked
  - `src/components/forms/ConfirmDialog.tsx` -- Modal with focus trap, Escape key, overlay click
- **Baseball + Feedback Components** (Sub-phase 10B):
  - `src/components/baseball/DiamondField.tsx` -- SVG diamond (viewBox 400x360) with 9 positions, click-to-assign
  - `src/components/baseball/PlayerCardDisplay.tsx` -- Modal digital baseball card with vintage styling
  - `src/components/baseball/Scoreboard.tsx` -- Compact game state composing BaseIndicator
  - `src/components/feedback/ProgressBar.tsx` -- Linear progress bar with role="progressbar"
- **Draft Store + Hooks** (Sub-phase 10C):
  - `src/stores/draftStore.ts` -- Zustand store for draft state, available players, pick timer
  - `src/hooks/useDraft.ts` -- Composes authStore + leagueStore + draftStore, derives isMyPick
  - `src/hooks/useRealtimeProgress.ts` -- Simulation progress subscription with cache invalidation (REQ-STATE-014)
  - `src/hooks/usePostseasonTheme.ts` -- Sets data-theme="postseason" on html during playoffs (REQ-COMP-002)
- **League Config + Join Pages** (Sub-phase 10D):
  - `src/features/league/LeagueConfigForm.tsx` -- Form sub-component with validation
  - Replaced LeagueConfigPage and JoinLeaguePage stubs with full implementations
- **Draft Board Page** (Sub-phase 10E):
  - `src/features/draft/DraftTicker.tsx` -- Vertical scrolling pick list with role="log"
  - `src/features/draft/AvailablePlayersTable.tsx` -- Sortable/filterable table with search and position filter
  - `src/features/draft/PickTimer.tsx` -- 60s countdown with urgency styling at <10s
  - `src/features/draft/RosterPreviewPanel.tsx` -- Team roster preview filtered by teamId
  - Replaced DraftBoardPage stub with 3-panel layout (ticker, players, roster)
- **Roster Management Page** (Sub-phase 10F):
  - `src/features/roster/LineupDiamond.tsx` -- Wraps DiamondField with lineup editing
  - `src/features/roster/BenchPanel.tsx` -- Bench player list with "Add to Lineup" action
  - `src/features/roster/PitchingRotation.tsx` -- SP1-SP4 with NEXT indicator, bullpen, closer
  - Replaced RosterPage stub with full lineup, bench, and pitching rotation views
- **Game Viewer Page** (Sub-phase 10G):
  - `src/features/game-viewer/PlayByPlayFeed.tsx` -- Scrolling play-by-play with auto-scroll
  - `src/features/game-viewer/BoxScoreDisplay.tsx` -- Full box score composing LineScore
  - `src/features/game-viewer/GameStatePanel.tsx` -- Live game state composing Scoreboard
  - `tests/fixtures/mock-game.ts` -- Factory functions for game results, plays, box scores
  - Replaced GameViewerPage stub with route-param-based game result display
- **Transactions Page** (Sub-phase 10H):
  - `src/features/transactions/AddDropForm.tsx` -- Drop player from roster form
  - `src/features/transactions/TradeForm.tsx` -- Trade proposal with team selection
  - `src/features/transactions/TransactionLog.tsx` -- Transaction history with type badges
  - Replaced TransactionsPage stub with tab layout (Add/Drop, Trade, History)
- **Playoffs + Archive Pages** (Sub-phase 10I):
  - `src/features/playoffs/PlayoffBracketView.tsx` -- Visual bracket with rounds and champion
  - `src/features/playoffs/SeriesCard.tsx` -- Individual series matchup card
  - `src/features/archive/SeasonList.tsx` -- Archived seasons list
  - `src/features/archive/SeasonDetail.tsx` -- Season drill-down with standings
  - Replaced PlayoffsPage and ArchivePage stubs with full implementations

### Modified
- `src/features/dashboard/SimulationControls.tsx` -- Added `leagueStatus` prop; locks to single-game mode during playoffs (REQ-COMP-002)
- `src/styles/globals.css` -- Postseason CSS custom property overrides already present from Phase 1

### Metrics
- Tests: 1,813 -> 1,946 (+133 new, 184 test files)
- Source files: ~260 -> ~295 (+35)
- Sub-phases: 10A-10J (forms, baseball components, draft store/hooks, league pages, draft board, roster, game viewer, transactions, playoffs/archive, polish)
- All 8 stub pages replaced with functional implementations

## 2026-02-09 - Phase 9: Performance & Polish (Final SRD Phase)

### Added
- **Game Orchestrator** (`src/lib/simulation/game-runner.ts`):
  - `runGame(config): GameResult` -- Full game loop tying together all 15+ simulation modules
  - Plate appearance -> outcome resolution -> baserunning -> defense -> stolen bases -> pitching fatigue -> manager AI
  - Pure, deterministic execution via SeededRNG; walk-off detection, extra innings, pitching changes
  - Builds GameResult via `buildBoxScore()`, `buildLineScore()`, `assignPitcherDecisions()`
- **Season Runner** (`src/lib/simulation/season-runner.ts`):
  - `runDay(dayNumber, games, seed): DayResult` -- Batch-processes all games for one day
  - `runSeason(schedule, startDay, endDay, seed): SeasonResult` -- Iterates days with cumulative stats
  - Memory-safe: strips play-by-play after each day per REQ-NFR-010
- **Web Worker** (`src/workers/simulation-worker.ts`, `src/lib/simulation/worker-api.ts`):
  - Client-side simulation in Web Worker keeps UI thread at 60fps (REQ-NFR-008)
  - Map serialization/deserialization for structured clone compatibility
  - Main-thread fallback when Worker unavailable (Node/SSR environments)
- **Server-side Simulation** (`api/_lib/simulate-day.ts`):
  - `simulateDayOnServer()` -- Fetches team data, runs `runDay()`, commits results via PostgreSQL RPC
  - Atomic transaction: inserts game_logs, updates season_stats, updates standings (REQ-NFR-014)
- **Simulate Day RPC** (`supabase/migrations/00013_simulate_day_rpc.sql`):
  - PostgreSQL function `simulate_day_commit(league_id, day_results)` for atomic multi-table writes (REQ-NFR-016)
- **StampAnimation** (`src/components/feedback/StampAnimation.tsx`):
  - CSS-only stamp-slam animation for "SEASON COMPLETED" overlay (REQ-SCH-009, REQ-COMP-011)
  - Respects `prefers-reduced-motion` media query
- **Traditional/Advanced Stats Toggle** (REQ-STS-005):
  - `StatColumnConfigs.ts` -- 4 column sets: BATTING_COLUMNS_TRADITIONAL/ADVANCED, PITCHING_COLUMNS_TRADITIONAL/ADVANCED
  - Traditional: AVG, HR, RBI, ERA, W, SV; Advanced: OPS, OBP, SLG, WHIP, K/9
  - Toggle button in StatsPage with persisted preference via statsStore
- **Performance Benchmarks** (`tests/bench/`):
  - `simulation.bench.ts` -- Single game < 500ms (REQ-NFR-001), 10-game day < 5s, 20-game batch < 10s (REQ-NFR-002)
  - `csv-parse.bench.ts` -- CSV parse timing (REQ-NFR-003)
  - Implemented as timed tests with `performance.now()` assertions
- **Determinism Tests** (`tests/unit/lib/simulation/determinism.test.ts`):
  - REQ-NFR-007 + REQ-TEST-014: Same seed produces identical scores, play-by-play, box scores, batting lines
  - Different seeds produce different results; deterministic across 5 consecutive runs
- **Traceability Matrix** (`tests/TRACEABILITY.md`):
  - REQ-TEST-011: Full requirement-to-test mapping for all REQ-* identifiers
- **E2E Tests** (`tests/e2e/`):
  - `splash.spec.ts` -- Landing page title, Create/Join links (3 tests)
  - `auth.spec.ts` -- Login form fields, submit button, validation, splash link (4 tests)
  - `navigation.spec.ts` -- Auth redirect, 404 page, return home link (4 tests)
  - `stats.spec.ts` -- Auth guard verification for stats/roster/standings/draft routes (4 tests)

### Modified
- `api/leagues/[id]/simulate.ts` -- Replaced stub with real simulation logic (single-day sync, multi-day async)
- `vite.config.ts` -- Added manual chunk splitting (vendor/simulation/ui) and Web Worker support (REQ-NFR-017)
- `vitest.config.ts` -- Added coverage thresholds: 60% statements, 50% branches, 55% functions, 60% lines (REQ-TEST-003/004)
- `playwright.config.ts` -- Added Firefox and WebKit projects for multi-browser E2E (REQ-TEST-017)
- `src/features/stats/StatsPage.tsx` -- Added traditional/advanced toggle button
- `src/stores/statsStore.ts` -- Added `statView` state with localStorage persistence
- `src/styles/globals.css` -- Added stamp-slam/cursor-blink keyframes, reduced-motion overrides
- `index.html` -- Added font preload with Latin subset for ~60% size reduction (REQ-NFR-018)

### Metrics
- Tests: 1,749 -> 1,813 (+64 new, 148 test files)
- Source files: ~244 -> ~260 (+16)
- Sub-phases: 9A (game orchestrator), 9B (web worker + API), 9C (stats toggle + animations), 9D (benchmarks + determinism), 9E (E2E tests)
- All SRD requirements addressed

## 2026-02-09 - Phase 8: AI Enhancement (REQ-AI-006, REQ-AI-007, REQ-AI-008)

### Added
- **AI Type Definitions** (`src/lib/types/ai.ts`):
  - CommentaryStyle, AiSource, ManagerDecisionType type aliases
  - Request/Response interfaces for all 5 AI features: Commentary, GameSummary, TradeEvaluation, DraftReasoning, ManagerExplanation
  - Barrel re-exports via `src/lib/types/index.ts`
- **Template Fallback Engine** (REQ-AI-008 -- graceful degradation):
  - `src/lib/ai/commentary-templates.ts` -- 250+ template strings covering 26 OutcomeCategory x 3 styles (newspaper/radio/modern) x 3 situations (routine/clutch/dramatic)
  - `src/lib/ai/template-commentary.ts` -- Deterministic commentary selection via hash(batterId + inning + outs), situation detection (routine/clutch/dramatic)
  - `src/lib/ai/template-game-summary.ts` -- Headline variants (Rout/Cruise/Nip/Top/Edge), lead paragraph, highlights, line score
  - `src/lib/ai/template-trade-eval.ts` -- Manager personality thresholds (conservative +15%, aggressive -5%, balanced +5%, analytical +10% with positional premiums)
  - `src/lib/ai/template-draft-reasoning.ts` -- Round-aware reasoning (early/mid/late tiers matching ai-strategy.ts)
  - `src/lib/ai/template-manager-explanation.ts` -- Decision type x personality templates for steal/bunt/IBB/pull decisions
- **Claude API Client** (`api/_lib/claude-client.ts`):
  - Anthropic SDK wrapper with 10s timeout, 3 retries with exponential backoff (1s/2s/4s)
  - `isClaudeAvailable()` checks for ANTHROPIC_API_KEY
  - `callClaude()` returns null on failure (callers use templates)
- **Prompt Builders** (`api/_lib/prompts/`):
  - 5 prompt builder modules: commentary, game-summary, trade-eval, draft-reasoning, manager-explanation
  - Style-specific system prompts with structured user prompts
- **AI Error Codes** (`src/lib/errors/error-codes.ts`):
  - Added CLAUDE_TIMEOUT, CLAUDE_MALFORMED, CLAUDE_UNAVAILABLE codes
  - Added `createExternalError()` factory for 502 responses
- **AI API Endpoints** (`api/ai/`):
  - POST /api/ai/commentary -- Play-by-play commentary
  - POST /api/ai/game-summary -- Post-game newspaper recap
  - POST /api/ai/trade-eval -- Trade evaluation with manager personality
  - POST /api/ai/draft-reasoning -- Draft pick explanation
  - POST /api/ai/manager-explanation -- In-game decision explanation
  - All endpoints: checkMethod(POST) -> requireAuth -> validateBody(Zod) -> callClaude -> template fallback -> ok(200)
- **Client AI Service** (`src/services/ai-service.ts`):
  - 5 functions: generateCommentary, generateGameSummary, evaluateTrade, generateDraftReasoning, explainManagerDecision
  - Barrel re-export via `src/services/index.ts`

### Metrics
- Tests: 1,688 -> 1,749 (+61 new, 17 test files)
- Source files: ~224 -> ~244 (+20)
- AI endpoints: 0 -> 5
- Template fallbacks: 0 -> 5
- Lint errors: 19 pre-existing (unchanged)

## 2026-02-09 - Phase 7: Integration Layer (REQ-MIG, REQ-API, REQ-DATA-007, REQ-NFR-005/015/019)

### Added
- **SQL Migrations** (REQ-MIG-001 through REQ-MIG-013):
  - 12 migration files in `supabase/migrations/` -- leagues, teams, rosters, schedule, season_stats, game_logs, archives, simulation_progress tables; indexes; RLS enable + policies; season_year column
  - `supabase/seed.sql` -- Idempotent seed data (3 users, 1 league, 8 teams, 168 players, 20 schedule days, stats)
  - 6 pgTAP RLS test stubs in `supabase/tests/` (require Docker to execute)
- **Database TypeScript Types** (REQ-API-008):
  - `src/lib/types/database.ts` -- Row/Insert/Update types per table; Database interface matching Supabase gen types format; Relationships metadata
- **Supabase Client Wrappers**:
  - `src/lib/supabase/client.ts` -- Browser client singleton with VITE_SUPABASE_URL/ANON_KEY
  - `src/lib/supabase/server.ts` -- Server client for API functions with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
- **API Infrastructure** (`api/_lib/`):
  - `response.ts` -- ok/created/accepted/noContent/paginated helpers with X-Request-Id and ApiResponse envelope
  - `errors.ts` -- handleApiError mapping AppError categories to HTTP status codes (400/401/403/404/409/429/500)
  - `validate.ts` -- Zod-based validateBody/validateQuery with AppError transformation
  - `auth.ts` -- requireAuth extracting Bearer token, verifying via Supabase auth.getUser()
  - `transform.ts` -- Deep recursive snakeToCamel/camelToSnake field conversion (REQ-API-008)
  - `method-guard.ts` -- HTTP method validation returning 405
- **API Endpoints** (~20 files in `api/leagues/`):
  - League CRUD: POST create, GET by ID, DELETE (commissioner only), POST join via invite_key
  - Team/Roster: GET list teams, PATCH update team, GET roster
  - Standings/Schedule: GET computed standings, GET schedule with optional day filter
  - Statistics: GET paginated batting/pitching leaders (REQ-NFR-019), GET team aggregate stats
  - Simulation: POST sync (1 day, 200) or async (multi-day, 202) with simulation_progress
  - Game detail: GET box score + play-by-play
  - Draft: POST start, POST pick with turn validation, GET state
  - Transactions: POST add/drop/trade with roster limit validation
  - Archive: POST archive season (commissioner only), GET list past seasons
- **Client Service Layer** (`src/services/`):
  - `api-client.ts` -- fetch wrapper with auth headers from Supabase session, envelope unwrapping, error mapping
  - `league-service.ts` -- 7 functions (fetchLeague, createLeague, deleteLeague, joinLeague, fetchTeams, fetchStandings, fetchSchedule)
  - `roster-service.ts` -- 3 functions (fetchRoster, updateTeam, updateLineup)
  - `stats-service.ts` -- 3 functions (fetchBattingLeaders, fetchPitchingLeaders, fetchTeamStats)
  - `simulation-service.ts` -- 3 functions + Supabase Realtime subscription for async sim progress
  - `draft-service.ts` -- 3 functions (startDraft, submitPick, fetchDraftState)
  - `index.ts` -- Barrel re-export of all service functions
- **Store Async Integration** (REQ-STATE-003, REQ-STATE-004):
  - `leagueStore.ts` -- Added fetchLeagueData, fetchStandings, fetchSchedule async actions
  - `rosterStore.ts` -- Added fetchRoster, saveLineup async actions
  - `statsStore.ts` -- Added fetchBattingLeaders, fetchPitchingLeaders, fetchTeamStats async actions
  - `simulationStore.ts` -- Added runSimulation, subscribeToSimProgress, unsubscribeFromSimProgress async actions
  - `authStore.ts` -- Added initialize() with getSession + onAuthStateChange listener
- **Auth Integration**:
  - `useAuth.ts` -- Added login/signup functions calling Supabase Auth
  - `LoginPage.tsx` -- Wired with controlled form, error handling, navigation
  - `AuthGuard.tsx` -- Real auth check with initialization + redirect to /login
- **Test Infrastructure**:
  - `tests/fixtures/mock-supabase.ts` -- Factory for mocked Supabase query builder, request, response

### Changed
- `.eslintrc.cjs` -- Added `argsIgnorePattern: '^_'` for unused vars, `no-explicit-any: off` for test files

### Verification
- `npm test` -- 1,574 tests pass across 122 test files (1,320 existing + 254 new)
- New tests: 65 API infrastructure + 105 API endpoints + 41 services + 43 store/auth = 254
- `npx tsc --noEmit -p api/tsconfig.json` -- API directory compiles clean
- `npx tsc --noEmit` -- Main app: only pre-existing platoon.ts warnings
- `npm run lint` -- 19 pre-existing errors from prior phases; zero new Phase 7 errors
- Plan document: `docs/plans/phase-7-integration.md`

### Phase 7 Complete
5 sub-phases finished (7A-7E). ~64 new source files + ~41 new test files. Full integration layer from SQL schema through API endpoints, client services, to store async actions. Frontend remains functional with mock data; real services ready for Supabase deployment.

## 2026-02-09 - Phase 6: Frontend Foundation (REQ-COMP, REQ-STATE, REQ-ARCH-002)

### Added
- **Feedback Components** (REQ-COMP-003, REQ-ERR-010, REQ-ERR-011):
  - `src/components/feedback/ErrorBanner.tsx` -- Severity-based alert banner (error/warning/info) with auto-dismiss, role="alert"/role="status"
  - `src/components/feedback/LoadingLedger.tsx` -- Animated loading indicator with 3 bouncing dots, role="status"
  - `src/components/feedback/TypewriterText.tsx` -- Character-by-character text reveal with blinking cursor, aria-live="polite"
  - `src/components/feedback/ErrorBoundary.tsx` -- React class error boundary with "Try Again" and "Return to Dashboard" fallback
- **Data Display Components** (REQ-COMP-003, REQ-COMP-004):
  - `src/components/data-display/Pagination.tsx` -- Previous/Next navigation with boundary disabling
  - `src/components/data-display/StatTable.tsx` -- Generic sortable statistics table with StatColumn<T> interface, loading shimmer, row highlighting
  - `src/components/data-display/StandingsTable.tsx` -- Division standings using computeWinPct/computeGamesBehind from Layer 1
- **Baseball Display Components** (REQ-COMP-003):
  - `src/components/baseball/LineScore.tsx` -- Classic baseball line score table (innings, R/H/E)
  - `src/components/baseball/BaseIndicator.tsx` -- SVG diamond with occupied/empty base indicators
- **Layout Components** (REQ-COMP-005, REQ-COMP-012):
  - `src/components/layout/AppShell.tsx` -- Skip-to-content link, main#main-content, ErrorBoundary wrapper
  - `src/components/layout/Header.tsx` -- League nav with postseason variant styling, commissioner-only links
  - `src/components/layout/Footer.tsx` -- Simple footer with role="contentinfo"
- **Router** (REQ-COMP-005, REQ-COMP-006):
  - `src/router.tsx` -- createBrowserRouter with 13+ routes, lazy-loading, AuthGuard, 404 catch-all
  - Updated `src/App.tsx` to use RouterProvider
- **Feature Page Shells** (REQ-COMP-008):
  - 15 feature page files across splash, auth, dashboard, league, draft, roster, stats, game-viewer, playoffs, archive, transactions, standings
- **Zustand Stores** (REQ-STATE-001 through REQ-STATE-016):
  - `src/stores/storage-factory.ts` -- createSafeStorage() with localStorage test + memory fallback
  - `src/stores/authStore.ts` -- User/session/initialization state (devtools)
  - `src/stores/leagueStore.ts` -- League/teams/standings/schedule state (devtools+persist+immer)
  - `src/stores/rosterStore.ts` -- Active team roster state (devtools+persist+immer)
  - `src/stores/simulationStore.ts` -- Simulation progress/results (devtools)
  - `src/stores/statsStore.ts` -- Batting/pitching leaders, pagination (devtools+persist)
- **Mock Services** (Layer 3 stubs):
  - `src/services/mock-league-service.ts` -- Hardcoded league/team/standings/schedule data
  - `src/services/mock-roster-service.ts` -- Hardcoded roster with PlayerCard objects
  - `src/services/mock-stats-service.ts` -- Hardcoded batting/pitching leaders
- **Hooks Layer** (REQ-STATE-006, REQ-STATE-007):
  - `src/hooks/useAuth.ts` -- Composes authStore, derived isAuthenticated
  - `src/hooks/useLeague.ts` -- Composes authStore+leagueStore, derived isCommissioner
  - `src/hooks/useTeam.ts` -- Composes authStore+leagueStore+rosterStore, derived myTeam/starters/bench
  - `src/hooks/useSimulation.ts` -- Composes simulationStore, derived progressPct/isRunning
- **Key Feature Pages** (REQ-COMP-008, REQ-COMP-009):
  - `src/features/dashboard/DashboardPage.tsx` -- League dashboard with standings, schedule, simulation controls
  - `src/features/dashboard/SimulationControls.tsx` -- Day/Week/Month/Season buttons with progress bar
  - `src/features/dashboard/ScheduleView.tsx` -- Game list for current day with scores
  - `src/features/stats/StatsPage.tsx` -- Batting/pitching tabs, AL/NL/combined filter, pagination
  - `src/features/stats/StatColumnConfigs.ts` -- 17 batting + 15 pitching column configs
  - `src/features/standings/StandingsPage.tsx` -- Full standings with division grouping
- **Test Fixtures**:
  - `tests/fixtures/mock-league.ts` -- Factory functions for league/team/standings/schedule data
  - `tests/fixtures/mock-roster.ts` -- Factory functions for roster entries
  - `tests/fixtures/mock-stats.ts` -- Factory functions for batting/pitching leaders

### Verification
- `npm test` -- 1,320 tests pass across 84 test files (1,093 existing + 227 new)
- New tests: 82 components + 30 layout + 48 stores + 30 hooks + 37 features = 227
- `npx tsc --noEmit` -- Only pre-existing platoon.ts warnings
- `npm run lint` -- Zero new errors (20 pre-existing in test files + platoon.ts)
- Plan document: `docs/plans/phase-6-frontend.md`

### Phase 6 Complete
5 sub-phases finished. ~49 new source files + ~28 new test files. Full frontend foundation with components, stores, hooks, routing, and feature pages ready for service integration.

## 2026-02-09 - Phase 5: Schedule & Statistics Pure Logic (REQ-SCH, REQ-STS, REQ-LGE-008)

### Added
- **Derived Stats Calculator** (REQ-STS-002):
  - `src/lib/stats/derived.ts` -- IP baseball notation conversion (ipToDecimal, addIP), batting derived (BA, OBP, SLG, OPS), pitching derived (ERA, WHIP, K/9, BB/9), computeDerivedBatting/computeDerivedPitching
- **Stats Accumulator** (REQ-STS-001):
  - `src/lib/stats/accumulator.ts` -- createEmptyBattingStats, createEmptyPitchingStats, accumulateBatting (immutable, recomputes derived), accumulatePitching (maps decision to W/L/SV/HLD/BS, uses addIP), accumulateGameStats (processes full game)
- **Standings Calculator** (REQ-SCH-006, REQ-STS-004):
  - `src/lib/stats/standings.ts` -- computeWinPct, computeGamesBehind, computePythagorean (RS^2/(RS^2+RA^2)), sortStandings (tiebreak: win%, run diff, runs scored), computeStandings (group by league/division), getDivisionWinners, getWildCardTeams
- **League Leaders** (REQ-STS-003, REQ-STS-004):
  - `src/lib/stats/leaders.ts` -- isBattingQualified (3.1 PA/team game), isPitchingQualified (1 IP/team game), getBattingLeaders/getPitchingLeaders (rate vs counting stat qualification, ERA/WHIP ascending sort), filterByLeague (AL/NL/combined), computeTeamAggregateStats (team BA/OBP/SLG/ERA, Pythagorean W%)
- **Schedule Generator** (REQ-SCH-001 through REQ-SCH-004):
  - `src/lib/schedule/generator.ts` -- Circle method round-robin pairing, division-weighted matchups (intraDivisionWeight), SeededRNG determinism, bye handling for odd team counts, league separation (AL/NL independent)
- **Playoff Bracket** (REQ-LGE-008):
  - `src/lib/schedule/playoff-bracket.ts` -- 2025 MLB format: WC(BO3), DS(BO5), CS(BO7), WS(BO7); seedPlayoffTeams (3 div winners + 3 wild cards), home-field patterns (H-A-H, H-A-A-H-H, H-A-A-H-H-A-H), recordPlayoffGameResult (immutable), getNextPlayoffGame; adapts for smaller leagues

### Modified
- `src/lib/types/schedule.ts` -- Added playoff types: PlayoffRoundName, PlayoffTeamSeed, PlayoffGame, PlayoffSeries, PlayoffRound, PlayoffBracket
- `src/lib/types/index.ts` -- Added playoff type exports
- `src/lib/errors/error-codes.ts` -- Added SCHEDULE_INVALID_TEAM_COUNT, SCHEDULE_NO_TEAMS, PLAYOFF_INSUFFICIENT_TEAMS, PLAYOFF_SERIES_COMPLETE

### Verification
- `npm test` -- 1,093 tests pass across 58 test files (953 existing + 140 new)
- New tests: 34 derived + 21 accumulator + 20 standings + 20 leaders + 24 schedule + 21 playoff = 140
- All new source files lint clean with `npx eslint`
- Plan document: `docs/plans/phase-5-schedule-stats.md`

### Phase 5 Complete
All 7 tasks (0-6) finished. 6 new source files + 6 new test files. All Layer 1 pure logic modules for schedule generation, playoff brackets, and statistics pipeline are complete.

## 2026-02-09 - Phase 4A: League & Draft Pure Logic (REQ-LGE, REQ-DFT, REQ-RST, REQ-ERR)

### Added
- **Error Handling Foundation** (REQ-ERR-001, REQ-ERR-002):
  - `src/lib/errors/error-codes.ts` -- ErrorCode constants for all domains (AUTH, DRAFT, LEAGUE, ROSTER, VALIDATION, SIMULATION, DATA, EXTERNAL)
  - `src/lib/errors/app-error.ts` -- AppError class extending Error with category, code, statusCode, details
  - `src/lib/errors/error-factory.ts` -- Factory functions: createValidationError, createAuthError, createNotFoundError, createConflictError, createDraftError, createLeagueError, createSimulationError
- **Team Name Generation** (REQ-LGE-004):
  - `src/lib/league/team-generator.ts` -- 57 US cities, 60 mascots, Fisher-Yates shuffle with SeededRNG, no duplicates within a league
- **Division Assignment** (REQ-LGE-005):
  - `src/lib/league/division-assignment.ts` -- AL/NL split, 4 divisions (East/South/West/North), even distribution with remainder handling
- **Invite Key Generation** (REQ-LGE-003):
  - `src/lib/league/invite-key.ts` -- 12-char alphanumeric keys from SeededRNG (62-char charset)
- **Draft Order & Snake Logic** (REQ-DFT-001, REQ-DFT-002):
  - `src/lib/draft/draft-order.ts` -- 21-round snake draft, Fisher-Yates shuffle, getPickingTeam, getNextPick
- **AI Draft Valuation** (REQ-DFT-007):
  - `src/lib/draft/ai-valuation.ts` -- Batter: (OPS*100)+(SB*0.5)+(fieldingPct*20)+positionBonus; SP: ((4.50-ERA)*30)+(K9*5)-(BB9*8)+(stamina*3); RP/CL: ((3.50-ERA)*25)+(K9*6)-(BB9*10); selectBestSeason for multi-season players
- **AI Draft Strategy** (REQ-DFT-006):
  - `src/lib/draft/ai-strategy.ts` -- Need-first approach: early rounds (1-3) best available excluding RP/CL; mid rounds (4-8) SP rotation then premium positions (C/SS/CF); late rounds (9+) CL, RP, remaining starters, bench
- **Roster Validation** (REQ-DFT-008, REQ-RST-001):
  - `src/lib/draft/roster-validator.ts` -- validateRoster, getRosterGaps, autoFillRoster; enforces 21-player composition (9 starters + 4 bench + 4 SP + 3 RP + 1 CL); OF positions interchangeable
- **Lineup Generation** (REQ-RST-003, REQ-RST-004):
  - `src/lib/roster/lineup-generator.ts` -- AI lineup: #1=highest OBP+speed, #2=highest contact, #3=highest OPS, #4=highest SLG, #5-7=next OPS, #8=weakest, #9=second weakest; validateLineup checks 9 slots + position coverage
- **Zod Validation Schemas** (REQ-ERR-005, REQ-ERR-006, REQ-ERR-007):
  - `src/lib/validation/league-schemas.ts` -- createLeagueSchema (name 3-50, teamCount even 4-32, yearRange 1901-2025, injuriesEnabled), joinLeagueSchema (12-char alphanumeric inviteKey)
  - `src/lib/validation/draft-schemas.ts` -- draftPickSchema (leagueId UUID, teamId UUID, playerId, seasonYear 1901-2025)
  - `src/lib/validation/zod-error-mapper.ts` -- mapZodError transforms ZodError to AppError with field-level ValidationDetail[]

### Verification
- `npm test` -- 953 tests pass across 52 test files (744 existing + 209 new)
- New tests: 26 error + 19 team-gen + 17 division + 6 invite-key + 20 draft-order + 24 ai-valuation + 13 ai-strategy + 23 roster-validator + 19 lineup-gen + 42 validation = 209
- All new source files compile cleanly with `tsc --noEmit`
- Plan document: `docs/plans/phase-4-league-draft.md`

### Phase 4A Complete
All 10 pure logic tasks finished. Sub-phases 4B-4D (infrastructure, services/API, state/UI) deferred until Docker is available for local Supabase.

## 2026-02-09 - Phase 3, Task 15: Manager AI Decisions (REQ-AI-001 through REQ-AI-004)

### Added
- **Manager Profiles**: `src/lib/simulation/manager-profiles.ts` -- Four APBA BBW manager personalities per REQ-AI-001
  - Cap Spalding (conservative): high bunt, low steal, lets starters go deep
  - Duke Robinson (aggressive): high steal, low bunt, quick hook
  - Johnny McCoy (balanced): moderate thresholds across all decisions
  - Larry Pepper (analytical): data-driven, almost never bunts, platoon-heavy
  - `getManagerProfile()` helper function
- **Manager AI Decision Engine**: `src/lib/simulation/manager-ai.ts` -- Pre-pitch decision evaluation per REQ-AI-002/003/004
  - `getInningMultiplier()` -- 1.0 early, lateInningMultiplier (7-9), extraInningMultiplier (10+)
  - `computeDecisionScore()` -- baseFactors * threshold * inningMultiplier
  - `evaluateStealDecision()` -- speed * close-game factor, blocked by 2 outs or blowout
  - `evaluateBuntDecision()` -- (1 - contactRate) * threshold, requires 0 outs, game within 2
  - `evaluateIntentionalWalkDecision()` -- OPS rank * scoring pos factor, requires 1B open
  - `evaluatePitcherPullDecision()` -- fatigue factor * (1 - tolerance), higher tolerance = more patient
- **Manager AI Tests**: 33 tests across 2 files covering all 4 profiles, decision formulas, prerequisites, comparative rates, determinism

### Verification
- `npm test` -- 744 tests pass across 40 test files (711 existing + 33 new)
- `npm run lint` -- New files pass ESLint with 0 errors

### Phase 3 Complete
All 15 simulation engine tasks are now complete:
- Tasks 1-2: SeededRNG + OutcomeTable (foundation)
- Tasks 3-7: Outcome Resolver, Plate Appearance, Card Value Fallback, Archetype Modifiers, Platoon (core PA pipeline)
- Tasks 8-11: Bunt Resolver, Baserunner Engine, Defense Engine, Stolen Base (specialized mechanics)
- Tasks 12-14: Pitching Management, Game State Machine, Game Result/Box Score (game orchestration)
- Task 15: Manager AI (strategic decision layer)

## 2026-02-09 - Phase 3, Task 14: Game Result & Box Score (REQ-SIM-016)

### Added
- **Game Result Builder**: `src/lib/simulation/game-result.ts` -- Post-game output generation per REQ-SIM-016
  - `buildLineScore()` -- Accumulates per-half-inning runs into line score arrays (handles extra innings, skipped bottom half)
  - `buildBoxScore()` -- Assembles BoxScore with line score, hits, and errors
  - `assignPitcherDecisions()` -- W/L/SV assignment: starter W with 5+ IP, reliever W otherwise, save with lead <= 3
  - `buildEmptyBattingLine()` / `buildEmptyPitchingLine()` -- Zero-initialized stat lines
- **Game Result Tests**: `tests/unit/lib/simulation/game-result.test.ts` -- 12 tests covering line score building, box score assembly, pitcher decision assignment, stat line initialization

### Verification
- `npm test` -- 711 tests pass across 38 test files (699 existing + 12 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 13: Game State Machine (REQ-SIM-001, REQ-SIM-002, REQ-SIM-015)

### Added
- **Game Engine**: `src/lib/simulation/engine.ts` -- Game state machine and flow control per REQ-SIM-001/002/015
  - `createInitialGameState()` -- Initializes game state from config (inning 1, top, 0-0, empty bases)
  - `advanceHalfInning()` -- Top -> Bottom or Bottom -> next inning Top; resets outs/bases/counters
  - `isGameOver()` -- Checks 9+ innings with leader, walk-off detection, extra innings support
  - `shouldSkipBottomHalf()` -- Home team skip when already winning after 9th+ top half
  - `getBattingTeam()` / `getFieldingTeam()` -- Identifies active teams by half-inning
  - `advanceBatterIndex()` -- 9-slot batting order cycling
- **Game Engine Tests**: `tests/unit/lib/simulation/engine.test.ts` -- 31 tests covering state initialization, half-inning advancement, game completion logic, walk-offs, extra innings, team identification, batting order cycling

### Verification
- `npm test` -- 699 tests pass across 37 test files (668 existing + 31 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 12: Pitching Management (REQ-SIM-010 through 014)

### Added
- **Pitching Manager**: `src/lib/simulation/pitching.ts` -- Pitcher fatigue, bullpen decisions, rotation per REQ-SIM-010-014
  - `computeEffectiveGrade()` -- Grade degradation: starters -2/inning beyond stamina, relievers -3/inning (min 1)
  - `shouldRemoveStarter()` -- 4 removal triggers: grade <= 50%, 4+ ER/4+ IP, 3 consecutive H/W after 5th, with shutout/no-hitter protection
  - `selectReliever()` -- Selects highest-grade available reliever (excludes closers)
  - `shouldBringInCloser()` -- Closer enters when winning by <= 3 in 9th+, <= 2 runners on base
  - `getNextStarter()` -- 4-man rotation cycling via game number modulo
- **Pitching Tests**: `tests/unit/lib/simulation/pitching.test.ts` -- 31 tests covering fatigue degradation, all removal triggers, reliever selection, closer logic, rotation cycling

### Verification
- `npm test` -- 668 tests pass across 36 test files (637 existing + 31 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 11: Stolen Base Resolution (REQ-SIM-009)

### Added
- **Stolen Base Resolver**: `src/lib/simulation/stolen-base.ts` -- Stolen base attempt resolution per REQ-SIM-009
  - `canAttemptStolenBase()` -- Eligibility check: runner on 1B/2B with < 2 outs
  - `computeStolenBaseProbability()` -- speed * 0.75 + 0.15 (speed archetype) - catcher.arm * 0.20
  - `attemptStolenBase()` -- Resolves SB attempt: success advances runner, failure = caught stealing
- **Stolen Base Tests**: `tests/unit/lib/simulation/stolen-base.test.ts` -- 17 tests covering eligibility, probability computation, success/failure outcomes, statistical rates, determinism

### Verification
- `npm test` -- 637 tests pass across 35 test files (620 existing + 17 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 10: Defense Engine (REQ-SIM-008, REQ-SIM-008a)

### Added
- **Defense Engine**: `src/lib/simulation/defense.ts` -- Error resolution and DP defense checks per REQ-SIM-008/008a
  - `getResponsiblePosition()` -- Maps outcome type to responsible fielding position (ground balls to IF, fly balls to OF, etc.)
  - `checkForError()` -- Error probability = 1 - fieldingPct, checked via seeded RNG
  - `checkDPDefense()` -- DP succeeds if SS/2B avg fieldingPct >= 0.95; 10% failure rate below threshold
- **Defense Engine Tests**: `tests/unit/lib/simulation/defense.test.ts` -- 15 tests covering position assignment, error rates, DP defense, determinism

### Verification
- `npm test` -- 620 tests pass across 34 test files (605 existing + 15 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 9: Baserunner Engine (REQ-SIM-006, REQ-SIM-007)

### Added
- **Baserunner Engine**: `src/lib/simulation/baserunner.ts` -- Speed checks and runner advancement per REQ-SIM-006/007
  - `computeEffectiveSpeed()` -- Base speed + modifiers: +0.15 speed archetype (6,0), -0.10 strong arm (>0.8), +0.10 two outs
  - `performSpeedCheck()` -- Random vs effective speed determines extra-base taking
  - `advanceRunnerOnSingle()` -- 1B: speed check for 3B; 2B/3B: always score
  - `advanceRunnerOnDouble()` -- 1B: speed check to score; 2B/3B: always score
  - `canTagUp()` -- Runner on 3B can tag on fly out with <2 outs
- **Baserunner Tests**: `tests/unit/lib/simulation/baserunner.test.ts` -- 23 tests covering effective speed computation, speed checks, single/double advancement, tag-up rules

### Verification
- `npm test` -- 605 tests pass across 33 test files (582 existing + 23 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 8: Bunt Resolution (REQ-SIM-004c)

### Added
- **Bunt Resolver**: `src/lib/simulation/bunt-resolver.ts` -- Probability-based bunt resolution per REQ-SIM-004c
  - 65% sacrifice success, 15% bunt foul, 10% bunt-for-hit attempt, 10% pop out
  - Bunt foul with 2 strikes = strikeout; <2 strikes = resume PA
  - Bunt-for-hit: speed > 0.6 AND 35% chance = single; else ground out
- **Bunt Resolver Tests**: `tests/unit/lib/simulation/bunt-resolver.test.ts` -- 15 tests covering probability distributions, all bunt outcomes, edge cases, determinism

### Verification
- `npm test` -- 582 tests pass across 32 test files (567 existing + 15 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 6: Archetype Modifiers (REQ-SIM-004 step 6)

### Added
- **Archetype Modifier**: `src/lib/simulation/archetype-modifier.ts` -- Applies archetype-based bonuses after outcome determination per REQ-SIM-004 step 6
  - Power (1,0)/(1,1): 15% chance to upgrade FLY_OUT to HOME_RUN
  - Speed (6,0): Flags stolen base opportunity on singles/walks/HBP
  - Contact+Speed (0,2): 20% chance to downgrade strikeouts to GROUND_OUT
  - Elite defense (8,0), standard, pitcher, utility: No batting modifier
  - Detection helpers: `isPowerArchetype()`, `isSpeedArchetype()`, `isContactSpeedArchetype()`
- **Archetype Modifier Tests**: `tests/unit/lib/simulation/archetype-modifier.test.ts` -- 29 tests covering all archetype types, probability rates, non-modifying archetypes, determinism

### Verification
- `npm test` -- 567 tests pass across 31 test files (538 existing + 29 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 3: Outcome Resolver (REQ-SIM-005)

### Added
- **Outcome Resolver**: `src/lib/simulation/outcome-resolver.ts` -- Maps OutcomeCategory to concrete game state changes per REQ-SIM-005 and REQ-SIM-007
  - `resolveOutcome()` -- Main function: takes OutcomeCategory + BaseState + outs + batterId, returns OutcomeResolution with new bases, outs added, runs scored, batter destination, sac fly flag, RBI credits
  - `advanceAllRunners()` -- Moves all runners forward by N bases (3B first per REQ-SIM-007), scoring runners that pass home
  - `forceAdvance()` -- Walk/HBP force logic: runners advance only when pushed by chain of occupied bases
  - `removeLeadRunner()` -- Removes runner closest to home plate (for fielder's choice and DP)
  - Handles all 26 OutcomeCategory values: hits (singles clean/advance, doubles, triples, HRs), outs (ground/fly/pop/line/strikeout), walks/HBP, double plays (ground + line with degradation), special plays (sacrifice, error, FC), no-PA events (wild pitch, balk, passed ball, SB opportunity)
  - Conservative defaults for speed-dependent outcomes (Task 9 Baserunner Engine will add speed check overlay)
- **Outcome Resolver Tests**: `tests/unit/lib/simulation/outcome-resolver.test.ts` -- 74 tests covering helpers, all outcome types, edge cases (3rd out prevents runs, bases loaded DP, grand slams)

### Verification
- `npm test` -- 538 tests pass across 30 test files (464 existing + 74 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-08 - Phase 2: Card Generator (APBA Port)

### Added
- **Card Generator**: 8 source files in `src/lib/card-generator/` implementing APBA-style card generation from Lahman stats per REQ-DATA-005, REQ-DATA-005a, REQ-DATA-006
  - `structural.ts` -- 9 structural constants at card positions 1,3,6,11,13,18,23,25,32 with values 30,28,27,26,31,29,25,32,35 (Step 2)
  - `rate-calculator.ts` -- Per-PA rate computation from BattingStats (walkRate, strikeoutRate, homeRunRate, singleRate, doubleRate, tripleRate, sbRate, ISO) per Step 1
  - `power-rating.ts` -- ISO-to-8-tier power scale mapping at card position 24 (values 13,15,16,17,18,19,20,21) per Step 4
  - `archetype.ts` -- Hierarchical decision tree for bytes 33-34: pitcher(0,6), power(1,0/1,1), speed(6,0), contact+speed(0,2), elite defense(8,0), utility(5,0), standard(7,0/0,1) per Step 5
  - `pitcher-grade.ts` -- ERA percentile ranking to 15-tier grade (15=ace top 3%, 1=worst bottom 1%) per REQ-DATA-005a
  - `value-mapper.ts` -- Rate-to-card-value mapping using APBA correlation table (13=walk r=.978, 14=K r=.959, 1=HR r=.715, 7/8/9=singles, 0=double), slot allocation with scale factors, singles quality split by BABIP per Step 3
  - `pitcher-card.ts` -- Pitcher batting card generation (flooded with value 13), PitcherAttributes (role from GS%, grade, stamina, k9/bb9/hr9, usage flags) per Step 6
  - `generator.ts` -- Orchestrator: generateCard() and generateAllCards() entry points, computes fielding pct/range/arm/speed/discipline/contactRate, determines primary/eligible positions
- **Card Generator Tests**: 8 test files in `tests/unit/lib/card-generator/` (164 new tests) covering structural constants, rate calculation, power rating tiers, archetype decision tree, pitcher grade percentile mapping, value mapping with slot allocation, pitcher card generation, and full integration tests with mini-lahman fixtures

### Verification
- `npm run build` -- TypeScript compiles with strict mode
- `npm test` -- 321 tests pass across 24 test files (157 existing + 164 new)
- `npm run lint` -- ESLint passes with 0 errors

## 2026-02-08 - Phase 1, Task 5: Lahman CSV Loader

### Added
- **CSV Parsing Layer**: 8 source files in `src/lib/csv/` implementing PapaParse-based Lahman data loading per REQ-DATA-001, REQ-DATA-002, REQ-DATA-002a, REQ-DATA-006
  - `csv-types.ts` -- Raw CSV row types (RawPeopleRow, RawBattingRow, RawPitchingRow, RawFieldingRow), parsed domain records (PersonRecord, BattingSeasonRecord, PitchingSeasonRecord, FieldingSeasonRecord), player pool types (PlayerPoolEntry, LeagueAverages, CsvParseResult)
  - `parser.ts` -- PapaParse streaming wrapper (parseCsvStream with step callback per REQ-NFR-011, parseCsvFull for small files), safeParseInt/safeParseFloat utilities
  - `people-loader.ts` -- People.csv parser with handedness mapping (Lahman B->S for switch hitters, B/S->R for ambidextrous throwers)
  - `batting-loader.ts` -- Batting.csv parser with multi-stint aggregation (sums counting stats, computes BA/OBP/SLG/OPS from aggregated totals), year range filtering, 2B->doubles/3B->triples column mapping
  - `pitching-loader.ts` -- Pitching.csv parser with IPouts-to-IP conversion (baseball notation: 478->159.1), multi-stint aggregation (sums IPouts before converting), BFP->BF mapping, HLD/BS default to 0, ERA/WHIP derived from true decimal IP
  - `fielding-loader.ts` -- Fielding.csv parser with position mapping (OF->RF, P->SP), PH/PR row filtering, same-position stint aggregation
  - `player-pool.ts` -- Player pool assembly joining all 4 data sources, qualification filtering (batter>=200 AB, pitcher>=50 IP, two-way=EITHER per REQ-DATA-002a), league average computation (BA, HR/PA, BB/PA, SO/PA, ERA, K/9, BB/9, ISO, BABIP per REQ-DATA-006)
  - `index.ts` -- Barrel re-exports for clean `@lib/csv` imports
- **Mini-Lahman Test Fixtures**: 4 CSV files in `tests/fixtures/mini-lahman/` extracted from real 1971 Lahman data (53 players, 56 batting rows, 17 pitching rows, 75 fielding rows) including multi-stint players, switch hitters, LH throwers, and below-threshold players
- **CSV Loader Tests**: 6 test files in `tests/unit/lib/csv/` (101 new tests) covering parser utilities, all 4 loaders with mini-lahman fixtures, player pool assembly, qualification thresholds, and league average computation

### Verification
- `npm run build` -- TypeScript compiles with strict mode
- `npm test` -- 157 tests pass across 16 test files (56 type + 101 CSV)
- `npm run lint` -- ESLint passes with 0 errors

## 2026-02-08 - Phase 1, Task 4: Core TypeScript Interfaces

### Added
- **Layer 0 Type Definitions**: 9 type files in `src/lib/types/` with 50+ interfaces, types, and enums per SRD Sections 4, 5, 6, 7, 8, 9, 10, 14, 15.8
  - `errors.ts` -- ErrorCategory (9 categories), AppError, ValidationDetail, ApiErrorResponse, ErrorLogEntry
  - `stats.ts` -- BattingStats (21 fields), PitchingStats (22 fields) with counting + derived stats
  - `player.ts` -- CardValue, Position (12 positions), PlayerArchetype (bytes 33-34), PitcherAttributes (grade 1-15, role, usage flags), PlayerCard (35-element card array, power rating, batting/defensive modifiers)
  - `game.ts` -- OutcomeCategory enum (26 values, 15-40), BaseState, OutcomeTableEntry (IDT port), LineupSlot, GamePitcherStats, BattingLine, PitchingLine, TeamState, GameState (full mid-game snapshot), PlayByPlayEntry, BoxScore, GameResult
  - `league.ts` -- LeagueStatus, ManagerProfile (4 styles with 9 decision thresholds), LeagueSummary, TeamSummary, DivisionStandings
  - `draft.ts` -- DraftPickResult, DraftState (21 rounds, 60s timer)
  - `schedule.ts` -- ScheduleGameSummary, ScheduleDay
  - `roster.ts` -- RosterEntry (5 slot types), LineupUpdate
  - `api.ts` -- ApiResponse<T>, PaginatedResponse<T>, JoinLeagueResult, GameDetail, TransactionResult, ArchiveSummary, SimulationProgress
  - `index.ts` -- Barrel re-export for clean `@lib/types` imports
- **Type Tests**: 9 test files in `tests/unit/lib/types/` (56 tests total) verifying all interfaces compile and validate correctly
- **Fix**: Added explicit `resolve.alias` to `vitest.config.ts` for path alias resolution with value imports (enums)

### Verification
- `npm run build` -- TypeScript compiles with strict mode
- `npm test` -- 56 tests pass across 10 test files
- `npm run lint` -- ESLint passes with 0 errors

## 2026-02-08 - Phase 1, Task 1: Project Scaffolding

### Added
- **Project Foundation**: Vite 7.3 + React 19 + TypeScript scaffolding with full SRD-compliant configuration
  - `package.json` with 12 npm scripts (dev, build, lint, format, test, test:watch, test:coverage, test:bench, test:e2e, test:e2e:ui, test:ci, preview)
  - `tsconfig.json` with 7 path aliases (@lib, @components, @features, @hooks, @stores, @services, @workers) per REQ-ARCH-003
  - `tsconfig.node.json` for build tooling (Vite, Vitest, Tailwind, Playwright configs)
  - `vite.config.ts` with vite-tsconfig-paths and React plugins
  - `tailwind.config.ts` with full SRD theme (8 custom colors, 3 font families, custom spacing, shadows, border widths, postseason variant plugin) per REQ-COMP-001, REQ-COMP-002
  - `postcss.config.cjs` with TailwindCSS v3 + Autoprefixer
  - `vitest.config.ts` per REQ-TEST-016 (v8 coverage, forks pool, 10s timeout, globals, jsdom environment)
  - `playwright.config.ts` per REQ-TEST-017 (Chromium only, 30s timeout, failure screenshots, webServer auto-start)
  - `.eslintrc.cjs` with TypeScript, React hooks, React refresh, Prettier integration, layer architecture import restrictions
  - `.prettierrc` (2-space indent, single quotes, trailing commas, 100 char width)
  - `vercel.json` per REQ-NFR-021 (1024 MB functions, 300s maxDuration, SPA rewrites, security headers, cache headers)
  - `.env.example` per REQ-ENV-002 (Supabase client/server, Anthropic API key, app env)
- **Entry Files**: `index.html` (Google Fonts: Roboto Slab, JetBrains Mono), `src/main.tsx`, `src/App.tsx` (placeholder with theme classes), `src/vite-env.d.ts` (ImportMetaEnv interface per REQ-ENV-006), `src/styles/globals.css` (CSS custom properties + postseason theme overrides per REQ-COMP-001)
- **Directory Structure**: 50+ directories per Section 3.3 (api/, src/lib/, src/services/, src/stores/, src/hooks/, src/components/, src/features/, src/workers/, src/styles/, supabase/, tests/)
- **Test Infrastructure**: `tests/setup.ts` with @testing-library/jest-dom matchers, `tests/unit/scaffold.test.ts` placeholder
- **Dependencies**: react, react-dom, react-router-dom, zustand, @supabase/supabase-js, papaparse (production); typescript, vite, vitest, playwright, tailwindcss, eslint, prettier + 15 supporting dev packages

### Verification
- `npm run build` -- TypeScript compiles, Vite bundles successfully
- `npm test` -- Vitest runs, 1 test passes
- `npm run lint` -- ESLint passes with 0 errors

## 2026-02-08 - Software Requirements Document v4.0 (Player Pool Expansion & Qualification Thresholds)

### Changed
- `docs/SRD.md` v4.0 - Major data model change: every qualifying player-season is now a separate draftable entity:
  - **REQ-DATA-002 (Player Pool Construction)**: Rewritten from "best single season per player" to "every qualifying season is a separate draftable entity." Players like Babe Ruth may have 15+ qualifying seasons, each independently draftable. The drafter chooses which season version they want (e.g., "Ruth 1921" vs "Ruth 1927"). Adds strategic depth -- peak season vs career longevity tradeoffs.
  - **REQ-DATA-002a (Qualification Thresholds)**: New requirement defining pool inclusion criteria:
    - Batters: minimum 200 AB per season (filters out NL pitchers who batted with incidental plate appearances)
    - Pitchers: minimum 50 IP per season (includes starters and relievers, filters out position players who occasionally pitched)
    - Two-way players: qualify via EITHER threshold; if both met, card includes batting and pitching attributes (handles Ohtani-type seasons)
    - Pool size estimate: ~40,000-60,000 qualifying batter-seasons + ~15,000-20,000 qualifying pitcher-seasons across 1901-2025
  - **REQ-DFT-001a (One Player Per League)**: New requirement enforcing physical player uniqueness. When any season of a player is drafted, ALL other seasons of that player are removed from the available pool. Existing `UNIQUE(league_id, player_id)` constraint enforces this at the database level. Dropping a player restores all qualifying seasons to the pool.
  - **Database Schema**: Added `season_year INT NOT NULL` column to both `rosters` and `season_stats` tables. Records which specific season was selected. UNIQUE constraints remain on `player_id` alone (not composite with season_year), preserving one-physical-player-per-league enforcement.
  - **REQ-DFT-005 (Draft Display)**: Added pool filtering rules -- exclude all seasons of any player already on a roster. Player list may show multiple rows for the same physical player (different seasons, different stats). Added search/filter support for name, position, year range, stat thresholds.
  - **REQ-DFT-007 (AI Valuation)**: AI selects the season with the highest valuation score when multiple seasons of the same player are available.
  - **REQ-RST-005 (Free Agent Add/Drop)**: Updated drop semantics (all qualifying seasons return to pool) and add semantics (selecting a player-season removes all other seasons per REQ-DFT-001a).
  - **REQ-DATA-005a (Pitcher Grade)**: Changed "minimum qualifying IP" to explicit "minimum 50 IP per season per REQ-DATA-002a."
  - **REQ-NFR-011 (CSV Streaming)**: Updated pool size reference to reflect qualification threshold filtering (~40,000-60,000 qualifying batter-seasons from ~110,000 total rows).
  - **ERR_DRAFT_PLAYER_TAKEN**: Updated description to reference REQ-DFT-001a one-physical-player-per-league rule.
  - **Section 3.3 (Directory Tree)**: Added `00012_add_season_year.sql` migration file.
  - **Section 20.2 (Migration Table)**: Added migration `00012_add_season_year.sql`, updated continuation note to `00013`.
  - Updated version to 4.0

## 2026-02-08 - Software Requirements Document v3.9 (Code Ownership & Scoping)

### Added
- `docs/SRD.md` v3.9 - Added comprehensive code ownership and scoping framework (Section 22 with 5 subsections):
  - **Section 22.1 (Universal Scoping Rule)**: Master decision table covering 9 artifact types (components, hooks, types, constants, utilities, test helpers, services, stores, pure logic) with feature-scoped location, shared location, and promotion trigger for each. Generalizes the component colocation rule from Section 3.7 to all code types. Feature-scoped artifacts use relative imports; promoted artifacts use `@`-prefixed path aliases (REQ-SCOPE-001)
  - **Section 22.2 (Feature-Scoped File Conventions)**: Allowed file types within `src/features/<module>/` with naming conventions and import rules (sub-components, hooks subdirectory, single `types.ts`, single `constants.ts`, single `utils.ts`, optional barrel `index.ts`). Four constraints: no cross-feature imports, no direct store access, max 2 files per non-component type, no nested feature directories. Baseball Ledger domain examples (REQ-SCOPE-002, REQ-SCOPE-003)
  - **Section 22.3 (Promotion Checklist)**: 6-step ordered checklist for graduating feature-scoped artifacts to shared locations (move, remove dependencies, update imports, move tests, verify isolation, update directory tree). Concrete before/after example showing DraftTicker promotion from feature-scoped to shared component with hook-to-props conversion (REQ-SCOPE-004)
  - **Section 22.4 (Fixed-Home Artifacts)**: 7 artifact types that are architecturally mandated to always be shared (Zustand stores, services, pure logic, Layer 0 types, Web Workers, global styles, server utilities) with rationale for each. Rule of thumb: if consumed by Layers 0-4, cannot live in feature directory (REQ-SCOPE-005)
  - **Section 22.5 (Gray Area Resolution)**: Decision rules for 6 ambiguous placement scenarios (cross-layer types, domain-heavy hooks, pure-but-single-consumer utilities, test-only secondary consumers, variant components, feature hooks wrapping shared hooks). Test exemption rule: tests importing feature-scoped artifacts do not trigger promotion (REQ-SCOPE-006, REQ-SCOPE-007)
  - Added 7 new requirements: REQ-SCOPE-001 through REQ-SCOPE-007
  - Updated Table of Contents with Section 22 entry and 5 subsection links
  - Updated version to 3.9

### Changed
- **Section 3.3 (Directory Tree)**: Added `tests/helpers/` directory with `render-with-providers.tsx` for shared test utilities (REQ-SCOPE-001)
- **Section 3.7 (Colocation Rule)**: Added forward-reference to Section 22 for non-component artifact scoping
- **Section 19.4 (Feature Composition)**: Added forward-reference to Section 22 for non-component artifact scoping

## 2026-02-08 - Software Requirements Document v3.8 (Environment Configuration)

### Added
- `docs/SRD.md` v3.8 - Added comprehensive environment configuration (Section 21 with 6 subsections):
  - **Section 21.1 (Environment Variable Inventory)**: Complete 6-variable canonical inventory with categories (Supabase client, Supabase server, External Services, Build/Runtime). `VITE_` prefix rule for client-exposed variables (Vite build system security boundary). Variable naming rules. Cross-reference to Section 20.7 per-environment values (REQ-ENV-001)
  - **Section 21.2 (`.env.example` Template)**: Full `.env.example` file content with grouped sections, placeholder values, and inline comments. Committed to repository as documentation template. Developers copy to `.env.local` for local development (REQ-ENV-002)
  - **Section 21.3 (Configuration Module)**: Client config at `src/lib/config.ts` with `ClientConfig` typed interface and `getRequiredEnv()` fail-fast validation per CLAUDE.md Rule 3. Server config at `api/_lib/config.ts` with `ServerConfig` typed interface using `process.env`. Usage example showing `supabase-admin.ts` consuming `serverConfig`. `ANTHROPIC_API_KEY` optional with graceful degradation per REQ-AI-008 (REQ-ENV-003, REQ-ENV-004, REQ-ENV-005)
  - **Section 21.4 (Vite Environment Type Declarations)**: Full `src/vite-env.d.ts` content with `ImportMetaEnv` interface declaring all `VITE_*` variables for TypeScript autocomplete. Server-only variables explicitly excluded from declarations (REQ-ENV-006)
  - **Section 21.5 (Vercel Project Configuration)**: Complete `vercel.json` content with framework (vite), build command, output directory (dist), functions config (1024MB memory, 300s maxDuration per REQ-NFR-021), SPA rewrites for React Router, security headers (X-Content-Type-Options, X-Frame-Options), immutable cache headers for hashed assets. CORS not needed (same-origin per REQ-API-007) (REQ-ENV-007)
  - **Section 21.6 (Secrets Management)**: `.gitignore` entries for all env files (except `.env.example`). Three-location secret storage policy table (local file, Vercel dashboard, GitHub Actions secrets). Five secret handling rules including service role key server-only restriction and anon key client-safe rationale. API key rotation policy for all 3 credential types with zero-downtime degradation (REQ-ENV-008, REQ-ENV-009, REQ-ENV-010)
  - Added 10 new requirements: REQ-ENV-001 through REQ-ENV-010
  - Updated Table of Contents with Section 21 entry and 6 subsection links
  - Updated version to 3.8

### Fixed
- **Section 20.7**: Corrected `NEXT_PUBLIC_SUPABASE_URL` to `VITE_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `VITE_SUPABASE_ANON_KEY` -- this is a Vite project (vite.config.ts), not Next.js. Vite uses `VITE_*` prefix for client-exposed environment variables.

### Changed
- **Section 3.3 (Directory Tree)**: Added `api/_lib/config.ts` (server environment config, REQ-ENV-005) and `src/lib/config.ts` (client environment config, REQ-ENV-003)

## 2026-02-08 - Software Requirements Document v3.7 (Database Migration Workflow)

### Added
- `docs/SRD.md` v3.7 - Added comprehensive database migration workflow (Section 20 with 8 subsections):
  - **Section 20.1 (Supabase CLI & Local Development)**: Local Supabase stack via Docker (PostgreSQL, Auth, Storage, Realtime). Required `config.toml` settings for local development. Commands for init, start, reset, stop (REQ-MIG-001)
  - **Section 20.2 (Migration File Standards)**: 5-digit sequential prefix + snake_case naming per REQ-ARCH-004. One concern per migration file. Existing 11 migrations table. Required header comment format (purpose, author, date, dependencies). SQL style rules table (uppercase keywords, lowercase identifiers, explicit schemas, idempotent patterns with IF NOT EXISTS/CREATE OR REPLACE, no DROP in forward migrations) (REQ-MIG-002, REQ-MIG-003, REQ-MIG-004)
  - **Section 20.3 (Schema Change Workflow)**: 6-step workflow (create, write, test, diff, review, squash). `supabase db reset` for local validation, `supabase db diff` for drift detection. 10-item review checklist before committing. Migration squashing strategy at 30-file threshold (REQ-MIG-005)
  - **Section 20.4 (Rollback & Recovery Strategy)**: Forward-only rollback pattern (no automatic down migrations). Rollback migration naming convention. Destructive change rules table for DROP TABLE, DROP COLUMN, ALTER TYPE, DROP INDEX, DROP POLICY. Supabase PITR for production recovery (REQ-MIG-006)
  - **Section 20.5 (Seed Data)**: `supabase/seed.sql` with 6 data categories (test users, sample league, teams, rosters, schedule, stats). Idempotent INSERT with ON CONFLICT. Recognizable seed UUID prefix pattern. Separation from test fixtures in tests/fixtures/ (REQ-MIG-007, REQ-MIG-008)
  - **Section 20.6 (RLS Policy Testing)**: pgTAP tests in `supabase/tests/` with one test file per table. Full example test for leagues table (6 assertions: commissioner CRUD, member read, non-member denial). Required test coverage table for 6 RLS-enabled tables. `supabase test db` command (REQ-MIG-009)
  - **Section 20.7 (Multi-Environment Strategy)**: Three isolated environments (local Docker, staging cloud, production cloud). Environment variable table for Supabase URL, anon key, service role key, DB URL. Migration deployment order (local -> staging -> production). Data isolation policy (REQ-MIG-010, REQ-MIG-011)
  - **Section 20.8 (CI/CD Database Pipeline)**: Extended CI pipeline with 7 database stages (start, reset, lint, pgTAP tests, type generation, type staleness check, dry-run push, stop). Auto-generated `src/lib/types/database.ts` via `supabase gen types typescript`. Stale type detection workflow in CI (REQ-MIG-012, REQ-MIG-013)
  - Added 13 new requirements: REQ-MIG-001 through REQ-MIG-013
  - Updated Section 3.3 directory tree: added `supabase/seed.sql` and `supabase/tests/` with 6 pgTAP test files
  - Updated Table of Contents with Section 20 entry and 8 subsection links
  - Updated version to 3.7

## 2026-02-08 - Software Requirements Document v3.6 (Component Architecture)

### Added
- `docs/SRD.md` v3.6 - Added comprehensive component architecture (Section 19 with 7 subsections):
  - **Section 19.1 (Theme System & Design Tokens)**: Full `tailwind.config.ts` theme extension with 8 custom colors, 3 font families, spacing scale, max-width, border-radius, box-shadow, and border-width tokens. CSS custom properties in `globals.css` mirroring Tailwind config for animations and third-party contexts. Postseason theme variant via `data-theme="postseason"` attribute with CSS variable overrides and custom `postseason:` Tailwind variant prefix (REQ-COMP-001, REQ-COMP-002)
  - **Section 19.2 (Shared Component Prop Contracts)**: Prop interface conventions (`on<Event>` callbacks, `readonly` data props, explicit children typing, no `any`). TypeScript prop interfaces for 12 architecturally significant components across 4 categories: layout (AppShell, Header), data display (StatTable with generic `StatColumn<T>`, StandingsTable, Pagination), feedback (ErrorBanner, LoadingLedger, TypewriterText), baseball (DiamondField with `FieldPosition`, PlayerCardDisplay, LineScore, BaseIndicator). Implementation requirements per component (REQ-COMP-003, REQ-COMP-004)
  - **Section 19.3 (Page Layout & Routing)**: React Router v6 `createBrowserRouter` in `src/router.tsx` with 13-route table (2 public, 10 authenticated + lazy-loaded, 1 fallback). `AuthGuard` component in `src/features/auth/` with three-state logic (initializing/unauthenticated/authenticated). Per-route ErrorBoundary > Suspense > LazyPage wrapping pattern. Full router code example (REQ-COMP-005, REQ-COMP-006, REQ-COMP-007)
  - **Section 19.4 (Feature Page Composition Pattern)**: Standard 4-phase page skeleton (hook consumption, loading guard, error overlay, composition) with DashboardPage code example. Data flow chain enforcing Layer 5 hooks between features and stores. Shared vs feature-scoped component decision criteria table (REQ-COMP-008, REQ-COMP-009)
  - **Section 19.5 (Responsive Layout)**: Desktop-first with single 768px breakpoint (`max-md:` prefix). 10-row component behavior table (AppShell, Header, StatTable, StandingsTable, DiamondField, Dashboard, DraftBoard, PlayerCardDisplay, buttons, Footer). SVG scaling strategy for DiamondField using `viewBox` and `preserveAspectRatio` (REQ-COMP-010)
  - **Section 19.6 (Animation & Transition Patterns)**: CSS-only animations in 3 categories: state transition micro-animations (6-row property/duration/easing table), signature keyframe animations (LoadingLedger pulsing ellipsis, TypewriterText character reveal, SEASON COMPLETED stamp slam), `prefers-reduced-motion` compliance with instant fallbacks (REQ-COMP-011)
  - **Section 19.7 (Accessibility)**: WCAG 2.1 Level AA target. Keyboard navigation rules for custom controls. 12-row ARIA roles/attributes table for all interactive shared components. Focus trap for modals via `useFocusTrap` hook. Skip-to-content link, per-page `document.title`, 6-row color contrast verification table (all pairs pass AA+), form label and validation error association requirements (REQ-COMP-012, REQ-COMP-013)
  - Added 13 new requirements: REQ-COMP-001 through REQ-COMP-013
  - Updated Table of Contents with Section 19 entry and 7 subsection links
  - Updated version to 3.6

## 2026-02-08 - Software Requirements Document v3.5 (API Response Contracts)

### Added
- `docs/SRD.md` v3.5 - Added comprehensive API response contracts (Section 14.2-14.5 with 4 subsections):
  - **Section 14.2 (Success Response Envelopes)**: `ApiResponse<T>` generic envelope with `data`, `meta.requestId`, `meta.timestamp`. `PaginatedResponse<T>` extending `ApiResponse` with `pagination` block (page, pageSize, totalRows, totalPages). Query parameter spec for paginated endpoints (page, sortBy, sortOrder). Client-side discrimination pattern (`data` key vs `error` key) (REQ-API-004, REQ-API-005)
  - **Section 14.3 (HTTP Status Code Semantics)**: Success status code table -- 200 OK (retrieval/update), 201 Created (new resource + Location header), 202 Accepted (bulk simulation with simulationId), 204 No Content (deletion/archive). Complements error status codes from REQ-ERR-001 (REQ-API-006)
  - **Section 14.4 (Response Helpers and Conventions)**: `api/_lib/response.ts` helper function signatures (`ok`, `created`, `accepted`, `noContent`, `paginated`) using Vercel types. camelCase JSON / snake_case database field naming convention with mapping rules. Content-Type and CORS specifications (REQ-API-007, REQ-API-008)
  - **Section 14.5 (Endpoint Response Type Mapping)**: 21-row authoritative table mapping every endpoint to method, status code, helper function, response type, and pagination flag. 6 new TypeScript interfaces (`JoinLeagueResult`, `DraftPickResult`, `DraftState`, `GameDetail`, `TransactionResult`, `ArchiveSummary`). Simulation endpoint dual-behavior: single-day synchronous (200) vs multi-day async with Realtime (202) (REQ-API-009, REQ-API-010, REQ-API-011)
  - Added 8 new requirements: REQ-API-004 through REQ-API-011
  - Updated Table of Contents with Section 14 subsection links (14.1-14.5)
  - Updated version to 3.5

## 2026-02-08 - Software Requirements Document v3.4 (State Management Architecture)

### Added
- `docs/SRD.md` v3.4 - Added comprehensive state management architecture (Section 18 with 8 subsections):
  - **Section 18.1 (Store Slice Design)**: Full TypeScript interfaces for all 5 Zustand stores (authStore, leagueStore, rosterStore, simulationStore, statsStore) with state fields, action signatures, and supporting types. Store summary table mapping persistence, realtime, and hook consumers (REQ-STATE-001, REQ-STATE-002)
  - **Section 18.2 (Action Patterns)**: Naming conventions (fetch/set/invalidate/clear/update/verb patterns). Async action flow: loading -> service call -> success/failure -> cleanup. immer middleware table per store (REQ-STATE-003, REQ-STATE-004, REQ-STATE-005)
  - **Section 18.3 (Selector Patterns)**: Atomic selector rule (never subscribe to entire store). Derived state in Layer 5 hooks via useMemo. Derived value table with source stores and hook locations (REQ-STATE-006, REQ-STATE-007)
  - **Section 18.4 (Persistence Strategy)**: Per-store persist config table (localStorage keys, partialize fields). Schema versioning with migrate function. Safe storage factory with memory fallback per REQ-ERR-018 (REQ-STATE-008, REQ-STATE-009, REQ-STATE-010)
  - **Section 18.5 (Cache Invalidation)**: 7-event invalidation trigger table (sim complete, roster change, draft complete, status change, archive, switch league, logout). Stale-while-revalidate pattern (REQ-STATE-011, REQ-STATE-012)
  - **Section 18.6 (Realtime Subscriptions)**: Supabase Realtime in Layer 5 hooks, not stores. useRealtimeProgress hook architecture. Polling fallback on disconnect. Sim completion triggers cross-store invalidation (REQ-STATE-013, REQ-STATE-014)
  - **Section 18.7 (Store Initialization & Auth Lifecycle)**: Full initialization sequence from app mount through auth state detection. Persist rehydration, session handling, background refetch, logout cascade (REQ-STATE-015)
  - **Section 18.8 (Development Tooling)**: Zustand devtools middleware in dev builds only. Middleware stacking order. Redux DevTools integration (REQ-STATE-016)
  - Added 16 new requirements: REQ-STATE-001 through REQ-STATE-016
  - Added `storage-factory.ts` to `src/stores/` in Section 3.3 directory tree
  - Updated Table of Contents with Section 18 entry and 8 subsection links
  - Updated version to 3.4

## 2026-02-08 - Software Requirements Document v3.3 (Testing Strategy)

### Added
- `docs/SRD.md` v3.3 - Added comprehensive testing strategy (Section 17 with 7 subsections):
  - **Section 17.1 (Test Pyramid & TDD Workflow)**: Three-layer pyramid (70% unit / 20% integration / 10% E2E). RED-GREEN-REFACTOR TDD cycle per CLAUDE.md Rule 11. Unit tests via Vitest, E2E via Playwright (REQ-TEST-001, REQ-TEST-002)
  - **Section 17.2 (Coverage Targets)**: Per-directory coverage thresholds -- 95% line/90% branch for simulation and card-generator, 100%/100% for RNG, 85%/80% overall project floor. CI fails on threshold violation (REQ-TEST-003, REQ-TEST-004)
  - **Section 17.3 (Mock Boundaries & Test Isolation)**: Mock rules per test layer -- pure logic (Layer 1) requires zero mocks, Supabase mocked in unit/real in integration, Claude API always mocked, SeededRNG always real with fixed seed. Layer 1 testability enforced by architecture (REQ-TEST-005, REQ-TEST-006, REQ-TEST-007)
  - **Section 17.4 (Test Fixtures & Data Strategy)**: 5 fixture files (sample-players, sample-cards, sample-game-state, sample-outcomes, mini-lahman/) with `_meta` documentation fields. Static JSON committed to repo, regenerated on interface changes (REQ-TEST-008, REQ-TEST-009)
  - **Section 17.5 (Requirement Traceability)**: REQ-* identifiers in Vitest `describe` block names for grep-based discovery. `tests/TRACEABILITY.md` mapping table linking every REQ-* to its validating test(s) (REQ-TEST-010, REQ-TEST-011)
  - **Section 17.6 (Performance & Benchmark Tests)**: Vitest bench for 5 NFR targets (single game <500ms, full season <60s, CSV parse <10s, determinism, OutcomeTable O(log n)). Benchmarks non-blocking in CI except determinism which is blocking (REQ-TEST-012, REQ-TEST-013, REQ-TEST-014)
  - **Section 17.7 (CI/CD Test Configuration)**: GitHub Actions pipeline (install -> lint+typecheck || tests -> benchmarks -> E2E -> coverage). Vitest config (v8 coverage, forks pool, 10s timeout, path aliases). Playwright config (Chromium-only, 30s timeout, failure screenshots). 7 npm test scripts (REQ-TEST-015, REQ-TEST-016, REQ-TEST-017, REQ-TEST-018)
  - Added 18 new requirements: REQ-TEST-001 through REQ-TEST-018
  - Updated Table of Contents with Section 17 entry
  - Updated version to 3.3

## 2026-02-08 - Software Requirements Document v3.2 (Error Handling & Recovery)

### Added
- `docs/SRD.md` v3.2 - Added comprehensive error handling strategy (Section 15.8 with 9 subsections):
  - **Section 15.8.1 (Error Classification)**: 9 typed error categories (`VALIDATION`, `AUTHENTICATION`, `AUTHORIZATION`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMIT`, `SIMULATION`, `DATA`, `EXTERNAL`) with `AppError` interface, `ErrorCategory` union type, `ValidationDetail` for field-level errors, and `ErrorCode` string union with 20+ machine-readable codes (REQ-ERR-001, REQ-ERR-002)
  - **Section 15.8.2 (API Error Response Contract)**: Standard `ApiErrorResponse` JSON envelope for all error responses with `code`, `message`, `details[]`, and `requestId`. `X-Request-Id` UUID v4 header on every request/response for log correlation (REQ-ERR-003, REQ-ERR-004)
  - **Section 15.8.3 (Validation Strategy)**: Zod schema validation co-located with TypeScript interfaces in `src/lib/types/`. Three validation boundaries: API boundary (request body), service layer (business rules), pure logic (invariant assertions). Zod-to-AppError transformation (REQ-ERR-005, REQ-ERR-006, REQ-ERR-007)
  - **Section 15.8.4 (Layer-Specific Error Handling Rules)**: Error throw/catch/pass-through rules for all 8 architectural layers plus Workers. Two terminal error boundaries: API Functions (server) and Features/Error Boundaries (client) (REQ-ERR-008, REQ-ERR-009)
  - **Section 15.8.5 (React Error Boundaries)**: Per-feature-route error boundaries with fallback UI (error message, "Return to Dashboard", "Try Again"). Inline `ErrorBanner.tsx` with ERROR/WARN/INFO severity levels for action errors (REQ-ERR-010, REQ-ERR-011, REQ-ERR-012)
  - **Section 15.8.6 (Logging & Observability)**: Structured JSON `ErrorLogEntry` format with `requestId`, `leagueId`, `userId`, `operation`, `errorCode`, `duration_ms`. Three log levels: ERROR (unrecoverable), WARN (degraded), INFO (state transitions) (REQ-ERR-013, REQ-ERR-014)
  - **Section 15.8.7 (Retry & Recovery Policies)**: Per-operation retry table -- Claude API (3 retries, exponential backoff), Supabase reads (2 retries, linear), writes (1 retry), simulation/CSV/draft (0 retries). All retries logged at WARN, final failures at ERROR (REQ-ERR-015, REQ-ERR-016)
  - **Section 15.8.8 (Graceful Degradation)**: Visible fallbacks per CLAUDE.md Rule 3 -- Claude AI to template commentary, Realtime to polling, localStorage to memory-only. Every fallback activation logged and user-notified (REQ-ERR-017, REQ-ERR-018)
  - **Section 15.8.9 (Database Error Mapping)**: PostgreSQL error code to AppError mapping (23505 UNIQUE -> CONFLICT, 23503 FK -> NOT_FOUND, 23514 CHECK -> VALIDATION, 42501 RLS -> AUTHORIZATION, 40001 serialization -> retry then CONFLICT, 57014 timeout -> EXTERNAL). Constraint-to-message lookup table. Raw DB errors never reach client (REQ-ERR-019, REQ-ERR-020)
  - Added 20 new requirements: REQ-ERR-001 through REQ-ERR-020
  - Updated Table of Contents with Section 15.8 entry
  - Updated version to 3.2

## 2026-02-08 - Software Requirements Document v3.1 (Project Structure & Module Architecture)

### Added
- `docs/SRD.md` v3.1 - Added project directory structure and module architecture (Sections 3.3-3.7):
  - **Section 3.3 (Project Directory Structure)**: Full directory tree (~120 files) covering `api/` (Vercel serverless functions with file-based routing), `src/` (React frontend with components, features, hooks, stores, services, workers), `src/lib/` (shared pure logic: simulation engine, card generator, CSV parsing, draft, schedule, stats, managers, RNG, types), `supabase/` (11 sequential SQL migration files), `tests/` (unit/integration/E2E mirroring source structure), and root configs
  - **Section 3.4 (Module Architecture & Dependency Rules)**: 8-layer dependency hierarchy (Types -> Pure Logic -> API -> Services -> Stores -> Hooks -> Components -> Features + Workers). Strict import rules prevent circular dependencies and God files. Layer 1 (Pure Logic) runs identically in browser, Node.js, and Web Worker
  - **Section 3.5 (Import Path Aliases)**: 7 `@`-prefixed path aliases (`@lib/*`, `@components/*`, `@features/*`, `@hooks/*`, `@stores/*`, `@services/*`, `@workers/*`) configured in tsconfig.json and vite.config.ts
  - **Section 3.6 (File Naming Conventions)**: PascalCase for React components, kebab-case for non-component TypeScript, `.test` suffix for unit tests, `.spec` suffix for E2E, 5-digit prefix for SQL migrations
  - **Section 3.7 (Module Size & Quality Guidelines)**: ~300 line soft limit per file, one responsibility per file, no barrel re-exports in `src/lib/`, no circular imports, colocation of feature sub-components
  - Added 5 new requirements: REQ-ARCH-001 through REQ-ARCH-005
  - Updated Table of Contents with new subsections
  - Updated version to 3.1

## 2026-02-08 - Software Requirements Document v3.0 (Supabase/Vercel + Performance)

### Changed
- `docs/SRD.md` v3.0 - Migrated from GCP/Firebase to Supabase + Vercel and added comprehensive performance requirements:
  - **Tech Stack Migration**: Replaced Firebase/GCP with Supabase (PostgreSQL, Auth, Storage, Realtime) + Vercel (hosting, serverless functions). Updated Sections 2.1, 2.2, 3.1, 3.2, 4.3, 13, 14, 15, 16
  - **Section 4.3 (Database Schema)**: Replaced Firestore document collections with relational PostgreSQL schema (CREATE TABLE with foreign keys, constraints, JSONB columns for card data, Row Level Security policies, composite indexes)
  - **Section 14 (API)**: Updated from Cloud Functions to Vercel Serverless Functions, Firestore real-time to Supabase Realtime subscriptions
  - **Section 15 (Non-Functional Requirements)**: Expanded from 7 to 21 requirements across 7 subsections:
    - 15.3 Simulation Engine: Web Worker for client-side sim (NFR-008), OutcomeTable cumulative distribution pre-computation (NFR-009), memory-bounded bulk simulation (NFR-010)
    - 15.4 Data Loading: PapaParse streaming mode (NFR-011), pre-computed player pool persistence (NFR-012), Zustand persist caching (NFR-013)
    - 15.5 Database: PostgreSQL transactions (NFR-014), database indexes (NFR-015), denormalized standings (NFR-016)
    - 15.6 UI Rendering: Route-based code splitting < 200KB (NFR-017), font loading with swap/subset (NFR-018), cursor-based stat pagination (NFR-019)
    - 15.7 Infrastructure: Simulation progress streaming via Supabase Realtime (NFR-020), Vercel function resource config with chunked simulation fallback (NFR-021)
  - **Section 16 Phase 9**: Renamed to "Performance & Polish", added 12 performance checklist items referencing new NFRs
  - Updated version to 3.0

## 2026-02-08 - Software Requirements Document v2.0 (Faithful APBA Port)

### Changed
- `docs/SRD.md` v2.0 - Rewrote Sections 4, 5, and 11 for faithful APBA BBW 3.0 port:
  - **Section 4 (Data Layer)**: Replaced simple probability distributions with APBA-style 35-element card arrays generated from Lahman stats via verified correlation mapping (value 13=walk r=+0.978, value 14=strikeout r=+0.959, etc.). Added CardGenerator algorithm with 6-step process, 7-tier power rating at position 24, archetype flags from bytes 33-34 pair analysis, pitcher grade 1-15 scale from ERA percentile
  - **Section 5 (Simulation Engine)**: Replaced weighted-random resolution with multi-step card+IDT lookup system. Ported full 36-row OutcomeTable from APBA's IDT.OBJ (144 bytes). Added pitcher grade gating (grade vs random check shifts outcomes), archetype modifiers (power/speed/contact bonuses), platoon card modification, bunt resolution, stolen base engine, pitcher fatigue grade degradation
  - **Section 11 (AI Integration)**: Added 4 manager personality profiles ported from APBA (Cap Spalding/conservative, Duke Robinson/aggressive, Johnny McCoy/balanced, Larry Pepper/analytical) with configurable decision thresholds for steals, bunts, hit-and-run, pinch-hitting, IBB, pitcher pull, baserunning aggressiveness
  - **Section 2.2**: Updated module mapping table with IDT port, archetype flags, pitcher grade, manager profiles
  - **Section 16**: Expanded from 8 to 9 build phases, added dedicated Phase 2 (Card Generator) and Phase 3 (Simulation Engine) with detailed APBA port checklist items
  - Updated version to 2.0, executive summary, Firestore schema (card array in roster, managerProfile on team)

## 2026-02-08 - Software Requirements Document v1.0

### Added
- `docs/SRD.md` - Initial Software Requirements Document synthesized from:
  - APBA reverse engineering findings (simulation engine, card system, manager AI)
  - Baseball Ledger project spec (league workflow, roster rules, scheduling)
  - UI/UX design spec (Digital Almanac theme, component architecture)
  - 100+ numbered requirements (REQ-*) across 16 sections
  - Full TypeScript interface definitions (PlayerCard, PitcherAttributes, GameState, BattingStats, PitchingStats)
  - Game simulation engine specification (plate appearance resolution, pitching management, baserunner logic)
  - AI integration spec (Claude API for manager decisions, commentary, draft, trades)
  - 8-phase build plan with checklist items
  - Firestore schema design
  - REST API endpoint specification

## 2026-02-07 - APBA Baseball for Windows 3.0 Reverse Engineering

### Added
- `docs/APBA_REVERSE_ENGINEERING.md` - Comprehensive reverse engineering analysis of APBA BBW 3.0
  - Complete binary file format specifications (PLAYERS.DAT, NSTAT.DAT, PSTAT.DAT, ORG.DAT)
  - Player card system analysis: 35-byte card encoding with outcome probability distributions
  - Statistical correlation analysis of card values vs real 1971 batting stats (460 qualified batters)
  - Game simulation engine architecture (plate appearance state machine, IDT.OBJ decision table)
  - Manager AI system documentation (4 personality profiles with decision dictionaries)
  - Commentary system architecture (3-tier template system with 100+ game events)
  - Stadium and audio system configuration
  - League organization data formats
  - Concrete porting strategy mapping APBA systems to React/TypeScript equivalents
  - TypeScript interface definitions for PlayerCard and PitcherCard

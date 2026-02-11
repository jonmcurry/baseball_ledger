# Baseball Ledger -- Project Status

**Last updated:** 2026-02-11
**Test suite:** 2,668 tests across 233 files (all passing)
**TypeScript:** Clean (no errors)
**API endpoints:** 10 of 12 Vercel Hobby limit (2 slots remaining)
**SQL migrations:** 18

---

## Architecture Summary

Seven-layer architecture with strict downward-only imports:

| Layer | Role | Count |
|-------|------|-------|
| L0 -- Types | TypeScript interfaces, enums, type unions | 12 files |
| L1 -- Pure Logic | Deterministic modules (zero side effects) | 60+ files |
| L2 -- API Helpers | Server-side utilities (auth, validation, DB) | 18 files |
| L3 -- Services | HTTP client wrappers for API calls | 9 files |
| L4 -- Stores | Zustand state management | 6 stores |
| L5 -- Hooks | React hooks composing stores | 16 hooks |
| L6 -- Components | Shared UI components | 20+ files |
| L7 -- Features | Page-level feature modules | 15 feature dirs, 40+ files |

---

## Completed Phases (1--52)

### Phase 1 -- Project Scaffolding & Foundation
- Vite 7.3 + React 19 + TypeScript project structure
- Tailwind CSS with Digital Almanac theme (REQ-COMP-001, REQ-UI-001/002/003)
- 7 path aliases, ESLint, Prettier, Vitest, Playwright configs
- 12 type definition files (50+ interfaces)
- Lahman CSV loading pipeline (People, Batting, Pitching, Fielding)
- PapaParse streaming, qualification thresholds (200 AB / 50 IP)
- Mini-Lahman test fixtures (53 players from 1971 data)

### Phase 2 -- APBA Card Generator
- 35-byte card generation from Lahman stats
- 9 structural constants, rate calculator, value mapper
- Power rating (7-tier ISO scale), archetype flags (bytes 33-34)
- Pitcher grade (ERA percentile to 1-15 scale)
- Pitcher card generation (flooded walk values, role assignment)

### Phase 3 -- Simulation Engine (15 tasks)
- **RNG**: Seeded deterministic random number generator
- **Outcome Table**: IDT.OBJ port (36x4 cumulative distribution)
- **Outcome Resolver**: 26 OutcomeCategory values to game state changes
- **Plate Appearance**: Multi-step card lookup pipeline
- **Card Value Fallback**: Direct value-to-outcome mapping
- **Archetype Modifiers**: Power/speed/contact bonuses
- **Platoon**: L/R matchup adjustments
- **Bunt Resolver**: Sacrifice, bunt-for-hit, pop out
- **Baserunner Engine**: Speed checks, runner advancement, tag-ups
- **Defense Engine**: Error resolution, double play checks
- **Stolen Base**: Eligibility, probability, attempt resolution
- **Pitching Management**: Fatigue, removal triggers, reliever/closer selection, rotation
- **Game State Machine**: Inning flow, walk-offs, extra innings
- **Game Result**: Box score, line score, pitcher decisions (W/L/SV)
- **Manager AI**: 4 profiles (conservative/aggressive/balanced/analytical), steal/bunt/IBB/pull/hit-and-run/pinch-hit/aggressive baserunning decisions

### Phase 4 -- League & Draft Pure Logic
- Error handling foundation (AppError, ErrorCode, factories)
- Team name generation (57 cities x 60 mascots)
- Division assignment (AL/NL, 4 divisions each)
- Invite key generation (12-char cryptographic)
- Snake draft order (21 rounds, reversal each round)
- AI valuation scoring (OPS/ERA-weighted formulas)
- AI draft strategy (need-based, round-aware tiers)
- Roster validation (21-player composition enforcement)
- Lineup generation algorithm (OBP/contact/OPS/SLG ordering)
- Zod validation schemas (league, draft, roster)

### Phase 5 -- Schedule & Statistics
- Derived stats (BA, OBP, SLG, OPS, ERA, WHIP, K/9, BB/9, FIP)
- Stats accumulator (game results to season totals)
- Standings calculator (W%, GB, Pythagorean, tiebreakers)
- League leaders (batting/pitching, qualification rules)
- Schedule generator (162-game round-robin, division-weighted)
- Playoff bracket (2025 MLB format: WC/DS/CS/WS)

### Phase 6 -- Frontend Foundation
- 20+ shared components (feedback, data display, baseball, layout, forms)
- Router with 13+ lazy-loaded routes, AuthGuard, 404
- 6 Zustand stores (auth, league, roster, stats, simulation, draft)
- 14 hooks composing stores with derived state
- 15 feature page shells (all replaced with real implementations in Phase 10)

### Phase 7 -- Integration Layer
- 17 SQL migrations (leagues, teams, rosters, schedule, stats, game_logs, archives, simulation_progress, player_pool)
- RLS policies on all tables
- Supabase client/server wrappers
- API infrastructure (response helpers, error mapping, auth, validation, transform)
- 20+ API endpoint handlers
- 9 client service modules
- Store async actions wired to services
- Auth flow (login, signup, session management)

### Phase 8 -- AI Enhancement
- Claude API client (10s timeout, 3 retries, exponential backoff)
- 5 prompt builder modules
- 5 template fallback engines (250+ commentary templates)
- 5 AI API endpoints (consolidated into single `api/ai/index.ts`)
- Client AI service with all 5 feature functions

### Phase 9 -- Performance & Polish
- Game orchestrator (`runGame()`) -- full game loop tying 15+ modules
- Season runner (`runDay()`, `runSeason()`) -- batch processing
- Web Worker for client-side simulation (60fps UI)
- Server-side simulation with PostgreSQL RPC atomic commits
- Traditional/Advanced stats toggle
- Performance benchmarks (single game < 500ms, 10-game day < 5s)
- Determinism tests (same seed = identical results)
- E2E tests (Playwright, multi-browser)
- Traceability matrix

### Phase 10 -- Feature UI Implementation
- All 8 stub pages replaced with full implementations
- Draft board (ticker, available players table, roster preview, pick timer)
- Roster management (diamond lineup, bench panel, pitching rotation)
- Game viewer (play-by-play, box score, game state panel)
- Transactions (add/drop form, trade form, transaction log)
- Playoffs (bracket view, series cards)
- Archive (season list, season detail)
- Dashboard (standings, schedule view, simulation controls)

### Phase 11 -- Final Polish & Hardening
- StatTable virtualization (TanStack Virtual for 500+ rows)
- Trade execution with atomic roster swaps
- Anonymous auth ("Play as Guest")
- Web Worker integration in GameViewerPage
- 40 pgTAP RLS assertions across 6 test files
- GitHub Actions CI (lint, type-check, vitest, benchmarks)
- E2E expansion (page objects, auth fixture, 5 spec files)

### Phases 12--16 -- Database, Error Handling, Validation, UI Wiring, Cleanup
- Migration for game_logs columns
- Client/server config modules with fail-fast validation
- PostgreSQL error code mapping (7 PG codes)
- Structured JSON logging
- DB retry wrapper (3 retries, exponential backoff)
- Roster and simulation Zod schemas
- Dashboard simulation controls wired
- GameViewer tabs, Archive data, Playoffs live bracket
- RosterPage interactions, StatsPage sorting
- Cleanup of stale mocks, empty directories, redundant gitkeeps

### Phases 17--18 -- Manager AI Completion & Draft Engine
- Hit-and-run, pinch-hit, aggressive baserunning decisions
- Draft engine state machine (init, pick, validate, complete)
- AI drafter (strategy + template reasoning)
- Draft API (start, pick, auto-pick with turn validation)

### Phases 19--20 -- Transactions & Dashboard Polish
- Transaction service (drop/add/trade/history)
- TransactionsPage wired to real services
- FIP stat added to pitching pipeline
- ResultsTicker, InviteKeyDisplay, DeleteLeagueButton components

### Phase 21 -- Player Profile Modal & Commentary
- PlayerProfileModal ("Digital Baseball Card")
- CommentaryPanel with TypewriterText effect
- AvailablePlayersTable sortable stat columns

### Phase 22 -- Polish & NFR Compliance
- Self-hosted fonts (Roboto Slab, JetBrains Mono woff2)
- Default exports on all 61 component files
- Traceability matrix updated through Phase 22

### Phase 23 -- Playoff Pipeline
- Bracket advancement logic (WC to DS to CS to WS)
- Full playoff bracket (AL + NL + World Series)
- Bracket persistence (JSONB on leagues table)
- Season-to-playoffs transition (day >= 162)
- Playoff game simulation (full pipeline)
- Playoffs-to-completed transition
- Playoffs UI updated with persisted bracket

### Phase 24 -- AI Service Wiring
- 5 AI features wired end-to-end (template-first, Claude opt-in):
  - Commentary (per-play with "Enhance with AI" button)
  - Game summary (headline + recap + "Generate AI Recap")
  - Trade evaluation (recommendation badge + reasoning)
  - Draft reasoning (round-aware explanations)
  - Manager decisions (decision detection + explanations)

### Phase 25 -- League Creation Pipeline
- player_pool table (2 migrations, RLS)
- CSV pipeline orchestrator (`runCsvPipeline()`)
- CSV file reader (Node.js fs for Lahman files)
- League creation wiring (CSV load -> pool build -> card gen -> batch insert)
- Available players endpoint (paginated, filterable, sortable)
- Draft store wiring (fetchAvailablePlayers)
- Draft pick marks player as drafted

### Phase 26 -- Game Simulation Integration
- Shared team config loader (`loadTeamConfig()`, `selectStartingPitcher()`)
- Simulate endpoint wired to real game engine
- Full pipeline: load rosters -> build configs -> run simulation -> commit results

### Phase 27 -- API Route Consolidation
- 13 serverless functions consolidated to 10
- standings merged into stats, players merged into draft, transactions merged into teams

### Phase 28 -- Schedule Generation Wiring
- `generateAndInsertSchedule()` called on draft completion
- Schedule populated before league transitions to regular_season

### Phase 29 -- Lineup Update API
- PATCH handler for lineup saves (roster slot, lineup order, lineup position)
- Ownership verification and validation

### Phase 30 -- Post-Draft Lineup Auto-Generation
- `estimateBattingStats()` from PlayerCard fields
- `generateAndInsertLineups()` assigns starters, rotation, bullpen, closer
- Wired into draft completion (before schedule generation)

### Phase 31 -- Client-Driven Multi-Day Simulation
- Store loops calling single-day endpoint (REQ-NFR-021 chunked pattern)
- Day-based progress tracking (`totalDays`, `currentDay`)
- Early break when schedule exhausted or playoff transition
- Removed dead 202 async path from API endpoint

### Phase 32 -- Post-Simulation Dashboard Refresh (REQ-STATE-014, REQ-SCH-007)
- useRealtimeProgress triggers cache invalidation after simulation
- SimulationNotification with typewriter game results
- ResultsTicker integration with simulation completion flow

### Phase 33 -- Season Completion Ceremony (REQ-SCH-009, REQ-LGE-009)
- Season completion detection and champion announcement
- SeasonCompletePanel with archive button
- Playoff sim fix for game-by-game results

### Phase 34 -- Playoff Dashboard Integration (REQ-LGE-009, REQ-SCH-007)
- PlayoffStatusPanel in dashboard right column during playoffs
- Playoff-specific simulation notifications (round/game/score)
- Pure helpers for playoff display formatting

### Phase 35 -- Draft Pick Timer Enforcement (REQ-DFT-004)
- selectBestAvailable L1 helper (APBA card value scoring)
- useDraftTimer feature hook (60s countdown, auto-pick on expiry)
- API GET/POST draft response fixes (currentTeamId, round, pick, nextTeamId)
- DraftBoardPage wired with timer + auto-pick

### Phase 36 -- Free Agent Pickup Flow (REQ-RST-005)
- AddDropForm with search-as-you-type free agent pool browsing
- Add player service wiring (roster insert + player_pool status update)
- Drop player pool sync (return all seasons to free agent pool)
- Search endpoint reuse from draft available players

### Phase 37 -- Transaction History Persistence (REQ-RST-005)
- `transactions` table (migration 00018) with JSONB details
- L1 transform (`transformTransactionRows`) for history display
- API write (audit rows on add/drop/trade) + read (`?include=history`)
- Transaction service URL fix, layer violation cleanup

### Phase 38 -- CPU Trade Auto-Evaluation (REQ-RST-005, REQ-AI-006)
- L1 `buildTradeEvalRequest` helper (shared by API + client)
- API gates CPU trades (owner_id=null) behind `evaluateTradeTemplate()`
- CPU managers use personality profile thresholds for accept/reject/counter
- Client eval preview uses target team's actual manager profile
- Trade rejection displayed via ErrorBanner with manager reasoning

### Phase 39 -- Season Archive Enrichment (REQ-SCH-009)
- Archive API stores full snapshot: standings, leaders, champion, schedule summary
- Archive detail view with champion banner, standings table, top performers
- Season reset: stats cleared, rosters retained, new schedule on start
- Full archive-to-new-season lifecycle wired

### Phase 40 -- Start New Season Flow (REQ-SCH-009)
- `canStartSeason` L1 validator (status, seasonYear, teamCount, rosterSize checks)
- POST handler added to schedule.ts (no new serverless slot consumed)
- Commissioner-only: generates lineups + schedule, transitions to regular_season
- NewSeasonPanel component for post-archive setup screen
- DashboardPage branches setup display: seasonYear>1 -> NewSeasonPanel, seasonYear=1 -> InviteKeyDisplay

### Phase 41 -- Persist Migration Infrastructure (REQ-STATE-009)
- `createMigrationConfig` L1 helper (version/migrate factory for Zustand persist)
- Sequential migration runner with defaultState fallback for missing steps
- All 3 persisted stores (leagueStore, statsStore, rosterStore) wired with version=1 + migrate
- Safe schema evolution path for production state changes

### Phase 42 -- Accessibility: Focus Trap + Page Titles (REQ-COMP-012, REQ-COMP-013)
- `useFocusTrap` L5 hook (Tab/Shift+Tab cycling, Escape key, focus save/restore)
- `usePageTitle` L5 hook (document.title with "Page | Baseball Ledger" format)
- 3 modal components refactored to use useFocusTrap (ConfirmDialog, PlayerCardDisplay, PlayerProfileModal)
- 13 feature pages wired with usePageTitle

### Phase 43 -- WCAG ARIA Compliance Audit (REQ-COMP-012)
- 8 components audited against SRD ARIA specification table
- ConfirmDialog: alertdialog role, DiamondField: group role, LineScore: caption
- StatTable: grid role + aria-sort="none", Pagination: aria-current
- LoadingLedger: aria-label, DraftTicker: aria-live + corrected label

### Phase 44 -- Feature-Level Error Boundaries (REQ-ERR-010, REQ-ERR-011, REQ-COMP-007)
- LazyPage wrapper now includes ErrorBoundary outside Suspense
- All 11 lazy-loaded routes have isolated per-feature error boundaries
- Chunk-load failures and render errors caught with Try Again + Return to Dashboard

### Phase 45 -- Traceability Matrix Update (REQ-TEST-011)
- TRACEABILITY.md updated with 18 phase sections (Phases 27-44)
- ~50 requirement-to-test entries added
- REQ-NFR-017 verified: 143KB gzipped initial load (under 200KB target)

### Phase 46 -- Per-Directory Coverage Thresholds (REQ-TEST-003, REQ-TEST-004)
- vitest.config.ts configured with 9 per-directory coverage thresholds per SRD
- Global floor: 85% lines / 80% branches
- Critical directories: rng/ 100%, simulation/ 95%, card-generator/ 95%
- CI already runs `npm run test:coverage` with artifact upload
- @vitest/coverage-istanbul added as V8 fallback

### Phase 47 -- Responsive Design (REQ-UI-013, REQ-COMP-010)
- Single breakpoint at 768px using `max-md:` prefix per SRD
- AppShell: `max-md:max-w-none`, `max-md:border-l-0`, `max-md:px-gutter`
- Header: hamburger menu with aria-expanded, mobile nav column, user info in menu
- StandingsTable: GB/RS/RA/DIFF hidden on narrow viewports (Team/W/L/PCT only)
- StatTable: sticky first column on narrow viewports
- DiamondField: `min-w-[280px]` + `preserveAspectRatio` for mobile scaling
- DraftBoardPage: corrected breakpoint from `lg:` to `md:` for 3-column layout
- PlayerCardDisplay: `max-w-[480px]` desktop, `max-md:mx-4 max-md:max-w-none` mobile
- Font optimization tests: font-display: swap + Latin unicode-range subsetting
- 22 new tests (20 responsive + 2 font)

### Phase 48 -- Immer Middleware for draftStore (REQ-STATE-005)
- Added immer middleware to draftStore for clean nested-state mutations
- submitPick now uses direct mutations instead of manual spread-copy
- All 3 stores with nested state now use immer: leagueStore, rosterStore, draftStore

### Phase 49 -- League Deletion CASCADE Verification (REQ-LGE-010)
- Verified all 9 child tables have ON DELETE CASCADE for league_id FK
- Structural migration test reads SQL files and validates constraint chain
- Rosters cascade via team_id -> teams -> leagues chain
- 11 new tests

### Phase 50 -- Client Network Request Retry (REQ-ERR-015, REQ-ERR-016)
- Added `fetchWithRetry` wrapper to api-client.ts
- 2 retries with exponential backoff (1s, 3s)
- Retries on network errors (TypeError), 5xx, 429; no retry on 4xx
- WARN per retry attempt, ERROR on final exhaustion
- 9 new tests

### Phase 51 -- localStorage Fallback Warning + Traceability (REQ-STATE-010, REQ-TEST-011)
- Completed REQ-STATE-010: isMemoryFallback() detection + WARN ErrorBanner
- Updated TRACEABILITY.md through Phase 51
- 5 new tests (3 storage-factory + 2 AuthenticatedLayout)

### Phase 52 -- DevTools Conditional + Responsive SimControls + WARN Logging (REQ-STATE-016, REQ-COMP-010, REQ-ERR-018)
- All 6 Zustand stores: `enabled: import.meta.env.DEV` strips DevTools in production
- SimulationControls: `max-md:grid max-md:grid-cols-2` for 2x2 mobile layout
- storage-factory: `console.warn()` on in-memory fallback activation
- 8 new tests (6 structural + 1 WARN log + 1 responsive)

---

## REQ-* Coverage by Category

### Fully Implemented (or substantially complete)

| Category | Reqs | Status | Notes |
|----------|------|--------|-------|
| REQ-ARCH | 8 | Done | 7-layer architecture, path aliases, naming conventions |
| REQ-DATA | 9 | Done | CSV loading, player pool, card generation, league averages, DB schema |
| REQ-SIM | 16 | Done | Full APBA simulation engine, all mechanics ported |
| REQ-LGE | 8 of 10 | Mostly done | Creation, join, invite keys, divisions, playoffs, commissioner |
| REQ-DFT | 8 | Done | Snake draft, AI drafter, valuation, timer, roster validation |
| REQ-RST | 6 | Done | Lineup gen, lineup update, roster validation, add/drop, trade eval, transactions |
| REQ-SCH | 9 | Done | Schedule gen, simulate buttons, standings update, playoff transition, archive, new season |
| REQ-STS | 5 | Done | Accumulation, derived stats, leaders, team stats, trad/adv toggle |
| REQ-AI | 8 | Done | 4 manager profiles, Claude API, 5 AI features, template fallbacks |
| REQ-AUTH | 3 | Done | Supabase Auth, RLS, invite keys |
| REQ-API | 10 of 11 | Mostly done | Endpoints, envelope format, pagination, error codes |
| REQ-ERR | 20 | Done | AppError, Zod validation, per-feature error boundaries, structured logging |
| REQ-STATE | 16 | Done | All stores, persist + migration, devtools conditional, Realtime infra, cache invalidation |
| REQ-COMP | 13 | Done | Design tokens, components, routing, accessibility, focus trap, page titles |
| REQ-MIG | 11 of 13 | Mostly done | 17 migrations, RLS, seed data, pgTAP stubs |
| REQ-NFR | 17 of 21 | Mostly done | Performance benchmarks, determinism, Web Worker, chunked sim |
| REQ-TEST | 17 of 18 | Mostly done | 2,613 tests, TDD, traceability current, per-dir coverage thresholds, E2E, benchmarks |
| REQ-ENV | 8 of 10 | Mostly done | Config modules, .env.example, vercel.json |

### UI Pages (REQ-UI)

| Page | REQ | Status |
|------|-----|--------|
| Splash Page | REQ-UI-004 | Done |
| League Config | REQ-UI-005 | Done |
| Draft Board | REQ-UI-006 | Done |
| Stat Master / Dashboard | REQ-UI-007 | Done |
| Roster & Lineup | REQ-UI-008 | Done |
| Player Profile Modal | REQ-UI-009 | Done |
| Game Viewer | REQ-UI-010 | Done |
| Season Archive | REQ-UI-011 | Done |
| Playoff Theme | REQ-UI-012 | Done |
| Responsive Design | REQ-UI-013, REQ-COMP-010 | Done -- single breakpoint (768px), max-md: prefix, hamburger menu |

---

## What Still Needs Work

### Medium Priority (Polish & NFR Compliance)

1. **REQ-NFR-008: Web Worker for bulk simulation**
   - Worker exists and works for single-game replay in GameViewer
   - Multi-day simulation currently runs in main thread via store loop
   - Could move day simulation to worker for smoother progress bar

2. **REQ-NFR-020: Supabase Realtime for simulation progress**
   - Infrastructure exists (simulation_progress table, useRealtimeProgress hook, subscribeToSimProgress)
   - Not actively used since Phase 31 moved to client-driven approach
   - Could be useful for multi-player leagues where one user watches another simulate

3. **REQ-STATE-005: Immer middleware** -- DONE (Phase 48)
   - leagueStore, rosterStore, draftStore all use immer
   - statsStore, simulationStore, authStore correctly exempt (flat state per SRD)

4. **REQ-NFR-017: Bundle size < 200KB gzipped** -- VERIFIED
   - Route-level code splitting with React.lazy + Suspense in place
   - Manual chunk splitting configured (vendor/simulation/supabase)
   - Measured: 143KB gzipped initial load (index 64KB + vendor 33KB + supabase 45KB)

5. **REQ-TEST-003 / REQ-TEST-004: Per-directory coverage thresholds** -- CONFIGURED
   - 9 per-directory thresholds in vitest.config.ts per SRD
   - CI runs `npm run test:coverage` which enforces thresholds

6. **REQ-TEST-011: Traceability matrix maintenance** -- CURRENT
   - TRACEABILITY.md updated through Phase 44
   - All phases have mapped requirement-to-test entries

### Lower Priority (Nice-to-Have / Future)

7. **REQ-LGE-010: League deletion** -- VERIFIED (Phase 49)
   - DeleteLeagueButton component exists with typed-name confirmation
   - API endpoint exists (DELETE /api/leagues/:id, commissioner-only)
   - All 9 child tables verified ON DELETE CASCADE via structural test

8. **REQ-MIG-009: Full pgTAP coverage**
   - 40 assertions exist across 6 test files
   - Some are stubs -- need real Docker-based testing

9. **REQ-MIG-010 / REQ-MIG-011: Environment isolation**
   - Local dev environment works
   - Staging and production environments not yet set up
   - Supabase project provisioning needed for deployment

10. **REQ-MIG-012: CI database migration validation**
    - CI runs lint + type-check + vitest
    - Does not yet validate migrations against a real database

11. **REQ-ENV-010: API key rotation policy**
    - Documentation-level requirement, not yet documented

12. **REQ-SCOPE requirements**
    - Mostly followed organically during development
    - No formal promotion audit performed

13. **REQ-ERR-015 / REQ-ERR-016: Retry policies** -- DONE
    - db-retry.ts handles Supabase retries (server-side)
    - api-client.ts fetchWithRetry handles client-side retries (2 retries, exponential 1s/3s)
    - Retries on network errors, 5xx, 429; no retry on 4xx
    - REQ-ERR-016: WARN per retry, ERROR on exhaustion

14. **Deployment to Vercel + Supabase Cloud**
    - All code is deployment-ready
    - vercel.json configured
    - Actual deployment not yet performed
    - Need to provision Supabase project, set env vars, push migrations

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Phases completed | 52 |
| Test files | 233 |
| Total tests | 2,668 |
| Source files | ~300+ |
| API endpoints | 10 serverless functions |
| SQL migrations | 18 |
| Zustand stores | 6 |
| React hooks | 14 |
| Feature directories | 15 |
| E2E specs | 9 files, 35 tests |
| pgTAP assertions | 40 |
| Performance benchmarks | 3 files |
| AI features | 5 (template + Claude) |
| Manager AI profiles | 4 |
| APBA card positions | 35 (all mapped) |
| Outcome categories | 26 (all resolved) |

---

## 10 API Endpoints (2 slots remaining)

| # | Path | Methods | Purpose |
|---|------|---------|---------|
| 1 | `api/ai/index.ts` | POST | Claude AI features (5 via `?feature=`) |
| 2 | `api/leagues/index.ts` | POST | Create league |
| 3 | `api/leagues/[id]/index.ts` | GET, POST, DELETE | League details, join, delete |
| 4 | `api/leagues/[id]/archive.ts` | GET, POST | Season archives |
| 5 | `api/leagues/[id]/draft.ts` | GET, POST | Draft state, picks, player pool |
| 6 | `api/leagues/[id]/games/[gid].ts` | GET | Individual game details |
| 7 | `api/leagues/[id]/schedule.ts` | GET, POST | Schedule with day filter, start new season |
| 8 | `api/leagues/[id]/simulate.ts` | POST | Single-day simulation |
| 9 | `api/leagues/[id]/stats.ts` | GET | Batting, pitching, team stats, standings |
| 10 | `api/leagues/[id]/teams.ts` | GET, PATCH, POST | Teams, rosters, lineups, transactions |

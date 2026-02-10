# Baseball Ledger -- Project Status

**Last updated:** 2026-02-10
**Test suite:** 2,449 tests across 214 files (all passing)
**TypeScript:** Clean (no errors)
**API endpoints:** 10 of 12 Vercel Hobby limit (2 slots remaining)
**SQL migrations:** 17

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
| L5 -- Hooks | React hooks composing stores | 14 hooks |
| L6 -- Components | Shared UI components | 20+ files |
| L7 -- Features | Page-level feature modules | 15 feature dirs, 40+ files |

---

## Completed Phases (1--31)

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
| REQ-RST | 5 of 6 | Mostly done | Lineup gen, lineup update, roster validation, pitcher assignments |
| REQ-SCH | 7 of 9 | Mostly done | Schedule gen, simulate buttons, standings update, playoff transition |
| REQ-STS | 5 | Done | Accumulation, derived stats, leaders, team stats, trad/adv toggle |
| REQ-AI | 8 | Done | 4 manager profiles, Claude API, 5 AI features, template fallbacks |
| REQ-AUTH | 3 | Done | Supabase Auth, RLS, invite keys |
| REQ-API | 10 of 11 | Mostly done | Endpoints, envelope format, pagination, error codes |
| REQ-ERR | 18 of 20 | Mostly done | AppError, Zod validation, error boundaries, structured logging |
| REQ-STATE | 14 of 16 | Mostly done | All stores, persist, devtools, Realtime infra, cache invalidation |
| REQ-COMP | 11 of 13 | Mostly done | Design tokens, components, routing, accessibility |
| REQ-MIG | 11 of 13 | Mostly done | 17 migrations, RLS, seed data, pgTAP stubs |
| REQ-NFR | 17 of 21 | Mostly done | Performance benchmarks, determinism, Web Worker, chunked sim |
| REQ-TEST | 14 of 18 | Mostly done | 2,449 tests, TDD, traceability, E2E, benchmarks |
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
| Responsive Design | REQ-UI-013 | Partial -- desktop-first done, mobile polish needed |

---

## What Still Needs Work

### High Priority (Core Functionality Gaps)

1. **REQ-SCH-007: Typewriter simulation results notification**
   - TypewriterText component exists but is not wired to show game results after simulation completes
   - ResultsTicker exists but needs integration with simulation completion flow

2. **REQ-SCH-008 / REQ-SCH-009: Season completion ceremony**
   - StampAnimation component exists ("SEASON COMPLETED")
   - Season-to-playoffs transition works, but the full season completion flow (after World Series) needs the stamp animation triggered in the UI
   - Archive creation after season completion needs UI wiring

3. **REQ-LGE-009: Playoff game-by-game simulation UI**
   - Backend works (simulatePlayoffGame), but the frontend needs to show each game result one at a time rather than bulk-simulating

4. **REQ-RST-005 / REQ-RST-006: Full transaction flow testing**
   - Transaction service wired, trade validation exists
   - End-to-end flow from TransactionsPage through API to DB needs verification with real Supabase
   - Trade form UI could be more polished

5. **REQ-DFT-004: 60-second pick timer enforcement**
   - PickTimer component exists with countdown
   - Auto-pick on expiration is partially wired (API endpoint exists)
   - Needs real-time integration for multi-player draft experience

### Medium Priority (Polish & NFR Compliance)

6. **REQ-NFR-008: Web Worker for bulk simulation**
   - Worker exists and works for single-game replay in GameViewer
   - Multi-day simulation currently runs in main thread via store loop
   - Could move day simulation to worker for smoother progress bar

7. **REQ-NFR-020: Supabase Realtime for simulation progress**
   - Infrastructure exists (simulation_progress table, useRealtimeProgress hook, subscribeToSimProgress)
   - Not actively used since Phase 31 moved to client-driven approach
   - Could be useful for multi-player leagues where one user watches another simulate

8. **REQ-STATE-005: Immer middleware**
   - leagueStore uses immer, but other stores with nested state updates could benefit
   - Low priority since current stores work correctly

9. **REQ-STATE-009: Persist migration functions**
   - Stores use persist middleware but lack version/migrate for schema changes
   - Will matter when schema changes in production

10. **REQ-COMP-012 / REQ-COMP-013: WCAG 2.1 AA compliance**
    - Skip links, aria-labels, semantic HTML largely in place
    - Full audit not yet performed
    - Color contrast checks needed for theme colors

11. **REQ-NFR-017: Bundle size < 200KB gzipped**
    - Route-level code splitting with React.lazy + Suspense in place
    - Manual chunk splitting configured (vendor/simulation/supabase)
    - Actual bundle size not yet measured against target

12. **REQ-TEST-003 / REQ-TEST-004: Per-directory coverage thresholds**
    - Global thresholds set (60% stmt, 50% branch)
    - Per-directory thresholds (e.g., rng/ 100%) not yet enforced in CI

13. **REQ-TEST-011: Traceability matrix maintenance**
    - TRACEABILITY.md exists but may be behind after Phases 23-31
    - Needs update to map all recent requirements to tests

### Lower Priority (Nice-to-Have / Future)

14. **REQ-LGE-010: League deletion**
    - DeleteLeagueButton component exists
    - API endpoint exists (DELETE /api/leagues/:id)
    - Cascade deletion of all related data needs verification

15. **REQ-MIG-009: Full pgTAP coverage**
    - 40 assertions exist across 6 test files
    - Some are stubs -- need real Docker-based testing

16. **REQ-MIG-010 / REQ-MIG-011: Environment isolation**
    - Local dev environment works
    - Staging and production environments not yet set up
    - Supabase project provisioning needed for deployment

17. **REQ-MIG-012: CI database migration validation**
    - CI runs lint + type-check + vitest
    - Does not yet validate migrations against a real database

18. **REQ-ENV-010: API key rotation policy**
    - Documentation-level requirement, not yet documented

19. **REQ-SCOPE requirements**
    - Mostly followed organically during development
    - No formal promotion audit performed

20. **REQ-ERR-015 / REQ-ERR-016: Retry policies**
    - db-retry.ts handles Supabase retries
    - Other retry targets (AI, external services) use simpler patterns

21. **Deployment to Vercel + Supabase Cloud**
    - All code is deployment-ready
    - vercel.json configured
    - Actual deployment not yet performed
    - Need to provision Supabase project, set env vars, push migrations

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Phases completed | 31 |
| Test files | 214 |
| Total tests | 2,449 |
| Source files | ~300+ |
| API endpoints | 10 serverless functions |
| SQL migrations | 17 |
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
| 7 | `api/leagues/[id]/schedule.ts` | GET | Schedule with day filter |
| 8 | `api/leagues/[id]/simulate.ts` | POST | Single-day simulation |
| 9 | `api/leagues/[id]/stats.ts` | GET | Batting, pitching, team stats, standings |
| 10 | `api/leagues/[id]/teams.ts` | GET, PATCH, POST | Teams, rosters, lineups, transactions |

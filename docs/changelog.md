# Changelog

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

# Baseball Ledger - Software Requirements Document (SRD)

> Version 4.0 | 2026-02-08
> A multiplayer web-based MLB simulation game inspired by APBA Baseball, built with React/TypeScript on Supabase + Vercel

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technical Stack](#3-technical-stack)
   - 3.3 [Project Directory Structure](#33-project-directory-structure)
   - 3.4 [Module Architecture & Dependency Rules](#34-module-architecture--dependency-rules)
   - 3.5 [Import Path Aliases](#35-import-path-aliases)
   - 3.6 [File Naming Conventions](#36-file-naming-conventions)
   - 3.7 [Module Size & Quality Guidelines](#37-module-size--quality-guidelines)
4. [Data Layer](#4-data-layer)
5. [Game Simulation Engine](#5-game-simulation-engine)
6. [League Management](#6-league-management)
7. [Draft System](#7-draft-system)
8. [Roster & Lineup Management](#8-roster--lineup-management)
9. [Season Scheduling & Simulation Flow](#9-season-scheduling--simulation-flow)
10. [Statistics System](#10-statistics-system)
11. [AI Integration](#11-ai-integration)
12. [User Interface](#12-user-interface)
13. [Authentication & Authorization](#13-authentication--authorization)
14. [API Design](#14-api-design)
   - 14.1 [REST Endpoints (Vercel Serverless Functions)](#141-rest-endpoints-vercel-serverless-functions)
   - 14.2 [Success Response Envelopes](#142-success-response-envelopes)
   - 14.3 [HTTP Status Code Semantics](#143-http-status-code-semantics)
   - 14.4 [Response Helpers and Conventions](#144-response-helpers-and-conventions)
   - 14.5 [Endpoint Response Type Mapping](#145-endpoint-response-type-mapping)
15. [Non-Functional Requirements](#15-non-functional-requirements)
   - 15.8 [Error Handling & Recovery](#158-error-handling--recovery)
16. [Build Phases](#16-build-phases)
17. [Testing Strategy](#17-testing-strategy)
18. [State Management Architecture](#18-state-management-architecture)
   - 18.1 [Store Slice Design](#181-store-slice-design)
   - 18.2 [Action Patterns](#182-action-patterns)
   - 18.3 [Selector Patterns](#183-selector-patterns)
   - 18.4 [Persistence Strategy](#184-persistence-strategy)
   - 18.5 [Cache Invalidation](#185-cache-invalidation)
   - 18.6 [Realtime Subscriptions](#186-realtime-subscriptions)
   - 18.7 [Store Initialization & Auth Lifecycle](#187-store-initialization--auth-lifecycle)
   - 18.8 [Development Tooling](#188-development-tooling)
19. [Component Architecture](#19-component-architecture)
   - 19.1 [Theme System & Design Tokens](#191-theme-system--design-tokens)
   - 19.2 [Shared Component Prop Contracts](#192-shared-component-prop-contracts)
   - 19.3 [Page Layout & Routing](#193-page-layout--routing)
   - 19.4 [Feature Page Composition Pattern](#194-feature-page-composition-pattern)
   - 19.5 [Responsive Layout](#195-responsive-layout)
   - 19.6 [Animation & Transition Patterns](#196-animation--transition-patterns)
   - 19.7 [Accessibility](#197-accessibility)
20. [Database Migration Workflow](#20-database-migration-workflow)
   - 20.1 [Supabase CLI & Local Development](#201-supabase-cli--local-development)
   - 20.2 [Migration File Standards](#202-migration-file-standards)
   - 20.3 [Schema Change Workflow](#203-schema-change-workflow)
   - 20.4 [Rollback & Recovery Strategy](#204-rollback--recovery-strategy)
   - 20.5 [Seed Data](#205-seed-data)
   - 20.6 [RLS Policy Testing](#206-rls-policy-testing)
   - 20.7 [Multi-Environment Strategy](#207-multi-environment-strategy)
   - 20.8 [CI/CD Database Pipeline](#208-cicd-database-pipeline)
21. [Environment Configuration](#21-environment-configuration)
   - 21.1 [Environment Variable Inventory](#211-environment-variable-inventory)
   - 21.2 [`.env.example` Template](#212-envexample-template)
   - 21.3 [Configuration Module](#213-configuration-module)
   - 21.4 [Vite Environment Type Declarations](#214-vite-environment-type-declarations)
   - 21.5 [Vercel Project Configuration](#215-vercel-project-configuration)
   - 21.6 [Secrets Management](#216-secrets-management)
22. [Code Ownership & Scoping](#22-code-ownership--scoping)
   - 22.1 [Universal Scoping Rule](#221-universal-scoping-rule)
   - 22.2 [Feature-Scoped File Conventions](#222-feature-scoped-file-conventions)
   - 22.3 [Promotion Checklist](#223-promotion-checklist)
   - 22.4 [Fixed-Home Artifacts](#224-fixed-home-artifacts)
   - 22.5 [Gray Area Resolution](#225-gray-area-resolution)

---

## 1. Executive Summary

Baseball Ledger is a multiplayer web-based MLB simulation game where users create fantasy leagues, draft historical MLB players (1901-2025), and simulate full seasons using a probability-driven game engine inspired by APBA Baseball for Windows 3.0.

**Core differentiators from APBA:**
- Faithful port of APBA's 35-byte card system, IDT decision table, pitcher grade gating, and player archetype flags - but cards are generated dynamically from Lahman Database statistics instead of hand-encoded binary files
- 4 manager personality profiles (conservative, aggressive, balanced, analytical) ported from APBA's MGR* system, enhanced with Claude AI for commentary, draft reasoning, and trade evaluation
- Modern web UI with a vintage "Digital Almanac" aesthetic
- Multiplayer leagues with commissioner controls and invite-based access
- Full stat tracking mirroring real MLB categories

**What this document is:** A complete, buildable specification. Every section contains enough detail to implement without ambiguity. Requirements are numbered for traceability.

---

## 2. System Overview

### 2.1 Architecture Diagram

```
+--------------------------------------------------+
|                  FRONTEND                        |
|  React + TypeScript + Zustand + TailwindCSS      |
|                                                  |
|  Pages:                                          |
|  - Splash / Landing                              |
|  - League Config / Creation                      |
|  - Draft Board                                   |
|  - Ledger Dashboard (Stat Master)                |
|  - Roster / Lineup Management                    |
|  - Game Viewer (play-by-play)                    |
|  - Season Archive                                |
+--------------------------------------------------+
          |               |              |
          v               v              v
+--------------------------------------------------+
|                  BACKEND API                     |
|  Vercel Serverless Functions (Node.js)           |
|                                                  |
|  Services:                                       |
|  - LeagueService                                 |
|  - DraftService                                  |
|  - SimulationService (game engine)               |
|  - StatsService                                  |
|  - PlayerDataService                             |
|  - AIService (Claude API wrapper)                |
+--------------------------------------------------+
          |               |              |
          v               v              v
+--------------------------------------------------+
|                  DATA LAYER                      |
|                                                  |
|  Supabase PostgreSQL:                            |
|  - Leagues, Teams, Rosters, Schedules            |
|  - Season Stats, Game Logs                       |
|  - User profiles (via Supabase Auth)             |
|                                                  |
|  Supabase Storage:                               |
|  - Archived seasons (JSON blobs)                 |
|                                                  |
|  Static Data (loaded at init):                   |
|  - Lahman CSVs (People, Batting, Pitching,       |
|    Fielding) -> parsed into PlayerCard objects    |
+--------------------------------------------------+
          |
          v
+--------------------------------------------------+
|              EXTERNAL SERVICES                   |
|  - Claude API (manager AI, commentary, drafting) |
|  - Supabase Auth                                 |
+--------------------------------------------------+
```

### 2.2 Module Mapping (from APBA BBW)

| APBA Module | Baseball Ledger Module | Notes |
|-------------|----------------------|-------|
| WINBB.EXE (1.1MB game engine) | `SimulationEngine` | Plate appearance state machine, card+IDT outcome resolution |
| WINDRAFT.EXE (1.3MB draft) | `DraftService` | AI-driven snake draft |
| WINLM.EXE (842KB league mgr) | `LeagueService` + `Scheduler` | Season management, standings |
| WINSTATS.EXE (668KB stats) | `StatsService` + `StatMaster` UI | League leaders, team stats |
| PLAYERS.DAT (35-byte cards) | `CardGenerator` | 35-element card arrays generated from Lahman stats using correlation mapping |
| NSTAT.DAT / PSTAT.DAT | Supabase `season_stats` table | PostgreSQL batting/pitching stat records |
| MGR*.DCT/LIB/MOB/MSY (4 profiles) | `ManagerProfile` config | 4 personality profiles with decision thresholds + Claude API enhancement |
| B3EHMSG.* (commentary) | `AIService` (Claude API) | AI play-by-play with template fallback |
| IDT.OBJ (144-byte decision table) | `OutcomeTable` (36x4 matrix) | Faithful port of frequency-weighted card-to-outcome lookup |
| Card bytes 33-34 (archetype flags) | `PlayerArchetype` | Speed/power/defense/contact modifiers from card analysis |
| Pitcher grade (1-15 in position str) | `PitcherAttributes.grade` | ERA percentile -> 1-15 scale, gates batter card outcomes |

---

## 3. Technical Stack

### 3.1 Required Technologies

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend Framework | React 18+ with TypeScript | Per project spec |
| State Management | Zustand | Per UI/UX spec; lightweight, no boilerplate |
| Styling | TailwindCSS | Rapid prototyping with the custom color palette |
| Fonts | Roboto Slab (headlines), JetBrains Mono (stats) | Per UI/UX spec |
| CSV Parsing | PapaParse | Per UI/UX spec; handles Lahman CSVs efficiently |
| Database | Supabase (PostgreSQL) | Relational DB ideal for stat queries; built-in auth, storage, real-time |
| File Storage | Supabase Storage | Archived season JSON blobs |
| Auth | Supabase Auth | Email/password + anonymous; free tier, no credit card |
| AI | Claude API (Anthropic) | Manager strategy, commentary, draft AI |
| Backend | Vercel Serverless Functions (Node.js) | Game simulation, prevents client manipulation |
| Hosting | Vercel | SPA serving with CDN, git-based deploys |
| ORM | Supabase JS Client (@supabase/supabase-js) | Type-safe PostgreSQL queries with real-time subscriptions |

### 3.2 Development Tools

- Package manager: npm or pnpm
- Build tool: Vite
- Linting: ESLint + Prettier
- Testing: Vitest (unit), Playwright (E2E)
- CI/CD: Vercel Git Integration (auto-deploy on push) or GitHub Actions

### 3.3 Project Directory Structure

**REQ-ARCH-001**: The project follows a layered architecture with strict separation between pure logic, API functions, and frontend components. The directory structure maps directly to the module architecture defined in Section 3.4.

```
baseball-ledger/
|
|-- .github/                          # CI/CD workflows
|   +-- workflows/
|       +-- ci.yml                    # Lint, type-check, test on push/PR
|
|-- api/                              # Vercel Serverless Functions (REQ-API-001)
|   |-- _lib/                         # Server-only utilities (_ prefix = not routed)
|   |   |-- config.ts                # Server environment config (REQ-ENV-005)
|   |   |-- supabase-admin.ts         # Supabase client with service_role key
|   |   |-- auth.ts                   # Token verification, user extraction
|   |   |-- response.ts              # Standard ApiResponse envelope helpers
|   |   +-- errors.ts                # ApiError types and HTTP error handler
|   |-- leagues/
|   |   |-- index.ts                  # POST /api/leagues (create league)
|   |   +-- [id]/
|   |       |-- index.ts              # GET (details) / DELETE (commissioner only)
|   |       |-- join.ts               # POST /api/leagues/:id/join
|   |       |-- simulate.ts           # POST /api/leagues/:id/simulate
|   |       |-- standings.ts          # GET /api/leagues/:id/standings
|   |       |-- schedule.ts           # GET /api/leagues/:id/schedule
|   |       |-- archive.ts            # POST /api/leagues/:id/archive
|   |       |-- archives.ts           # GET /api/leagues/:id/archives
|   |       |-- transactions.ts       # POST /api/leagues/:id/transactions
|   |       |-- draft/
|   |       |   |-- start.ts          # POST /api/leagues/:id/draft/start
|   |       |   |-- pick.ts           # POST /api/leagues/:id/draft/pick
|   |       |   +-- state.ts          # GET /api/leagues/:id/draft/state
|   |       |-- teams/
|   |       |   |-- index.ts          # GET /api/leagues/:id/teams
|   |       |   +-- [tid]/
|   |       |       |-- index.ts      # PATCH /api/leagues/:id/teams/:tid
|   |       |       +-- roster.ts     # GET /api/leagues/:id/teams/:tid/roster
|   |       |-- stats/
|   |       |   |-- batting.ts        # GET /api/leagues/:id/stats/batting
|   |       |   |-- pitching.ts       # GET /api/leagues/:id/stats/pitching
|   |       |   +-- team.ts           # GET /api/leagues/:id/stats/team
|   |       +-- games/
|   |           +-- [gid].ts          # GET /api/leagues/:id/games/:gid
|
|-- data_files/                       # Lahman CSV data (existing, read-only at runtime)
|   |-- People.csv
|   |-- Batting.csv
|   |-- Pitching.csv
|   +-- Fielding.csv
|
|-- docs/                             # Project documentation (existing)
|   |-- SRD.md                        # This document
|   |-- APBA_REVERSE_ENGINEERING.md
|   |-- CLAUDE.md
|   |-- changelog.md
|   |-- baseball_ledger.md
|   |-- ui_ux_spec.md
|   +-- plans/                        # Development plan files (CLAUDE.md Rule 7)
|
|-- public/                           # Static assets served by Vite
|   |-- fonts/
|   |   |-- roboto-slab-latin-*.woff2 # Subsetted headline font (NFR-018)
|   |   +-- jetbrains-mono-latin-*.woff2  # Subsetted monospace font (NFR-018)
|   +-- favicon.ico
|
|-- src/                              # Frontend React application
|   |-- main.tsx                      # App entry point, ReactDOM.createRoot
|   |-- App.tsx                       # Root component: providers, router outlet
|   |-- router.tsx                    # React Router route definitions (lazy imports)
|   |-- vite-env.d.ts                 # Vite type declarations
|   |
|   |-- components/                   # Shared UI components (Layer 6)
|   |   |-- layout/
|   |   |   |-- AppShell.tsx          # Main layout: book-spine border, max-width container
|   |   |   |-- Header.tsx            # Top navigation bar
|   |   |   +-- Footer.tsx            # Footer with league context
|   |   |-- data-display/
|   |   |   |-- StatTable.tsx         # Virtualized stat table (NFR-004)
|   |   |   |-- StandingsTable.tsx    # Division standings renderer
|   |   |   |-- Scoreboard.tsx        # Game score display
|   |   |   +-- Pagination.tsx        # Server-side pagination controls (NFR-019)
|   |   |-- feedback/
|   |   |   |-- LoadingLedger.tsx     # "Processing Ledger..." vintage animation
|   |   |   |-- TypewriterText.tsx    # Typewriter effect for sim results
|   |   |   |-- ErrorBanner.tsx       # Error display (CLAUDE.md Rule 3: loud)
|   |   |   +-- ProgressBar.tsx       # Simulation progress bar (NFR-020)
|   |   |-- forms/
|   |   |   |-- Input.tsx             # Text input with validation
|   |   |   |-- Select.tsx            # Dropdown select
|   |   |   |-- Toggle.tsx            # Vintage-style toggle switch
|   |   |   +-- ConfirmDialog.tsx     # Destructive action confirmation
|   |   +-- baseball/
|   |       |-- DiamondField.tsx      # Baseball diamond visualization
|   |       |-- PlayerCardDisplay.tsx # Digital Baseball Card modal (REQ-UI-009)
|   |       |-- BaseIndicator.tsx     # Base runner state display
|   |       +-- LineScore.tsx         # Inning-by-inning line score
|   |
|   |-- features/                     # Feature modules (Layer 7) -- one per page
|   |   |-- splash/
|   |   |   |-- SplashPage.tsx        # Landing page (REQ-UI-004)
|   |   |   +-- ActionCard.tsx        # Create/Join/Delete action cards
|   |   |-- league/
|   |   |   |-- LeagueConfigPage.tsx  # League creation form (REQ-UI-005)
|   |   |   |-- JoinLeaguePage.tsx    # Join via invite key (REQ-LGE-006)
|   |   |   |-- InviteKeyCard.tsx     # "Secret Telegram" invite display
|   |   |   +-- DivisionPreview.tsx   # AL/NL division assignment preview
|   |   |-- draft/
|   |   |   |-- DraftBoardPage.tsx    # Main draft page (REQ-UI-006)
|   |   |   |-- DraftTicker.tsx       # Vertical scrolling pick feed
|   |   |   |-- AvailablePlayersTable.tsx  # Sortable/filterable player list
|   |   |   |-- PickTimer.tsx         # 60-second countdown (REQ-DFT-004)
|   |   |   +-- RosterPreview.tsx     # Team roster during draft
|   |   |-- dashboard/
|   |   |   |-- DashboardPage.tsx     # Stat Master main view (REQ-UI-007)
|   |   |   |-- ScheduleView.tsx      # Schedule with game results
|   |   |   |-- StandingsView.tsx     # Division standings
|   |   |   |-- SimulationControls.tsx  # Day/Week/Month/Season buttons
|   |   |   |-- ResultsTicker.tsx     # Bottom-screen results feed
|   |   |   +-- StatsToggle.tsx       # Traditional/Advanced toggle (REQ-STS-005)
|   |   |-- roster/
|   |   |   |-- RosterPage.tsx        # Roster management (REQ-UI-008)
|   |   |   |-- DiamondView.tsx       # The Diamond: drag-drop lineup
|   |   |   |-- LineupEditor.tsx      # Batting order editor
|   |   |   |-- BenchPanel.tsx        # Bench player panel
|   |   |   |-- PitchingRotation.tsx  # SP1-SP4 + bullpen display
|   |   |   +-- PlayerProfileModal.tsx  # Digital Baseball Card popup
|   |   |-- game-viewer/
|   |   |   |-- GameViewerPage.tsx    # Full game view (REQ-UI-010)
|   |   |   |-- PlayByPlayFeed.tsx    # Scrolling play-by-play text
|   |   |   |-- BoxScoreDisplay.tsx   # Box score rendering
|   |   |   +-- GameStateViz.tsx      # Live diamond + score + outs
|   |   |-- stats/
|   |   |   |-- StatsPage.tsx         # League leaders hub
|   |   |   |-- BattingLeaders.tsx    # Batting leaderboard (REQ-STS-003)
|   |   |   |-- PitchingLeaders.tsx   # Pitching leaderboard
|   |   |   +-- TeamStatsView.tsx     # Team aggregate stats (REQ-STS-004)
|   |   |-- playoffs/
|   |   |   |-- PlayoffsPage.tsx      # Playoff hub (REQ-UI-012)
|   |   |   |-- BracketView.tsx       # Bracket visualization
|   |   |   +-- PlayoffGameSim.tsx    # Single-game playoff sim (REQ-LGE-009)
|   |   |-- archive/
|   |   |   |-- ArchivePage.tsx       # Season archive list (REQ-UI-011)
|   |   |   |-- SeasonDetail.tsx      # Archived season drill-down
|   |   |   +-- StampAnimation.tsx    # "SEASON COMPLETED" stamp (REQ-SCH-009)
|   |   +-- transactions/
|   |       |-- TransactionsPage.tsx  # Trade/add/drop hub (REQ-RST-005)
|   |       |-- TradeProposal.tsx     # Propose and review trades
|   |       +-- AddDropForm.tsx       # Player add/drop form
|   |
|   |-- hooks/                        # Shared React hooks (Layer 5)
|   |   |-- useAuth.ts               # Auth state, login/logout/session
|   |   |-- useLeague.ts             # Active league data subscription
|   |   |-- useTeam.ts               # Team roster and lineup
|   |   |-- useSimulation.ts         # Simulation trigger and progress
|   |   +-- useRealtimeProgress.ts   # Supabase Realtime subscription (NFR-020)
|   |
|   |-- stores/                       # Zustand state stores (Layer 4)
|   |   |-- authStore.ts             # User session, auth state
|   |   |-- leagueStore.ts           # Active league, teams, standings
|   |   |-- rosterStore.ts           # Active team roster and lineup
|   |   |-- simulationStore.ts       # Simulation progress and results
|   |   |-- statsStore.ts            # Cached league statistics
|   |   +-- storage-factory.ts       # Safe localStorage wrapper with memory fallback
|   |
|   |-- services/                     # API client layer (Layer 3)
|   |   |-- api-client.ts            # Base fetch wrapper with auth headers
|   |   |-- league-service.ts        # /api/leagues/* HTTP calls
|   |   |-- draft-service.ts         # /api/leagues/:id/draft/* calls
|   |   |-- simulation-service.ts    # /api/leagues/:id/simulate calls
|   |   |-- roster-service.ts        # /api/leagues/:id/teams/:tid/* calls
|   |   |-- stats-service.ts         # /api/leagues/:id/stats/* calls
|   |   +-- transaction-service.ts   # /api/leagues/:id/transactions calls
|   |
|   |-- workers/                      # Web Workers (Layer W)
|   |   +-- simulation.worker.ts     # Client-side game sim (NFR-008)
|   |
|   +-- styles/
|       +-- globals.css              # Tailwind directives, global CSS overrides
|
|-- src/lib/                          # Shared pure logic (Layers 0-1)
|   |                                 # NO React, NO Node.js APIs, NO browser APIs
|   |                                 # Runs in: browser, Node.js, Web Worker
|   |
|   |-- types/                        # Layer 0: Type definitions only
|   |   |-- player.ts                # PlayerCard, PitcherAttributes, PlayerArchetype, Position
|   |   |-- game.ts                  # GameState, TeamState, BaseState, GameResult, BoxScore
|   |   |-- outcome.ts              # OutcomeCategory, OutcomeTableEntry, PlayByPlayEntry
|   |   |-- league.ts               # League, Team, Division, PlayoffRules
|   |   |-- draft.ts                # DraftState, DraftPick, DraftConfig
|   |   |-- stats.ts                # BattingStats, PitchingStats
|   |   |-- manager.ts              # ManagerProfile, ManagerStyle, ManagerDecision
|   |   |-- schedule.ts             # ScheduleGame, PlayoffSeries, SeasonSchedule
|   |   |-- api.ts                   # ApiResponse<T>, ApiError, PaginatedResponse<T>
|   |   +-- errors.ts                # AppError, ErrorCategory, ErrorCode, ValidationDetail (REQ-ERR-001)
|   |
|   |-- simulation/                   # Layer 1: Game simulation engine (Section 5)
|   |   |-- engine.ts                # GameEngine.simulate(home, away, seed) -> GameResult
|   |   |-- plate-appearance.ts      # PlateAppearanceResolver: card + IDT + archetype
|   |   |-- outcome-table.ts         # OutcomeTable: 36-row IDT port (REQ-SIM-003)
|   |   |-- outcome-resolver.ts      # Maps OutcomeCategory -> game state changes
|   |   |-- baserunner.ts            # BaserunnerEngine: speed checks (REQ-SIM-006)
|   |   |-- defense.ts              # DefenseEngine: errors, DP (REQ-SIM-008)
|   |   |-- stolen-base.ts          # StolenBaseResolver (REQ-SIM-009)
|   |   |-- pitching.ts             # PitchingManager: fatigue, bullpen (REQ-SIM-010-014)
|   |   |-- manager-ai.ts           # ManagerAI: pre-pitch decisions (REQ-AI-002)
|   |   +-- platoon.ts              # PlatoonAdjuster: L/R card mods (REQ-SIM-004b)
|   |
|   |-- card-generator/              # Layer 1: APBA card generation (Section 4.3)
|   |   |-- generator.ts            # CardGenerator orchestrator (REQ-DATA-005)
|   |   |-- rate-calculator.ts      # Per-player rate computation (Step 1)
|   |   |-- value-mapper.ts         # Rate-to-card-value mapping (Step 3)
|   |   |-- power-rating.ts         # ISO -> 7-tier power (Step 4)
|   |   |-- archetype.ts            # Archetype flag assignment (Step 5)
|   |   |-- pitcher-grade.ts        # ERA percentile -> grade 1-15 (REQ-DATA-005a)
|   |   +-- pitcher-card.ts         # Pitcher batting card generation (Step 6)
|   |
|   |-- csv/                         # Layer 1: Lahman CSV parsing (server-side only)
|   |   |-- parser.ts               # PapaParse streaming wrapper (NFR-011)
|   |   |-- people-loader.ts        # People.csv -> playerID-to-name map
|   |   |-- batting-loader.ts       # Batting.csv -> batting records
|   |   |-- pitching-loader.ts      # Pitching.csv -> pitching records
|   |   |-- fielding-loader.ts      # Fielding.csv -> fielding records
|   |   +-- player-pool.ts          # Assemble PlayerPool from loaded data (REQ-DATA-002)
|   |
|   |-- draft/                       # Layer 1: Draft logic (Section 7)
|   |   |-- draft-engine.ts         # Snake draft management (REQ-DFT-001-002)
|   |   |-- ai-drafter.ts           # AI pick logic with value scoring (REQ-DFT-006-007)
|   |   +-- roster-validator.ts     # Validate roster composition (REQ-DFT-008)
|   |
|   |-- schedule/                    # Layer 1: Scheduling (Section 9)
|   |   |-- generator.ts            # Round-robin schedule (REQ-SCH-001-004)
|   |   +-- playoff-bracket.ts      # 2025 MLB playoff format (REQ-LGE-008)
|   |
|   |-- stats/                       # Layer 1: Statistics computation (Section 10)
|   |   |-- accumulator.ts          # Game stats -> season totals (REQ-STS-001)
|   |   |-- derived.ts              # BA, OBP, SLG, ERA, WHIP, etc. (REQ-STS-002)
|   |   +-- leaders.ts              # Qualification + ranking (REQ-STS-003)
|   |
|   |-- managers/                    # Layer 1: Manager personality system (Section 11)
|   |   |-- profiles.ts             # MANAGER_PROFILES constant (REQ-AI-001)
|   |   +-- decision-engine.ts      # score * threshold * multiplier (REQ-AI-002)
|   |
|   |-- rng/                         # Layer 1: Random number generation
|   |   +-- seeded-rng.ts           # SeededRNG class (REQ-NFR-007)
|   |
|   +-- config.ts                    # Client environment config (REQ-ENV-003)
|
|-- supabase/                        # Supabase project configuration
|   |-- config.toml                  # Local development config
|   |-- seed.sql                     # Development seed data (REQ-MIG-007)
|   |-- migrations/                  # Sequential SQL migrations (REQ-DATA-007)
|   |   |-- 00001_create_leagues.sql
|   |   |-- 00002_create_teams.sql
|   |   |-- 00003_create_rosters.sql
|   |   |-- 00004_create_schedule.sql
|   |   |-- 00005_create_season_stats.sql
|   |   |-- 00006_create_game_logs.sql
|   |   |-- 00007_create_archives.sql
|   |   |-- 00008_create_simulation_progress.sql
|   |   |-- 00009_create_indexes.sql     # All indexes from REQ-NFR-015
|   |   |-- 00010_enable_rls.sql         # Enable RLS on all tables
|   |   |-- 00011_create_rls_policies.sql  # RLS policies from REQ-NFR-005
|   |   +-- 00012_add_season_year.sql     # Add season_year to rosters and season_stats (REQ-DATA-002a)
|   +-- tests/                       # pgTAP RLS policy tests (REQ-MIG-009)
|       |-- leagues_rls.test.sql
|       |-- teams_rls.test.sql
|       |-- rosters_rls.test.sql
|       |-- schedule_rls.test.sql
|       |-- season_stats_rls.test.sql
|       +-- game_logs_rls.test.sql
|
|-- tests/                            # All tests (mirrors src/lib structure)
|   |-- unit/
|   |   |-- lib/
|   |   |   |-- simulation/
|   |   |   |   |-- engine.test.ts
|   |   |   |   |-- plate-appearance.test.ts
|   |   |   |   |-- outcome-table.test.ts
|   |   |   |   |-- baserunner.test.ts
|   |   |   |   |-- defense.test.ts
|   |   |   |   |-- stolen-base.test.ts
|   |   |   |   |-- pitching.test.ts
|   |   |   |   |-- manager-ai.test.ts
|   |   |   |   |-- outcome-resolver.test.ts
|   |   |   |   +-- platoon.test.ts
|   |   |   |-- card-generator/
|   |   |   |   |-- generator.test.ts
|   |   |   |   |-- rate-calculator.test.ts
|   |   |   |   |-- value-mapper.test.ts
|   |   |   |   |-- power-rating.test.ts
|   |   |   |   |-- archetype.test.ts
|   |   |   |   |-- pitcher-grade.test.ts
|   |   |   |   +-- pitcher-card.test.ts
|   |   |   |-- csv/
|   |   |   |   +-- parser.test.ts
|   |   |   |-- draft/
|   |   |   |   |-- draft-engine.test.ts
|   |   |   |   +-- ai-drafter.test.ts
|   |   |   |-- schedule/
|   |   |   |   |-- generator.test.ts
|   |   |   |   +-- playoff-bracket.test.ts
|   |   |   |-- stats/
|   |   |   |   |-- accumulator.test.ts
|   |   |   |   +-- derived.test.ts
|   |   |   +-- rng/
|   |   |       +-- seeded-rng.test.ts
|   |   +-- components/
|   |       |-- StatTable.test.tsx
|   |       |-- DiamondField.test.tsx
|   |       +-- TypewriterText.test.tsx
|   |-- integration/
|   |   |-- league-lifecycle.test.ts   # Create -> draft -> simulate -> archive
|   |   |-- draft-flow.test.ts         # Full draft with AI + human picks
|   |   +-- simulation-pipeline.test.ts  # Sim -> stats -> standings
|   |-- e2e/                           # Playwright E2E tests
|   |   |-- splash.spec.ts
|   |   |-- create-league.spec.ts
|   |   |-- draft.spec.ts
|   |   |-- simulate-day.spec.ts
|   |   +-- playoffs.spec.ts
|   |-- fixtures/                      # Test data
|   |   |-- sample-players.json        # Pre-built PlayerCard objects
|   |   |-- sample-cards.json          # Pre-built card arrays
|   |   |-- sample-game-state.json     # Mid-game GameState snapshot
|   |   |-- sample-outcomes.json       # Pre-computed PlateAppearanceResult objects
|   |   +-- mini-lahman/               # Subset of Lahman data (~50 players)
|   |       |-- People.csv
|   |       |-- Batting.csv
|   |       |-- Pitching.csv
|   |       +-- Fielding.csv
|   |-- helpers/                       # Shared test utilities (REQ-SCOPE-001)
|   |   +-- render-with-providers.tsx  # Test render wrapper with store/router providers
|   |-- setup.ts                       # Shared test config (global mocks, custom matchers)
|   +-- TRACEABILITY.md                # REQ-* to test mapping table (REQ-TEST-011)
|
|-- .env.example                      # Environment variable template
|-- .eslintrc.cjs                     # ESLint configuration
|-- .gitignore                        # Git ignore rules
|-- .prettierrc                       # Prettier configuration
|-- index.html                        # Vite entry HTML
|-- package.json                      # Dependencies and scripts
|-- playwright.config.ts              # Playwright E2E configuration
|-- tailwind.config.ts                # TailwindCSS with custom palette (REQ-UI-001)
|-- tsconfig.json                     # TypeScript config with path aliases
|-- tsconfig.node.json                # TS config for Vite/build tooling
|-- vercel.json                       # Vercel deployment config (NFR-021)
|-- vite.config.ts                    # Vite build configuration
+-- vitest.config.ts                  # Vitest unit test configuration
```

### 3.4 Module Architecture & Dependency Rules

**REQ-ARCH-002**: The codebase follows a strict layered architecture. Each layer may only import from layers with a lower number. This prevents circular dependencies, keeps business logic testable in isolation, and ensures the simulation engine can run in any JavaScript runtime (browser, Node.js, Web Worker).

**Layer 0 -- Types** (`src/lib/types/`):
- Pure TypeScript interfaces and type definitions
- No runtime code, no imports from any other layer
- Imported by: every other layer

**Layer 1 -- Pure Logic** (`src/lib/*` except `types/`):
- Self-contained business logic with no side effects and no I/O
- Can import: Layer 0 (types), other Layer 1 modules
- Cannot import: React, Supabase client, `fetch`, `fs`, `window`, `document`
- Must run identically in: browser, Node.js, and Web Worker
- This layer contains the simulation engine, card generator, draft logic, schedule generator, stats computation, manager profiles, and seeded RNG

**Layer 2 -- API Functions** (`api/`):
- Server-side Vercel Serverless Functions that handle HTTP requests
- Can import: Layer 0, Layer 1, `api/_lib/` server utilities
- Cannot import: React, `src/components/`, `src/features/`, `src/stores/`, `src/hooks/`
- Runs in: Node.js (Vercel serverless runtime)

**Layer 3 -- Services** (`src/services/`):
- HTTP client layer that wraps `fetch` calls to `/api` endpoints
- Can import: Layer 0 (types for request/response shapes)
- Cannot import: Layer 1 (pure logic), React, stores, hooks
- Runs in: browser only

**Layer 4 -- Stores** (`src/stores/`):
- Zustand state stores with `persist` middleware (NFR-013)
- Can import: Layer 0, Layer 3 (services for async actions)
- Cannot import: Layer 1, Layer 2, React components, hooks
- Runs in: browser only

**Layer 5 -- Hooks** (`src/hooks/`):
- React hooks that compose store subscriptions and Supabase Realtime
- Can import: Layer 0, Layer 4 (stores)
- Cannot import: Layer 1, Layer 2, Layer 3, components
- Runs in: browser only (React context)

**Layer 6 -- Shared Components** (`src/components/`):
- Reusable UI components, props-driven, no direct data fetching
- Can import: Layer 0 (for prop types), other Layer 6 components
- Cannot import: Layers 1-5 (no business logic, no stores, no services)
- All data comes through props from the feature layer above

**Layer 7 -- Feature Modules** (`src/features/`):
- Page-level modules that compose hooks and components into full pages
- Can import: Layer 0, Layer 5 (hooks), Layer 6 (shared components)
- Cannot import: Layers 1-4 directly, and **never other feature modules**
- Cross-feature communication flows through Layer 4 (stores) via Layer 5 (hooks)

**Layer W -- Workers** (`src/workers/`):
- Web Workers that run pure logic off the main thread
- Can import: Layer 0, Layer 1 (same access as API layer, but runs in browser Worker context)
- Cannot import: React, DOM APIs, stores, hooks, services

**REQ-ARCH-002a**: Dependency direction is always downward (higher layers depend on lower layers, never the reverse). No circular imports are permitted. Violation of these rules indicates an architectural problem that must be resolved by refactoring, not by adding exceptions.

```
Layer 7: Features  --|-- Layer 6: Components
                     |
Layer 5: Hooks  -----|
                     |
Layer 4: Stores -----|
                     |
Layer 3: Services ---|      Layer W: Workers --|
                     |                         |
Layer 2: API --------|                         |
                     |                         |
Layer 1: Pure Logic -|-------------------------|
                     |
Layer 0: Types ------|
```

### 3.5 Import Path Aliases

**REQ-ARCH-003**: Configure TypeScript path aliases in `tsconfig.json` and mirror them in `vite.config.ts` (via `vite-tsconfig-paths` plugin or manual `resolve.alias`). All imports within the project use these aliases instead of relative paths that cross layer boundaries.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@lib/*":        ["src/lib/*"],
      "@components/*": ["src/components/*"],
      "@features/*":   ["src/features/*"],
      "@hooks/*":      ["src/hooks/*"],
      "@stores/*":     ["src/stores/*"],
      "@services/*":   ["src/services/*"],
      "@workers/*":    ["src/workers/*"]
    }
  }
}
```

Usage examples:
```typescript
// In a feature module (Layer 7):
import { useLeague } from '@hooks/useLeague';
import StatTable from '@components/data-display/StatTable';
import type { BattingStats } from '@lib/types/stats';

// In an API function (Layer 2):
import { simulateGame } from '@lib/simulation/engine';
import type { GameResult } from '@lib/types/game';

// In a Web Worker (Layer W):
import { simulateGame } from '@lib/simulation/engine';
import { SeededRNG } from '@lib/rng/seeded-rng';
```

Relative imports are permitted only within the same directory or immediate subdirectories (e.g., a component importing a sibling component in the same feature folder).

### 3.6 File Naming Conventions

**REQ-ARCH-004**: Consistent naming rules across the entire codebase:

| File Type | Convention | Example |
|-----------|-----------|---------|
| React components (`.tsx`) | PascalCase matching the default export | `DraftBoardPage.tsx`, `StatTable.tsx` |
| Non-component TypeScript (`.ts`) | kebab-case | `plate-appearance.ts`, `seeded-rng.ts` |
| Test files | Source file name + `.test` suffix | `plate-appearance.test.ts`, `StatTable.test.tsx` |
| E2E test files | Feature name + `.spec` suffix | `create-league.spec.ts`, `draft.spec.ts` |
| Directories | kebab-case | `card-generator/`, `game-viewer/`, `data-display/` |
| SQL migrations | 5-digit sequential prefix + snake_case | `00001_create_leagues.sql` |
| Environment files | Dot-prefixed lowercase | `.env.example`, `.env.local` |
| Config files | Tool-standard naming | `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts` |

**REQ-ARCH-004a**: Each React component file exports exactly one component as its default export. The filename must match the component name:
```typescript
// File: src/components/data-display/StatTable.tsx
export default function StatTable(props: StatTableProps) { ... }
```

**REQ-ARCH-004b**: Each non-component module exports its public API via named exports. No default exports for non-component files:
```typescript
// File: src/lib/simulation/engine.ts
export function simulateGame(...): GameResult { ... }
export function simulateDay(...): GameResult[] { ... }
```

### 3.7 Module Size & Quality Guidelines

**REQ-ARCH-005**: Code organization constraints to prevent God files and maintain readability:

- **Maximum ~300 lines per file** (soft limit). Exceptions allowed for data tables (e.g., `OutcomeTable` definition) and comprehensive type files. If a module exceeds 300 lines, evaluate whether it can be split by sub-responsibility.
- **One responsibility per file**: Each file exports one class, one set of closely related functions, or one set of related types. Never mix unrelated concerns.
- **No barrel `index.ts` re-exports inside `src/lib/`**: Import directly from the specific file (`@lib/simulation/engine`) rather than through barrel files (`@lib/simulation`). Barrel re-exports obscure dependency chains and complicate tree-shaking. Barrel exports are permitted at feature module boundaries (e.g., `src/features/draft/index.ts` re-exporting `DraftBoardPage`).
- **No circular imports**: If module A imports from module B, module B must not import from module A (directly or transitively). The layered architecture (Section 3.4) prevents most circular dependencies by design. Within a layer, use dependency inversion (pass dependencies as function arguments) if two modules need each other.
- **Colocation of related files**: Feature sub-components live in the same feature directory, not in `src/components/`. Only components used by 2+ features belong in `src/components/`. If a component starts in a feature directory and later becomes shared, move it to `src/components/` at that time. For non-component artifacts (hooks, types, constants, utilities), see Section 22.

---

## 4. Data Layer

### 4.1 Source Data - Lahman MLB Database

**REQ-DATA-001**: Load and parse the following CSV files from `data_files/`:

| File | Key Columns | Purpose |
|------|-------------|---------|
| `People.csv` | playerID, nameFirst, nameLast, birthYear, debut, finalGame, bats, throws | Player identity, handedness |
| `Batting.csv` | playerID, yearID, teamID, G, AB, R, H, 2B, 3B, HR, RBI, SB, CS, BB, SO, IBB, HBP, SH, SF, GIDP | Season batting stats |
| `Pitching.csv` | playerID, yearID, teamID, W, L, G, GS, SV, IPouts, H, ER, HR, BB, SO, ERA, BAOpp, HBP, BK, WP, BFP | Season pitching stats |
| `Fielding.csv` | playerID, yearID, teamID, POS, G, GS, InnOuts, PO, A, E, DP | Position eligibility, fielding stats |

**REQ-DATA-002**: Build a `PlayerPool` from Lahman data at league creation time. Only include player-seasons from the year range selected by the commissioner (default 1901-2025). Every qualifying season for a player is a separate draftable entity (e.g., "Ruth 1921" and "Ruth 1927" are independent picks that represent the same physical player at different points in his career).

**REQ-DATA-002a**: Player-season qualification thresholds:

| Role | Minimum Threshold | Rationale |
|---|---|---|
| Batter | 200 AB in that season | Filters out pitchers who batted (especially pre-2022 NL pitchers with incidental plate appearances). Includes all meaningful position player seasons including platoon and part-time players. |
| Pitcher | 50 IP in that season | Includes starters and relievers. Filters out position players who occasionally pitched in blowouts. A typical reliever throws 50-70 IP per season. |
| Two-way player | Meets EITHER threshold | If a season has >= 200 AB AND >= 50 IP, the card includes both batting and pitching attributes (e.g., Ohtani 2021 with 537 AB and 130.1 IP). |

A single physical player may have many qualifying seasons across their career (one `PlayerCard` per qualifying season). During the draft, all qualifying seasons are visible in the player list. When any season of a player is drafted, **all other seasons of that player are removed from the available pool** (one physical player per league -- see REQ-DFT-001a).

**Pool size estimate**: ~40,000-60,000 qualifying batter-seasons + ~15,000-20,000 qualifying pitcher-seasons across the full 1901-2025 range. Server-side pagination (REQ-NFR-019) is required for the draft UI.

**REQ-DATA-003**: Cache the `playerID -> name` mapping in memory per the UI/UX spec to prevent lag during simulation.

### 4.2 PlayerCard - Core Data Model (APBA Card System Port)

Faithfully ports APBA's 35-byte card system. Instead of hand-encoded binary cards, the `CardGenerator` builds equivalent 35-element arrays from Lahman statistics using the verified correlation mapping (see REQ-DATA-005).

**REQ-DATA-004**: Generate a `PlayerCard` for every player in the pool:

```typescript
/**
 * Card values 0-42 map to outcome categories.
 * Derived from APBA BBW correlation analysis (460 qualified batters, r values):
 *
 *   Value 13 = Walk (r=+0.978)        Value 14 = Strikeout (r=+0.959)
 *   Value 1  = Home Run (r=+0.715)    Value 5/37/41 = HR variants (r~+0.30)
 *   Value 7  = Single A (r=+0.680)    Value 8 = Single B (r=+0.565)
 *   Value 9  = Single C (r=+0.424)    Value 0 = Double (r=+0.519)
 *   Value 10 = Triple A (r=+0.199)    Value 11 = Triple B (r=+0.227)
 *   Value 21 = Stolen base (r=+0.731) Value 23 = Speed flag (r=+0.738)
 *   Value 36 = Running play (r=+0.469)
 *   Values 25-32, 35 = Structural constants (column dividers)
 *   Values 24, 26, 30, 31 = Out types (negative BA/BB correlations)
 *   Value 40 = Hit/special (r=+0.290) Value 22 = Extra-base (r=+0.139)
 */
type CardValue = number; // 0-42

interface PlayerCard {
  // Identity
  playerId: string;          // Lahman playerID (e.g., "ruthba01")
  nameFirst: string;
  nameLast: string;
  seasonYear: number;        // Which season's stats this card represents
  battingHand: 'L' | 'R' | 'S';
  throwingHand: 'L' | 'R';

  // Positional
  primaryPosition: Position;
  eligiblePositions: Position[];
  isPitcher: boolean;

  // === THE CARD (faithful APBA port) ===
  // 35-element array, each value 0-42, encoding outcome probability distribution.
  // 9 positions are structural constants (positions 1,3,6,11,13,18,23,25,32).
  // ~26 positions vary per player, encoding their performance profile.
  card: CardValue[];          // length = 35

  // Position 24: Extra-base power rating (7-tier scale from APBA)
  // Values: 13=none, 15=minimal, 16=below avg, 17=avg, 18=above avg, 19=good, 20=very good, 21=excellent
  powerRating: number;

  // Bytes 33-34: Player archetype flags (from APBA card analysis)
  archetype: PlayerArchetype;

  // Batting modifiers (used for baserunning, fielding, and secondary checks)
  speed: number;              // 0.0-1.0; from SB/(SB+CS) and SB rate
  power: number;              // ISO = SLG - BA (used for extra-base advancement)
  discipline: number;         // BB/K ratio, 0.0-1.0 scaled
  contactRate: number;        // 1 - (SO/PA), 0.0-1.0

  // Defensive ratings (0.0-1.0 scale)
  fieldingPct: number;        // From Fielding.csv
  range: number;              // Estimated from (PO+A)/InnOuts relative to position avg
  arm: number;                // Position-dependent estimate

  // Pitching attributes (only for isPitcher = true)
  pitching?: PitcherAttributes;
}

// Archetype flags derived from APBA card bytes 33-34 pair analysis
interface PlayerArchetype {
  byte33: number;            // 0-8
  byte34: number;            // 0-6
  // Decoded meaning:
  // (7,0) = Standard RH position player
  // (0,1) = Standard LH/switch position player
  // (6,0) = Speed/baserunning specialist
  // (1,0) = Power hitter
  // (1,1) = Power + platoon advantage
  // (0,2) = Contact hitter with SB threat
  // (0,6) = Pitcher (as batter)
  // (8,0) = Elite defensive player
  // (5,0) = Utility/pinch hit specialist
}

interface PitcherAttributes {
  role: 'SP' | 'RP' | 'CL';
  // APBA pitcher grade: 1-15 scale. Higher = more effective.
  // Derived from ERA rank within the league for that season.
  // Grade 15 = ace (top 5% ERA), Grade 1 = worst qualifier.
  // The grade acts as a gating modifier on the batter's card lookup:
  // higher grades shift outcomes toward outs, lower grades toward hits.
  grade: number;              // 1-15

  stamina: number;            // Average IP per start, or relief innings capacity
  era: number;                // Raw ERA from Lahman stats
  whip: number;               // (BB + H) / IP
  k9: number;                 // SO * 9 / IP
  bb9: number;                // BB * 9 / IP
  hr9: number;                // HR * 9 / IP

  // Y/Z/W/X usage flags (from APBA position string)
  // Y = can start, Z = can go deep, W = short relief, X = setup
  usageFlags: string[];

  // Whether this pitcher is marked as a reliever (* flag in APBA)
  isReliever: boolean;
}

type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH'
              | 'SP' | 'RP' | 'CL';
```

### 4.3 Card Generation Algorithm (REQ-DATA-005)

The `CardGenerator` converts Lahman batting/pitching statistics into APBA-style 35-byte cards. This is the critical bridge between real MLB data and the simulation engine.

**REQ-DATA-005**: Card generation from Lahman stats:

**Step 1 - Compute per-player rates from Lahman data:**
```
PA = AB + BB + HBP + SH + SF
walkRate     = BB / PA
strikeoutRate = SO / PA
homeRunRate  = HR / PA
singleRate   = (H - 2B - 3B - HR) / PA
doubleRate   = 2B / PA
tripleRate   = 3B / PA
sbRate       = SB / (SB + CS)  (or 0 if no attempts)
iso          = SLG - BA        (isolated power)
```

**Step 2 - Assign structural constants to the 9 fixed positions:**
```
card[1]  = 30   // Structural
card[3]  = 28   // Structural
card[6]  = 27   // Structural
card[11] = 26   // Structural
card[13] = 31   // Structural
card[18] = 29   // Structural
card[23] = 25   // Structural
card[25] = 32   // Structural
card[32] = 35   // Sentinel/delimiter (always 35)
```

**Step 3 - Fill the ~26 variable positions using rate-to-value mapping:**

For each variable card position, assign a value based on the player's statistical profile. The mapping uses the correlation table to ensure the card produces realistic outcome distributions:

| Player Rate | Card Value Assigned | Positions Used |
|-------------|-------------------|----------------|
| `walkRate` | 13 (r=+0.978) | Distribute across multiple positions proportional to BB/PA |
| `strikeoutRate` | 14 (r=+0.959) | Distribute proportional to SO/PA |
| `homeRunRate` | 1 (r=+0.715), with 5/37/41 for overflow | Scale HR/PA to count of value-1 slots |
| `singleRate` | 7, 8, 9 (r=+0.68/0.57/0.42) | Distribute hits: best contact = more 7s, moderate = 8s, weak = 9s |
| `doubleRate` | 0 (r=+0.519) | Count of value-0 positions proportional to 2B rate |
| `tripleRate` | 10, 11 (r=+0.20/0.23) | Rare; 0-1 positions for most players |
| `sbRate` | 21, 23, 36 (r=+0.73/0.74/0.47) | Speed players get these values at specific positions |
| Remaining | 24, 26, 30, 31 (out types) | Fill remaining variable positions with out values |

**Step 4 - Assign power rating at position 24:**

Map ISO (isolated power) to the APBA 7-tier power scale:

| ISO Range | Card[24] Value | Tier |
|-----------|---------------|------|
| < 0.050 | 13 | No power (pitchers, slap hitters) |
| 0.050 - 0.079 | 15 | Minimal power |
| 0.080 - 0.109 | 16 | Below average |
| 0.110 - 0.149 | 17 | Average power |
| 0.150 - 0.189 | 18 | Above average |
| 0.190 - 0.229 | 19 | Good power |
| 0.230 - 0.279 | 20 | Very good (20+ HR pace) |
| >= 0.280 | 21 | Excellent power |

**Step 5 - Assign archetype flags (bytes 33-34):**

| Condition | byte33 | byte34 | Archetype |
|-----------|--------|--------|-----------|
| RH batter, no special traits | 7 | 0 | Standard RH |
| LH or switch batter, no special traits | 0 | 1 | Standard LH/Switch |
| SB >= 20 or sbRate >= 0.75 | 6 | 0 | Speed specialist |
| HR >= 25 or ISO >= 0.230 | 1 | 0 | Power hitter |
| Power + LH/switch | 1 | 1 | Power + platoon |
| BA >= 0.280 and SB >= 10 | 0 | 2 | Contact + speed |
| Pitcher (as batter) | 0 | 6 | Pitcher |
| Fielding top 10% at position | 8 | 0 | Elite defense |
| Multi-position, BA < 0.250 | 5 | 0 | Utility/pinch hit |

**Step 6 - Generate pitcher cards (for pitchers as batters):**

Pitchers' batting cards are flooded with value 13 (walk). In APBA, Mike Cuellar has 16 of 35 positions set to 13. For pitcher batters:
- Fill 14-18 of 26 variable positions with value 13
- Fill 3-5 positions with value 14 (strikeout)
- Fill remaining with out types (24, 26, 30, 31)
- Power rating at position 24 = 13 (no power)

**REQ-DATA-005a**: Pitcher grade calculation:

Rank all pitchers in the selected year range by ERA (minimum 50 IP per season per REQ-DATA-002a). Map to the 1-15 scale:

| ERA Percentile | Grade | Description |
|---------------|-------|-------------|
| Top 3% | 15 | Ace (e.g., Bob Gibson 1.12 ERA) |
| Top 7% | 14 | Elite starter |
| Top 12% | 13 | #1 starter |
| Top 20% | 12 | Strong starter |
| Top 30% | 11 | Above average |
| Top 40% | 10 | Solid starter |
| Top 50% | 9 | Average starter |
| Top 60% | 8 | Below average starter |
| Top 70% | 7 | Back-end starter |
| Top 80% | 6 | Spot starter/long relief |
| Top 87% | 5 | Middle reliever |
| Top 93% | 4 | Low-leverage relief |
| Top 97% | 3 | Mop-up duty |
| Top 99% | 2 | Emergency only |
| Bottom 1% | 1 | Worst qualifier |

**REQ-DATA-006**: For the year range the league uses, compute league averages for normalization (league avg BA, HR/PA, BB/PA, SO/PA, ERA, K/9, BB/9, ISO, BABIP). These averages are used during card generation to calibrate outcome distributions relative to the era.

### 4.3 Supabase PostgreSQL Schema

**REQ-DATA-007**: Database schema (relational, with Row Level Security):

```sql
-- Leagues
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  commissioner_id UUID REFERENCES auth.users(id),
  invite_key TEXT NOT NULL UNIQUE,  -- 12-char crypto hash
  team_count INT NOT NULL CHECK (team_count % 2 = 0 AND team_count <= 32),
  year_range_start INT NOT NULL DEFAULT 1901,
  year_range_end INT NOT NULL DEFAULT 2025,
  injuries_enabled BOOLEAN DEFAULT false,
  playoff_rules JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup', 'drafting', 'regular_season', 'playoffs', 'completed')),
  current_day INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),  -- NULL = CPU-controlled
  manager_profile TEXT NOT NULL DEFAULT 'balanced'
    CHECK (manager_profile IN ('conservative', 'aggressive', 'balanced', 'analytical')),
  league_division TEXT NOT NULL CHECK (league_division IN ('AL', 'NL')),
  division TEXT NOT NULL CHECK (division IN ('East', 'South', 'West', 'North')),
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  runs_scored INT DEFAULT 0,
  runs_allowed INT DEFAULT 0
);

-- Rosters (player cards assigned to teams)
CREATE TABLE rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,       -- Lahman playerID (e.g., "ruthba01")
  season_year INT NOT NULL,      -- Which season was drafted (e.g., 1921)
  player_card JSONB NOT NULL,    -- Full PlayerCard object for that season (includes 35-element card array, archetype, powerRating)
  roster_slot TEXT NOT NULL CHECK (roster_slot IN ('starter', 'bench', 'rotation', 'bullpen', 'closer')),
  lineup_order INT CHECK (lineup_order BETWEEN 1 AND 9),
  lineup_position TEXT,
  UNIQUE(team_id, player_id)     -- One physical player per team (any season, per REQ-DFT-001a)
);

-- Schedule
CREATE TABLE schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INT,
  away_score INT,
  is_complete BOOLEAN DEFAULT false,
  game_log_id UUID  -- reference to game_logs after simulation
);

-- Season Stats
CREATE TABLE season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  season_year INT NOT NULL,      -- Which season's card is being used (e.g., 1921)
  team_id UUID REFERENCES teams(id),
  batting_stats JSONB,           -- BattingStats object (simulated season stats, not Lahman source stats)
  pitching_stats JSONB,          -- PitchingStats object (nullable for position players)
  UNIQUE(league_id, player_id)   -- One physical player per league (any season, per REQ-DFT-001a)
);

-- Game Logs
CREATE TABLE game_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  box_score JSONB NOT NULL,      -- BoxScore object
  play_by_play JSONB NOT NULL,   -- PlayByPlayEntry[]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Season Archives
CREATE TABLE archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  season_number INT NOT NULL,
  standings JSONB NOT NULL,
  playoff_results JSONB,
  champion TEXT,
  league_leaders JSONB,
  stats_storage_path TEXT,  -- Supabase Storage path for full stat JSON blob
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Simulation Progress (for real-time progress tracking)
CREATE TABLE simulation_progress (
  league_id UUID PRIMARY KEY REFERENCES leagues(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'running', 'completed', 'error')),
  total_games INT DEFAULT 0,
  completed_games INT DEFAULT 0,
  current_day INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  error_message TEXT
);

-- Indexes for performance (REQ-NFR-015)
CREATE INDEX idx_teams_league ON teams(league_id);
CREATE INDEX idx_teams_standings ON teams(league_id, league_division, division, wins DESC);
CREATE INDEX idx_rosters_team ON rosters(team_id);
CREATE INDEX idx_schedule_league_day ON schedule(league_id, day_number);
CREATE INDEX idx_season_stats_league ON season_stats(league_id);
CREATE INDEX idx_game_logs_league_day ON game_logs(league_id, day_number);

-- Row Level Security (REQ-NFR-005)
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can read any league they belong to
-- (via team ownership or commissioner role)
CREATE POLICY "Users can view their leagues" ON leagues
  FOR SELECT USING (
    commissioner_id = auth.uid() OR
    id IN (SELECT league_id FROM teams WHERE owner_id = auth.uid())
  );

-- Commissioner can modify their league
CREATE POLICY "Commissioners can modify their leagues" ON leagues
  FOR ALL USING (commissioner_id = auth.uid());
```

### 4.4 Statistics Models

**REQ-DATA-008**: Batting statistics to track (mirrors MLB):

```typescript
interface BattingStats {
  G: number; AB: number; R: number; H: number;
  doubles: number; triples: number; HR: number; RBI: number;
  SB: number; CS: number; BB: number; SO: number;
  IBB: number; HBP: number; SH: number; SF: number; GIDP: number;
  // Derived (computed, not stored)
  BA: number;    // H / AB
  OBP: number;   // (H + BB + HBP) / (AB + BB + HBP + SF)
  SLG: number;   // TB / AB
  OPS: number;   // OBP + SLG
}
```

**REQ-DATA-009**: Pitching statistics to track:

```typescript
interface PitchingStats {
  G: number; GS: number; W: number; L: number; SV: number;
  IP: number;     // Stored as decimal (e.g., 6.2 = 6 and 2/3)
  H: number; R: number; ER: number; HR: number;
  BB: number; SO: number; HBP: number;
  BF: number;     // Batters faced
  WP: number; BK: number;
  CG: number; SHO: number; HLD: number; BS: number;
  // Derived
  ERA: number;    // ER * 9 / IP
  WHIP: number;   // (BB + H) / IP
}
```

---

## 5. Game Simulation Engine

This is the heart of the application. Faithfully ports APBA Baseball for Windows 3.0's card-based plate appearance resolution, IDT decision table, pitcher grade gating, and archetype modifiers. The engine uses the same multi-step lookup approach as APBA but feeds it with cards generated from Lahman data.

### 5.1 Game State Machine

**REQ-SIM-001**: Each game follows this state machine:

```
PREGAME -> INNING_TOP -> PLATE_APPEARANCE -> {OUTCOME} ->
  [loop until 3 outs] -> INNING_BOTTOM -> PLATE_APPEARANCE -> {OUTCOME} ->
  [loop until 3 outs] -> [advance inning] ->
  [loop until 9+ innings complete with a leader] -> POSTGAME
```

**REQ-SIM-002**: Game state object:

```typescript
interface GameState {
  homeTeam: TeamState;
  awayTeam: TeamState;
  inning: number;            // 1-based
  halfInning: 'top' | 'bottom';
  outs: number;              // 0, 1, 2
  bases: BaseState;          // runners on 1st, 2nd, 3rd (null or PlayerId)
  homeScore: number;
  awayScore: number;
  isComplete: boolean;
  playByPlay: PlayByPlayEntry[];
  currentBatterIndex: number;  // 0-8 in batting order
  pitcherFatigue: number;      // Innings pitched this game
  baseSituation: number;       // 0-7 encoding (APBA _BASESITUATION: empty thru loaded)
  consecutiveHitsWalks: number; // Track for starter removal triggers
}

interface BaseState {
  first: string | null;   // playerId or null
  second: string | null;
  third: string | null;
}

interface TeamState {
  teamId: string;
  lineup: LineupSlot[];     // 9 batting order slots
  currentPitcher: PlayerCard;
  bullpen: PlayerCard[];
  closer: PlayerCard | null;
  benchPlayers: PlayerCard[];
  pitcherStats: GamePitcherStats;  // IP, H, R, ER, BB, SO for current game
  pitchersUsed: PlayerCard[];      // Track all pitchers used (for W/L/SV decisions)
}
```

### 5.2 The Outcome Table (IDT Port)

**REQ-SIM-003**: Port APBA's IDT.OBJ decision table as a TypeScript `OutcomeTable`. The original IDT.OBJ is a 36-entry x 4-column matrix (144 bytes). Each row defines a weighted outcome mapping:

```typescript
interface OutcomeTableEntry {
  frequencyWeight: number;  // Column 0: 1-5, how often this row is selected
  thresholdLow: number;     // Column 1: minimum card value for this outcome
  thresholdHigh: number;    // Column 2: maximum card value for this outcome
  outcomeIndex: number;     // Column 3: maps to an OutcomeCategory
}

// The 36-row table (ported from APBA IDT.OBJ):
const OUTCOME_TABLE: OutcomeTableEntry[] = [
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 10, outcomeIndex: 15 },
  { frequencyWeight: 4, thresholdLow: 13, thresholdHigh: 25, outcomeIndex: 25 },
  { frequencyWeight: 2, thresholdLow: 5,  thresholdHigh: 10, outcomeIndex: 38 },
  { frequencyWeight: 3, thresholdLow: 8,  thresholdHigh: 12, outcomeIndex: 17 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 11, outcomeIndex: 16 },
  { frequencyWeight: 2, thresholdLow: 7,  thresholdHigh: 13, outcomeIndex: 28 },
  { frequencyWeight: 3, thresholdLow: 6,  thresholdHigh: 14, outcomeIndex: 37 },
  { frequencyWeight: 1, thresholdLow: 8,  thresholdHigh: 22, outcomeIndex: 21 },
  { frequencyWeight: 2, thresholdLow: 6,  thresholdHigh: 13, outcomeIndex: 31 },
  { frequencyWeight: 4, thresholdLow: 9,  thresholdHigh: 10, outcomeIndex: 23 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 12, outcomeIndex: 17 },
  { frequencyWeight: 3, thresholdLow: 12, thresholdHigh: 11, outcomeIndex: 18 },
  { frequencyWeight: 1, thresholdLow: 6,  thresholdHigh: 13, outcomeIndex: 30 },
  { frequencyWeight: 2, thresholdLow: 7,  thresholdHigh: 11, outcomeIndex: 23 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 14, outcomeIndex: 18 },
  { frequencyWeight: 3, thresholdLow: 6,  thresholdHigh: 10, outcomeIndex: 27 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 15, outcomeIndex: 39 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 10, outcomeIndex: 34 },
  { frequencyWeight: 5, thresholdLow: 15, thresholdHigh: 24, outcomeIndex: 40 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 16, outcomeIndex: 20 },
  { frequencyWeight: 2, thresholdLow: 7,  thresholdHigh: 12, outcomeIndex: 29 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 17, outcomeIndex: 19 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 23, outcomeIndex: 22 },
  { frequencyWeight: 4, thresholdLow: 10, thresholdHigh: 11, outcomeIndex: 24 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 18, outcomeIndex: 36 },
  { frequencyWeight: 3, thresholdLow: 8,  thresholdHigh: 11, outcomeIndex: 32 },
  { frequencyWeight: 2, thresholdLow: 6,  thresholdHigh: 21, outcomeIndex: 22 },
  { frequencyWeight: 3, thresholdLow: 9,  thresholdHigh: 12, outcomeIndex: 16 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 19, outcomeIndex: 20 },
  { frequencyWeight: 4, thresholdLow: 11, thresholdHigh: 13, outcomeIndex: 33 },
  { frequencyWeight: 1, thresholdLow: 7,  thresholdHigh: 20, outcomeIndex: 24 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 10, outcomeIndex: 21 },
  { frequencyWeight: 2, thresholdLow: 6,  thresholdHigh: 12, outcomeIndex: 26 },
  { frequencyWeight: 1, thresholdLow: 5,  thresholdHigh: 11, outcomeIndex: 19 },
  { frequencyWeight: 5, thresholdLow: 14, thresholdHigh: 14, outcomeIndex: 35 },
];
```

**REQ-SIM-003a**: Outcome index to game outcome mapping:

```typescript
// Map outcomeIndex values (15-40) to concrete game outcomes
enum OutcomeCategory {
  // Hits
  SINGLE_CLEAN = 15,       // Single, no advancement risk
  SINGLE_ADVANCE = 16,     // Single, runners can take extra base
  DOUBLE = 17,             // Double
  TRIPLE = 18,             // Triple
  HOME_RUN = 19,           // Home run
  HOME_RUN_VARIANT = 20,   // Home run (different commentary trigger)

  // Outs
  GROUND_OUT = 21,         // Ground ball out
  FLY_OUT = 22,            // Fly ball out
  POP_OUT = 23,            // Pop out (infield)
  LINE_OUT = 24,           // Line drive out
  STRIKEOUT_LOOKING = 25,  // Called strike three
  STRIKEOUT_SWINGING = 26, // Swinging strike three

  // Walks / HBP
  WALK = 27,               // Base on balls
  WALK_INTENTIONAL = 28,   // Intentional walk (via manager decision)
  HIT_BY_PITCH = 29,       // Hit by pitch

  // Special plays
  GROUND_OUT_ADVANCE = 30, // Ground out, runners advance
  SACRIFICE = 31,          // Sacrifice bunt/fly
  DOUBLE_PLAY = 32,        // Ground into double play
  DOUBLE_PLAY_LINE = 33,   // Line drive double play
  REACHED_ON_ERROR = 34,   // Error by fielder
  FIELDERS_CHOICE = 35,    // Fielder's choice

  // Rare events
  STOLEN_BASE_OPP = 36,    // Triggers stolen base check
  WILD_PITCH = 37,         // Wild pitch, runners advance
  BALK = 38,               // Balk, runners advance
  PASSED_BALL = 39,        // Passed ball
  SPECIAL_EVENT = 40,      // Injury, ejection, or other rare event
}
```

### 5.3 Plate Appearance Resolution (Card + IDT Lookup)

**REQ-SIM-004**: Each plate appearance resolves using the APBA multi-step card lookup:

```
1. Get current batter's PlayerCard (including 35-element card array)
2. Get current pitcher's PitcherAttributes (including grade 1-15)
3. Check for AI manager pre-pitch decisions (see Section 11):
   - Intentional walk? -> resolve immediately, skip card lookup
   - Bunt signal? -> use modified resolution (see REQ-SIM-004c)
   - Hit-and-run? -> runner will go, modify out outcomes
   - Steal attempt? -> resolve separately (see REQ-SIM-009)
   - Pitching change? -> swap pitcher, then continue

4. CARD LOOKUP (faithful APBA port):
   a. Generate random integer R1 in [0, 34] -> select card position
   b. Read cardValue = batter.card[R1]
   c. Skip structural constants: if cardValue is in {25,26,27,28,29,30,31,32,35},
      re-roll R1 until a non-structural value is obtained
   d. Apply pitcher grade gate:
      - Generate random integer R2 in [1, 15]
      - If R2 <= pitcher.grade: pitcher "wins" the matchup
        -> Shift cardValue toward out: if cardValue is a hit type (0,1,5,7,8,9,10,11,37,40,41),
           there is a (pitcher.grade / 15) probability it becomes an out instead
        -> The out type is determined by the OutcomeTable lookup
      - If R2 > pitcher.grade: batter's card value stands as-is

5. OUTCOME TABLE LOOKUP (IDT port):
   a. Select an OutcomeTable row using weighted random selection
      (rows with higher frequencyWeight are selected more often)
   b. Check if cardValue falls within [thresholdLow, thresholdHigh]
   c. If yes: the outcomeIndex determines the play result
   d. If no: re-select a different row (up to 3 attempts), then fall back
      to direct card value mapping (see REQ-SIM-004a)

6. ARCHETYPE MODIFIER:
   - If batter.archetype is (1,0) or (1,1) [power]: +15% HR probability on HR outcomes
   - If batter.archetype is (6,0) [speed]: stolen base check on any single/walk
   - If batter.archetype is (8,0) [elite defense]: no batting modifier
   - If batter.archetype is (0,2) [contact+speed]: -20% strikeout probability

7. Resolve the determined OutcomeCategory:
   - Advance baserunners (see REQ-SIM-006)
   - Check for errors on batted-ball outs (see REQ-SIM-008)
   - Update game state (score, outs, bases, stats)
   - Generate play-by-play entry
```

**REQ-SIM-004a**: Direct card value to outcome fallback mapping (when OutcomeTable lookup fails):

| Card Value | Direct Outcome |
|-----------|----------------|
| 0 | DOUBLE |
| 1 | HOME_RUN |
| 5 | HOME_RUN_VARIANT |
| 7 | SINGLE_CLEAN |
| 8 | SINGLE_CLEAN |
| 9 | SINGLE_ADVANCE |
| 10 | TRIPLE |
| 11 | TRIPLE |
| 13 | WALK |
| 14 | STRIKEOUT_SWINGING |
| 21 | STOLEN_BASE_OPP |
| 22 | FLY_OUT |
| 23 | STOLEN_BASE_OPP |
| 24 | LINE_OUT |
| 26 | GROUND_OUT |
| 30 | GROUND_OUT_ADVANCE |
| 31 | FLY_OUT |
| 36 | STOLEN_BASE_OPP |
| 37 | HOME_RUN_VARIANT |
| 40 | REACHED_ON_ERROR |
| 41 | HOME_RUN_VARIANT |
| 42 | SPECIAL_EVENT |

**REQ-SIM-004b**: Platoon adjustment (from APBA's L/R handling):
- Applied BEFORE the card lookup by temporarily modifying the card:
- Opposite-hand matchup (LHB vs RHP, RHB vs LHP): Replace 1 out-value position (24/26/30/31) with a hit value (8), and replace 1 strikeout position (14) with a contact value (9)
- Same-hand matchup: No modification
- Switch hitter: Always gets opposite-hand advantage

**REQ-SIM-004c**: Bunt resolution (when manager signals bunt):
- Skip the normal card lookup entirely
- Generate random float [0,1)
- If < 0.65: Sacrifice successful (batter out, runners advance)
- If < 0.80: Bunt foul (strike, then resume normal PA if < 2 strikes; else strikeout)
- If < 0.90: Bunt for hit attempt: check batter.speed; if speed > 0.6 and random < 0.35, batter reaches; else out
- If < 1.00: Bunt pop-up (out, no advancement)

### 5.4 Outcome Effects

**REQ-SIM-005**: Outcome categories and their effects on game state:

| Outcome | Batter Result | Runner Advancement |
|---------|--------------|-------------------|
| Single (clean) | Batter to 1B | Runner on 2B/3B scores; Runner on 1B to 2B |
| Single (advance) | Batter to 1B | Runner on 1B -> 2B or 3B (speed check); Runner on 2B/3B scores |
| Double | Batter to 2B | All runners advance 2 bases (1B runner -> 3B or scores on speed check) |
| Triple | Batter to 3B | All runners score |
| Home Run | Batter scores | All runners score |
| Walk/HBP | Batter to 1B | Runners advance only if forced |
| Strikeout | Out recorded | No advancement (unless wild pitch/passed ball, see special events) |
| Ground Out | Out recorded | Runners may advance 1 base (speed check); Runner on 3B may score if < 2 outs |
| Ground Out (advance) | Out recorded | All runners guaranteed to advance 1 base; Runner on 3B scores |
| Fly Out | Out recorded | Runner on 3B scores if < 2 outs (sacrifice fly); Others hold |
| Line Out | Out recorded | No advancement; possible DP if runner going on hit-and-run |
| Pop Out | Out recorded | No advancement |
| Double Play | 2 outs recorded | Lead runner + batter out (only with runner on base and < 2 outs, else treat as ground out) |
| DP (line) | 2 outs recorded | Batter + runner nearest to home (only with runner on base and < 2 outs) |
| Sacrifice | Out recorded | All runners advance 1 base |
| Reached on Error | Batter to 1B | All runners advance 1 base |
| Fielder's Choice | Batter to 1B | Lead runner out (net: same outs, different baserunners) |
| Stolen Base Opp | No PA result | Triggers stolen base attempt (see REQ-SIM-009) |
| Wild Pitch | No PA result | All runners advance 1 base; count as ball in pitch sequence |
| Balk | No PA result | All runners advance 1 base |
| Passed Ball | No PA result | Runner on 3B scores; others advance 1 base |

### 5.5 Baserunner Engine

**REQ-SIM-006**: Baserunner speed checks (faithful to APBA's speed rating system):
- When a speed check is required (e.g., runner on 1B on single, can they reach 3B?):
  - Generate random float [0,1)
  - If random < runner's `speed` rating: runner takes extra base
  - Else: runner stops at next base
- Speed check modifiers:
  - If runner archetype is (6,0) [speed specialist]: +0.15 bonus to speed check
  - If outfielder's `arm` rating > 0.8: -0.10 penalty to speed check
  - If 2 outs: runner is more aggressive (+0.10 bonus)

**REQ-SIM-007**: Runner advancement priorities (resolve in order):
1. Score runners on 3B first (check tag-up on fly outs with < 2 outs)
2. Advance runners on 2B (score on singles/doubles, advance on groundouts)
3. Advance runners on 1B (advance on hits, force on walks, DP candidate on ground balls)
4. Place batter on appropriate base

### 5.6 Defense Engine

**REQ-SIM-008**: Error resolution (applied to batted-ball out outcomes):
- On any ground out, fly out, line out, or pop out:
  - Identify the fielder responsible (position-based: ground balls -> SS/2B/3B/1B; fly balls -> OF; pop outs -> C/1B/IF)
  - Probability of error = `1.0 - defender's fieldingPct`
  - If error occurs: batter reaches base, runners advance 1 extra base
  - Record error to fielder's stats

**REQ-SIM-008a**: Double play defense requirements:
- DP (ground) requires runners on base with < 2 outs AND middle infield fieldingPct check
  - If SS/2B combined fieldingPct < 0.95: 10% chance DP fails (only lead runner out)
- DP (line) always succeeds if conditions met (runner on, < 2 outs)

### 5.7 Stolen Base Resolution

**REQ-SIM-009**: Stolen base attempts:
- Triggered by manager AI decision (see REQ-AI-003) OR by STOLEN_BASE_OPP outcome
- Only with runner on 1B or 2B, and < 2 outs
- Resolution:
  - Base success probability = runner's `speed` * 0.75
  - Archetype (6,0) bonus: +0.15
  - Catcher `arm` rating penalty: -(catcher.arm * 0.20)
  - If random < adjusted probability: Stolen base successful
  - Else: Caught stealing (runner is out)

### 5.8 Pitching Management

**REQ-SIM-010**: Pitcher grade fatigue degradation:
- Track innings pitched in current game
- Starting pitcher's effective grade degrades as they tire:
  - Innings 1 through `stamina`: Full grade (as rated)
  - Each inning beyond stamina: Effective grade decreases by 2 (minimum 1)
  - Example: Grade 14 pitcher with stamina 7, in inning 9: effective grade = 14 - (2 * 2) = 10
- This grade degradation directly affects the pitcher gate check in REQ-SIM-004 step 4d

**REQ-SIM-011**: Starter removal triggers (any one of these):
- Pitcher's effective grade has dropped to 50% or less of starting grade
- Pitcher has allowed 4+ earned runs AND pitched 4+ innings
- Pitcher has allowed 3 consecutive hits/walks in an inning after the 5th
- Pitcher is losing by 5+ runs after the 6th inning

**REQ-SIM-012**: Relief pitcher management:
- When starter is pulled, select best available reliever from bullpen
- Relief pitchers have their own stamina (typically 1-3 innings)
- Relief pitchers also fatigue: effective grade drops by 3 per inning beyond stamina
- Relief pitchers can also be pulled using the same fatigue triggers

**REQ-SIM-013**: Closer usage (per MLB save opportunity rules):
- Closer enters when:
  - Team is winning by 3 or fewer runs in the 9th inning (or later)
  - AND there are no more than 2 runners on base from previous pitcher
- Exception: Do NOT pull a starting pitcher who has a shutout or no-hitter in progress, regardless of inning or fatigue

**REQ-SIM-014**: Starting pitcher rotation:
- 4 starters rotate sequentially: SP1 -> SP2 -> SP3 -> SP4 -> SP1 -> ...
- Track which starter is "up next" in team state

### 5.9 Extra Innings

**REQ-SIM-015**: If the game is tied after 9 innings:
- Continue playing full extra innings (no ghost runners per project spec)
- No inning limit; play until a winner is determined
- Bullpen management continues normally through extras

### 5.10 Game Output

**REQ-SIM-016**: Each completed game produces:

```typescript
interface GameResult {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  innings: number;            // 9 or more
  winningPitcherId: string;
  losingPitcherId: string;
  savePitcherId: string | null;
  boxScore: BoxScore;
  playerBattingLines: BattingLine[];   // Per-player game stats
  playerPitchingLines: PitchingLine[]; // Per-pitcher game stats
  playByPlay: PlayByPlayEntry[];
}

interface BoxScore {
  lineScore: { away: number[]; home: number[] };  // Runs per inning
  awayHits: number; homeHits: number;
  awayErrors: number; homeErrors: number;
}

interface PlayByPlayEntry {
  inning: number;
  halfInning: 'top' | 'bottom';
  outs: number;
  batterId: string;
  pitcherId: string;
  cardPosition: number;        // Which card position was selected (0-34)
  cardValue: number;           // The value at that position
  outcomeTableRow: number;     // Which IDT row was used
  outcome: OutcomeCategory;    // Final resolved outcome
  description: string;         // Human-readable text
  basesAfter: BaseState;
  scoreAfter: { home: number; away: number };
}
```

---

## 6. League Management

### 6.1 League Creation

**REQ-LGE-001**: League creation form collects:
- League name (required, 3-50 chars)
- Number of teams (required, even number, 4-32)
- Playoff rules (per REQ-LGE-008)
- Injuries enabled (boolean toggle)
- Year range for player pool (default 1901-2025, both inclusive)

**REQ-LGE-002**: The creating user becomes the commissioner.

**REQ-LGE-003**: Generate a 12-character cryptographic invite key (alphanumeric, case-sensitive). Display it in a "Secret Telegram" themed UI.

**REQ-LGE-004**: Auto-generate team names:
- Use real US cities (randomly selected without replacement)
- Use randomized fictional mascot names (e.g., "Austin Armadillos", "Portland Pines")
- Teams can be renamed by their owner later

**REQ-LGE-005**: Divide teams evenly into AL and NL. Within each league, divide into 4 divisions (East, South, West, North). If team count doesn't divide evenly by 8, distribute as evenly as possible (e.g., 12 teams = 6 AL + 6 NL with 3 divisions of 2 each).

### 6.2 Joining a League

**REQ-LGE-006**: A user enters the invite key to join a league. They then select from available (unowned) teams. They can rename their team upon selection.

**REQ-LGE-007**: One user per team maximum. The commissioner can also own their own team AND manage all CPU-controlled teams.

### 6.3 Playoffs

**REQ-LGE-008**: Playoff format follows 2025 MLB rules:
- Top seeds from each division qualify
- Wild card teams fill remaining spots
- Bracket: Wild Card round (best of 3) -> Division Series (best of 5) -> Championship Series (best of 7) -> World Series (best of 7)
- Higher seed has home-field advantage

**REQ-LGE-009**: Playoff games can only be simulated one game at a time (per project spec). Regular season can be simulated in bulk.

### 6.4 League Deletion

**REQ-LGE-010**: Only the commissioner can delete a league. Deletion is permanent and removes all data including archived seasons. Require a confirmation dialog with league name typed to confirm.

---

## 7. Draft System

### 7.1 Draft Format

**REQ-DFT-001**: Snake draft format. Number of rounds = roster size (21 rounds: 8 starters (position players) + 4 bench + 4 SP + 3 RP + 1 CL + 1 DH = 21).

**REQ-DFT-001a**: One physical player per league. When a player-season is drafted (e.g., "Ruth 1921"), ALL other seasons of that player (identified by Lahman `playerID`) are immediately removed from the available pool for the remainder of the draft and the season. If a player is later dropped via REQ-RST-005, all their qualifying seasons become available again. Database enforcement: the existing `UNIQUE(league_id, player_id)` constraint on `season_stats` (Section 4.3) prevents two teams from owning any version of the same physical player. The `player_id` column stores the Lahman playerID (not a player-season composite), preserving this constraint.

**REQ-DFT-002**: Draft order is randomized. In a snake draft, the order reverses each round (Team 1 picks first in round 1, last in round 2, etc.).

**REQ-DFT-003**: Display the draft as a vertical scrolling ticker (per UI/UX spec).

### 7.2 Human Draft Picks

**REQ-DFT-004**: Player-controlled teams get a pick timer (60 seconds default). If timer expires, the AI makes the pick for them using the AI strategy.

**REQ-DFT-005**: Show available players with sortable columns: Name, Position, Year, BA/ERA, HR/W, RBI/SO, OBP/WHIP, SLG/K9. When displaying available players, exclude all seasons of any player whose `playerID` is already on a roster in the league (REQ-DFT-001a). The player list may contain multiple rows for the same physical player (different seasons), each with different stats. Support search by player name and filter by position, year range, and stat thresholds.

### 7.3 AI Draft Strategy

**REQ-DFT-006**: CPU-controlled teams draft using this priority system (from project spec):

**Early rounds (1-3):**
- Best available starting pitcher OR elite position player
- Favor high-ceiling players with strong combined offensive + defensive ratings
- Do not draft closers or bench players

**Mid rounds (4-8):**
- Fill pitching rotation to 4 starters
- Best available position player at premium positions (C, SS, CF)
- Look for undervalued high-OBP hitters

**Late rounds (9+):**
- Relief pitchers and closer
- Bench players (versatile position eligibility preferred)
- Defensive specialists

**REQ-DFT-007**: AI player valuation score (for ranking "best available"):

```
For batters:
  value = (OPS * 100) + (SB * 0.5) + (fieldingPct * 20)
  + positionBonus:  C=+15, SS=+12, CF=+10, 2B=+8, 3B=+5, RF=+3, LF=+2, 1B=+1, DH=0

For starting pitchers:
  value = ((4.50 - ERA) * 30) + (K9 * 5) - (BB9 * 8) + (stamina * 3)

For relievers/closers:
  value = ((3.50 - ERA) * 25) + (K9 * 6) - (BB9 * 10)
```

When multiple seasons of the same physical player are available, the AI selects the season with the highest valuation score for that player.

**REQ-DFT-008**: After the draft completes, validate every team meets roster requirements:
- 1 C, 1 1B, 1 2B, 1 SS, 1 3B, 3 OF, 1 DH (starting lineup)
- 4 bench position players
- 4 starting pitchers
- 3 relief pitchers
- 1 closing pitcher

If any team is short, auto-fill from remaining player pool using best available at the needed position.

---

## 8. Roster & Lineup Management

### 8.1 Roster Composition (Enforced)

**REQ-RST-001**: Every team must have exactly 21 players:

| Slot | Count | Positions |
|------|-------|-----------|
| Starting Lineup | 9 | C, 1B, 2B, SS, 3B, LF, CF, RF, DH |
| Bench | 4 | Any position player |
| Starting Pitchers | 4 | SP |
| Relief Pitchers | 3 | RP |
| Closer | 1 | CL |

### 8.2 Lineup Management

**REQ-RST-002**: One lineup per team (no separate L/R lineups per project spec). AI auto-generates the initial lineup after the draft. Player-controlled teams can modify theirs.

**REQ-RST-003**: AI lineup generation algorithm:
1. Place each player at their primary position in the starting 9
2. Set batting order by descending OPS, with these adjustments:
   - Leadoff (#1): Highest OBP player with speed > 0.5
   - #2: Highest contact rate
   - #3: Highest OPS overall
   - #4: Highest SLG (power hitter)
   - #5-#7: Next highest OPS
   - #8: Weakest hitter (often catcher)
   - #9: Second weakest or pitcher's spot equivalent

**REQ-RST-004**: Lineup validation rules:
- Exactly 9 batting slots
- Each defensive position filled exactly once (C, 1B, 2B, SS, 3B, LF, CF, RF)
- DH fills the 9th lineup slot
- A player can only play a position listed in their `eligiblePositions`

### 8.3 Player Transactions

**REQ-RST-005**: Player-controlled teams can:
- **Drop a player**: Releases them back to the available pool. All qualifying seasons of that player (per REQ-DATA-002a) become available again to any team.
- **Add a player**: Picks up an unowned player-season from the pool (must drop someone first to stay at 21). When browsing available free agents, the pool displays all qualifying seasons of unowned players. When a player-season is added, all other seasons of that player are removed from the pool (REQ-DFT-001a).
- **Trade players**: Propose a trade to another team. If the other team is CPU-controlled, the AI evaluates the trade using player values (REQ-DFT-007). If human-controlled, the other player must accept.

**REQ-RST-006**: Trade validation: After a trade, both teams must still meet roster composition requirements (REQ-RST-001).

---

## 9. Season Scheduling & Simulation Flow

### 9.1 Schedule Generation

**REQ-SCH-001**: AL teams only play AL teams. NL teams only play NL teams.

**REQ-SCH-002**: All teams play on the same day, once per day. No rainouts.

**REQ-SCH-003**: Generate a balanced round-robin schedule. Each team plays every other team in their league an equal number of times (as close as possible). Target: 162 games per team (or adjusted for team count).

**REQ-SCH-004**: Each game day, every team plays exactly once (no off-days within a league). If odd number of teams in a league, one team gets a bye each day.

### 9.2 Simulation Controls

**REQ-SCH-005**: Stat Master simulation buttons:
- **Simulate Day**: Simulate all games for the current day
- **Simulate Week**: Simulate 7 days
- **Simulate Month**: Simulate 30 days
- **Simulate Season**: Simulate all remaining regular-season games

**REQ-SCH-006**: After simulation, update:
- All team W/L records
- All player batting/pitching statistics (cumulative for season)
- Standings
- League leaders

**REQ-SCH-007**: Display simulation results with the "Typewriter" effect notification per UI/UX spec.

### 9.3 Season Completion & Archival

**REQ-SCH-008**: When the regular season is complete, transition to playoffs.

**REQ-SCH-009**: After playoffs conclude:
- Display champion with "SEASON COMPLETED" stamp animation (per UI/UX spec)
- Archive the season: final standings, all player stats, playoff bracket/results, champion
- Store archived stats as JSON blob in Supabase Storage
- Option to reset for a new season (stats reset, rosters remain, new schedule generated)

---

## 10. Statistics System

### 10.1 Stat Tracking

**REQ-STS-001**: After every simulated game, accumulate stats into season totals for every player who participated.

**REQ-STS-002**: Derived statistics to compute on-the-fly (not stored, calculated from base stats):

| Stat | Formula |
|------|---------|
| BA | H / AB |
| OBP | (H + BB + HBP) / (AB + BB + HBP + SF) |
| SLG | (1B + 2B*2 + 3B*3 + HR*4) / AB |
| OPS | OBP + SLG |
| ERA | ER * 9 / IP |
| WHIP | (BB + H) / IP |
| K/9 | SO * 9 / IP |
| BB/9 | BB * 9 / IP |
| AVG | (batting average alias) |

### 10.2 League Leaders

**REQ-STS-003**: Track league leaders for AL, NL, and combined:

**Batting leaders (minimum 3.1 PA per team game):**
BA, HR, RBI, R, H, 2B, 3B, SB, BB, OBP, SLG, OPS

**Pitching leaders (minimum 1 IP per team game):**
W, ERA, SO, SV, WHIP, CG, SHO, IP, K/9

### 10.3 Team Statistics

**REQ-STS-004**: Track team aggregate stats:
- Runs Scored, Runs Allowed, Run Differential
- Team BA, Team ERA, Team OBP, Team SLG
- Total HR, Total SB, Total Errors
- Pythagorean W-L expectation: W% = RS^2 / (RS^2 + RA^2)

### 10.4 Advanced Analytics Toggle

**REQ-STS-005**: Per UI/UX spec, provide a toggle between:
- **Traditional view**: AVG, HR, RBI, ERA, W, SV
- **Advanced view**: OPS, OBP, SLG, WHIP, K/9, FIP (if calculable)

---

## 11. AI Integration

### 11.1 Manager AI Personality System (APBA Port)

APBA BBW includes 4 distinct manager personalities, each with ~375KB of binary decision data (DCT/LIB/MOB/MSY files). Baseball Ledger ports this concept as configurable decision threshold profiles that govern all in-game strategic decisions.

**REQ-AI-001**: Four manager personality profiles (ported from APBA's MGRCAPTS, MGRDUKER, MGRJMCOY, MGRLPEPR):

```typescript
interface ManagerProfile {
  name: string;
  style: 'conservative' | 'aggressive' | 'balanced' | 'analytical';

  // Decision thresholds (0.0-1.0 scale, higher = more likely to act)
  stealAttemptThreshold: number;    // How readily the manager calls steals
  buntThreshold: number;            // How readily the manager calls bunts
  hitAndRunThreshold: number;       // How readily the manager calls hit-and-run
  pinchHitThreshold: number;        // How readily the manager pinch-hits
  intentionalWalkThreshold: number; // How readily the manager walks batters
  pitcherPullThreshold: number;     // How quickly the manager pulls a pitcher
  aggressiveBaserunning: number;    // Extra-base attempt aggressiveness

  // Inning-based modifiers (multiply threshold in late innings)
  lateInningMultiplier: number;     // Applied innings 7+
  extraInningMultiplier: number;    // Applied innings 10+
}

const MANAGER_PROFILES: Record<string, ManagerProfile> = {
  // Cap Spalding (MGRCAPTS) - Conservative/traditional
  conservative: {
    name: 'Cap Spalding',
    style: 'conservative',
    stealAttemptThreshold: 0.25,     // Rarely steals
    buntThreshold: 0.60,             // Loves the sacrifice bunt
    hitAndRunThreshold: 0.15,        // Rarely calls hit-and-run
    pinchHitThreshold: 0.40,         // Moderate pinch-hitting
    intentionalWalkThreshold: 0.55,  // Frequently walks dangerous hitters
    pitcherPullThreshold: 0.70,      // Lets starters go deep
    aggressiveBaserunning: 0.30,     // Conservative on the bases
    lateInningMultiplier: 1.2,
    extraInningMultiplier: 1.5,
  },

  // Duke Robinson (MGRDUKER) - Aggressive/risk-taking
  aggressive: {
    name: 'Duke Robinson',
    style: 'aggressive',
    stealAttemptThreshold: 0.65,     // Runs frequently
    buntThreshold: 0.20,             // Rarely bunts (swings away)
    hitAndRunThreshold: 0.55,        // Loves hit-and-run
    pinchHitThreshold: 0.60,         // Quick to pinch-hit
    intentionalWalkThreshold: 0.25,  // Rarely walks batters (pitches to them)
    pitcherPullThreshold: 0.40,      // Quick hook on starters
    aggressiveBaserunning: 0.75,     // Very aggressive on bases
    lateInningMultiplier: 1.4,
    extraInningMultiplier: 1.8,
  },

  // Johnny McCoy (MGRJMCOY) - Balanced/adaptive
  balanced: {
    name: 'Johnny McCoy',
    style: 'balanced',
    stealAttemptThreshold: 0.45,     // Situational steals
    buntThreshold: 0.40,             // Situational bunts
    hitAndRunThreshold: 0.35,        // Moderate hit-and-run
    pinchHitThreshold: 0.50,         // Moderate pinch-hitting
    intentionalWalkThreshold: 0.40,  // Moderate IBB
    pitcherPullThreshold: 0.55,      // Middle-ground on pitcher usage
    aggressiveBaserunning: 0.50,     // Average aggression
    lateInningMultiplier: 1.3,
    extraInningMultiplier: 1.6,
  },

  // Larry Pepper (MGRLPEPR) - Statistical/analytical
  analytical: {
    name: 'Larry Pepper',
    style: 'analytical',
    stealAttemptThreshold: 0.35,     // Only steals with high-percentage runners
    buntThreshold: 0.15,             // Almost never bunts (values outs)
    hitAndRunThreshold: 0.25,        // Selective hit-and-run
    pinchHitThreshold: 0.70,         // Aggressive platoon pinch-hitting
    intentionalWalkThreshold: 0.60,  // Walks dangerous hitters freely
    pitcherPullThreshold: 0.45,      // Data-driven pitcher changes
    aggressiveBaserunning: 0.55,     // Slightly above average
    lateInningMultiplier: 1.5,       // Very aggressive late
    extraInningMultiplier: 2.0,
  },
};
```

**REQ-AI-001a**: Manager assignment:
- CPU-controlled teams are randomly assigned one of the 4 profiles at league creation
- Player-controlled teams default to "balanced" but can choose any profile
- The profile persists for the entire season (managers don't change mid-season)

### 11.2 In-Game Decision Logic

**REQ-AI-002**: Before each plate appearance, the manager AI evaluates the game situation using the assigned profile's thresholds:

```
decisionScore = baseFactors * profileThreshold * inningMultiplier

If decisionScore > random(): execute the decision
```

| Decision | Base Factors | Profile Threshold Used |
|----------|-------------|----------------------|
| Steal attempt | runner.speed * (1 if close game else 0.5) | stealAttemptThreshold |
| Sacrifice bunt | (runner on 1B/2B) * (0 outs) * (game within 2 runs) * (1 - batter.contactRate) | buntThreshold |
| Hit-and-run | (runner on 1B) * (< 2 outs) * batter.contactRate | hitAndRunThreshold |
| Pinch hit | (bench OPS - batter OPS) / bench OPS * platoon advantage | pinchHitThreshold |
| Intentional walk | batter OPS rank (top 20% = 1.0) * (1B open) * (scoring pos runner) | intentionalWalkThreshold |
| Pull pitcher | (1 - effective grade / starting grade) * fatigue factor | pitcherPullThreshold |

**REQ-AI-003**: Reliever selection priority (same across all profiles):
1. If save situation (9th+, winning by 1-3): Use closer
2. If high-leverage (7th-8th, winning or tied): Use best RP by grade
3. Otherwise: Use RP with most remaining stamina

**REQ-AI-004**: Stolen base decision detail:
- Only attempted with runner on 1B or 2B, < 2 outs
- Not attempted when up or down by 4+ runs
- More likely in close games after 6th inning (lateInningMultiplier applies)
- Success check per REQ-SIM-009

**REQ-AI-005**: For CPU-controlled teams, ALL decisions use the assigned manager profile. For player-controlled teams during auto-simulation, the player's chosen profile applies (players set lineups but don't manage in-game decisions during bulk sim).

### 11.3 Claude API Integration Points

**REQ-AI-006**: Use Claude API for these enhanced features (all optional, game works without them):

| Feature | When Called | Prompt Pattern |
|---------|-----------|----------------|
| Draft Pick Reasoning | During draft, for CPU teams | "Given available players [list], my team needs [positions], my manager style is [profile]. Recommend a pick and explain why." |
| Trade Evaluation | When CPU team receives trade offer | "Evaluate this trade: [my players] for [their players]. My manager style is [profile]. Consider team needs [positions] and player values." |
| Play-by-Play Commentary | After each plate appearance (if enabled) | "Generate one-sentence commentary for: [batter] [outcome] against [pitcher], [game situation]. Style: [newspaper/radio/modern]." |
| Game Summary | After game completion | "Summarize this game: [box score], [key plays]. Write in a newspaper recap style." |
| Manager Explanation | When a notable decision is made | "Explain why [manager name] ([style]) decided to [decision] in this situation: [game state]." |

**REQ-AI-007**: Claude API calls must be rate-limited and cached. Do not call Claude for every PA during bulk simulation (Day/Week/Month/Season). Only generate commentary for single-game views or playoff games.

**REQ-AI-008**: All AI features must degrade gracefully. If Claude API is unavailable or rate-limited, fall back to:
- Draft: Use value score ranking (REQ-DFT-007)
- Trade: Use simple value comparison
- Commentary: Use template strings (e.g., "[Batter] singled to left field")
- Summary: Use box score display only
- Manager explanation: Skip (no fallback needed)

---

## 12. User Interface

### 12.1 Design System

**REQ-UI-001**: Color palette (from UI/UX spec):

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | #FDF5E6 | Page background (Old Lace) |
| `color-primary` | #1B4D3E | Headers, primary buttons (Deep Ballpark Green) |
| `color-accent` | #B22222 | Alerts, active states, CTAs (Stitch Red) |
| `color-secondary` | #D2B48C | Borders, card backgrounds (Tan/Sandstone) |
| `color-playoff` | Black + Gold | Playoff mode accent override |

**REQ-UI-002**: Typography:
- Headlines: Roboto Slab (slab-serif)
- Stats/tables: JetBrains Mono (monospace)
- Body: System font stack (readable sans-serif)

**REQ-UI-003**: Layout: Centered max-width container (1200px) with subtle drop shadow and a "book-spine" left border.

### 12.2 Pages & Components

**REQ-UI-004**: Splash Page
- Project name and tagline
- Brief explanation of what Baseball Ledger does
- Three action cards: "Create a League", "Join a League", "Delete a League"
- Vintage/historical aesthetic, paper-like texture

**REQ-UI-005**: League Configuration Page
- Form fields per REQ-LGE-001
- Team name/city preview grid
- Invite key display in "Secret Telegram" styled card
- Division assignment visualization

**REQ-UI-006**: Draft Board Page
- Vertical scrolling ticker showing picks in real-time
- Available player table (sortable, filterable by position)
- Team roster preview panel
- Pick timer (60 seconds for human picks)
- Current round/pick indicator

**REQ-UI-007**: Ledger Dashboard (Stat Master) - Main view after league is active
- League schedule with results (wins/losses highlighted)
- Standings table (division + wild card)
- Simulation button group: Day / Week / Month / Season
- "Processing Ledger..." vintage loading animation during simulation
- Recent results ticker at bottom of screen
- Advanced/Traditional stats toggle (vintage toggle switch)

**REQ-UI-008**: Roster & Lineup Management Page
- "The Diamond": Visual field representation showing current lineup at positions
- Drag-and-drop player assignment into position slots
- Bench panel below the diamond
- Pitching rotation display (SP1-SP4 with next-up indicator)
- Bullpen display (RP1-RP3 + CL)
- Player add/drop/trade buttons

**REQ-UI-009**: Player Profile Modal ("Digital Baseball Card")
- Opens on clicking any player name
- Full name (linked via People.csv playerID)
- Season represented (year)
- Photo placeholder or silhouette
- Key stats (BA/OPS for batters, ERA/WHIP for pitchers)
- Card-like visual treatment with vintage border

**REQ-UI-010**: Game Viewer (for single-game playoff sims or review)
- Play-by-play feed (scrolling text, each PA result)
- Live box score (line score + team totals)
- Current game state visualization (base diagram, outs, score)
- AI commentary text (if enabled)

**REQ-UI-011**: Season Archive Page
- Historical season records
- "SEASON COMPLETED" stamp animation when archiving
- Drill into any archived season for full stats/standings/playoff bracket

**REQ-UI-012**: Playoff Mode Theme Switch
- When playoffs begin, UI switches to high-contrast Black + Gold accents
- Simulation controls lock to "Single Game" only
- Bracket visualization

### 12.3 Responsive Design

**REQ-UI-013**: Application must be usable on desktop (1200px+) and tablet (768px+). Mobile is low-priority but should not break.

---

## 13. Authentication & Authorization

**REQ-AUTH-001**: Supabase Auth with email/password. No social login required initially.

**REQ-AUTH-002**: Permission model:

| Role | Can Do |
|------|--------|
| Anonymous | View splash page only |
| Authenticated User | Create leagues, join leagues, manage their team |
| Team Owner | Modify their own team's lineup, roster, and team name |
| Commissioner | All team owner abilities + manage ALL CPU teams + delete league + start draft + trigger simulations |

**REQ-AUTH-003**: League invite key grants access to join that specific league only. Validate on join.

---

## 14. API Design

### 14.1 REST Endpoints (Vercel Serverless Functions)

**REQ-API-001**: Core endpoints:

```
POST   /api/leagues                    # Create league
GET    /api/leagues/:id                # Get league details
DELETE /api/leagues/:id                # Delete league (commissioner only)
POST   /api/leagues/:id/join           # Join with invite key
POST   /api/leagues/:id/draft/start    # Start draft (commissioner)
POST   /api/leagues/:id/draft/pick     # Make a draft pick
GET    /api/leagues/:id/draft/state    # Current draft state

GET    /api/leagues/:id/teams          # List all teams
PATCH  /api/leagues/:id/teams/:tid     # Update team (name, lineup)
GET    /api/leagues/:id/teams/:tid/roster  # Get roster

POST   /api/leagues/:id/simulate       # Simulate (body: { days: 1|7|30|'season' })
GET    /api/leagues/:id/schedule       # Get schedule
GET    /api/leagues/:id/standings      # Get standings

GET    /api/leagues/:id/stats/batting  # Batting leaders
GET    /api/leagues/:id/stats/pitching # Pitching leaders
GET    /api/leagues/:id/stats/team     # Team stats

GET    /api/leagues/:id/games/:gid     # Get game result + play-by-play

POST   /api/leagues/:id/transactions   # Player add/drop/trade
POST   /api/leagues/:id/archive        # Archive season (commissioner)
GET    /api/leagues/:id/archives       # List archived seasons
```

**REQ-API-002**: Simulation must run server-side (Vercel Serverless Function) to prevent client-side manipulation of game outcomes. The client sends a "simulate" request and receives results.

**REQ-API-003**: Bulk simulation (week/month/season) should run as a Vercel Serverless Function with progress updates via Supabase real-time subscriptions (PostgreSQL `LISTEN/NOTIFY` via `supabase.channel()`).

### 14.2 Success Response Envelopes

**REQ-API-004**: All successful API responses (status 200, 201, 202) MUST use the `ApiResponse<T>` envelope. This interface is defined in `src/lib/types/api.ts` (Layer 0):

```typescript
interface ApiResponse<T> {
  readonly data: T;
  readonly meta: {
    readonly requestId: string;  // UUID v4, matches X-Request-Id response header (REQ-ERR-004)
    readonly timestamp: string;  // ISO 8601 UTC (e.g., "2026-03-15T14:30:00.000Z")
  };
}
```

The top-level key is `data` for success responses and `error` for failure responses (REQ-ERR-003). Clients discriminate success from failure by checking which top-level key is present:

```typescript
// Client-side response handling pattern (Layer 3 services)
if ('error' in response) {
  // ApiErrorResponse -- handle per REQ-ERR-003
} else {
  // ApiResponse<T> -- unwrap response.data
}
```

**REQ-API-005**: Endpoints that return server-paginated collections (per REQ-NFR-019) MUST use the `PaginatedResponse<T>` envelope. Defined in `src/lib/types/api.ts`:

```typescript
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly pagination: {
    readonly page: number;       // 1-based current page
    readonly pageSize: number;   // Fixed at 50 per REQ-NFR-019
    readonly totalRows: number;  // Total matching rows in the database
    readonly totalPages: number; // Math.ceil(totalRows / pageSize)
  };
}
```

Paginated endpoints accept these query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | 1-based page number |
| `sortBy` | string | varies by endpoint | Column to sort by (e.g., `HR`, `ERA`, `W`) |
| `sortOrder` | `'asc'` \| `'desc'` | `'desc'` | Sort direction |

Example response for `GET /api/leagues/:id/stats/batting?page=2&sortBy=HR&sortOrder=desc`:

```json
{
  "data": [
    {
      "playerId": "ruthba01",
      "playerName": "Babe Ruth",
      "teamId": "a1b2c3d4-...",
      "stats": { "G": 150, "AB": 540, "R": 158, "H": 204, "HR": 54, "RBI": 137, "BB": 144, "SO": 81 }
    }
  ],
  "pagination": {
    "page": 2,
    "pageSize": 50,
    "totalRows": 336,
    "totalPages": 7
  },
  "meta": {
    "requestId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "timestamp": "2026-03-15T14:30:00.000Z"
  }
}
```

### 14.3 HTTP Status Code Semantics

**REQ-API-006**: Success status codes. Error status codes are defined in Section 15.8.1 (REQ-ERR-001). This requirement covers the success side:

| Status Code | When Used | Response Body | Endpoints |
|---|---|---|---|
| `200 OK` | Successful retrieval or update | `ApiResponse<T>` or `PaginatedResponse<T>` | All GET endpoints, PATCH endpoints, POST /join, POST /draft/start, POST /simulate (single-day only per REQ-API-011) |
| `201 Created` | New resource created | `ApiResponse<T>` with `Location` header | POST /leagues, POST /draft/pick, POST /transactions |
| `202 Accepted` | Long-running operation started | `ApiResponse<{ simulationId: string }>` | POST /simulate (bulk: days > 1, per REQ-API-011) |
| `204 No Content` | Successful deletion or stateless action | Empty body (no JSON) | DELETE /leagues/:id, POST /archive |

Additional header requirements:

- **201 responses** MUST include a `Location` header with the relative URL of the created resource (e.g., `Location: /api/leagues/uuid-123`).
- **202 responses** MUST include the `simulationId` in the body so the client can subscribe to Supabase Realtime progress updates immediately (per REQ-NFR-020).
- **All responses** MUST include the `X-Request-Id` header (per REQ-ERR-004).

### 14.4 Response Helpers and Conventions

**REQ-API-007**: The `api/_lib/response.ts` module (referenced in Section 3.3) exports the following helper functions. Every Layer 2 API function handler MUST use these helpers instead of calling `res.status().json()` directly. This ensures consistent envelope formatting across all endpoints:

```typescript
// api/_lib/response.ts

import type { VercelResponse } from '@vercel/node';

/** Send a 200 OK response with the ApiResponse<T> envelope. */
export function ok<T>(res: VercelResponse, data: T, requestId: string): void;

/** Send a 201 Created response with the ApiResponse<T> envelope and Location header. */
export function created<T>(
  res: VercelResponse,
  data: T,
  requestId: string,
  locationPath: string
): void;

/** Send a 202 Accepted response for long-running operations. */
export function accepted<T>(res: VercelResponse, data: T, requestId: string): void;

/** Send a 204 No Content response with X-Request-Id header only. */
export function noContent(res: VercelResponse, requestId: string): void;

/** Send a paginated 200 OK response with the PaginatedResponse<T> envelope. */
export function paginated<T>(
  res: VercelResponse,
  data: T[],
  pagination: { page: number; pageSize: number; totalRows: number },
  requestId: string
): void;
```

Each helper:

1. Sets `Content-Type: application/json; charset=utf-8` (except `noContent` which sets no Content-Type).
2. Sets the `X-Request-Id` response header from the `requestId` parameter (generated per REQ-ERR-004).
3. Builds the envelope structure with `meta.requestId` and `meta.timestamp` (current UTC).
4. Calls `res.status(code).json(body)` (or `res.status(204).end()` for no-content).
5. The `paginated` helper computes `totalPages` from `Math.ceil(totalRows / pageSize)`.

**REQ-API-008**: Field naming convention and content rules:

**camelCase JSON, snake_case database.** All JSON response field names use camelCase. The PostgreSQL schema (REQ-DATA-007) uses snake_case. Layer 2 API function handlers are responsible for mapping between the two conventions during query result processing. Mapping rules:

| Database Column | JSON Field | Example |
|---|---|---|
| `snake_case` columns | `camelCase` fields | `home_team_id` -> `homeTeamId` |
| `created_at` / `updated_at` | `createdAt` / `updatedAt` | Timestamp columns |
| JSONB columns with camelCase objects | Pass-through, no transformation | `player_card` -> `playerCard` (contents already camelCase) |

**Content-Type**: All API responses use `Content-Type: application/json; charset=utf-8` except 204 responses which have no body.

**CORS**: Handled by Vercel's built-in configuration in `vercel.json`. The frontend and API are deployed under the same Vercel project (same-origin). No cross-origin API access is supported.

### 14.5 Endpoint Response Type Mapping

**REQ-API-009**: Every endpoint from REQ-API-001 maps to a specific response type, status code, and helper function. This table is the authoritative contract for what each endpoint returns on success:

| Endpoint | Method | Status | Helper | Response Type `T` | Paginated |
|---|---|---|---|---|---|
| `/api/leagues` | POST | 201 | `created` | `LeagueSummary` | No |
| `/api/leagues/:id` | GET | 200 | `ok` | `LeagueSummary` | No |
| `/api/leagues/:id` | DELETE | 204 | `noContent` | -- | No |
| `/api/leagues/:id/join` | POST | 200 | `ok` | `JoinLeagueResult` | No |
| `/api/leagues/:id/draft/start` | POST | 200 | `ok` | `DraftState` | No |
| `/api/leagues/:id/draft/pick` | POST | 201 | `created` | `DraftPickResult` | No |
| `/api/leagues/:id/draft/state` | GET | 200 | `ok` | `DraftState` | No |
| `/api/leagues/:id/teams` | GET | 200 | `ok` | `TeamSummary[]` | No |
| `/api/leagues/:id/teams/:tid` | PATCH | 200 | `ok` | `TeamSummary` | No |
| `/api/leagues/:id/teams/:tid/roster` | GET | 200 | `ok` | `RosterEntry[]` | No |
| `/api/leagues/:id/simulate` | POST | 200 | `ok` | `SimDayResult` | No |
| `/api/leagues/:id/simulate` | POST | 202 | `accepted` | `{ simulationId: string }` | No |
| `/api/leagues/:id/schedule` | GET | 200 | `ok` | `ScheduleDay[]` | No |
| `/api/leagues/:id/standings` | GET | 200 | `ok` | `DivisionStandings[]` | No |
| `/api/leagues/:id/stats/batting` | GET | 200 | `paginated` | `BattingLeaderEntry[]` | Yes |
| `/api/leagues/:id/stats/pitching` | GET | 200 | `paginated` | `PitchingLeaderEntry[]` | Yes |
| `/api/leagues/:id/stats/team` | GET | 200 | `ok` | `TeamStatEntry[]` | No |
| `/api/leagues/:id/games/:gid` | GET | 200 | `ok` | `GameDetail` | No |
| `/api/leagues/:id/transactions` | POST | 201 | `created` | `TransactionResult` | No |
| `/api/leagues/:id/archive` | POST | 204 | `noContent` | -- | No |
| `/api/leagues/:id/archives` | GET | 200 | `ok` | `ArchiveSummary[]` | No |

Notes on pagination scope:

- **Teams** (GET): Not paginated. Max 32 teams per league (REQ-LGE-001).
- **Roster** (GET): Not paginated. Fixed at 21 players per team (REQ-RST-001).
- **Schedule** (GET): Not paginated. Full season returned as `ScheduleDay[]` (max 162 days).
- **Team stats** (GET): Not paginated. One row per team, max 32.
- **Batting/pitching leaders** (GET): Paginated per REQ-NFR-019. Hundreds of players across all teams.

The `/api/leagues/:id/simulate` endpoint appears twice because it returns different status codes depending on the request body (see REQ-API-011).

**REQ-API-010**: Additional TypeScript interfaces for API response types not yet defined elsewhere in this document. These are defined in `src/lib/types/api.ts` alongside `ApiResponse<T>` and `PaginatedResponse<T>`:

```typescript
/** Returned by POST /api/leagues/:id/join */
interface JoinLeagueResult {
  readonly teamId: string;
  readonly teamName: string;
}

/** Returned by POST /api/leagues/:id/draft/pick */
interface DraftPickResult {
  readonly round: number;
  readonly pick: number;
  readonly teamId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly isComplete: boolean;        // true if this was the final pick
  readonly nextTeamId: string | null;  // null if draft is complete
}

/** Returned by GET /api/leagues/:id/draft/state and POST /api/leagues/:id/draft/start */
interface DraftState {
  readonly leagueId: string;
  readonly status: 'not_started' | 'in_progress' | 'completed';
  readonly currentRound: number;
  readonly currentPick: number;
  readonly currentTeamId: string | null;
  readonly picks: DraftPickResult[];
  readonly totalRounds: number;         // 21 per REQ-DFT-001
  readonly pickTimerSeconds: number;    // 60 per REQ-DFT-004
}

/** Returned by GET /api/leagues/:id/games/:gid */
interface GameDetail {
  readonly gameId: string;
  readonly dayNumber: number;
  readonly homeTeam: { readonly id: string; readonly name: string; readonly city: string };
  readonly awayTeam: { readonly id: string; readonly name: string; readonly city: string };
  readonly homeScore: number;
  readonly awayScore: number;
  readonly innings: number;
  readonly boxScore: BoxScore;              // From REQ-SIM-016
  readonly playByPlay: PlayByPlayEntry[];   // From REQ-SIM-016
  readonly winningPitcherId: string;
  readonly losingPitcherId: string;
  readonly savePitcherId: string | null;
}

/** Returned by POST /api/leagues/:id/transactions */
interface TransactionResult {
  readonly transactionId: string;
  readonly type: 'add' | 'drop' | 'trade';
  readonly teamId: string;
  readonly playersAdded: ReadonlyArray<{ readonly playerId: string; readonly playerName: string }>;
  readonly playersDropped: ReadonlyArray<{ readonly playerId: string; readonly playerName: string }>;
  readonly completedAt: string;             // ISO 8601 UTC
}

/** Returned by GET /api/leagues/:id/archives */
interface ArchiveSummary {
  readonly id: string;
  readonly seasonNumber: number;
  readonly champion: string | null;
  readonly createdAt: string;               // ISO 8601 UTC
}
```

Note: `DraftState` and `DraftPickResult` are API wire-format types defined here. The pure logic types for draft management are defined in `src/lib/types/draft.ts` (Layer 0). The API handler maps from the internal representation to these response shapes.

**REQ-API-011**: Simulation endpoint behavior depends on the request body:

| Request Body | Status | Response | Delivery |
|---|---|---|---|
| `{ days: 1 }` | `200 OK` | `ApiResponse<SimDayResult>` | Synchronous (< 500ms per REQ-NFR-001) |
| `{ days: 7 }` | `202 Accepted` | `ApiResponse<{ simulationId: string }>` | Async, progress via Supabase Realtime (REQ-NFR-020) |
| `{ days: 30 }` | `202 Accepted` | `ApiResponse<{ simulationId: string }>` | Async, progress via Supabase Realtime (REQ-NFR-020) |
| `{ days: 'season' }` | `202 Accepted` | `ApiResponse<{ simulationId: string }>` | Async, progress via Supabase Realtime (REQ-NFR-020) |

Single-day simulation returns results synchronously to avoid unnecessary Realtime subscription overhead for the most common simulation action (advancing one day at a time). Multi-day simulation returns immediately with a `simulationId` that the client uses to subscribe to progress updates via `simulationStore` (REQ-STATE-013, REQ-STATE-014).

---

## 15. Non-Functional Requirements

### 15.1 Performance Targets

**REQ-NFR-001**: Single game simulation must complete in < 500ms server-side.

**REQ-NFR-002**: Full season simulation (162 games x 16 teams = ~1,296 games) must complete in < 60 seconds.

**REQ-NFR-003**: Lahman CSV parsing and PlayerCard generation must complete in < 10 seconds at league creation.

**REQ-NFR-004**: UI must render stat tables (500+ rows) without visible jank. Use virtualized scrolling for roster and lineup views.

### 15.2 Security & Correctness

**REQ-NFR-005**: All user data must be scoped to the authenticated user's leagues. No cross-league data leakage.

**REQ-NFR-006**: Claude API calls must timeout after 10 seconds and fall back gracefully.

**REQ-NFR-007**: Game simulation must be deterministic given the same random seed. Support optional seeding for reproducible results (useful for testing and dispute resolution).

### 15.3 Simulation Engine Performance

**REQ-NFR-008**: Client-side simulation (single-game view, card generation at league creation) must run in a **Web Worker** so the UI thread maintains 60fps. The "Processing Ledger..." animation and all UI interactions must remain responsive during simulation. Bulk simulation runs server-side per REQ-API-002.

**REQ-NFR-009**: Pre-compute the 36-row OutcomeTable (REQ-SIM-003) as a **cumulative distribution array** at app/function startup. This converts weighted random row selection from O(n) linear scan to O(log n) binary search per plate appearance. With ~70 PAs per game and up to 1,296 games per season, this optimization is required to meet NFR-002.

**REQ-NFR-010**: During bulk season simulation, process games in **day-sized batches** (one day's full slate at a time). After each day's games complete, persist results and stat deltas to Supabase, then release the play-by-play arrays from memory. Do NOT accumulate all 1,296 games' play-by-play in memory simultaneously. Only box scores and cumulative stat updates are held in-flight.

### 15.4 Data Loading & Caching

**REQ-NFR-011**: Use PapaParse's **streaming mode** (`step` callback) when parsing Lahman CSV files. Batting.csv contains ~110,000 rows; with the 200 AB qualification threshold (REQ-DATA-002a), approximately 40,000-60,000 qualifying batter-seasons are retained. Stream-parse rows, apply the qualification threshold immediately, and build the PlayerPool incrementally, discarding non-qualifying rows and raw CSV data as each row is processed.

**REQ-NFR-012**: After league creation, PlayerCards are stored in Supabase (per REQ-DATA-007 rosters table). On all subsequent page loads and sessions, **read cards from Supabase, never re-parse CSVs**. The Lahman CSV files are only touched once at league creation time. This ensures sub-second league loading regardless of CSV file sizes.

**REQ-NFR-013**: Cache the active league's roster, schedule, and standings in **Zustand with `persist` middleware** (localStorage). This provides instant UI rendering on page refresh and return visits without waiting for Supabase reads. Invalidate the cache when the user triggers a simulation or roster change.

### 15.5 Database Performance

**REQ-NFR-014**: Use PostgreSQL **transactions** for all post-simulation writes. After simulating a day's games (up to 16 games), wrap all game results, player stat updates, and standings changes in a single `supabase.rpc()` transaction or use `supabase-js` batch inserts. For season simulation, commit one transaction per simulated day.

**REQ-NFR-015**: Define **database indexes** in the Supabase migration files for the most frequent queries (included in REQ-DATA-007 schema):
- Batting leaders: `season_stats` with indexes on JSONB batting stat fields (use GIN index or extracted columns)
- Pitching leaders: `season_stats` with indexes on JSONB pitching stat fields
- Schedule: `schedule(league_id, day_number)`
- Standings: `teams(league_id, league_division, division, wins DESC)`

PostgreSQL supports these natively; define them in SQL migrations, not at query time.

**REQ-NFR-016**: Standings (W/L/RS/RA) are stored directly on the teams table (already in REQ-DATA-007 schema). Update standings **atomically with game result writes** inside the same PostgreSQL transaction. Never compute standings by scanning all game results -- always read the denormalized teams row.

### 15.6 UI Rendering Performance

**REQ-NFR-017**: Use **React.lazy + Suspense** for route-level code splitting. The Draft Board, Stat Master, Game Viewer, League Config, and Roster Management pages are independent bundles loaded on navigation. Target initial bundle size: < 200KB gzipped (excluding fonts).

**REQ-NFR-018**: Load custom fonts (Roboto Slab, JetBrains Mono) with **`font-display: swap`** to prevent Flash of Invisible Text. Subset fonts to Latin characters only to reduce font file sizes by ~60%. Use `<link rel="preload">` for the two primary font weights to minimize layout shift.

**REQ-NFR-019**: Stat leader pages (batting/pitching/team) must use **PostgreSQL `LIMIT`/`OFFSET` pagination** at 50 rows per page with `ORDER BY` on the relevant stat column. Do not load the full stats table client-side and filter. Virtualized scrolling (NFR-004) applies to roster and lineup views where the full dataset is already loaded; stat leader queries must paginate at the database level for efficiency.

### 15.7 Network & Infrastructure

**REQ-NFR-020**: Bulk simulation progress must be **streamed to the client** via Supabase Realtime (per REQ-API-003). The serverless function updates the `simulation_progress` table row:
```typescript
interface SimulationProgress {
  leagueId: string;
  status: 'running' | 'completed' | 'error';
  totalGames: number;        // e.g., 1296 for full season
  completedGames: number;    // incremented after each day's batch
  currentDay: number;        // which schedule day is being simulated
  startedAt: timestamp;
  updatedAt: timestamp;
  errorMessage?: string;
}
```
The client subscribes via `supabase.channel('simulation_progress').on('postgres_changes', ...)` and renders a progress bar with percentage and current day count. This replaces a generic spinner with meaningful feedback.

**REQ-NFR-021**: Simulation Vercel Serverless Functions must be deployed with **explicit resource configuration** in `vercel.json`:
- Memory: 1024 MB (default 1024 MB on Pro, 256 MB on Hobby -- ensure adequate plan)
- Max duration: 300 seconds (Vercel Hobby limit is 60s; Pro allows 300s. For full season sim exceeding 300s, split into day-by-day invocations chained via the client or a cron)
- Note: If season sim exceeds Vercel's max duration, implement a **chunked simulation** pattern: client calls `/api/simulate` for one day at a time in a loop, updating progress after each call. This works within any timeout limit.

These are deployment-time settings, not runtime assumptions.

### 15.8 Error Handling & Recovery

CLAUDE.md Rule 3 mandates: "NO silent fallbacks or silent failures, all problems should be loud and proud." This section defines how every layer of the application handles, reports, and recovers from errors. No error may be swallowed, hidden behind a generic message without logging, or silently degraded without user notification.

#### 15.8.1 Error Classification

**REQ-ERR-001**: All throwable errors across all layers MUST be instances of `AppError` or its subtypes, defined in `src/lib/types/errors.ts` (Layer 0, importable everywhere). Raw `Error`, `string`, or `unknown` throws are prohibited outside of third-party library catch boundaries.

```typescript
type ErrorCategory =
  | 'VALIDATION'      // 400 - Bad input, invalid roster, malformed request body
  | 'AUTHENTICATION'  // 401 - Missing/expired JWT, Supabase auth failure
  | 'AUTHORIZATION'   // 403 - Non-commissioner action, RLS policy rejection
  | 'NOT_FOUND'       // 404 - League/team/player doesn't exist
  | 'CONFLICT'        // 409 - Duplicate draft pick, concurrent roster edit, UNIQUE violation
  | 'RATE_LIMIT'      // 429 - Too many requests
  | 'SIMULATION'      // 500 - Engine failure, invalid game state, OutcomeTable lookup exhausted
  | 'DATA'            // 500 - CSV parse failure, card generation overflow, invalid correlations
  | 'EXTERNAL';       // 502/504 - Claude API timeout/failure, Supabase connection lost

interface AppError {
  readonly category: ErrorCategory;
  readonly code: string;                 // machine-readable: "ERR_ROSTER_COMPOSITION"
  readonly message: string;              // human-readable: "Roster must have at least 3 SS-eligible players"
  readonly statusCode: number;           // HTTP status code
  readonly details?: ValidationDetail[]; // field-level errors (ValidationError only)
  readonly cause?: Error;                // original error (dev/logging only, never sent to client)
}

interface ValidationDetail {
  readonly field: string;   // e.g., "lineup[3].position"
  readonly message: string; // e.g., "Duplicate position assignment"
}
```

Error category to HTTP status mapping:

| Error Category | HTTP Status | User-Visible Behavior |
|---|---|---|
| `VALIDATION` | 400 | Field-level error messages on the form |
| `AUTHENTICATION` | 401 | Redirect to login page |
| `AUTHORIZATION` | 403 | "You do not have permission to perform this action" |
| `NOT_FOUND` | 404 | "The requested league/team/player was not found" |
| `CONFLICT` | 409 | "This player has already been drafted" / "Roster was modified by another user" |
| `RATE_LIMIT` | 429 | "Too many requests. Try again in X seconds" with Retry-After value |
| `SIMULATION` | 500 | "Simulation failed" with error details and retry option |
| `DATA` | 500 | "Data processing failed" with specific context |
| `EXTERNAL` | 502/504 | Fallback description (e.g., "AI commentary unavailable -- using classic commentary") |

**REQ-ERR-002**: Define an `ErrorCode` string union in `src/lib/types/errors.ts` containing all machine-readable error codes. Codes use the format `ERR_<DOMAIN>_<SPECIFIC>`. Representative codes:

| Domain | Code | Meaning |
|---|---|---|
| AUTH | `ERR_AUTH_TOKEN_EXPIRED` | JWT expired or invalid |
| AUTH | `ERR_AUTH_NOT_COMMISSIONER` | User lacks commissioner role for this league |
| ROSTER | `ERR_ROSTER_COMPOSITION` | Roster violates position requirements (REQ-RST-001) |
| ROSTER | `ERR_ROSTER_DUPLICATE_PLAYER` | Player already on this team |
| LINEUP | `ERR_LINEUP_DUPLICATE_POSITION` | Same position assigned twice in lineup |
| LINEUP | `ERR_LINEUP_INVALID_ORDER` | Non-sequential lineup order (must be 1-9) |
| DRAFT | `ERR_DRAFT_PLAYER_TAKEN` | Another team already owns a season of this player (per REQ-DFT-001a, one physical player per league) |
| DRAFT | `ERR_DRAFT_OUT_OF_TURN` | Not this team's turn to pick |
| SIM | `ERR_SIM_OUTCOME_LOOKUP` | OutcomeTable lookup exhausted all 3 attempts (REQ-SIM-004a) |
| SIM | `ERR_SIM_INVALID_STATE` | Game state corruption (outs > 3, negative runs, etc.) |
| SIM | `ERR_SIM_PITCHER_GRADE` | Pitcher grade outside valid range 1-15 |
| DATA | `ERR_CSV_PARSE_FAILED` | PapaParse could not parse the CSV file |
| DATA | `ERR_CSV_MISSING_COLUMN` | Required column not found in Lahman file |
| DATA | `ERR_CARD_VALUE_OVERFLOW` | Card value outside valid range 0-42 |
| DATA | `ERR_PLAYER_POOL_EMPTY` | No players matched the year range filter |
| LEAGUE | `ERR_LEAGUE_INVALID_TRANSITION` | Invalid status transition (e.g., draft to regular_season without completing draft) |
| EXTERNAL | `ERR_CLAUDE_TIMEOUT` | Claude API call exceeded 10s timeout (REQ-NFR-006) |
| EXTERNAL | `ERR_CLAUDE_MALFORMED` | Claude response was not valid JSON |
| DB | `ERR_DATABASE_TRANSACTION` | PostgreSQL transaction failed |
| DB | `ERR_DATABASE_UNKNOWN` | Unmapped PostgreSQL error |

#### 15.8.2 API Error Response Contract

**REQ-ERR-003**: All API error responses MUST use the `ApiErrorResponse` envelope. Never return raw strings, HTML error pages, or unstructured JSON. The `api/_lib/errors.ts` module provides a `handleApiError(error: unknown, requestId: string): Response` function that maps any caught error to the correct HTTP status and envelope.

```typescript
interface ApiErrorResponse {
  error: {
    code: string;                  // ErrorCode from REQ-ERR-002
    message: string;               // Safe for display to user
    details?: ValidationDetail[];  // Only present for 400 VALIDATION errors
    requestId: string;             // UUID v4, matches X-Request-Id response header
  };
}
```

Example successful error response (400):
```json
{
  "error": {
    "code": "ERR_ROSTER_COMPOSITION",
    "message": "Roster must have at least 3 SS-eligible players. Currently: 2.",
    "details": [
      { "field": "roster.positions.SS", "message": "Need 3 SS-eligible players, found 2" }
    ],
    "requestId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

**REQ-ERR-004**: Every API request receives a `X-Request-Id` response header (UUID v4, generated in `api/_lib/auth.ts` middleware). This ID appears in both the error response body and server logs for request tracing and correlation. Successful responses also include the header.

#### 15.8.3 Validation Strategy

**REQ-ERR-005**: Use **Zod** for schema validation. Zod schemas are defined in `src/lib/types/` alongside their TypeScript interfaces (e.g., `player.ts` exports both the `PlayerCard` interface and a `playerCardSchema` Zod object). This co-location keeps validation usable in all layers (API functions, services, pure logic, Web Workers).

**REQ-ERR-006**: Validation occurs at three boundaries with distinct responsibilities:

| Boundary | Layer | What It Validates | Error Type |
|---|---|---|---|
| API boundary | Layer 2 (API Functions) | Request body shape and types (Zod `.parse()`) | `VALIDATION` with field-level `details[]` |
| Service layer | Layer 3 (Services) | Cross-entity business rules (e.g., roster composition after trade requires full roster context) | `VALIDATION` with domain context |
| Pure logic | Layer 1 (Pure Logic) | Invariants and preconditions (card value 0-42, pitcher grade 1-15, outs <= 3) | `VALIDATION`, `SIMULATION`, or `DATA` -- indicates a bug upstream |

**REQ-ERR-007**: Zod parse failures MUST be transformed into `AppError` with category `VALIDATION` and field-level details. Map `ZodError.issues` to `ValidationDetail[]` using the issue's `path` as `field` and `message` as `message`. Never expose raw Zod error format to the client.

#### 15.8.4 Layer-Specific Error Handling Rules

**REQ-ERR-008**: Each architectural layer (per Section 3.4) has specific error responsibilities. No layer may silently swallow an error.

| Layer | Throws | Catches | Passes Through |
|---|---|---|---|
| 0 - Types | Nothing (type-only) | N/A | N/A |
| 1 - Pure Logic | `VALIDATION`, `SIMULATION`, `DATA` | Nothing silently. May catch-and-rethrow with added context (e.g., wrapping a low-level math error with simulation state). | N/A |
| 2 - API Functions | `AUTHENTICATION`, `AUTHORIZATION` | ALL errors at the handler boundary via `handleApiError()`. Converts to `ApiErrorResponse`. Nothing escapes unhandled. | Nothing -- terminal server catch point. |
| 3 - Services | `EXTERNAL` (network failure), `AUTHENTICATION` (token expired during request) | HTTP error responses from API -- maps `ApiErrorResponse` body back to typed `AppError`. | N/A |
| 4 - Stores | Nothing (delegates to services) | Service errors -- stores in an `error` state field for UI consumption via `{ error: AppError | null }`. | N/A |
| 5 - Hooks | Nothing | Store error state -- exposes via return value `{ error, clearError }`. | N/A |
| 6 - Components | Nothing | Nothing -- displays errors received via props. | Error props to parent. |
| 7 - Features | Nothing | Hook errors via React Error Boundary. Renders error UI. | Nothing -- terminal UI catch point. |
| W - Workers | `SIMULATION`, `DATA` | Nothing silently. Posts serialized `AppError` to main thread via `postMessage({ type: 'error', error })`. | N/A |

**REQ-ERR-009**: The application has exactly **two terminal error boundaries**:
- **Server-side**: Layer 2 (API Functions) -- every handler wrapped in `try/catch` that calls `handleApiError()`. No unhandled promise rejections permitted.
- **Client-side**: Layer 7 (Features) -- every feature route wrapped in a React Error Boundary (REQ-ERR-010).

No error may escape these boundaries unhandled. Unhandled rejections in API functions MUST be caught by a global handler that logs at ERROR level and returns a 500 `ApiErrorResponse` with code `ERR_UNHANDLED`.

#### 15.8.5 React Error Boundaries

**REQ-ERR-010**: Wrap each feature route in `src/features/*/` with a React Error Boundary component. The boundary catches render-time JavaScript errors and displays a fallback UI instead of a white screen. Each of the 10 feature modules (splash, league, draft, dashboard, roster, game-viewer, stats, playoffs, archive, transactions) has its own boundary.

**REQ-ERR-011**: Error Boundary fallback UI requirements:
- Display the error message from `AppError.message` (NOT the raw stack trace)
- Provide a "Return to Dashboard" navigation button
- Provide a "Try Again" button that resets the error boundary state and re-renders the feature
- Log the full error (including stack trace) to `console.error` with structured format (REQ-ERR-013)
- Use the `ErrorBanner.tsx` component from `src/components/feedback/` for visual consistency

**REQ-ERR-012**: For user-initiated action errors (form submissions, draft picks, simulation triggers, roster changes), do NOT rely on error boundaries. Instead, catch errors in the hook/store layer and display them inline via `ErrorBanner.tsx` with severity-based styling:

| Severity | Color | Auto-Dismiss | Use Case |
|---|---|---|---|
| ERROR | Red background | No -- persistent until user dismisses | Action-blocking failures (save failed, draft pick rejected, simulation crashed) |
| WARN | Amber background | Yes -- 8 seconds | Degraded results (template commentary instead of AI, cached data instead of fresh) |
| INFO | Neutral background | Yes -- 5 seconds | Non-critical state notifications (cache refreshed, reconnected to Realtime) |

Error boundaries are the safety net for unexpected render failures. `ErrorBanner.tsx` is the primary mechanism for expected operational errors.

#### 15.8.6 Logging & Observability

**REQ-ERR-013**: All server-side errors (Layer 2, Workers) MUST be logged as structured JSON to `console.error` / `console.warn` / `console.info` (captured automatically by Vercel Logs):

```typescript
interface ErrorLogEntry {
  timestamp: string;        // ISO 8601
  level: 'ERROR' | 'WARN' | 'INFO';
  requestId: string;        // from X-Request-Id header
  leagueId?: string;        // extracted from request params when available
  userId?: string;          // extracted from auth token when available
  operation: string;        // e.g., "simulate_season", "draft_pick", "create_league"
  errorCode: string;        // from AppError.code
  message: string;          // from AppError.message
  stack?: string;           // included only when NODE_ENV !== 'production'
  duration_ms?: number;     // milliseconds from request start to error
}
```

Example log entry:
```json
{
  "timestamp": "2026-03-15T14:30:00.000Z",
  "level": "ERROR",
  "requestId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "leagueId": "abc-123",
  "userId": "user-456",
  "operation": "simulate_season",
  "errorCode": "ERR_SIM_INVALID_STATE",
  "message": "Game state corruption: outs=4 exceeds maximum of 3",
  "duration_ms": 1247
}
```

**REQ-ERR-014**: Log level semantics:

| Level | When | Action Required |
|---|---|---|
| ERROR | Unrecoverable failure -- simulation crash, database transaction failure, unhandled exception | Requires investigation. Surfaced to user via ERROR banner. |
| WARN | Degraded operation -- Claude API timeout with template fallback, retry succeeded, cache miss | System still functional. Surfaced to user via WARN banner (REQ-ERR-018). |
| INFO | Significant state transition -- league created, draft completed, season archived, simulation started | Not an error. Useful for audit trail and debugging. |

Client-side logging uses `console.error` / `console.warn` with the same structured format, minus `requestId` and `userId` fields.

#### 15.8.7 Retry & Recovery Policies

**REQ-ERR-015**: Operations with retry policies:

| Operation | Max Retries | Backoff Strategy | Fallback on Exhaustion | Idempotent? |
|---|---|---|---|---|
| Claude API call | 3 | Exponential: 1s, 2s, 4s | Template-based commentary (REQ-AI-*) | Yes |
| Supabase read query | 2 | Linear: 500ms, 1000ms | Zustand cached data if available (REQ-NFR-013) | Yes |
| Supabase write (transaction) | 1 | 500ms delay | None -- surface error to user | Yes (idempotency key) |
| Game simulation | 0 | N/A | None -- deterministic; same input produces same failure | N/A |
| CSV parse | 0 | N/A | None -- user must correct data source | N/A |
| Draft pick | 0 | N/A | None -- surface conflict or validation error immediately | No (use optimistic locking via `updated_at` check) |
| Client network request | 2 | Exponential: 1s, 3s | Show "Connection lost" ERROR banner with manual retry button | Yes |

**REQ-ERR-016**: Retry logging requirements:
- Each retry attempt MUST be logged at WARN level with the attempt number (e.g., "Claude API retry 2/3 after timeout").
- The final failure after all retries exhausted MUST be logged at ERROR level.
- Every retry failure that is surfaced to the user must include the operation context, not a generic message (per CLAUDE.md Rule 3).

#### 15.8.8 Graceful Degradation

**REQ-ERR-017**: When a non-critical subsystem fails, the application continues operating with reduced functionality. Every degradation is visible to the user:

| Subsystem Failure | Degraded Behavior | User Notification |
|---|---|---|
| Claude AI (timeout/error after retries) | Template-based commentary from `src/lib/managers/profiles.ts` | WARN banner: "AI commentary unavailable -- using classic commentary" |
| Supabase Realtime (WebSocket connection lost) | Poll `GET /api/leagues/:id/schedule` every 3 seconds for simulation progress | WARN banner: "Live updates unavailable -- refreshing periodically" |
| Custom font loading failure | System font stack: `Georgia, 'Times New Roman', serif` / `Consolas, 'Courier New', monospace` | None (CSS `font-display: swap` per REQ-NFR-018 handles transparently -- acceptable exception to Rule 3 since visual impact is minimal) |
| localStorage full or unavailable | Memory-only Zustand store (no `persist` middleware) | WARN banner: "Browser storage unavailable -- data will not persist between sessions" |

**REQ-ERR-018**: Every fallback activation MUST be logged at WARN level with the subsystem name and fallback description. No fallback may activate silently (per CLAUDE.md Rule 3). The user must always know when they are receiving degraded service.

#### 15.8.9 Database Error Mapping

**REQ-ERR-019**: The `api/_lib/errors.ts` module MUST map PostgreSQL error codes to typed `AppError` instances. Raw PostgreSQL error messages contain internal details (table names, constraint names, query fragments) that must never reach the client.

| PostgreSQL Code | Condition | Maps To | User-Facing Example |
|---|---|---|---|
| `23505` | UNIQUE constraint violation | `CONFLICT` (409) | "This player is already on your roster" |
| `23503` | FOREIGN KEY violation | `NOT_FOUND` (404) | "The referenced league or team does not exist" |
| `23514` | CHECK constraint violation | `VALIDATION` (400) | "Invalid value: league status must be one of: setup, drafting, regular_season, playoffs, completed" |
| `42501` | RLS policy violation | `AUTHORIZATION` (403) | "You do not have permission to access this league" |
| `40001` | Serialization failure (concurrent access) | Retry per REQ-ERR-015, then `CONFLICT` (409) | "Another user modified this data. Please refresh and try again." |
| `57014` | Statement timeout | `EXTERNAL` (504) | "The operation took too long. Please try again." |

**REQ-ERR-020**: The mapping layer extracts the PostgreSQL constraint name (e.g., `rosters_team_id_player_id_key`) to determine the user-friendly message. A constraint-to-message lookup table in `api/_lib/errors.ts` maps known constraints to specific messages. Unknown PostgreSQL errors map to a generic `EXTERNAL` error with code `ERR_DATABASE_UNKNOWN`, and the original error (including the PostgreSQL code and message) is logged at ERROR level server-side for investigation.

---

## 16. Build Phases

### Phase 1: Foundation
- [ ] Project scaffolding (React + TypeScript + Vite + TailwindCSS)
- [ ] Supabase project setup (Auth, PostgreSQL, Storage, Realtime)
- [ ] Vercel project setup (link GitHub repo, configure serverless functions)
- [ ] Core TypeScript interfaces (PlayerCard, PitcherAttributes, PlayerArchetype, GameState, OutcomeCategory)
- [ ] Lahman CSV loader (PapaParse for People, Batting, Pitching, Fielding)
- [ ] League average calculator for normalization (REQ-DATA-006)
- [ ] Splash page UI

### Phase 2: Card Generator (APBA Port)
- [ ] CardGenerator: rate calculation from Lahman stats (REQ-DATA-005 Step 1)
- [ ] CardGenerator: structural constant assignment (Step 2)
- [ ] CardGenerator: rate-to-card-value mapping using correlation table (Step 3)
- [ ] CardGenerator: power rating at position 24 (Step 4)
- [ ] CardGenerator: archetype flag assignment for bytes 33-34 (Step 5)
- [ ] CardGenerator: pitcher batting card generation (Step 6)
- [ ] Pitcher grade calculation from ERA percentile (REQ-DATA-005a)
- [ ] Card validation tests (verify generated cards produce expected outcome distributions)

### Phase 3: Simulation Engine (APBA Port)
- [ ] OutcomeTable: 36-row weighted lookup matrix (IDT.OBJ port, REQ-SIM-003)
- [ ] Card lookup: random position selection + structural constant skip (REQ-SIM-004 step 4)
- [ ] Pitcher grade gate: grade vs random check to shift outcomes (REQ-SIM-004 step 4d)
- [ ] OutcomeTable lookup: frequency-weighted row selection + threshold check (REQ-SIM-004 step 5)
- [ ] Direct card value fallback mapping (REQ-SIM-004a)
- [ ] Archetype modifiers: power/speed/contact bonuses (REQ-SIM-004 step 6)
- [ ] Platoon adjustment: card modification for L/R matchups (REQ-SIM-004b)
- [ ] Bunt resolution (REQ-SIM-004c)
- [ ] Baserunner engine with speed checks and archetype bonuses (REQ-SIM-006)
- [ ] Defense engine: error resolution and DP checks (REQ-SIM-008)
- [ ] Stolen base resolution (REQ-SIM-009)
- [ ] Pitcher fatigue: grade degradation beyond stamina (REQ-SIM-010)
- [ ] Bullpen management: starter removal triggers, reliever selection (REQ-SIM-011-013)
- [ ] Game state machine (plate appearance loop, inning flow, extras)
- [ ] Stat accumulation after each game
- [ ] Single game simulation API endpoint
- [ ] Simulation determinism with seeded RNG (REQ-NFR-007)

### Phase 4: League & Draft
- [ ] League creation flow (form + Supabase writes)
- [ ] Invite key generation and join flow
- [ ] Team auto-generation (city + mascot name)
- [ ] Division assignment algorithm
- [ ] Manager profile assignment (random for CPU, selectable for players)
- [ ] Draft engine (snake draft with AI picks)
- [ ] Draft board UI

### Phase 5: Season Management
- [ ] Schedule generator (balanced round-robin, AL/NL separation)
- [ ] Bulk simulation (day/week/month/season)
- [ ] Standings calculation
- [ ] League leaders computation
- [ ] Stat Master dashboard UI
- [ ] Simulation progress/results UI

### Phase 6: Team Management
- [ ] Roster management UI (The Diamond)
- [ ] Lineup drag-and-drop
- [ ] Player add/drop
- [ ] Trade system (propose, evaluate, accept/reject)
- [ ] Player profile modal (Digital Baseball Card showing card array visualization)

### Phase 7: Playoffs & Archival
- [ ] Playoff bracket generation (2025 MLB rules)
- [ ] Single-game playoff simulation
- [ ] Playoff mode UI (Black + Gold theme)
- [ ] Season archival to Supabase Storage
- [ ] Archive viewer UI
- [ ] Season reset functionality

### Phase 8: AI Enhancement
- [ ] Manager personality profile system (4 profiles with decision thresholds)
- [ ] Claude API integration service
- [ ] AI play-by-play commentary
- [ ] AI game summaries
- [ ] AI trade evaluation with manager personality context
- [ ] AI draft pick reasoning with manager personality context
- [ ] AI manager decision explanations
- [ ] Fallback templates when API unavailable

### Phase 9: Performance & Polish
- [ ] Web Worker for client-side simulation and card generation (REQ-NFR-008)
- [ ] OutcomeTable cumulative distribution pre-computation (REQ-NFR-009)
- [ ] Day-batched bulk simulation with memory release (REQ-NFR-010)
- [ ] PapaParse streaming mode for CSV loading (REQ-NFR-011)
- [ ] Zustand persist middleware for client-side caching (REQ-NFR-013)
- [ ] PostgreSQL transactions for post-simulation writes (REQ-NFR-014)
- [ ] Database indexes in Supabase migration files (REQ-NFR-015)
- [ ] Route-based code splitting with React.lazy (REQ-NFR-017)
- [ ] Font subsetting and preloading with font-display: swap (REQ-NFR-018)
- [ ] Stat leader cursor-based pagination (REQ-NFR-019)
- [ ] Simulation progress streaming via Supabase Realtime (REQ-NFR-020)
- [ ] Vercel serverless function duration/memory config (REQ-NFR-021)
- [ ] Advanced/Traditional stats toggle
- [ ] "Typewriter" effect for simulation results
- [ ] "SEASON COMPLETED" stamp animation
- [ ] "Processing Ledger..." loading animation
- [ ] Game viewer (play-by-play + box score with card lookup details)
- [ ] Responsive design refinement
- [ ] Error handling and edge cases
- [ ] E2E testing

---

## 17. Testing Strategy

CLAUDE.md Rule 11 mandates a TDD approach: "First write a test case that reproduces the bug, without modifying the source code. Once the test fails (confirming the bug is reproducible), ask it to modify the code to make the test pass." This section defines the test pyramid, coverage targets, mock boundaries, fixture strategy, requirement traceability, performance benchmarks, and CI configuration that govern all testing in the project.

### 17.1 Test Pyramid & TDD Workflow

**REQ-TEST-001**: Tests follow a three-layer pyramid with approximate distribution targets:

| Layer | Tool | Count Target | Purpose |
|---|---|---|---|
| Unit | Vitest | ~70% of all tests | Test pure logic modules in isolation (Layer 0-1 per Section 3.4). One test file per source module. Each test must complete in < 5ms. |
| Integration | Vitest | ~20% of all tests | Test multi-module workflows end-to-end within the application. Real objects throughout -- no mocks except external services (Claude API, Supabase). Examples: card generation through simulation, draft through roster validation, simulation through stats accumulation and standings. |
| E2E | Playwright | ~10% of all tests | Test critical user journeys through a real browser against a running application. Covers authentication, league creation, draft UI interaction, simulation trigger, stat display, and archive flow. |

Unit tests form the foundation: fast, isolated, and comprehensive. Integration tests verify that modules compose correctly. E2E tests verify that the full stack works from the user's perspective.

**REQ-TEST-002**: Every new feature and every bug fix MUST follow the TDD cycle:

1. **RED**: Write a failing test that captures the expected behavior or reproduces the bug. Do NOT modify source code at this step.
2. **GREEN**: Write the minimum code to make the test pass.
3. **REFACTOR**: Clean up the implementation while keeping all tests green.
4. **COMMIT**: Commit the test and implementation together. PR reviews should verify test-first commit ordering when commits are separate.

For new features, the failing test defines the public API contract before the implementation exists. For bug fixes, the failing test proves the bug is reproducible and will prevent future regressions.

### 17.2 Coverage Targets

**REQ-TEST-003**: Code coverage targets by directory, enforced in CI via `vitest run --coverage`:

| Directory | Line Coverage | Branch Coverage | Rationale |
|---|---|---|---|
| `src/lib/simulation/` | 95% | 90% | Core engine correctness is critical. Bugs here produce incorrect game outcomes across every simulated game. |
| `src/lib/card-generator/` | 95% | 90% | Card values drive all simulation results. Incorrect cards propagate errors through every plate appearance. |
| `src/lib/csv/` | 85% | 80% | Parser edge cases (empty rows, encoding, missing columns) matter but the input surface is bounded. |
| `src/lib/draft/` | 90% | 85% | Draft logic affects league fairness. AI drafter decision paths need thorough coverage. |
| `src/lib/schedule/` | 85% | 80% | Schedule generation is deterministic and structurally straightforward. |
| `src/lib/stats/` | 90% | 85% | Stat accuracy is directly user-visible. Derived stats (OPS, WHIP, ERA) have formula edge cases (division by zero, zero plate appearances). |
| `src/lib/managers/` | 90% | 85% | Manager AI decisions directly affect game outcomes and user experience. |
| `src/lib/rng/` | 100% | 100% | Determinism is non-negotiable (REQ-NFR-007). Every code path must be verified. |
| `api/` | 80% | 75% | API handlers are thin wrappers: validate request, call pure logic, return response. Error path coverage is critical (REQ-ERR-003). |
| `src/services/` | 75% | 70% | Service layer is fetch wrappers with error mapping (REQ-ERR-008 Layer 3 rules). |
| `src/components/` | 60% | 50% | UI components tested for correct rendering and user interaction, not visual styling. |
| **Overall project** | **85%** | **80%** | **Floor for CI pass/fail gate.** |

**REQ-TEST-004**: CI MUST fail if coverage drops below the per-directory thresholds defined in REQ-TEST-003. Configure thresholds in `vitest.config.ts` using the `coverage.thresholds` option with per-directory overrides. Coverage reports are generated on every PR and uploaded as CI artifacts.

### 17.3 Mock Boundaries & Test Isolation

**REQ-TEST-005**: Mock rules by test layer -- what to mock vs. use real implementations:

| Dependency | Unit Tests | Integration Tests | E2E Tests |
|---|---|---|---|
| `src/lib/*` (pure logic) | Real (no mocks) | Real | Real (via UI) |
| Supabase client | Mock (`vi.mock`) | Real test database | Real (test Supabase project) |
| Claude API | Mock (fixed JSON responses) | Mock | Mock (template commentary fallback) |
| `fetch` / network | Mock (`vi.fn` or `msw`) | Mock (external only) | Real |
| `crypto.randomUUID` | Mock (deterministic) | Real | Real |
| `SeededRNG` | Real (with fixed seed) | Real (with fixed seed) | Real |
| `Date.now` / timers | Mock (`vi.useFakeTimers`) | Real | Real |
| `localStorage` | Mock (`vi.stubGlobal`) | Real | Real (browser) |

**REQ-TEST-006**: Pure logic modules (Layer 1 per Section 3.4) MUST be testable with **zero mocks**. If a Layer 1 module requires mocking to test, it has an incorrect dependency that violates the architecture and must be refactored. This is structurally enforced: Layer 1 has no I/O, no browser APIs, and no external service calls. Tests call functions directly with known inputs and assert outputs.

**REQ-TEST-007**: External service mocks MUST return realistic data matching actual API response shapes:
- Claude API mocks: Valid JSON matching the expected response structure with realistic commentary text
- Supabase mocks: Proper `{ data, error }` tuples matching `@supabase/supabase-js` return types
- Mock data MUST be defined in `tests/fixtures/` (not inline in test files) and shared across test suites
- Error mocks must cover all error categories from Section 15.8.1 (each `ErrorCategory` must have at least one mock scenario)

### 17.4 Test Fixtures & Data Strategy

**REQ-TEST-008**: Test fixture files in `tests/fixtures/` provide deterministic, pre-built test data:

| Fixture File | Contents | Used By |
|---|---|---|
| `sample-players.json` | 10 pre-built `PlayerCard` objects covering all archetypes (power, speed, contact, standard) with known card values | Card generator output validation, simulation input, draft tests |
| `sample-cards.json` | 5 complete 35-element card arrays with documented expected outcome distributions per card value | OutcomeTable lookup tests, plate appearance resolution tests |
| `sample-game-state.json` | Mid-game `GameState` snapshot: inning 5, runners on 1st and 3rd, 1 out, score 3-2 | Baserunner advancement tests, defense resolution tests, game state machine tests |
| `sample-outcomes.json` | 20 pre-computed `PlateAppearanceResult` objects with known RNG seeds and expected outcomes | End-to-end simulation verification, regression tests |
| `mini-lahman/` | Subset of Lahman CSV data: ~50 players from 1971 season (People.csv, Batting.csv, Pitching.csv, Fielding.csv) | CSV parser tests, card generator integration tests, player pool assembly tests |

**REQ-TEST-009**: Fixture generation and maintenance rules:
- Fixtures are **static JSON files** committed to the repository, NOT generated at test runtime. This ensures tests are deterministic regardless of environment.
- Every fixture file includes a `_meta` object at the top level documenting: which tests use it, which REQ-* requirements it validates, the RNG seed used to generate the data (if applicable), and the date generated.
- The `mini-lahman/` subset is extracted from real Lahman Database CSV files to preserve real statistical distributions. It includes a mix of pitchers and batters with varied stat profiles.
- When the `PlayerCard` or `GameState` TypeScript interfaces change, all affected fixtures MUST be regenerated and validated against the new interface. Vitest type-checking will catch shape mismatches.

### 17.5 Requirement Traceability

**REQ-TEST-010**: Every numbered requirement (REQ-*) in this SRD MUST have at least one test that explicitly validates it. Tests reference their target requirement in the Vitest `describe` block name:

```typescript
describe('REQ-SIM-003: OutcomeTable 36-row lookup', () => {
  it('returns a valid OutcomeCategory for every card value 0-42', () => {
    // ... test implementation
  });

  it('uses cumulative distribution for O(log n) lookup (REQ-NFR-009)', () => {
    // ... test implementation
  });

  it('matches the 36-row IDT.OBJ data from APBA reverse engineering', () => {
    // ... test implementation
  });
});
```

This naming convention enables `grep -r "REQ-SIM-003" tests/` to instantly find all tests validating a given requirement.

**REQ-TEST-011**: Maintain a requirement-to-test traceability table in `tests/TRACEABILITY.md`. This file maps every REQ-* identifier to its validating test file(s) and `describe` block(s). Example format:

```markdown
| Requirement | Test File | Describe Block |
|---|---|---|
| REQ-SIM-003 | tests/unit/lib/simulation/outcome-table.test.ts | REQ-SIM-003: OutcomeTable 36-row lookup |
| REQ-NFR-007 | tests/unit/lib/rng/seeded-rng.test.ts | REQ-NFR-007: Deterministic simulation |
| REQ-ERR-003 | tests/integration/api-error-envelope.test.ts | REQ-ERR-003: API error response envelope |
```

Update this file whenever new tests or requirements are added. This is a **manual documentation practice** verified in PR reviews -- CI does not enforce it automatically.

### 17.6 Performance & Benchmark Tests

**REQ-TEST-012**: Performance benchmarks validate NFR targets. Benchmarks run as a separate Vitest suite using `vitest bench`:

| Target NFR | Benchmark Name | Pass Criteria | Test Method |
|---|---|---|---|
| REQ-NFR-001 | Single game simulation | p95 < 500ms | Simulate 100 games with seeded RNG, measure each, assert 95th percentile < 500ms |
| REQ-NFR-002 | Full season simulation | Total < 60s | Simulate 1,296 games (162 x 8 matchups) with mini-Lahman rosters, assert wall-clock time < 60s |
| REQ-NFR-003 | CSV parse + card generation | Total < 10s | Parse full Lahman Batting.csv (~110,000 rows) and generate PlayerCards, assert < 10s |
| REQ-NFR-007 | Simulation determinism | Bitwise identical | Simulate the same game with the same seed 10 times, assert all 10 `GameResult` objects are deeply equal |
| REQ-NFR-009 | OutcomeTable lookup throughput | 10,000 lookups < 1ms | Pre-compute cumulative distribution, perform 10,000 weighted lookups, assert total < 1ms |

**REQ-TEST-013**: Benchmark tests run in CI on every PR but are **non-blocking** (report-only, do not fail the build). Benchmark results are environment-sensitive (CI runner vs. local machine); only the relative trend matters. Flag performance regressions exceeding 20% from the previous baseline as PR warnings.

**REQ-TEST-014**: The determinism test (REQ-NFR-007 validation) is the sole exception: it IS **blocking**. If two simulation runs with the same seed produce different `GameResult` objects, CI MUST fail immediately. This guards against accidental introduction of non-deterministic operations (`Math.random()`, `Date.now()`, unordered `Map`/`Set` iteration, `Promise.all` execution order dependency, or `Object.keys` ordering assumptions).

### 17.7 CI/CD Test Configuration

**REQ-TEST-015**: The GitHub Actions CI pipeline (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request. Pipeline stages:

```
Step 1: npm ci                                              [install dependencies]
Step 2: eslint . && tsc --noEmit                            [lint + type-check, parallel]
Step 3: vitest run --coverage                               [unit + integration tests, parallel with Step 2]
Step 4: vitest bench                                        [benchmarks, after Step 3]
Step 5: playwright test                                     [E2E tests, after Step 3, test Supabase project]
Step 6: Coverage threshold check + report upload            [after Step 3]
```

Steps 2 and 3 run in parallel to reduce CI wall-clock time. Steps 4-6 depend on Step 3 completing successfully.

**REQ-TEST-016**: Vitest configuration requirements (`vitest.config.ts`):
- **Test timeout**: 10 seconds per test (default). Override to 60 seconds for simulation integration tests via `testTimeout` in specific test files.
- **Test isolation**: Each test file runs in its own worker thread (Vitest default pool: `forks`). This prevents shared state leakage between test files.
- **Coverage provider**: `v8` (native V8 coverage, faster than `istanbul`).
- **Coverage reporters**: `text` (console summary), `lcov` (CI upload for coverage visualization), `json-summary` (machine-readable for threshold check).
- **Globals**: Enabled -- `describe`, `it`, `expect`, `vi` available without explicit import.
- **Setup file**: `tests/setup.ts` for shared configuration: global mock setup, test environment initialization, custom matchers if needed.
- **Path aliases**: Mirror `tsconfig.json` path aliases (`@lib/*`, `@components/*`, etc.) via `resolve.alias` so test imports match source imports.

**REQ-TEST-017**: Playwright configuration requirements (`playwright.config.ts`):
- **Browsers**: Chromium only for CI speed. Add Firefox and WebKit in Phase 9 (Performance & Polish).
- **Base URL**: `http://localhost:5173` (Vite dev server, auto-started via Playwright `webServer` configuration).
- **Test timeout**: 30 seconds per test.
- **Retries**: 1 retry on CI (`process.env.CI ? 1 : 0`). Zero retries locally for fast feedback.
- **Screenshots**: Captured on test failure only (`screenshot: 'only-on-failure'`).
- **Test database**: Dedicated Supabase test project (separate from development). Seeded with known data before E2E suite runs.

**REQ-TEST-018**: Required npm scripts in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:bench": "vitest bench",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:ci": "vitest run --coverage && vitest bench && playwright test"
  }
}
```

- `test` -- Run all unit and integration tests once (CI mode, no watch).
- `test:watch` -- Run Vitest in watch mode for development (re-runs on file change).
- `test:coverage` -- Run tests with coverage collection and report generation.
- `test:bench` -- Run performance benchmark suite only.
- `test:e2e` -- Run Playwright E2E tests (requires running dev server).
- `test:e2e:ui` -- Run Playwright in interactive UI mode for debugging E2E tests.
- `test:ci` -- Full CI test pipeline: coverage + benchmarks + E2E sequentially.

---

## 18. State Management Architecture

This section specifies the concrete state shapes, action patterns, selector strategy, persistence configuration, cache invalidation rules, Supabase Realtime integration, initialization lifecycle, and development tooling for the 5 Zustand stores defined in Section 3.3. All stores reside at Layer 4 (`src/stores/`) and follow the dependency rules from REQ-ARCH-002.

### 18.1 Store Slice Design

**REQ-STATE-001**: Each Zustand store exports a typed state interface and a corresponding `create` call. Store state interfaces are defined in the store file itself (Layer 4 concern that references Layer 0 types). Every field must have an explicit TypeScript type; `any` and `unknown` are prohibited in store definitions.

The five store interfaces:

```typescript
// === authStore.ts ===
import type { AppError } from '@lib/types/errors';

interface AuthUser {
  readonly id: string;
  readonly email: string;
}

interface AuthSession {
  readonly accessToken: string;
  readonly expiresAt: number;        // Unix timestamp (seconds)
}

interface AuthState {
  // State
  user: AuthUser | null;
  session: AuthSession | null;
  isInitialized: boolean;            // True after first auth check completes
  error: AppError | null;

  // Actions
  setSession: (session: AuthSession | null) => void;
  clearAuth: () => void;
  setError: (error: AppError | null) => void;
}
```

```typescript
// === leagueStore.ts ===
import type { AppError } from '@lib/types/errors';

type LeagueStatus = 'setup' | 'drafting' | 'regular_season' | 'playoffs' | 'completed';

interface LeagueSummary {
  readonly id: string;
  readonly name: string;
  readonly commissionerId: string;
  readonly inviteKey: string;
  readonly teamCount: number;
  readonly yearRangeStart: number;
  readonly yearRangeEnd: number;
  readonly injuriesEnabled: boolean;
  readonly status: LeagueStatus;
  readonly currentDay: number;
}

interface TeamSummary {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly ownerId: string | null;    // null = CPU-controlled team
  readonly managerProfile: string;
  readonly leagueDivision: 'AL' | 'NL';
  readonly division: string;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
}

interface DivisionStandings {
  readonly leagueDivision: 'AL' | 'NL';
  readonly division: string;
  teams: TeamSummary[];               // Sorted by wins DESC
}

interface ScheduleDay {
  readonly dayNumber: number;
  games: ScheduleGameSummary[];
}

interface ScheduleGameSummary {
  readonly id: string;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  isComplete: boolean;
  gameLogId: string | null;
}

interface LeagueState {
  // State
  activeLeagueId: string | null;
  league: LeagueSummary | null;
  teams: TeamSummary[];
  standings: DivisionStandings[];
  schedule: ScheduleDay[];
  currentDay: number;
  error: AppError | null;

  // Actions
  setActiveLeague: (leagueId: string) => void;
  fetchLeague: (leagueId: string) => Promise<void>;
  fetchStandings: (leagueId: string) => Promise<void>;
  fetchSchedule: (leagueId: string) => Promise<void>;
  invalidateLeagueCache: () => void;
  clearLeague: () => void;
  setError: (error: AppError | null) => void;
}
```

```typescript
// === rosterStore.ts ===
import type { PlayerCard } from '@lib/types/player';
import type { AppError } from '@lib/types/errors';

interface RosterEntry {
  readonly id: string;                // rosters table PK
  readonly playerId: string;          // Lahman playerID
  readonly playerCard: PlayerCard;    // Full card from JSONB
  rosterSlot: 'starter' | 'bench' | 'rotation' | 'bullpen' | 'closer';
  lineupOrder: number | null;        // 1-9 for starters, null otherwise
  lineupPosition: string | null;     // Defensive position for starters
}

interface LineupUpdate {
  readonly rosterId: string;
  lineupOrder: number | null;
  lineupPosition: string | null;
  rosterSlot: string;
}

interface RosterState {
  // State
  activeTeamId: string | null;
  roster: RosterEntry[];
  isLoading: boolean;
  error: AppError | null;

  // Actions
  fetchRoster: (leagueId: string, teamId: string) => Promise<void>;
  updateLineup: (leagueId: string, teamId: string, lineup: LineupUpdate[]) => Promise<void>;
  invalidateRosterCache: () => void;
  clearRoster: () => void;
  setError: (error: AppError | null) => void;
}
```

```typescript
// === simulationStore.ts ===
import type { AppError } from '@lib/types/errors';

type SimStatus = 'idle' | 'running' | 'completed' | 'error';

interface SimulationProgressUpdate {
  status: SimStatus;
  totalGames: number;
  completedGames: number;
  currentDay: number;
}

interface SimDayResult {
  readonly dayNumber: number;
  games: SimGameResult[];
}

interface SimGameResult {
  readonly gameId: string;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly homeScore: number;
  readonly awayScore: number;
}

interface SimulationState {
  // State
  status: SimStatus;
  totalGames: number;
  completedGames: number;
  currentDay: number;
  results: SimDayResult[];
  error: AppError | null;

  // Actions
  startSimulation: (leagueId: string, days: number | 'season') => Promise<void>;
  updateProgress: (progress: SimulationProgressUpdate) => void;
  completeSimulation: (results: SimDayResult[]) => void;
  resetSimulation: () => void;
  setError: (error: AppError | null) => void;
}
```

```typescript
// === statsStore.ts ===
import type { BattingStats } from '@lib/types/stats';
import type { PitchingStats } from '@lib/types/stats';
import type { AppError } from '@lib/types/errors';

interface BattingLeaderEntry {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamId: string;
  stats: BattingStats;
}

interface PitchingLeaderEntry {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamId: string;
  stats: PitchingStats;
}

interface TeamStatEntry {
  readonly teamId: string;
  readonly teamName: string;
  runsScored: number;
  runsAllowed: number;
  teamBA: number;
  teamERA: number;
  teamOBP: number;
  teamSLG: number;
  totalHR: number;
  totalSB: number;
  totalErrors: number;
  pythagoreanWinPct: number;
}

interface StatsPagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;                   // Fixed at 50 per REQ-NFR-019
}

interface StatsState {
  // State
  battingLeaders: BattingLeaderEntry[];
  pitchingLeaders: PitchingLeaderEntry[];
  teamStats: TeamStatEntry[];
  pagination: StatsPagination;
  isLoading: boolean;
  error: AppError | null;

  // Actions
  fetchBattingLeaders: (leagueId: string, page: number, sortBy: string) => Promise<void>;
  fetchPitchingLeaders: (leagueId: string, page: number, sortBy: string) => Promise<void>;
  fetchTeamStats: (leagueId: string) => Promise<void>;
  invalidateStatsCache: () => void;
  clearStats: () => void;
  setError: (error: AppError | null) => void;
}
```

**REQ-STATE-002**: Store summary:

| Store | Primary Concern | Persisted | Realtime | Key Hook Consumer |
|---|---|---|---|---|
| `authStore` | User session, JWT | No (Supabase Auth SDK manages its own `sb-*` localStorage keys) | No | `useAuth` |
| `leagueStore` | Active league metadata, teams, standings, schedule | Yes | No (polled on sim complete) | `useLeague` |
| `rosterStore` | Active team roster and lineup | Yes | No | `useTeam` |
| `simulationStore` | Simulation progress and batch results | No (transient) | Yes (Supabase Realtime) | `useSimulation`, `useRealtimeProgress` |
| `statsStore` | Paginated stat leaders | Yes | No | Feature pages directly |

### 18.2 Action Patterns

**REQ-STATE-003**: Store actions follow these naming conventions:

| Convention | Pattern | Example |
|---|---|---|
| Async fetch | `fetch<Entity>` | `fetchRoster(leagueId, teamId)` |
| Synchronous set | `set<Field>` | `setSession(session)`, `setError(error)` |
| Cache clear | `invalidate<Store>Cache` | `invalidateLeagueCache()` |
| Full reset | `clear<Store>` | `clearLeague()`, `clearRoster()` |
| Realtime update | `update<Entity>` | `updateProgress(progress)` |
| Async mutation | `<verb><Entity>` | `startSimulation(...)`, `updateLineup(...)` |

**REQ-STATE-004**: Async actions in stores must follow this pattern:

1. Set `isLoading: true` (or update `status` for simulationStore).
2. Call the corresponding Layer 3 service function (e.g., `leagueService.getStandings(leagueId)`). Stores never call Layer 1 pure logic or Layer 2 API functions directly (per REQ-ARCH-002).
3. On success: update state with the response data, set `error: null`.
4. On failure: catch the `AppError` thrown by the service, store it in `error`. Do **not** clear existing cached data -- stale data remains visible with an error overlay (per REQ-ERR-015 fallback behavior and CLAUDE.md Rule 3 "loud and proud").
5. Set `isLoading: false` / update `status`.

```typescript
// Pattern example (leagueStore.fetchStandings):
fetchStandings: async (leagueId: string) => {
  try {
    const standings = await leagueService.getStandings(leagueId);
    set({ standings, error: null });
  } catch (err) {
    set({ error: err as AppError });
    // Existing cached standings remain in state as fallback
  }
}
```

**REQ-STATE-005**: Use `immer` middleware for stores with nested state updates to avoid manual spread-copy boilerplate and prevent accidental mutation:

| Store | `immer` Required | Reason |
|---|---|---|
| `authStore` | No | Flat state, full replacement only |
| `leagueStore` | Yes | Nested standings and schedule array mutations |
| `rosterStore` | Yes | Nested roster entries with lineup field mutations |
| `simulationStore` | No | Flat progress fields, full result array replacement |
| `statsStore` | No | Full array replacement on each fetch |

### 18.3 Selector Patterns

**REQ-STATE-006**: Components must use atomic selectors to subscribe to individual state fields. Never subscribe to the entire store object, as this causes re-renders on every state change:

```typescript
// CORRECT: atomic selector -- re-renders only when standings changes
const standings = useLeagueStore((s) => s.standings);

// INCORRECT: subscribes to entire store -- re-renders on any state change
const store = useLeagueStore();
```

**REQ-STATE-007**: Derived state that requires computation from multiple store fields must be computed in Layer 5 hooks using `useMemo`, not in the store itself. Stores hold normalized server data; hooks compose and derive.

| Derived Value | Source Store(s) | Computed In | Example |
|---|---|---|---|
| Current user's team | `authStore.user`, `leagueStore.teams` | `useTeam` hook | `teams.find(t => t.ownerId === user.id)` |
| Is commissioner | `authStore.user`, `leagueStore.league` | `useLeague` hook | `league.commissionerId === user.id` |
| Simulation progress % | `simulationStore.completedGames`, `.totalGames` | `useSimulation` hook | `(completedGames / totalGames) * 100` |
| Derived batting stats (BA, OBP, SLG, OPS) | `statsStore.battingLeaders` | Components at render time | Computed per REQ-STS-002 (not stored) |

```typescript
// useTeam hook (Layer 5) -- composes authStore + leagueStore + rosterStore
function useTeam() {
  const user = useAuthStore((s) => s.user);
  const teams = useLeagueStore((s) => s.teams);
  const roster = useRosterStore((s) => s.roster);
  const error = useRosterStore((s) => s.error);

  const myTeam = useMemo(
    () => teams.find((t) => t.ownerId === user?.id) ?? null,
    [teams, user?.id]
  );

  return { myTeam, roster, error };
}
```

### 18.4 Persistence Strategy

**REQ-STATE-008**: Zustand `persist` middleware configuration per REQ-NFR-013. Each persisted store uses a unique localStorage key namespaced with a `bl-` prefix. Only the subset of state that is safe and useful to cache is persisted; actions, loading flags, and errors are excluded via `partialize`:

| Store | localStorage Key | Persisted Fields | Excluded Fields |
|---|---|---|---|
| `authStore` | Not persisted | -- | All (Supabase Auth SDK manages `sb-*` keys) |
| `leagueStore` | `bl-league-v1` | `activeLeagueId`, `league`, `teams`, `standings`, `schedule`, `currentDay` | `error` |
| `rosterStore` | `bl-roster-v1` | `activeTeamId`, `roster` | `isLoading`, `error` |
| `simulationStore` | Not persisted | -- | All (transient progress, no value in persisting) |
| `statsStore` | `bl-stats-v1` | `battingLeaders`, `pitchingLeaders`, `teamStats`, `pagination` | `isLoading`, `error` |

Key format: `bl-<store>-v<schemaVersion>`. The `v1` suffix enables schema migration (see REQ-STATE-009).

**REQ-STATE-009**: Persist middleware must include a `version` number and a `migrate` function. When the store state shape changes in a code update, increment the version. The `migrate` function transforms the previous shape to the new shape, or returns `undefined` to discard stale cache and start fresh. This prevents runtime errors from deserialized state that no longer matches the current interface.

```typescript
// Example leagueStore persistence config:
persist(storeCreator, {
  name: 'bl-league-v1',
  version: 1,
  partialize: (state) => ({
    activeLeagueId: state.activeLeagueId,
    league: state.league,
    teams: state.teams,
    standings: state.standings,
    schedule: state.schedule,
    currentDay: state.currentDay,
  }),
  migrate: (persisted, version) => {
    if (version === 0) return undefined; // discard v0 cache
    return persisted;
  },
})
```

**REQ-STATE-010**: Per REQ-ERR-018, if `localStorage` is unavailable (private browsing, quota exceeded, or `SecurityError`), the `persist` middleware must fall back to memory-only storage. Implement a `createSafeStorage` helper in `src/stores/storage-factory.ts` that wraps `localStorage` in a try-catch and returns an in-memory `StateStorage` fallback. Display a WARN-severity `ErrorBanner` notification: "Browser storage unavailable -- data will not persist between sessions."

```typescript
// src/stores/storage-factory.ts
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const memoryStore = new Map<string, string>();
const memoryStorage: StateStorage = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => { memoryStore.set(key, value); },
  removeItem: (key) => { memoryStore.delete(key); },
};

export function createSafeStorage(): ReturnType<typeof createJSONStorage> {
  try {
    const testKey = '__bl_storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return createJSONStorage(() => localStorage);
  } catch {
    console.warn('[stores] localStorage unavailable, using memory-only storage');
    return createJSONStorage(() => memoryStorage);
  }
}
```

### 18.5 Cache Invalidation

**REQ-STATE-011**: Cached store data becomes stale when server state changes. The following table defines every invalidation trigger and the stores it affects (per REQ-NFR-013):

| Trigger Event | Stores Invalidated | Invalidation Action | Triggered By |
|---|---|---|---|
| Simulation completes | `leagueStore`, `rosterStore`, `statsStore` | `invalidate*Cache()` then refetch | `simulationStore.completeSimulation` callback |
| Roster change (lineup edit, trade) | `rosterStore`, `statsStore` | `invalidateRosterCache()` then refetch | `rosterStore.updateLineup` success |
| Draft completes | `leagueStore`, `rosterStore` | Full cache clear + refetch (status changes to `regular_season`) | Draft completion in `useLeague` hook |
| League status change | `leagueStore` | Refetch league metadata | Any status-changing API response |
| Season archived | `leagueStore`, `statsStore` | Full clear | Archive API success |
| User switches active league | All cached stores | `clearLeague()`, `clearRoster()`, `clearStats()` | `leagueStore.setActiveLeague(newId)` |
| User logs out | All stores | Full state reset on every store | `authStore.clearAuth()` triggers cascade |

**REQ-STATE-012**: The `invalidate<Store>Cache` actions follow a stale-while-revalidate pattern: clear the persisted localStorage entry but do NOT clear in-memory state immediately. Mark the cache as stale and trigger a background refetch. The component continues to render cached (stale) data until the fresh response arrives. If the refetch fails, the stale data remains visible with an error banner (per REQ-ERR-015 fallback behavior).

### 18.6 Realtime Subscriptions

**REQ-STATE-013**: Supabase Realtime integration is handled in Layer 5 hooks, not in stores. Stores remain agnostic to the transport mechanism. The `useRealtimeProgress` hook subscribes to the `simulation_progress` Supabase Realtime channel and pushes updates into `simulationStore` via the `updateProgress` action:

```
Supabase Realtime (WebSocket)
    |
    v
useRealtimeProgress (Layer 5 hook)
    |
    v
simulationStore.updateProgress() (Layer 4 store action)
    |
    v
UI components (Layer 6/7, via atomic selectors)
```

The `useRealtimeProgress` hook:
- Subscribes to the `simulation_progress` table filtered by `league_id` via `supabase.channel('sim-progress-<leagueId>').on('postgres_changes', ...)`.
- On each Realtime event, calls `simulationStore.getState().updateProgress(payload)`.
- Returns a cleanup function that unsubscribes from the channel on unmount.
- On WebSocket disconnect: falls back to polling `GET /api/leagues/:id/simulate/progress` every 3 seconds (per REQ-ERR-017 graceful degradation). Displays WARN banner: "Live updates unavailable -- refreshing periodically."

**REQ-STATE-014**: When simulation status transitions to `'completed'` or `'error'`, the `useRealtimeProgress` hook must trigger cache invalidation on `leagueStore`, `rosterStore`, and `statsStore` (per REQ-STATE-011). This ensures standings, schedule, roster, and stats reflect the newly simulated games.

### 18.7 Store Initialization & Auth Lifecycle

**REQ-STATE-015**: Store hydration and auth lifecycle follows this sequence on application mount:

```
App mount (main.tsx)
  |
  +--> Zustand persist rehydrates leagueStore, rosterStore, statsStore from localStorage
  |    (immediate, synchronous -- cached data available for first render)
  |
  +--> Supabase Auth onAuthStateChange listener fires
       |
       +-- Session found (returning user):
       |     1. authStore.setSession(session)
       |     2. authStore.isInitialized = true
       |     3. If leagueStore.activeLeagueId exists (from persist):
       |        - Background refetch: leagueStore.fetchLeague(id)
       |        - Background refetch: leagueStore.fetchStandings(id)
       |        - If rosterStore.activeTeamId exists:
       |          - Background refetch: rosterStore.fetchRoster(leagueId, teamId)
       |     4. Router allows navigation to authenticated routes
       |
       +-- No session (anonymous / first visit):
       |     1. authStore.clearAuth()
       |     2. authStore.isInitialized = true
       |     3. Clear all cached stores (league, roster, stats)
       |     4. Router redirects to splash page
       |
       +-- Session expired / token refresh failed:
             1. authStore.clearAuth()
             2. Clear all cached stores
             3. Display ERROR banner: "Session expired. Please log in again."
             4. Router redirects to splash page
```

No store fetch action may execute before `authStore.isInitialized` is `true`. Layer 3 services require a valid access token (from `authStore.session.accessToken`) to authenticate Supabase requests. The API client reads the token from the auth store at request time.

### 18.8 Development Tooling

**REQ-STATE-016**: Enable Zustand `devtools` middleware in development builds for all 5 stores. The devtools middleware integrates with the Redux DevTools browser extension, providing state inspection, action logging, and time-travel debugging.

Configuration:
- Wrap each store with `devtools` middleware only in development (`import.meta.env.DEV`).
- Each store has a unique `name` in devtools: `'authStore'`, `'leagueStore'`, `'rosterStore'`, `'simulationStore'`, `'statsStore'`.
- Middleware stacking order: `devtools(persist(immer(storeCreator)))` for stores using all three, `devtools(persist(storeCreator))` for stores without `immer`, `devtools(storeCreator)` for non-persisted stores.
- Strip devtools from production builds via conditional application.

```typescript
// Middleware composition example for leagueStore:
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useLeagueStore = create<LeagueState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // ... state and actions
      })),
      { name: 'bl-league-v1', storage: createSafeStorage(), /* ... */ }
    ),
    { name: 'leagueStore', enabled: import.meta.env.DEV }
  )
);
```

---

## 19. Component Architecture

This section specifies the theme system, shared component prop contracts, routing architecture, feature page composition patterns, responsive layout strategy, animation approach, and accessibility requirements for the React frontend. All components reside at Layer 6 (`src/components/`) or Layer 7 (`src/features/`) per the dependency rules in REQ-ARCH-002. Shared components are props-driven with no direct data fetching; feature modules compose hooks (Layer 5) and shared components into full pages.

### 19.1 Theme System & Design Tokens

**REQ-COMP-001**: All design tokens from REQ-UI-001 (colors), REQ-UI-002 (typography), and REQ-UI-003 (layout) MUST be defined as Tailwind theme extensions in `tailwind.config.ts`. Additionally, define CSS custom properties in `src/styles/globals.css` so that non-Tailwind contexts (third-party libraries, CSS animations, dynamic JS styling) can reference the same tokens. The Tailwind config is the single source of truth; the CSS custom properties mirror it.

Tailwind theme extension (in `tailwind.config.ts`):

```typescript
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'old-lace':     '#FDF5E6',  // bg-primary (REQ-UI-001)
        'ballpark':     '#1B4D3E',  // color-primary
        'stitch-red':   '#B22222',  // color-accent
        'sandstone':    '#D2B48C',  // color-secondary
        'ink':          '#2C2C2C',  // body text
        'muted':        '#6B7280',  // secondary text
        'playoff-gold': '#CFB53B',  // playoff accent
        'playoff-dark': '#1A1A2E',  // playoff background
      },
      fontFamily: {
        headline: ['"Roboto Slab"', 'Georgia', '"Times New Roman"', 'serif'],
        stat:     ['"JetBrains Mono"', 'Consolas', '"Courier New"', 'monospace'],
        body:     ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
                   'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      spacing: {
        'gutter':    '1rem',     // 16px -- standard content gap
        'gutter-lg': '1.5rem',   // 24px -- section separation
        'gutter-xl': '2rem',     // 32px -- page-level padding
      },
      maxWidth: {
        'ledger': '1200px',      // REQ-UI-003 max-width container
      },
      borderRadius: {
        'card':   '0.375rem',    // 6px -- card corners
        'button': '0.25rem',     // 4px -- button corners
      },
      boxShadow: {
        'ledger': '0 2px 8px rgba(0, 0, 0, 0.12)',          // page container
        'card':   '0 1px 4px rgba(0, 0, 0, 0.08)',          // cards and panels
        'stamp':  '2px 2px 0px rgba(178, 34, 34, 0.3)',     // stamp effect
      },
      borderWidth: {
        'spine': '4px',          // book-spine left border (REQ-UI-003)
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('postseason', '[data-theme="postseason"] &');
    }),
  ],
};

export default config;
```

CSS custom properties (in `src/styles/globals.css`, after Tailwind directives):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-old-lace:     #FDF5E6;
    --color-ballpark:     #1B4D3E;
    --color-stitch-red:   #B22222;
    --color-sandstone:    #D2B48C;
    --color-ink:          #2C2C2C;
    --color-muted:        #6B7280;
    --color-playoff-gold: #CFB53B;
    --color-playoff-dark: #1A1A2E;

    --font-headline: 'Roboto Slab', Georgia, 'Times New Roman', serif;
    --font-stat:     'JetBrains Mono', Consolas, 'Courier New', monospace;
    --font-body:     system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
                     Roboto, 'Helvetica Neue', Arial, sans-serif;

    --max-width-ledger: 1200px;
    --border-spine:     4px;

    --shadow-ledger: 0 2px 8px rgba(0, 0, 0, 0.12);
    --shadow-card:   0 1px 4px rgba(0, 0, 0, 0.08);
  }

  html {
    background-color: var(--color-old-lace);
    color: var(--color-ink);
    font-family: var(--font-body);
  }
}
```

**REQ-COMP-002**: Postseason theme variant. When the league status transitions to `'playoffs'` (per REQ-SCH-008), the feature layer adds a `data-theme="postseason"` attribute to the `<html>` element. Tailwind utilities remain unchanged; the variant is implemented via CSS custom property overrides scoped to the data attribute:

```css
@layer base {
  [data-theme="postseason"] {
    --color-old-lace:   #1A1A2E;   /* dark background */
    --color-ballpark:   #CFB53B;   /* gold replaces green */
    --color-sandstone:  #3A3A5C;   /* muted purple-gray */
    --color-ink:        #F5F5F5;   /* light text */
    --color-muted:      #9CA3AF;   /* lighter secondary text */
  }
}
```

The `postseason:` Tailwind variant prefix (configured in the plugin above) allows components to apply explicit postseason-only styling where the CSS variable overrides are insufficient: `postseason:bg-playoff-dark postseason:text-playoff-gold`.

The `useLeague` hook (Layer 5) reads `league.status` from `leagueStore` and sets the `data-theme` attribute on `document.documentElement` via a `useEffect`. When status is `'playoffs'`, set `data-theme="postseason"`; otherwise, remove the attribute. This keeps the theme toggle reactive and centralized in a single hook.

### 19.2 Shared Component Prop Contracts

**REQ-COMP-003**: All shared components in `src/components/` (Layer 6) MUST define their props as a named TypeScript interface exported from the component file. Props interfaces follow these conventions:

- All callback props use the `on<Event>` naming convention (e.g., `onSort`, `onPageChange`, `onConfirm`)
- All data props use `readonly` modifier to prevent accidental mutation in child components
- Children are explicitly typed (`ReactNode`) only when the component accepts arbitrary children; otherwise the `children` prop is omitted
- Optional props have explicit defaults documented via destructuring defaults in the component function signature
- No `any` type in prop interfaces; use `unknown` with type guards when the data shape is genuinely polymorphic
- Prop interfaces are exported as named exports alongside the default-exported component

**REQ-COMP-004**: Prop interfaces for architecturally significant shared components. Simpler components (Input, Select, Toggle, ConfirmDialog, Footer, ProgressBar, Scoreboard) follow the conventions from REQ-COMP-003 but their interfaces are self-evident from HTML semantics and are not specified here.

All interfaces below are defined in their respective component files under `src/components/`.

#### Layout Components

```typescript
// src/components/layout/AppShell.tsx
interface AppShellProps {
  readonly children: ReactNode;
}
```

AppShell implementation requirements:
- Renders Header at the top, Footer at the bottom, children in between
- Applies `max-w-ledger` (1200px) centered container with `shadow-ledger` and `border-l-spine border-ballpark` (book-spine left border per REQ-UI-003)
- Wraps children in a React Error Boundary (REQ-ERR-010)
- Includes a skip-to-content link as the first focusable element (REQ-COMP-013)
- Sets `<main id="main-content">` around children for the skip link target

```typescript
// src/components/layout/Header.tsx
interface HeaderProps {
  readonly leagueName: string | null;
  readonly leagueStatus: LeagueStatus | null;
  readonly userName: string | null;
  readonly isCommissioner: boolean;
  readonly onNavigate: (path: string) => void;
  readonly onLogout: () => void;
}
```

Header implementation requirements:
- Renders league name (when active) in `font-headline`
- Navigation links: Dashboard, Roster, Stats, Standings (visible only when league active)
- User menu with logout action
- Applies `postseason:` variant styling when `data-theme="postseason"` is active
- All navigation links are keyboard-accessible `<a>` or `<button>` elements

#### Data Display Components

```typescript
// src/components/data-display/StatTable.tsx
interface StatColumn<T> {
  readonly key: keyof T & string;
  readonly label: string;
  readonly sortable: boolean;
  readonly align: 'left' | 'right';
  readonly format?: (value: T[keyof T]) => string;
}

interface StatTableProps<T extends Record<string, unknown>> {
  readonly columns: readonly StatColumn<T>[];
  readonly data: readonly T[];
  readonly sortBy: string;
  readonly sortOrder: 'asc' | 'desc';
  readonly onSort: (columnKey: string) => void;
  readonly onRowClick?: (row: T) => void;
  readonly emptyMessage?: string;
  readonly isLoading?: boolean;
  readonly highlightRowPredicate?: (row: T) => boolean;
}
```

StatTable implementation requirements:
- Renders data in `font-stat` (JetBrains Mono) for column alignment (REQ-UI-002)
- Uses virtualized scrolling for datasets exceeding 50 visible rows (REQ-NFR-004)
- Column headers are clickable `<button>` elements when `sortable: true`, with ARIA sort indicators (`aria-sort`)
- Horizontal scroll on narrow viewports (REQ-COMP-010) with sticky first column
- Highlighted rows use `bg-sandstone/30` background
- Default `emptyMessage`: "No data available"
- Default `isLoading`: `false`

```typescript
// src/components/data-display/StandingsTable.tsx
interface StandingsTableProps {
  readonly standings: readonly DivisionStandings[];
  readonly userTeamId: string | null;
  readonly onTeamClick: (teamId: string) => void;
}
```

```typescript
// src/components/data-display/Pagination.tsx
interface PaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly isDisabled?: boolean;
}
```

Pagination implementation requirements:
- Renders Previous/Next buttons and page number indicator
- Disables Previous on page 1, Next on last page
- All controls are `<button>` elements with `aria-label` attributes
- Integrates with server-side pagination (REQ-NFR-019, REQ-API-005)
- Default `isDisabled`: `false` (set to `true` during loading)

#### Feedback Components

```typescript
// src/components/feedback/ErrorBanner.tsx
interface ErrorBannerProps {
  readonly severity: 'error' | 'warn' | 'info';
  readonly message: string;
  readonly onDismiss?: () => void;
  readonly autoDismissMs?: number | null;
}
```

ErrorBanner implementation requirements:
- Severity-based styling per REQ-ERR-012: error = `bg-stitch-red/10 border-stitch-red` (persistent), warn = amber (8s auto-dismiss), info = neutral (5s auto-dismiss)
- Auto-dismiss timer uses `setTimeout` with cleanup on unmount
- Dismiss button is a `<button>` with `aria-label="Dismiss notification"`
- Uses `role="alert"` for error severity, `role="status"` for warn/info (screen reader announcement)
- If `onDismiss` is omitted, no dismiss button is rendered
- If `autoDismissMs` is `null`, the banner is persistent (requires explicit dismissal)

```typescript
// src/components/feedback/LoadingLedger.tsx
interface LoadingLedgerProps {
  readonly message?: string;
}
```

LoadingLedger default `message`: "Processing Ledger..."

```typescript
// src/components/feedback/TypewriterText.tsx
interface TypewriterTextProps {
  readonly text: string;
  readonly speed?: number;
  readonly onComplete?: () => void;
}
```

TypewriterText default `speed`: `40` (ms per character)

#### Baseball Components

```typescript
// src/components/baseball/DiamondField.tsx
interface FieldPosition {
  readonly rosterId: string;
  readonly playerName: string;
  readonly position: string;   // 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH'
}

interface DiamondFieldProps {
  readonly positions: readonly FieldPosition[];
  readonly baseRunners?: BaseState;
  readonly outs?: number;
  readonly isEditable: boolean;
  readonly onPositionClick?: (position: string) => void;
  readonly onPlayerDrop?: (rosterId: string, position: string) => void;
}
```

DiamondField implementation requirements:
- SVG-based baseball diamond with positioned player names
- When `isEditable` is `true`, positions are drop targets for drag-and-drop (REQ-UI-008). `onPlayerDrop` fires when a drag-and-drop completes; the feature layer handles roster validation.
- When `isEditable` is `false`, positions are static display only (used in GameStateViz)
- Scales proportionally on viewport resize via SVG `viewBox` (REQ-COMP-010)
- Each position is a focusable element with `aria-label` describing the position and assigned player
- `onPlayerDrop` fires when a drag-and-drop completes (feature layer handles validation)

```typescript
// src/components/baseball/PlayerCardDisplay.tsx
interface PlayerCardDisplayProps {
  readonly playerId: string;
  readonly playerName: string;
  readonly seasonYear: number;
  readonly position: string;
  readonly battingStats: {
    readonly BA: number;
    readonly HR: number;
    readonly RBI: number;
    readonly OPS: number;
  } | null;
  readonly pitchingStats: {
    readonly ERA: number;
    readonly W: number;
    readonly L: number;
    readonly WHIP: number;
  } | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}
```

PlayerCardDisplay implementation requirements:
- Renders as a modal overlay (REQ-UI-009) with vintage card border styling
- Stats displayed in `font-stat` (JetBrains Mono)
- Photo placeholder area with silhouette icon
- `battingStats` is `null` for pitchers; `pitchingStats` is `null` for position players
- Modal traps focus while open, returns focus to trigger element on close (REQ-COMP-012)
- Closes on Escape key press and backdrop click
- Uses `role="dialog"` with `aria-modal="true"` and `aria-labelledby` referencing the player name heading

```typescript
// src/components/baseball/LineScore.tsx
interface LineScoreProps {
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly innings: readonly {
    readonly awayRuns: number | null;
    readonly homeRuns: number | null;
  }[];
  readonly homeTotal: { readonly R: number; readonly H: number; readonly E: number };
  readonly awayTotal: { readonly R: number; readonly H: number; readonly E: number };
}
```

```typescript
// src/components/baseball/BaseIndicator.tsx
interface BaseIndicatorProps {
  readonly baseState: BaseState;
  readonly size?: 'sm' | 'md' | 'lg';
}
```

BaseIndicator default `size`: `'md'`

### 19.3 Page Layout & Routing

**REQ-COMP-005**: The application uses React Router v6 with `createBrowserRouter` for client-side routing. Route definitions reside in `src/router.tsx` (per Section 3.3 directory tree). All feature page imports use `React.lazy()` for route-based code splitting per REQ-NFR-017 (initial bundle < 200KB).

Route table:

| Path | Feature Module | Lazy Loaded | Auth Required | Layout |
|---|---|---|---|---|
| `/` | `splash/SplashPage` | No (initial bundle) | No | None (full-page) |
| `/login` | `auth/LoginPage` | No (initial bundle) | No | None (full-page) |
| `/leagues/new` | `league/LeagueConfigPage` | Yes | Yes | AppShell |
| `/leagues/:id/join` | `league/JoinLeaguePage` | Yes | Yes | AppShell |
| `/leagues/:id/dashboard` | `dashboard/DashboardPage` | Yes | Yes | AppShell |
| `/leagues/:id/draft` | `draft/DraftBoardPage` | Yes | Yes | AppShell |
| `/leagues/:id/roster/:tid` | `roster/RosterPage` | Yes | Yes | AppShell |
| `/leagues/:id/stats` | `stats/StatsPage` | Yes | Yes | AppShell |
| `/leagues/:id/games/:gid` | `game-viewer/GameViewerPage` | Yes | Yes | AppShell |
| `/leagues/:id/playoffs` | `playoffs/PlayoffsPage` | Yes | Yes | AppShell |
| `/leagues/:id/archive` | `archive/ArchivePage` | Yes | Yes | AppShell |
| `/leagues/:id/transactions` | `transactions/TransactionsPage` | Yes | Yes | AppShell |
| `*` | 404 fallback | No | No | None |

**REQ-COMP-006**: Auth guard route protection. Implement an `AuthGuard` wrapper component in `src/features/auth/AuthGuard.tsx` (Layer 7, so it can use hooks). The component checks `authStore.isInitialized` and `authStore.user` via the `useAuth` hook:

- While `isInitialized` is `false`: render `<LoadingLedger message="Authenticating..." />`
- When `isInitialized` is `true` and `user` is `null`: redirect to `/login` via `<Navigate to="/login" replace />`
- When `isInitialized` is `true` and `user` is non-null: render `<Outlet />`

The `AuthGuard` resides in `src/features/auth/` (not `src/components/`) because it consumes hooks and accesses store state, which Layer 6 components cannot do per REQ-ARCH-002.

Router structure (in `src/router.tsx`):

```typescript
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import SplashPage from '@features/splash/SplashPage';
import LoginPage from '@features/auth/LoginPage';
import AuthGuard from '@features/auth/AuthGuard';
import AppShell from '@components/layout/AppShell';
import LoadingLedger from '@components/feedback/LoadingLedger';

const LeagueConfigPage = lazy(() => import('@features/league/LeagueConfigPage'));
const JoinLeaguePage = lazy(() => import('@features/league/JoinLeaguePage'));
const DashboardPage = lazy(() => import('@features/dashboard/DashboardPage'));
const DraftBoardPage = lazy(() => import('@features/draft/DraftBoardPage'));
const RosterPage = lazy(() => import('@features/roster/RosterPage'));
const StatsPage = lazy(() => import('@features/stats/StatsPage'));
const GameViewerPage = lazy(() => import('@features/game-viewer/GameViewerPage'));
const PlayoffsPage = lazy(() => import('@features/playoffs/PlayoffsPage'));
const ArchivePage = lazy(() => import('@features/archive/ArchivePage'));
const TransactionsPage = lazy(() => import('@features/transactions/TransactionsPage'));

export const router = createBrowserRouter([
  { path: '/', element: <SplashPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell><Outlet /></AppShell>,
        children: [
          { path: '/leagues/new',
            element: <Suspense fallback={<LoadingLedger />}><LeagueConfigPage /></Suspense> },
          { path: '/leagues/:id/join',
            element: <Suspense fallback={<LoadingLedger />}><JoinLeaguePage /></Suspense> },
          { path: '/leagues/:id/dashboard',
            element: <Suspense fallback={<LoadingLedger />}><DashboardPage /></Suspense> },
          { path: '/leagues/:id/draft',
            element: <Suspense fallback={<LoadingLedger />}><DraftBoardPage /></Suspense> },
          { path: '/leagues/:id/roster/:tid',
            element: <Suspense fallback={<LoadingLedger />}><RosterPage /></Suspense> },
          { path: '/leagues/:id/stats',
            element: <Suspense fallback={<LoadingLedger />}><StatsPage /></Suspense> },
          { path: '/leagues/:id/games/:gid',
            element: <Suspense fallback={<LoadingLedger />}><GameViewerPage /></Suspense> },
          { path: '/leagues/:id/playoffs',
            element: <Suspense fallback={<LoadingLedger />}><PlayoffsPage /></Suspense> },
          { path: '/leagues/:id/archive',
            element: <Suspense fallback={<LoadingLedger />}><ArchivePage /></Suspense> },
          { path: '/leagues/:id/transactions',
            element: <Suspense fallback={<LoadingLedger />}><TransactionsPage /></Suspense> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
```

**REQ-COMP-007**: Each lazy-loaded route MUST be wrapped in both a route-level Error Boundary (per REQ-ERR-010) and `<Suspense>` (for the lazy boundary). The Error Boundary wraps the Suspense so that both chunk-load failures and render errors are caught:

```
<ErrorBoundary fallback={<ErrorFallbackUI />}>
  <Suspense fallback={<LoadingLedger />}>
    <LazyFeaturePage />
  </Suspense>
</ErrorBoundary>
```

Error boundaries are per-feature, not global. If the DraftBoardPage crashes, the user can navigate to the Dashboard without a full page reload. The Error Boundary fallback UI renders the error message (never the stack trace), a "Return to Dashboard" button, and a "Try Again" button (per REQ-ERR-011).

### 19.4 Feature Page Composition Pattern

**REQ-COMP-008**: All feature pages (Layer 7) MUST follow this standard four-phase composition pattern. The pattern enforces consistent loading, error, and data-flow behavior across the application:

```typescript
// Standard feature page skeleton
export default function DashboardPage() {
  // Phase 1: Hook consumption -- subscribe to stores via Layer 5 hooks
  const { league, standings, schedule, isCommissioner,
          error: leagueError, clearError } = useLeague();
  const { status, completedGames, totalGames } = useSimulation();

  // Phase 2: Loading guard -- show LoadingLedger while essential data is absent
  if (!league) {
    return <LoadingLedger message="Loading league data..." />;
  }

  // Phase 3: Error overlay -- show ErrorBanner for non-fatal errors
  //          Fatal errors are caught by the Error Boundary wrapping this route

  // Phase 4: Composition -- shared components receive data as props
  return (
    <div>
      {leagueError && (
        <ErrorBanner
          severity="error"
          message={leagueError.message}
          onDismiss={() => clearError()}
        />
      )}
      <StandingsView standings={standings} />
      <SimulationControls status={status} isCommissioner={isCommissioner} />
    </div>
  );
}
```

Phase descriptions:

1. **Hook consumption**: Call `useLeague()`, `useTeam()`, `useSimulation()`, or `useAuth()`. Never call store hooks directly in feature pages; always go through the Layer 5 composition hooks that provide derived state (per REQ-STATE-007).
2. **Loading guard**: If essential data is `null` (initial load or navigation), render `<LoadingLedger />`. Feature pages never render with `null` data -- they either show loading or the full UI.
3. **Error overlay**: Non-fatal errors from store state are rendered inline via `<ErrorBanner />` above the content. The stale data remains visible beneath the banner (stale-while-revalidate per REQ-STATE-012).
4. **Composition**: Shared components receive data as props. Feature-scoped sub-components (e.g., `SimulationControls`, `StandingsView`) may be co-located in the feature directory and can also consume hooks, but must not cross-import from other feature modules (REQ-ARCH-002).

**REQ-COMP-009**: Feature pages MUST NOT import from `@stores/*` directly. All store access flows through Layer 5 hooks. The data flow chain is:

```
Feature Page (Layer 7)
    |
    +-- useLeague() (Layer 5)     -- reads leagueStore + authStore, derives isCommissioner
    +-- useTeam() (Layer 5)       -- reads rosterStore + authStore + leagueStore, derives myTeam
    +-- useSimulation() (Layer 5) -- reads simulationStore, derives progress percentage
    |
    v
Shared Components (Layer 6) -- receive data as props, no hooks, no stores
```

When to create a feature-scoped sub-component vs. use a shared component:

| Criteria | Shared Component (`src/components/`) | Feature Sub-component (`src/features/<module>/`) |
|---|---|---|
| Used by | 2+ feature modules | Only one feature module |
| Domain logic | None -- generic UI primitive | Contains domain-specific layout or logic |
| Store access | Never (props only) | May consume hooks |
| Examples | StatTable, ErrorBanner, Pagination | SimulationControls, DraftTicker, DiamondView |

If a component starts as feature-scoped and later needs to be used by a second feature, move it to `src/components/` at that time and remove any hook dependencies (pass data as props instead). Per REQ-ARCH-004 (colocation rule in Section 3.6). For non-component artifacts (hooks, types, constants, utilities), see Section 22.

### 19.5 Responsive Layout

**REQ-COMP-010**: The application is **desktop-first** with a single responsive breakpoint at 768px. This is a simulation game primarily used on desktop; tablet and mobile are supported at a functional (not optimal) level per REQ-UI-013.

Tailwind breakpoint usage:
- Default styles target desktop (>= 768px)
- `max-md:` prefix applies styles below 768px (the only breakpoint used)
- No `sm:`, `lg:`, or `xl:` breakpoints are used (keep responsive logic minimal)

Layout behavior by viewport:

| Component | Desktop (>= 768px) | Narrow (< 768px) |
|---|---|---|
| AppShell container | `max-w-ledger` (1200px) centered, `px-gutter-xl` | Full width, `px-gutter` |
| Book-spine border | `border-l-spine border-ballpark` visible | Hidden (`max-md:border-l-0`) |
| Header navigation | Horizontal link row | Collapsed hamburger menu |
| StatTable | Full columns visible, sticky header | Horizontal scroll, sticky first column |
| StandingsTable | All columns visible | Abbreviated columns (Team, W, L, PCT only) |
| DiamondField | Full SVG, ~400px width | Scaled to viewport width, min 280px |
| Dashboard layout | Schedule + Standings side-by-side | Stacked vertically |
| DraftBoard layout | Ticker + Players + Roster in 3 columns | Single column, stacked |
| PlayerCardDisplay modal | Centered, max-width 480px | Full-width with `max-md:mx-4` margin |
| Simulation button group | Horizontal row | 2x2 grid |

DiamondField SVG scaling strategy:
- Use `viewBox` attribute for intrinsic scaling (no pixel dimensions on the `<svg>` element)
- Container constrains width; SVG preserves aspect ratio via `preserveAspectRatio="xMidYMid meet"`
- Player name labels use relative font sizes within the SVG coordinate system

### 19.6 Animation & Transition Patterns

**REQ-COMP-011**: All animations in the application use CSS for performance (no JavaScript animation libraries such as Framer Motion or React Spring). This keeps the initial bundle within the < 200KB target (REQ-NFR-017). Animations fall into three categories:

**Category 1: State transition micro-animations**

Applied via Tailwind `transition-*` utilities on interactive elements:

| Element | Property | Duration | Easing |
|---|---|---|---|
| Buttons (hover/focus) | `background-color`, `border-color` | 150ms | `ease-in-out` |
| Table row (hover) | `background-color` | 100ms | `ease-in` |
| Toggle switch | `transform` (translate) | 200ms | `ease-in-out` |
| Sidebar/panel collapse | `max-height`, `opacity` | 250ms | `ease-out` |
| ErrorBanner (appear) | `opacity`, `transform` (translateY) | 200ms | `ease-out` |
| ErrorBanner (dismiss) | `opacity` | 150ms | `ease-in` |

**Category 2: Signature animations (CSS `@keyframes`)**

Defined in `src/styles/globals.css`:

**LoadingLedger** -- "Processing Ledger..." with pulsing ellipsis:
- Three dots fade in sequence using staggered `animation-delay`
- Text "Processing Ledger" is static; the ellipsis dots cycle through `opacity: 0` to `opacity: 1`
- `@keyframes ledger-pulse` with `opacity` cycling at 1.2s duration, `infinite` iteration

**TypewriterText** -- character-by-character text reveal:
- CSS: `overflow: hidden`, `white-space: nowrap`, `border-right: 2px solid` (blinking cursor via `@keyframes blink`)
- JS: `setInterval` reveals one character at a time by incrementing a `visibleLength` state counter
- The `speed` prop controls the interval delay (default 40ms)
- On completion: remove the cursor border and call `onComplete` callback
- Cleanup: interval cleared on unmount via `useEffect` return

**"SEASON COMPLETED" stamp** (per REQ-SCH-009):
- Initial state: `opacity: 0`, `transform: scale(2) rotate(-15deg)`
- Final state: `opacity: 1`, `transform: scale(1) rotate(-15deg)`
- `@keyframes stamp-slam` with 400ms `cubic-bezier(0.22, 0.61, 0.36, 1)` (decelerating slam)
- Color: `text-stitch-red` with `shadow-stamp`
- Triggered by adding a CSS class when the archive action completes

**Category 3: `prefers-reduced-motion` compliance**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

When the user's OS is set to reduce motion:
- All CSS animations resolve instantly
- TypewriterText renders the full text immediately (skip the character-by-character reveal). Check `window.matchMedia('(prefers-reduced-motion: reduce)')` in the component and skip the interval if matched.
- LoadingLedger shows static dots (no pulse)
- SEASON COMPLETED stamp appears without the slam (instant opacity + rotation)

### 19.7 Accessibility

**REQ-COMP-012**: The application targets **WCAG 2.1 Level AA** compliance. The following requirements apply to all shared components (Layer 6) and feature pages (Layer 7):

**Keyboard navigation:**
- All interactive elements (`<button>`, `<a>`, `<input>`, `<select>`, custom controls) must be reachable via Tab key
- Custom interactive components must implement appropriate keyboard handlers:
  - Toggle: Space or Enter to toggle
  - DiamondField editable positions: Enter or Space to activate, Arrow keys to navigate between positions
  - ConfirmDialog: Enter to confirm, Escape to cancel
- Focus must be visible: default browser focus ring OR custom `focus-visible:ring-2 focus-visible:ring-ballpark` outline. Never use `outline: none` without providing an alternative focus indicator.

**ARIA roles and attributes:**

| Component | ARIA Implementation |
|---|---|
| AppShell | `<header role="banner">`, `<nav role="navigation" aria-label="Main navigation">`, `<main role="main" id="main-content">`, `<footer role="contentinfo">` |
| StatTable | `<table role="grid">`, sortable headers use `aria-sort="ascending"` / `"descending"` / `"none"` |
| ErrorBanner | `role="alert"` (severity: error), `role="status"` (severity: warn/info) with `aria-live="assertive"` / `"polite"` |
| PlayerCardDisplay | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to player name heading |
| ConfirmDialog | `role="alertdialog"`, `aria-modal="true"`, `aria-describedby` pointing to confirmation message |
| Toggle | `role="switch"`, `aria-checked="true"` / `"false"`, `aria-label` describing the setting |
| DiamondField | `role="group"`, `aria-label="Baseball diamond lineup"`, each position: `aria-label="Shortstop: Player Name"` |
| DraftTicker | `role="log"`, `aria-live="polite"`, `aria-label="Draft pick feed"` |
| Pagination | `<nav aria-label="Pagination">`, current page button: `aria-current="page"` |
| LoadingLedger | `role="status"`, `aria-label` matching the `message` prop |
| BaseIndicator | `role="img"`, `aria-label` describing base state (e.g., "Runners on first and third") |
| LineScore | `<table>` with `<caption>` describing the game matchup |

**Focus management for modals:**
- When PlayerCardDisplay or ConfirmDialog opens: move focus to the first focusable element inside the dialog
- Trap Tab/Shift+Tab within the dialog while open (focus cycling)
- On close: return focus to the element that triggered the modal opening
- Implement via a `useFocusTrap` utility hook in `src/hooks/` (Layer 5)

**REQ-COMP-013**: Structural accessibility requirements:

- **Skip-to-content link**: AppShell renders `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a>` as its first child. This link becomes visible on keyboard focus and jumps to the `<main>` landmark.
- **Page titles**: Each feature page sets `document.title` via a `useEffect` to reflect the current page context (e.g., "Draft Board | Baseball Ledger", "Season Stats | Baseball Ledger"). Assistive technology announces the page title on navigation.
- **Color contrast**: All text/background combinations meet WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text). Verification:

| Foreground | Background | Contrast Ratio | WCAG Level |
|---|---|---|---|
| Ink (#2C2C2C) | Old Lace (#FDF5E6) | 12.1:1 | AAA |
| Ballpark (#1B4D3E) | Old Lace (#FDF5E6) | 8.2:1 | AAA |
| Stitch Red (#B22222) | Old Lace (#FDF5E6) | 5.8:1 | AA |
| Muted (#6B7280) | Old Lace (#FDF5E6) | 4.6:1 | AA |
| Playoff Gold (#CFB53B) | Playoff Dark (#1A1A2E) | 7.4:1 | AAA |
| Light text (#F5F5F5) | Playoff Dark (#1A1A2E) | 14.8:1 | AAA |

- **Form labels**: Every Input and Select component MUST have an associated `<label>` element via `htmlFor`/`id` pairing. Placeholder text is NOT a substitute for labels.
- **Error messages**: Form validation errors reference the invalid field via `aria-describedby` linking the input to its error message element (per REQ-ERR-005 Zod validation).

---

## 20. Database Migration Workflow

This section specifies the Supabase CLI workflow, migration file standards, schema change process, rollback strategy, seed data management, RLS policy testing, multi-environment deployment, and CI/CD database pipeline integration. It extends the schema defined in REQ-DATA-007 (Section 4.3), the migration file listing in Section 3.3, and the CI pipeline defined in REQ-TEST-015 (Section 17.7).

### 20.1 Supabase CLI & Local Development

**REQ-MIG-001**: All developers run a local Supabase stack via Docker for development and testing. The local stack includes PostgreSQL, Auth, Storage, and Realtime -- matching the production Supabase feature set. No development work targets a remote Supabase instance directly.

Initialize and start the local stack:

```bash
# One-time project initialization (already complete per Section 3.3)
supabase init

# Start the local Supabase stack (PostgreSQL, Auth, Storage, Realtime)
supabase start

# Reset the database: drops all data, re-runs all migrations, then runs seed.sql
supabase db reset

# Stop the local stack
supabase stop
```

The `supabase/config.toml` file defines local stack configuration. Required settings:

```toml
[project]
id = "baseball-ledger"

[db]
port = 54322
major_version = 15

[db.pooler]
enabled = false

[auth]
site_url = "http://localhost:5173"
additional_redirect_urls = ["http://localhost:5173"]

[auth.email]
enable_signup = true
enable_confirmations = false  # Local dev only; production uses confirmation
```

The `enable_confirmations = false` setting applies to local development only. Staging and production Supabase projects retain email confirmation enabled via their respective dashboard settings.

### 20.2 Migration File Standards

**REQ-MIG-002**: Migration files in `supabase/migrations/` follow the naming convention established in REQ-ARCH-004 (Section 3.6): 5-digit sequential prefix + snake_case description. Each migration addresses exactly one concern -- a single table creation, a single set of related indexes, a single set of RLS policies, or a single schema alteration.

Existing migrations (Section 3.3):

| File | Concern |
|---|---|
| `00001_create_leagues.sql` | `leagues` table |
| `00002_create_teams.sql` | `teams` table |
| `00003_create_rosters.sql` | `rosters` table |
| `00004_create_schedule.sql` | `schedule` table |
| `00005_create_season_stats.sql` | `season_stats` table |
| `00006_create_game_logs.sql` | `game_logs` table |
| `00007_create_archives.sql` | `archives` table |
| `00008_create_simulation_progress.sql` | `simulation_progress` table |
| `00009_create_indexes.sql` | All indexes (REQ-NFR-015) |
| `00010_enable_rls.sql` | Enable RLS on 6 tables |
| `00011_create_rls_policies.sql` | RLS policies (REQ-NFR-005) |
| `00012_add_season_year.sql` | Add `season_year INT NOT NULL` to `rosters` and `season_stats` (REQ-DATA-002a) |

New migrations continue from `00013` onward.

**REQ-MIG-003**: Every migration file begins with a header comment block documenting the migration's purpose, author, creation date, and dependencies on prior migrations:

```sql
-- Migration: 00012_add_trade_history.sql
-- Purpose:   Create trade_history table for transaction audit log
-- Author:    <developer name or handle>
-- Date:      2026-02-08
-- Depends:   00001_create_leagues.sql, 00002_create_teams.sql
-- ---------------------------------------------------------------
```

The `Depends` line lists only direct dependencies (migrations that create tables or objects referenced by this migration). Transitive dependencies are not listed.

**REQ-MIG-004**: SQL style rules within migration files:

| Rule | Example |
|---|---|
| Uppercase SQL keywords | `CREATE TABLE`, `ALTER TABLE`, `SELECT`, `INSERT INTO` |
| Lowercase identifiers (tables, columns, indexes) | `leagues`, `team_count`, `idx_teams_league` |
| Explicit `public` schema for all table operations | `CREATE TABLE public.leagues (...)` |
| Use `IF NOT EXISTS` for `CREATE TABLE` and `CREATE INDEX` | `CREATE TABLE IF NOT EXISTS public.trade_history (...)` |
| Use `CREATE OR REPLACE` for functions and triggers | `CREATE OR REPLACE FUNCTION public.update_standings(...)` |
| Use `DO $$ ... $$` blocks for conditional `ALTER TABLE` | Wrap column additions in existence checks |
| Terminate every statement with `;` | Required for `supabase db reset` parsing |
| No `DROP` statements in forward migrations | Destructive changes require dedicated rollback migrations (Section 20.4) |

Idempotent patterns (`IF NOT EXISTS`, `CREATE OR REPLACE`) allow migrations to be safely re-run during local development without errors on already-applied schema objects.

### 20.3 Schema Change Workflow

**REQ-MIG-005**: All schema changes follow this workflow. No manual SQL execution against any environment is permitted outside of this process.

**Step 1 -- Create the migration file:**

```bash
supabase migration new <descriptive_name>
# Creates: supabase/migrations/<timestamp>_<descriptive_name>.sql
```

After creation, rename the file to use the 5-digit sequential prefix convention instead of the timestamp prefix:

```bash
# Example: rename 20260208120000_add_trade_history.sql -> 00012_add_trade_history.sql
```

**Step 2 -- Write the migration SQL** following the standards in REQ-MIG-003 and REQ-MIG-004.

**Step 3 -- Test locally:**

```bash
# Reset database: drops all data, replays all migrations in order, runs seed.sql
supabase db reset

# Verify the new schema objects exist
supabase db lint
```

A successful `supabase db reset` with no errors confirms the migration is syntactically valid and compatible with all prior migrations.

**Step 4 -- Check for schema drift:**

```bash
# Compare local database state against migration files
supabase db diff --schema public
```

`supabase db diff` detects any manual changes made to the local database that are not captured in migration files. The output must be empty before committing. If drift is detected, either create a new migration capturing the change or revert the manual modification via `supabase db reset`.

**Step 5 -- Review checklist before committing:**

- [ ] Migration file uses 5-digit sequential prefix and snake_case name
- [ ] Header comment block present with purpose, author, date, dependencies
- [ ] SQL follows style rules (REQ-MIG-004)
- [ ] `supabase db reset` completes without errors
- [ ] `supabase db diff --schema public` shows no drift
- [ ] `supabase db lint` reports no warnings
- [ ] Seed data updated if new tables require reference data (Section 20.5)
- [ ] RLS policies added for any new table with user data (Section 20.6)
- [ ] TypeScript types regenerated (Section 20.8)
- [ ] Corresponding pgTAP tests written for new RLS policies (Section 20.6)

**Step 6 -- Squashing migrations:**

When the migration count exceeds 30 files, or at major version boundaries, squash all migrations into a single baseline migration. Squashing replaces many incremental files with one consolidated file:

```bash
supabase migration squash --version <target_prefix>
```

Squashing is a one-way operation. Squash only after all environments (local, staging, production) have applied all migrations up to the squash point. Document the squash in the changelog (per CLAUDE.md Rule 10).

### 20.4 Rollback & Recovery Strategy

**REQ-MIG-006**: Supabase does not support automatic down migrations. All rollbacks are implemented as new forward migrations that reverse the effects of a prior migration. This is an intentional design choice: every schema state is reachable by replaying the migration sequence forward.

**Rollback migration naming:** `000XX_rollback_<original_name>.sql` where `XX` is the next sequential number and `<original_name>` matches the migration being reversed.

Example -- rolling back `00012_add_trade_history.sql`:

```sql
-- Migration: 00013_rollback_add_trade_history.sql
-- Purpose:   Reverse 00012_add_trade_history (drop trade_history table)
-- Author:    <developer name or handle>
-- Date:      2026-02-08
-- Depends:   00012_add_trade_history.sql
-- WARNING:   This migration DROPS the trade_history table and ALL its data.
-- ---------------------------------------------------------------

DROP TABLE IF EXISTS public.trade_history;
```

**Destructive change rules:**

| Operation | Requirement |
|---|---|
| `DROP TABLE` | Must be preceded by a data migration or backup step. Never drop a table that contains production data without explicit confirmation in the PR description. |
| `DROP COLUMN` | Create a new migration that first copies data to a replacement column or backup table, then drops the column. |
| `ALTER COLUMN ... TYPE` | Test with production-scale data volumes. Type changes on large tables may lock the table. |
| `DROP INDEX` | Safe to drop and recreate. Document the performance impact rationale. |
| `DROP POLICY` | Accompanied by a replacement policy in the same migration, or a documented security review confirming the policy is no longer needed. |

**Production recovery:** Supabase Pro and Team plans provide point-in-time recovery (PITR) via the Supabase dashboard. Before applying any destructive migration to production, confirm that PITR is enabled and note the current recovery point. This provides a safety net beyond the manual rollback migration approach.

### 20.5 Seed Data

**REQ-MIG-007**: Development seed data is defined in `supabase/seed.sql`. This file runs automatically after all migrations during `supabase db reset`. Seed data populates the local development database with realistic test data for UI development and manual testing.

Seed data categories:

| Category | Content | Example |
|---|---|---|
| Test users | 3 auth users for local development (commissioner, team owner, spectator) | `INSERT INTO auth.users (id, email, ...) VALUES (...)` |
| Sample league | 1 league in `regular_season` status with 8 teams | `INSERT INTO public.leagues (...)` |
| Sample teams | 8 teams across 2 league divisions and 4 divisions, with CPU and human owners | `INSERT INTO public.teams (...)` |
| Sample rosters | 21 players per team (168 total) with pre-generated PlayerCard JSONB | `INSERT INTO public.rosters (...)` |
| Sample schedule | 20 days of schedule entries, 10 days marked complete with scores | `INSERT INTO public.schedule (...)` |
| Sample stats | Season stats for all 168 rostered players | `INSERT INTO public.season_stats (...)` |

**REQ-MIG-008**: All seed data `INSERT` statements use `ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE` to ensure idempotency. Running `supabase db reset` multiple times, or manually executing `seed.sql`, must not produce duplicate row errors.

```sql
-- Idempotent seed example
INSERT INTO public.leagues (id, name, commissioner_id, invite_key, team_count, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vintage League 1971',
  '00000000-0000-0000-0000-000000000101',
  'SEED-INVITE1',
  8,
  'regular_season'
)
ON CONFLICT (id) DO NOTHING;
```

Seed data rules:
- Seed UUIDs use the `00000000-0000-0000-0000-xxxxxxxxxxxx` prefix pattern to be instantly recognizable as non-production data
- No production data, real user emails, or real credentials in seed files
- Seed file committed to the repository alongside migrations
- Seed data references the same schema version as the latest migration

**Test fixture data** (separate from development seeds) resides in `tests/fixtures/` as JSON files per REQ-TEST-008 (Section 17.4). Test fixtures are loaded by Vitest test suites, not by `supabase db reset`. The two data sets serve different purposes: seeds provide a realistic local development environment; fixtures provide deterministic, minimal data sets for automated tests.

### 20.6 RLS Policy Testing

**REQ-MIG-009**: Every RLS policy defined in `supabase/migrations/` must have a corresponding pgTAP test in `supabase/tests/` that verifies the policy grants and denies access correctly. RLS policies without tests are considered incomplete and must not be merged.

Test file location and naming: `supabase/tests/<table_name>_rls.test.sql`

Example test structure for the `leagues` table RLS policies (cross-references REQ-NFR-005, REQ-AUTH-002):

```sql
-- File: supabase/tests/leagues_rls.test.sql
BEGIN;
SELECT plan(6);

-- Setup: create test users
SELECT tests.create_supabase_user('commissioner', 'commissioner@test.com');
SELECT tests.create_supabase_user('team_owner', 'owner@test.com');
SELECT tests.create_supabase_user('outsider', 'outsider@test.com');

-- Setup: insert test league as commissioner
SELECT tests.authenticate_as('commissioner');
INSERT INTO public.leagues (id, name, commissioner_id, invite_key, team_count, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test League',
        tests.get_supabase_uid('commissioner'), 'TEST-KEY-001', 8, 'setup');

-- Setup: add team owned by team_owner
INSERT INTO public.teams (id, league_id, name, city, owner_id, league_division, division)
VALUES ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'Test Team', 'Test City',
        tests.get_supabase_uid('team_owner'), 'AL', 'East');

-- Test 1: Commissioner can SELECT their league
SELECT tests.authenticate_as('commissioner');
SELECT results_eq(
  $$SELECT name FROM public.leagues
    WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  $$VALUES ('Test League')$$,
  'Commissioner can read their own league'
);

-- Test 2: Team owner can SELECT their league (via team membership)
SELECT tests.authenticate_as('team_owner');
SELECT results_eq(
  $$SELECT name FROM public.leagues
    WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  $$VALUES ('Test League')$$,
  'Team owner can read league they belong to'
);

-- Test 3: Outsider cannot SELECT the league
SELECT tests.authenticate_as('outsider');
SELECT is_empty(
  $$SELECT name FROM public.leagues
    WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'Non-member cannot read league'
);

-- Test 4: Commissioner can UPDATE their league
SELECT tests.authenticate_as('commissioner');
SELECT lives_ok(
  $$UPDATE public.leagues SET name = 'Renamed League'
    WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'Commissioner can update their league'
);

-- Test 5: Team owner cannot UPDATE the league
SELECT tests.authenticate_as('team_owner');
SELECT results_eq(
  $$WITH updated AS (
      UPDATE public.leagues SET name = 'Hijacked'
      WHERE id = '11111111-1111-1111-1111-111111111111'
      RETURNING id
    ) SELECT count(*)::int FROM updated$$,
  $$VALUES (0)$$,
  'Team owner cannot update league'
);

-- Test 6: Outsider cannot DELETE the league
SELECT tests.authenticate_as('outsider');
SELECT results_eq(
  $$WITH deleted AS (
      DELETE FROM public.leagues
      WHERE id = '11111111-1111-1111-1111-111111111111'
      RETURNING id
    ) SELECT count(*)::int FROM deleted$$,
  $$VALUES (0)$$,
  'Non-member cannot delete league'
);

SELECT * FROM finish();
ROLLBACK;
```

Run RLS tests via the Supabase CLI:

```bash
supabase test db
```

This command executes all `.test.sql` files in `supabase/tests/` using pgTAP within a transaction that rolls back after each file, leaving no test artifacts in the database.

Required RLS test coverage by table (cross-references REQ-DATA-007):

| Table | Test File | Test Categories |
|---|---|---|
| `leagues` | `leagues_rls.test.sql` | Commissioner CRUD, member SELECT, non-member denial |
| `teams` | `teams_rls.test.sql` | Owner UPDATE own team, member SELECT league teams, non-member denial |
| `rosters` | `rosters_rls.test.sql` | Owner UPDATE own roster, member SELECT league rosters, non-member denial |
| `schedule` | `schedule_rls.test.sql` | Member SELECT, non-member denial, no direct user writes (server-only) |
| `season_stats` | `season_stats_rls.test.sql` | Member SELECT, non-member denial, no direct user writes |
| `game_logs` | `game_logs_rls.test.sql` | Member SELECT, non-member denial, no direct user writes |

The `archives` and `simulation_progress` tables do not have RLS enabled (per REQ-DATA-007) and do not require RLS tests.

### 20.7 Multi-Environment Strategy

**REQ-MIG-010**: Three isolated database environments are maintained throughout the project lifecycle. No data or credentials are shared between environments.

| Environment | Purpose | Supabase Instance | Data Source |
|---|---|---|---|
| Local | Development, debugging, local testing | Docker via `supabase start` | `seed.sql` + manual testing |
| Staging | Integration testing, E2E tests, pre-production validation | Supabase cloud project (test) | Dedicated seed script or CI-managed fixtures |
| Production | Live user-facing application | Supabase cloud project (production) | User-generated data only |

**Linking environments:**

```bash
# Link to staging project (used for deployment previews and E2E tests)
supabase link --project-ref <staging-project-ref>

# Push migrations to linked remote project
supabase db push
```

**Migration deployment order:** Migrations are always deployed local -> staging -> production. A migration must not be applied to production until it has been verified on staging. The staging environment receives migrations via `supabase db push` during CI (Section 20.8). Production receives migrations via manual `supabase db push` after staging verification, or via a protected CI pipeline step requiring manual approval.

**Environment variable management** for database connection strings:

| Variable | Local | Staging | Production |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `http://localhost:54321` | `https://<staging-ref>.supabase.co` | `https://<prod-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Local anon key (from `supabase start`) | Staging anon key | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Local service role key | Staging service role key | Production service role key |
| `SUPABASE_DB_URL` | `postgresql://postgres:postgres@localhost:54322/postgres` | Staging connection string | Production connection string |

These are stored in `.env.local` (local, gitignored), Vercel environment variables (staging/production, per environment), and GitHub Actions secrets (CI). Per REQ-ARCH-004, `.env.example` documents all required variables without values.

**REQ-MIG-011**: Data isolation is enforced by policy: staging and production Supabase projects use different project references, different API keys, and different database credentials. The local development stack runs its own PostgreSQL instance with no network access to remote projects. No migration, script, or CI step may operate on production without explicit environment targeting.

### 20.8 CI/CD Database Pipeline

**REQ-MIG-012**: The GitHub Actions CI pipeline (extending REQ-TEST-015) includes database migration validation as part of every pull request. Database pipeline stages run before application tests to ensure schema validity.

Extended CI pipeline (additions to REQ-TEST-015 in **bold**):

```
Step 1:  npm ci                                            [install dependencies]
Step 1b: supabase start                                    [start local Supabase stack]
Step 2:  eslint . && tsc --noEmit                          [lint + type-check, parallel]
Step 2b: supabase db reset                                 [replay all migrations + seed]
Step 2c: supabase db lint                                  [lint SQL migrations]
Step 2d: supabase test db                                  [run pgTAP RLS tests]
Step 3:  vitest run --coverage                             [unit + integration tests]
Step 3b: supabase gen types typescript --local > src/lib/types/database.ts
                                                           [regenerate TypeScript types]
Step 3c: tsc --noEmit                                      [re-check types with generated DB types]
Step 4:  vitest bench                                      [benchmarks, after Step 3]
Step 5:  playwright test                                   [E2E tests, after Step 3]
Step 6:  Coverage threshold check + report upload          [after Step 3]
Step 6b: supabase db push --dry-run                        [validate migrations against staging]
Step 7:  supabase stop                                     [stop local Supabase stack]
```

Steps 2b through 2d run sequentially (each depends on the previous). Steps 2/2b can run in parallel since linting/type-checking does not depend on the database.

**REQ-MIG-013**: TypeScript type generation produces the file `src/lib/types/database.ts`. This file is auto-generated by `supabase gen types typescript` and must not be hand-edited. It provides typed interfaces for all database tables, views, and functions, enabling compile-time validation of all Supabase client queries.

```bash
# Generate TypeScript types from the local database schema
supabase gen types typescript --local > src/lib/types/database.ts
```

The generated file is committed to the repository so that developers without a running local Supabase stack can still compile and type-check. The CI pipeline regenerates this file on every PR and fails the type-check step if the committed version is stale (i.e., if `supabase gen types` produces output different from the committed file).

Workflow for detecting stale types in CI:

```bash
# Regenerate types
supabase gen types typescript --local > src/lib/types/database.ts.ci

# Compare with committed version
diff src/lib/types/database.ts src/lib/types/database.ts.ci
# If diff is non-empty, fail CI with message:
# "Generated database types are stale. Run 'supabase gen types typescript
#  --local > src/lib/types/database.ts' and commit."
```

The `database.ts` file is referenced by the Layer 0 type system (Section 3.4) and imported by service modules (Layer 3) and API handlers (Layer 2) for type-safe Supabase queries.

---

## 21. Environment Configuration

This section specifies the complete environment variable inventory, configuration module, Vite type declarations, Vercel project configuration, and secrets management strategy. It consolidates and extends the environment variable references scattered across REQ-ARCH-004 (Section 3.6), REQ-MIG-010 and REQ-MIG-011 (Section 20.7), REQ-NFR-021 (Section 15), and all Claude API references (Section 11).

### 21.1 Environment Variable Inventory

**REQ-ENV-001**: The project defines a complete, canonical set of environment variables. Every variable used anywhere in the codebase must appear in this inventory. Variables exposed to the browser (included in the Vite client bundle) MUST use the `VITE_` prefix. Variables that contain secrets or are used only in server-side code (Vercel Serverless Functions, CI scripts) MUST NOT use the `VITE_` prefix. This is a security boundary enforced by Vite's build system: only `VITE_`-prefixed variables are statically replaced in client code via `import.meta.env`.

| Variable | Category | Required | Client-Exposed | Runtime Context | Description |
|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase (client) | Yes | Yes | Browser + Server | Supabase project API URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase (client) | Yes | Yes | Browser + Server | Supabase anonymous/public API key (safe for browsers; RLS enforces access) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (server) | Yes | **No** | Server only | Supabase service role key; bypasses RLS. Used in `api/_lib/supabase-admin.ts` |
| `SUPABASE_DB_URL` | Supabase (server) | Yes | **No** | Server + CI | Direct PostgreSQL connection string. Used by Supabase CLI and migration scripts |
| `ANTHROPIC_API_KEY` | External Services | No | **No** | Server only | Anthropic Claude API key for AI features (REQ-AI-006 through REQ-AI-008). When absent, all AI features degrade to template fallbacks per REQ-AI-008 |
| `VITE_APP_ENV` | Build/Runtime | No | Yes | Browser + Server | Current environment identifier. Defaults to `'development'` when unset |

**Variable naming rules:**
- `VITE_` prefix: public, safe for client bundles (Supabase URL, anon key, app env)
- No `VITE_` prefix: secret or server-only (service role key, database URL, API keys)
- All uppercase with underscore separators
- No variable may contain credentials AND have the `VITE_` prefix

**Per-environment values** are documented in Section 20.7 (REQ-MIG-010). The table above defines the canonical variable names; Section 20.7 specifies the per-environment values for local, staging, and production.

### 21.2 `.env.example` Template

**REQ-ENV-002**: The file `.env.example` (listed in Section 3.3 directory tree and referenced by REQ-ARCH-004) MUST be committed to the repository with the following content. It documents every required and optional variable with placeholder values and comments. Developers copy this file to `.env.local` and fill in real values. The `.env.example` file MUST never contain real credentials.

```bash
# =============================================================================
# Baseball Ledger - Environment Variables
# =============================================================================
# Copy this file to .env.local and fill in your values.
# NEVER commit .env.local to the repository.
#
# Vite prefix rules:
#   VITE_*  = included in browser bundle (public, safe values only)
#   No prefix = server-only (secrets, connection strings)
# =============================================================================

# --- Supabase (Client) -------------------------------------------------------
# These are safe for browser exposure. RLS policies enforce access control.
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key

# --- Supabase (Server) -------------------------------------------------------
# NEVER prefix these with VITE_ -- they bypass RLS / contain credentials.
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres

# --- External Services --------------------------------------------------------
# Optional: AI features degrade gracefully without this key (REQ-AI-008).
# ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# --- Build/Runtime ------------------------------------------------------------
# Optional: defaults to 'development' when unset.
# VITE_APP_ENV=development
```

### 21.3 Configuration Module

**REQ-ENV-003**: A centralized configuration module at `src/lib/config.ts` provides typed, validated access to all environment variables. Client code MUST import configuration values from this module instead of reading `import.meta.env` directly. This provides a single point of change, enables startup validation, and prevents typos in environment variable names.

**REQ-ENV-004**: The configuration module MUST validate all required environment variables at application startup and throw a descriptive error if any are missing. This implements fail-fast behavior per CLAUDE.md Rule 3 (no silent failures). The validation runs when the module is first imported (top-level side effect).

```typescript
// src/lib/config.ts

interface ClientConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly appEnv: 'development' | 'staging' | 'production';
  readonly isDev: boolean;
}

function getRequiredEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Check your .env.local file against .env.example.`
    );
  }
  return value;
}

export const clientConfig: ClientConfig = {
  supabaseUrl: getRequiredEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: getRequiredEnv('VITE_SUPABASE_ANON_KEY'),
  appEnv: (import.meta.env.VITE_APP_ENV ?? 'development') as ClientConfig['appEnv'],
  isDev: import.meta.env.DEV,
};
```

**REQ-ENV-005**: Server-only configuration MUST reside in a separate module at `api/_lib/config.ts` and access variables via `process.env` (the standard Node.js mechanism available in Vercel Serverless Functions). Server config MUST NOT be importable from client code. The module architecture (Section 3.4, Layer 2) enforces this: `api/_lib/` is server-only and cannot be imported by Layers 3-7.

```typescript
// api/_lib/config.ts

interface ServerConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly supabaseDbUrl: string;
  readonly anthropicApiKey: string | undefined;
}

function getRequiredServerEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required server environment variable: ${key}. ` +
      `Set it in Vercel dashboard or .env.local.`
    );
  }
  return value;
}

export const serverConfig: ServerConfig = {
  supabaseUrl: getRequiredServerEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: getRequiredServerEnv('VITE_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: getRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseDbUrl: getRequiredServerEnv('SUPABASE_DB_URL'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,  // Optional per REQ-AI-008
};
```

Note: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are also available in server context because Vercel injects all environment variables into `process.env` regardless of prefix. The `VITE_` prefix only affects Vite's client-side static replacement behavior.

The `api/_lib/supabase-admin.ts` module (Section 3.3) imports `serverConfig` to initialize the admin Supabase client:

```typescript
// api/_lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';
import { serverConfig } from './config';
import type { Database } from '@lib/types/database';

export const supabaseAdmin = createClient<Database>(
  serverConfig.supabaseUrl,
  serverConfig.supabaseServiceRoleKey
);
```

### 21.4 Vite Environment Type Declarations

**REQ-ENV-006**: The file `src/vite-env.d.ts` (listed in Section 3.3 directory tree) MUST declare the `ImportMetaEnv` interface with all `VITE_`-prefixed environment variables. This enables TypeScript autocomplete and compile-time validation when accessing `import.meta.env.*` properties.

```typescript
// src/vite-env.d.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project API URL (e.g., http://localhost:54321) */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anonymous/public API key (safe for browsers; RLS enforces access) */
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Current environment identifier: 'development' | 'staging' | 'production' */
  readonly VITE_APP_ENV?: string;
  /** Vite built-in: true when running in development mode */
  readonly DEV: boolean;
  /** Vite built-in: true when running in production mode */
  readonly PROD: boolean;
  /** Vite built-in: 'development' | 'production' */
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

This file MUST NOT declare server-only variables (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `ANTHROPIC_API_KEY`) because they are not available via `import.meta.env` and declaring them would create a false sense of availability in client code.

### 21.5 Vercel Project Configuration

**REQ-ENV-007**: The `vercel.json` file (listed in Section 3.3 directory tree, referenced by REQ-NFR-021) defines the Vercel deployment configuration:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 300
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

Configuration rationale:
- **`framework: "vite"`**: Tells Vercel to use the Vite build adapter.
- **`outputDirectory: "dist"`**: Vite's default production output directory.
- **`functions.memory: 1024`**: Per REQ-NFR-021, simulation functions require 1024 MB (requires Vercel Pro plan; Hobby plan limits to 256 MB).
- **`functions.maxDuration: 300`**: Per REQ-NFR-021, 300 seconds maximum (requires Vercel Pro plan; Hobby plan limits to 60 seconds). For season simulation exceeding this limit, use the chunked simulation pattern described in REQ-NFR-021.
- **Rewrites**: API routes pass through to serverless functions. All other routes fall through to `index.html` for client-side SPA routing (React Router).
- **Headers**: Security headers on API responses. Immutable cache headers on Vite-hashed static assets (the `/assets/` directory).
- **CORS**: Not configured in `vercel.json` because the frontend and API are served from the same Vercel project (same origin), as noted in REQ-API-007.

**Environment variables for Vercel**: Set via the Vercel dashboard (Settings > Environment Variables) or the Vercel CLI (`vercel env add`). Each variable is scoped to one or more environments (Preview, Production). Secrets MUST NOT appear in `vercel.json` or any committed file.

### 21.6 Secrets Management

**REQ-ENV-008**: The following `.gitignore` entries MUST be present to prevent accidental secret commits:

```gitignore
# Environment files (contain secrets)
.env
.env.local
.env.development.local
.env.staging.local
.env.production.local
.env*.local

# Do NOT ignore .env.example -- it is committed as a template (REQ-ENV-002)
```

**REQ-ENV-009**: Secrets are stored in exactly three locations, matching the three environments defined in REQ-MIG-010:

| Environment | Secret Storage | Who Sets | How Accessed |
|---|---|---|---|
| Local | `.env.local` file (gitignored) | Developer, copied from `.env.example` | Vite dev server reads automatically; `supabase start` outputs local keys |
| Staging / Preview | Vercel Environment Variables (Preview scope) | Project admin via Vercel dashboard or `vercel env add` | Injected into serverless functions as `process.env.*`; `VITE_*` vars baked into client build |
| Production | Vercel Environment Variables (Production scope) | Project admin via Vercel dashboard or `vercel env add` | Same as staging |
| CI | GitHub Actions Secrets | Repository admin via GitHub Settings > Secrets | Referenced as `${{ secrets.VARIABLE_NAME }}` in workflow YAML |

**Secret handling rules:**
1. Secrets MUST never appear in committed code, configuration files, log output, error messages, or client-facing API responses.
2. `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It MUST only be used in `api/_lib/supabase-admin.ts` (server-side). Any import of this module from client code (Layers 3-7) is an architectural violation of REQ-ARCH-002.
3. `ANTHROPIC_API_KEY` is used exclusively in server-side API routes for Claude API calls (REQ-AI-006). It MUST never be sent to the client.
4. `SUPABASE_DB_URL` is a direct PostgreSQL connection string with credentials. It is used by the Supabase CLI for migrations and by CI scripts. It MUST NOT appear in application runtime code.
5. The Supabase anon key (`VITE_SUPABASE_ANON_KEY`) is intentionally client-exposed. It is NOT a secret -- RLS policies (REQ-DATA-007, Section 20.6) enforce all access control. This is the standard Supabase security model.

**REQ-ENV-010**: API key rotation policy:
- `SUPABASE_SERVICE_ROLE_KEY`: Rotate via Supabase dashboard (Settings > API) if compromised. Update in Vercel and GitHub Actions immediately.
- `ANTHROPIC_API_KEY`: Rotate via Anthropic Console. Update in Vercel and GitHub Actions. No downtime: AI features degrade to templates (REQ-AI-008) during the rotation window.
- `VITE_SUPABASE_ANON_KEY`: Rotate via Supabase dashboard. Requires redeployment of the client application since the key is baked into the Vite build.
- After any key rotation, redeploy all affected environments (staging, production) and update GitHub Actions secrets.

---

## 22. Code Ownership & Scoping

This section provides a single, authoritative decision framework for when code lives in shared directories (`src/lib/`, `src/components/`, `src/hooks/`, `src/stores/`, `src/services/`) vs. feature-local directories (`src/features/<module>/`). Section 3.7 and Section 19.4 established the colocation rule and decision criteria for **components**. This section extends that framework to every artifact type in the codebase.

### 22.1 Universal Scoping Rule

**REQ-SCOPE-001**: All promotable artifact types follow one rule:

> **Start feature-scoped. Promote to shared only when a second production-code consumer appears.**

This generalizes the component colocation rule from Section 3.7 (REQ-ARCH-005) to hooks, types, constants, utilities, and test helpers. The "second consumer" means a second **feature module** (Layer 7) or a **lower layer** (Layers 0-5) needs the artifact. Tests are exempt (see REQ-SCOPE-007).

**Artifact Placement Decision Table:**

| Artifact Type | Feature-Scoped Location | Shared Location | Promotion Trigger | Layer Ref |
|---|---|---|---|---|
| React components | `src/features/<module>/` | `src/components/` | 2+ features need it | L6, Sec 19.4 |
| React hooks | `src/features/<module>/hooks/` | `src/hooks/` | 2+ features need it | L5 |
| TypeScript types | `src/features/<module>/types.ts` | `src/lib/types/` | 2+ features OR Layer 0-1 needs it | L0 |
| Constants / enums | `src/features/<module>/constants.ts` | `src/lib/<domain>/constants.ts` | 2+ features OR Layer 1 needs it | L1 |
| Utility functions | `src/features/<module>/utils.ts` | `src/lib/<domain>/` | 2+ features OR needs Worker context | L1 |
| Test helpers | `tests/unit/<feature>/helpers/` | `tests/helpers/` | 2+ test suites need it | Sec 17 |
| Services | `src/services/` only | -- | Always shared | L3 |
| Stores | `src/stores/` only | -- | Always shared | L4 |
| Pure logic | `src/lib/` only | -- | Always shared | L0-1 |

Feature-scoped artifacts use **relative imports** within their feature directory. They MUST NOT be imported by other features (REQ-ARCH-002). When an artifact is promoted to a shared location, all imports switch to the appropriate `@`-prefixed path alias (REQ-ARCH-003).

### 22.2 Feature-Scoped File Conventions

**REQ-SCOPE-002**: Allowed feature-scoped file types, naming conventions, and import rules within `src/features/<module>/`:

| File Type | Naming Convention | Purpose | Import Rule |
|---|---|---|---|
| Sub-components | `PascalCase.tsx` | Feature-specific UI | Relative import within feature |
| Hooks | `hooks/usePascalCase.ts` | Feature-specific state composition | Relative import; may call shared hooks via `@hooks/` |
| Types | `types.ts` (single file) | Feature-local interfaces | Relative import; may extend types from `@lib/types/` |
| Constants | `constants.ts` (single file) | Feature-specific config values | Relative import |
| Utilities | `utils.ts` (single file) | Feature-specific pure helpers | Relative import |
| Barrel export | `index.ts` (optional) | Re-export page component only | Only the page component (REQ-ARCH-005) |

Naming follows REQ-ARCH-004: PascalCase for `.tsx` files, kebab-case for `.ts` files. The `hooks/` subdirectory uses the `use` prefix per React convention.

**REQ-SCOPE-003**: Feature-scoped artifact constraints:

1. **No cross-feature imports**: Feature-scoped artifacts MUST NOT be imported by any other feature module. This is enforced by REQ-ARCH-002 (no cross-feature dependencies) and is verified by the lint rule: no import path may contain `@features/` pointing to a different feature.
2. **No direct store access**: Feature-scoped hooks MUST NOT import from `@stores/*` directly (REQ-COMP-009). They compose shared hooks from `@hooks/` which in turn access stores.
3. **File count limit**: A feature directory SHOULD NOT contain more than 2 files of any single non-component type (e.g., 2 hook files maximum). If a feature needs 3+ hooks, evaluate whether some should be promoted to `src/hooks/` or whether the feature should be split into sub-features.
4. **No nested feature directories**: Feature modules are flat (one level of subdirectories only: `hooks/`). Do not nest features within features.

Baseball Ledger examples:
- `src/features/draft/hooks/useDraftTimer.ts` -- 60-second countdown logic (REQ-DFT-004), only used by `DraftBoardPage`
- `src/features/dashboard/constants.ts` -- `SIM_BUTTON_LABELS` map, only used by `SimulationControls`
- `src/features/roster/types.ts` -- `LineupSlot` interface, only used by `LineupEditor` and `DiamondView` within the roster feature

### 22.3 Promotion Checklist

**REQ-SCOPE-004**: When a feature-scoped artifact gains a second production-code consumer, promote it to its shared location using this checklist:

1. **Move the file** to the shared location identified in the REQ-SCOPE-001 decision table.
2. **Remove feature-scoped dependencies**: If promoting a component, convert hook/store access to props (REQ-COMP-008). If promoting a hook, ensure it has no imports from the originating feature directory.
3. **Update all imports**: Change every consumer from the relative path (`./DraftTicker`, `./hooks/useDraftTimer`) to the appropriate `@`-prefixed alias (`@components/data-display/DraftTicker`, `@hooks/useDraftTimer`).
4. **Move or update tests**: Relocate the test file from `tests/unit/<feature>/` to the shared test location (e.g., `tests/unit/components/`, `tests/unit/hooks/`). Update any test-internal imports.
5. **Verify isolation**: Confirm no remaining cross-feature imports exist. Search for relative imports (`from '../` or `from './`) that cross feature boundaries.
6. **Update Section 3.3**: If the shared location gains a file not previously listed in the directory tree, add it.

**Promotion example** -- `DraftTicker` from feature-scoped to shared:

```
Before:  src/features/draft/DraftTicker.tsx
         imports: ./hooks/useDraft (feature-scoped hook)
         consumer: DraftBoardPage only

After:   src/components/data-display/DraftTicker.tsx
         props: picks: DraftPick[], currentTeam: string
         consumers: DraftBoardPage, PlayoffsPage
         import path: @components/data-display/DraftTicker
```

The `useDraft()` hook call is removed from the component. The parent feature pages now pass `picks` and `currentTeam` as props, sourced from their own hook calls.

### 22.4 Fixed-Home Artifacts

**REQ-SCOPE-005**: The following artifact types have architecturally mandated fixed locations. They are NEVER feature-scoped. Creating feature-local versions of these artifacts violates the layer architecture (REQ-ARCH-002):

| Artifact | Fixed Home | Rationale |
|---|---|---|
| Zustand stores | `src/stores/` (Layer 4) | Cross-feature state requires central stores. Feature-local stores create hidden state silos that cannot be composed by shared hooks (Layer 5). |
| Service modules | `src/services/` (Layer 3) | The API client layer has a 1:1 mapping with backend endpoint groups. Duplicating service logic per feature violates DRY and complicates auth header injection. |
| Pure logic | `src/lib/` (Layers 0-1) | Must run identically in browser, Node.js, and Web Worker. Feature directories are browser-only (Layer 7). |
| Layer 0 types | `src/lib/types/` (Layer 0) | Types consumed by pure logic (Layer 1), services (Layer 3), or stores (Layer 4) must be importable by those layers. Feature directories (Layer 7) cannot be imported by lower layers. |
| Web Workers | `src/workers/` (Layer W) | Workers run in isolated thread context and can only import Layers 0-1. |
| Global styles | `src/styles/` | Tailwind directives and CSS custom properties are application-wide. |
| Server utilities | `api/_lib/` | Server-only code running in Vercel serverless runtime. Not accessible from client feature modules. |

**Rule of thumb**: If an artifact must be consumed by Layers 0-4, it cannot live in a feature directory (Layers 5-7 only).

### 22.5 Gray Area Resolution

**REQ-SCOPE-006**: Decision rules for ambiguous placement scenarios:

| Scenario | Decision | Reasoning |
|---|---|---|
| A type is used by one feature AND its corresponding service | **Shared** (`src/lib/types/`) | Services (Layer 3) cannot import from features (Layer 7). Types consumed across layers must be in Layer 0 per REQ-ARCH-002. |
| A hook is used by 2 features but contains domain logic | **Shared** (`src/hooks/`), refactored | Extract domain logic into a Layer 1 pure function in `src/lib/`. The hook becomes a thin composition wrapper that calls the pure function and provides reactive state. |
| A utility is pure (no React, no browser APIs) but used by one feature only | **Feature-scoped** for now | Purity alone does not require Layer 1 placement. Promote when a second consumer appears or when the utility needs to run in a Web Worker. |
| A constant is used by a feature AND by a test for that feature | **Feature-scoped** | Tests may import from feature directories (REQ-SCOPE-007). The test is not a "second consumer" for promotion purposes. |
| A component is used by 2 features but each needs slight variations | **Shared with props** (`src/components/`) | Add a prop or variant to handle the variation. Do not create two copies of the component -- this violates DRY and creates maintenance burden. |
| A feature-scoped hook wraps a shared hook with additional feature logic | **Feature-scoped** | This is the intended pattern. Feature hooks compose shared hooks and add feature-specific derived state. |

**REQ-SCOPE-007**: Tests are exempt from the promotion trigger. A test file importing a feature-scoped artifact does NOT count as a second production-code consumer. Only imports from production code (Layers 0-7, Workers) trigger promotion. Tests mirror the source structure and may import from any source location to exercise the code under test.

---

*Document generated: 2026-02-08*
*Sources: APBA_REVERSE_ENGINEERING.md, baseball_ledger.md, ui_ux_spec.md*

# Phase 6: Frontend Foundation

## Overview
Phase 6 builds the entire frontend UI stack with mock data, establishing components, stores, hooks, routing, and feature pages that will later connect to real Supabase services.

## Requirements Covered
- REQ-COMP-001 through REQ-COMP-013 (Component architecture)
- REQ-STATE-001 through REQ-STATE-016 (State management)
- REQ-ARCH-002 (Layer dependency rules)

## Sub-phases

### 6A: Feedback + Data Display + Baseball Components
8 presentational components (Layer 6) that accept props and render UI:
- ErrorBanner, LoadingLedger, TypewriterText (feedback)
- Pagination, StatTable, StandingsTable (data display)
- LineScore, BaseIndicator (baseball)

### 6B: Layout + Router + Feature Page Shells
Layout components, React Router with lazy-loading, and 15 minimal feature page placeholders:
- ErrorBoundary, AppShell, Header, Footer (layout)
- router.tsx with createBrowserRouter, AuthGuard, 404 catch-all
- Splash, Auth, Dashboard, League, Draft, Roster, Stats, Game Viewer, Playoffs, Archive, Transactions, Standings pages

### 6C: Zustand Stores + Mock Services
6 Zustand stores with devtools/persist/immer middleware, 3 mock services, and 3 test fixture factories:
- authStore, leagueStore, rosterStore, simulationStore, statsStore
- storage-factory with localStorage test + memory fallback
- Mock services for league, roster, and stats data

### 6D: Hooks Layer
4 composition hooks (Layer 5) wiring stores together with derived state:
- useAuth (isAuthenticated), useLeague (isCommissioner), useTeam (myTeam/starters/bench), useSimulation (progressPct/isRunning)

### 6E: Key Feature Pages
6 fully-wired feature pages connecting hooks to components:
- DashboardPage with SimulationControls and ScheduleView
- StatsPage with batting/pitching tabs, league filter, pagination
- StandingsPage with division grouping

## Architecture

### Layer Rules Enforced
- Layer 6 (components): Import from Layer 0 (types) and Layer 1 (pure logic) only
- Layer 5 (hooks): Compose stores, never import components
- Layer 4 (stores): Call Layer 3 services, never import hooks/components
- Layer 7 (features): Can import everything, wire hooks to components

### Key Patterns
- `// @vitest-environment jsdom` directive required for all component/hook tests (Windows glob matching workaround)
- Zustand reset uses merge mode (`false`), not replace mode (`true`) to preserve action methods
- Store `partialize` with type cast for zustand persist TypeScript compatibility

## Verification
- 1,320 tests pass across 84 test files (227 new)
- TypeScript compiles (only pre-existing platoon.ts warnings)
- ESLint passes (zero new errors)

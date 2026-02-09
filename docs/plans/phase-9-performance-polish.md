# Phase 9: Performance & Polish

## Overview

Phase 9 is the final SRD phase. It builds the game orchestrator (the critical
missing piece connecting all 15+ simulation modules), adds bulk simulation
infrastructure (Web Worker + server-side RPC), polishes the stats UI with
traditional/advanced toggle, adds CSS animations, performance benchmarks,
determinism tests, and E2E tests.

## Sub-phases

### 9A: Game Orchestrator + Bulk Simulation
- `src/lib/simulation/game-runner.ts` -- `runGame()` full game loop
- `src/lib/simulation/season-runner.ts` -- `runDay()` / `runSeason()` batch execution
- Memory-safe day batching (strips play-by-play after each day)
- 25 tests (14 game-runner + 11 season-runner)

### 9B: Web Worker + Simulate API
- `src/workers/simulation-worker.ts` -- Web Worker entry with Map serialization
- `src/lib/simulation/worker-api.ts` -- Promise wrapper with main-thread fallback
- `api/_lib/simulate-day.ts` -- Server-side simulation with PostgreSQL RPC
- `supabase/migrations/00013_simulate_day_rpc.sql` -- Atomic transaction function
- Updated `api/leagues/[id]/simulate.ts` from stub to real logic
- Updated `vite.config.ts` with manual chunks + Worker support
- 23 tests across 4 files

### 9C: Stats Toggle + Animations
- Traditional/Advanced column sets in `StatColumnConfigs.ts`
- Toggle button in `StatsPage.tsx` with persisted `statView` in statsStore
- `StampAnimation.tsx` -- CSS-only stamp-slam with reduced-motion support
- Animation keyframes in `globals.css`
- Font preload with Latin subset in `index.html`
- 34 tests across 3 files

### 9D: Benchmarks + Determinism Tests
- `tests/bench/simulation.bench.ts` -- Single game, day, batch timing
- `tests/bench/csv-parse.bench.ts` -- CSV parse timing
- `tests/unit/lib/simulation/determinism.test.ts` -- Same-seed determinism (6 tests)
- `tests/TRACEABILITY.md` -- REQ-to-test mapping
- Coverage thresholds in vitest.config.ts (60/50/55/60)

### 9E: E2E Tests
- `tests/e2e/splash.spec.ts` (3 tests)
- `tests/e2e/auth.spec.ts` (4 tests)
- `tests/e2e/navigation.spec.ts` (4 tests)
- `tests/e2e/stats.spec.ts` (4 tests)
- Multi-browser config (Chromium, Firefox, WebKit)

## Requirements Covered

REQ-NFR-001, REQ-NFR-002, REQ-NFR-003, REQ-NFR-007, REQ-NFR-008,
REQ-NFR-010, REQ-NFR-014, REQ-NFR-016, REQ-NFR-017, REQ-NFR-018,
REQ-STS-005, REQ-SCH-009, REQ-COMP-011, REQ-TEST-003, REQ-TEST-004,
REQ-TEST-011, REQ-TEST-012, REQ-TEST-013, REQ-TEST-014, REQ-TEST-017

## Metrics

- Tests: 1,749 -> 1,813 (+64)
- Test files: 139 -> 148 (+9)
- New source files: ~16
- All SRD requirements addressed

# Phase 7: Integration Layer

## Overview

Phase 7 bridges the gap between the frontend (Phase 6) and the database by building
all three missing layers: SQL schema (Layer 0), API endpoints (Layer 2), and client
services (Layer 3). Stores (Layer 4) are updated with async actions that call the
real services.

## Sub-phases

### 7A: SQL Migrations + Seed Data + pgTAP Stubs
- 12 migration files covering 8 tables, indexes, RLS policies, season_year column
- Idempotent seed.sql with 3 users, 1 league, 8 teams, 168 players
- 6 pgTAP test stubs for RLS verification (require Docker)

### 7B: Database Types + Supabase Client + API Infrastructure
- `src/lib/types/database.ts` with Row/Insert/Update types per table
- `src/lib/supabase/client.ts` (browser) and `server.ts` (API functions)
- 6 API helper modules in `api/_lib/` (response, errors, validate, auth, transform, method-guard)
- `tests/fixtures/mock-supabase.ts` for endpoint testing
- 65 tests

### 7C: Core API Endpoints
- ~20 Vercel Serverless Functions covering all SRD endpoints
- League CRUD, Team/Roster, Standings/Schedule, Statistics (paginated),
  Simulation (sync/async), Game Detail, Draft, Transactions, Archive
- 105 tests with mocked Supabase client

### 7D: Client Service Layer
- `src/services/api-client.ts` with auth headers, envelope unwrapping, error mapping
- 5 domain service modules (league, roster, stats, simulation, draft)
- Barrel re-export via `src/services/index.ts`
- 41 tests with mocked fetch

### 7E: Store Async Integration
- Async actions added to 5 stores (league, roster, stats, simulation, auth)
- Auth wiring: useAuth hook, LoginPage, AuthGuard
- 43 tests with mocked service modules

## Key Decisions

1. **No Docker available** -- SQL migrations authored and syntax-reviewed but not
   executed locally. pgTAP tests are stubs only.

2. **Manual Database types** -- `src/lib/types/database.ts` manually authored to
   match Supabase gen types format. Will be auto-generated via `supabase gen types
   typescript` once Docker is available.

3. **Interface vs Type aliases** -- All database Row/Insert/Update declarations use
   `type` aliases (not `interface`) because TypeScript interfaces lack implicit index
   signatures required by `Record<string, unknown>` in supabase-js v2.95.3.

4. **`{}` for Views/Functions/Enums/CompositeTypes** -- Supabase's GenericSchema
   requires these keys but `Record<string, never>` breaks table type inference.
   Empty `{}` with ESLint disable comments is the working pattern.

5. **`.select('*')` required** -- supabase-js v2.95.3 returns `{}` type for bare
   `.select()`. Explicit `'*'` argument needed for correct Row type inference.

6. **Barrel export over conditional import** -- Initially planned `VITE_USE_MOCKS`
   conditional export in `src/services/index.ts`, but mock and real services have
   different function signatures. Switched to clean barrel re-export of real services.

7. **ESLint overrides** -- Added `no-explicit-any: off` for test files (mock objects
   require `as any` casts) and `argsIgnorePattern: '^_'` for unused function params.

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Test count | 1,320 | 1,574 |
| Test files | 84 | 122 |
| Source files | ~160 | ~224 |
| API endpoints | 0 | ~20 |
| Service modules | 0 (mocks only) | 6 |
| SQL migrations | 0 | 12 |
| Lint errors | 187 | 19 (all pre-existing) |

## Requirements Covered

- REQ-MIG-001 through REQ-MIG-013 (database migrations, seed data, RLS, CI pipeline)
- REQ-API-001 through REQ-API-011 (endpoint contracts, response envelopes, pagination)
- REQ-DATA-007 (database types)
- REQ-NFR-005 (auth verification)
- REQ-NFR-015 (database indexes)
- REQ-NFR-019 (pagination at 50 rows/page)
- REQ-STATE-003 through REQ-STATE-005 (async action patterns)
- REQ-ERR-001 through REQ-ERR-009 (error classification, API error responses, validation)

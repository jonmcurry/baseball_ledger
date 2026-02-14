-- Migration: 00026_update_division_and_team_count.sql
-- Purpose:   Update teams.division CHECK to East/Central/West (was East/South/West/North)
--            and relax leagues.team_count CHECK (app-level Zod enforces 18/24/30).
-- Author:    Baseball Ledger
-- Date:      2026-02-13
-- Depends:   00001, 00002
-- ---------------------------------------------------------------

-- Step 1: Drop old constraints first so data migration can proceed
ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_division_check;

ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_team_count_check;

-- Step 2: Migrate existing division values to new names
UPDATE public.teams SET division = 'Central' WHERE division = 'South';
UPDATE public.teams SET division = 'West'    WHERE division = 'North';

-- Step 3: Add new CHECK constraints
ALTER TABLE public.teams
  ADD CONSTRAINT teams_division_check
  CHECK (division IN ('East', 'Central', 'West'));

-- Relaxed constraint: allows existing leagues with old counts (up to 32).
-- New team counts (18/24/30) enforced at the API layer via Zod validation.
ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_team_count_check
  CHECK (team_count % 2 = 0 AND team_count >= 2 AND team_count <= 32);

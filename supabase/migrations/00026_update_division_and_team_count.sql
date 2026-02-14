-- Migration: 00026_update_division_and_team_count.sql
-- Purpose:   Update teams.division CHECK to East/Central/West (was East/South/West/North)
--            and update leagues.team_count CHECK to allow 18/24/30 only.
-- Author:    Baseball Ledger
-- Date:      2026-02-13
-- Depends:   00001, 00002
-- ---------------------------------------------------------------

-- Step 1: Drop and recreate the teams.division CHECK constraint
ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_division_check;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_division_check
  CHECK (division IN ('East', 'Central', 'West'));

-- Step 2: Drop and recreate the leagues.team_count CHECK constraint
ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_team_count_check;

ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_team_count_check
  CHECK (team_count IN (18, 24, 30));

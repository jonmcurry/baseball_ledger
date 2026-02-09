-- Migration: 00002_create_teams.sql
-- Purpose:   Create the teams table for league team management
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001_create_leagues.sql
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id       UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  city            TEXT NOT NULL,
  owner_id        UUID REFERENCES auth.users(id),  -- NULL = CPU-controlled team
  manager_profile TEXT NOT NULL DEFAULT 'balanced'
    CHECK (manager_profile IN ('conservative', 'aggressive', 'balanced', 'analytical')),
  league_division TEXT NOT NULL
    CHECK (league_division IN ('AL', 'NL')),
  division        TEXT NOT NULL
    CHECK (division IN ('East', 'South', 'West', 'North')),
  wins            INT NOT NULL DEFAULT 0,
  losses          INT NOT NULL DEFAULT 0,
  runs_scored     INT NOT NULL DEFAULT 0,
  runs_allowed    INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.teams IS 'Teams within a league. owner_id NULL indicates a CPU-controlled team.';
COMMENT ON COLUMN public.teams.manager_profile IS 'AI manager personality: conservative, aggressive, balanced, or analytical.';

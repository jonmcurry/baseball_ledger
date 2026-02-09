-- Migration: 00001_create_leagues.sql
-- Purpose:   Create the leagues table for managing baseball leagues
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   None (first migration)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.leagues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  commissioner_id UUID NOT NULL REFERENCES auth.users(id),
  invite_key      TEXT NOT NULL UNIQUE,
  team_count      INT NOT NULL CHECK (team_count % 2 = 0 AND team_count <= 32),
  year_range_start INT NOT NULL DEFAULT 1901,
  year_range_end  INT NOT NULL DEFAULT 2025,
  injuries_enabled BOOLEAN NOT NULL DEFAULT false,
  playoff_rules   JSONB NOT NULL DEFAULT '{}'::JSONB,
  status          TEXT NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup', 'drafting', 'regular_season', 'playoffs', 'completed')),
  current_day     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leagues IS 'Top-level league entity. One per commissioner-created league.';
COMMENT ON COLUMN public.leagues.invite_key IS 'Unique code shared with players to join the league.';
COMMENT ON COLUMN public.leagues.team_count IS 'Must be even and <= 32.';
COMMENT ON COLUMN public.leagues.status IS 'League lifecycle: setup -> drafting -> regular_season -> playoffs -> completed.';

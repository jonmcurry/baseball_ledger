-- Migration: 00005_create_season_stats.sql
-- Purpose:   Create the season_stats table for player statistics
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001_create_leagues.sql, 00002_create_teams.sql
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.season_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id       UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  player_id       TEXT NOT NULL,
  season_year     INT NOT NULL,
  team_id         UUID NOT NULL REFERENCES public.teams(id),
  batting_stats   JSONB,
  pitching_stats  JSONB,
  UNIQUE(league_id, player_id)
);

COMMENT ON TABLE public.season_stats IS 'Accumulated season statistics per player per league.';
COMMENT ON COLUMN public.season_stats.batting_stats IS 'BattingStats JSONB: G, AB, R, H, HR, RBI, BA, OBP, SLG, OPS, etc.';
COMMENT ON COLUMN public.season_stats.pitching_stats IS 'PitchingStats JSONB: G, GS, W, L, SV, IP, ERA, WHIP, etc.';

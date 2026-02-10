-- Migration: 00016_create_player_pool.sql
-- Purpose:   Create player_pool table for league-specific draftable players (REQ-DATA-002)
-- Depends:   00001_create_leagues.sql, 00002_create_teams.sql

CREATE TABLE IF NOT EXISTS public.player_pool (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id          UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  player_id          TEXT NOT NULL,
  season_year        INT NOT NULL,
  player_card        JSONB NOT NULL,
  is_drafted         BOOLEAN NOT NULL DEFAULT false,
  drafted_by_team_id UUID REFERENCES public.teams(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_league_player_season UNIQUE(league_id, player_id, season_year)
);

-- Index for fetching available (undrafted) players per league
CREATE INDEX idx_player_pool_league ON public.player_pool(league_id);
CREATE INDEX idx_player_pool_available ON public.player_pool(league_id) WHERE is_drafted = false;

COMMENT ON TABLE public.player_pool IS 'League-specific player pool generated from Lahman CSVs at league creation.';
COMMENT ON COLUMN public.player_pool.player_card IS 'Full PlayerCard JSONB with 35-byte card, ratings, and metadata.';
COMMENT ON COLUMN public.player_pool.is_drafted IS 'Set to true when player is drafted, removing from available pool.';

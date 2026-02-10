-- Migration: 00017_player_pool_rls.sql
-- Purpose:   RLS policies for player_pool table
-- Depends:   00016_create_player_pool.sql, 00010_enable_rls.sql

ALTER TABLE public.player_pool ENABLE ROW LEVEL SECURITY;

-- League members can read the player pool for their league
CREATE POLICY select_player_pool ON public.player_pool
  FOR SELECT
  USING (
    league_id IN (
      SELECT t.league_id FROM public.teams t WHERE t.owner_id = auth.uid()
    )
    OR
    league_id IN (
      SELECT l.id FROM public.leagues l WHERE l.commissioner_id = auth.uid()
    )
  );

-- Only service role (API backend) can insert/update/delete player_pool records.
-- No INSERT/UPDATE/DELETE policies needed for authenticated users.

-- Migration: Add player_name_cache column to leagues (REQ-DATA-003)
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS player_name_cache JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.leagues.player_name_cache IS 'Map of playerID -> full name for simulation performance (REQ-DATA-003).';

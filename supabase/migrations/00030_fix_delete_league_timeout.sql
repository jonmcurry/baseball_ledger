-- Migration: 00030_fix_delete_league_timeout.sql
-- Purpose:   Fix statement timeout on league deletion. The original function
--            ran 10 sequential DELETEs which exceeded the default 8s timeout
--            on leagues with large player_pool/game_logs tables. All child
--            tables already have ON DELETE CASCADE on their league_id FK, and
--            rosters/transactions have ON DELETE CASCADE on team_id FK, so a
--            single DELETE FROM leagues cascades everything automatically.
--            Also raises statement_timeout to 30s as a safety net.
-- Author:    Baseball Ledger
-- Date:      2026-02-14
-- Depends:   00029
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_league_cascade(p_league_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Raise timeout for this admin operation (Supabase default is ~8s).
  -- SET LOCAL scopes the change to this transaction only.
  SET LOCAL statement_timeout = '30s';

  -- All child tables have ON DELETE CASCADE on their league_id FK:
  --   teams, schedule, season_stats, game_logs, player_pool,
  --   transactions, simulation_progress, archives
  -- And team-linked tables cascade from teams:
  --   rosters (team_id ON DELETE CASCADE)
  --   transactions (team_id ON DELETE CASCADE)
  -- A single league deletion cascades to all dependent records.
  DELETE FROM public.leagues WHERE id = p_league_id;
END;
$$;

COMMENT ON FUNCTION public.delete_league_cascade IS
  'Atomically delete a league and all child records via ON DELETE CASCADE.';

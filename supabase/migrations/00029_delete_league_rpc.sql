-- Migration: 00029_delete_league_rpc.sql
-- Purpose:   RPC function to delete a league and all child records in a single
--            DB transaction. Replaces 40+ sequential REST API calls from the
--            Vercel handler, which was hitting the function timeout.
-- Author:    Baseball Ledger
-- Date:      2026-02-13
-- Depends:   00001-00006, 00008, 00016, 00018
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_league_cascade(p_league_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete rosters (keyed by team_id, no league_id column)
  DELETE FROM public.rosters
    WHERE team_id IN (SELECT id FROM public.teams WHERE league_id = p_league_id);

  -- 2. Delete child tables with league_id in FK-safe order
  --    schedule before game_logs (schedule.game_log_id -> game_logs.id)
  DELETE FROM public.transactions        WHERE league_id = p_league_id;
  DELETE FROM public.season_stats        WHERE league_id = p_league_id;
  DELETE FROM public.schedule            WHERE league_id = p_league_id;
  DELETE FROM public.game_logs           WHERE league_id = p_league_id;
  DELETE FROM public.player_pool         WHERE league_id = p_league_id;
  DELETE FROM public.simulation_progress WHERE league_id = p_league_id;
  DELETE FROM public.archives            WHERE league_id = p_league_id;

  -- 3. Delete teams
  DELETE FROM public.teams WHERE league_id = p_league_id;

  -- 4. Delete the league itself
  DELETE FROM public.leagues WHERE id = p_league_id;
END;
$$;

COMMENT ON FUNCTION public.delete_league_cascade IS
  'Atomically delete a league and all child records in FK-safe order.';

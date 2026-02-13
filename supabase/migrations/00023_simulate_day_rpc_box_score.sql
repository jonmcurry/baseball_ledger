-- Migration: 00023_simulate_day_rpc_box_score.sql
-- Purpose:   Update simulate_day_commit to persist box_score and play_by_play
-- Author:    Baseball Ledger
-- Date:      2026-02-11
-- Depends:   00013_simulate_day_rpc.sql, 00014_alter_game_logs_columns.sql
-- ---------------------------------------------------------------
-- The original RPC (migration 00013) did not INSERT box_score or
-- play_by_play columns. Now that CompactGameResult retains these
-- fields, we update the function to persist them into game_logs.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.simulate_day_commit(
  p_league_id UUID,
  p_day_number INTEGER,
  p_game_logs JSONB,
  p_standings_deltas JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  game_log JSONB;
  team_id TEXT;
  delta JSONB;
BEGIN
  -- Insert game log entries (now includes box_score and play_by_play)
  FOR game_log IN SELECT * FROM jsonb_array_elements(p_game_logs)
  LOOP
    INSERT INTO public.game_logs (
      league_id, day_number, game_id,
      home_team_id, away_team_id,
      home_score, away_score, innings,
      winning_pitcher_id, losing_pitcher_id, save_pitcher_id,
      batting_lines, pitching_lines,
      box_score, play_by_play
    ) VALUES (
      p_league_id,
      p_day_number,
      (game_log->>'game_id'),
      (game_log->>'home_team_id')::UUID,
      (game_log->>'away_team_id')::UUID,
      (game_log->>'home_score')::INTEGER,
      (game_log->>'away_score')::INTEGER,
      (game_log->>'innings')::INTEGER,
      (game_log->>'winning_pitcher_id'),
      (game_log->>'losing_pitcher_id'),
      (game_log->>'save_pitcher_id'),
      (game_log->>'batting_lines')::JSONB,
      (game_log->>'pitching_lines')::JSONB,
      (game_log->>'box_score')::JSONB,
      (game_log->>'play_by_play')::JSONB
    );
  END LOOP;

  -- Update team standings atomically (REQ-NFR-016)
  FOR team_id, delta IN SELECT * FROM jsonb_each(p_standings_deltas)
  LOOP
    UPDATE public.teams
    SET
      wins = wins + (delta->>'wins')::INTEGER,
      losses = losses + (delta->>'losses')::INTEGER,
      runs_scored = runs_scored + (delta->>'rs')::INTEGER,
      runs_allowed = runs_allowed + (delta->>'ra')::INTEGER
    WHERE id = team_id::UUID
      AND league_id = p_league_id;
  END LOOP;
END;
$$;

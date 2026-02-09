-- Migration: 00013_simulate_day_rpc.sql
-- Purpose:   Create atomic simulation commit function (REQ-NFR-014, REQ-NFR-016)
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001 through 00012
-- ---------------------------------------------------------------
-- This function atomically inserts game logs and updates team
-- standings in a single transaction, ensuring data consistency
-- after each simulated day.
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
  -- Insert game log entries
  FOR game_log IN SELECT * FROM jsonb_array_elements(p_game_logs)
  LOOP
    INSERT INTO public.game_logs (
      league_id, day_number, game_id,
      home_team_id, away_team_id,
      home_score, away_score, innings,
      winning_pitcher_id, losing_pitcher_id, save_pitcher_id,
      batting_lines, pitching_lines
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
      (game_log->>'pitching_lines')::JSONB
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

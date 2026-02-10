-- Migration: 00014_alter_game_logs_columns.sql
-- Purpose:   Add missing columns to game_logs that the simulate_day_commit RPC expects
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00006_create_game_logs.sql, 00013_simulate_day_rpc.sql
-- ---------------------------------------------------------------
-- The RPC function simulate_day_commit (migration 00013) inserts into columns
-- game_id, innings, winning_pitcher_id, losing_pitcher_id, save_pitcher_id,
-- batting_lines, and pitching_lines -- which were not defined in the original
-- game_logs table (migration 00006). This migration adds them.
--
-- Existing columns box_score and play_by_play are retained for future use
-- by the game viewer UI.
-- ---------------------------------------------------------------

ALTER TABLE public.game_logs
  ADD COLUMN IF NOT EXISTS game_id TEXT,
  ADD COLUMN IF NOT EXISTS innings INT,
  ADD COLUMN IF NOT EXISTS winning_pitcher_id TEXT,
  ADD COLUMN IF NOT EXISTS losing_pitcher_id TEXT,
  ADD COLUMN IF NOT EXISTS save_pitcher_id TEXT,
  ADD COLUMN IF NOT EXISTS batting_lines JSONB,
  ADD COLUMN IF NOT EXISTS pitching_lines JSONB;

-- Make box_score and play_by_play nullable for rows inserted by the RPC
-- (which does not supply these columns).
ALTER TABLE public.game_logs
  ALTER COLUMN box_score DROP NOT NULL,
  ALTER COLUMN play_by_play DROP NOT NULL;

COMMENT ON COLUMN public.game_logs.game_id IS 'Application-generated game identifier.';
COMMENT ON COLUMN public.game_logs.innings IS 'Number of innings played (9 for regulation, more for extras).';
COMMENT ON COLUMN public.game_logs.winning_pitcher_id IS 'Player ID of the winning pitcher.';
COMMENT ON COLUMN public.game_logs.losing_pitcher_id IS 'Player ID of the losing pitcher.';
COMMENT ON COLUMN public.game_logs.save_pitcher_id IS 'Player ID of the save pitcher (null if none).';
COMMENT ON COLUMN public.game_logs.batting_lines IS 'Per-player batting stat lines JSONB.';
COMMENT ON COLUMN public.game_logs.pitching_lines IS 'Per-player pitching stat lines JSONB.';

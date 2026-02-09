-- Migration: 00004_create_schedule.sql
-- Purpose:   Create the schedule table for game scheduling
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001_create_leagues.sql, 00002_create_teams.sql
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id       UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  day_number      INT NOT NULL,
  home_team_id    UUID NOT NULL REFERENCES public.teams(id),
  away_team_id    UUID NOT NULL REFERENCES public.teams(id),
  home_score      INT,
  away_score      INT,
  is_complete     BOOLEAN NOT NULL DEFAULT false,
  game_log_id     UUID
);

COMMENT ON TABLE public.schedule IS 'Season schedule with one row per game. Scores populated after simulation.';
COMMENT ON COLUMN public.schedule.game_log_id IS 'FK to game_logs (added after game_logs table is created).';

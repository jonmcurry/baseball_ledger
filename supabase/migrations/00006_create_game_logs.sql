-- Migration: 00006_create_game_logs.sql
-- Purpose:   Create the game_logs table for detailed game records
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001_create_leagues.sql, 00002_create_teams.sql
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.game_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id       UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  day_number      INT NOT NULL,
  home_team_id    UUID NOT NULL REFERENCES public.teams(id),
  away_team_id    UUID NOT NULL REFERENCES public.teams(id),
  home_score      INT NOT NULL,
  away_score      INT NOT NULL,
  box_score       JSONB NOT NULL,
  play_by_play    JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from schedule.game_log_id -> game_logs.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedule_game_log_id_fkey'
  ) THEN
    ALTER TABLE public.schedule
      ADD CONSTRAINT schedule_game_log_id_fkey
      FOREIGN KEY (game_log_id) REFERENCES public.game_logs(id);
  END IF;
END
$$;

COMMENT ON TABLE public.game_logs IS 'Full game records with box score and play-by-play data.';
COMMENT ON COLUMN public.game_logs.box_score IS 'BoxScore JSONB: batting lines, pitching lines, line score.';
COMMENT ON COLUMN public.game_logs.play_by_play IS 'PlayByPlayEntry[] JSONB array of each plate appearance.';

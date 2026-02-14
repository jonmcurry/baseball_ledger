-- Migration: 00025_add_fk_indexes_on_team_refs.sql
-- Purpose:   Add indexes on FK columns that reference teams(id) to prevent
--            full table scans during cascading deletes (fixes DELETE timeout).
-- Author:    Baseball Ledger
-- Date:      2026-02-13
-- Depends:   00004, 00005, 00006, 00016
-- ---------------------------------------------------------------
-- Without these indexes, DELETE FROM teams triggers sequential scans on
-- every referencing table (schedule, game_logs, season_stats, player_pool)
-- to verify no rows still reference the team. With player_pool containing
-- 100k+ rows, this exceeds the Supabase statement timeout.

CREATE INDEX IF NOT EXISTS idx_schedule_home_team
  ON public.schedule(home_team_id);

CREATE INDEX IF NOT EXISTS idx_schedule_away_team
  ON public.schedule(away_team_id);

CREATE INDEX IF NOT EXISTS idx_game_logs_home_team
  ON public.game_logs(home_team_id);

CREATE INDEX IF NOT EXISTS idx_game_logs_away_team
  ON public.game_logs(away_team_id);

CREATE INDEX IF NOT EXISTS idx_season_stats_team
  ON public.season_stats(team_id);

CREATE INDEX IF NOT EXISTS idx_player_pool_drafted_by
  ON public.player_pool(drafted_by_team_id);

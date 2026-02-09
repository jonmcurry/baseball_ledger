-- Migration: 00009_create_indexes.sql
-- Purpose:   Create performance indexes for all tables (REQ-NFR-015)
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001 through 00008
-- ---------------------------------------------------------------

-- Teams: lookup by league, standings sort
CREATE INDEX IF NOT EXISTS idx_teams_league
  ON public.teams(league_id);

CREATE INDEX IF NOT EXISTS idx_teams_standings
  ON public.teams(league_id, league_division, division, wins DESC);

-- Rosters: lookup by team
CREATE INDEX IF NOT EXISTS idx_rosters_team
  ON public.rosters(team_id);

-- Schedule: lookup by league + day
CREATE INDEX IF NOT EXISTS idx_schedule_league_day
  ON public.schedule(league_id, day_number);

-- Season stats: lookup by league
CREATE INDEX IF NOT EXISTS idx_season_stats_league
  ON public.season_stats(league_id);

-- Game logs: lookup by league + day
CREATE INDEX IF NOT EXISTS idx_game_logs_league_day
  ON public.game_logs(league_id, day_number);

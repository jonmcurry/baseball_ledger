-- Migration: 00003_create_rosters.sql
-- Purpose:   Create the rosters table for team player assignments
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00002_create_teams.sql
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rosters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id       TEXT NOT NULL,
  season_year     INT NOT NULL,
  player_card     JSONB NOT NULL,  -- Full PlayerCard object
  roster_slot     TEXT NOT NULL
    CHECK (roster_slot IN ('starter', 'bench', 'rotation', 'bullpen', 'closer')),
  lineup_order    INT CHECK (lineup_order BETWEEN 1 AND 9),
  lineup_position TEXT,
  UNIQUE(team_id, player_id)
);

COMMENT ON TABLE public.rosters IS 'Player assignments to teams with lineup position and slot.';
COMMENT ON COLUMN public.rosters.player_card IS 'Full PlayerCard JSONB including 35-byte card, ratings, and attributes.';
COMMENT ON COLUMN public.rosters.lineup_order IS '1-9 for starters, NULL for bench/bullpen/rotation.';

-- Migration: 00010_enable_rls.sql
-- Purpose:   Enable Row Level Security on data tables (REQ-NFR-005)
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001 through 00008
-- ---------------------------------------------------------------
-- Note: simulation_progress and archives intentionally excluded.
--       simulation_progress is server-side only (no user access).
--       archives are read-only public within a league.

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

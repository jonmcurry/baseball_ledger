-- Migration: 00007_create_archives.sql
-- Purpose:   Create the archives table for completed season records
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001_create_leagues.sql
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.archives (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id           UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_number       INT NOT NULL,
  standings           JSONB NOT NULL,
  playoff_results     JSONB,
  champion            TEXT,
  league_leaders      JSONB,
  stats_storage_path  TEXT,  -- Supabase Storage path for detailed stats
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.archives IS 'Archived season summaries after completion.';
COMMENT ON COLUMN public.archives.standings IS 'Final DivisionStandings[] JSONB snapshot.';
COMMENT ON COLUMN public.archives.stats_storage_path IS 'Path in Supabase Storage for full season stats CSV.';

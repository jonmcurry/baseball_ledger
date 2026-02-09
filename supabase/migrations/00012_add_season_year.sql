-- Migration: 00012_add_season_year.sql
-- Purpose:   Add season_year column to leagues table (REQ-DATA-002a)
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001_create_leagues.sql
-- ---------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leagues'
      AND column_name = 'season_year'
  ) THEN
    ALTER TABLE public.leagues ADD COLUMN season_year INT NOT NULL DEFAULT 1;
  END IF;
END
$$;

COMMENT ON COLUMN public.leagues.season_year IS 'Current season number. Increments when a season is archived.';

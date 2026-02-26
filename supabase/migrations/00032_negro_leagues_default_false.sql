-- Migration: 00032_negro_leagues_default_false.sql
-- Purpose:   Change negro_leagues_enabled column default from true to false.
--            Both toggle defaults should be off for new leagues.
-- Author:    Baseball Ledger
-- Date:      2026-02-26
-- Depends:   00028
-- ---------------------------------------------------------------

ALTER TABLE public.leagues
  ALTER COLUMN negro_leagues_enabled SET DEFAULT false;

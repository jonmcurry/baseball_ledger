-- Migration: 00015_add_playoff_bracket.sql
-- Purpose:   Add playoff_bracket JSONB column to leagues table (REQ-LGE-008)
-- Author:    Baseball Ledger
-- Date:      2026-02-10
-- Depends:   00001_create_leagues.sql
-- ---------------------------------------------------------------
-- Stores the full playoff bracket (AL + NL + World Series) during playoffs status.
-- 2025 MLB playoff format persistence.

ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS playoff_bracket JSONB DEFAULT NULL;

COMMENT ON COLUMN public.leagues.playoff_bracket IS 'FullPlayoffBracket JSON: AL bracket, NL bracket, World Series, and champion.';

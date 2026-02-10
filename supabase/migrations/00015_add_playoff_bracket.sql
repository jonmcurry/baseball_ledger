-- Migration 00015: Add playoff_bracket JSONB column to leagues table
-- Stores the full playoff bracket (AL + NL + World Series) during playoffs status.
-- REQ-LGE-008: 2025 MLB playoff format persistence.

ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS playoff_bracket JSONB DEFAULT NULL;

COMMENT ON COLUMN public.leagues.playoff_bracket IS 'FullPlayoffBracket JSON: AL bracket, NL bracket, World Series, and champion.';

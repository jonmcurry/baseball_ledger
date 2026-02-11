-- Migration: 00020_add_draft_order.sql
-- Purpose:   Add draft_order JSONB column to leagues for snake draft ordering (REQ-DFT-001)
-- Author:    Baseball Ledger
-- Date:      2026-02-11
-- Depends:   00001_create_leagues.sql
-- ---------------------------------------------------------------

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS draft_order JSONB;

COMMENT ON COLUMN public.leagues.draft_order IS 'Ordered array of team IDs for snake draft (REQ-DFT-001). Null until draft starts.';

-- Migration: 00021_add_rosters_created_at.sql
-- Purpose:   Add created_at timestamp to rosters for draft pick ordering
-- Author:    Baseball Ledger
-- Date:      2026-02-11
-- Depends:   00003_create_rosters.sql
-- ---------------------------------------------------------------

ALTER TABLE public.rosters
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.rosters.created_at IS 'Timestamp when player was added to roster (for draft pick ordering).';

-- Create index for efficient ordering by creation time
CREATE INDEX IF NOT EXISTS idx_rosters_created_at ON public.rosters(created_at);

-- Migration: 00024_remove_closer_roster_slot.sql
-- Purpose:   Unify bullpen: remove 'closer' roster_slot, all RP/CL use 'bullpen'
-- Author:    Baseball Ledger
-- Date:      2026-02-13
-- Depends:   00003_create_rosters.sql
-- ---------------------------------------------------------------
-- All RP/CL pitchers now use 'bullpen' slot. The simulation engine
-- derives the closer at runtime from bullpen entries with pitching.role = 'CL'.
-- ---------------------------------------------------------------

-- Convert any existing 'closer' entries to 'bullpen'
UPDATE rosters SET roster_slot = 'bullpen' WHERE roster_slot = 'closer';

-- Drop old check constraint and add new one without 'closer'
ALTER TABLE rosters DROP CONSTRAINT IF EXISTS rosters_roster_slot_check;
ALTER TABLE rosters ADD CONSTRAINT rosters_roster_slot_check
  CHECK (roster_slot IN ('starter', 'bench', 'rotation', 'bullpen'));

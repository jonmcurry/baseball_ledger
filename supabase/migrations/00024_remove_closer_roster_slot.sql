-- Migration: Remove 'closer' roster_slot
--
-- All RP/CL pitchers now use 'bullpen' slot. The simulation engine
-- derives the closer at runtime from bullpen entries with pitching.role = 'CL'.

-- Convert any existing 'closer' entries to 'bullpen'
UPDATE rosters SET roster_slot = 'bullpen' WHERE roster_slot = 'closer';

-- Drop old check constraint and add new one without 'closer'
ALTER TABLE rosters DROP CONSTRAINT IF EXISTS rosters_roster_slot_check;
ALTER TABLE rosters ADD CONSTRAINT rosters_roster_slot_check
  CHECK (roster_slot IN ('starter', 'bench', 'rotation', 'bullpen'));

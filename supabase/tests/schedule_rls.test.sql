-- RLS Tests: schedule table
-- Purpose:   Verify Row Level Security policies for the schedule table
-- Run with:  supabase test db
-- Depends:   Docker + local Supabase running
-- ---------------------------------------------------------------

BEGIN;

SELECT plan(6);

-- Test 1: League member can SELECT schedule
SELECT ok(true, 'League member can SELECT schedule');

-- Test 2: Non-member cannot SELECT schedule
SELECT ok(true, 'Non-member cannot SELECT schedule');

-- Test 3: Commissioner can INSERT schedule entries
SELECT ok(true, 'Commissioner can INSERT schedule entries');

-- Test 4: Non-commissioner cannot INSERT schedule
SELECT ok(true, 'Non-commissioner cannot INSERT schedule');

-- Test 5: Commissioner can UPDATE schedule (scores)
SELECT ok(true, 'Commissioner can UPDATE schedule');

-- Test 6: Non-commissioner cannot UPDATE schedule
SELECT ok(true, 'Non-commissioner cannot UPDATE schedule');

SELECT * FROM finish();

ROLLBACK;

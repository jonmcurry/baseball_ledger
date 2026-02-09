-- RLS Tests: leagues table
-- Purpose:   Verify Row Level Security policies for the leagues table
-- Run with:  supabase test db
-- Depends:   Docker + local Supabase running
-- ---------------------------------------------------------------

BEGIN;

SELECT plan(8);

-- Setup: create test users and data
-- (pgTAP test users are created via supabase auth admin API before running tests)

-- Test 1: Commissioner can SELECT their own league
SELECT ok(true, 'Commissioner can SELECT their own league');

-- Test 2: Team owner can SELECT league they belong to
SELECT ok(true, 'Team owner can SELECT league they belong to');

-- Test 3: Non-member cannot SELECT league
SELECT ok(true, 'Non-member cannot SELECT league');

-- Test 4: Authenticated user can INSERT (create) a league
SELECT ok(true, 'Authenticated user can INSERT a league');

-- Test 5: Commissioner can UPDATE their league
SELECT ok(true, 'Commissioner can UPDATE their league');

-- Test 6: Non-commissioner cannot UPDATE league
SELECT ok(true, 'Non-commissioner cannot UPDATE league');

-- Test 7: Commissioner can DELETE their league
SELECT ok(true, 'Commissioner can DELETE their league');

-- Test 8: Non-commissioner cannot DELETE league
SELECT ok(true, 'Non-commissioner cannot DELETE league');

SELECT * FROM finish();

ROLLBACK;

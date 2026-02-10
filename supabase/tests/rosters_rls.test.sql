-- RLS Tests: rosters table
-- Purpose:   Verify Row Level Security policies for the rosters table
-- Run with:  supabase test db
-- Depends:   Docker + local Supabase running
-- ---------------------------------------------------------------

BEGIN;

SELECT plan(8);

-- Setup: create test users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'commissioner@test.com', 'test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'member@test.com', 'test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'outsider@test.com', 'test', now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Setup: create league + 2 teams (as postgres, bypassing RLS)
INSERT INTO public.leagues (id, name, commissioner_id, invite_key, team_count, status)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'Test League', 'a0000000-0000-0000-0000-000000000001'::uuid, 'TESTKEY1', 4, 'setup');

INSERT INTO public.teams (id, league_id, name, city, owner_id, league_division, division)
VALUES
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'Member Team', 'Test City', 'a0000000-0000-0000-0000-000000000002'::uuid, 'AL', 'East'),
  ('c0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'CPU Team', 'CPU City', NULL, 'NL', 'West');

-- Setup: create a roster entry on the member's team
INSERT INTO public.rosters (id, team_id, player_id, season_year, player_card, roster_slot)
VALUES ('d0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'player001', 2026, '{"name":"Test Player"}', 'starter');

-- Test 1: League member can SELECT all rosters in their league
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.rosters WHERE team_id = 'c0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'League member can SELECT rosters in their league'
);

-- Test 2: Non-member cannot SELECT rosters
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.rosters WHERE team_id = 'c0000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Non-member cannot SELECT rosters'
);

-- Test 3: Team owner can INSERT to their own roster
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO public.rosters (team_id, player_id, season_year, player_card, roster_slot)
    VALUES ('c0000000-0000-0000-0000-000000000001'::uuid, 'player002', 2026, '{"name":"New Player"}', 'bench')$$,
  'Team owner can INSERT to their own roster'
);

-- Test 4: Team owner cannot INSERT to another team's roster
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.rosters (team_id, player_id, season_year, player_card, roster_slot)
    VALUES ('c0000000-0000-0000-0000-000000000002'::uuid, 'player003', 2026, '{"name":"Hacked Player"}', 'starter')$$,
  'new row violates row-level security policy for table "rosters"',
  'Team owner cannot INSERT to another team roster'
);

-- Test 5: Team owner can UPDATE their own roster
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT lives_ok(
  $$UPDATE public.rosters SET roster_slot = 'bench' WHERE id = 'd0000000-0000-0000-0000-000000000001'::uuid$$,
  'Team owner can UPDATE their own roster'
);

-- Test 6: Team owner cannot UPDATE another team's roster
-- First insert a roster entry on the CPU team (as postgres)
RESET role;
INSERT INTO public.rosters (id, team_id, player_id, season_year, player_card, roster_slot)
VALUES ('d0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 'player004', 2026, '{"name":"CPU Player"}', 'starter');

SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE public.rosters SET roster_slot = 'bench' WHERE id = 'd0000000-0000-0000-0000-000000000002'::uuid RETURNING id
  ) AS updated),
  0,
  'Team owner cannot UPDATE another team roster'
);

-- Test 7: Team owner can DELETE from their own roster
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT lives_ok(
  $$DELETE FROM public.rosters WHERE id = 'd0000000-0000-0000-0000-000000000001'::uuid$$,
  'Team owner can DELETE from their own roster'
);

-- Test 8: Commissioner can modify any roster (INSERT to CPU team)
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO public.rosters (team_id, player_id, season_year, player_card, roster_slot)
    VALUES ('c0000000-0000-0000-0000-000000000002'::uuid, 'player005', 2026, '{"name":"Commissioner Pick"}', 'rotation')$$,
  'Commissioner can modify any roster in their league'
);

SELECT * FROM finish();

ROLLBACK;

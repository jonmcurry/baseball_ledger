-- RLS Tests: teams table
-- Purpose:   Verify Row Level Security policies for the teams table
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
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'Test League', 'a0000000-0000-0000-0000-000000000001'::uuid, 'TESTKEY1', 18, 'setup');

INSERT INTO public.teams (id, league_id, name, city, owner_id, league_division, division)
VALUES
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'Member Team', 'Test City', 'a0000000-0000-0000-0000-000000000002'::uuid, 'AL', 'East'),
  ('c0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'CPU Team', 'CPU City', NULL, 'NL', 'West');

-- Test 1: League member can SELECT all teams in their league
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.teams WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  2,
  'League member can SELECT teams in their league'
);

-- Test 2: Non-member cannot SELECT teams
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.teams WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Non-member cannot SELECT teams'
);

-- Test 3: Commissioner can INSERT teams
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO public.teams (league_id, name, city, owner_id, league_division, division)
    VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'New Team', 'New City', NULL, 'AL', 'Central')$$,
  'Commissioner can INSERT teams'
);

-- Test 4: Non-commissioner cannot INSERT teams
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.teams (league_id, name, city, owner_id, league_division, division)
    VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'Hacked Team', 'Hack City', NULL, 'NL', 'Central')$$,
  'new row violates row-level security policy for table "teams"',
  'Non-commissioner cannot INSERT teams'
);

-- Test 5: Team owner can UPDATE their own team
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT lives_ok(
  $$UPDATE public.teams SET name = 'Renamed Team' WHERE id = 'c0000000-0000-0000-0000-000000000001'::uuid$$,
  'Team owner can UPDATE their own team'
);

-- Test 6: Team owner cannot UPDATE another team
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE public.teams SET name = 'Hacked' WHERE id = 'c0000000-0000-0000-0000-000000000002'::uuid RETURNING id
  ) AS updated),
  0,
  'Team owner cannot UPDATE another team'
);

-- Test 7: Commissioner can DELETE teams
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT lives_ok(
  $$DELETE FROM public.teams WHERE id = 'c0000000-0000-0000-0000-000000000002'::uuid$$,
  'Commissioner can DELETE teams'
);

-- Test 8: Non-commissioner cannot DELETE teams
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM public.teams WHERE id = 'c0000000-0000-0000-0000-000000000001'::uuid RETURNING id
  ) AS deleted),
  0,
  'Non-commissioner cannot DELETE teams'
);

SELECT * FROM finish();

ROLLBACK;

-- RLS Tests: schedule table
-- Purpose:   Verify Row Level Security policies for the schedule table
-- Run with:  supabase test db
-- Depends:   Docker + local Supabase running
-- ---------------------------------------------------------------

BEGIN;

SELECT plan(6);

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

-- Setup: create a schedule entry
INSERT INTO public.schedule (id, league_id, day_number, home_team_id, away_team_id, is_complete)
VALUES ('d0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 1,
        'c0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, false);

-- Test 1: League member can SELECT schedule
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.schedule WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'League member can SELECT schedule'
);

-- Test 2: Non-member cannot SELECT schedule
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.schedule WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Non-member cannot SELECT schedule'
);

-- Test 3: Commissioner can INSERT schedule entries
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO public.schedule (league_id, day_number, home_team_id, away_team_id, is_complete)
    VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 2,
            'c0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, false)$$,
  'Commissioner can INSERT schedule entries'
);

-- Test 4: Non-commissioner cannot INSERT schedule
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.schedule (league_id, day_number, home_team_id, away_team_id, is_complete)
    VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 3,
            'c0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, false)$$,
  'new row violates row-level security policy for table "schedule"',
  'Non-commissioner cannot INSERT schedule'
);

-- Test 5: Commissioner can UPDATE schedule (scores)
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT lives_ok(
  $$UPDATE public.schedule SET home_score = 5, away_score = 3, is_complete = true
    WHERE id = 'd0000000-0000-0000-0000-000000000001'::uuid$$,
  'Commissioner can UPDATE schedule'
);

-- Test 6: Non-commissioner cannot UPDATE schedule
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE public.schedule SET home_score = 99 WHERE id = 'd0000000-0000-0000-0000-000000000001'::uuid RETURNING id
  ) AS updated),
  0,
  'Non-commissioner cannot UPDATE schedule'
);

SELECT * FROM finish();

ROLLBACK;

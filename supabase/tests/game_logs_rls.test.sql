-- RLS Tests: game_logs table
-- Purpose:   Verify Row Level Security policies for the game_logs table
-- Run with:  supabase test db
-- Depends:   Docker + local Supabase running
-- ---------------------------------------------------------------

BEGIN;

SELECT plan(4);

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

-- Setup: create a game_logs entry
INSERT INTO public.game_logs (id, league_id, day_number, home_team_id, away_team_id, home_score, away_score, box_score, play_by_play)
VALUES ('f0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 1,
        'c0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid,
        5, 3,
        '{"home":{"hits":8,"runs":5},"away":{"hits":6,"runs":3}}',
        '[]');

-- Test 1: League member can SELECT game logs
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.game_logs WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'League member can SELECT game logs'
);

-- Test 2: Non-member cannot SELECT game logs
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.game_logs WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Non-member cannot SELECT game logs'
);

-- Test 3: Commissioner can INSERT game logs
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO public.game_logs (league_id, day_number, home_team_id, away_team_id, home_score, away_score, box_score, play_by_play)
    VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 2,
            'c0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid,
            2, 7,
            '{"home":{"hits":4,"runs":2},"away":{"hits":10,"runs":7}}',
            '[]')$$,
  'Commissioner can INSERT game logs'
);

-- Test 4: Non-commissioner cannot INSERT game logs
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.game_logs (league_id, day_number, home_team_id, away_team_id, home_score, away_score, box_score, play_by_play)
    VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 3,
            'c0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid,
            0, 1,
            '{"home":{"hits":3,"runs":0},"away":{"hits":5,"runs":1}}',
            '[]')$$,
  'new row violates row-level security policy for table "game_logs"',
  'Non-commissioner cannot INSERT game logs'
);

SELECT * FROM finish();

ROLLBACK;

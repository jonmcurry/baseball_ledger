-- RLS Tests: season_stats table
-- Purpose:   Verify Row Level Security policies for the season_stats table
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

-- Setup: create a season_stats entry
INSERT INTO public.season_stats (id, league_id, player_id, season_year, team_id, batting_stats, pitching_stats)
VALUES ('e0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid,
        'player001', 2026, 'c0000000-0000-0000-0000-000000000001'::uuid,
        '{"G":10,"AB":40,"H":12,"HR":2,"RBI":8}', NULL);

-- Test 1: League member can SELECT season stats
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.season_stats WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'League member can SELECT season stats'
);

-- Test 2: Non-member cannot SELECT season stats
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.season_stats WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Non-member cannot SELECT season stats'
);

-- Test 3: Commissioner can INSERT season stats
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO public.season_stats (league_id, player_id, season_year, team_id, batting_stats, pitching_stats)
    VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'player002', 2026,
            'c0000000-0000-0000-0000-000000000002'::uuid,
            '{"G":5,"AB":20,"H":6,"HR":1,"RBI":3}', NULL)$$,
  'Commissioner can INSERT season stats'
);

-- Test 4: Non-commissioner cannot INSERT season stats
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.season_stats (league_id, player_id, season_year, team_id, batting_stats, pitching_stats)
    VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'player003', 2026,
            'c0000000-0000-0000-0000-000000000001'::uuid,
            '{"G":1,"AB":4,"H":1,"HR":0,"RBI":0}', NULL)$$,
  'new row violates row-level security policy for table "season_stats"',
  'Non-commissioner cannot INSERT season stats'
);

-- Test 5: Commissioner can UPDATE season stats
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT lives_ok(
  $$UPDATE public.season_stats SET batting_stats = '{"G":15,"AB":60,"H":18,"HR":3,"RBI":12}'
    WHERE id = 'e0000000-0000-0000-0000-000000000001'::uuid$$,
  'Commissioner can UPDATE season stats'
);

-- Test 6: Non-commissioner cannot UPDATE season stats
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE public.season_stats SET batting_stats = '{"G":99}' WHERE id = 'e0000000-0000-0000-0000-000000000001'::uuid RETURNING id
  ) AS updated),
  0,
  'Non-commissioner cannot UPDATE season stats'
);

SELECT * FROM finish();

ROLLBACK;

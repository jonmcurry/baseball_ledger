-- RLS Tests: player_pool table
-- Purpose:   Verify Row Level Security policies for the player_pool table
-- Run with:  supabase test db
-- Depends:   00016_create_player_pool.sql, 00017_player_pool_rls.sql
-- ---------------------------------------------------------------

BEGIN;

SELECT plan(6);

-- Setup: create test users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'commissioner@test.com', 'test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'member@test.com', 'test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'outsider@test.com', 'test', now(), 'authenticated', 'authenticated');

-- Setup: create league + team (as postgres, bypassing RLS)
INSERT INTO public.leagues (id, name, commissioner_id, invite_key, team_count, status)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'Test League', 'a0000000-0000-0000-0000-000000000001'::uuid, 'TESTKEY1', 4, 'setup');

INSERT INTO public.teams (id, league_id, name, city, owner_id, league_division, division)
VALUES ('c0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'Test Team', 'Test City', 'a0000000-0000-0000-0000-000000000002'::uuid, 'AL', 'East');

-- Setup: create player_pool entry (as postgres, bypassing RLS)
INSERT INTO public.player_pool (id, league_id, player_id, season_year, player_card)
VALUES ('d0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'ruthba01', 1927, '{"playerId":"ruthba01","nameFirst":"Babe","nameLast":"Ruth"}');

-- Test 1: Commissioner can SELECT player_pool for their league
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.player_pool WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Commissioner can SELECT player_pool for their league'
);

-- Test 2: Team owner (member) can SELECT player_pool for their league
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.player_pool WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Team owner can SELECT player_pool for their league'
);

-- Test 3: Non-member cannot SELECT player_pool
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.player_pool WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Non-member cannot SELECT player_pool'
);

-- Test 4: Authenticated user cannot INSERT into player_pool (service role only)
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.player_pool (league_id, player_id, season_year, player_card) VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'cobbty01', 1927, '{"playerId":"cobbty01"}')$$,
  '42501',
  NULL,
  'Authenticated user cannot INSERT into player_pool'
);

-- Test 5: Authenticated user cannot UPDATE player_pool
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE public.player_pool SET is_drafted = true WHERE id = 'd0000000-0000-0000-0000-000000000001'::uuid RETURNING id
  ) AS updated),
  0,
  'Authenticated user cannot UPDATE player_pool'
);

-- Test 6: Authenticated user cannot DELETE from player_pool
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM public.player_pool WHERE id = 'd0000000-0000-0000-0000-000000000001'::uuid RETURNING id
  ) AS deleted),
  0,
  'Authenticated user cannot DELETE from player_pool'
);

SELECT * FROM finish();

ROLLBACK;

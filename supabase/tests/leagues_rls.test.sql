-- RLS Tests: leagues table
-- Purpose:   Verify Row Level Security policies for the leagues table
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
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'outsider@test.com', 'test', now(), 'authenticated', 'authenticated');

-- Setup: create league + team (as postgres, bypassing RLS)
INSERT INTO public.leagues (id, name, commissioner_id, invite_key, team_count, status)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'Test League', 'a0000000-0000-0000-0000-000000000001'::uuid, 'TESTKEY1', 4, 'setup');

INSERT INTO public.teams (id, league_id, name, city, owner_id, league_division, division)
VALUES ('c0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'Test Team', 'Test City', 'a0000000-0000-0000-0000-000000000002'::uuid, 'AL', 'East');

-- Test 1: Commissioner can SELECT their own league
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.leagues WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Commissioner can SELECT their own league'
);

-- Test 2: Team owner (member) can SELECT league they belong to
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.leagues WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Team owner can SELECT league they belong to'
);

-- Test 3: Non-member cannot SELECT league
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.leagues WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Non-member cannot SELECT league'
);

-- Test 4: Authenticated user can INSERT (create) a league (as commissioner)
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO public.leagues (name, commissioner_id, invite_key, team_count) VALUES ('New League', 'a0000000-0000-0000-0000-000000000003'::uuid, 'TESTKEY2', 4)$$,
  'Authenticated user can INSERT a league'
);

-- Test 5: Commissioner can UPDATE their league
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT lives_ok(
  $$UPDATE public.leagues SET name = 'Updated League' WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid$$,
  'Commissioner can UPDATE their league'
);

-- Test 6: Non-commissioner cannot UPDATE league
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE public.leagues SET name = 'Hacked' WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid RETURNING id
  ) AS updated),
  0,
  'Non-commissioner cannot UPDATE league'
);

-- Test 7: Commissioner can DELETE their league
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT lives_ok(
  $$DELETE FROM public.leagues WHERE commissioner_id = 'a0000000-0000-0000-0000-000000000003'::uuid$$,
  'Commissioner can DELETE their league'
);

-- Test 8: Non-commissioner cannot DELETE league
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM public.leagues WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid RETURNING id
  ) AS deleted),
  0,
  'Non-commissioner cannot DELETE league'
);

SELECT * FROM finish();

ROLLBACK;

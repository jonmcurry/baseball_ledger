-- RLS Tests: transactions table
-- Purpose:   Verify Row Level Security policies for the transactions table
-- Run with:  supabase test db
-- Depends:   00018_create_transactions.sql
-- ---------------------------------------------------------------

BEGIN;

SELECT plan(8);

-- Setup: create test users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'commissioner@test.com', 'test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'member@test.com', 'test', now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'outsider@test.com', 'test', now(), 'authenticated', 'authenticated');

-- Setup: create league + teams (as postgres, bypassing RLS)
INSERT INTO public.leagues (id, name, commissioner_id, invite_key, team_count, status)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'Test League', 'a0000000-0000-0000-0000-000000000001'::uuid, 'TESTKEY1', 4, 'setup');

INSERT INTO public.teams (id, league_id, name, city, owner_id, league_division, division)
VALUES
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'Team A', 'City A', 'a0000000-0000-0000-0000-000000000002'::uuid, 'AL', 'East'),
  ('c0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'Team B', 'City B', NULL, 'NL', 'West');

-- Setup: create transaction record (as postgres, bypassing RLS)
INSERT INTO public.transactions (id, league_id, team_id, type, details)
VALUES ('e0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'add', '{"playersAdded":["ruthba01"]}');

-- Test 1: Team owner can SELECT transactions for their league
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.transactions WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Team owner can SELECT transactions for their league'
);

-- Test 2: Non-member cannot SELECT transactions
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.transactions WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Non-member cannot SELECT transactions'
);

-- Test 3: Team owner can INSERT transaction for their own team
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO public.transactions (league_id, team_id, type, details) VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'drop', '{"playersDropped":["cobbty01"]}')$$,
  'Team owner can INSERT transaction for their own team'
);

-- Test 4: Team owner cannot INSERT transaction for another team
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.transactions (league_id, team_id, type, details) VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 'add', '{"playersAdded":["cobbty01"]}')$$,
  '42501',
  NULL,
  'Team owner cannot INSERT transaction for another team'
);

-- Test 5: Non-member cannot INSERT transactions
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO public.transactions (league_id, team_id, type, details) VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 'add', '{"playersAdded":["cobbty01"]}')$$,
  '42501',
  NULL,
  'Non-member cannot INSERT transactions'
);

-- Test 6: Authenticated user cannot UPDATE transactions (no UPDATE policy)
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    UPDATE public.transactions SET type = 'trade' WHERE id = 'e0000000-0000-0000-0000-000000000001'::uuid RETURNING id
  ) AS updated),
  0,
  'Authenticated user cannot UPDATE transactions'
);

-- Test 7: Authenticated user cannot DELETE transactions (no DELETE policy)
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM (
    DELETE FROM public.transactions WHERE id = 'e0000000-0000-0000-0000-000000000001'::uuid RETURNING id
  ) AS deleted),
  0,
  'Authenticated user cannot DELETE transactions'
);

-- Test 8: Commissioner can SELECT transactions (via team ownership or league membership)
-- Note: Commissioner doesn't own a team in this setup, so they cannot see transactions
-- unless the SELECT policy also checks commissioner_id (it currently only checks team ownership)
SET LOCAL request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::int FROM public.transactions WHERE league_id = 'b0000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Commissioner without team cannot SELECT transactions (policy checks team ownership only)'
);

SELECT * FROM finish();

ROLLBACK;

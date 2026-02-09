-- Seed Data for Baseball Ledger Local Development
-- Purpose:   Populate local database with sample data for testing
-- Usage:     supabase db reset (applies migrations + seed automatically)
-- ---------------------------------------------------------------
-- All UUIDs use 00000000-0000-0000-0000-xxxxxxxxxxxx prefix for easy identification.
-- All INSERTs use ON CONFLICT DO NOTHING for idempotency.

-- ===================================================================
-- TEST USERS (inserted into auth.users for FK references)
-- ===================================================================
-- User 1: Commissioner (alice@test.com)
--   UUID: 00000000-0000-0000-0000-000000000001
-- User 2: Team Owner (bob@test.com)
--   UUID: 00000000-0000-0000-0000-000000000002
-- User 3: Team Owner (carol@test.com)
--   UUID: 00000000-0000-0000-0000-000000000003

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alice@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Alice Commissioner"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bob@test.com',   crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Bob Owner"}'::jsonb),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carol@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Carol Owner"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SAMPLE LEAGUE
-- ===================================================================

INSERT INTO public.leagues (
  id, name, commissioner_id, invite_key, team_count,
  year_range_start, year_range_end, injuries_enabled,
  playoff_rules, status, current_day, season_year
) VALUES (
  '00000000-0000-0000-0000-000000000100',
  'Seed League 1993',
  '00000000-0000-0000-0000-000000000001',
  'SEED-INVITE-KEY-001',
  8,
  1990, 1995, false,
  '{"rounds": 3, "gamesPerSeries": [5, 7, 7]}'::JSONB,
  'regular_season',
  81,
  1
) ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SAMPLE TEAMS (8 teams across 4 divisions)
-- ===================================================================

INSERT INTO public.teams (id, league_id, name, city, owner_id, manager_profile, league_division, division, wins, losses, runs_scored, runs_allowed) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000100', 'Sluggers',   'New York',     '00000000-0000-0000-0000-000000000001', 'balanced',     'AL', 'East', 52, 29, 412, 321),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000100', 'Aces',       'Boston',       '00000000-0000-0000-0000-000000000002', 'aggressive',   'AL', 'East', 45, 36, 378, 345),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000100', 'Pioneers',   'Seattle',      '00000000-0000-0000-0000-000000000003', 'analytical',   'AL', 'West', 48, 33, 395, 330),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000100', 'Rangers',    'Texas',        NULL,                                    'conservative', 'AL', 'West', 38, 43, 340, 365),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000100', 'Braves',     'Atlanta',      NULL,                                    'balanced',     'NL', 'East', 55, 26, 430, 298),
  ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000100', 'Cardinals',  'St. Louis',    NULL,                                    'aggressive',   'NL', 'East', 42, 39, 360, 358),
  ('00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000100', 'Dodgers',    'Los Angeles',  NULL,                                    'analytical',   'NL', 'West', 50, 31, 405, 325),
  ('00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000100', 'Giants',     'San Francisco', NULL,                                   'conservative', 'NL', 'West', 35, 46, 320, 380)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SAMPLE SCHEDULE (days 80-84, first 2 days complete)
-- ===================================================================

-- Day 80 (complete)
INSERT INTO public.schedule (id, league_id, day_number, home_team_id, away_team_id, home_score, away_score, is_complete) VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000100', 80, '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202', 5, 3, true),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000100', 80, '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000204', 7, 2, true),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000100', 80, '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000206', 4, 4, true),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000100', 80, '00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000208', 6, 1, true)
ON CONFLICT (id) DO NOTHING;

-- Day 81 (complete)
INSERT INTO public.schedule (id, league_id, day_number, home_team_id, away_team_id, home_score, away_score, is_complete) VALUES
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000100', 81, '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000201', 2, 8, true),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000100', 81, '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000203', 4, 5, true),
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000100', 81, '00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000205', 1, 3, true),
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000100', 81, '00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000207', 3, 9, true)
ON CONFLICT (id) DO NOTHING;

-- Day 82 (upcoming)
INSERT INTO public.schedule (id, league_id, day_number, home_team_id, away_team_id, is_complete) VALUES
  ('00000000-0000-0000-0000-000000000309', '00000000-0000-0000-0000-000000000100', 82, '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000203', false),
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000100', 82, '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000204', false),
  ('00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000100', 82, '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000207', false),
  ('00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000100', 82, '00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000208', false)
ON CONFLICT (id) DO NOTHING;

-- Day 83 (upcoming)
INSERT INTO public.schedule (id, league_id, day_number, home_team_id, away_team_id, is_complete) VALUES
  ('00000000-0000-0000-0000-000000000313', '00000000-0000-0000-0000-000000000100', 83, '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000201', false),
  ('00000000-0000-0000-0000-000000000314', '00000000-0000-0000-0000-000000000100', 83, '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000202', false),
  ('00000000-0000-0000-0000-000000000315', '00000000-0000-0000-0000-000000000100', 83, '00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000205', false),
  ('00000000-0000-0000-0000-000000000316', '00000000-0000-0000-0000-000000000100', 83, '00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000206', false)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- SIMULATION PROGRESS (idle state)
-- ===================================================================

INSERT INTO public.simulation_progress (league_id, status, total_games, completed_games, current_day)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  'idle', 0, 0, 81
) ON CONFLICT (league_id) DO NOTHING;

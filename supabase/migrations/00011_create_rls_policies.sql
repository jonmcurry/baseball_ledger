-- Migration: 00011_create_rls_policies.sql
-- Purpose:   Create Row Level Security policies for all RLS-enabled tables
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00010_enable_rls.sql
-- ---------------------------------------------------------------

-- ===================================================================
-- LEAGUES
-- ===================================================================

-- League members can view their leagues (commissioner or team owner)
CREATE POLICY leagues_select ON public.leagues
  FOR SELECT USING (
    commissioner_id = auth.uid()
    OR id IN (
      SELECT league_id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

-- Only authenticated users can create leagues
CREATE POLICY leagues_insert ON public.leagues
  FOR INSERT WITH CHECK (
    commissioner_id = auth.uid()
  );

-- Only the commissioner can update their league
CREATE POLICY leagues_update ON public.leagues
  FOR UPDATE USING (
    commissioner_id = auth.uid()
  );

-- Only the commissioner can delete their league
CREATE POLICY leagues_delete ON public.leagues
  FOR DELETE USING (
    commissioner_id = auth.uid()
  );

-- ===================================================================
-- TEAMS
-- ===================================================================

-- League members can view all teams in their league
CREATE POLICY teams_select ON public.teams
  FOR SELECT USING (
    league_id IN (
      SELECT id FROM public.leagues
      WHERE commissioner_id = auth.uid()
      OR id IN (SELECT league_id FROM public.teams WHERE owner_id = auth.uid())
    )
  );

-- Commissioner can create teams
CREATE POLICY teams_insert ON public.teams
  FOR INSERT WITH CHECK (
    league_id IN (
      SELECT id FROM public.leagues WHERE commissioner_id = auth.uid()
    )
  );

-- Team owner or commissioner can update a team
CREATE POLICY teams_update ON public.teams
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR league_id IN (
      SELECT id FROM public.leagues WHERE commissioner_id = auth.uid()
    )
  );

-- Commissioner can delete teams
CREATE POLICY teams_delete ON public.teams
  FOR DELETE USING (
    league_id IN (
      SELECT id FROM public.leagues WHERE commissioner_id = auth.uid()
    )
  );

-- ===================================================================
-- ROSTERS
-- ===================================================================

-- League members can view all rosters in their league
CREATE POLICY rosters_select ON public.rosters
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE l.commissioner_id = auth.uid()
      OR t.owner_id = auth.uid()
      OR t.league_id IN (SELECT league_id FROM public.teams WHERE owner_id = auth.uid())
    )
  );

-- Team owner can modify their own roster
CREATE POLICY rosters_insert ON public.rosters
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE l.commissioner_id = auth.uid()
    )
  );

CREATE POLICY rosters_update ON public.rosters
  FOR UPDATE USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE l.commissioner_id = auth.uid()
    )
  );

CREATE POLICY rosters_delete ON public.rosters
  FOR DELETE USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE l.commissioner_id = auth.uid()
    )
  );

-- ===================================================================
-- SCHEDULE
-- ===================================================================

-- League members can view schedule
CREATE POLICY schedule_select ON public.schedule
  FOR SELECT USING (
    league_id IN (
      SELECT id FROM public.leagues
      WHERE commissioner_id = auth.uid()
      OR id IN (SELECT league_id FROM public.teams WHERE owner_id = auth.uid())
    )
  );

-- Server-side only writes (via service role key), but commissioner can insert
CREATE POLICY schedule_insert ON public.schedule
  FOR INSERT WITH CHECK (
    league_id IN (
      SELECT id FROM public.leagues WHERE commissioner_id = auth.uid()
    )
  );

CREATE POLICY schedule_update ON public.schedule
  FOR UPDATE USING (
    league_id IN (
      SELECT id FROM public.leagues WHERE commissioner_id = auth.uid()
    )
  );

-- ===================================================================
-- SEASON_STATS
-- ===================================================================

-- League members can view stats
CREATE POLICY season_stats_select ON public.season_stats
  FOR SELECT USING (
    league_id IN (
      SELECT id FROM public.leagues
      WHERE commissioner_id = auth.uid()
      OR id IN (SELECT league_id FROM public.teams WHERE owner_id = auth.uid())
    )
  );

-- Server-side only writes (simulation updates stats via service role key)
CREATE POLICY season_stats_insert ON public.season_stats
  FOR INSERT WITH CHECK (
    league_id IN (
      SELECT id FROM public.leagues WHERE commissioner_id = auth.uid()
    )
  );

CREATE POLICY season_stats_update ON public.season_stats
  FOR UPDATE USING (
    league_id IN (
      SELECT id FROM public.leagues WHERE commissioner_id = auth.uid()
    )
  );

-- ===================================================================
-- GAME_LOGS
-- ===================================================================

-- League members can view game logs
CREATE POLICY game_logs_select ON public.game_logs
  FOR SELECT USING (
    league_id IN (
      SELECT id FROM public.leagues
      WHERE commissioner_id = auth.uid()
      OR id IN (SELECT league_id FROM public.teams WHERE owner_id = auth.uid())
    )
  );

-- Server-side only writes
CREATE POLICY game_logs_insert ON public.game_logs
  FOR INSERT WITH CHECK (
    league_id IN (
      SELECT id FROM public.leagues WHERE commissioner_id = auth.uid()
    )
  );

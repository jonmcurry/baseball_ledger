-- Migration: 00019_unique_owner_per_league.sql
-- Purpose:   Enforce one user per team per league (REQ-LGE-007)
-- Author:    Baseball Ledger
-- Date:      2026-02-11
-- Depends:   00002_create_teams.sql
-- ---------------------------------------------------------------
-- Partial unique index: prevents a single user from owning multiple
-- teams in the same league. NULL owner_id (CPU teams) is excluded
-- so multiple CPU teams can exist in each league.

CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_league_owner
  ON public.teams (league_id, owner_id)
  WHERE owner_id IS NOT NULL;

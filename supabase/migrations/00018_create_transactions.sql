-- Migration: 00018_create_transactions.sql
-- Purpose:   Create transactions table for roster transaction audit log (REQ-RST-005)
-- Author:    Baseball Ledger
-- Date:      2026-02-10
-- Depends:   00001_create_leagues.sql, 00002_create_teams.sql
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id       UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('add', 'drop', 'trade')),
  details         JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Audit log for all roster transactions (REQ-RST-005).';
COMMENT ON COLUMN public.transactions.details IS 'JSONB payload: add={playersAdded}, drop={playersDropped}, trade={targetTeamId, playersFromMe, playersFromThem}.';

CREATE INDEX IF NOT EXISTS idx_transactions_league_created
  ON public.transactions(league_id, created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transactions_select ON public.transactions
  FOR SELECT USING (
    league_id IN (
      SELECT league_id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY transactions_insert ON public.transactions
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

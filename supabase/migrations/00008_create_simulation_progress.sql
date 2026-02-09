-- Migration: 00008_create_simulation_progress.sql
-- Purpose:   Create the simulation_progress table for tracking async simulations
-- Author:    Baseball Ledger
-- Date:      2026-02-09
-- Depends:   00001_create_leagues.sql
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.simulation_progress (
  league_id       UUID PRIMARY KEY REFERENCES public.leagues(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'running', 'completed', 'error')),
  total_games     INT NOT NULL DEFAULT 0,
  completed_games INT NOT NULL DEFAULT 0,
  current_day     INT NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message   TEXT
);

COMMENT ON TABLE public.simulation_progress IS 'Tracks async simulation progress. One row per league. No RLS (server-side only).';
COMMENT ON COLUMN public.simulation_progress.status IS 'idle -> running -> completed/error. Reset to idle before next sim.';

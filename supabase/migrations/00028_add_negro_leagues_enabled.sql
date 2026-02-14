-- Migration: 00028_add_negro_leagues_enabled.sql
-- Purpose:   Add negro_leagues_enabled column to leagues table.
--            When false, Negro League players (NNL, NN2, NAL, ECL, NSL, ANL, NAC)
--            are excluded from the player pool during league creation.
-- Author:    Baseball Ledger
-- Date:      2026-02-13
-- Depends:   00001
-- ---------------------------------------------------------------

ALTER TABLE public.leagues
  ADD COLUMN negro_leagues_enabled BOOLEAN NOT NULL DEFAULT true;

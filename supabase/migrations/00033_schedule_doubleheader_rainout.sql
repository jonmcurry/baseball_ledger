-- Migration: 00033_schedule_doubleheader_rainout.sql
-- Purpose:   Add doubleheader and rainout support to schedule table.
--            game_number distinguishes regular games (1) from DH game 2.
--            is_rainout marks cancelled games; makeup_of_id links makeup games.
-- Author:    Baseball Ledger
-- Date:      2026-02-28
-- Depends:   00004
-- ---------------------------------------------------------------

ALTER TABLE public.schedule ADD COLUMN IF NOT EXISTS game_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.schedule ADD COLUMN IF NOT EXISTS is_rainout BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.schedule ADD COLUMN IF NOT EXISTS makeup_of_id UUID REFERENCES public.schedule(id);

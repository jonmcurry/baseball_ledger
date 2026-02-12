-- Migration: 00022_add_valuation_score.sql
-- Purpose:   Add pre-computed valuation score to player_pool for efficient
--            AI draft queries. Fixes bug where Supabase 1000-row default limit
--            caused CPU teams to only see alphabetically-first players.
-- Author:    Baseball Ledger
-- Date:      2026-02-12
-- Depends:   00016_create_player_pool.sql
-- ---------------------------------------------------------------

ALTER TABLE public.player_pool
  ADD COLUMN IF NOT EXISTS valuation_score FLOAT NOT NULL DEFAULT 0;

-- Partial index for fast "top N undrafted by value" queries during draft
CREATE INDEX IF NOT EXISTS idx_player_pool_valuation
  ON public.player_pool(league_id, valuation_score DESC)
  WHERE is_drafted = false;

-- Backfill existing rows with approximate valuation from JSONB stats.
-- Batters: OPS * 100 (primary value driver per REQ-DFT-007)
-- Pitchers: (4.50 - ERA) * 30 (SP formula dominant term)
-- Fallback: 70 for cards missing stats
UPDATE public.player_pool
SET valuation_score = COALESCE(
  CASE
    WHEN (player_card->>'isPitcher')::boolean = true
    THEN ((4.50 - COALESCE((player_card->'pitching'->>'era')::float, 4.50)) * 30)
         + (COALESCE((player_card->'pitching'->>'k9')::float, 0) * 5)
    ELSE COALESCE((player_card->'mlbBattingStats'->>'OPS')::float, 0.700) * 100
         + COALESCE((player_card->'mlbBattingStats'->>'SB')::float, 0) * 0.5
         + COALESCE((player_card->>'fieldingPct')::float, 0.95) * 20
  END,
  70
)
WHERE valuation_score = 0;

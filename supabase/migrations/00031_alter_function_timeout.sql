-- Migration: 00031_alter_function_timeout.sql
-- Purpose:   Fix statement_timeout for delete_league_cascade. SET LOCAL inside
--            the function body is overridden by the session-level timeout that
--            Supabase PostgREST imposes (~8s). ALTER FUNCTION ... SET attaches
--            the GUC value to the function execution context, which takes
--            precedence over session settings.
-- Author:    Baseball Ledger
-- Date:      2026-02-14
-- Depends:   00030
-- ---------------------------------------------------------------

-- Re-create the function without the now-unnecessary SET LOCAL,
-- and attach the timeout via ALTER FUNCTION SET.
CREATE OR REPLACE FUNCTION public.delete_league_cascade(p_league_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- All child tables have ON DELETE CASCADE on their league_id FK.
  -- A single league deletion cascades to all dependent records.
  DELETE FROM public.leagues WHERE id = p_league_id;
END;
$$;

-- Attach statement_timeout at function level (overrides session GUC).
ALTER FUNCTION public.delete_league_cascade(UUID) SET statement_timeout = '60s';

COMMENT ON FUNCTION public.delete_league_cascade IS
  'Atomically delete a league and all child records via ON DELETE CASCADE. 60s timeout.';

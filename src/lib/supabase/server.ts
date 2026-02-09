/**
 * Supabase Server Client
 *
 * Creates a Supabase client with the service role key for use in
 * Vercel Serverless Functions. Bypasses RLS for server-side operations.
 *
 * Environment variables (server-side only, never VITE_ prefixed):
 *   SUPABASE_URL             - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (bypasses RLS)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@lib/types/database';

export function createServerClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server environment variables. ' +
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

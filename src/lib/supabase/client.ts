/**
 * Supabase Browser Client
 *
 * Singleton client for browser-side Supabase access.
 * Uses the anon key (RLS-enforced). Safe for browser exposure.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL  - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Supabase anonymous (public) key
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@lib/types/database';

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
    );
  }

  browserClient = createClient<Database>(url, anonKey);
  return browserClient;
}

/**
 * Reset the singleton client (for testing only).
 */
export function resetSupabaseClient(): void {
  browserClient = null;
}

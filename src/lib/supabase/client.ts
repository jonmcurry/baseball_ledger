/**
 * Supabase Browser Client
 *
 * Singleton client for browser-side Supabase access.
 * Uses the anon key (RLS-enforced). Safe for browser exposure.
 * Config sourced from centralized client config module (REQ-ENV-003).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@lib/types/database';
import { getClientConfig } from '@lib/config';

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const config = getClientConfig();
  browserClient = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey);
  return browserClient;
}

/**
 * Reset the singleton client (for testing only).
 */
export function resetSupabaseClient(): void {
  browserClient = null;
}

/**
 * Supabase Server Client
 *
 * Creates a Supabase client with the service role key for use in
 * Vercel Serverless Functions. Bypasses RLS for server-side operations.
 *
 * Reads env vars directly rather than importing api/_lib/config to avoid
 * cross-project TypeScript boundary issues. API handlers use getServerConfig()
 * from api/_lib/config.ts for the full server config (REQ-ENV-005).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@lib/types/database';

function requireServerEnv(key: string, fallbackKey?: string): string {
  const value = process.env[key] ?? (fallbackKey ? process.env[fallbackKey] : undefined);
  if (!value || value.trim() === '') {
    const keys = fallbackKey ? `${key} or ${fallbackKey}` : key;
    throw new Error(
      `Missing required server environment variable: ${keys}. ` +
      'Set it in Vercel dashboard or .env.local.'
    );
  }
  return value;
}

export function createServerClient(): SupabaseClient<Database> {
  const supabaseUrl = requireServerEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const serviceRoleKey = requireServerEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Server Configuration Module (REQ-ENV-005)
 *
 * Centralized typed config for server-side environment variables.
 * Validates required vars on first access -- fail-fast at startup.
 *
 * Environment variables:
 *   SUPABASE_URL              - Supabase project URL (required, falls back to VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key, bypasses RLS (required)
 *   ANTHROPIC_API_KEY         - Claude API key (optional, AI degrades gracefully)
 *
 * Layer 2: API infrastructure.
 */

export interface ServerConfig {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
  readonly anthropicApiKey: string | undefined;
}

function requireEnv(key: string, fallbackKey?: string): string {
  const value = process.env[key] ?? (fallbackKey ? process.env[fallbackKey] : undefined);
  if (!value || value.trim() === '') {
    const keys = fallbackKey ? `${key} or ${fallbackKey}` : key;
    throw new Error(
      `Missing required server environment variable: ${keys}. ` +
      'Set it in Vercel dashboard or .env.local.'
    );
  }
  return value.trim();
}

let _cached: ServerConfig | null = null;

/**
 * Get the server configuration, validating on first access.
 * Throws if required environment variables are missing.
 */
export function getServerConfig(): ServerConfig {
  if (_cached) return _cached;
  _cached = {
    supabaseUrl: requireEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
  };
  return _cached;
}

/**
 * Reset cached config (for testing only).
 */
export function _resetServerConfig(): void {
  _cached = null;
}

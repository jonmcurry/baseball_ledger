/**
 * Client Configuration Module (REQ-ENV-003, REQ-ENV-004)
 *
 * Centralized typed config for browser-side environment variables.
 * Validates required vars on first access -- fail-fast at startup.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL      - Supabase project URL (required)
 *   VITE_SUPABASE_ANON_KEY - Supabase anonymous key (required)
 *   VITE_APP_ENV            - Application environment (optional, defaults to 'development')
 *
 * Layer 0: Pure configuration, no side effects beyond validation.
 */

export interface ClientConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly appEnv: string;
}

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value || typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      'Set it in .env.local (see .env.example for reference).'
    );
  }
  return value.trim();
}

let _cached: ClientConfig | null = null;

/**
 * Get the client configuration, validating on first access.
 * Throws if required environment variables are missing.
 */
export function getClientConfig(): ClientConfig {
  if (_cached) return _cached;
  _cached = {
    supabaseUrl: requireEnv('VITE_SUPABASE_URL'),
    supabaseAnonKey: requireEnv('VITE_SUPABASE_ANON_KEY'),
    appEnv: (import.meta.env.VITE_APP_ENV as string) || 'development',
  };
  return _cached;
}

/**
 * Reset cached config (for testing only).
 */
export function _resetClientConfig(): void {
  _cached = null;
}

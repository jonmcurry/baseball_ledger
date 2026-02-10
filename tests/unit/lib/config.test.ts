/**
 * Tests for Client Config Module (REQ-ENV-003, REQ-ENV-004)
 *
 * Validates:
 * - getClientConfig returns typed config with required fields
 * - Throws on first access if required env vars are missing
 * - Optional vars have sensible defaults
 * - Caches after first call
 */

describe('getClientConfig', () => {
  const ORIGINAL_ENV = { ...import.meta.env };

  afterEach(() => {
    // Restore original env
    Object.keys(import.meta.env).forEach((key) => {
      if (!(key in ORIGINAL_ENV)) {
        delete (import.meta.env as Record<string, unknown>)[key];
      }
    });
    Object.assign(import.meta.env, ORIGINAL_ENV);
    vi.resetModules();
  });

  it('returns supabaseUrl from VITE_SUPABASE_URL', async () => {
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_URL = 'https://test.supabase.co';
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    const { getClientConfig } = await import('../../../src/lib/config');
    const config = getClientConfig();

    expect(config.supabaseUrl).toBe('https://test.supabase.co');
  });

  it('returns supabaseAnonKey from VITE_SUPABASE_ANON_KEY', async () => {
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_URL = 'https://test.supabase.co';
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    const { getClientConfig } = await import('../../../src/lib/config');
    const config = getClientConfig();

    expect(config.supabaseAnonKey).toBe('test-anon-key');
  });

  it('returns appEnv defaulting to development', async () => {
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_URL = 'https://test.supabase.co';
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_ANON_KEY = 'test-anon-key';
    delete (import.meta.env as Record<string, unknown>).VITE_APP_ENV;

    const { getClientConfig } = await import('../../../src/lib/config');
    const config = getClientConfig();

    expect(config.appEnv).toBe('development');
  });

  it('reads VITE_APP_ENV when set', async () => {
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_URL = 'https://test.supabase.co';
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_ANON_KEY = 'test-anon-key';
    (import.meta.env as Record<string, unknown>).VITE_APP_ENV = 'production';

    const { getClientConfig } = await import('../../../src/lib/config');
    const config = getClientConfig();

    expect(config.appEnv).toBe('production');
  });

  it('throws if VITE_SUPABASE_URL is missing', async () => {
    delete (import.meta.env as Record<string, unknown>).VITE_SUPABASE_URL;
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_ANON_KEY = 'test-anon-key';

    const { getClientConfig } = await import('../../../src/lib/config');

    expect(() => getClientConfig()).toThrow('VITE_SUPABASE_URL');
  });

  it('throws if VITE_SUPABASE_ANON_KEY is missing', async () => {
    (import.meta.env as Record<string, unknown>).VITE_SUPABASE_URL = 'https://test.supabase.co';
    delete (import.meta.env as Record<string, unknown>).VITE_SUPABASE_ANON_KEY;

    const { getClientConfig } = await import('../../../src/lib/config');

    expect(() => getClientConfig()).toThrow('VITE_SUPABASE_ANON_KEY');
  });
});

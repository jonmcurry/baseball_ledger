/**
 * Tests for Server Config Module (REQ-ENV-005)
 *
 * Validates:
 * - getServerConfig returns typed config with required server-side fields
 * - Throws if required vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing
 * - Optional vars (ANTHROPIC_API_KEY) default gracefully
 */

describe('getServerConfig', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it('returns supabaseUrl from SUPABASE_URL', async () => {
    process.env.SUPABASE_URL = 'https://server.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv-key';

    const { getServerConfig } = await import('../../../../api/_lib/config');
    const config = getServerConfig();

    expect(config.supabaseUrl).toBe('https://server.supabase.co');
  });

  it('falls back to VITE_SUPABASE_URL if SUPABASE_URL is not set', async () => {
    delete process.env.SUPABASE_URL;
    process.env.VITE_SUPABASE_URL = 'https://vite-fallback.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv-key';

    const { getServerConfig } = await import('../../../../api/_lib/config');
    const config = getServerConfig();

    expect(config.supabaseUrl).toBe('https://vite-fallback.supabase.co');
  });

  it('returns serviceRoleKey from SUPABASE_SERVICE_ROLE_KEY', async () => {
    process.env.SUPABASE_URL = 'https://server.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'my-service-key';

    const { getServerConfig } = await import('../../../../api/_lib/config');
    const config = getServerConfig();

    expect(config.serviceRoleKey).toBe('my-service-key');
  });

  it('returns anthropicApiKey as undefined when not set', async () => {
    process.env.SUPABASE_URL = 'https://server.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv-key';
    delete process.env.ANTHROPIC_API_KEY;

    const { getServerConfig } = await import('../../../../api/_lib/config');
    const config = getServerConfig();

    expect(config.anthropicApiKey).toBeUndefined();
  });

  it('returns anthropicApiKey when set', async () => {
    process.env.SUPABASE_URL = 'https://server.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv-key';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

    const { getServerConfig } = await import('../../../../api/_lib/config');
    const config = getServerConfig();

    expect(config.anthropicApiKey).toBe('sk-ant-test');
  });

  it('throws if SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    process.env.SUPABASE_URL = 'https://server.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { getServerConfig } = await import('../../../../api/_lib/config');

    expect(() => getServerConfig()).toThrow('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('throws if both SUPABASE_URL and VITE_SUPABASE_URL are missing', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv-key';

    const { getServerConfig } = await import('../../../../api/_lib/config');

    expect(() => getServerConfig()).toThrow('SUPABASE_URL');
  });
});

/**
 * Mock Supabase Client Factory
 *
 * Provides a chainable mock Supabase client for testing API endpoints
 * without a real database connection.
 */

/** REQ-TEST-009: Fixture metadata */
export const _meta = {
  description: 'Mock Supabase client, query builder, request, and response factories for API testing',
  usedBy: [
    'tests/unit/api/**/*.test.ts',
  ],
  requirements: ['REQ-TEST-005', 'REQ-TEST-007'],
};

export interface MockQueryResult<T = unknown> {
  data: T | null;
  error: { message: string; code: string } | null;
  count: number | null;
}

export interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock query builder with chainable methods.
 * Each method returns the builder itself for chaining.
 * Call `mockResolvedValue` on the terminal method (single, maybeSingle, etc.)
 * to set the response.
 */
export function createMockQueryBuilder(defaultResult?: MockQueryResult): MockQueryBuilder {
  const result = defaultResult ?? { data: null, error: null, count: null };

  const builder: MockQueryBuilder = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  // Each chaining method returns the builder
  for (const key of Object.keys(builder) as (keyof MockQueryBuilder)[]) {
    if (key === 'single' || key === 'maybeSingle') {
      builder[key].mockResolvedValue(result);
    } else {
      builder[key].mockReturnValue(builder);
    }
  }

  // Make select/insert/update/delete also resolve for terminal usage
  builder.select.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  builder.upsert.mockReturnValue(builder);

  // Make the builder itself thenable (for await on the chain directly)
  (builder as unknown as { then: typeof Promise.prototype.then }).then = (
    resolve: (value: MockQueryResult) => void,
  ) => Promise.resolve(result).then(resolve);

  return builder;
}

/**
 * Create a mock Supabase client with all commonly used methods.
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };

  return {
    from: vi.fn().mockReturnValue(createMockQueryBuilder()),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
  };
}

/**
 * Create a mock VercelRequest for testing API handlers.
 */
export function createMockRequest(overrides: {
  method?: string;
  query?: Record<string, string | string[]>;
  body?: unknown;
  headers?: Record<string, string>;
} = {}): {
  method: string;
  query: Record<string, string | string[]>;
  body: unknown;
  headers: Record<string, string>;
} {
  return {
    method: overrides.method ?? 'GET',
    query: overrides.query ?? {},
    body: overrides.body ?? null,
    headers: overrides.headers ?? {},
  };
}

/**
 * Create a mock VercelResponse for testing API handlers.
 * Captures status, headers, and JSON body for assertions.
 */
export function createMockResponse(): {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
  getHeader: (name: string) => string | undefined;
  _status: number;
  _body: unknown;
  _headers: Record<string, string>;
} {
  const res = {
    _status: 0,
    _body: null as unknown,
    _headers: {} as Record<string, string>,
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
    getHeader(name: string) {
      return res._headers[name.toLowerCase()];
    },
  };

  res.setHeader.mockImplementation((name: string, value: string) => {
    res._headers[name.toLowerCase()] = value;
    return res;
  });

  res.status.mockImplementation((code: number) => {
    res._status = code;
    return res;
  });

  res.json.mockImplementation((body: unknown) => {
    res._body = body;
    return res;
  });

  res.end.mockImplementation(() => {
    return res;
  });

  return res;
}

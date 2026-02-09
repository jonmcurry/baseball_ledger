import { createMockResponse } from '../../../fixtures/mock-supabase';
import { ok, created, accepted, noContent, paginated } from '../../../../api/_lib/response';
import type { VercelResponse } from '@vercel/node';

describe('api/_lib/response', () => {
  let res: ReturnType<typeof createMockResponse>;
  const requestId = 'test-request-id-123';

  beforeEach(() => {
    res = createMockResponse();
  });

  describe('ok', () => {
    it('returns 200 with ApiResponse envelope', () => {
      const data = { id: '1', name: 'Test' };
      ok(res as unknown as VercelResponse, data, requestId);

      expect(res._status).toBe(200);
      expect(res._body).toMatchObject({
        data: { id: '1', name: 'Test' },
        meta: { requestId },
      });
      expect((res._body as Record<string, unknown> & { meta: { timestamp: string } }).meta.timestamp).toBeDefined();
    });

    it('sets X-Request-Id header', () => {
      ok(res as unknown as VercelResponse, {}, requestId);
      expect(res._headers['x-request-id']).toBe(requestId);
    });

    it('sets Content-Type to application/json', () => {
      ok(res as unknown as VercelResponse, {}, requestId);
      expect(res._headers['content-type']).toBe('application/json');
    });
  });

  describe('created', () => {
    it('returns 201 with ApiResponse envelope', () => {
      const data = { id: '2', name: 'New' };
      created(res as unknown as VercelResponse, data, requestId, '/api/leagues/2');

      expect(res._status).toBe(201);
      expect(res._body).toMatchObject({ data: { id: '2', name: 'New' } });
    });

    it('sets Location header', () => {
      created(res as unknown as VercelResponse, {}, requestId, '/api/leagues/2');
      expect(res._headers['location']).toBe('/api/leagues/2');
    });

    it('sets X-Request-Id header', () => {
      created(res as unknown as VercelResponse, {}, requestId, '/path');
      expect(res._headers['x-request-id']).toBe(requestId);
    });
  });

  describe('accepted', () => {
    it('returns 202 with ApiResponse envelope', () => {
      const data = { simulationId: 'sim-1' };
      accepted(res as unknown as VercelResponse, data, requestId);

      expect(res._status).toBe(202);
      expect(res._body).toMatchObject({ data: { simulationId: 'sim-1' } });
    });

    it('sets X-Request-Id header', () => {
      accepted(res as unknown as VercelResponse, {}, requestId);
      expect(res._headers['x-request-id']).toBe(requestId);
    });
  });

  describe('noContent', () => {
    it('returns 204 with no body', () => {
      noContent(res as unknown as VercelResponse, requestId);

      expect(res._status).toBe(204);
      expect(res.end).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('sets X-Request-Id header', () => {
      noContent(res as unknown as VercelResponse, requestId);
      expect(res._headers['x-request-id']).toBe(requestId);
    });
  });

  describe('paginated', () => {
    it('returns 200 with PaginatedResponse envelope', () => {
      const data = [{ id: '1' }, { id: '2' }];
      paginated(
        res as unknown as VercelResponse,
        data,
        { page: 1, pageSize: 50, totalRows: 120 },
        requestId,
      );

      expect(res._status).toBe(200);
      expect(res._body).toMatchObject({
        data: [{ id: '1' }, { id: '2' }],
        pagination: {
          page: 1,
          pageSize: 50,
          totalRows: 120,
          totalPages: 3,
        },
      });
    });

    it('computes totalPages correctly for exact division', () => {
      paginated(
        res as unknown as VercelResponse,
        [],
        { page: 1, pageSize: 50, totalRows: 100 },
        requestId,
      );

      const body = res._body as { pagination: { totalPages: number } };
      expect(body.pagination.totalPages).toBe(2);
    });

    it('computes totalPages correctly for partial pages', () => {
      paginated(
        res as unknown as VercelResponse,
        [],
        { page: 1, pageSize: 50, totalRows: 51 },
        requestId,
      );

      const body = res._body as { pagination: { totalPages: number } };
      expect(body.pagination.totalPages).toBe(2);
    });

    it('sets X-Request-Id header', () => {
      paginated(
        res as unknown as VercelResponse,
        [],
        { page: 1, pageSize: 50, totalRows: 0 },
        requestId,
      );
      expect(res._headers['x-request-id']).toBe(requestId);
    });
  });
});

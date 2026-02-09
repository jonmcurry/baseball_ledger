import { z } from 'zod';
import { validateBody, validateQuery } from '../../../../api/_lib/validate';
import type { VercelRequest } from '@vercel/node';

describe('api/_lib/validate', () => {
  describe('validateBody', () => {
    const schema = z.object({
      name: z.string().min(1),
      teamCount: z.number().int().min(2).max(32),
    });

    it('returns parsed data for valid body', () => {
      const req = { body: { name: 'Test League', teamCount: 8 } } as VercelRequest;
      const result = validateBody(req, schema);
      expect(result).toEqual({ name: 'Test League', teamCount: 8 });
    });

    it('throws VALIDATION error for missing required field', () => {
      const req = { body: { teamCount: 8 } } as VercelRequest;
      expect(() => validateBody(req, schema)).toThrow();

      try {
        validateBody(req, schema);
      } catch (err) {
        const error = err as { category: string; code: string; details: unknown[] };
        expect(error.category).toBe('VALIDATION');
        expect(error.code).toBe('INVALID_REQUEST_BODY');
        expect(error.details).toHaveLength(1);
      }
    });

    it('throws VALIDATION error for invalid type', () => {
      const req = { body: { name: 'Test', teamCount: 'not a number' } } as VercelRequest;
      expect(() => validateBody(req, schema)).toThrow();
    });

    it('throws VALIDATION error for constraint violation', () => {
      const req = { body: { name: 'Test', teamCount: 100 } } as VercelRequest;
      expect(() => validateBody(req, schema)).toThrow();
    });

    it('includes field paths in error details', () => {
      const req = { body: {} } as VercelRequest;
      try {
        validateBody(req, schema);
      } catch (err) {
        const error = err as { details: Array<{ field: string; message: string }> };
        const fields = error.details.map((d) => d.field);
        expect(fields).toContain('name');
        expect(fields).toContain('teamCount');
      }
    });

    it('strips extra fields with strict schema', () => {
      const strictSchema = z.object({ name: z.string() }).strict();
      const req = { body: { name: 'Test', extra: 'field' } } as VercelRequest;
      expect(() => validateBody(req, strictSchema)).toThrow();
    });
  });

  describe('validateQuery', () => {
    const schema = z.object({
      page: z.string().optional().default('1'),
      sortBy: z.string().optional().default('name'),
    });

    it('returns parsed data for valid query params', () => {
      const req = { query: { page: '2', sortBy: 'wins' } } as unknown as VercelRequest;
      const result = validateQuery(req, schema);
      expect(result).toEqual({ page: '2', sortBy: 'wins' });
    });

    it('applies defaults for missing optional params', () => {
      const req = { query: {} } as unknown as VercelRequest;
      const result = validateQuery(req, schema);
      expect(result).toEqual({ page: '1', sortBy: 'name' });
    });

    it('throws VALIDATION error for invalid query params', () => {
      const strictSchema = z.object({
        page: z.coerce.number().int().min(1),
      });
      const req = { query: { page: '-1' } } as unknown as VercelRequest;
      expect(() => validateQuery(req, strictSchema)).toThrow();
    });

    it('includes INVALID_QUERY_PARAMS code', () => {
      const strictSchema = z.object({ required: z.string() });
      const req = { query: {} } as unknown as VercelRequest;
      try {
        validateQuery(req, strictSchema);
      } catch (err) {
        const error = err as { code: string };
        expect(error.code).toBe('INVALID_QUERY_PARAMS');
      }
    });
  });
});

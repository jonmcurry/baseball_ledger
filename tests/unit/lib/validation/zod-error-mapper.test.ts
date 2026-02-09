/**
 * Tests for Zod Error Mapper (REQ-ERR-007)
 *
 * Maps ZodError issues to AppError with VALIDATION category
 * and field-level ValidationDetail[].
 */

import { z } from 'zod';
import { mapZodError } from '@lib/validation/zod-error-mapper';
import { AppError } from '@lib/errors/app-error';
import { ERROR_CODES } from '@lib/errors/error-codes';

describe('mapZodError', () => {
  const testSchema = z.object({
    name: z.string().min(3),
    count: z.number().int().min(1),
  });

  it('returns AppError with VALIDATION category', () => {
    const result = testSchema.safeParse({ name: '', count: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = mapZodError(result.error);
      expect(err).toBeInstanceOf(AppError);
      expect(err.category).toBe('VALIDATION');
      expect(err.code).toBe(ERROR_CODES.VALIDATION_FAILED);
      expect(err.statusCode).toBe(400);
    }
  });

  it('maps field paths to ValidationDetail', () => {
    const result = testSchema.safeParse({ name: 'ab', count: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = mapZodError(result.error);
      expect(err.details).toBeDefined();
      expect(err.details!.length).toBeGreaterThanOrEqual(2);
      const fields = err.details!.map((d) => d.field);
      expect(fields).toContain('name');
      expect(fields).toContain('count');
    }
  });

  it('includes error messages in details', () => {
    const result = testSchema.safeParse({ name: 'ab' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = mapZodError(result.error);
      const nameDetail = err.details!.find((d) => d.field === 'name');
      expect(nameDetail).toBeDefined();
      expect(nameDetail!.message).toBeTruthy();
    }
  });

  it('handles nested field paths', () => {
    const nestedSchema = z.object({
      settings: z.object({
        volume: z.number().min(0).max(100),
      }),
    });
    const result = nestedSchema.safeParse({ settings: { volume: 150 } });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = mapZodError(result.error);
      const detail = err.details![0];
      expect(detail.field).toBe('settings.volume');
    }
  });

  it('handles missing required fields', () => {
    const result = testSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = mapZodError(result.error);
      expect(err.details!.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('uses custom message when provided', () => {
    const result = testSchema.safeParse({ name: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = mapZodError(result.error, 'League validation failed');
      expect(err.message).toBe('League validation failed');
    }
  });

  it('uses default message when none provided', () => {
    const result = testSchema.safeParse({ name: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = mapZodError(result.error);
      expect(err.message).toBe('Validation failed');
    }
  });
});

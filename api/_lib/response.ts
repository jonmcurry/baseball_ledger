/**
 * API Response Helpers
 *
 * Standardized response envelope functions for all API endpoints.
 * All responses include X-Request-Id header per REQ-ERR-004.
 * All success responses use ApiResponse<T> envelope per REQ-API-004.
 *
 * Layer 2: API infrastructure.
 */

import type { VercelResponse } from '@vercel/node';

interface ApiResponseEnvelope<T> {
  readonly data: T;
  readonly meta: {
    readonly requestId: string;
    readonly timestamp: string;
  };
}

interface PaginatedResponseEnvelope<T> extends ApiResponseEnvelope<T[]> {
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalRows: number;
    readonly totalPages: number;
  };
}

function setCommonHeaders(res: VercelResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Content-Type', 'application/json');
}

function createMeta(requestId: string) {
  return {
    requestId,
    timestamp: new Date().toISOString(),
  };
}

/** 200 OK with ApiResponse<T> envelope */
export function ok<T>(res: VercelResponse, data: T, requestId: string): void {
  setCommonHeaders(res, requestId);
  const body: ApiResponseEnvelope<T> = {
    data,
    meta: createMeta(requestId),
  };
  res.status(200).json(body);
}

/** 201 Created with ApiResponse<T> envelope + Location header */
export function created<T>(
  res: VercelResponse,
  data: T,
  requestId: string,
  locationPath: string,
): void {
  setCommonHeaders(res, requestId);
  res.setHeader('Location', locationPath);
  const body: ApiResponseEnvelope<T> = {
    data,
    meta: createMeta(requestId),
  };
  res.status(201).json(body);
}

/** 202 Accepted with ApiResponse<T> envelope */
export function accepted<T>(res: VercelResponse, data: T, requestId: string): void {
  setCommonHeaders(res, requestId);
  const body: ApiResponseEnvelope<T> = {
    data,
    meta: createMeta(requestId),
  };
  res.status(202).json(body);
}

/** 204 No Content (no body) */
export function noContent(res: VercelResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.status(204).end();
}

/** 200 OK with PaginatedResponse<T> envelope (REQ-API-005, REQ-NFR-019) */
export function paginated<T>(
  res: VercelResponse,
  data: T[],
  paginationInfo: { page: number; pageSize: number; totalRows: number },
  requestId: string,
): void {
  setCommonHeaders(res, requestId);
  const body: PaginatedResponseEnvelope<T> = {
    data,
    meta: createMeta(requestId),
    pagination: {
      page: paginationInfo.page,
      pageSize: paginationInfo.pageSize,
      totalRows: paginationInfo.totalRows,
      totalPages: Math.ceil(paginationInfo.totalRows / paginationInfo.pageSize),
    },
  };
  res.status(200).json(body);
}

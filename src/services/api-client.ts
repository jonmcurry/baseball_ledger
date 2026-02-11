/**
 * API Client
 *
 * Layer 3 HTTP client for calling Layer 2 API endpoints.
 * Adds auth headers from Supabase session, unwraps ApiResponse<T> envelope,
 * and throws AppError on non-2xx responses.
 * Retries transient failures per REQ-ERR-015 (2 retries, exponential 1s/3s).
 *
 * REQ-API-008: All responses use camelCase JSON.
 * REQ-ERR-015: Client network request retry (2 retries, exponential backoff).
 * REQ-ERR-016: Retry logging (WARN per attempt, ERROR on exhaustion).
 */

import type { ApiResponse, PaginatedResponse } from '@lib/types/api';
import type { AppError, ApiErrorResponse } from '@lib/types/errors';
import { getSupabaseClient } from '@lib/supabase/client';

/** Maximum number of retry attempts for transient failures. */
const RETRY_MAX = 2;

/** Backoff delays in ms before each retry attempt. */
const RETRY_DELAYS = [1000, 3000];

function getBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '';
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/** Returns true for HTTP status codes that are safe to retry. */
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with automatic retry for transient failures (REQ-ERR-015).
 *
 * Retries on:
 * - Network errors (TypeError from fetch when offline/DNS failure)
 * - 5xx server errors
 * - 429 rate limit
 *
 * Does NOT retry on 4xx client errors (400, 401, 403, 404).
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const method = init.method ?? 'GET';

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      const response = await fetch(url, init);

      if (!isRetryableStatus(response.status) || attempt === RETRY_MAX) {
        if (isRetryableStatus(response.status) && attempt === RETRY_MAX) {
          // REQ-ERR-016: final failure logged at ERROR level
          console.error(
            `All ${RETRY_MAX} network retries exhausted for ${method} ${url} (status ${response.status})`,
          );
        }
        return response;
      }

      // REQ-ERR-016: each retry logged at WARN level
      console.warn(
        `Network retry ${attempt + 1}/${RETRY_MAX} for ${method} ${url} (status ${response.status})`,
      );
    } catch (err) {
      if (attempt === RETRY_MAX) {
        // REQ-ERR-016: final failure logged at ERROR level
        console.error(
          `All ${RETRY_MAX} network retries exhausted for ${method} ${url} (network error)`,
        );
        throw err;
      }

      // REQ-ERR-016: each retry logged at WARN level
      console.warn(
        `Network retry ${attempt + 1}/${RETRY_MAX} for ${method} ${url} (network error)`,
      );
    }

    await sleep(RETRY_DELAYS[attempt]);
  }

  // Unreachable -- loop always returns or throws at attempt === RETRY_MAX
  throw new Error('Retry logic error');
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const body = await response.json();

  if (!response.ok) {
    const errorBody = body as ApiErrorResponse;
    const error: AppError = {
      category: statusToCategory(response.status),
      code: errorBody.error?.code ?? 'UNKNOWN',
      message: errorBody.error?.message ?? response.statusText,
      statusCode: response.status,
      details: errorBody.error?.details,
    };
    throw error;
  }

  return body as T;
}

function statusToCategory(status: number): AppError['category'] {
  switch (status) {
    case 400: return 'VALIDATION';
    case 401: return 'AUTHENTICATION';
    case 403: return 'AUTHORIZATION';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'RATE_LIMIT';
    default: return 'DATA';
  }
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const response = await fetchWithRetry(`${getBaseUrl()}${path}`, {
    method: 'GET',
    headers,
  });
  return handleResponse<ApiResponse<T>>(response);
}

export async function apiGetPaginated<T>(path: string): Promise<PaginatedResponse<T>> {
  const headers = await getAuthHeaders();
  const response = await fetchWithRetry(`${getBaseUrl()}${path}`, {
    method: 'GET',
    headers,
  });
  return handleResponse<PaginatedResponse<T>>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const response = await fetchWithRetry(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<ApiResponse<T>>(response);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const response = await fetchWithRetry(`${getBaseUrl()}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse<ApiResponse<T>>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetchWithRetry(`${getBaseUrl()}${path}`, {
    method: 'DELETE',
    headers,
  });
  await handleResponse<void>(response);
}

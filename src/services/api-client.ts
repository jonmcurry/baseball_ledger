/**
 * API Client
 *
 * Layer 3 HTTP client for calling Layer 2 API endpoints.
 * Adds auth headers from Supabase session, unwraps ApiResponse<T> envelope,
 * and throws AppError on non-2xx responses.
 *
 * REQ-API-008: All responses use camelCase JSON.
 */

import type { ApiResponse, PaginatedResponse } from '@lib/types/api';
import type { AppError, ApiErrorResponse } from '@lib/types/errors';
import { getSupabaseClient } from '@lib/supabase/client';

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
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'GET',
    headers,
  });
  return handleResponse<ApiResponse<T>>(response);
}

export async function apiGetPaginated<T>(path: string): Promise<PaginatedResponse<T>> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'GET',
    headers,
  });
  return handleResponse<PaginatedResponse<T>>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<ApiResponse<T>>(response);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse<ApiResponse<T>>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'DELETE',
    headers,
  });
  await handleResponse<void>(response);
}

/**
 * API Authentication
 *
 * Extracts and verifies JWT from the Authorization header.
 * Uses Supabase Auth to validate the token.
 *
 * Layer 2: API infrastructure.
 */

import type { VercelRequest } from '@vercel/node';
import { createServerClient } from '../../src/lib/supabase/server';

interface AuthResult {
  userId: string;
  email: string;
}

interface AuthAppError {
  category: 'AUTHENTICATION';
  code: string;
  message: string;
  statusCode: number;
}

/**
 * Require authentication for an API request.
 * Extracts the Bearer token from the Authorization header,
 * verifies it via Supabase Auth, and returns the user info.
 *
 * Throws an AUTHENTICATION AppError if the token is missing or invalid.
 */
export async function requireAuth(req: VercelRequest): Promise<AuthResult> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error: AuthAppError = {
      category: 'AUTHENTICATION',
      code: 'MISSING_TOKEN',
      message: 'Authorization header with Bearer token is required',
      statusCode: 401,
    };
    throw error;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    const authError: AuthAppError = {
      category: 'AUTHENTICATION',
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired authentication token',
      statusCode: 401,
    };
    throw authError;
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? '',
  };
}

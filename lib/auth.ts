/**
 * Farcaster Mini App Authentication Utilities
 *
 * @remarks
 * Provides helper types and utilities for Farcaster Quick Auth.
 * JWT verification is handled by @farcaster/quick-auth client in API routes.
 * 
 * @see app/api/auth/route.ts for JWT verification implementation
 */

// Types
export interface FarcasterUser {
  readonly fid: number;
  readonly issuedAt: number;
  readonly expiresAt?: number;
}

/**
 * Extracts the Bearer token from an Authorization header
 * 
 * @param authHeader - The Authorization header value
 * @returns The token if found, null otherwise
 * 
 * @example
 * const token = extractToken(request.headers.get('Authorization'));
 * // Returns: "eyJhbGc..." from "Bearer eyJhbGc..."
 */
export function extractToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}


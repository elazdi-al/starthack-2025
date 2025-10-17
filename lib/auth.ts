/**
 * Authentication session management utilities
 *
 * @remarks
 * This module provides in-memory session storage for authenticated users.
 * In production, replace with Redis, database, or other persistent storage
 * to support horizontal scaling and survive server restarts.
 */

// Constants
const DEFAULT_CHAIN_ID = '0x2105'; // Base Mainnet
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

// Types
export interface AuthSession {
  readonly address: string;
  readonly chainId: string;
  readonly authenticatedAt: number;
}

export interface SessionStats {
  readonly totalSessions: number;
  readonly activeSessions: number;
}

// Session storage
const sessions = new Map<string, AuthSession>();

// Cleanup interval reference
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Validates an Ethereum address format
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates a chain ID format
 */
function isValidChainId(chainId: string): boolean {
  return /^0x[a-fA-F0-9]+$/.test(chainId);
}

/**
 * Removes expired sessions from storage
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.authenticatedAt > SESSION_EXPIRY_MS) {
      sessions.delete(sessionId);
    }
  }
}

/**
 * Initialize cleanup interval (server-side only)
 */
function initializeCleanup(): void {
  if (typeof global !== 'undefined' && cleanupInterval === null) {
    cleanupInterval = setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);
  }
}

// Start cleanup on module load
initializeCleanup();

/**
 * Creates a new authenticated session
 *
 * @param address - The Ethereum address of the authenticated user
 * @param chainId - The chain ID (defaults to Base Mainnet)
 * @returns The generated session ID
 * @throws Error if address or chainId format is invalid
 */
export function createSession(
  address: string,
  chainId: string = DEFAULT_CHAIN_ID
): string {
  if (!isValidAddress(address)) {
    throw new Error('Invalid address format');
  }

  if (!isValidChainId(chainId)) {
    throw new Error('Invalid chainId format');
  }

  const sessionId = crypto.randomUUID();

  sessions.set(sessionId, {
    address,
    chainId,
    authenticatedAt: Date.now(),
  });

  return sessionId;
}

/**
 * Retrieves a session by ID
 *
 * @param sessionId - The session ID to retrieve
 * @returns The session if found and not expired, null otherwise
 */
export function getSession(sessionId: string): AuthSession | null {
  if (!sessionId || typeof sessionId !== 'string') {
    return null;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (Date.now() - session.authenticatedAt > SESSION_EXPIRY_MS) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Deletes a session by ID
 *
 * @param sessionId - The session ID to delete
 * @returns true if the session was deleted, false if it didn't exist
 */
export function deleteSession(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  return sessions.delete(sessionId);
}

/**
 * Gets statistics about active sessions
 *
 * @returns Object containing session counts
 */
export function getSessionStats(): SessionStats {
  const now = Date.now();
  let activeSessions = 0;

  for (const session of sessions.values()) {
    if (now - session.authenticatedAt <= SESSION_EXPIRY_MS) {
      activeSessions++;
    }
  }

  return {
    totalSessions: sessions.size,
    activeSessions,
  };
}

/**
 * Finds all sessions for a given address
 *
 * @param address - The Ethereum address to search for
 * @returns Array of [sessionId, session] pairs for the address
 */
export function getSessionsByAddress(
  address: string
): Array<[string, AuthSession]> {
  if (!isValidAddress(address)) {
    return [];
  }

  const results: Array<[string, AuthSession]> = [];
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (
      session.address.toLowerCase() === address.toLowerCase() &&
      now - session.authenticatedAt <= SESSION_EXPIRY_MS
    ) {
      results.push([sessionId, session]);
    }
  }

  return results;
}

/**
 * Clears all sessions from storage (for testing purposes)
 *
 * @internal
 */
export function clearSessionStore(): void {
  sessions.clear();
}


// Utility functions for authentication
// This file provides helpers for working with authenticated sessions

export interface AuthSession {
  address: string;
  chainId: string;
  authenticatedAt: number;
}

// Store sessions in memory (use Redis/database in production)
const sessions = new Map<string, AuthSession>();

export function createSession(address: string, chainId: string = '0x2105'): string {
  const sessionId = crypto.randomUUID();
  
  sessions.set(sessionId, {
    address,
    chainId,
    authenticatedAt: Date.now(),
  });
  
  return sessionId;
}

export function getSession(sessionId: string): AuthSession | null {
  return sessions.get(sessionId) || null;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// Clean up old sessions (older than 7 days)
if (typeof global !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.authenticatedAt > SESSION_EXPIRY) {
        sessions.delete(sessionId);
      }
    }
  }, 24 * 60 * 60 * 1000); // Run daily
}


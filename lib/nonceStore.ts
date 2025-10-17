/**
 * Shared in-memory nonce storage for authentication
 *
 * @remarks
 * In production, replace this with Redis, database, or other persistent storage
 * to ensure nonces are tracked across server restarts and multiple instances.
 */

// Constants
const NONCE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Types
interface NonceStore {
  readonly usedNonces: Set<string>;
  readonly nonceTimestamps: Map<string, number>;
}

interface NonceStats {
  readonly totalNonces: number;
  readonly usedNonces: number;
}

// Global nonce storage
const globalNonceStore: NonceStore = {
  usedNonces: new Set<string>(),
  nonceTimestamps: new Map<string, number>(),
};

// Cleanup interval reference
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Removes expired nonces from the store
 */
function cleanupExpiredNonces(): void {
  const now = Date.now();

  for (const [nonce, timestamp] of globalNonceStore.nonceTimestamps.entries()) {
    if (now - timestamp > NONCE_EXPIRY_MS) {
      globalNonceStore.usedNonces.delete(nonce);
      globalNonceStore.nonceTimestamps.delete(nonce);
    }
  }
}

/**
 * Initialize cleanup interval (server-side only)
 */
function initializeCleanup(): void {
  if (typeof global !== 'undefined' && cleanupInterval === null) {
    cleanupInterval = setInterval(cleanupExpiredNonces, CLEANUP_INTERVAL_MS);
  }
}

// Start cleanup on module load
initializeCleanup();

/**
 * Creates a nonce entry with the current timestamp
 *
 * @param nonce - The nonce string to register
 */
export function createNonce(nonce: string): void {
  if (!nonce || typeof nonce !== 'string') {
    throw new Error('Invalid nonce: must be a non-empty string');
  }

  globalNonceStore.nonceTimestamps.set(nonce, Date.now());
}

/**
 * Validates and consumes a nonce, marking it as used
 *
 * @param nonce - The nonce to validate and consume
 * @returns true if the nonce is valid and unused, false otherwise
 *
 * @remarks
 * This function checks for:
 * - Replay attacks (nonce already used)
 * - Expiration (nonce older than NONCE_EXPIRY_MS)
 * - Validity (nonce exists if pre-generated)
 */
export function validateAndConsumeNonce(nonce: string): boolean {
  if (!nonce || typeof nonce !== 'string') {
    return false;
  }

  // Check if nonce has already been used (replay attack prevention)
  if (globalNonceStore.usedNonces.has(nonce)) {
    return false;
  }

  // Check if nonce was pre-generated
  const wasPreGenerated = globalNonceStore.nonceTimestamps.has(nonce);

  if (wasPreGenerated) {
    const timestamp = globalNonceStore.nonceTimestamps.get(nonce);

    // Timestamp should always exist if wasPreGenerated is true
    if (timestamp === undefined) {
      return false;
    }

    // Check if nonce has expired
    if (Date.now() - timestamp > NONCE_EXPIRY_MS) {
      globalNonceStore.nonceTimestamps.delete(nonce);
      return false;
    }
  }

  // Mark nonce as used
  globalNonceStore.usedNonces.add(nonce);

  return true;
}

/**
 * Gets statistics about the nonce store
 *
 * @returns Object containing total and used nonce counts
 */
export function getNonceStats(): NonceStats {
  return {
    totalNonces: globalNonceStore.nonceTimestamps.size,
    usedNonces: globalNonceStore.usedNonces.size,
  };
}

/**
 * Clears all nonces from the store (for testing purposes)
 *
 * @internal
 */
export function clearNonceStore(): void {
  globalNonceStore.usedNonces.clear();
  globalNonceStore.nonceTimestamps.clear();
}


// Shared in-memory nonce storage
// In production, replace this with Redis, database, or other persistent storage

interface NonceStore {
  usedNonces: Set<string>;
  nonceTimestamps: Map<string, number>;
}

// Global nonce storage
const globalNonceStore: NonceStore = {
  usedNonces: new Set<string>(),
  nonceTimestamps: new Map<string, number>(),
};

// Clean up old nonces every 10 minutes
const NONCE_EXPIRY = 10 * 60 * 1000; // 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

let cleanupInterval: NodeJS.Timeout | null = null;

// Initialize cleanup interval
if (typeof global !== 'undefined' && !cleanupInterval) {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    
    for (const [nonce, timestamp] of globalNonceStore.nonceTimestamps.entries()) {
      if (now - timestamp > NONCE_EXPIRY) {
        globalNonceStore.usedNonces.delete(nonce);
        globalNonceStore.nonceTimestamps.delete(nonce);
      }
    }
  }, CLEANUP_INTERVAL);
}

export function createNonce(nonce: string): void {
  globalNonceStore.nonceTimestamps.set(nonce, Date.now());
}

export function validateAndConsumeNonce(nonce: string): boolean {
  // Check if nonce was pre-generated
  const wasPreGenerated = globalNonceStore.nonceTimestamps.has(nonce);
  
  // Check if nonce has already been used
  if (globalNonceStore.usedNonces.has(nonce)) {
    return false; // Already used - replay attack
  }
  
  if (wasPreGenerated) {
    // Check if nonce is still valid (not expired)
    const timestamp = globalNonceStore.nonceTimestamps.get(nonce)!;
    if (Date.now() - timestamp > NONCE_EXPIRY) {
      globalNonceStore.nonceTimestamps.delete(nonce);
      return false; // Expired
    }
  }
  
  // Mark nonce as used
  globalNonceStore.usedNonces.add(nonce);
  
  return true;
}

// Export for testing/debugging
export function getNonceStats() {
  return {
    totalNonces: globalNonceStore.nonceTimestamps.size,
    usedNonces: globalNonceStore.usedNonces.size,
  };
}


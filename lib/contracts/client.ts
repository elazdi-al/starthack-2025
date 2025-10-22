import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';



// Public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, {
    batch: {
      wait: 50, // Wait 50ms to batch multiple requests together
    },
    timeout: 30_000, // 30 second timeout
    retryCount: 3, // Retry failed requests up to 3 times
  }),
  batch: {
    multicall: {
      wait: 50, // Batch multicall requests within 50ms window
      batchSize: 1024, // Max batch size for multicall
    },
  },
  cacheTime: 10_000, // Cache results for 10 seconds
});

// Get wallet client for writing to the blockchain (used in client-side)
export function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No ethereum provider found');
  }
  

  return createWalletClient({
    chain: base,
    transport: http(`https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, {
      timeout: 30_000, // 30 seconds for writes
      retryCount: 2,
    }),
  });
}


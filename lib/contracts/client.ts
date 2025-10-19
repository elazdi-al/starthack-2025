import { createPublicClient, createWalletClient, http, fallback } from 'viem';
import { base } from 'viem/chains';



// Public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: base,
  transport: http("https://base-mainnet.g.alchemy.com/v2/QEp7aTByLENRTC1fyR1zJ"),
  batch: {
    multicall: true, // Enable multicall batching for better performance
  },
});

// Get wallet client for writing to the blockchain (used in client-side)
export function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  return createWalletClient({
    chain: base,
    transport: http("https://base-mainnet.g.alchemy.com/v2/QEp7aTByLENRTC1fyR1zJ", {
      timeout: 30_000, // 30 seconds for writes
      retryCount: 2,
    }),
  });
}


import { createPublicClient, createWalletClient, http, fallback } from 'viem';
import { base } from 'viem/chains';

// Multiple RPC endpoints for fallback and reliability
const RPC_URLS = [
  'https://mainnet.base.org',
  'https://base.gateway.tenderly.co',
  'https://base.publicnode.com',
  'https://base-rpc.publicnode.com',
  process.env.NEXT_PUBLIC_BASE_RPC_URL, // Custom RPC if provided
].filter(Boolean) as string[];

// Create transport with fallback and retry logic
const publicTransport = fallback(
  RPC_URLS.map((url) => 
    http(url, {
      timeout: 10_000, // 10 second timeout
      retryCount: 3,
      retryDelay: 1000, // 1 second between retries
    })
  ),
  {
    rank: false, // Use priority order instead of ranking by speed
  }
);

// Public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: base,
  transport: publicTransport,
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
    transport: http(RPC_URLS[0], {
      timeout: 30_000, // 30 seconds for writes
      retryCount: 2,
    }),
  });
}


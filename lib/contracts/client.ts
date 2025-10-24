import { createPublicClient, createWalletClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Get chain and RPC URL based on environment
const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV === 'testnet';
const chain = isTestnet ? baseSepolia : base;
const rpcUrl = isTestnet
  ? `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

// Public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl, {
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
    chain,
    transport: http(rpcUrl, {
      timeout: 30_000, // 30 seconds for writes
      retryCount: 2,
    }),
  });
}


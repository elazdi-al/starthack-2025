import { createPublicClient, createWalletClient, http, custom, defineChain } from 'viem';
import { base} from 'viem/chains';


// Public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

// Get wallet client for writing to the blockchain (used in client-side)
export function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  return createWalletClient({
    chain: base,
    transport: http()
  });
}


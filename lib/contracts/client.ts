import { createPublicClient, createWalletClient, http, custom, defineChain } from 'viem';
import { base} from 'viem/chains';

// Define custom chain if RPC URL is provided, otherwise use Base Sepolia
const customRpcUrl = process.env.NEXT_PUBLIC_CUSTOM_RPC_URL;
const customChainId = process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID
  ? Number.parseInt(process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID)
  : 84532;



// Public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: base,
  transport: http(customRpcUrl || undefined)
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


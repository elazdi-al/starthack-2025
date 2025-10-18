import { createPublicClient, createWalletClient, http, custom, defineChain } from 'viem';
import { base } from 'viem/chains';

// Define custom chain if RPC URL is provided, otherwise use Base Mainnet
const customRpcUrl = process.env.NEXT_PUBLIC_CUSTOM_RPC_URL;
const customChainId = process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID 
  ? parseInt(process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID) 
  : 1337;

const customChain = customRpcUrl
  ? defineChain({
      id: customChainId,
      name: 'Custom Blockchain',
      network: 'custom',
      nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
      },
      rpcUrls: {
        default: {
          http: [customRpcUrl],
        },
        public: {
          http: [customRpcUrl],
        },
      },
    })
  : base;

// Public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain: customChain,
  transport: http(customRpcUrl || undefined)
});

// Get wallet client for writing to the blockchain (used in client-side)
export function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  return createWalletClient({
    chain: customChain,
    transport: custom(window.ethereum)
  });
}


import { base, baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

/**
 * Get the current chain based on environment variable
 * Set NEXT_PUBLIC_CHAIN_ENV to "mainnet" or "testnet"
 * Defaults to mainnet if not set
 */
export function getChain() {
  const chainEnv = process.env.NEXT_PUBLIC_CHAIN_ENV;

  if (chainEnv === "testnet") {
    return baseSepolia;
  }

  return base;
}

/**
 * Get the appropriate RPC transport based on environment
 * Uses Alchemy for testnet, default for mainnet
 */
export function getTransport() {
  const chainEnv = process.env.NEXT_PUBLIC_CHAIN_ENV;
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (chainEnv === "testnet" && alchemyKey) {
    return http(`https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`);
  }

  // Use default RPC for mainnet
  return http();
}

/**
 * Export the current chain as a constant for convenience
 */
export const currentChain = getChain();

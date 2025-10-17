"use client";

/**
 * Base authentication React hook
 *
 * @remarks
 * This hook provides authentication functionality using Base's Account SDK.
 * It supports both wallet_connect and fallback methods for maximum compatibility.
 */

import { useState, useCallback } from 'react';
import { createBaseAccountSDK } from "@base-org/account";

// Constants
const APP_NAME = 'Stars';
const BASE_CHAIN_ID = '0x2105'; // Base Mainnet - 8453
const STORAGE_KEY = 'base_auth_address';

// Types
interface AuthState {
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly address: string | null;
  readonly error: string | null;
}

interface AuthResult {
  readonly success: boolean;
  readonly address?: string;
  readonly error?: string;
}

interface EthereumProvider {
  request: (request: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
}

interface WalletConnectResponse {
  accounts: Array<{
    address: string;
    capabilities: {
      signInWithEthereum: {
        message: string;
        signature: string;
      };
    };
  }>;
}

interface VerifyResponse {
  success?: boolean;
  error?: string;
}

/**
 * Type guard to check if an object is an error with a message
 */
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Type guard to check if an object is an error with a code
 */
function isErrorWithCode(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'number'
  );
}

/**
 * Extracts error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return 'Unknown error occurred';
}

/**
 * React hook for Base wallet authentication
 *
 * @returns Auth state and methods for signing in/out
 */
export function useBaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: false,
    isAuthenticated: false,
    address: null,
    error: null,
  });

  /**
   * Generates a nonce for authentication
   */
  const generateNonce = async (): Promise<string> => {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
      return window.crypto.randomUUID().replace(/-/g, '');
    }

    // Fallback: fetch from server
    const response = await fetch('/api/auth/base/nonce');
    const data = (await response.json()) as { nonce: string };
    return data.nonce;
  };

  /**
   * Switches to Base chain
   */
  const switchToBaseChain = async (
    provider: EthereumProvider
  ): Promise<void> => {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }],
      });
    } catch (error: unknown) {
      // Chain might already be selected or user rejected - not critical
      console.warn('Chain switch error (may be safe to continue):', error);
    }
  };

  /**
   * Verifies signature with backend
   */
  const verifySignature = async (
    address: string,
    message: string,
    signature: string
  ): Promise<void> => {
    const response = await fetch('/api/auth/base/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, message, signature }),
    });

    const data = (await response.json()) as VerifyResponse;

    if (!response.ok) {
      throw new Error(data.error || 'Verification failed');
    }
  };

  /**
   * Updates auth state and stores address
   */
  const setAuthenticated = (address: string): void => {
    setAuthState({
      isLoading: false,
      isAuthenticated: true,
      address,
      error: null,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, address);
    }
  };

  /**
   * Attempts wallet_connect method (preferred)
   */
  const tryWalletConnect = async (
    provider: EthereumProvider,
    nonce: string
  ): Promise<AuthResult> => {
    const response = (await provider.request({
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: {
            signInWithEthereum: {
              nonce,
              chainId: BASE_CHAIN_ID,
            },
          },
        },
      ],
    })) as WalletConnectResponse;

    const { address } = response.accounts[0];
    const { message, signature } =
      response.accounts[0].capabilities.signInWithEthereum;

    await verifySignature(address, message, signature);
    setAuthenticated(address);

    return { success: true, address };
  };

  /**
   * Fallback method using eth_requestAccounts + personal_sign
   */
  const tryFallbackMethod = async (
    provider: EthereumProvider,
    nonce: string
  ): Promise<AuthResult> => {
    console.warn(
      'wallet_connect not supported, falling back to eth_requestAccounts'
    );

    const accounts = (await provider.request({
      method: 'eth_requestAccounts',
    })) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned');
    }

    const address = accounts[0];
    const message = `Sign in to ${APP_NAME}\n\nNonce: ${nonce}\nChain ID: ${BASE_CHAIN_ID}`;

    const signature = (await provider.request({
      method: 'personal_sign',
      params: [message, address],
    })) as string;

    await verifySignature(address, message, signature);
    setAuthenticated(address);

    return { success: true, address };
  };

  /**
   * Main sign-in method
   */
  const signInWithBase = useCallback(async (): Promise<AuthResult> => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const provider = createBaseAccountSDK({
        appName: APP_NAME,
      }).getProvider();

      const nonce = await generateNonce();
      await switchToBaseChain(provider);

      try {
        return await tryWalletConnect(provider, nonce);
      } catch (connectError: unknown) {
        // Check if we should fallback
        const errorMessage = isErrorWithMessage(connectError)
          ? connectError.message
          : '';
        const errorCode = isErrorWithCode(connectError)
          ? connectError.code
          : null;

        const shouldFallback =
          errorMessage.includes('method_not_supported') || errorCode === -32601;

        if (shouldFallback) {
          return await tryFallbackMethod(provider, nonce);
        }

        throw connectError;
      }
    } catch (error: unknown) {
      console.error('Base auth error:', error);
      const errorMessage = getErrorMessage(error);

      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        address: null,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Signs out the current user
   */
  const signOut = useCallback((): void => {
    setAuthState({
      isLoading: false,
      isAuthenticated: false,
      address: null,
      error: null,
    });

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    ...authState,
    signInWithBase,
    signOut,
  };
}


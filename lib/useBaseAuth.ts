"use client";

import { useState, useCallback } from 'react';
import { createBaseAccountSDK } from "@base-org/account";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  address: string | null;
  error: string | null;
}

export function useBaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: false,
    isAuthenticated: false,
    address: null,
    error: null,
  });

  const signInWithBase = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Initialize the SDK
      const provider = createBaseAccountSDK({ appName: 'Stars' }).getProvider();

      // 1 — Get a fresh nonce (can generate locally or prefetch from backend)
      let nonce: string;
      
      if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        // Generate nonce locally
        nonce = window.crypto.randomUUID().replace(/-/g, '');
      } else {
        // Prefetch from server as fallback
        const response = await fetch('/api/auth/base/nonce');
        const data = await response.json();
        nonce = data.nonce;
      }

      // 2 — Switch to Base Chain
      try {
        const switchChainResponse = await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: '0x2105' }], // Base Mainnet - 8453
        });
        console.log('Switch chain response:', switchChainResponse);
      } catch (switchError: any) {
        // Handle the case where the chain might already be selected
        // or the user rejected the switch
        console.warn('Chain switch error (may be safe to continue):', switchError);
      }

      // 3 — Connect and authenticate
      try {
        const { accounts } = await provider.request({
          method: 'wallet_connect',
          params: [{
            version: '1',
            capabilities: {
              signInWithEthereum: { 
                nonce, 
                chainId: '0x2105' // Base Mainnet - 8453
              }
            }
          }]
        });

        const { address } = accounts[0];
        const { message, signature } = accounts[0].capabilities.signInWithEthereum;

        // Verify the signature with backend
        const verifyResponse = await fetch('/api/auth/base/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, message, signature })
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
          throw new Error(verifyData.error || 'Verification failed');
        }

        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          address: address,
          error: null,
        });

        // Store address in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('base_auth_address', address);
        }

        return { success: true, address };

      } catch (connectError: any) {
        // Fallback for wallets that don't support wallet_connect yet
        if (connectError?.message?.includes('method_not_supported') || 
            connectError?.code === -32601) {
          console.warn('wallet_connect not supported, falling back to eth_requestAccounts');
          
          // Fallback: use eth_requestAccounts and personal_sign
          const accounts = await provider.request({
            method: 'eth_requestAccounts',
          }) as string[];

          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts returned');
          }

          const address = accounts[0];
          
          // Create a SIWE-like message
          const message = `Sign in to Stars\n\nNonce: ${nonce}\nChain ID: 0x2105`;
          
          // Sign the message
          const signature = await provider.request({
            method: 'personal_sign',
            params: [message, address],
          }) as string;

          // Verify with backend
          const verifyResponse = await fetch('/api/auth/base/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, message, signature })
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok) {
            throw new Error(verifyData.error || 'Verification failed');
          }

          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            address: address,
            error: null,
          });

          // Store address in localStorage for persistence
          if (typeof window !== 'undefined') {
            localStorage.setItem('base_auth_address', address);
          }

          return { success: true, address };
        }

        throw connectError;
      }

    } catch (error: any) {
      console.error('Base auth error:', error);
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        address: null,
        error: error?.message || 'Authentication failed',
      });
      return { success: false, error: error?.message || 'Authentication failed' };
    }
  }, []);

  const signOut = useCallback(() => {
    setAuthState({
      isLoading: false,
      isAuthenticated: false,
      address: null,
      error: null,
    });
    
    // Clear stored address
    if (typeof window !== 'undefined') {
      localStorage.removeItem('base_auth_address');
    }
  }, []);

  return {
    ...authState,
    signInWithBase,
    signOut,
  };
}


"use client";

import { useState, useCallback, useEffect } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import { useAuthStore } from './store/authStore';
import { useConnect, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";

/**
 * Farcaster Mini App Authentication Hook
 * 
 * Provides authentication using Farcaster Quick Auth for mini apps.
 * Handles token management, session validation, and automatic persistence.
 * 
 * @see https://docs.base.org/mini-apps/core-concepts/authentication
 */

interface AuthState {
  readonly isLoading: boolean;
  readonly error: string | null;
}

interface AuthResult {
  readonly success: boolean;
  readonly fid?: number;
  readonly address?: string;
  readonly error?: string;
}

interface UserData {
  fid: number;
  issuedAt?: number;
  expiresAt?: number;
}

export function useFarcasterAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: false,
    error: null,
  });

  // Get auth state from Zustand store
  const {
    isAuthenticated,
    fid,
    token,
    address,
    authMethod,
    setAuth,
    clearAuth,
    isSessionValid
  } = useAuthStore();
  const { connectAsync, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();

  // Validate session on mount
  useEffect(() => {
    isSessionValid();
  }, [isSessionValid]);

  /**
   * Sign in with Farcaster Quick Auth
   */
  const signIn = useCallback(async (): Promise<AuthResult> => {
    setAuthState({ isLoading: true, error: null });

    try {
      const inMiniApp = await sdk.isInMiniApp().catch(() => false);

      if (inMiniApp) {
        // Get JWT token from Farcaster SDK
        const { token: authToken } = await sdk.quickAuth.getToken();

        // Verify the token with backend
        const response = await sdk.quickAuth.fetch("/api/auth", {
          headers: { "Authorization": `Bearer ${authToken}` }
        } as never);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Authentication failed');
        }

        const data = await response.json() as { success: boolean; user: UserData };

        if (!data.success || !data.user) {
          throw new Error('Invalid response from server');
        }

        // Store authentication (auto-persists to localStorage)
        setAuth({
          method: 'farcaster',
          fid: data.user.fid,
          token: authToken,
        });

        setAuthState({
          isLoading: false,
          error: null,
        });

        return { success: true, fid: data.user.fid };
      }

      // Fallback: standard web context using Base Account
      const injectedConnector = connectors.find((connector) => connector.type === "injected");
      if (!injectedConnector) {
        throw new Error("No injected wallet connector available. Install or unlock a browser wallet.");
      }

      const connection = await connectAsync({
        connector: injectedConnector,
        chainId: base.id,
      });

      const walletAddress = connection.accounts?.[0] ?? null;

      if (!walletAddress) {
        throw new Error('Wallet connection failed');
      }

      if (connection.chainId !== base.id) {
        try {
          await switchChainAsync?.({ chainId: base.id });
        } catch (switchError) {
          const errorCode =
            typeof switchError === "object" &&
            switchError !== null &&
            "code" in switchError
              ? Number((switchError as { code?: number }).code)
              : undefined;

          if (errorCode === 4902) {
            throw new Error(
              "Base network is not added in your wallet. Add Base Mainnet and try again."
            );
          }

          throw switchError instanceof Error
            ? switchError
            : new Error("Failed to switch to Base network.");
        }
      }

      setAuth({
        method: 'wallet',
        address: walletAddress,
      });

      setAuthState({
        isLoading: false,
        error: null,
      });

      return { success: true, address: walletAddress };
    } catch (error) {
      console.error('Authentication failed:', error);
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message);
      }

      // Handle user-rejected wallet connection gracefully
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: number }).code === 4001
      ) {
        errorMessage = 'Wallet connection was rejected';
      }

      setAuthState({
        isLoading: false,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }, [connectAsync, connectors, setAuth, switchChainAsync]);

  /**
   * Sign out and clear session
   */
  const signOut = useCallback(() => {
    clearAuth();
    setAuthState({
      isLoading: false,
      error: null,
    });
  }, [clearAuth]);

  return {
    isLoading: authState.isLoading,
    error: authState.error,
    isAuthenticated,
    fid,
    address,
    token,
    authMethod,
    signIn,
    signOut,
  };
}

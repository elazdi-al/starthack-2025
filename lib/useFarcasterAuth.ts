"use client";

import { useState, useCallback, useEffect } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import { useAuthStore } from './store/authStore';

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
    setAuth,
    clearAuth,
    isSessionValid
  } = useAuthStore();

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
      // Get JWT token from Farcaster SDK
      const { token: authToken } = await sdk.quickAuth.getToken();

      // Verify the token with backend
      const response = await sdk.quickAuth.fetch("/api/auth", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Authentication failed');
      }

      const data = await response.json() as { success: boolean; user: UserData };

      if (!data.success || !data.user) {
        throw new Error('Invalid response from server');
      }

      // Store authentication (auto-persists to localStorage)
      setAuth(data.user.fid, authToken);

      setAuthState({
        isLoading: false,
        error: null,
      });

      return { success: true, fid: data.user.fid };
    } catch (error) {
      console.error('Farcaster authentication failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setAuthState({
        isLoading: false,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }, [setAuth]);

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
    token,
    signIn,
    signOut,
  };
}

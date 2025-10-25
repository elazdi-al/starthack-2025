import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Authentication Store
 *
 * Manages authentication state for both Farcaster mini apps (Quick Auth) and wallet connections.
 * Automatically persists to localStorage.
 *
 * - Farcaster: Stores FID and token from Quick Auth
 * - Wallet: Stores connected wallet address
 */

interface AuthState {
  isAuthenticated: boolean;
  fid: number | null;
  token: string | null;
  address: string | null;
  authenticatedAt: number | null;
  expiresAt: number | null;
  authMethod: AuthMethod | null;
  isGuestMode: boolean;
  _hasHydrated: boolean;
}

interface AuthActions {
  setAuth: (params: SetAuthParams) => void;
  clearAuth: () => void;
  setGuestMode: (isGuest: boolean) => void;
  exitGuestMode: () => void;
  isSessionValid: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

type AuthMethod = 'farcaster' | 'wallet';

type SetAuthParams =
  | {
      method: 'farcaster';
      fid: number;
      token: string;
      address?: string | null;
    }
  | {
      method: 'wallet';
      address: string;
    };

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      fid: null,
      token: null,
      address: null,
      authenticatedAt: null,
      expiresAt: null,
      authMethod: null,
      isGuestMode: false,
      _hasHydrated: false,

      // Set authentication
      setAuth: (params: SetAuthParams) => {
        const now = Date.now();
        const nextState: Partial<AuthState> = {
          isAuthenticated: true,
          authenticatedAt: now,
          _hasHydrated: true,
          authMethod: params.method,
          isGuestMode: false,
        };

        if (params.method === 'farcaster') {
          // For mini apps: no expiry, re-auth on app load
          Object.assign(nextState, {
            fid: params.fid,
            token: params.token,
            address: params.address ?? null,
            expiresAt: null,
          });
        } else {
          // For wallet: no expiry needed
          Object.assign(nextState, {
            fid: null,
            token: null,
            address: params.address,
            expiresAt: null,
          });
        }

        set(nextState as AuthState);
      },

      // Clear authentication
      clearAuth: () => {
        set({
          isAuthenticated: false,
          fid: null,
          token: null,
          address: null,
          authenticatedAt: null,
          expiresAt: null,
          authMethod: null,
          isGuestMode: false,
        });
      },

      // Set guest mode
      setGuestMode: (isGuest: boolean) => {
        set({
          isGuestMode: isGuest,
          isAuthenticated: false,
          fid: null,
          token: null,
          address: null,
          authMethod: null,
        });
      },

      // Exit guest mode only (preserves any existing auth)
      exitGuestMode: () => {
        set({ isGuestMode: false });
      },

      // Check if session is still valid
      isSessionValid: () => {
        const state = get();

        if (!state.isAuthenticated) {
          return false;
        }

        // Validate wallet auth
        if (state.authMethod === 'wallet') {
          return !!state.address;
        }

        // Validate Farcaster auth
        if (state.authMethod === 'farcaster') {
          return !!(state.fid && state.token);
        }

        return false;
      },

      // Set hydration state
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'farcaster-auth-storage',
      storage: createJSONStorage(() => localStorage),
      
      // Hydration: Mark as loaded from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);

/**
 * Helper hook to check authentication status with hydration
 * 
 * Ensures authentication state is loaded from localStorage before checking.
 * Use this in protected routes to avoid flash of unauthenticated content.
 */
export const useAuthCheck = () => {
  const { isSessionValid, isAuthenticated, fid, address, authMethod, isGuestMode, _hasHydrated } = useAuthStore();

  // Check validity on every use
  const isValid = isSessionValid();

  return {
    isAuthenticated: isValid && isAuthenticated,
    fid: isValid ? fid : null,
    address: isValid ? address : null,
    authMethod: isValid ? authMethod : null,
    isGuestMode,
    hasHydrated: _hasHydrated,
  };
};

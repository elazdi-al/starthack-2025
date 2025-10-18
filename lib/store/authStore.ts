import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Farcaster Mini App Authentication Store
 * 
 * Manages authentication state for Farcaster mini apps using Quick Auth.
 * Automatically persists to localStorage and validates session expiry.
 */

interface AuthState {
  isAuthenticated: boolean;
  fid: number | null;
  token: string | null;
  authenticatedAt: number | null;
  expiresAt: number | null;
  _hasHydrated: boolean;
}

interface AuthActions {
  setAuth: (fid: number, token: string, expiresInDays?: number) => void;
  clearAuth: () => void;
  isSessionValid: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

const DEFAULT_EXPIRY_DAYS = 7;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      fid: null,
      token: null,
      authenticatedAt: null,
      expiresAt: null,
      _hasHydrated: false,

      // Set Farcaster authentication
      setAuth: (fid: number, token: string, expiresInDays = DEFAULT_EXPIRY_DAYS) => {
        const now = Date.now();
        const expiresAt = now + (expiresInDays * 24 * 60 * 60 * 1000);

        set({
          isAuthenticated: true,
          fid,
          token,
          authenticatedAt: now,
          expiresAt,
        });
      },

      // Clear authentication
      clearAuth: () => {
        set({
          isAuthenticated: false,
          fid: null,
          token: null,
          authenticatedAt: null,
          expiresAt: null,
        });
      },

      // Check if session is still valid
      isSessionValid: () => {
        const state = get();
        
        if (!state.isAuthenticated || !state.expiresAt) {
          return false;
        }

        const now = Date.now();
        
        // Check if session has expired
        if (now > state.expiresAt) {
          // Auto-clear expired session
          get().clearAuth();
          return false;
        }

        return true;
      },

      // Set hydration state
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'farcaster-auth-storage',
      storage: createJSONStorage(() => localStorage),
      
      // Hydration: Check session validity when loading from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Check validity first
          if (!state.isSessionValid()) {
            state.clearAuth();
          }
          // Mark as hydrated
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
  const { isSessionValid, isAuthenticated, fid, _hasHydrated } = useAuthStore();

  // Check validity on every use
  const isValid = isSessionValid();

  return {
    isAuthenticated: isValid && isAuthenticated,
    fid: isValid ? fid : null,
    hasHydrated: _hasHydrated,
  };
};


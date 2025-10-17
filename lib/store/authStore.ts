import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  address: string | null;
  authenticatedAt: number | null;
  expiresAt: number | null;
}

interface AuthActions {
  setAuth: (address: string, expiresInDays?: number) => void;
  clearAuth: () => void;
  isSessionValid: () => boolean;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      address: null,
      authenticatedAt: null,
      expiresAt: null,

      // Set authentication
      setAuth: (address: string, expiresInDays = 7) => {
        const now = Date.now();
        const expiresAt = now + (expiresInDays * 24 * 60 * 60 * 1000);
        
        set({
          isAuthenticated: true,
          address,
          authenticatedAt: now,
          expiresAt,
        });
      },

      // Clear authentication
      clearAuth: () => {
        set({
          isAuthenticated: false,
          address: null,
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
    }),
    {
      name: 'base-auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      
      // Hydration: Check session validity when loading from storage
      onRehydrateStorage: () => (state) => {
        if (state && !state.isSessionValid()) {
          state.clearAuth();
        }
      },
    }
  )
);

// Helper hook to check auth status on mount
export const useAuthCheck = () => {
  const { isSessionValid, isAuthenticated, address } = useAuthStore();
  
  // Check validity on every use
  const isValid = isSessionValid();
  
  return {
    isAuthenticated: isValid && isAuthenticated,
    address: isValid ? address : null,
  };
};


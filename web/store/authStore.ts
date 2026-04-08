import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  
  // Actions
  login: (token: string) => void;
  logout: () => void;
  setAuthLoading: (loading: boolean) => void;
}

const COOKIE_NAME = 'auth-token';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  loading: true,

  login: (token) => {
    // Save token to localStorage and Cookie for middleware support
    if (typeof window !== 'undefined') {
      localStorage.setItem('@oldful_auth_token', token);
      // Set a secure cookie for the middleware
      // In production, add Secure; SameSite=Strict
      document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
    set({ isAuthenticated: true, token, loading: false });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('@oldful_auth_token');
      // Clear the cooke
      document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    }
    set({ isAuthenticated: false, token: null, loading: false });
    // Force a reload or redirect to clear application state
    window.location.href = '/auth';
  },

  setAuthLoading: (loading) => set({ loading }),
}));

// Auto-hydrate on load
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('@oldful_auth_token');
  if (token) {
    useAuthStore.getState().login(token);
  } else {
    useAuthStore.getState().setAuthLoading(false);
  }
}


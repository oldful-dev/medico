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

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  loading: true,

  login: (token) => {
    // Save token to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('@oldful_auth_token', token);
    }
    set({ isAuthenticated: true, token, loading: false });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('@oldful_auth_token');
    }
    set({ isAuthenticated: false, token: null, loading: false });
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

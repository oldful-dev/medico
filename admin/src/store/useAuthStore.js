import { create } from 'zustand';
import { authAPI } from '../lib/api';
import Cookies from 'js-cookie';

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    loading: true,

    login: async (email, password) => {
        try {
            const res = await authAPI.login(email, password);
            if (res.data.success) {
                const { admin } = res.data.data;
                // Tokens are now set as HttpOnly cookies by the backend
                // (Set-Cookie on the login response) — nothing to store
                // here. res.data.data.accessToken/refreshToken are still
                // present in the body only as a fallback for a cached old
                // frontend build; a current build never reads them.
                set({ user: admin, isAuthenticated: true });
                return { success: true };
            }
            return { success: false, message: 'Invalid response' };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    },

    setUser: (user) => set({ user }),

    logout: async () => {
        try {
            await authAPI.logout();
        } catch (e) { }
        // Legacy cookies from a pre-hardening session, if any — harmless
        // no-op once the real HttpOnly cookies are already backend-cleared.
        Cookies.remove('adminToken');
        Cookies.remove('adminRefreshToken');
        set({ user: null, isAuthenticated: false });
    },

    // Restores session state on page load. The auth token is now an
    // HttpOnly cookie the frontend can't decode itself, so this asks the
    // backend who's logged in instead of reading a local JWT. The browser
    // attaches the cookie automatically (withCredentials in lib/api.js);
    // a 401 here means "not logged in" just like before.
    checkAuth: async () => {
        try {
            const res = await authAPI.me();
            if (res.data.success) {
                set({ user: res.data.data, isAuthenticated: true, loading: false });
                return;
            }
            set({ user: null, isAuthenticated: false, loading: false });
        } catch (e) {
            set({ user: null, isAuthenticated: false, loading: false });
        }
    },
}));

export default useAuthStore;

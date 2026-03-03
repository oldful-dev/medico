// ──────────────────────────────────────────────
//  Auth Context — Global authentication state
//  Integrates with:
//    - storageService (persist tokens to AsyncStorage)
//    - apiClient (set/clear Bearer token)
//    - authService (backend OTP + token refresh)
// ──────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/services/api/apiClient';
import { storageService, STORAGE_KEYS } from '@/services/device/storageService';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    userId: string | null;
    token: string | null;
}

interface AuthContextType extends AuthState {
    login: (accessToken: string, refreshToken: string, userId: string) => Promise<void>;
    logout: () => Promise<void>;
    setLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        userId: null,
        token: null,
    });

    // ─── Boot: Restore tokens from AsyncStorage ──────
    useEffect(() => {
        (async () => {
            try {
                // Short artificial delay (500ms) to allow the app container to mount 
                // and avoid split-second white flashes before the state takes over.
                await new Promise(resolve => setTimeout(resolve, 500));

                const { accessToken, refreshToken } = await storageService.getAuthTokens();
                const userId = await storageService.getItem(STORAGE_KEYS.USER_ID);

                if (accessToken && refreshToken && userId) {
                    // Hydrate apiClient with stored tokens
                    apiClient.setAuthToken(accessToken);
                    apiClient.setRefreshToken(refreshToken);

                    setState({
                        isAuthenticated: true,
                        isLoading: false,
                        userId,
                        token: accessToken,
                    });
                } else {
                    setState(prev => ({ ...prev, isLoading: false }));
                }
            } catch {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        })();
    }, []);

    // ─── Register callback: when apiClient refreshes the token, persist it ──
    useEffect(() => {
        apiClient.setTokenRefreshedCallback(async (newAccessToken: string) => {
            await storageService.setItem(STORAGE_KEYS.AUTH_TOKEN, newAccessToken);
            setState(prev => ({ ...prev, token: newAccessToken }));
        });

        apiClient.setAuthFailureCallback(async () => {
            // Token refresh failed — force logout
            await logout();
        });
    }, []);

    // ─── Login ────────────────────────────────────────
    const login = async (accessToken: string, refreshToken: string, userId: string) => {
        // Persist tokens
        await storageService.saveAuthTokens(accessToken, refreshToken);
        await storageService.setItem(STORAGE_KEYS.USER_ID, userId);

        // Configure apiClient
        apiClient.setAuthToken(accessToken);
        apiClient.setRefreshToken(refreshToken);

        setState({
            isAuthenticated: true,
            isLoading: false,
            userId,
            token: accessToken,
        });
    };

    // ─── Logout ───────────────────────────────────────
    const logout = async () => {
        try {
            // Tell the backend to invalidate the refresh token
            await apiClient.post('/auth/logout').catch(() => { }); // best-effort
        } finally {
            apiClient.clearAuthToken();
            await storageService.clearAuthTokens();
            setState({
                isAuthenticated: false,
                isLoading: false,
                userId: null,
                token: null,
            });
        }
    };

    const setLoading = (loading: boolean) => {
        setState(prev => ({ ...prev, isLoading: loading }));
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout, setLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

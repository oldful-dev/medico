// Auth Context - Global authentication state
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    userId: string | null;
    token: string | null;
}

interface AuthContextType extends AuthState {
    login: (token: string, userId: string) => void;
    logout: () => void;
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

    const login = (token: string, userId: string) => {
        setState({ isAuthenticated: true, isLoading: false, userId, token });
    };

    const logout = () => {
        setState({ isAuthenticated: false, isLoading: false, userId: null, token: null });
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

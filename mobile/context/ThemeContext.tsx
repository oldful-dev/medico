import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
    isDarkMode: boolean;
    toggleDarkMode: (value: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_MODE_KEY = '@ayuxacare_dark_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(DARK_MODE_KEY);
                setIsDarkMode(saved === 'true');
            } catch {
                // Default to light mode on error
            }
        })();
    }, []);

    const toggleDarkMode = async (value: boolean) => {
        setIsDarkMode(value);
        try {
            await AsyncStorage.setItem(DARK_MODE_KEY, value ? 'true' : 'false');
        } catch {
            // Silently fail but keep state
        }
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
    isDarkMode: boolean;
    toggleDarkMode: (value: boolean) => Promise<void>;
    isLargeFont: boolean;
    fontScale: number; // 1.0 or 1.25
    toggleFontScale: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_MODE_KEY = '@ayuxacare_dark_mode';
const FONT_SCALE_KEY = '@ayuxacare_font_scale';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isLargeFont, setIsLargeFont] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [savedTheme, savedFont] = await Promise.all([
                    AsyncStorage.getItem(DARK_MODE_KEY),
                    AsyncStorage.getItem(FONT_SCALE_KEY),
                ]);
                setIsDarkMode(savedTheme === 'true');
                setIsLargeFont(savedFont === 'true');
            } catch {
                // Default settings on error
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

    const toggleFontScale = async () => {
        const next = !isLargeFont;
        setIsLargeFont(next);
        try {
            await AsyncStorage.setItem(FONT_SCALE_KEY, next ? 'true' : 'false');
        } catch {
            // Silently fail
        }
    };

    const fontScale = isLargeFont ? 1.25 : 1.0;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, isLargeFont, fontScale, toggleFontScale }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}

// User Context - User profile and preferences state
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '@/services/api/userService';

const LANG_KEY = '@oldful_language';

interface UserContextType {
    profile: UserProfile | null;
    setProfile: (profile: UserProfile | null) => void;
    selectedCity: string;
    setSelectedCity: (city: string) => void;
    preferredLanguage: string;
    setPreferredLanguage: (language: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedCity, setSelectedCity] = useState('Bangalore');
    const [preferredLanguage, setPreferredLanguage] = useState('en');

    // Load persisted language on mount
    useEffect(() => {
        AsyncStorage.getItem(LANG_KEY).then(saved => {
            if (saved) setPreferredLanguage(saved);
        });
    }, []);

    // Wrap setter to also persist to AsyncStorage
    const saveLanguage = (lang: string) => {
        setPreferredLanguage(lang);
        AsyncStorage.setItem(LANG_KEY, lang);
    };

    return (
        <UserContext.Provider value={{
            profile, setProfile,
            selectedCity, setSelectedCity,
            preferredLanguage, setPreferredLanguage: saveLanguage,
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUser must be used within UserProvider');
    return context;
}

// User Context - User profile and preferences state
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile } from '@/services/api/userService';

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

    return (
        <UserContext.Provider value={{
            profile, setProfile,
            selectedCity, setSelectedCity,
            preferredLanguage, setPreferredLanguage,
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

// User Context - User profile and service catalog state
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, userService, serviceCatalogService } from '@/services/api';
import { ServiceItem } from '@/services/api/serviceCatalogService';
import { useAuth } from './AuthContext';
import i18n from '@/i18n/i18n';

const LANG_KEY = '@oldful_language';

interface UserContextType {
    profile: UserProfile | null;
    setProfile: (profile: UserProfile | null) => void;
    services: ServiceItem[];
    isLoading: boolean;
    refreshData: () => Promise<void>;
    getServiceBySlug: (slug: string) => ServiceItem | undefined;

    selectedCity: string;
    setSelectedCity: (city: string) => void;
    preferredLanguage: string;
    setPreferredLanguage: (language: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [selectedCity, setSelectedCity] = useState('Bangalore');
    const [preferredLanguage, setPreferredLanguage] = useState('en');

    // Load persisted language on mount
    useEffect(() => {
        AsyncStorage.getItem(LANG_KEY).then(saved => {
            if (saved) {
                setPreferredLanguage(saved);
                i18n.changeLanguage(saved);
            }
        });
    }, []);

    const saveLanguage = (lang: string) => {
        setPreferredLanguage(lang);
        i18n.changeLanguage(lang);
        AsyncStorage.setItem(LANG_KEY, lang);
    };

    const loadData = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const [profileRes, servicesRes] = await Promise.all([
                userService.getProfile(),
                serviceCatalogService.getServices()
            ]);

            if (profileRes.success && profileRes.data) {
                setProfile(profileRes.data);
                if (profileRes.data.preferredLanguage) {
                    setPreferredLanguage(profileRes.data.preferredLanguage);
                    i18n.changeLanguage(profileRes.data.preferredLanguage);
                }
            }

            if (servicesRes.success && servicesRes.data) {
                setServices(servicesRes.data);
            }
        } catch (error) {
            console.error('Failed to load user/service data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        } else {
            setProfile(null);
            setServices([]);
        }
    }, [isAuthenticated, loadData]);

    const getServiceBySlug = (slug: string) => {
        return services.find(s => s.slug === slug);
    };

    return (
        <UserContext.Provider value={{
            profile, setProfile,
            services,
            isLoading,
            refreshData: loadData,
            getServiceBySlug,
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

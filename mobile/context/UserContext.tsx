// User Context - User profile and service catalog state
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, userService, serviceCatalogService } from '@/services/api';
import { ServiceItem } from '@/services/api/serviceCatalogService';
import { useAuth } from './AuthContext';
import i18n from '@/i18n/i18n';

const LANG_KEY = '@ayuxacare_language';

interface UserContextType {
    profile: UserProfile | null;
    setProfile: (profile: UserProfile | null) => void;
    services: ServiceItem[];
    isLoading: boolean;
    refreshData: () => Promise<void>;
    getServiceBySlug: (slug: string) => ServiceItem | undefined;

    selectedCity: string;
    setSelectedCity: (city: string) => void;
    selectedCityId: string | null;
    setSelectedCityId: (id: string | null) => void;
    preferredLanguage: string;
    setPreferredLanguage: (language: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [selectedCity, setSelectedCity] = useState('');
    const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
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

    const lastLoadTimeRef = useRef<number>(0);
    const THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 Hours refresh interval

    const loadServices = useCallback(async () => {
        try {
            const res = await serviceCatalogService.getServices();
            if (res.success && res.data) {
                setServices(res.data);
            }
        } catch (error) {
            console.error('Failed to load services catalog:', error);
        }
    }, []);

    const loadData = useCallback(async (force = false) => {
        // Always load services catalog so layout is 100% dynamic
        loadServices();

        if (!isAuthenticated) return;
        const now = Date.now();
        if (!force && lastLoadTimeRef.current > 0 && (now - lastLoadTimeRef.current < THROTTLE_MS)) {
            return;
        }
        setIsLoading(true);
        try {
            const profileRes = await userService.getProfile();
            if (profileRes.success && profileRes.data) {
                setProfile(profileRes.data);
                if (profileRes.data.preferredLanguage) {
                    setPreferredLanguage(profileRes.data.preferredLanguage);
                    i18n.changeLanguage(profileRes.data.preferredLanguage);
                }
            }
            lastLoadTimeRef.current = Date.now();
        } catch (error) {
            console.error('Failed to load user profile data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, loadServices]);

    useEffect(() => {
        loadServices();
        if (isAuthenticated) {
            loadData();
        } else {
            setProfile(null);
        }
    }, [isAuthenticated, loadData, loadServices]);

    const getServiceBySlug = (slug: string) => {
        if (!slug) return undefined;
        const cleanSlug = slug.toLowerCase().replace(/_/g, '-');
        const cleanRoute = `/${cleanSlug}`;

        return services.find(s => {
            if (!s) return false;
            const sSlug = (s.slug || '').toLowerCase().replace(/_/g, '-');
            const sRoute = (s.route || '').toLowerCase();
            if (sSlug === cleanSlug) return true;
            if (sRoute === cleanRoute || sRoute === cleanSlug) return true;

            // Alias matching for Home Essentials & Services
            const ALIASES: Record<string, string[]> = {
                'appliance-repair': ['appliance-repair', 'ac-repair', 'acrepair', 'appliance'],
                'plumbing-electrical': ['plumbing-electrical', 'plumbing', 'electrician', 'plumber'],
                'deep-cleaning': ['deep-cleaning', 'cleaning', 'pest-control', 'pestcontrol'],
                'driving-cab': ['driving-cab', 'driver', 'car-service', 'carservice'],
                'grocery-run': ['grocery-run', 'grocery', 'gerocery'],
                'bill-payment': ['bill-payment', 'bills'],
                'bank-paperwork': ['bank-paperwork', 'paper-work', 'paperwork'],
                'paper-legal': ['paper-legal', 'legal-help', 'legal'],
                'anything-else': ['anything-else', 'washroom', 'anything'],
                'tech-helper': ['tech-helper', 'tech'],
                'sanitisation': ['sanitisation', 'washroom-sanitisation'],
                'trip-travels': ['trip-travels', 'trips-tours', 'trip-travel'],
                'smart-upgrade': ['smart-upgrade', 'smart_upgrade']
            };

            const aliases = ALIASES[cleanSlug] || [];
            return aliases.includes(sSlug);
        });
    };

    return (
        <UserContext.Provider value={{
            profile, setProfile,
            services,
            isLoading,
            refreshData: loadData,
            getServiceBySlug,
            selectedCity, setSelectedCity,
            selectedCityId, setSelectedCityId,
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

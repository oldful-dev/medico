import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// We will map these correctly when we implement the API service layer
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  [key: string]: unknown;
}

export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  [key: string]: unknown;
}

interface UserState {
  profile: UserProfile | null;
  services: ServiceItem[];
  isLoading: boolean;
  selectedCity: string;
  preferredLanguage: string;
  
  // Actions
  setProfile: (profile: UserProfile | null) => void;
  setServices: (services: ServiceItem[]) => void;
  setIsLoading: (loading: boolean) => void;
  setSelectedCity: (city: string) => void;
  setPreferredLanguage: (language: string) => void;
  getServiceBySlug: (slug: string) => ServiceItem | undefined;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      services: [],
      isLoading: false,
      selectedCity: 'Bangalore',
      preferredLanguage: 'en',

      setProfile: (profile) => set({ profile }),
      setServices: (services) => set({ services }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setSelectedCity: (selectedCity) => set({ selectedCity }),
      setPreferredLanguage: (preferredLanguage) => set({ preferredLanguage }),
      getServiceBySlug: (slug) => {
        return get().services.find((s) => s.slug === slug);
      },
    }),
    {
      name: '@ayuxacare_user_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferredLanguage: state.preferredLanguage,
        selectedCity: state.selectedCity,
      }), // Only persist language and city preferences across sessions
    }
  )
);

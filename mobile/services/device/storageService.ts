// Storage Service - AsyncStorage wrapper for local data persistence
// Used for auth tokens, user preferences, onboarding state

export const storageService = {
  setItem: async (key: string, value: string): Promise<void> => {
    // TODO: AsyncStorage.setItem
  },

  getItem: async (key: string): Promise<string | null> => {
    // TODO: AsyncStorage.getItem
    return null;
  },

  removeItem: async (key: string): Promise<void> => {
    // TODO: AsyncStorage.removeItem
  },

  clear: async (): Promise<void> => {
    // TODO: AsyncStorage.clear
  },

  // Typed helpers
  setObject: async (key: string, value: any): Promise<void> => {
    // TODO: JSON.stringify + setItem
  },

  getObject: async <T>(key: string): Promise<T | null> => {
    // TODO: getItem + JSON.parse
    return null;
  },
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PROFILE: 'user_profile',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SELECTED_CITY: 'selected_city',
  PREFERRED_LANGUAGE: 'preferred_language',
  PUSH_TOKEN: 'push_token',
} as const;

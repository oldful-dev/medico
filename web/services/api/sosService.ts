import { apiClient } from './apiClient';

export interface SOSAlert {
    id: string;
    userId: string;
    cityId: string | null;
    latitude: number | null;
    longitude: number | null;
    addressSnapshot: string | null;
    status: 'ACTIVE' | 'RESPONDING' | 'RESOLVED';
    createdAt: string;
}

export const sosService = {
    /**
     * Trigger an SOS alert to the backend.
     * GPS coordinates are optional but highly recommended.
     */
    triggerSOS: async (location?: { latitude: number; longitude: number }) => {
        return apiClient.post<SOSAlert>('/sos', {
            location: location ? {
                latitude: location.latitude,
                longitude: location.longitude
            } : null
        });
    },

    /**
     * Request browser geolocation
     */
    getCurrentLocation: (): Promise<{ latitude: number; longitude: number } | null> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                return resolve(null);
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    });
                },
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        });
    }
};

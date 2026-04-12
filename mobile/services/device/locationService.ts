// ──────────────────────────────────────────────
//  Location Service — GPS location using expo-location
// ──────────────────────────────────────────────

import * as Location from 'expo-location';

export interface LocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

export const locationService = {
    /**
     * Request foreground location permission
     */
    requestPermission: async (): Promise<boolean> => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Get current GPS coordinates
     */
    getCurrentLocation: async (): Promise<LocationCoordinates> => {
        const hasPermission = await locationService.requestPermission();
        if (!hasPermission) {
            throw new Error('Location permission denied');
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? undefined,
        };
    },

    /**
     * Watch location changes (returns cleanup function)
     */
    watchLocation: (callback: (location: LocationCoordinates) => void): (() => void) => {
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            const hasPermission = await locationService.requestPermission();
            if (!hasPermission) return;

            subscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 10 },
                (location) => {
                    callback({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy ?? undefined,
                    });
                }
            );
        })();

        return () => {
            if (subscription) subscription.remove();
        };
    },

    /**
     * Reverse geocode coordinates to a human-readable address using Google Maps API
     */
    getAddressFromCoordinates: async (coords: LocationCoordinates): Promise<string> => {
        try {
            const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                // Focus on the most detailed address
                const result = data.results[0];
                return result.formatted_address;
            }
            
            // Fallback to native geocoding if Google fails or is missing key
            const results = await Location.reverseGeocodeAsync({
                latitude: coords.latitude,
                longitude: coords.longitude,
            });

            if (results.length > 0) {
                const addr = results[0];
                const parts = [addr.street, addr.city, addr.region, addr.postalCode].filter(Boolean);
                return parts.join(', ');
            }
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
        }

        return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    },
};

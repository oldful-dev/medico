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
     * Get current GPS coordinates.
     * Strategy:
     *   1. Try last-known position first (instant, no GPS spin-up needed)
     *   2. Race a fresh GPS fix against an 8-second timeout
     *   3. Fall back to last-known if the fresh fix loses the race
     */
    getCurrentLocation: async (): Promise<LocationCoordinates> => {
        // ── Helper: reject after N ms ─────────────────────────────────────────
        const timeout = (ms: number) =>
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('GPS timeout')), ms),
            );

        // ── 1. Try last-known first (zero latency) ────────────────────────────
        const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 5 * 60 * 1000, // accept if < 5 min old
            requiredAccuracy: 500,  // within 500 m
        }).catch(() => null);

        // ── 2. Race fresh GPS against 8-second timeout ────────────────────────
        let freshLocation: Location.LocationObject | null = null;
        try {
            freshLocation = await Promise.race([
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                timeout(8000),
            ]);
        } catch {
            // Fresh fix timed-out or failed — use last-known if available
        }

        const location = freshLocation ?? lastKnown;
        if (!location) throw new Error('Unable to get location');

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
            if (apiKey) {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${apiKey}`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.status === 'OK' && data.results.length > 0) {
                    // Focus on the most detailed address
                    const result = data.results[0];
                    return result.formatted_address;
                }
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

    /**
     * Extract pincode from address or coordinates
     */
    getPincodeFromAddress: async (coords: LocationCoordinates, addressText?: string): Promise<string | null> => {
        // Try to extract from address text first
        if (addressText) {
            const pincodeMatch = addressText.match(/\b\d{6}\b/);
            if (pincodeMatch) {
                return pincodeMatch[0];
            }
        }

        // Fallback: use native geocoding to get postal code
        try {
            const results = await Location.reverseGeocodeAsync({
                latitude: coords.latitude,
                longitude: coords.longitude,
            });

            if (results.length > 0 && results[0].postalCode) {
                return results[0].postalCode;
            }
        } catch (error) {
            console.error('Failed to get pincode:', error);
        }

        return null;
    },
};

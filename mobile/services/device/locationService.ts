// ──────────────────────────────────────────────
//  Location Service — GPS location using expo-location
// ──────────────────────────────────────────────

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

// Set once we've prompted for location. Passive screens (Home) check this and
// stop re-prompting; only an explicit SOS press asks again.
const LOCATION_PROMPTED_KEY = '@ayuxa_location_prompted';
// In-memory mirror so a fast tab-switch can't beat the async AsyncStorage write.
let promptedThisSession = false;

export const locationService = {
    /**
     * Request foreground location permission (shows the OS dialog).
     */
    requestPermission: async (): Promise<boolean> => {
        promptedThisSession = true;
        AsyncStorage.setItem(LOCATION_PROMPTED_KEY, '1').catch(() => {});
        console.log('[loc] requestPermission() — SHOWING OS DIALOG. promptedThisSession=true, wrote AsyncStorage flag');
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
        console.log('[loc] requestPermission() result:', { status, canAskAgain });
        return status === 'granted';
    },

    /**
     * Current permission status WITHOUT showing a dialog.
     */
    getPermissionStatus: async (): Promise<'granted' | 'denied' | 'undetermined'> => {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
        console.log('[loc] getPermissionStatus() ->', { status, canAskAgain });
        return status;
    },

    /**
     * True only the very first time — before we've ever prompted for location
     * (this session OR a previous one). After that, passive flows stay quiet.
     */
    shouldPromptOnce: async (): Promise<boolean> => {
        if (promptedThisSession) {
            console.log('[loc] shouldPromptOnce() -> false (promptedThisSession already true)');
            return false;
        }
        const status = await locationService.getPermissionStatus();
        if (status === 'granted') {
            console.log('[loc] shouldPromptOnce() -> false (already granted)');
            return false;
        }
        const flag = await AsyncStorage.getItem(LOCATION_PROMPTED_KEY);
        const result = flag === null;
        console.log('[loc] shouldPromptOnce() ->', result, `(AsyncStorage flag=${JSON.stringify(flag)}, status=${status})`);
        return result;
    },

    /**
     * Get current GPS coordinates.
     * Strategy:
     *   1. Try last-known position first (instant, no GPS spin-up needed)
     *   2. Race a fresh GPS fix against an 8-second timeout
     *   3. Fall back to last-known if the fresh fix loses the race
     */
    getCurrentLocation: async (): Promise<LocationCoordinates> => {
        // getCurrentPositionAsync prompts if permission is undetermined — bail
        // out first so this never becomes a back-door permission dialog. Callers
        // that WANT to prompt call requestPermission() explicitly beforehand.
        if ((await locationService.getPermissionStatus()) !== 'granted') {
            throw new Error('Location permission not granted');
        }

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

// ──────────────────────────────────────────────
//  SOS Service — Wired to backend SOS routes
//  POST   /api/sos                  (trigger SOS alert with GPS)
// ──────────────────────────────────────────────

import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { apiClient, ApiResponse } from '../api/apiClient';

// ─── Types (aligned with Prisma SOSAlert model) ───

export type SOSStatus = 'ACTIVE' | 'RESPONDING' | 'RESOLVED';

export interface SOSAlert {
    id: string;
    userId: string;
    cityId: string;
    latitude?: number;
    longitude?: number;
    addressSnapshot?: string;
    status: SOSStatus;
    resolvedAt?: string;
    adminNotified: boolean;
    familyNotified: boolean;
    createdAt: string;
}

export interface LocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

// ─── Service ──────────────────────────────────

export const sosService = {
    /**
     * Request location permission
     */
    requestLocationPermission: async (): Promise<boolean> => {
        console.log('[sos] requestLocationPermission — SHOWING OS DIALOG (SOS path, always asks)');
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('[sos] requestLocationPermission result:', status);
        return status === 'granted';
    },

    /**
     * Get current GPS coordinates — tries High accuracy with 8s timeout,
     * falls back to last-known position if that fails.
     */
    getCurrentLocation: async (): Promise<LocationCoordinates | null> => {
        // Try last-known first (instant, no GPS warmup needed)
        try {
            const last = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
            if (last) {
                return { latitude: last.coords.latitude, longitude: last.coords.longitude };
            }
        } catch { }

        // Fresh fix with timeout
        try {
            const location = await Promise.race([
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
            ]) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>;
            return { latitude: location.coords.latitude, longitude: location.coords.longitude };
        } catch (e) {
            console.warn('SOS getCurrentLocation failed:', e);
            return null;
        }
    },

    /**
     * Full SOS flow:
     * 1. Get GPS location from device (or use pre-fetched)
     * 2. POST /api/sos with location data
     * 3. Backend notifies admin + family via WhatsApp/SMS
     */
    triggerSOS: async (prefetchedLocation?: LocationCoordinates | null): Promise<ApiResponse<SOSAlert>> => {
        let location: LocationCoordinates | null = prefetchedLocation ?? null;

        if (!location) {
            try {
                const hasPermission = await sosService.requestLocationPermission();
                if (hasPermission) {
                    location = await sosService.getCurrentLocation();
                }
            } catch (e) {
                console.warn('SOS Location fetch failed', e);
            }
        }

        if (!location) {
            console.warn('SOS: sending without coordinates — GPS unavailable');
        }

        // Send to backend (with location if available, otherwise fallback to profile city)
        return apiClient.post<SOSAlert>('/sos', {
            location: location ? {
                latitude: location.latitude,
                longitude: location.longitude,
            } : null
        });
    },

    /**
     * Call emergency hotline directly.
     * NOTE: We do NOT use Linking.canOpenURL for tel: because on Android 11+
     * canOpenURL returns false for tel: unless the scheme is declared in android.queries.
     * openURL always works on physical devices for phone calls.
     */
    callEmergencyHotline: async (hotlineNumber: string = '+919480198108'): Promise<void> => {
        const url = `tel:${hotlineNumber}`;
        try {
            await Linking.openURL(url);
        } catch (err) {
            console.warn('SOS: Unable to open phone dialer:', err);
            throw err;
        }
    },

    /**
     * Share SOS location via WhatsApp to emergency contacts
     */
    shareLocationViaWhatsApp: async (
        contacts: string[],
        location: LocationCoordinates,
        message: string = 'EMERGENCY: I need immediate help!'
    ): Promise<void> => {
        const mapLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
        const fullMessage = `${message}\n📍 My Location: ${mapLink}`;

        for (const phone of contacts) {
            const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(fullMessage)}`;
            const supported = await Linking.canOpenURL(whatsappUrl);
            if (supported) {
                await Linking.openURL(whatsappUrl);
                return; // Opens WhatsApp with the first available contact
            }
        }
    },
};

// ──────────────────────────────────────────────
//  SOS Service — Wired to backend SOS routes
//  POST   /api/sos                  (trigger SOS alert with GPS)
// ──────────────────────────────────────────────

import { Linking, Alert } from 'react-native';
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
     * Full SOS flow:
     * 1. Get GPS location from device
     * 2. POST /api/sos with location data
     * 3. Backend notifies admin + family via WhatsApp/SMS
     */
    triggerSOS: async (): Promise<ApiResponse<SOSAlert>> => {
        // 1. Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            // Still send SOS without coordinates — backend uses user profile cityId
            return apiClient.post<SOSAlert>('/sos', {});
        }

        // 2. Get current position — Balanced is faster than High in emergency situations
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            // 3. Send to backend with GPS
            return apiClient.post<SOSAlert>('/sos', {
                location: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                }
            });
        } catch {
            // Location fetch failed — send without coordinates
            return apiClient.post<SOSAlert>('/sos', { location: null });
        }
    },

    /**
     * Call emergency hotline directly
     */
    callEmergencyHotline: async (hotlineNumber: string = '112'): Promise<void> => {
        const url = `tel:${hotlineNumber}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Unable to make phone call');
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

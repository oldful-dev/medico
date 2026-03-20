// SOS Emergency Screen — Hybrid implementation (M-01)
// Flow: View screen → Press SOS button → 3s countdown → Trigger SOS (phone call + GPS + API alert)

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { SOSButton, SlideToCall, BackgroundGlow } from '@/components/sos';
import SOSCountdown from '@/components/sos/SOSCountdown';
import { sosService } from '@/services/device/sosService';
import { Fonts } from '@/constants/theme';

export default function SOSEmergencyScreen() {
    const router = useRouter();
    const [showCountdown, setShowCountdown] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);

    // ─── SOS Trigger Flow ────────────────────
    const handleSOSPress = useCallback(() => {
        setShowCountdown(true);
    }, []);

    const handleCountdownComplete = useCallback(async () => {
        setShowCountdown(false);
        setIsTriggering(true);

        try {
            // 1. Trigger SOS alert to backend (GPS + notification to admin & family)
            // Using a default cityId — backend will resolve from user profile if needed
            const result = await sosService.triggerSOS('default');

            if (result.success) {
                // 2. Simultaneously open phone dialer for emergency call
                await sosService.callEmergencyHotline('+919480198108');
            } else {
                // If API fails, still try to make the phone call
                await sosService.callEmergencyHotline('+919480198108');
                Alert.alert(
                    'Partial Alert',
                    'Phone call initiated. Backend alert may not have been sent. Please try again if needed.'
                );
            }
        } catch (error) {
            // Even if everything fails, try the phone call as last resort
            try {
                await sosService.callEmergencyHotline('112');
            } catch {
                Alert.alert('Emergency', 'Please call 112 directly for emergency assistance.');
            }
        } finally {
            setIsTriggering(false);
        }
    }, []);

    const handleCountdownCancel = useCallback(() => {
        setShowCountdown(false);
    }, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar style="dark" />
            <View style={styles.container}>

                {/* ─── Header Text Group ─── */}
                <View style={styles.headerGroup}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="#313A51" />
                    </TouchableOpacity>
                    <Text style={styles.titleText}>
                        {'Calling '}
                        <Text style={styles.titleLower}>emergency</Text>
                        {'...'}
                    </Text>
                    <Text style={styles.subtitleText}>
                        {isTriggering
                            ? 'Contacting emergency services...'
                            : 'To start a call, simply press the button'}
                    </Text>
                </View>

                {/* ─── Center: Pressable SOS Button ─── */}
                <View style={styles.centerSection}>
                    <BackgroundGlow />
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleSOSPress}
                        disabled={isTriggering}
                        style={isTriggering ? { opacity: 0.5 } : undefined}
                    >
                        <SOSButton />
                    </TouchableOpacity>
                </View>

                {/* ─── Bottom: Slide + Notifying text ─── */}
                <View style={styles.bottomSection}>
                    <SlideToCall />
                    <Text style={styles.notifyingText}>
                        {isTriggering
                            ? 'Emergency contacts are being notified...'
                            : 'Notifying Emergency Contacts'}
                    </Text>
                </View>

            </View>

            {/* ─── Countdown Overlay ─── */}
            {showCountdown && (
                <SOSCountdown
                    seconds={3}
                    onComplete={handleCountdownComplete}
                    onCancel={handleCountdownCancel}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    /* ─── Root ─── */
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFF0',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 40,
    },

    /* ─── Header ─── */
    headerGroup: {
        alignItems: 'center',
        paddingTop: 10,
        paddingHorizontal: 40,
        gap: 5,
        width: '100%',
    },
    closeButton: {
        position: 'absolute',
        left: 20,
        top: 10,
        zIndex: 10,
        padding: 8,
    },
    titleText: {
        fontFamily: Fonts.semiBold,
        fontSize: 24,
        lineHeight: 34,
        color: '#313A51',
        textAlign: 'center',
    },
    titleLower: {
        textTransform: 'lowercase',
    },
    subtitleText: {
        fontFamily: Fonts.regular,
        fontSize: 16,
        lineHeight: 24,
        color: '#313A51',
        textAlign: 'center',
    },

    /* ─── Center (SOS Rings area) ─── */
    centerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },

    /* ─── Bottom section ─── */
    bottomSection: {
        alignItems: 'center',
        gap: 23,
    },

    /* Notifying text */
    notifyingText: {
        fontFamily: Fonts.medium,
        fontSize: 14,
        lineHeight: 17,
        color: '#555555',
        opacity: 0.49,
        textAlign: 'center',
    },
});

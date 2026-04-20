// SOS Emergency Screen — Figma frame id: 200:413
// Design: Warm cream background, centered title, concentric ring button, slide-to-call
// NO close button per Figma design

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { SOSButton, SlideToCall, BackgroundGlow } from '@/components/sos';
import SOSCountdown from '@/components/sos/SOSCountdown';
import { sosService } from '@/services/device/sosService';
import { Fonts } from '@/constants/theme';

export default function SOSEmergencyScreen() {
    const router = useRouter();
    const [showCountdown, setShowCountdown] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);
    const [prefetchedLocation, setPrefetchedLocation] = useState<any>(null);

    // ─── Pre-fetch Location on Mount (PRD line 41) ───
    useEffect(() => {
        (async () => {
            try {
                const hasPermission = await sosService.requestLocationPermission();
                if (hasPermission) {
                    const loc = await sosService.getCurrentLocation();
                    setPrefetchedLocation(loc);
                }
            } catch (e) {
                console.log('Location pre-fetch failed', e);
            }
        })();
    }, []);

    // ─── SOS Trigger Flow ────────────────────
    const handleSOSPress = useCallback(() => {
        setShowCountdown(true);
    }, []);

    const handleCountdownComplete = useCallback(async () => {
        setShowCountdown(false);
        setIsTriggering(true);

        try {
            const result = await sosService.triggerSOS(prefetchedLocation);
            if (result.success) {
                await sosService.callEmergencyHotline('+919480198108');
            } else {
                await sosService.callEmergencyHotline('+919480198108');
                Alert.alert(
                    'Partial Alert',
                    'Phone call initiated. Backend alert may not have been sent. Please try again if needed.'
                );
            }
        } catch {
            try {
                await sosService.callEmergencyHotline('112');
            } catch {
                Alert.alert('Emergency', 'Please call 112 directly for emergency assistance.');
            }
        } finally {
            setIsTriggering(false);
        }
    }, [prefetchedLocation]);

    const handleCountdownCancel = useCallback(() => {
        setShowCountdown(false);
    }, []);

    return (
        <LinearGradient
            // Figma: warm cream-peach background gradient
            colors={['#FFF8EE', '#FFF3E0', '#FFECD5']}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <StatusBar style="dark" />
                <View style={styles.container}>

                    {/* ─── Header — centered title & subtitle (Figma: Group 483545) ─── */}
                    <View style={styles.headerGroup}>
                        <Text style={styles.titleText}>
                            {isTriggering ? 'Contacting Services...' : 'Calling emergency...'}
                        </Text>
                        <Text style={styles.subtitleText}>
                            {isTriggering
                                ? 'Contacting emergency services...'
                                : 'To start a call,simply press the button'}
                        </Text>
                    </View>

                    {/* ─── Center: Concentric Rings + SOS Button (Figma: Group 483543) ─── */}
                    <View style={styles.centerSection}>
                        <BackgroundGlow />
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleSOSPress}
                            disabled={isTriggering}
                            style={isTriggering ? { opacity: 0.6 } : undefined}
                        >
                            <SOSButton />
                        </TouchableOpacity>
                    </View>

                    {/* ─── Bottom: Slide to Call + Notifying Text (Figma: Group 483553) ─── */}
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
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    /* Root gradient container — Figma warm cream-peach */
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 40,
    },

    /* ─── Header ─── */
    // Figma: text centered, no back arrow
    headerGroup: {
        alignItems: 'center',
        paddingTop: 20,
        paddingHorizontal: 40,
        gap: 8,
        width: '100%',
    },
    // Figma id 200:438 "Calling Emergency..." — Bold, ~24px, dark blue-grey
    titleText: {
        fontFamily: Fonts.bold,
        fontSize: 24,
        lineHeight: 32,
        color: '#313A51',
        textAlign: 'center',
    },
    // Figma id 208:444 "To start a call,simply press the button"
    subtitleText: {
        fontFamily: Fonts.regular,
        fontSize: 16,
        lineHeight: 24,
        color: '#6B7280',
        textAlign: 'center',
    },

    /* ─── Center SOS Ring Area ─── */
    centerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },

    /* ─── Bottom section ─── */
    bottomSection: {
        alignItems: 'center',
        gap: 20,
        paddingHorizontal: 44,
    },

    /* Figma id 215:508 "Notifying Emergency Contacts" */
    notifyingText: {
        fontFamily: Fonts.medium,
        fontSize: 14,
        lineHeight: 17,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

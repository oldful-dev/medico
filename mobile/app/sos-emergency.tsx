// SOS Emergency Screen — Pixel-matched to Figma frame "SOS" (200:413)
// Layout: Vertical flex — Header text → SOS Rings (center) → Slide bar → Footer text
// No business logic — pure presentation

import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { SOSButton, SlideToCall, BackgroundGlow } from '@/components/sos';
import { sosService } from '@/services/device/sosService';
import { Fonts } from '@/constants/theme';

export default function SOSEmergencyScreen() {
    const router = useRouter();

    const handleEmergencyCall = async () => {
        await sosService.callEmergencyHotline('112');
        // Optionally also trigger backend SOS here
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar style="dark" />
            <View style={styles.container}>

                {/* ─── Header Text Group (Figma: Group 483545, y=97) ─── */}
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
                        To start a call,simply press the button
                    </Text>
                </View>

                {/* ─── Center: SOS Rings with background glow ─── */}
                <View style={styles.centerSection}>
                    <BackgroundGlow />
                    <SOSButton />
                </View>

                {/* ─── Bottom: Slide + Notifying text ─── */}
                <View style={styles.bottomSection}>
                    <SlideToCall onSlideComplete={handleEmergencyCall} />
                    <Text style={styles.notifyingText}>
                        Notifying Emergency Contacts
                    </Text>
                </View>

            </View>
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
    /* SlideToCall is 303×69, then 23px gap, then "Notifying…" text */
    bottomSection: {
        alignItems: 'center',
        gap: 23,
    },

    /* Figma: Lexend Deca Bold 14px #555555 opacity 49% */
    notifyingText: {
        fontFamily: Fonts.medium,
        fontSize: 14,
        lineHeight: 17,
        color: '#555555',
        opacity: 0.49,
        textAlign: 'center',
    },
});


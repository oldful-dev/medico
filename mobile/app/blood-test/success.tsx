import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';

export default function BloodTestSuccessScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const params = useLocalSearchParams<{
        bookingId?: string;
        amount?: string;
        packageName?: string;
    }>();

    return (
        <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF' }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#1A1A1A' : '#FFFFFF'} />

            {/* Confetti Decorations */}
            <View style={styles.confettiContainer}>
                <View style={[styles.confettiDot, { left: '10%', top: '15%' }]} />
                <View style={[styles.confettiDot, { right: '12%', top: '20%' }]} />
                <View style={[styles.confettiDot, { left: '15%', top: '30%' }]} />
                <View style={[styles.confettiDot, { right: '18%', top: '35%' }]} />
                <View style={[styles.confettiStar, { left: '12%', top: '25%' }]} />
                <View style={[styles.confettiStar, { right: '15%', top: '28%' }]} />
            </View>

            <View style={styles.successContainer}>
                {/* Checkmark Circle */}
                <View style={styles.iconContainer}>
                    <Ionicons name="checkmark-circle" size={100} color={PRIMARY_GREEN} />
                </View>

                {/* Success Title */}
                <Text style={styles.title}>Payment Successful!</Text>
                <Text style={styles.subtitle}>Your blood test collection(s) have been booked successfully</Text>

                {/* Details Box */}
                <View style={styles.detailsBox}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Booking ID</Text>
                        <Text style={styles.detailValue}>#{params.bookingId || 'BT124567'}</Text>
                    </View>
                    <View style={[styles.detailRow, styles.detailRowBorder]}>
                        <Text style={styles.detailLabel}>Package</Text>
                        <Text style={styles.detailValue}>{params.packageName || 'Blood Test'}</Text>
                    </View>
                    <View style={[styles.detailRow, styles.detailRowBorder]}>
                        <Text style={styles.detailLabel}>Amount Paid</Text>
                        <Text style={styles.detailValue}>₹{params.amount || '0'}</Text>
                    </View>
                </View>

                {/* Confirmation Message */}
                <Text style={styles.confirmText}>
                    You will receive a confirmation on your registered mobile number and email.
                </Text>

                {/* What&apos;s Next Steps */}
                <View style={styles.stepsContainer}>
                    <Text style={styles.stepsTitle}>What&apos;s Next?</Text>

                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>1</Text>
                        </View>
                        <Text style={styles.stepText}>Our phlebotomist will visit your address on the selected date & time</Text>
                    </View>

                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>2</Text>
                        </View>
                        <Text style={styles.stepText}>Sample collection will take 5-10 minutes</Text>
                    </View>

                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>3</Text>
                        </View>
                        <Text style={styles.stepText}>You&apos;ll receive your reports within 24 hours</Text>
                    </View>
                </View>
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.viewBookingsBtn}
                    onPress={() => router.push('/my-bookings')}
                >
                    <Text style={styles.viewBookingsBtnText}>View Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.backHomeBtn}
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text style={styles.backHomeBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    },
    confettiContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    },
    confettiDot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: PRIMARY_GREEN,
        opacity: 0.4,
    },
    confettiStar: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FCD34D',
        opacity: 0.5,
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: isDarkMode ? '#AAAAAA' : TEXT_MUTED,
        textAlign: 'center',
        marginBottom: 24,
    },
    detailsBox: {
        width: '100%',
        backgroundColor: isDarkMode ? '#252525' : '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    detailRowBorder: {
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
    },
    detailLabel: {
        fontSize: 12,
        color: isDarkMode ? '#AAAAAA' : TEXT_MUTED,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700',
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
    },
    confirmText: {
        fontSize: 12,
        color: isDarkMode ? '#AAAAAA' : TEXT_MUTED,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 18,
    },
    stepsContainer: {
        width: '100%',
        backgroundColor: isDarkMode ? '#252525' : '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
    },
    stepsTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        marginBottom: 12,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: PRIMARY_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
        flexShrink: 0,
    },
    stepNumberText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    stepText: {
        fontSize: 12,
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        flex: 1,
        lineHeight: 17,
        paddingTop: 4,
    },
    footer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 12,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    },
    viewBookingsBtn: {
        backgroundColor: PRIMARY_GREEN,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewBookingsBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    backHomeBtn: {
        backgroundColor: isDarkMode ? '#252525' : '#FFFFFF',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
    },
    backHomeBtnText: {
        color: PRIMARY_GREEN,
        fontSize: 15,
        fontWeight: '700',
    },
});
const styles = makeStyles(false, {} as ThemeColors);

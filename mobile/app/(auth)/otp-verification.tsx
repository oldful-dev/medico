// OTP Verification Screen — Pixel-matched to Figma frame "OTP Verifiication" (4:4)
// Layout: Back arrow + Help header, title/phone, OTP boxes, resend row
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OTPInput } from '@/components/common';
import { authService } from '@/services/api/authService';
import { useAuth } from '@/context/AuthContext';

const RESEND_TIMEOUT = 30; // seconds

export default function OtpVerificationScreen() {
    const router = useRouter();
    const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
    const { login } = useAuth();

    const [isVerifying, setIsVerifying] = useState(false);
    const [timer, setTimer] = useState(RESEND_TIMEOUT);
    const [canResend, setCanResend] = useState(false);

    // Mask phone: +91 9876XXXX78 → +91 9876***078
    const maskedPhone = phoneNumber
        ? phoneNumber.replace(/(\+91\s?\d{4})\d{3}(\d{3})/, '$1***$2')
        : '';

    // ─── Countdown timer ───────────────────────────────
    useEffect(() => {
        if (timer <= 0) {
            setCanResend(true);
            return;
        }
        const id = setTimeout(() => setTimer(t => t - 1), 1000);
        return () => clearTimeout(id);
    }, [timer]);

    const timerLabel = `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`;

    // ─── Verify OTP ────────────────────────────────────
    const handleOTPComplete = useCallback(async (otp: string) => {
        if (!phoneNumber || isVerifying) return;
        setIsVerifying(true);
        try {
            const res = await authService.verifyOTP({ phoneNumber, otp });
            if (!res.success || !res.data) {
                Alert.alert('Invalid OTP', res.message ?? 'Please check the code and try again.');
                return;
            }
            if (res.data.isNewUser) {
                // New user — go to profile setup
                router.replace({ pathname: '/(auth)/profile-setup', params: { phoneNumber } });
            } else {
                // Existing user — persist tokens and go home
                const { accessToken, refreshToken, user } = res.data;
                if (accessToken && refreshToken && user) {
                    await login(accessToken, refreshToken, user.id);
                }
                router.replace('/(tabs)');
            }
        } catch {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    }, [phoneNumber, isVerifying, login, router]);

    // ─── Resend OTP ────────────────────────────────────
    const handleResend = useCallback(async () => {
        if (!canResend || !phoneNumber) return;
        try {
            await authService.requestOTP({ phoneNumber });
            setTimer(RESEND_TIMEOUT);
            setCanResend(false);
        } catch {
            Alert.alert('Error', 'Could not resend OTP. Please try again.');
        }
    }, [canResend, phoneNumber]);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="dark" />

            {/* ─── Header: Back arrow + Help ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color="#2F2F2F" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.helpButton} onPress={() => router.push('/help-support')}>
                    <Ionicons name="help-circle-outline" size={15} color="#2F2F2F" />
                    <Text style={styles.helpText}>Help</Text>
                </TouchableOpacity>
            </View>

            {/* ─── Title + Phone number ─── */}
            {/* Figma: Rubik Medium 20px #777, y=164 */}
            <View style={styles.titleContainer}>
                <Text style={styles.titleText}>Enter the 4-digit OTP sent to</Text>
                <Text style={styles.phoneText}>{maskedPhone || phoneNumber}</Text>
            </View>

            {/* ─── OTP Input Boxes ─── */}
            {/* Figma: 4 boxes, 52×49 each, gap 17, at y=240 */}
            <View style={styles.otpContainer}>
                <OTPInput
                    length={4}
                    disabled={isVerifying}
                    onComplete={handleOTPComplete}
                />
            </View>

            {/* ─── Resend row ─── */}
            {/* Figma: "Didn't receive the code?" #AAAEAC + "Resend" #02743F + timer #9C9C9C */}
            <View style={styles.resendRow}>
                <View style={styles.resendLeft}>
                    <Text style={styles.resendText}>Didn't receive the code?</Text>
                    <Text style={styles.resendSpacer}>  </Text>
                    <TouchableOpacity onPress={handleResend} disabled={!canResend}>
                        <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>Resend</Text>
                    </TouchableOpacity>
                </View>
                {!canResend && <Text style={styles.timerText}>{timerLabel}</Text>}
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    /* ─── Screen ─── */
    screen: {
        flex: 1,
        backgroundColor: '#FFFFEE',
    },

    /* ─── Header: back at x=38,y=65 and Help at x=303,y=59 ─── */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 38,
        paddingTop: 20,
        paddingBottom: 10,
    },
    backButton: {
        width: 20,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    helpText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 16,
        color: '#2F2F2F',
    },

    /* ─── Title ─── */
    /* Figma: Group at x=25, y=164, Rubik Medium 20px #777 */
    titleContainer: {
        paddingHorizontal: 25,
        paddingTop: 60,
        marginBottom: 30,
    },
    titleText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 20,
        lineHeight: 28,
        color: '#777777',
        letterSpacing: -0.24,
    },
    phoneText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 20,
        lineHeight: 28,
        color: '#777777',
        letterSpacing: -0.24,
        marginTop: 7,
    },

    /* ─── OTP boxes ─── */
    otpContainer: {
        paddingHorizontal: 35,
        marginBottom: 25,
    },

    /* ─── Resend row ─── */
    /* Figma: x=35, y=320 */
    resendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 35,
    },
    resendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resendText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 14,
        color: '#AAAEAC',
        letterSpacing: -0.24,
    },
    resendSpacer: {
        fontSize: 14,
    },
    resendLink: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 14,
        color: '#02743F',
        letterSpacing: -0.24,
    },
    resendLinkDisabled: {
        color: '#AAAEAC',
    },
    timerText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 14,
        color: '#9C9C9C',
        letterSpacing: -0.24,
    },
});

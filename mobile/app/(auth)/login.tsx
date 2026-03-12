// Login Screen — Mobile OTP + Social Login (no password)
// Flow: Enter mobile → Request OTP → Inline OTP boxes → Login → Home
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    Image,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OTPInput } from '@/components/common';
import { Colors, Fonts, FontSize, Radius } from '@/constants/theme';
import { authService, ApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// Figma-exported assets
const logoImage = require('@/assets/images/2549b5ede370bbb67a088920cac9a8719fec5968.png');

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();

    // ─── State ───
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Animation for OTP section reveal
    const [otpAnim] = useState(new Animated.Value(0));

    // ─── OTP Timer ───
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (otpSent && timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        setCanResend(true);
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [otpSent, timer]);

    // ─── Handlers ───
    const handleRequestOTP = useCallback(async () => {
        if (phoneNumber.length < 10) return;

        setIsLoading(true);
        try {
            const formattedPhone = `+91${phoneNumber}`;
            await authService.requestOTP({ phoneNumber: formattedPhone });

            setOtpSent(true);
            setTimer(30);
            setCanResend(false);

            // Animate OTP section in
            Animated.timing(otpAnim, {
                toValue: 1,
                duration: 350,
                useNativeDriver: false,
            }).start();
        } catch (error) {
            const apiError = error as ApiError;
            Alert.alert('Error', apiError.message || 'Failed to request OTP');
        } finally {
            setIsLoading(false);
        }
    }, [phoneNumber, otpAnim]);

    const handleResendOTP = useCallback(async () => {
        setIsLoading(true);
        try {
            const formattedPhone = `+91${phoneNumber}`;
            await authService.requestOTP({ phoneNumber: formattedPhone });
            setTimer(30);
            setCanResend(false);
            Alert.alert('Success', 'OTP resent successfully');
        } catch (error) {
            const apiError = error as ApiError;
            Alert.alert('Error', apiError.message || 'Failed to resend OTP');
        } finally {
            setIsLoading(false);
        }
    }, [phoneNumber]);

    const handleLogin = useCallback(async () => {
        if (otpValue.length === 4) { // Reverting to 4 digits as per UI requirement
            setIsLoading(true);
            Keyboard.dismiss();

            try {
                const formattedPhone = `+91${phoneNumber}`;
                const response = await authService.verifyOTP({
                    phoneNumber: formattedPhone,
                    otp: otpValue
                });

                if (response.data?.isNewUser) {
                    // Route to profile setup for new users
                    router.replace({
                        pathname: '/(auth)/profile-setup',
                        params: { phone: formattedPhone }
                    });
                } else if (response.data?.accessToken && response.data?.refreshToken && response.data?.user) {
                    // Existing user - Persist tokens to secure storage and global state
                    await login(
                        response.data.accessToken,
                        response.data.refreshToken,
                        response.data.user.id
                    );

                    // Route directly to tabs (wipes auth sequence from history)
                    router.replace('/(tabs)');
                } else {
                    throw new Error("Invalid response from server");
                }
            } catch (error) {
                const apiError = error as ApiError;
                Alert.alert('Error', apiError.message || 'Invalid or expired OTP');
            } finally {
                setIsLoading(false);
            }
        } else {
            Alert.alert('Invalid OTP', 'Please enter a valid 4-digit OTP.');
        }
    }, [otpValue, phoneNumber, router]);

    const handleOTPComplete = useCallback((otp: string) => {
        setOtpValue(otp);
        // We do not auto-login to let user press the button safely, 
        // or we can call handleLogin via an effect, but explicit press is better for complex async.
    }, []);

    const formatTimer = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ─── Help Link (top-right) ─── */}
                    <View style={styles.helpRow}>
                        <TouchableOpacity style={styles.helpButton} onPress={() => router.push('/help-support')}>
                            <Ionicons name="help-circle-outline" size={16} color="#2F2F2F" />
                            <Text style={styles.helpText}>Help</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─── Oldful Logo ─── */}
                    <View style={styles.logoContainer}>
                        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
                    </View>

                    {/* ─── Welcome Text ─── */}
                    <Text style={styles.welcomeText}>Welcome Back! Please login</Text>

                    {/* ─── Phone Number Input ─── */}
                    <View style={styles.inputField}>
                        <Text style={styles.countryCode}>+91</Text>
                        <View style={styles.inputDivider} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Mobile Number"
                            placeholderTextColor="#999999"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                        />
                    </View>

                    {/* ─── Request OTP Button ─── */}
                    <TouchableOpacity
                        style={[
                            styles.requestOtpButton,
                            (phoneNumber.length < 10 || isLoading) && styles.requestOtpButtonDisabled,
                        ]}
                        activeOpacity={0.8}
                        onPress={handleRequestOTP}
                        disabled={phoneNumber.length < 10 || isLoading}
                    >
                        <Text style={styles.requestOtpButtonText}>
                            {isLoading && !otpSent ? 'Requesting...' : otpSent ? 'Resend OTP' : 'Request OTP'}
                        </Text>
                    </TouchableOpacity>

                    {/* ─── Inline OTP Section (animated reveal) ─── */}
                    {otpSent && (
                        <Animated.View
                            style={[
                                styles.otpSection,
                                {
                                    opacity: otpAnim,
                                    maxHeight: otpAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, 250],
                                    }),
                                },
                            ]}
                        >
                            <Text style={styles.otpLabel}>Enter your OTP</Text>

                            {/* OTP Boxes */}
                            <View style={styles.otpContainer}>
                                <OTPInput
                                    length={4}
                                    onComplete={handleOTPComplete}
                                />
                            </View>

                            {/* Resend Row */}
                            <View style={styles.resendRow}>
                                <View style={styles.resendLeft}>
                                    <Text style={styles.resendText}>Didn't receive the code?</Text>
                                    {canResend ? (
                                        <TouchableOpacity onPress={handleResendOTP}>
                                            <Text style={styles.resendLink}> Resend</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                                {!canResend && (
                                    <Text style={styles.timerText}>{formatTimer(timer)}</Text>
                                )}
                            </View>

                            {/* LOGIN Button */}
                            <TouchableOpacity
                                style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
                                activeOpacity={0.8}
                                onPress={handleLogin}
                                disabled={isLoading}
                            >
                                <Text style={styles.loginButtonText}>{isLoading ? 'VERIFYING...' : 'LOGIN'}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* ─── OR Divider ─── */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <View style={styles.dividerTextContainer}>
                            <Text style={styles.dividerText}>OR</Text>
                        </View>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* ─── Social Login Buttons ─── */}
                    <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                        <Text style={styles.googleIcon}>G</Text>
                        <Text style={styles.socialButtonText}>Continue with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                        <Ionicons name="logo-apple" size={20} color="#000000" />
                        <Text style={styles.socialButtonText}>Continue with Apple</Text>
                    </TouchableOpacity>

                    {/* ─── Sign Up Link ─── */}
                    <View style={styles.signupRow}>
                        <Text style={styles.signupText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/profile-setup')}>
                            <Text style={styles.signupLink}>Signup</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    /* ─── Screen ─── */
    screen: {
        flex: 1,
        backgroundColor: '#FFFFEE',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingBottom: 40,
    },

    /* ─── Help Row ─── */
    helpRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 10,
        marginBottom: 10,
    },
    helpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    helpText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#2F2F2F',
    },

    /* ─── Logo ─── */
    logoContainer: {
        marginTop: 20,
        marginBottom: 16,
        alignItems: 'center',
    },
    logo: {
        width: 200,
        height: 84,
    },

    /* ─── Welcome Text ─── */
    welcomeText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.primary,
        textAlign: 'center',
        marginBottom: 28,
    },

    /* ─── Phone Input ─── */
    inputField: {
        width: '100%',
        height: 55,
        borderWidth: 1,
        borderColor: Colors.primaryDark,
        borderRadius: Radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    countryCode: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: '#2F2F2F',
        marginRight: 8,
    },
    inputDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#D0D0D0',
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: '#2F2F2F',
        height: '100%',
    },

    /* ─── Request OTP Button ─── */
    requestOtpButton: {
        width: '100%',
        height: 50,
        borderRadius: Radius.md,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: Colors.primaryDark,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    requestOtpButtonDisabled: {
        opacity: 0.5,
    },
    requestOtpButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button,
        color: '#2F2F2F',
    },

    /* ─── OTP Section ─── */
    otpSection: {
        width: '100%',
        overflow: 'hidden',
        marginBottom: 12,
    },
    otpLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: '#777777',
        marginBottom: 12,
    },
    otpContainer: {
        alignItems: 'flex-start',
        marginBottom: 14,
    },

    /* ─── Resend Row ─── */
    resendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    resendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resendText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textLight,
    },
    resendLink: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.primaryDark,
    },
    timerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: '#9C9C9C',
    },

    /* ─── LOGIN Button ─── */
    loginButton: {
        width: '100%',
        height: 55,
        borderRadius: 27.5,
        backgroundColor: Colors.primary,
        borderWidth: 1,
        borderColor: Colors.primaryDark,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    loginButtonText: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
    },

    /* ─── OR Divider ─── */
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
        marginBottom: 20,
        marginTop: 4,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#1E1E1E',
        opacity: 0.15,
    },
    dividerTextContainer: {
        backgroundColor: '#FFFFEE',
        paddingHorizontal: 12,
    },
    dividerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: '#1E1E1E',
        opacity: 0.5,
        textAlign: 'center',
    },

    /* ─── Social Login ─── */
    socialButton: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    googleIcon: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#4285F4',
    },
    socialButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: '#2F2F2F',
    },

    /* ─── Sign Up ─── */
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    signupText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: '#545454',
    },
    signupLink: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
    },
});

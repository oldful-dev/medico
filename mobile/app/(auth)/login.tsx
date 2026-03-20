// Login Screen — Mobile OTP + Social Login (no password)
// Flow: Enter mobile → Request OTP → Inline OTP boxes → Login → Home
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { OTPInput } from '@/components/common';
import { Colors, Fonts, FontSize, Radius } from '@/constants/theme';
import { authService, ApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
WebBrowser.maybeCompleteAuthSession();

// Figma-exported assets
const logoImage = require('@/assets/images/2549b5ede370bbb67a088920cac9a8719fec5968.png');

// Google OAuth config
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

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
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const isVerifyingRef = useRef(false);

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

    const handleOTPComplete = useCallback(async (otp: string) => {
        setOtpValue(otp);
        // Auto-trigger login as soon as all 4 digits are filled
        if (otp.length === 4 && !isVerifyingRef.current) {
            isVerifyingRef.current = true;
            setIsLoading(true);
            Keyboard.dismiss();

            try {
                const formattedPhone = `+91${phoneNumber}`;
                const response = await authService.verifyOTP({
                    phoneNumber: formattedPhone,
                    otp,
                });

                if (response.data?.isNewUser) {
                    router.replace({
                        pathname: '/(auth)/profile-setup',
                        params: { phone: formattedPhone },
                    });
                } else if (response.data?.accessToken && response.data?.refreshToken && response.data?.user) {
                    await login(
                        response.data.accessToken,
                        response.data.refreshToken,
                        response.data.user.id,
                    );
                    router.replace('/(tabs)');
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (error) {
                const apiError = error as ApiError;
                Alert.alert('Error', apiError.message || 'Invalid or expired OTP');
            } finally {
                setIsLoading(false);
                isVerifyingRef.current = false;
            }
        }
    }, [phoneNumber, router, login]);

    // ─── Google Sign-In ───
    const handleGoogleSignIn = useCallback(async () => {
        if (isGoogleLoading) return;
        setIsGoogleLoading(true);
        try {
            // Use Firebase Auth's Google provider via expo-auth-session
            const redirectUri = AuthSession.makeRedirectUri({ scheme: 'oldful' });
            const discovery = {
                authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenEndpoint: 'https://oauth2.googleapis.com/token',
            };

            const request = new AuthSession.AuthRequest({
                clientId: GOOGLE_CLIENT_ID,
                redirectUri,
                scopes: ['openid', 'profile', 'email'],
                responseType: AuthSession.ResponseType.IdToken,
                extraParams: { nonce: Math.random().toString(36).substring(2) },
            });

            const result = await request.promptAsync(discovery);

            if (result.type !== 'success' || !result.params?.id_token) {
                if (result.type !== 'dismiss') {
                    Alert.alert('Google Sign-In', 'Sign-in was cancelled or failed.');
                }
                return;
            }

            const idToken = result.params.id_token;

            // Decode basic info from the JWT payload (for display/backend)
            const payloadBase64 = idToken.split('.')[1];
            const payload = JSON.parse(atob(payloadBase64));

            // Send to backend
            const response = await authService.googleSignIn({
                idToken,
                email: payload.email,
                name: payload.name,
                photoUrl: payload.picture,
            });

            if (response.data?.isNewUser) {
                router.replace({
                    pathname: '/(auth)/profile-setup',
                    params: {
                        googleEmail: response.data.email || '',
                        googleName: response.data.name || '',
                        googlePhoto: response.data.photoUrl || '',
                    },
                });
            } else if (response.data?.accessToken && response.data?.refreshToken && response.data?.user) {
                await login(
                    response.data.accessToken,
                    response.data.refreshToken,
                    response.data.user.id,
                );
                router.replace('/(tabs)');
            } else {
                Alert.alert('Error', 'Google sign-in failed. Please try again.');
            }
        } catch (error) {
            console.error('Google sign-in error:', error);
            Alert.alert('Error', 'Google sign-in failed. Please try again.');
        } finally {
            setIsGoogleLoading(false);
        }
    }, [isGoogleLoading, router, login]);

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

                            {/* Auto-verifying indicator */}
                            {isLoading && (
                                <View style={styles.verifyingRow}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                    <Text style={styles.verifyingText}>Verifying...</Text>
                                </View>
                            )}
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
                    <TouchableOpacity
                        style={[styles.socialButton, isGoogleLoading && { opacity: 0.6 }]}
                        activeOpacity={0.7}
                        onPress={handleGoogleSignIn}
                        disabled={isGoogleLoading}
                    >
                        {isGoogleLoading ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <>
                                <Text style={styles.googleIcon}>G</Text>
                                <Text style={styles.socialButtonText}>Continue with Google</Text>
                            </>
                        )}
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

    /* ─── Verifying indicator ─── */
    verifyingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 8,
        paddingVertical: 12,
    },
    verifyingText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.primary,
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

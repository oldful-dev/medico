// Login Screen — Mobile OTP + Social Login (no password)
// Flow: Enter mobile → Request OTP → Inline OTP boxes → Login → Home
import React, { useState, useEffect, useCallback, useRef, type Ref } from 'react';
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
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { OTPInput, GoogleIcon, type OTPInputRef } from '@/components/common';
import { Colors, Fonts, FontSize, Radius } from '@/constants/theme';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { authService, ApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '351969749690-lgbb5emsvvjsmtegnf44vvebd7lcna1k.apps.googleusercontent.com';

GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
});

// Figma-exported assets
const logoImage = require('@/assets/images/nameandlogo.png');

export default function LoginScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { login } = useAuth();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(colors, isDarkMode);

    // ─── State ───
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const isVerifyingRef = useRef(false);
    const otpRef = useRef<OTPInputRef>(null);


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
                otpRef.current?.clear();
            } finally {
                setIsLoading(false);
                isVerifyingRef.current = false;
            }
        }
    }, [phoneNumber, router, login]);

    // ─── Google Sign-In (native SDK — requires dev build or production APK) ───
    const handleGoogleSignIn = useCallback(async () => {
        if (isGoogleLoading) return;
        setIsGoogleLoading(true);
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            // Sign out first so the account picker always appears
            await GoogleSignin.signOut().catch(() => {});
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken;
            const user = userInfo.data?.user;

            if (!idToken || !user) {
                Alert.alert('Error', 'Google sign-in failed — no token received.');
                return;
            }

            // Get accessToken for backend userinfo verification fallback
            const tokens = await GoogleSignin.getTokens();

            const response = await authService.googleSignIn({
                idToken,
                email: user.email,
                name: user.name ?? '',
                photoUrl: user.photo ?? '',
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
                await login(response.data.accessToken, response.data.refreshToken, response.data.user.id);
                router.replace('/(tabs)');
            } else {
                Alert.alert('Error', 'Google sign-in failed. Please try again.');
            }
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // user cancelled — silent
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // already in progress — silent
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Google Play Services not available or outdated.');
            } else {
                console.error('Google sign-in error:', JSON.stringify(error, null, 2));

                let errorMessage = 'Google sign-in failed. Please try again.';

                // DEVELOPER_ERROR common instructions
                if (error.message?.includes('DEVELOPER_ERROR')) {
                    errorMessage = 'Configuration Error (DEVELOPER_ERROR).\n\nThis usually means:\n1. Your SHA-1 fingerprint is not registered in Google Cloud/Firebase console.\n2. The package name (com.ayuxacare.app) mismatch.\n3. The Web Client ID is incorrect.';
                } else if (error.message?.includes('NETWORK_ERROR')) {
                    errorMessage = 'Network error. Please check your internet connection.';
                }

                Alert.alert('Login Failed', errorMessage);
            }
        } finally {
            setIsGoogleLoading(false);
        }
    }, [isGoogleLoading, login, router]);

    const formatTimer = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
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


                    {/* ─── Ayuxa Care Logo ─── */}
                    <View style={styles.logoContainer}>
                        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
                    </View>

                    {/* ─── Welcome Text ─── */}
                    <Text style={styles.welcomeText}>{t('auth.login_title')}</Text>

                    {/* ─── Phone Number Input ─── */}
                    <View style={styles.inputField}>
                        <Text style={styles.countryCode}>+91</Text>
                        <View style={styles.inputDivider} />
                        <TextInput
                            style={styles.input}
                            placeholder={t('auth.phone_placeholder')}
                            placeholderTextColor={colors.textMuted}
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
                            {isLoading && !otpSent ? 'Requesting...' : otpSent ? t('auth.resend_otp') : t('auth.send_otp')}
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
                            <Text style={styles.otpLabel}>{t('auth.enter_otp')}</Text>

                            {/* OTP Boxes */}
                            <View style={styles.otpContainer}>
                                <OTPInput
                                    otpRef={otpRef}
                                    length={4}
                                    autoFocus
                                    onComplete={handleOTPComplete}
                                />
                            </View>

                            {/* Resend Row */}
                            <View style={styles.resendRow}>
                                <View style={styles.resendLeft}>
                                    <Text style={styles.resendText}>Didn&apos;t receive the code?</Text>
                                    {canResend ? (
                                        <TouchableOpacity onPress={handleResendOTP}>
                                            <Text style={styles.resendLink}> {t('auth.resend_otp')}</Text>
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
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={styles.verifyingText}>{t('auth.verifying')}</Text>
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

                    {/* ─── Social Login Icons ─── */}
                    <View style={styles.socialButtonsRow}>
                        <TouchableOpacity
                            style={[styles.socialIconButton, isGoogleLoading && { opacity: 0.6 }]}
                            activeOpacity={0.7}
                            onPress={handleGoogleSignIn}
                            disabled={isGoogleLoading}
                        >
                            {isGoogleLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <GoogleIcon size={24} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.socialIconButton} activeOpacity={0.7}>
                            <Ionicons name="logo-apple" size={24} color={colors.textDark} />
                        </TouchableOpacity>
                    </View>

                    {/* ─── Sign Up Link ─── */}
                    <View style={styles.signupRow}>
                        <Text style={styles.signupText}>Don&apos;t have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/profile-setup')}>
                            <Text style={styles.signupLink}>SIGNUP</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    /* ─── Screen ─── */
    screen: {
        flex: 1,
        backgroundColor: isDarkMode ? colors.bgScreen : '#FFFFEE',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 40,
    },

    /* ─── Logo ─── */
    logoContainer: {
        marginTop: 20,
        marginBottom: 16,
        alignItems: 'center',
    },
    logo: {
        width: 260,
        height: 84,
    },

    /* ─── Welcome Text ─── */
    welcomeText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: colors.primary,
        textAlign: 'center',
        marginBottom: 28,
    },

    /* ─── Phone Input ─── */
    inputField: {
        width: '100%',
        height: 55,
        borderWidth: 1,
        borderColor: isDarkMode ? colors.borderLight : colors.primaryDark,
        borderRadius: Radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        marginBottom: 16,
        backgroundColor: colors.bgCard,
    },
    countryCode: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: colors.textDark,
        marginRight: 8,
    },
    inputDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.borderLight,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textDark,
        height: '100%',
    },

    /* ─── Request OTP Button ─── */
    requestOtpButton: {
        width: '100%',
        height: 50,
        borderRadius: Radius.md,
        backgroundColor: isDarkMode ? colors.bgCard : '#FFFFFF',
        borderWidth: 1.5,
        borderColor: isDarkMode ? colors.borderLight : colors.primaryDark,
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
        color: colors.textDark,
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
        color: colors.textMuted,
        marginBottom: 12,
        textAlign: 'center',
    },
    otpContainer: {
        alignItems: 'center',
        marginBottom: 14,
    },

    /* ─── Resend Row ─── */
    resendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
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
        color: colors.textLight,
    },
    resendLink: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: colors.primary,
    },
    timerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: colors.textMuted,
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
        color: colors.primary,
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
        backgroundColor: colors.textDark,
        opacity: 0.15,
    },
    dividerTextContainer: {
        backgroundColor: isDarkMode ? colors.bgScreen : '#FFFFEE',
        paddingHorizontal: 12,
    },
    dividerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: colors.textMuted,
        opacity: 0.8,
        textAlign: 'center',
    },

    /* ─── Social Login ─── */
    socialButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        marginBottom: 20,
    },
    socialIconButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: isDarkMode ? colors.bgCard : '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
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
        color: colors.textMuted,
    },
    signupLink: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.primary,
    },
});

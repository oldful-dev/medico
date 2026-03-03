// Login Screen — Pixel-matched to Figma frame "Login Screen" (4:10)
// Layout: Logo → Welcome text → Email/Password fields → Login button → Forgot → OR → Social → Sign Up
// No business logic — pure presentation
import React from 'react';
import {
    View,
    Text,
    TextInput,
    Image,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Figma-exported assets
const logoImage = require('@/assets/images/2549b5ede370bbb67a088920cac9a8719fec5968.png');

export default function LoginScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="dark" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ─── Oldful Logo ─── */}
                {/* Figma: 278×116, centered, y=188 */}
                <View style={styles.logoContainer}>
                    <Image source={logoImage} style={styles.logo} resizeMode="contain" />
                </View>

                {/* ─── Welcome Text ─── */}
                {/* Figma: Poppins Bold 24px #048357, centered at y=307 */}
                <Text style={styles.welcomeText}>Welcome back</Text>
                {/* Figma: Rubik Regular 14px #707070, centered at y=334 */}
                <Text style={styles.subtitleText}>Let's Start Now !</Text>

                {/* ─── Email Input ─── */}
                {/* Figma: 342×55, border 1px #02743F, r=10, shadow 0 4 10 rgba(0,0,0,0.25) */}
                <View style={styles.inputField}>
                    <Ionicons name="mail-outline" size={18} color="#555555" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter Mail ID"
                        placeholderTextColor="#555555"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* ─── Password Input ─── */}
                {/* Figma: same 342×55 style with lock icon + eye toggle */}
                <View style={styles.inputField}>
                    <Ionicons name="lock-closed-outline" size={18} color="#555555" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="*********"
                        placeholderTextColor="#555555"
                        secureTextEntry
                    />
                    <TouchableOpacity style={styles.eyeButton}>
                        <Ionicons name="eye-off-outline" size={19} color="#555555" />
                    </TouchableOpacity>
                </View>

                {/* ─── Login Button ─── */}
                {/* Figma: 342×55, bg #048357, border #02743F, r=27.5, "login" Lexend Deca Bold 18px white */}
                <TouchableOpacity
                    style={styles.loginButton}
                    activeOpacity={0.8}
                    onPress={() => router.push('/(auth)/otp-verification')}
                >
                    <Text style={styles.loginButtonText}>login</Text>
                </TouchableOpacity>

                {/* ─── Forgot Password ─── */}
                {/* Figma: Lexend Deca Medium 13px #1E1E1E, centered */}
                <TouchableOpacity style={styles.forgotContainer}>
                    <Text style={styles.forgotText}>Forgot Password ?</Text>
                </TouchableOpacity>

                {/* ─── OR Divider ─── */}
                {/* Figma: line + "OR" Work Sans Regular 12px #1E1E1E 50% opacity, bg #FFFFE3 */}
                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <View style={styles.dividerTextContainer}>
                        <Text style={styles.dividerText}>OR</Text>
                    </View>
                    <View style={styles.dividerLine} />
                </View>

                {/* ─── Social Login Buttons ─── */}
                {/* Figma: two 56×55 circles (Google + Apple), gap between */}
                <View style={styles.socialRow}>
                    <TouchableOpacity style={styles.socialButton}>
                        <Text style={styles.socialIcon}>G</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton}>
                        <Ionicons name="logo-apple" size={27} color="#000000" />
                    </TouchableOpacity>
                </View>

                {/* ─── Sign Up Link ─── */}
                {/* Figma: Mulish Bold 14px #545454 + Mulish ExtraBold #048357 */}
                <View style={styles.signupRow}>
                    <Text style={styles.signupText}>Don't have an Account? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/profile-setup')}>
                        <Text style={styles.signupLink}>SIGN UP</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    /* ─── Screen ─── */
    screen: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 232, 1)',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: 23,
        paddingBottom: 40,
    },

    /* ─── Logo ─── */
    /* Figma: 278×116, centered, y=188 */
    logoContainer: {
        marginTop: 80,
        marginBottom: 12,
        alignItems: 'center',
    },
    logo: {
        width: 278,
        height: 116,
    },

    /* ─── Welcome Text ─── */
    /* Figma: Poppins Bold 24px #048357 */
    welcomeText: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontWeight: '700',
        fontSize: 24,
        color: '#048357',
        textAlign: 'center',
        letterSpacing: -0.24,
        marginBottom: 3,
    },
    /* Figma: Rubik Regular 14px #707070 */
    subtitleText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 14,
        color: '#707070',
        textAlign: 'center',
        letterSpacing: -0.24,
        marginBottom: 30,
    },

    /* ─── Input Fields ─── */
    /* Figma: 342×55, border 1px #02743F, r=10, shadow 0 4 10 rgba(0,0,0,0.25) */
    inputField: {
        width: 342,
        height: 55,
        borderWidth: 1,
        borderColor: '#02743F',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 22,
        backgroundColor: 'transparent',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 14,
        color: '#555555',
        height: '100%',
    },
    eyeButton: {
        padding: 4,
    },

    /* ─── Login Button ─── */
    /* Figma: 342×55, bg #048357, border #02743F, r=27.5 */
    loginButton: {
        width: 342,
        height: 55,
        borderRadius: 27.5,
        backgroundColor: '#048357',
        borderWidth: 1,
        borderColor: '#02743F',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    /* Figma: Lexend Deca Bold 18px white */
    loginButtonText: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontWeight: '700',
        fontSize: 18,
        color: '#FFFFFF',
        letterSpacing: -0.24,
    },

    /* ─── Forgot Password ─── */
    /* Figma: Lexend Deca Medium 13px #1E1E1E */
    forgotContainer: {
        marginBottom: 20,
    },
    forgotText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 13,
        color: '#1E1E1E',
        textAlign: 'center',
    },

    /* ─── OR Divider ─── */
    /* Figma: line + "OR" Work Sans Regular 12px #1E1E1E 50% opacity, bg #FFFFE3 */
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 314,
        marginBottom: 22,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#1E1E1E',
        opacity: 0.2,
    },
    dividerTextContainer: {
        backgroundColor: '#FFFFE3',
        paddingHorizontal: 10,
    },
    dividerText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 12,
        color: '#1E1E1E',
        opacity: 0.5,
        textAlign: 'center',
    },

    /* ─── Social Login ─── */
    /* Figma: two 56×55 circles, gap ~26px */
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 26,
        marginBottom: 30,
    },
    socialButton: {
        width: 56,
        height: 55,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    socialIcon: {
        fontSize: 22,
        fontWeight: '700',
        color: '#4285F4',
    },

    /* ─── Sign Up ─── */
    /* Figma: Mulish Bold 14px #545454 + Mulish ExtraBold #048357 */
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupText: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontWeight: '700',
        fontSize: 14,
        color: '#545454',
    },
    signupLink: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontWeight: '800',
        fontSize: 14,
        color: '#048357',
    },
});

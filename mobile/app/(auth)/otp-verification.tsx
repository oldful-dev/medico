// OTP Verification Screen — Pixel-matched to Figma frame "OTP Verifiication" (4:4)
// Layout: Back arrow + Help header, title/phone, OTP boxes, resend row
// No business logic — pure presentation
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OTPInput } from '@/components/common';

export default function OtpVerificationScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="dark" />

            {/* ─── Header: Back arrow + Help ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color="#2F2F2F" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.helpButton}>
                    <Ionicons name="help-circle-outline" size={15} color="#2F2F2F" />
                    <Text style={styles.helpText}>Help</Text>
                </TouchableOpacity>
            </View>

            {/* ─── Title + Phone number ─── */}
            {/* Figma: Rubik Medium 20px #777, y=164 */}
            <View style={styles.titleContainer}>
                <Text style={styles.titleText}>Enter the 4-digit OTP sent to</Text>
                <Text style={styles.phoneText}>+91 9881***5562</Text>
            </View>

            {/* ─── OTP Input Boxes ─── */}
            {/* Figma: 4 boxes, 52×49 each, gap 17, at y=240 */}
            <View style={styles.otpContainer}>
                <OTPInput
                    length={4}
                    onComplete={(otp) => {
                        console.log('OTP Entered:', otp);
                        router.replace('/(tabs)');
                    }}
                />
            </View>

            {/* ─── Resend row ─── */}
            {/* Figma: "Didn't receive the code?" #AAAEAC + "Resend" #02743F + "00:29" #9C9C9C */}
            <View style={styles.resendRow}>
                <View style={styles.resendLeft}>
                    <Text style={styles.resendText}>Didn't receive the code?</Text>
                    <Text style={styles.resendSpacer}>  </Text>
                    <TouchableOpacity>
                        <Text style={styles.resendLink}>Resend</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.timerText}>00:29</Text>
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
    timerText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 14,
        color: '#9C9C9C',
        letterSpacing: -0.24,
    },
});

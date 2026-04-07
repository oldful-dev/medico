import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

export default function PaymentSuccessScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams<{
        invoiceNumber?: string;
        invoicePdfUrl?: string;
        bookingId?: string;
        amount?: string;
    }>();

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <StatusBar style="dark" />

            <View style={styles.container}>
                {/* Success icon */}
                <View style={styles.iconCircle}>
                    <Ionicons name="checkmark" size={52} color="#fff" />
                </View>

                <Text style={styles.title}>Payment Successful!</Text>
                <Text style={styles.subtitle}>
                    Your booking is confirmed. Our team will contact you shortly.
                </Text>

                {params.amount ? (
                    <View style={styles.amountBadge}>
                        <Text style={styles.amountText}>₹{parseFloat(params.amount).toLocaleString('en-IN')} paid</Text>
                    </View>
                ) : null}

                {params.invoiceNumber ? (
                    <Text style={styles.invoiceText}>Invoice: {params.invoiceNumber}</Text>
                ) : null}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        A receipt has been sent to your registered email and WhatsApp.
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => router.replace('/(tabs)')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryBtnText}>Go to Home</Text>
                </TouchableOpacity>

                {params.bookingId ? (
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => router.replace({ pathname: '/service-confirmation', params: { bookingId: params.bookingId } })}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryBtnText}>View Booking Details</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#fff' },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    iconCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.lg,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    title: {
        fontFamily: Fonts.semiBold,
        fontSize: 24,
        color: Colors.textDark,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textLight,
        textAlign: 'center',
        lineHeight: 22,
    },
    amountBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full ?? 999,
        marginTop: Spacing.sm,
    },
    amountText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#2e7d32',
    },
    invoiceText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.small ?? 13,
        color: Colors.textLight,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#F0FAF4',
        padding: Spacing.md,
        borderRadius: Radius.md,
        marginTop: Spacing.sm,
    },
    infoText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.small ?? 13,
        color: Colors.textDark,
        lineHeight: 20,
    },
    primaryBtn: {
        width: '100%',
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: Radius.lg ?? 12,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    primaryBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#fff',
    },
    secondaryBtn: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: Radius.lg ?? 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    secondaryBtnText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.primary,
    },
});

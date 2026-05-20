import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function PaymentSuccessScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        invoiceNumber?: string;
        invoicePdfUrl?: string;
        bookingId?: string;
        amount?: string;
        isSubscription?: string;
        bookingPayload?: string;
        bookingAmount?: string;
        bookingLabel?: string;
    }>();

    const isSubscriptionSuccess = params.isSubscription === '1';

    const handlePrimaryAction = () => {
        if (isSubscriptionSuccess && params.bookingPayload) {
            // Restore checkout context and apply discount
            router.replace({
                pathname: '/payment/checkout',
                params: {
                    bookingPayload: params.bookingPayload,
                    amount: params.bookingAmount || '',
                    label: params.bookingLabel || '',
                    skipUpsell: '1',
                }
            });
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <StatusBar style="dark" />

            <View style={styles.container}>
                {/* Success icon */}
                <View style={[styles.iconCircle, isSubscriptionSuccess && styles.subSuccessIcon]}>
                    <Ionicons name={isSubscriptionSuccess ? "sparkles" : "checkmark"} size={52} color="#fff" />
                </View>

                <Text style={styles.title}>
                    {isSubscriptionSuccess ? 'Upgrade Successful!' : 'Payment Successful!'}
                </Text>
                <Text style={styles.subtitle}>
                    {isSubscriptionSuccess 
                        ? 'Welcome to the Homemaker Plan. Your exclusive membership benefits are now active.'
                        : 'Your booking is confirmed. Our team will contact you shortly.'
                    }
                </Text>

                {params.amount && !isSubscriptionSuccess ? (
                    <View style={styles.amountBadge}>
                        <Text style={styles.amountText}>₹{parseFloat(params.amount).toLocaleString('en-IN')} paid</Text>
                    </View>
                ) : null}

                {isSubscriptionSuccess && (
                    <View style={styles.benefitsCard}>
                        <Text style={styles.benefitsTitle}>Active Plan Benefits</Text>
                        
                        <View style={styles.benefitRow}>
                            <View style={styles.benefitIconContainer}>
                                <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />
                            </View>
                            <View style={styles.benefitTextContainer}>
                                <Text style={styles.benefitName}>Booking Fee Waiver</Text>
                                <Text style={styles.benefitDesc}>₹0 on all service bookings</Text>
                            </View>
                        </View>

                        <View style={styles.benefitRow}>
                            <View style={styles.benefitIconContainer}>
                                <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />
                            </View>
                            <View style={styles.benefitTextContainer}>
                                <Text style={styles.benefitName}>On-Site Supervision</Text>
                                <Text style={styles.benefitDesc}>Ayuxa supervisor present for support</Text>
                            </View>
                        </View>

                        <View style={styles.benefitRow}>
                            <View style={styles.benefitIconContainer}>
                                <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />
                            </View>
                            <View style={styles.benefitTextContainer}>
                                <Text style={styles.benefitName}>Unlimited Bill Payments</Text>
                                <Text style={styles.benefitDesc}>Electricity, water, utilities managed free</Text>
                            </View>
                        </View>

                        <View style={styles.benefitRow}>
                            <View style={styles.benefitIconContainer}>
                                <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />
                            </View>
                            <View style={styles.benefitTextContainer}>
                                <Text style={styles.benefitName}>Monthly Home Audits</Text>
                                <Text style={styles.benefitDesc}>Complimentary checks for safety and peace of mind</Text>
                            </View>
                        </View>
                    </View>
                )}

                {params.invoiceNumber ? (
                    <Text style={styles.invoiceText}>Invoice: {params.invoiceNumber}</Text>
                ) : null}

                {!isSubscriptionSuccess && (
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
                        <Text style={styles.infoText}>
                            A receipt has been sent to your registered email and WhatsApp.
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.primaryBtn, isSubscriptionSuccess && styles.subPrimaryBtn]}
                    onPress={handlePrimaryAction}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryBtnText}>
                        {isSubscriptionSuccess && params.bookingPayload ? 'Proceed to Booking' : 'Go to Home'}
                    </Text>
                </TouchableOpacity>

                {params.bookingId && !isSubscriptionSuccess ? (
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
        marginBottom: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    subSuccessIcon: {
        backgroundColor: '#D4AF37', // Gold color for premium plan upgrade success
        shadowColor: '#D4AF37',
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
    benefitsCard: {
        width: '100%',
        backgroundColor: '#F9F9F9',
        borderRadius: Radius.lg ?? 12,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        marginTop: Spacing.sm,
        gap: Spacing.md,
    },
    benefitsTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: Spacing.xs,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    benefitIconContainer: {
        marginTop: 2,
    },
    benefitTextContainer: {
        flex: 1,
    },
    benefitName: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption ?? 13,
        color: Colors.textDark,
    },
    benefitDesc: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textLight,
        marginTop: 1,
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
        marginTop: Spacing.md,
    },
    subPrimaryBtn: {
        backgroundColor: '#2e7d32', // Green button indicating successful membership flow completion
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

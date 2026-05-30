import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

export default function PaymentSuccessScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const params = useLocalSearchParams<{
        invoiceNumber?: string;
        invoicePdfUrl?: string;
        bookingId?: string;
        amount?: string;
        isSubscription?: string;
        bookingPayload?: string;
        bookingAmount?: string;
        bookingLabel?: string;
        checkoutRoute?: string;
        category?: string;
    }>();

    const isSubscriptionSuccess = params.isSubscription === '1';

    const handlePrimaryAction = () => {
        if (isSubscriptionSuccess && params.bookingPayload) {
            const targetRoute = params.checkoutRoute || '/payment/checkout';
            // Restore checkout context and apply discount
            router.replace({
                pathname: targetRoute as any,
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
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <View style={styles.container}>
                {/* Success icon */}
                <View style={[styles.iconCircle, isSubscriptionSuccess && styles.subSuccessIcon]}>
                    <Ionicons name={isSubscriptionSuccess ? "sparkles" : "checkmark"} size={52} color="#fff" />
                </View>

                <Text style={styles.title}>
                    {isSubscriptionSuccess ? t('payment_success.upgrade_success_title') : t('payment_success.payment_success_title')}
                </Text>
                <Text style={styles.subtitle}>
                    {isSubscriptionSuccess 
                        ? t('payment_success.upgrade_success_subtitle')
                        : t('payment_success.payment_success_subtitle')
                    }
                </Text>

                {params.amount && !isSubscriptionSuccess ? (
                    <View style={styles.amountBadge}>
                        <Text style={styles.amountText}>{t('payment_success.amount_paid', { amount: parseFloat(params.amount).toLocaleString('en-IN') })}</Text>
                    </View>
                ) : null}

                {isSubscriptionSuccess && (
                    <View style={styles.benefitsCard}>
                        <Text style={styles.benefitsTitle}>{t('payment_success.active_plan_benefits')}</Text>
                        
                        <View style={styles.benefitRow}>
                            <View style={styles.benefitIconContainer}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.benefitTextContainer}>
                                <Text style={styles.benefitName}>{t('payment_success.benefit_booking_fee_name')}</Text>
                                <Text style={styles.benefitDesc}>{t('payment_success.benefit_booking_fee_desc')}</Text>
                            </View>
                        </View>

                        <View style={styles.benefitRow}>
                            <View style={styles.benefitIconContainer}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.benefitTextContainer}>
                                <Text style={styles.benefitName}>{t('payment_success.benefit_supervision_name')}</Text>
                                <Text style={styles.benefitDesc}>{t('payment_success.benefit_supervision_desc')}</Text>
                            </View>
                        </View>

                        <View style={styles.benefitRow}>
                            <View style={styles.benefitIconContainer}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.benefitTextContainer}>
                                <Text style={styles.benefitName}>{t('payment_success.benefit_bill_name')}</Text>
                                <Text style={styles.benefitDesc}>{t('payment_success.benefit_bill_desc')}</Text>
                            </View>
                        </View>

                        <View style={styles.benefitRow}>
                            <View style={styles.benefitIconContainer}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.benefitTextContainer}>
                                <Text style={styles.benefitName}>{t('payment_success.benefit_audit_name')}</Text>
                                <Text style={styles.benefitDesc}>{t('payment_success.benefit_audit_desc')}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {params.invoiceNumber ? (
                    <Text style={styles.invoiceText}>{t('payment_success.invoice_label', { number: params.invoiceNumber })}</Text>
                ) : null}

                {!isSubscriptionSuccess && (
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>
                            {t('payment_success.receipt_sent')}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.primaryBtn, isSubscriptionSuccess && styles.subPrimaryBtn]}
                    onPress={handlePrimaryAction}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryBtnText}>
                        {isSubscriptionSuccess && params.bookingPayload ? t('payment_success.proceed_booking') : t('payment_success.go_home')}
                    </Text>
                </TouchableOpacity>

                {params.bookingId && !isSubscriptionSuccess ? (
                    <>
                        {params.category === 'wellness' ? (
                            <>
                                <TouchableOpacity
                                    style={styles.secondaryBtn}
                                    onPress={() => router.replace({ pathname: '/order-tracking', params: { orderId: params.bookingId } } as any)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.secondaryBtnText}>{t('payment_success.track_order') || 'Track Order'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.tertiaryBtn}
                                    onPress={() => router.replace({ pathname: '/order-history', params: { tab: 'Products' } } as any)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.tertiaryBtnText}>{t('payment_success.view_all_orders') || 'View All Orders'}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={styles.secondaryBtn}
                                    onPress={() => router.replace({ pathname: '/service-confirmation', params: { bookingId: params.bookingId } })}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.secondaryBtnText}>{t('payment_success.view_booking')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.tertiaryBtn}
                                    onPress={() => router.replace('/my-bookings')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.tertiaryBtnText}>{t('payment_success.view_all_bookings')}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </>
                ) : null}
            </View>
        </SafeAreaView>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    iconCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.md,
        shadowColor: colors.primary,
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
        color: colors.textDark,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
    amountBadge: {
        backgroundColor: isDarkMode ? 'rgba(46,125,50,0.1)' : '#E8F5E9',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full ?? 999,
        marginTop: Spacing.sm,
    },
    amountText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.primary,
    },
    benefitsCard: {
        width: '100%',
        backgroundColor: colors.bgCardMuted,
        borderRadius: Radius.lg ?? 12,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginTop: Spacing.sm,
        gap: Spacing.md,
    },
    benefitsTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.textDark,
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
        color: colors.textDark,
    },
    benefitDesc: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 1,
    },
    invoiceText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall ?? 13,
        color: colors.textMuted,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: isDarkMode ? 'rgba(46,125,50,0.1)' : '#F0FAF4',
        padding: Spacing.md,
        borderRadius: Radius.md,
        marginTop: Spacing.sm,
    },
    infoText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall ?? 13,
        color: colors.textDark,
        lineHeight: 20,
    },
    primaryBtn: {
        width: '100%',
        backgroundColor: colors.primary,
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
        borderColor: colors.primary,
    },
    secondaryBtnText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: colors.primary,
    },
    tertiaryBtn: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: Radius.lg ?? 12,
        alignItems: 'center',
        backgroundColor: colors.bgCardMuted,
    },
    tertiaryBtnText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: colors.textDark,
    },
});

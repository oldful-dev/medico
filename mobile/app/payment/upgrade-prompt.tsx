import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { paymentService } from '@/services/api/paymentService';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';

const mapLabelToCategory = (label: string): string => {
    const lower = label.toLowerCase();
    if (lower.includes('doctor') || lower.includes('consult')) return 'DOCTOR_HOME_VISIT';
    if (lower.includes('blood') || lower.includes('diagnostic') || lower.includes('test') || lower.includes('lab')) return 'BLOOD_TEST';
    if (lower.includes('nurse') || lower.includes('care')) return 'HOME_NURSE';
    if (lower.includes('plumb') || lower.includes('electr')) return 'PLUMBING_ELECTRICAL';
    if (lower.includes('hospital') || lower.includes('trip')) return 'HOSPITAL_TRIP';
    if (lower.includes('insurance')) return 'INSURANCE';
    if (lower.includes('medicine') || lower.includes('pharmacy')) return 'MEDICINES';
    if (lower.includes('physio') || lower.includes('fitness')) return 'PHYSIO_FITNESS';
    if (lower.includes('equipment') || lower.includes('rental')) return 'EQUIPMENT_RENTAL';
    if (lower.includes('meal') || lower.includes('food') || lower.includes('tiffin') || lower.includes('prep')) return 'TIFFIN';
    if (lower.includes('tech') || lower.includes('helper')) return 'TECH_HELPER';
    if (lower.includes('clean') || lower.includes('grocery') || lower.includes('shopping') || lower.includes('essential')) return 'HOME_ESSENTIALS';
    if (lower.includes('club') || lower.includes('event')) return 'CLUB_EVENTS';
    return 'OTHER';
};

export default function UpgradePromptScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const { t } = useTranslation();
    const styles = makeStyles(colors, isDarkMode);
    const params = useLocalSearchParams<{
        bookingPayload: string;
        amount: string;
        label: string;
        discount?: string;
        checkoutRoute?: string;
    }>();

    const serviceCharge = parseFloat(params.amount || '0');
    const [calcLoading, setCalcLoading] = useState(false);
    const [calculatedPrices, setCalculatedPrices] = useState<{
        totalAmount: number;
        breakdown: {
            vendorFee: number;
            diagnosticFee: number;
            bookingFee: number;
            platformFee: number;
            taxes: number;
            ayuxaServiceFee: number;
            benefitDiscount: number;
        };
    } | null>(null);

    useEffect(() => {
        const fetchCalculation = async () => {
            setCalcLoading(true);
            try {
                const category = mapLabelToCategory(params.label || 'Service Booking');
                const res = await paymentService.calculateCheckout({
                    serviceCategory: category,
                    vendorFee: serviceCharge,
                    baseAyuxaFee: 0,
                    diagnosticFee: 0
                });
                if (res.success && res.data) {
                    setCalculatedPrices(res.data);
                }
            } catch (e) {
                console.warn('Failed to calculate checkout in upgrade-prompt:', e);
            } finally {
                setCalcLoading(false);
            }
        };
        fetchCalculation();
    }, [params.amount, params.label]);

    const bookingFee = calculatedPrices ? calculatedPrices.breakdown.bookingFee : 299;
    const platformFee = calculatedPrices ? calculatedPrices.breakdown.platformFee : 50;
    const taxes = calculatedPrices ? calculatedPrices.breakdown.taxes : Math.round(serviceCharge * 0.06);
    const activeOffers = parseFloat(params.discount || '0');

    // Savings amount is booking + platform fees waivable by plan
    const planBenefitDiscount = bookingFee + platformFee;

    // Calculate total checkout price without subscription upgrade
    const totalWithoutUpgrade = serviceCharge + bookingFee + platformFee + taxes - activeOffers;

    const handleUpgrade = () => {
        router.push({
            pathname: '/(tabs)/plans',
            params: {
                bookingPayload: params.bookingPayload,
                amount: params.amount,
                label: params.label,
                checkoutRoute: params.checkoutRoute || '/payment/checkout',
            }
        });
    };

    const handleNoUpgrade = () => {
        const targetRoute = params.checkoutRoute || '/payment/checkout';
        router.push({
            pathname: targetRoute as any,
            params: {
                bookingPayload: params.bookingPayload,
                amount: params.amount,
                label: params.label,
                skipUpsell: '1'
            }
        });
    };

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: isDarkMode ? colors.bgHeader : colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={isDarkMode ? colors.bgHeader : colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite || '#FFFFFF'} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('upgrade_prompt.header_title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Upgrade Offer Card */}
                <View style={styles.promoCard}>
                    <Text style={styles.promoTitle}>{t('upgrade_prompt.smart_upgrade')}</Text>
                    <Text style={styles.promoHeading}>{t('upgrade_prompt.stop_paying_fees')}</Text>
                    <Text style={styles.promoHeading}>{t('upgrade_prompt.get_home_management')}</Text>
                    <Text style={styles.promoSub}>{t('upgrade_prompt.plan_price')}</Text>

                    {/* Comparison Table */}
                    <View style={styles.table}>
                        {/* Table Header */}
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.cell, styles.headerCell, { flex: 1.2 }]}>{t('upgrade_prompt.table_feature')}</Text>
                            <Text style={[styles.cell, styles.headerCell]}>{t('upgrade_prompt.table_pay_per_use')}</Text>
                            <Text style={[styles.cell, styles.headerCell, styles.highlightHeader]}>{t('upgrade_prompt.table_homemaker')}</Text>
                        </View>

                        {/* Booking Fee */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.cell, styles.featureName, { flex: 1.2 }]}>{t('upgrade_prompt.row_booking_fee')}</Text>
                            <Text style={styles.cell}>
                                {calcLoading ? <ActivityIndicator size="small" color={colors.textMuted} /> : t('upgrade_prompt.row_booking_fee_per_visit', { amount: bookingFee })}
                            </Text>
                            <Text style={[styles.cell, styles.highlightCell]}>{t('upgrade_prompt.row_booking_fee_plan')}</Text>
                        </View>

                        {/* Supervision */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.cell, styles.featureName, { flex: 1.2 }]}>{t('upgrade_prompt.row_supervision')}</Text>
                            <Text style={styles.cell}>{t('upgrade_prompt.row_supervision_no')}</Text>
                            <Text style={[styles.cell, styles.highlightCell]}>{t('upgrade_prompt.row_supervision_yes')}</Text>
                        </View>

                        {/* Bill Payment */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.cell, styles.featureName, { flex: 1.2 }]}>{t('upgrade_prompt.row_bill_payment')}</Text>
                            <Text style={styles.cell}>{t('upgrade_prompt.row_bill_payment_cost')}</Text>
                            <Text style={[styles.cell, styles.highlightCell]}>{t('upgrade_prompt.row_bill_payment_plan')}</Text>
                        </View>

                        {/* Proactive Checks */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.cell, styles.featureName, { flex: 1.2 }]}>{t('upgrade_prompt.row_proactive')}</Text>
                            <Text style={styles.cell}>{t('upgrade_prompt.row_proactive_no')}</Text>
                            <Text style={[styles.cell, styles.highlightCell]}>{t('upgrade_prompt.row_proactive_yes')}</Text>
                        </View>
                    </View>
                </View>

                {/* Price Summary Breakdown */}
                <View style={styles.breakdownCard}>
                    <Text style={styles.breakdownTitle}>{t('upgrade_prompt.checkout_price_summary')}</Text>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{t('upgrade_prompt.service_charge', { label: params.label || 'Service' })}</Text>
                        <Text style={styles.breakdownValue}>₹{serviceCharge.toLocaleString('en-IN')}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{t('upgrade_prompt.booking_fee')}</Text>
                        <Text style={styles.breakdownValue}>
                            {calcLoading ? <ActivityIndicator size="small" color={colors.primary} /> : `₹${bookingFee.toLocaleString('en-IN')}`}
                        </Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{t('upgrade_prompt.platform_fee')}</Text>
                        <Text style={styles.breakdownValue}>
                            {calcLoading ? <ActivityIndicator size="small" color={colors.primary} /> : `₹${platformFee.toLocaleString('en-IN')}`}
                        </Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{t('upgrade_prompt.estimated_taxes')}</Text>
                        <Text style={styles.breakdownValue}>₹{Math.round(taxes).toLocaleString('en-IN')}</Text>
                    </View>

                    {activeOffers > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, styles.greenText]}>{t('upgrade_prompt.offers_discounts')}</Text>
                            <Text style={[styles.breakdownValue, styles.greenText]}>-₹{activeOffers.toLocaleString('en-IN')}</Text>
                        </View>
                    )}

                    <View style={[styles.breakdownRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>{t('upgrade_prompt.total_without_upgrade')}</Text>
                        <Text style={styles.totalValue}>
                            {calcLoading ? <ActivityIndicator size="small" color={colors.primary} /> : `₹${Math.round(totalWithoutUpgrade).toLocaleString('en-IN')}`}
                        </Text>
                    </View>
                </View>

                {/* Bottom CTAs */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity style={styles.btnUpgrade} onPress={handleUpgrade} disabled={calcLoading}>
                        <Text style={styles.btnUpgradeText}>{t('upgrade_prompt.upgrade_now', { amount: planBenefitDiscount })}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.btnNoUpgrade} onPress={handleNoUpgrade} disabled={calcLoading}>
                        <Text style={styles.btnNoUpgradeText}>{t('upgrade_prompt.pay_without_upgrade', { amount: Math.round(totalWithoutUpgrade).toLocaleString('en-IN') })}</Text>
                    </TouchableOpacity>

                    <Text style={styles.helperText}>{t('upgrade_prompt.redirect_notice')}</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: isDarkMode ? colors.bgHeader : colors.primary,
        paddingHorizontal: Spacing.lg, paddingBottom: 20, paddingTop: 10, position: 'relative',
    },
    backBtn: { position: 'absolute', left: 20, padding: 5, zIndex: 10 },
    headerTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading2,
        color: colors.textWhite, textAlign: 'center',
    },
    scrollContent: { padding: Spacing.lg, paddingBottom: 40 },

    promoCard: {
        backgroundColor: isDarkMode ? 'rgba(2, 116, 63, 0.15)' : '#E8F5E9',
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(2, 116, 63, 0.3)' : '#C8E6C9',
        ...Shadow.card,
    },
    promoTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading1,
        color: colors.primary, marginBottom: 8,
    },
    promoHeading: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading2,
        color: colors.textDark, lineHeight: 24,
    },
    promoSub: {
        fontFamily: Fonts.medium, fontSize: FontSize.caption,
        color: colors.textMuted, marginTop: 12, marginBottom: 16,
    },

    // Table styles
    table: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: isDarkMode ? colors.bgScreen : '#F9FAFB',
    },
    cell: {
        flex: 1,
        padding: 10,
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: colors.textMuted,
        textAlign: 'center',
    },
    featureName: {
        fontFamily: Fonts.medium,
        color: colors.textDark,
        textAlign: 'left',
    },
    headerCell: {
        fontFamily: Fonts.semiBold,
        color: isDarkMode ? colors.primary : '#D46A43',
    },
    highlightHeader: {
        backgroundColor: colors.primary,
        color: colors.textWhite || '#FFFFFF',
    },
    highlightCell: {
        fontFamily: Fonts.medium,
        color: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(4, 131, 87, 0.1)' : '#E8F5E9',
    },

    // Breakdown styles
    breakdownCard: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...Shadow.card,
    },
    breakdownTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.textDark,
        marginBottom: Spacing.md,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    breakdownLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: colors.textMuted,
    },
    breakdownValue: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: colors.textDark,
    },
    greenText: {
        color: colors.primary,
    },
    totalRow: {
        borderBottomWidth: 0,
        paddingTop: 12,
        marginTop: 4,
    },
    totalLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.textDark,
    },
    totalValue: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.primary,
    },

    actionContainer: {
        gap: Spacing.md,
    },
    btnUpgrade: {
        backgroundColor: colors.primary,
        borderRadius: Radius.md,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.card,
    },
    btnUpgradeText: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.body,
        color: colors.textWhite || '#FFFFFF',
    },
    btnNoUpgrade: {
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: Radius.md,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnNoUpgradeText: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.body,
        color: colors.primary,
    },
    helperText: {
        fontFamily: Fonts.regular, fontSize: FontSize.caption,
        color: colors.textMuted, textAlign: 'center', marginTop: 4,
    },
});

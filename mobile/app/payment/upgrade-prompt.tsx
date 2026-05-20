import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { paymentService } from '@/services/api/paymentService';

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
    const params = useLocalSearchParams<{
        bookingPayload: string;
        amount: string;
        label: string;
        discount?: string;
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
            }
        });
    };

    const handleNoUpgrade = () => {
        router.push({
            pathname: '/payment/checkout',
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
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout Details</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Upgrade Offer Card */}
                <View style={styles.promoCard}>
                    <Text style={styles.promoTitle}>Smart Upgrade ⚡</Text>
                    <Text style={styles.promoHeading}>Stop Paying Booking Fees.</Text>
                    <Text style={styles.promoHeading}>Get Total Home Management.</Text>
                    <Text style={styles.promoSub}>Join the ayuxacare Homemaker Plan for Just ₹3,499/month</Text>

                    {/* Comparison Table */}
                    <View style={styles.table}>
                        {/* Table Header */}
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.cell, styles.headerCell, { flex: 1.2 }]}>Feature</Text>
                            <Text style={[styles.cell, styles.headerCell]}>Pay-Per-Use</Text>
                            <Text style={[styles.cell, styles.headerCell, styles.highlightHeader]}>Homemaker Plan</Text>
                        </View>

                        {/* Booking Fee */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.cell, styles.featureName, { flex: 1.2 }]}>Booking Fee</Text>
                            <Text style={styles.cell}>
                                {calcLoading ? <ActivityIndicator size="small" color={Colors.textBody} /> : `₹${bookingFee} per visit`}
                            </Text>
                            <Text style={[styles.cell, styles.highlightCell]}>₹0 (Unlimited)</Text>
                        </View>

                        {/* Supervision */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.cell, styles.featureName, { flex: 1.2 }]}>Supervision</Text>
                            <Text style={styles.cell}>❌ No (Remote only)</Text>
                            <Text style={[styles.cell, styles.highlightCell]}>✅ On-Site Supervision (We stay while they work)</Text>
                        </View>

                        {/* Bill Payment */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.cell, styles.featureName, { flex: 1.2 }]}>Bill Payment</Text>
                            <Text style={styles.cell}>₹299 per request</Text>
                            <Text style={[styles.cell, styles.highlightCell]}>✅ Included</Text>
                        </View>

                        {/* Proactive Checks */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.cell, styles.featureName, { flex: 1.2 }]}>Proactive Checks</Text>
                            <Text style={styles.cell}>❌ None</Text>
                            <Text style={[styles.cell, styles.highlightCell]}>✅ Monthly Audit</Text>
                        </View>
                    </View>
                </View>

                {/* Price Summary Breakdown */}
                <View style={styles.breakdownCard}>
                    <Text style={styles.breakdownTitle}>Checkout Price Summary</Text>
                    
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Service Charge ({params.label || 'Service'})</Text>
                        <Text style={styles.breakdownValue}>₹{serviceCharge.toLocaleString('en-IN')}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Booking Fee</Text>
                        <Text style={styles.breakdownValue}>
                            {calcLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : `₹${bookingFee.toLocaleString('en-IN')}`}
                        </Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Platform Fee</Text>
                        <Text style={styles.breakdownValue}>
                            {calcLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : `₹${platformFee.toLocaleString('en-IN')}`}
                        </Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Estimated Taxes (GST)</Text>
                        <Text style={styles.breakdownValue}>₹{Math.round(taxes).toLocaleString('en-IN')}</Text>
                    </View>


                    {activeOffers > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, styles.greenText]}>Offers & Discounts</Text>
                            <Text style={[styles.breakdownValue, styles.greenText]}>-₹{activeOffers.toLocaleString('en-IN')}</Text>
                        </View>
                    )}

                    <View style={[styles.breakdownRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total Price (without Upgrade)</Text>
                        <Text style={styles.totalValue}>
                            {calcLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : `₹${Math.round(totalWithoutUpgrade).toLocaleString('en-IN')}`}
                        </Text>
                    </View>
                </View>

                {/* Bottom CTAs */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity style={styles.btnUpgrade} onPress={handleUpgrade} disabled={calcLoading}>
                        <Text style={styles.btnUpgradeText}>Upgrade Now & Save ₹{planBenefitDiscount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.btnNoUpgrade} onPress={handleNoUpgrade} disabled={calcLoading}>
                        <Text style={styles.btnNoUpgradeText}>Pay ₹{Math.round(totalWithoutUpgrade).toLocaleString('en-IN')} Without Upgrade</Text>
                    </TouchableOpacity>

                    <Text style={styles.helperText}>You will be redirected to secure payment</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgScreen },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg, paddingBottom: 20, paddingTop: 10, position: 'relative',
    },
    backBtn: { position: 'absolute', left: 20, padding: 5, zIndex: 10 },
    headerTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading2,
        color: Colors.textWhite, textAlign: 'center',
    },
    scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
    
    promoCard: {
        backgroundColor: '#80F9E7',
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadow.card,
    },
    promoTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading1,
        color: Colors.primary, marginBottom: 8,
    },
    promoHeading: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading2,
        color: Colors.textDark, lineHeight: 24,
    },
    promoSub: {
        fontFamily: Fonts.medium, fontSize: FontSize.caption,
        color: Colors.textBody, marginTop: 12, marginBottom: 16,
    },

    // Table styles
    table: {
        backgroundColor: '#FFFFFF',
        borderRadius: Radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#FFF0EA',
    },
    cell: {
        flex: 1,
        padding: 10,
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textBody,
        textAlign: 'center',
    },
    featureName: {
        fontFamily: Fonts.medium,
        color: Colors.textDark,
        textAlign: 'left',
    },
    headerCell: {
        fontFamily: Fonts.semiBold,
        color: '#D46A43',
    },
    highlightHeader: {
        backgroundColor: Colors.primary,
        color: Colors.textWhite,
    },
    highlightCell: {
        fontFamily: Fonts.medium,
        color: Colors.primary,
        backgroundColor: '#F0FFF8',
    },

    // Breakdown styles
    breakdownCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        ...Shadow.card,
    },
    breakdownTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: Spacing.md,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    breakdownLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textLight,
    },
    breakdownValue: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: Colors.textDark,
    },
    greenText: {
        color: '#2e7d32',
    },
    totalRow: {
        borderBottomWidth: 0,
        paddingTop: 12,
        marginTop: 4,
    },
    totalLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    totalValue: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
    },

    actionContainer: {
        gap: Spacing.md,
    },
    btnUpgrade: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.card,
    },
    btnUpgradeText: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.body,
        color: Colors.textWhite,
    },
    btnNoUpgrade: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: Radius.md,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnNoUpgradeText: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.body,
        color: Colors.primary,
    },
    helperText: {
        fontFamily: Fonts.regular, fontSize: FontSize.caption,
        color: Colors.textMuted, textAlign: 'center', marginTop: 4,
    },
});

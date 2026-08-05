import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { paymentService, type PaymentMethod } from '@/services/api/paymentService';
import { labService } from '@/services/api/labService';
import { useUser } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';
const LIGHT_GREEN_BG = '#F0FDF4';

const PAYMENT_METHODS = [
    { type: 'UPI',  label: 'UPI (GPay / PhonePe / Paytm)', icon: 'phone-portrait-outline' },
    { type: 'CARD', label: 'Credit / Debit Card',         icon: 'card-outline' },
    { type: 'CASH', label: 'Cash on Delivery',             icon: 'cash-outline' },
] as const;

export default function BloodTestOrderSummaryScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(isDarkMode, colors);
    const params = useLocalSearchParams<{
        bookingPayload?: string;
        amount?: string;
        label?: string;
        testsCount?: string;
        collectionType?: string;
    }>();

    const [isLoading, setIsLoading] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');

    let bookingData: any = null;
    try {
        if (params.bookingPayload) {
            bookingData = JSON.parse(params.bookingPayload);
        }
    } catch (e) {
        console.error('Failed to parse booking data:', e);
    }

    const baseAmount = parseFloat(params.amount || '0');
    const gst = Math.round(baseAmount * 0.18 * 100) / 100;
    const convenienceFee = 0; // Free for blood tests
    const totalAmount = Math.round((baseAmount + gst + convenienceFee - discount) * 100) / 100;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        try {
            const res = await paymentService.applyCoupon({
                couponCode: couponCode.trim(),
                amount: totalAmount,
            });
            if (res.success && res.data?.valid) {
                setDiscount(res.data.discount);
                setCouponApplied(true);
                Alert.alert(t('common.success'), t('blood_test_summary.coupon_applied_msg', { discount: res.data.discount }));
            } else {
                Alert.alert(t('blood_test_summary.invalid_title'), t('blood_test_summary.coupon_invalid_msg'));
            }
        } catch {
            Alert.alert(t('common.error'), t('blood_test_summary.coupon_error_msg'));
        }
    };

    const handlePayment = async () => {
        if (!bookingData) {
            Alert.alert(t('common.error'), t('blood_test_summary.invalid_booking_msg'));
            return;
        }

        setIsLoading(true);
        try {
            // Hold blood test booking via Redcliffe
            const finalBookingData = { ...bookingData, paymentMethod: selectedMethod };
            console.log('🩸 Order Summary: Creating blood test booking with payload:', JSON.stringify(finalBookingData, null, 2));
            const bookingRes = await labService.holdBooking(finalBookingData);
            console.log('🩸 Order Summary: Full booking response:', JSON.stringify(bookingRes, null, 2));

            if (!bookingRes) {
                console.error('🩸 Order Summary: holdBooking returned undefined');
                Alert.alert(t('common.error'), t('blood_test_summary.booking_no_response_msg'));
                return;
            }

            // The response from holdBooking is the updated labOrder object
            // which has: id, clientRefId, redcliffeBookingId, status, etc.
            const bookingId = (bookingRes as any)?.id;

            if (!bookingId) {
                console.error('🩸 Order Summary: No booking ID in response:', bookingRes);
                Alert.alert(t('common.error'), t('blood_test_summary.booking_failed_msg'));
                return;
            }

            console.log('🩸 Order Summary: Got booking ID:', bookingId);

            if (selectedMethod === 'CASH') {
                router.replace({
                    pathname: '/blood-test/success',
                    params: {
                        bookingId,
                        amount: String(totalAmount),
                        packageName: params.label,
                    },
                });
                return;
            }

            // Initiate payment for blood test (use labOrderId, not bookingId)
            const payRes = await paymentService.initiatePayment({
                labOrderId: bookingId,
                amount: totalAmount,
                paymentMethod: selectedMethod,
                couponCode: couponApplied ? couponCode : undefined,
            });

            if (!payRes.success || !payRes.data) {
                Alert.alert(t('common.error'), t('blood_test_summary.payment_initiate_failed_msg'));
                return;
            }

            const { orderId, amount: orderAmount, key: backendKey } = payRes.data as any;

            // Open Razorpay
            const options = {
                description: params.label || 'Blood Test',
                image: 'https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/onlylogo.png',
                currency: 'INR',
                key: backendKey || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
                amount: String(Math.round(orderAmount * 100)),
                name: 'Ayuxa Healthcare',
                order_id: orderId,
                prefill: {
                    name: profile?.name || '',
                    contact: profile?.phone || '',
                    email: profile?.email || '',
                    method: selectedMethod.toLowerCase(),
                },
                theme: { color: colors.primary },
                config: {
                    display: {
                        blocks: {
                            banks: {
                                name: selectedMethod === 'UPI' ? 'UPI' : 'Card',
                                instruments: [
                                    {
                                        method: selectedMethod.toLowerCase() as any,
                                    },
                                ],
                            },
                        },
                        sequence: ['block.banks'],
                        preferences: {
                            show_default_blocks: false,
                        },
                    },
                },
            };

            const data = await RazorpayCheckout.open(options);

            // Verify payment
            const verifyRes = await paymentService.verifyPayment({
                razorpayPaymentId: data.razorpay_payment_id,
                razorpayOrderId: data.razorpay_order_id,
                razorpaySignature: data.razorpay_signature,
            });

            if (verifyRes.success) {
                router.replace({
                    pathname: '/blood-test/success',
                    params: {
                        bookingId,
                        amount: String(totalAmount),
                        packageName: params.label,
                    },
                });
            } else {
                Alert.alert(t('common.error'), t('blood_test_summary.payment_verification_failed_msg'));
            }
        } catch (error: any) {
            console.error('🩸 Order Summary: Payment/Booking error:', error);
            console.error('🩸 Error details:', {
                message: error.message,
                statusCode: error.statusCode,
                details: error.details,
            });
            if (error.code !== 'E_CANCELED') {
                const errorMsg = error.details?.message || error.message || t('blood_test_summary.payment_failed_msg');
                Alert.alert(t('common.error'), errorMsg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED' }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#1A1A1A' : '#FAF7ED'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('blood_test_summary.order_summary_header')}</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Content */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* Test Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.testName}>{params.label}</Text>
                            {params.testsCount && parseInt(params.testsCount) > 0 && (
                                <Text style={styles.parametersText}>
                                    {params.testsCount} {parseInt(params.testsCount) === 1 ? t('blood_test_summary.parameter_included') : t('blood_test_summary.parameters_included')}
                                </Text>
                            )}
                        </View>
                        <View style={styles.priceTag}>
                            <Text style={styles.priceAmount}>₹{baseAmount}</Text>
                        </View>
                    </View>
                </View>

                {/* Details Card */}
                <View style={styles.card}>
                    {/* Date & Time */}
                    <View style={styles.detailRow}>
                        <View style={styles.detailIcon}>
                            <Ionicons name="calendar" size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.detailLabel}>{t('blood_test_summary.date_time')}</Text>
                            <Text style={styles.detailValue}>
                                {bookingData?.slot?.date}, {bookingData?.slot?.time}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Collection Type */}
                    <View style={styles.detailRow}>
                        <View style={styles.detailIcon}>
                            <Ionicons name={params.collectionType === 'LAB' ? 'business' : 'home'} size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.detailLabel}>{t('blood_test_summary.collection_type')}</Text>
                            <Text style={styles.detailValue}>{params.collectionType === 'LAB' ? t('blood_test_summary.lab_visit') : t('blood_test_summary.home_collection')}</Text>
                        </View>
                    </View>

                    {params.collectionType !== 'LAB' && bookingData?.address?.line1 && (
                        <>
                            <View style={styles.divider} />
                            {/* Address */}
                            <View style={styles.detailRow}>
                                <View style={styles.detailIcon}>
                                    <Ionicons name="location" size={16} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.detailLabel}>{t('blood_test_summary.address')}</Text>
                                    <Text style={styles.detailValue} numberOfLines={2}>
                                        {bookingData?.address?.line1}, {bookingData?.address?.pincode}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* Price Breakdown */}
                <View style={styles.card}>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{t('blood_test_summary.subtotal')}</Text>
                        <Text style={styles.breakdownValue}>₹{baseAmount.toFixed(2)}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{t('blood_test_summary.convenience_fee')}</Text>
                        <Text style={styles.breakdownValue}>₹{convenienceFee.toFixed(2)}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{t('blood_test_summary.gst')}</Text>
                        <Text style={styles.breakdownValue}>₹{gst.toFixed(2)}</Text>
                    </View>

                    {discount > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: colors.primary }]}>{t('blood_test_summary.discount')}</Text>
                            <Text style={[styles.breakdownValue, { color: colors.primary }]}>-₹{discount.toFixed(2)}</Text>
                        </View>
                    )}

                    <View style={styles.breakdownDivider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t('blood_test_summary.total_amount')}</Text>
                        <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Coupon Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('blood_test_summary.apply_coupon_code')}</Text>
                    <View style={styles.couponRow}>
                        <TextInput
                            placeholder={t('blood_test_summary.enter_coupon_code')}
                            placeholderTextColor={TEXT_MUTED}
                            value={couponCode}
                            onChangeText={setCouponCode}
                            editable={!couponApplied}
                            style={styles.couponInput}
                        />
                        <TouchableOpacity
                            style={[styles.applyBtn, couponApplied && styles.applyBtnApplied]}
                            onPress={handleApplyCoupon}
                            disabled={couponApplied}
                        >
                            <Text style={[styles.applyBtnText, couponApplied && styles.applyBtnTextApplied]}>
                                {couponApplied ? '✓' : t('blood_test_summary.apply')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Payment Method */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('blood_test_summary.payment_method')}</Text>
                    {PAYMENT_METHODS.map(m => (
                        <TouchableOpacity
                            key={m.type}
                            style={[styles.methodRow, selectedMethod === m.type && styles.methodRowActive]}
                            onPress={() => setSelectedMethod(m.type)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name={m.icon as any} size={20} color={selectedMethod === m.type ? colors.primary : TEXT_MUTED} />
                            <Text style={[styles.methodLabel, selectedMethod === m.type && styles.methodLabelActive]}>
                                {m.type === 'UPI' ? t('blood_test_summary.upi_label') : m.type === 'CARD' ? t('blood_test_summary.card_label') : t('blood_test_summary.cod_label')}
                            </Text>
                            <Ionicons
                                name={selectedMethod === m.type ? 'radio-button-on' : 'radio-button-off'}
                                size={20}
                                color={selectedMethod === m.type ? colors.primary : TEXT_MUTED}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Footer CTA */}
            <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
                <TouchableOpacity
                    style={[styles.payBtn, isLoading && styles.payBtnDisabled]}
                    onPress={handlePayment}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.payBtnText}>
                            {selectedMethod === 'CASH' 
                                ? t('blood_test_summary.confirm_booking') 
                                : `${t('blood_test_summary.confirm_pay')} ₹${totalAmount.toFixed(2)}`}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        flex: 1,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: isDarkMode ? '#252525' : '#FAF7ED',
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    testName: {
        fontSize: 14,
        fontWeight: '600',
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        marginBottom: 4,
    },
    parametersText: {
        fontSize: 12,
        color: isDarkMode ? '#AAAAAA' : TEXT_MUTED,
    },
    priceTag: {
        backgroundColor: LIGHT_GREEN_BG,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDarkMode ? '#2A5A47' : '#D1FAE5',
    },
    priceAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: PRIMARY_GREEN,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: LIGHT_GREEN_BG,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailLabel: {
        fontSize: 12,
        color: isDarkMode ? '#AAAAAA' : TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
    },
    divider: {
        height: 1,
        backgroundColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
        marginVertical: 10,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    breakdownLabel: {
        fontSize: 13,
        color: isDarkMode ? '#AAAAAA' : TEXT_MUTED,
        fontWeight: '500',
    },
    breakdownValue: {
        fontSize: 13,
        fontWeight: '600',
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
    },
    breakdownDivider: {
        height: 1,
        backgroundColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
        marginVertical: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_GREEN,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        marginBottom: 10,
    },
    couponRow: {
        flexDirection: 'row',
        gap: 8,
    },
    couponInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    applyBtn: {
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: PRIMARY_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnApplied: {
        backgroundColor: '#10B981',
    },
    applyBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FAF7ED',
    },
    applyBtnTextApplied: {
        color: '#FAF7ED',
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    payBtn: {
        paddingVertical: 14,
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    payBtnDisabled: {
        opacity: 0.6,
    },
    payBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FAF7ED',
    },
    methodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
        marginBottom: 8,
        backgroundColor: isDarkMode ? '#252525' : '#FAF7ED',
    },
    methodRowActive: { borderColor: PRIMARY_GREEN, backgroundColor: LIGHT_GREEN_BG },
    methodLabel: { flex: 1, fontSize: 13, color: isDarkMode ? '#AAAAAA' : TEXT_MUTED, fontWeight: '400' },
    methodLabelActive: { color: isDarkMode ? '#FFFFFF' : TEXT_DARK, fontWeight: '600' },
});

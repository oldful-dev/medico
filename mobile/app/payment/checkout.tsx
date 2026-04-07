// Payment Screen — Razorpay native in-app popup
// Flow: Order summary → optional coupon → initiate order → native Razorpay sheet → verify
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, StyleSheet, Platform, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { paymentService, PaymentMethod } from '@/services/api/paymentService';
import { useTranslation } from 'react-i18next';

type MethodOption = { type: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap };

const PAYMENT_METHODS: MethodOption[] = [
    { type: 'UPI',        label: 'UPI / GPay / PhonePe', icon: 'phone-portrait-outline' },
    { type: 'CARD',       label: 'Credit / Debit Card',  icon: 'card-outline' },
    { type: 'NETBANKING', label: 'Net Banking',           icon: 'business-outline' },
    { type: 'WALLET',     label: 'Mobile Wallet',         icon: 'wallet-outline' },
];

export default function PaymentScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams<{
        bookingId?: string;
        subscriptionId?: string;
        amount?: string;
        label?: string;
        email?: string;
        phone?: string;
        userName?: string;
    }>();

    const amount = parseFloat(params.amount ?? '0');
    const label  = params.label ?? 'Service Booking';

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');
    const [couponCode,     setCouponCode]     = useState('');
    const [couponApplied,  setCouponApplied]  = useState(false);
    const [discount,       setDiscount]       = useState(0);
    const [finalAmount,    setFinalAmount]    = useState(amount);
    const [couponLoading,  setCouponLoading]  = useState(false);
    const [payLoading,     setPayLoading]     = useState(false);

    useEffect(() => { setFinalAmount(amount - discount); }, [amount, discount]);

    // ─── Apply coupon ───────────────────────────────────────
    const handleApplyCoupon = useCallback(async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        try {
            const res = await paymentService.applyCoupon({ couponCode: couponCode.trim(), amount });
            if (res.success && res.data?.valid) {
                setDiscount(res.data.discount);
                setFinalAmount(res.data.finalAmount);
                setCouponApplied(true);
                Alert.alert('Coupon Applied!', `You saved ₹${res.data.discount}`);
            } else {
                Alert.alert('Invalid Coupon', 'This coupon code is not valid or has expired.');
            }
        } catch {
            Alert.alert('Error', 'Could not apply coupon. Please try again.');
        } finally {
            setCouponLoading(false);
        }
    }, [couponCode, amount]);

    const handleRemoveCoupon = () => {
        setCouponCode('');
        setCouponApplied(false);
        setDiscount(0);
        setFinalAmount(amount);
    };

    // ─── Open Razorpay native popup ─────────────────────────
    const handlePay = useCallback(async () => {
        if (payLoading) return;
        setPayLoading(true);
        try {
            // 1. Create order on backend
            const initiateRes = await paymentService.initiatePayment({
                bookingId:      params.bookingId,
                subscriptionId: params.subscriptionId,
                amount:         finalAmount,
                paymentMethod:  selectedMethod,
                couponCode:     couponApplied ? couponCode : undefined,
            });

            if (!initiateRes.success || !initiateRes.data) {
                Alert.alert('Payment Error', initiateRes.message ?? 'Could not initiate payment.');
                return;
            }

            const { orderId, amount: orderAmount, paymentId } = initiateRes.data;

            // 2. Open Razorpay native checkout sheet
            const options = {
                description:  label,
                image:        'https://storage.googleapis.com/oldful-assets/mobile/assets/images/oldful-logo.png',
                currency:     'INR',
                key:          process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
                amount:       String(Math.round(orderAmount * 100)), // in paise
                name:         'Oldful Healthcare',
                order_id:     orderId,
                prefill: {
                    // These will be pre-filled if available — left empty here,
                    // the calling screen can pass them as params if needed
                    email:   params.email   ?? '',
                    contact: params.phone   ?? '',
                    name:    params.userName ?? '',
                },
                theme: { color: Colors.primary },
            };

            const { NativeModules } = require('react-native');
            if (!NativeModules.RNRazorpayCheckout) {
                Alert.alert(
                    'Build Required',
                    'Razorpay involves native code and cannot be run in standard Expo Go. Please run `npx expo run:android` to build a Custom Dev Client.'
                );
                setPayLoading(false);
                return;
            }

            const data = await RazorpayCheckout.open(options);

            // 3. Verify signature on backend
            const verifyRes = await paymentService.verifyPayment({
                razorpayPaymentId: data.razorpay_payment_id,
                razorpayOrderId:   data.razorpay_order_id,
                razorpaySignature: data.razorpay_signature,
            });

            if (verifyRes.success) {
                router.replace({
                    pathname: params.bookingId ? '/payment/payment-success' : '/(tabs)',
                    params: {
                        paymentSuccess:  'true',
                        invoiceNumber:   verifyRes.data?.invoice?.invoiceNumber ?? '',
                        invoicePdfUrl:   verifyRes.data?.invoice?.pdfUrl ?? '',
                        bookingId:       params.bookingId ?? '',
                        amount:          String(finalAmount),
                    },
                });
            } else {
                Alert.alert(
                    'Verification Failed',
                    'Payment was received but could not be verified. Our team will resolve this within 24 hours.',
                );
            }
        } catch (error: any) {
            // Razorpay SDK throws { code, description } on failure/dismissal
            if (error?.code === 0) {
                // User dismissed — do nothing
                return;
            }
            const msg = error?.description ?? error?.message ?? 'Something went wrong.';
            Alert.alert('Payment Failed', msg);
        } finally {
            setPayLoading(false);
        }
    }, [payLoading, finalAmount, selectedMethod, couponApplied, couponCode, params, label, router]);

    // ─── UI ─────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

                {/* Order Summary */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Order Summary</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>{label}</Text>
                        <Text style={styles.rowValue}>₹{amount.toLocaleString('en-IN')}</Text>
                    </View>
                    {couponApplied && (
                        <View style={styles.row}>
                            <Text style={[styles.rowLabel, { color: '#2e7d32' }]}>Coupon Discount</Text>
                            <Text style={[styles.rowValue, { color: '#2e7d32' }]}>- ₹{discount.toLocaleString('en-IN')}</Text>
                        </View>
                    )}
                    <View style={[styles.row, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total Payable</Text>
                        <Text style={styles.totalValue}>₹{finalAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <Text style={styles.gstNote}>Inclusive of all taxes (GST @ 18%)</Text>
                </View>

                {/* Coupon */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Promo Code</Text>
                    {couponApplied ? (
                        <View style={styles.couponApplied}>
                            <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                            <Text style={styles.couponAppliedText}>"{couponCode}" applied — saved ₹{discount}</Text>
                            <TouchableOpacity onPress={handleRemoveCoupon}>
                                <Ionicons name="close-circle-outline" size={18} color="#999" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.couponRow}>
                            <TextInput
                                style={styles.couponInput}
                                placeholder="Enter coupon code"
                                placeholderTextColor="#AAAAAA"
                                value={couponCode}
                                onChangeText={setCouponCode}
                                autoCapitalize="characters"
                                returnKeyType="done"
                                onSubmitEditing={handleApplyCoupon}
                            />
                            <TouchableOpacity
                                style={[styles.couponBtn, (!couponCode.trim() || couponLoading) && styles.couponBtnDisabled]}
                                onPress={handleApplyCoupon}
                                disabled={!couponCode.trim() || couponLoading}
                            >
                                {couponLoading
                                    ? <ActivityIndicator size="small" color={Colors.textWhite} />
                                    : <Text style={styles.couponBtnText}>Apply</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Payment Method */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Payment Method</Text>
                    {PAYMENT_METHODS.map(m => (
                        <TouchableOpacity
                            key={m.type}
                            style={[styles.methodRow, selectedMethod === m.type && styles.methodRowActive]}
                            onPress={() => setSelectedMethod(m.type)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name={m.icon} size={20} color={selectedMethod === m.type ? Colors.primary : Colors.textLight} />
                            <Text style={[styles.methodLabel, selectedMethod === m.type && styles.methodLabelActive]}>
                                {m.label}
                            </Text>
                            <Ionicons
                                name={selectedMethod === m.type ? 'radio-button-on' : 'radio-button-off'}
                                size={20}
                                color={selectedMethod === m.type ? Colors.primary : Colors.textLight}
                                style={{ marginLeft: 'auto' }}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Security note */}
                <View style={styles.securityNote}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#666" />
                    <Text style={styles.securityText}>
                        Secured by Razorpay. Your payment information is encrypted and safe.
                    </Text>
                </View>

            </ScrollView>

            {/* Pay Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payBtn, payLoading && styles.payBtnLoading]}
                    onPress={handlePay}
                    disabled={payLoading}
                    activeOpacity={0.85}
                >
                    {payLoading
                        ? <ActivityIndicator color={Colors.textWhite} />
                        : <>
                            <Ionicons name="lock-closed-outline" size={18} color={Colors.textWhite} />
                            <Text style={styles.payBtnText}>Pay ₹{finalAmount.toLocaleString('en-IN')}</Text>
                        </>
                    }
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.primary },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: Colors.textWhite },

    body: { flex: 1, backgroundColor: Colors.bgScreen ?? '#FAFAF0', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    bodyContent: { padding: Spacing.xl, paddingBottom: 100, gap: Spacing.lg },

    card: {
        backgroundColor: '#FFFFFF', borderRadius: Radius.lg ?? 12, padding: Spacing.xl, gap: Spacing.md,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
    },
    cardTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textDark, marginBottom: Spacing.xs ?? 4 },

    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowLabel: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textLight },
    rowValue: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.textDark },
    totalRow: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    totalLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textDark },
    totalValue: { fontFamily: Fonts.semiBold, fontSize: 20, color: Colors.primary },
    gstNote: { fontFamily: Fonts.regular, fontSize: FontSize.small ?? 12, color: '#999' },

    couponRow: { flexDirection: 'row', gap: Spacing.sm },
    couponInput: {
        flex: 1, height: 44, borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.textDark,
    },
    couponBtn: { paddingHorizontal: Spacing.lg, height: 44, backgroundColor: Colors.primary, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
    couponBtnDisabled: { opacity: 0.45 },
    couponBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textWhite },
    couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5E9', padding: Spacing.md, borderRadius: Radius.sm },
    couponAppliedText: { flex: 1, fontFamily: Fonts.medium, fontSize: FontSize.small ?? 13, color: '#2e7d32' },

    methodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, borderColor: '#EEEEEE' },
    methodRowActive: { borderColor: Colors.primary, backgroundColor: '#F0FAF4' },
    methodLabel: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textLight },
    methodLabelActive: { color: Colors.textDark, fontFamily: Fonts.medium },

    securityNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md },
    securityText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSize.small ?? 12, color: '#888', lineHeight: 18 },

    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.bgScreen ?? '#FAFAF0',
        padding: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl + 16 : Spacing.xl,
        borderTopWidth: 1, borderTopColor: '#E5E5E5',
    },
    payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: Radius.lg ?? 12 },
    payBtnLoading: { opacity: 0.7 },
    payBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textWhite },
});

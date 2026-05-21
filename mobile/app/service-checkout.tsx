// Unified Service Checkout — All Ayuxa Services (Doctor, Nurse, Physio, Medicines, etc.)
// Flow: Address confirmation → Payment method → Razorpay → Success

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, StyleSheet, Platform, Alert, NativeModules,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { paymentService, PaymentMethod } from '@/services/api/paymentService';
import { bookingService } from '@/services/api/bookingService';
import { storageService, STORAGE_KEYS } from '@/services/device/storageService';
import { useUser } from '@/context/UserContext';

type PaymentFlowState = 'idle' | 'creating_booking' | 'initiating_order' | 'checkout_opened' | 'verifying' | 'success' | 'failed' | 'cancelled';

type MethodOption = { type: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap };

const PAYMENT_METHODS: MethodOption[] = [
    { type: 'UPI',  label: 'UPI (GPay / PhonePe / Paytm)', icon: 'phone-portrait-outline' },
    { type: 'CARD', label: 'Credit / Debit Card',         icon: 'card-outline' },
    { type: 'CASH', label: 'Cash on Delivery',             icon: 'cash-outline' },
];

const mapLabelToCategory = (label: string): string => {
    const lower = label.toLowerCase();
    if (lower.includes('doctor') || lower.includes('consult')) return 'DOCTOR_HOME_VISIT';
    if (lower.includes('nurse') || lower.includes('care')) return 'HOME_NURSE';
    if (lower.includes('physio') || lower.includes('fitness')) return 'PHYSIO_FITNESS';
    if (lower.includes('medicine') || lower.includes('pharmacy')) return 'MEDICINES';
    if (lower.includes('meal') || lower.includes('food') || lower.includes('tiffin')) return 'TIFFIN';
    if (lower.includes('equipment') || lower.includes('rental')) return 'EQUIPMENT_RENTAL';
    if (lower.includes('tech') || lower.includes('helper')) return 'TECH_HELPER';
    if (lower.includes('clean') || lower.includes('grocery') || lower.includes('shopping') || lower.includes('essential')) return 'HOME_ESSENTIALS';
    if (lower.includes('plumb') || lower.includes('electr')) return 'PLUMBING_ELECTRICAL';
    if (lower.includes('appliance') || lower.includes('repair')) return 'APPLIANCE_REPAIR';
    if (lower.includes('bill') || lower.includes('payment')) return 'BILL_PAYMENT';
    if (lower.includes('bank') || lower.includes('paperwork')) return 'BANK_PAPERWORK';
    if (lower.includes('legal') || lower.includes('paper')) return 'LEGAL_PAPERWORK';
    if (lower.includes('hospital') || lower.includes('trip')) return 'HOSPITAL_TRIP';
    if (lower.includes('transport') || lower.includes('cab') || lower.includes('driving')) return 'TRANSPORTATION';
    return 'OTHER';
};

export default function ServiceCheckoutScreen() {
    const router = useRouter();
    const { profile, refreshData } = useUser();
    const params = useLocalSearchParams<{
        bookingPayload?: string;
        subscriptionId?: string;
        amount?: string;
        label?: string;
        email?: string;
        phone?: string;
        userName?: string;
    }>();

    const baseAmount = parseFloat(params.amount ?? '0');
    const label  = params.label ?? 'Service Booking';

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');
    const [couponCode,     setCouponCode]     = useState('');
    const [couponApplied,  setCouponApplied]  = useState(false);
    const [discount,       setDiscount]       = useState(0);
    const [couponLoading,  setCouponLoading]  = useState(false);
    const [payLoading,     setPayLoading]     = useState(false);
    const [, setFlowState] = useState<PaymentFlowState>('idle');
    const [, setPendingRecovery] = useState(false);

    // ─── Address Selection ──────────────────────────────────────────────
    const [selectedAddress, setSelectedAddress] = useState<any>(
        profile?.addresses && profile.addresses.length > 0
            ? profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0]
            : null
    );

    // ─── Benefit calculation state ──────────────────────────────────────
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
        benefitApplied: boolean;
    } | null>(null);

    // ─── Calculate checkout with benefits ──────────────────────────────
    useEffect(() => {
        if (params.bookingPayload) {
            const fetchCalculation = async () => {
                setCalcLoading(true);
                try {
                    const category = mapLabelToCategory(label);
                    const res = await paymentService.calculateCheckout({
                        serviceCategory: category,
                        vendorFee: baseAmount,
                        baseAyuxaFee: 0,
                        diagnosticFee: 0
                    });
                    if (res.success && res.data) {
                        setCalculatedPrices(res.data);
                    }
                } catch (e) {
                    console.warn('Failed to calculate checkout with benefits:', e);
                } finally {
                    setCalcLoading(false);
                }
            };
            fetchCalculation();
        }
    }, [params.bookingPayload, label]);

    const benefitApplied = !!calculatedPrices?.benefitApplied;
    const bookingFee = calculatedPrices ? calculatedPrices.breakdown.bookingFee : 299;
    const platformFee = calculatedPrices ? calculatedPrices.breakdown.platformFee : 50;
    const taxes = calculatedPrices ? calculatedPrices.breakdown.taxes : Math.round(baseAmount * 0.06);

    const originalBookingFee = calculatedPrices?.benefitApplied ? (Math.abs(calculatedPrices.breakdown.benefitDiscount) > 50 ? Math.abs(calculatedPrices.breakdown.benefitDiscount) - 50 : 299) : bookingFee;
    const originalPlatformFee = calculatedPrices?.benefitApplied ? 50 : platformFee;

    const amountWithTaxAndFee = calculatedPrices ? calculatedPrices.totalAmount : (baseAmount + bookingFee + platformFee + taxes);
    const [finalAmount, setFinalAmount] = useState(amountWithTaxAndFee);

    useEffect(() => { setFinalAmount(amountWithTaxAndFee - discount); }, [amountWithTaxAndFee, discount]);

    // ─── Pending order recovery ─────────────────────────────────────────
    const sessionBookingId = useRef<string | null>(null);
    const pendingOrderId = useRef<string | null>(null);

    useEffect(() => {
        const checkPendingOrder = async () => {
            try {
                const pendingOrderId = await storageService.getItem(STORAGE_KEYS.PENDING_ORDER_ID);
                const pendingBookingId = await storageService.getItem(STORAGE_KEYS.PENDING_BOOKING_ID);
                if (pendingOrderId && pendingBookingId) {
                    setPendingRecovery(true);
                    sessionBookingId.current = pendingBookingId;
                    Alert.alert(
                        'Pending Payment Found',
                        'You have a payment that was interrupted. Would you like to check its status?',
                        [
                            {
                                text: 'Dismiss',
                                style: 'cancel',
                                onPress: async () => {
                                    await storageService.removeItem(STORAGE_KEYS.PENDING_ORDER_ID);
                                    await storageService.removeItem(STORAGE_KEYS.PENDING_BOOKING_ID);
                                    setPendingRecovery(false);
                                },
                            },
                            {
                                text: 'Check Status',
                                onPress: async () => {
                                    await storageService.removeItem(STORAGE_KEYS.PENDING_ORDER_ID);
                                    await storageService.removeItem(STORAGE_KEYS.PENDING_BOOKING_ID);
                                    router.replace({
                                        pathname: '/service-confirmation',
                                        params: { bookingId: pendingBookingId },
                                    });
                                },
                            },
                        ],
                    );
                }
            } catch (e) {
                console.warn('Pending order check failed:', e);
            }
        };
        checkPendingOrder();
    }, [router]);

    // ─── Apply coupon ───────────────────────────────────────────────────
    const handleApplyCoupon = useCallback(async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        try {
            const res = await paymentService.applyCoupon({ couponCode: couponCode.trim(), amount: amountWithTaxAndFee });
            if (res.success && res.data?.valid) {
                setDiscount(res.data.discount);
                setFinalAmount(amountWithTaxAndFee - res.data.discount);
                setCouponApplied(true);
                Alert.alert('Coupon Applied!', `You saved ₹${res.data.discount.toLocaleString('en-IN')}`);
            } else {
                Alert.alert('Invalid Coupon', 'This coupon code is not valid or has expired.');
            }
        } catch {
            Alert.alert('Error', 'Could not apply coupon. Please try again.');
        } finally {
            setCouponLoading(false);
        }
    }, [couponCode, amountWithTaxAndFee]);

    const handleRemoveCoupon = () => {
        setCouponCode('');
        setCouponApplied(false);
        setDiscount(0);
        setFinalAmount(amountWithTaxAndFee);
    };

    const clearPendingOrder = async () => {
        await storageService.removeItem(STORAGE_KEYS.PENDING_ORDER_ID);
        await storageService.removeItem(STORAGE_KEYS.PENDING_BOOKING_ID);
    };

    const cancelPaymentOnBackend = async () => {
        if (pendingOrderId.current) {
            try { await paymentService.cancelPayment(pendingOrderId.current); }
            catch (e) { console.warn('cancelPayment call failed (non-blocking):', e); }
        }
    };

    // ─── Open Razorpay native popup ─────────────────────────────────────
    const handlePay = useCallback(async () => {
        if (payLoading) return;

        // ─── Validate address ──────────────────────────────────────────
        if (!selectedAddress) {
            Alert.alert('Address Required', 'Please select a service address.');
            return;
        }

        setPayLoading(true);
        try {
            // ─── STEP 1: Create booking if not already created ────────
            setFlowState('creating_booking');
            if (!sessionBookingId.current && params.bookingPayload) {
                const payload = JSON.parse(params.bookingPayload as string);
                const bookingRes = await bookingService.createBooking({
                    ...payload,
                    amount: finalAmount,
                    paymentMethod: selectedMethod,
                    addressId: selectedAddress.id,
                    addressLine: selectedAddress.line1,
                });
                if (!bookingRes.success || !bookingRes.data) {
                    setFlowState('failed');
                    Alert.alert('Booking Error', bookingRes.message ?? 'Could not create booking. Please try again.');
                    return;
                }
                sessionBookingId.current = bookingRes.data.id;
            }

            // ─── STEP 2: Handle COD (Cash on Delivery) ─────────────────
            if (selectedMethod === 'CASH') {
                setFlowState('success');
                Alert.alert(
                    'Booking Received',
                    'Your service has been scheduled. Please pay ₹' + finalAmount + ' in cash to our provider when they arrive.',
                    [{ text: 'OK', onPress: () => router.replace({
                        pathname: '/service-confirmation',
                        params: { bookingId: sessionBookingId.current! }
                    }) }]
                );
                return;
            }

            // ─── STEP 3: Create Razorpay order on backend ──────────────
            setFlowState('initiating_order');
            const initiateRes = await paymentService.initiatePayment({
                bookingId:      sessionBookingId.current ?? undefined,
                subscriptionId: params.subscriptionId,
                amount:         finalAmount,
                paymentMethod:  selectedMethod,
                couponCode:     couponApplied ? couponCode : undefined,
            });

            if (!initiateRes.success || !initiateRes.data) {
                setFlowState('failed');
                Alert.alert('Payment Error', initiateRes.message ?? 'Could not initiate payment.');
                return;
            }

            const { orderId, amount: orderAmount, key: backendKey, paymentNotRequired } = initiateRes.data as any;
            pendingOrderId.current = orderId;

            // ─── STEP 4: Handle Zero Amount Booking ────────────────────
            if (paymentNotRequired) {
                setFlowState('success');
                router.replace({
                    pathname: '/payment/payment-success',
                    params: {
                        bookingId: sessionBookingId.current ?? '',
                        amount: '0',
                        invoiceNumber: 'FREE-BOOKING',
                        isSubscription: params.subscriptionId ? '1' : '0',
                        bookingPayload: params.bookingPayload || '',
                    },
                });
                return;
            }

            // ─── STEP 5: Guard — native module must exist ──────────────
            if (!NativeModules.RNRazorpayCheckout) {
                Alert.alert(
                    'Build Required',
                    'Razorpay involves native code and cannot run in standard Expo Go.\nRun `npx expo run:android` to build a Custom Dev Client.',
                );
                return;
            }

            // ─── STEP 6: Persist pending order for crash recovery ─────
            await storageService.setItem(STORAGE_KEYS.PENDING_ORDER_ID, orderId);
            if (sessionBookingId.current) {
                await storageService.setItem(STORAGE_KEYS.PENDING_BOOKING_ID, sessionBookingId.current);
            }

            // ─── STEP 7: Open Razorpay native checkout sheet ──────────
            setFlowState('checkout_opened');
            const options: any = {
                description:  label,
                image:        'https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/onlylogo.png',
                currency:     'INR',
                key:          backendKey || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
                amount:       String(Math.round(orderAmount * 100)),
                name:         'Ayuxa Healthcare',
                order_id:     orderId,
                prefill: {
                    name:    params.userName || '',
                    contact: params.phone    || '',
                    email:   params.email    || '',
                    method:  selectedMethod.toLowerCase(),
                },
                theme: { color: Colors.primary },
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

            // ─── STEP 8: Verify signature on backend ───────────────────
            setFlowState('verifying');
            const verifyRes = await paymentService.verifyPayment({
                razorpayPaymentId: data.razorpay_payment_id,
                razorpayOrderId:   data.razorpay_order_id,
                razorpaySignature: data.razorpay_signature,
            });

            await clearPendingOrder();

            if (verifyRes.success) {
                setFlowState('success');

                if (params.refreshProfileOnSuccess === '1') {
                    try { await refreshData(); } catch { /* non-blocking */ }
                }

                router.replace({
                    pathname: '/payment/payment-success',
                    params: {
                        bookingId:     sessionBookingId.current ?? '',
                        amount:        String(finalAmount),
                        invoiceNumber: verifyRes.data?.invoice?.invoiceNumber ?? '',
                        invoicePdfUrl: verifyRes.data?.invoice?.pdfUrl ?? '',
                        isSubscription: params.subscriptionId ? '1' : '0',
                        bookingPayload: params.bookingPayload || '',
                    },
                });
            } else {
                setFlowState('failed');
                Alert.alert(
                    'Verification Failed',
                    'Payment was received but could not be verified. Our team will resolve this within 24 hours. Please do NOT retry the payment.',
                );
            }
        } catch (error: any) {
            await clearPendingOrder();

            if (error?.code === 0) {
                setFlowState('cancelled');
                await cancelPaymentOnBackend();
                await clearPendingOrder();
                Alert.alert(
                    'Payment Cancelled',
                    'You can try again whenever you are ready. Your booking details have been saved.',
                    [{ text: 'OK' }],
                );
                return;
            }

            setFlowState('failed');
            await cancelPaymentOnBackend();
            await clearPendingOrder();
            const msg = error?.description ?? error?.message ?? 'Something went wrong.';
            Alert.alert(
                'Payment Failed',
                msg,
                [
                    { text: 'Go Back', style: 'cancel', onPress: () => router.back() },
                    { text: 'Retry Payment', onPress: () => {
                        setFlowState('idle');
                    }},
                ],
            );
        } finally {
            setPayLoading(false);
        }
    }, [payLoading, finalAmount, selectedMethod, couponApplied, couponCode, params, label, router, refreshData, selectedAddress]);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout</Text>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

                {/* Order Summary */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Service Summary</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>{label}</Text>
                        <Text style={styles.rowValue}>₹{baseAmount.toLocaleString('en-IN')}</Text>
                    </View>

                    {/* Breakdown Section */}
                    <View style={styles.breakdownSection}>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Service Fee</Text>
                            <Text style={styles.breakdownValue}>₹{baseAmount.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Booking Fee</Text>
                            {benefitApplied ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={[styles.breakdownValue, { textDecorationLine: 'line-through', color: Colors.textMuted }]}>₹{originalBookingFee}</Text>
                                    <Text style={[styles.breakdownValue, { color: '#2e7d32', fontFamily: Fonts.semiBold }]}> FREE</Text>
                                </View>
                            ) : (
                                <Text style={styles.breakdownValue}>₹{bookingFee}</Text>
                            )}
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Platform Fee</Text>
                            {benefitApplied ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={[styles.breakdownValue, { textDecorationLine: 'line-through', color: Colors.textMuted }]}>₹{originalPlatformFee}</Text>
                                    <Text style={[styles.breakdownValue, { color: '#2e7d32', fontFamily: Fonts.semiBold }]}> FREE</Text>
                                </View>
                            ) : (
                                <Text style={styles.breakdownValue}>₹{platformFee}</Text>
                            )}
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Taxes & GST</Text>
                            <Text style={styles.breakdownValue}>₹{taxes.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                        </View>
                        {benefitApplied && (
                            <Text style={styles.benefitNote}>(Subscription Benefits Applied)</Text>
                        )}
                    </View>

                    {couponApplied && (
                        <View style={styles.row}>
                            <Text style={[styles.rowLabel, { color: '#2e7d32' }]}>Coupon Discount</Text>
                            <Text style={[styles.rowValue, { color: '#2e7d32' }]}>- ₹{discount.toLocaleString('en-IN')}</Text>
                        </View>
                    )}
                    <View style={[styles.row, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>₹{(amountWithTaxAndFee - discount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
                    </View>

                    {benefitApplied && (
                        <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>
                                💰 You saved ₹{(Math.round((originalBookingFee - bookingFee) + (originalPlatformFee - platformFee))).toLocaleString('en-IN')} on fees!
                            </Text>
                        </View>
                    )}
                </View>

                {/* Service Address */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Service Address</Text>
                    {profile?.addresses && profile.addresses.length > 0 ? (
                        <View style={{ gap: 10 }}>
                            {profile.addresses.map((addr: any) => (
                                <TouchableOpacity
                                    key={addr.id}
                                    style={[
                                        styles.addressCard,
                                        selectedAddress?.id === addr.id && styles.addressCardActive,
                                    ]}
                                    onPress={() => setSelectedAddress(addr)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={selectedAddress?.id === addr.id ? 'radio-button-on' : 'radio-button-off'}
                                        size={20}
                                        color={selectedAddress?.id === addr.id ? Colors.primary : Colors.textLight}
                                    />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.addressLabel}>
                                            {addr.line1}{addr.line2 ? ', ' + addr.line2 : ''}, {addr.cityName}
                                        </Text>
                                        <Text style={styles.addressSub}>{addr.label}</Text>
                                        {addr.isDefault && (
                                            <Text style={styles.defaultBadge}>Default Address</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.noAddressText}>No saved addresses. Please add one in your profile.</Text>
                    )}
                </View>

                {/* Coupon */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Promo Code</Text>
                    {couponApplied ? (
                        <View style={styles.couponApplied}>
                            <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                            <Text style={styles.couponAppliedText}>&quot;{couponCode}&quot; applied — saved ₹{discount}</Text>
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
                    <Ionicons name={selectedMethod === 'CASH' ? "information-circle-outline" : "shield-checkmark-outline"} size={16} color="#666" />
                    <Text style={styles.securityText}>
                        {selectedMethod === 'CASH'
                            ? 'Please prepare exact change if possible. Our provider will collect the amount upon arrival.'
                            : 'Secured by Razorpay. Your payment information is encrypted and safe.'
                        }
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
                            <Ionicons name={selectedMethod === 'CASH' ? "checkmark-circle-outline" : "lock-closed-outline"} size={18} color={Colors.textWhite} />
                            <Text style={styles.payBtnText}>
                                {selectedMethod === 'CASH'
                                    ? `Confirm Booking (₹${finalAmount.toLocaleString('en-IN')})`
                                    : `Pay ₹${finalAmount.toLocaleString('en-IN')}`
                                }
                            </Text>
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
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    },
    backBtn: { padding: 8 },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        marginLeft: 12,
    },

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

    breakdownSection: {
        backgroundColor: '#FAFAFA',
        borderRadius: Radius.md,
        padding: Spacing.md,
        gap: Spacing.sm,
        marginVertical: Spacing.sm,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    breakdownLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption ?? 12,
        color: '#666'
    },
    breakdownValue: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption ?? 12,
        color: Colors.textDark
    },

    totalRow: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    totalLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textDark },
    totalValue: { fontFamily: Fonts.semiBold, fontSize: 20, color: Colors.primary },

    addressCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: '#EEEEEE',
    },
    addressCardActive: {
        borderColor: Colors.primary,
        backgroundColor: '#F0FAF4',
    },
    addressLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    addressSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption ?? 12,
        color: Colors.textMuted,
        marginTop: 4,
    },
    defaultBadge: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        color: Colors.primary,
        marginTop: 4,
    },
    noAddressText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },

    couponRow: { flexDirection: 'row', gap: Spacing.sm },
    couponInput: {
        flex: 1, height: 44, borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.textDark,
    },
    couponBtn: { paddingHorizontal: Spacing.lg, height: 44, backgroundColor: Colors.primary, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
    couponBtnDisabled: { opacity: 0.45 },
    couponBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textWhite },
    couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5E9', padding: Spacing.md, borderRadius: Radius.sm },
    couponAppliedText: { flex: 1, fontFamily: Fonts.medium, fontSize: FontSize.caption ?? 13, color: '#2e7d32' },

    methodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: '#EEEEEE'
    },
    methodRowActive: { borderColor: Colors.primary, backgroundColor: '#F0FAF4' },
    methodLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textLight },
    methodLabelActive: { color: Colors.textDark, fontFamily: Fonts.medium },

    securityNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md },
    securityText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSize.caption ?? 12, color: '#888', lineHeight: 18 },

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

    benefitNote: {
        fontFamily: Fonts.medium,
        fontSize: 10,
        color: '#2e7d32',
        textAlign: 'right',
        marginTop: -2,
    },
    savingsBadge: {
        backgroundColor: '#E8F5E9',
        borderRadius: Radius.sm ?? 6,
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.md,
    },
    savingsText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.caption ?? 12,
        color: '#2e7d32',
    },
});

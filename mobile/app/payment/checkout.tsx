// Payment Screen — Razorpay native in-app popup
// Flow: Order summary → optional coupon → create booking → initiate order → native Razorpay → verify → success
// Edge cases: cancel (ondismiss), failure (retry), app crash (AsyncStorage recovery)
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { bookingService } from '@/services/api/bookingService';
import { storageService, STORAGE_KEYS } from '@/services/device/storageService';

// ─── Payment Flow States (for debugging & recovery) ──────
type PaymentFlowState = 'idle' | 'creating_booking' | 'initiating_order' | 'checkout_opened' | 'verifying' | 'success' | 'failed' | 'cancelled';

type MethodOption = { type: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap };

const PAYMENT_METHODS: MethodOption[] = [
    { type: 'UPI',  label: 'UPI (GPay / PhonePe / Paytm)', icon: 'phone-portrait-outline' },
    { type: 'CARD', label: 'Credit / Debit Card',         icon: 'card-outline' },
    { type: 'CASH', label: 'Cash on Delivery',             icon: 'cash-outline' },
];

export default function CheckoutScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        // ─── Existing booking ID (legacy: service screens pre-created the booking)
        bookingId?: string;
        // ─── New: serialised CreateBookingPayload — checkout creates the booking itself
        bookingPayload?: string;
        subscriptionId?: string;
        amount?: string;
        label?: string;
        email?: string;
        phone?: string;
        userName?: string;
    }>();

    // ─── COD Restriction: Hide CASH if it's a subscription ──────────────────
    const availableMethods = params.subscriptionId 
        ? PAYMENT_METHODS.filter(m => m.type !== 'CASH')
        : PAYMENT_METHODS;

    const amount = parseFloat(params.amount ?? '0');
    const label  = params.label ?? 'Service Booking';

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(params.subscriptionId ? 'UPI' : 'UPI');
    const [couponCode,     setCouponCode]     = useState('');
    const [couponApplied,  setCouponApplied]  = useState(false);
    const [discount,       setDiscount]       = useState(0);
    const [finalAmount,    setFinalAmount]    = useState(amount);
    const [couponLoading,  setCouponLoading]  = useState(false);
    const [payLoading,     setPayLoading]     = useState(false);
    const [, setFlowState] = useState<PaymentFlowState>('idle');
    const [, setPendingRecovery] = useState(false);

    useEffect(() => { setFinalAmount(amount - discount); }, [amount, discount]);

    // ─── EDGE CASE: Recover pending payment after app crash/close ──────
    // On mount, check if there's a pending Razorpay order in AsyncStorage.
    // If found, offer user to check the payment status with backend.
    const sessionBookingId = useRef<string | null>(params.bookingId ?? null);
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
                                    // Clear stale pending order
                                    await storageService.removeItem(STORAGE_KEYS.PENDING_ORDER_ID);
                                    await storageService.removeItem(STORAGE_KEYS.PENDING_BOOKING_ID);
                                    setPendingRecovery(false);
                                },
                            },
                            {
                                text: 'Check Status',
                                onPress: async () => {
                                    // Navigate to service-confirmation which fetches booking from backend
                                    // The backend will have the real payment status from Razorpay webhooks
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

    // ─── Helper: Clear pending order from storage (called on success/failure) ──
    const clearPendingOrder = async () => {
        await storageService.removeItem(STORAGE_KEYS.PENDING_ORDER_ID);
        await storageService.removeItem(STORAGE_KEYS.PENDING_BOOKING_ID);
    };

    // ─── Helper: Cancel payment on backend (dismiss / failure) ────────────────
    // Marks booking as PAYMENT_FAILED so it disappears from Cart/Active.
    const cancelPaymentOnBackend = async () => {
        if (pendingOrderId.current) {
            try { await paymentService.cancelPayment(pendingOrderId.current); } 
            catch (e) { console.warn('cancelPayment call failed (non-blocking):', e); }
        }
    };

    // ─── Open Razorpay native popup ─────────────────────────
    const handlePay = useCallback(async () => {
        if (payLoading) return;
        setPayLoading(true);
        try {
            // ─── STEP 1: Create booking ONLY if we don't already have one
            // (Mirrors Next.js: bookingId guard with createdBookingIds state)
            // The booking starts as PENDING and is only CONFIRMED after payment verify.
            setFlowState('creating_booking');
            if (!sessionBookingId.current && params.bookingPayload) {
                // bookingPayload is a JSON-serialised CreateBookingPayload passed from service screens
                const payload = JSON.parse(params.bookingPayload as string);
                const bookingRes = await bookingService.createBooking({
                    ...payload,
                    amount: finalAmount,
                    paymentMethod: selectedMethod,
                });
                if (!bookingRes.success || !bookingRes.data) {
                    setFlowState('failed');
                    Alert.alert('Booking Error', bookingRes.message ?? 'Could not create booking. Please try again.');
                    return;
                }
                sessionBookingId.current = bookingRes.data.id;
            }

            // ─── STEP 2: Handle COD (Cash on Delivery) vs Razorpay
            if (selectedMethod === 'CASH') {
                // COD Flow — Direct success (Booking is already PENDING)
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

            // ─── STEP 3: Create Razorpay order on backend
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

            const { orderId, amount: orderAmount, key: backendKey } = initiateRes.data as any;
            pendingOrderId.current = orderId; // Store for cancel/failure handler

            // ─── STEP 4: Guard — native module must exist (fails in Expo Go)
            if (!NativeModules.RNRazorpayCheckout) {
                Alert.alert(
                    'Build Required',
                    'Razorpay involves native code and cannot run in standard Expo Go.\nRun `npx expo run:android` to build a Custom Dev Client.',
                );
                return;
            }

            // ─── STEP 5: Persist pending order for crash recovery ──────
            // If the app crashes while Razorpay is open, we can recover on next launch.
            await storageService.setItem(STORAGE_KEYS.PENDING_ORDER_ID, orderId);
            if (sessionBookingId.current) {
                await storageService.setItem(STORAGE_KEYS.PENDING_BOOKING_ID, sessionBookingId.current);
            }

            // ─── STEP 6: Open Razorpay native checkout sheet
            setFlowState('checkout_opened');
            const options: any = {
                description:  label,
                image:        'https://storage.googleapis.com/oldful-assets/mobile/assets/images/oldful-logo.png',
                currency:     'INR',
                key:          backendKey || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
                amount:       String(Math.round(orderAmount * 100)), // paise
                name:         'Oldful Healthcare',
                order_id:     orderId,
                method:       selectedMethod.toLowerCase(),
                prefill: {
                    email:   params.email   ?? '',
                    contact: params.phone   ?? '',
                    name:    params.userName ?? '',
                    method:  selectedMethod.toLowerCase(),
                },
                theme: { color: Colors.primary },
            };

            // Await resolves ONLY on successful payment — throws on cancel/failure
            const data = await RazorpayCheckout.open(options);

            // ─── STEP 7: Verify signature on backend
            // Backend verifyPayment also: updates booking → CONFIRMED, sends push, generates invoice
            setFlowState('verifying');
            const verifyRes = await paymentService.verifyPayment({
                razorpayPaymentId: data.razorpay_payment_id,
                razorpayOrderId:   data.razorpay_order_id,
                razorpaySignature: data.razorpay_signature,
            });

            // ─── Clear pending order from storage (payment is resolved)
            await clearPendingOrder();

            if (verifyRes.success) {
                setFlowState('success');
                // Route to dedicated success screen (clear UX for elderly users)
                router.replace({
                    pathname: '/payment/payment-success',
                    params: {
                        bookingId:     sessionBookingId.current ?? '',
                        amount:        String(finalAmount),
                        invoiceNumber: verifyRes.data?.invoice?.invoiceNumber ?? '',
                        invoicePdfUrl: verifyRes.data?.invoice?.pdfUrl ?? '',
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
            // ─── Clear pending order from storage
            await clearPendingOrder();

            // Razorpay SDK throws { code, description } on dismissal and failure.
            // code === 0 means the user explicitly closed the modal — no action needed.
            // Any other code is a genuine payment failure.
            if (error?.code === 0) {
                // User explicitly dismissed Razorpay
                setFlowState('cancelled');
                // ─── CRITICAL: Mark booking as PAYMENT_FAILED on backend ────────────
                // Without this, the PAYMENT_PENDING booking stays visible in Cart/Active.
                await cancelPaymentOnBackend();
                await clearPendingOrder();
                Alert.alert(
                    'Payment Cancelled',
                    'You can try again whenever you are ready. Your booking details have been saved.',
                    [{ text: 'OK' }],
                );
                return;
            }

            // Genuine payment failure — mark failed and offer retry
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
                        // handlePay will be called again by the user pressing the button
                    }},
                ],
            );
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
                    {availableMethods.map(m => (
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
    gstNote: { fontFamily: Fonts.regular, fontSize: FontSize.caption ?? 12, color: '#999' },

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

    methodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, borderColor: '#EEEEEE' },
    methodRowActive: { borderColor: Colors.primary, backgroundColor: '#F0FAF4' },
    methodLabel: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textLight },
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
});

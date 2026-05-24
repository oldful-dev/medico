// Payment Screen — Razorpay native in-app popup
// Flow: Order summary → optional coupon → create booking → initiate order → native Razorpay → verify → success
// Edge cases: cancel (ondismiss), failure (retry), app crash (AsyncStorage recovery)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, StyleSheet, Platform, Alert, NativeModules,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { paymentService, PaymentMethod } from '@/services/api/paymentService';
import { bookingService } from '@/services/api/bookingService';
import { labService, type LabSlot } from '@/services/api/labService';
import { storeService } from '@/services/api/storeService';
import { storageService, STORAGE_KEYS } from '@/services/device/storageService';
import { useUser } from '@/context/UserContext';
import { useCart } from '@/context/CartContext';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

// ─── Payment Flow States (for debugging & recovery) ──────
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

export default function CheckoutScreen() {
    const router = useRouter();
    const { profile, refreshData, isLoading } = useUser();
    const { items, clearCategory } = useCart();

    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const params = useLocalSearchParams<{
        // ─── Existing booking ID (legacy: service screens pre-created the booking)
        bookingId?: string;
        // ─── New: serialised CreateBookingPayload — checkout creates the booking itself
        bookingPayload?: string;
        subscriptionId?: string;
        amount?: string;
        label?: string;
        category?: string; // 'wellness' | 'blood-test' | service categories
        email?: string;
        phone?: string;
        userName?: string;
        // ─── Plans screen: trigger profile refresh after payment success ──────
        refreshProfileOnSuccess?: string;
        skipUpsell?: string;
        bookingAmount?: string;
        bookingLabel?: string;
    }>();

    // Get blood test items from cart if blood-test category
    const isBloodTest = params.category === 'blood-test';
    const bloodTestItems = isBloodTest
        ? items.filter(i => i.serviceType?.toLowerCase().includes('blood') || i.serviceType === 'Bloodwork')
        : [];

    // ─── Intercept and redirect to Smart Upgrade Prompt if no active plan
    useEffect(() => {
        if (params.bookingPayload && !params.subscriptionId && params.skipUpsell !== '1') {
            const hasActivePlan = profile?.subscriptions?.some((s: any) => s.status === 'ACTIVE');
            if (!hasActivePlan) {
                router.replace({
                    pathname: '/payment/upgrade-prompt',
                    params: {
                        bookingPayload: params.bookingPayload,
                        amount: params.amount,
                        label: params.label,
                    }
                });
            }
        }
    }, [profile, params.bookingPayload, params.subscriptionId, params.skipUpsell]);

    // ─── COD Restriction: Hide CASH if it's a subscription ──────────────────
    const availableMethods = params.subscriptionId 
        ? PAYMENT_METHODS.filter(m => m.type !== 'CASH')
        : PAYMENT_METHODS;

    const baseAmount = parseFloat(params.amount ?? '0');
    const label  = params.label ?? 'Service Booking';
    const isSubscription = !!params.subscriptionId;

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(params.subscriptionId ? 'UPI' : 'UPI');
    const [couponCode,     setCouponCode]     = useState('');
    const [couponApplied,  setCouponApplied]  = useState(false);
    const [discount,       setDiscount]       = useState(0);
    const [couponLoading,  setCouponLoading]  = useState(false);
    const [payLoading,     setPayLoading]     = useState(false);
    const [, setFlowState] = useState<PaymentFlowState>('idle');
    const [, setPendingRecovery] = useState(false);

    // ─── Address Selection (for product/wellness/blood-test deliveries) ──────
    const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [landmark, setLandmark] = useState('');

    // ─── Sync phone from profile when it loads
    useEffect(() => {
        if (profile?.phone && !phoneNumber) {
            setPhoneNumber(profile.phone);
        }
    }, [profile?.phone]);

    // ─── Blood Test Specific State ─────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [selectedSlotId, setSelectedSlotId] = useState<number>(0);
    const [slots, setSlots] = useState<LabSlot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [coords, setCoords] = useState({ lat: '12.9716', long: '77.5946' });
    const [serviceabilityStatus, setServiceabilityStatus] = useState<'unchecked' | 'checking' | 'serviceable' | 'non-serviceable'>('unchecked');
    const [collectionType, setCollectionType] = useState<'HOME' | 'LAB'>('HOME');
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    // Benefit calculation state
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

    // ─── Calculate checkout with benefits
    // Applies plan benefits based on authenticated user's active subscription
    // Runs for:
    // 1. Service bookings (bookingPayload from service screens)
    // 2. Product/Wellness (cart passing amount + label)
    useEffect(() => {
        if (params.bookingPayload || (params.amount && params.category && !params.subscriptionId)) {
            const fetchCalculation = async () => {
                setCalcLoading(true);
                try {
                    const category = mapLabelToCategory(label);
                    const res = await paymentService.calculateCheckout({
                        serviceCategory: category,
                        vendorFee: baseAmount,
                        baseAyuxaFee: 0, // dynamic on backend now
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
    }, [params.bookingPayload, params.amount, params.category, label]);

    const benefitApplied = !!calculatedPrices?.benefitApplied;
    const bookingFee = calculatedPrices ? calculatedPrices.breakdown.bookingFee : (isSubscription ? 0 : 299);
    const platformFee = calculatedPrices ? calculatedPrices.breakdown.platformFee : (isSubscription ? 0 : 50);
    const taxes = calculatedPrices ? calculatedPrices.breakdown.taxes : (isSubscription ? 0 : Math.round(baseAmount * 0.06));
    
    // Original charges before waiver (for displaying stroke-through / FREE)
    const originalBookingFee = calculatedPrices?.benefitApplied ? (Math.abs(calculatedPrices.breakdown.benefitDiscount) > 50 ? Math.abs(calculatedPrices.breakdown.benefitDiscount) - 50 : 299) : bookingFee;
    const originalPlatformFee = calculatedPrices?.benefitApplied ? 50 : platformFee;

    const amountWithTaxAndFee = isSubscription
        ? baseAmount
        : (calculatedPrices ? calculatedPrices.totalAmount : (baseAmount + bookingFee + platformFee + taxes));

    const [finalAmount,    setFinalAmount]    = useState(amountWithTaxAndFee);

    useEffect(() => { setFinalAmount(amountWithTaxAndFee - discount); }, [amountWithTaxAndFee, discount]);

    // ─── Blood Test: Initialize collection date
    useEffect(() => {
        if (!isBloodTest) return;
        const today = new Date();
        if (today.getHours() >= 16) today.setDate(today.getDate() + 1);
        setSelectedDate(today);
    }, [isBloodTest]);

    // ─── Blood Test: Fetch time slots when date changes
    useEffect(() => {
        if (!isBloodTest || !selectedDate) return;
        setSlotsLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        labService.getTimeSlots(dateStr, coords.lat, coords.long)
            .then(data => {
                const slots = Array.isArray(data) ? data : [];
                setSlots(slots);
                if (slots.length > 0) {
                    setSelectedTime(slots[0].slot || slots[0].slot_time || '');
                    setSelectedSlotId(slots[0].slot_id || 0);
                }
            })
            .catch(() => setSlots([]))
            .finally(() => setSlotsLoading(false));
    }, [isBloodTest, selectedDate, coords.lat, coords.long]);

    // ─── Update coords when selected address changes (for blood test slot fetching)
    useEffect(() => {
        if (selectedAddress?.latitude && selectedAddress?.longitude) {
            setCoords({
                lat: String(selectedAddress.latitude),
                long: String(selectedAddress.longitude),
            });
        }
    }, [selectedAddress?.latitude, selectedAddress?.longitude]);

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

    // ─── Core payment execution (called after confirmation for blood tests) ─
    const executePayment = useCallback(async () => {

        // ─── Wellness/Product Validation ───────────────────────────────────────
        if (params.category === 'wellness') {
            // Check if all wellness products are still enabled
            try {
                const res = await storeService.getProducts({ limit: 1000 });
                const disabledItems: string[] = [];
                bloodTestItems.forEach(item => {
                    const product = (res.data || []).find(p => p.id === item.id);
                    if (!product || !product.isEnabled) {
                        disabledItems.push(item.title);
                    }
                });
                if (disabledItems.length > 0) {
                    Alert.alert(
                        'Products Unavailable',
                        `${disabledItems.join(', ')} ${disabledItems.length === 1 ? 'is' : 'are'} no longer available. Please update your cart.`,
                        [{ text: 'OK', onPress: () => router.back() }]
                    );
                    setPayLoading(false);
                    return;
                }
            } catch (e) {
                console.warn('Failed to validate product status:', e);
            }

            if (!selectedAddress || !selectedAddress.line1) {
                Alert.alert('Address Required', 'Please select a delivery address.');
                return;
            }
            if (!selectedAddress.pincode || selectedAddress.pincode.length !== 6) {
                Alert.alert('Pincode Required', 'Please enter a valid 6-digit pincode');
                return;
            }
        }

        setPayLoading(true);
        try {
            // ─── STEP 1: Create booking ONLY if we don't already have one
            // (Mirrors Next.js: bookingId guard with createdBookingIds state)
            // The booking starts as PENDING and is only CONFIRMED after payment verify.
            setFlowState('creating_booking');
            if (!sessionBookingId.current) {
                if (isBloodTest) {
                    // ─── Blood Test Booking ───────────────────────────────────────
                    // Create separate booking for each blood test package
                    const calculateAge = (dob: string | undefined) => {
                        if (!dob) return 0;
                        const today = new Date();
                        const birthDate = new Date(dob);
                        let age = today.getFullYear() - birthDate.getFullYear();
                        if (today.getMonth() < birthDate.getMonth() ||
                            (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                            age--;
                        }
                        return age;
                    };

                    // Create a booking for each package (Redcliffe requires separate bookings)
                    const basePayload = {
                        bookingType: collectionType,
                        patient: {
                            name: profile?.name || '',
                            age: calculateAge(profile?.dateOfBirth),
                            gender: profile?.gender || 'M',
                            phone: phoneNumber,
                            email: profile?.email || '',
                        },
                        address: {
                            lat: coords.lat,
                            long: coords.long,
                            pincode: selectedAddress?.pincode || '',
                            line1: selectedAddress?.line1 || '',
                            line2: selectedAddress?.line2,
                            landmark,
                        },
                        slot: {
                            date: selectedDate?.toISOString().split('T')[0] || '',
                            time: selectedTime,
                            slotId: selectedSlotId,
                        },
                    };

                    let lastBookingId: string | null = null;
                    for (const item of bloodTestItems) {
                        const bookingPayload = {
                            ...basePayload,
                            packages: [{
                                code: item.details?.code || item.id,
                                name: item.details?.name || item.title || '',
                                cost: item.price || 0,
                            }],
                        };
                        const bookingRes = await labService.holdBooking(bookingPayload);
                        if (!bookingRes || !(bookingRes as any)?.id) {
                            setFlowState('failed');
                            Alert.alert('Booking Error', `Could not create booking for ${item.title || 'Blood Test'}. Please try again.`);
                            return;
                        }
                        lastBookingId = (bookingRes as any).id;
                    }
                    // Use the last booking ID for display (or we could use the first one)
                    sessionBookingId.current = lastBookingId;
                } else if (params.bookingPayload) {
                    // ─── Service/Product Booking ──────────────────────────────────
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
            }

            // ─── STEP 2: Handle COD (Cash on Delivery) vs Razorpay
            if (selectedMethod === 'CASH') {
                // COD Flow — Direct success (Booking is already PENDING)
                setFlowState('success');
                if (isBloodTest) {
                    clearCategory('blood-test');
                    Alert.alert(
                        'Booking Confirmed',
                        `Your blood test collection is scheduled. Please pay ₹${finalAmount.toLocaleString('en-IN')} in cash to the phlebotomist when they arrive.`,
                        [{ text: 'OK', onPress: () => router.replace({
                            pathname: '/blood-test/success',
                            params: { bookingId: sessionBookingId.current!, amount: String(finalAmount), packageName: label }
                        }) }]
                    );
                } else {
                    // Clear cart for wellness/services/products
                    if (params.category) {
                        clearCategory(params.category);
                    }
                    Alert.alert(
                        'Booking Received',
                        'Your service has been scheduled. Please pay ₹' + finalAmount + ' in cash to our provider when they arrive.',
                        [{ text: 'OK', onPress: () => router.replace({
                            pathname: '/service-confirmation',
                            params: { bookingId: sessionBookingId.current! }
                        }) }]
                    );
                }
                return;
            }

            // ─── STEP 3: Create Razorpay order on backend
            setFlowState('initiating_order');
            const initiateRes = isBloodTest
                ? await paymentService.initiatePayment({
                    labOrderId: sessionBookingId.current ?? undefined,
                    amount: finalAmount,
                    paymentMethod: selectedMethod,
                    couponCode: couponApplied ? couponCode : undefined,
                })
                : await paymentService.initiatePayment({
                    bookingId: sessionBookingId.current ?? undefined,
                    subscriptionId: params.subscriptionId,
                    amount: finalAmount,
                    paymentMethod: selectedMethod,
                    couponCode: couponApplied ? couponCode : undefined,
                });

            if (!initiateRes.success || !initiateRes.data) {
                setFlowState('failed');
                Alert.alert('Payment Error', initiateRes.message ?? 'Could not initiate payment.');
                return;
            }

            const { orderId, amount: orderAmount, key: backendKey, paymentNotRequired } = initiateRes.data as any;
            pendingOrderId.current = orderId; // Store for cancel/failure handler

            // ─── STEP 4: Handle Zero Amount Booking (Post-Initiation) ─────────
            if (paymentNotRequired) {
                setFlowState('success');
                // The backend already marks it as SUCCESS in this case
                router.replace({
                    pathname: '/payment/payment-success',
                    params: {
                        bookingId: sessionBookingId.current ?? '',
                        amount: '0',
                        invoiceNumber: 'FREE-BOOKING',
                        isSubscription: isSubscription ? '1' : '0',
                        bookingPayload: params.bookingPayload || '',
                        bookingAmount: params.bookingAmount || '',
                        bookingLabel: params.bookingLabel || '',
                    },
                });
                return;
            }

            // ─── STEP 5: Guard — native module must exist (fails in Expo Go)
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
                image:        'https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/onlylogo.png',
                currency:     'INR',
                key:          backendKey || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
                amount:       String(Math.round(orderAmount * 100)), // paise
                name:         'Ayuxa Healthcare',
                order_id:     orderId,
                prefill: {
                    name:    params.userName || '',
                    contact: params.phone    || '',
                    email:   params.email    || '',
                    method:  selectedMethod.toLowerCase(),
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

                // ─── Globally refresh user profile if requested ─────────────
                if (params.refreshProfileOnSuccess === '1') {
                    try { await refreshData(); } catch { /* non-blocking */ }
                }

                if (isBloodTest) {
                    // ─── Blood Test Success Route ──────────────────────────────
                    clearCategory('blood-test');
                    router.replace({
                        pathname: '/blood-test/success',
                        params: {
                            bookingId: sessionBookingId.current ?? '',
                            amount: String(finalAmount),
                            packageName: label,
                        },
                    });
                } else {
                    // ─── Service/Product Success Route ────────────────────────
                    // Clear cart for wellness/services/products
                    if (params.category) {
                        clearCategory(params.category);
                    }
                    router.replace({
                        pathname: '/payment/payment-success',
                        params: {
                            bookingId: sessionBookingId.current ?? '',
                            amount: String(finalAmount),
                            invoiceNumber: verifyRes.data?.invoice?.invoiceNumber ?? '',
                            invoicePdfUrl: verifyRes.data?.invoice?.pdfUrl ?? '',
                            isSubscription: isSubscription ? '1' : '0',
                            bookingPayload: params.bookingPayload || '',
                            bookingAmount: params.bookingAmount || '',
                            bookingLabel: params.bookingLabel || '',
                        },
                    });
                }
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
    }, [payLoading, finalAmount, selectedMethod, couponApplied, couponCode, params, label, router, collectionType, selectedDate, selectedTime, selectedAddress, serviceabilityStatus, phoneNumber]);

    // ─── Open Razorpay native popup ─────────────────────────
    const handlePay = useCallback(async () => {
        if (payLoading) return;

        // ─── Blood Test Validation ────────────────────────────────────────────
        if (isBloodTest) {
            if (!selectedDate || !selectedTime) {
                Alert.alert('Required', 'Please select collection date and time');
                return;
            }
            if (collectionType === 'HOME') {
                if (!selectedAddress || !selectedAddress.line1) {
                    Alert.alert('Address Required', 'Please select a collection address');
                    return;
                }
                if (!selectedAddress.pincode || selectedAddress.pincode.length !== 6) {
                    Alert.alert('Pincode Required', 'Please enter a valid 6-digit pincode');
                    return;
                }
                if (serviceabilityStatus === 'non-serviceable') {
                    Alert.alert('Location Not Serviceable', 'Collection is not available at this location. Please select a different address.');
                    return;
                }
                if (serviceabilityStatus !== 'serviceable') {
                    Alert.alert('Address Verification Needed', 'Please wait for address verification to complete, or try a different location.');
                    return;
                }
            }
            if (!phoneNumber?.trim() || phoneNumber.length < 10) {
                Alert.alert('Phone Required', 'Please enter a valid 10-digit phone number');
                return;
            }
            // Show summary confirmation before Razorpay
            setConfirmModalVisible(true);
            return;
        }

        await executePayment();
    }, [payLoading, isBloodTest, selectedDate, selectedTime, collectionType, selectedAddress, serviceabilityStatus, phoneNumber, executePayment]);

    // ─── UI ─────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout</Text>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

                {/* Order Summary */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Secure Payment Summary</Text>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>{label}</Text>
                        <Text style={styles.rowValue}>₹{baseAmount.toLocaleString('en-IN')}</Text>
                    </View>

                    {/* Breakdown Section */}
                    {!isSubscription && (
                        <View style={styles.breakdownSection}>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Consultation / Service Fee</Text>
                                <Text style={styles.breakdownValue}>₹{baseAmount.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Booking Fee</Text>
                                {benefitApplied ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={[styles.breakdownValue, { textDecorationLine: 'line-through', color: colors.textMuted }]}>₹{originalBookingFee}</Text>
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
                                        <Text style={[styles.breakdownValue, { textDecorationLine: 'line-through', color: colors.textMuted }]}>₹{originalPlatformFee}</Text>
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
                    )}


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
                                    ? <ActivityIndicator size="small" color={colors.textWhite} />
                                    : <Text style={styles.couponBtnText}>Apply</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Blood Test: Collection Date & Time */}
                {isBloodTest && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Collection Date & Time</Text>
                        <Text style={styles.sectionLabel}>Preferred Collection Date</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                            {(() => {
                                const days = [];
                                const start = selectedDate || new Date();
                                for (let i = 0; i < 14; i++) {
                                    const d = new Date(start);
                                    d.setDate(start.getDate() + i);
                                    days.push(d);
                                }
                                return days;
                            })().map((day, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.dayCard,
                                        selectedDate?.toDateString() === day.toDateString() && styles.dayCardActive,
                                    ]}
                                    onPress={() => setSelectedDate(day)}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        selectedDate?.toDateString() === day.toDateString() && styles.dayTextActive,
                                    ]}>
                                        {day.getDate()} {day.toLocaleDateString('en-US', { month: 'short' })}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>Collection Time</Text>
                        {slotsLoading ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: Spacing.md }} />
                        ) : slots.length > 0 ? (
                            <View style={styles.slotsGrid}>
                                {slots.map((slot, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.slotCard,
                                            selectedTime === (slot.slot || slot.slot_time) && styles.slotCardActive,
                                        ]}
                                        onPress={() => {
                                            setSelectedTime(slot.slot || slot.slot_time || '');
                                            setSelectedSlotId(slot.slot_id || 0);
                                        }}
                                    >
                                        <Text style={[
                                            styles.slotTime,
                                            selectedTime === (slot.slot || slot.slot_time) && styles.slotTimeActive,
                                        ]}>
                                            {slot.slot || slot.slot_time}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.noSlotsText}>No slots available for this date</Text>
                        )}
                    </View>
                )}

                {/* Blood Test: Collection Type */}
                {isBloodTest && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Collection Type</Text>
                        <TouchableOpacity
                            style={[styles.collectionOption, collectionType === 'HOME' && styles.collectionOptionActive]}
                            onPress={() => setCollectionType('HOME')}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="home" size={20} color={collectionType === 'HOME' ? colors.primary : colors.textLight} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.collectionOptionTitle, collectionType === 'HOME' && { color: colors.textDark }]}>Home Collection</Text>
                                <Text style={styles.collectionOptionDesc}>We&apos;ll collect sample from your home</Text>
                            </View>
                            <Ionicons name={collectionType === 'HOME' ? 'checkmark-circle' : 'radio-button-off'} size={22} color={collectionType === 'HOME' ? colors.primary : '#D1D5DB'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.collectionOption, collectionType === 'LAB' && styles.collectionOptionActive]}
                            onPress={() => setCollectionType('LAB')}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="business" size={20} color={collectionType === 'LAB' ? colors.primary : colors.textLight} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.collectionOptionTitle, collectionType === 'LAB' && { color: colors.textDark }]}>Lab Visit</Text>
                                <Text style={styles.collectionOptionDesc}>Drop your sample at the nearest lab</Text>
                            </View>
                            <Ionicons name={collectionType === 'LAB' ? 'checkmark-circle' : 'radio-button-off'} size={22} color={collectionType === 'LAB' ? colors.primary : '#D1D5DB'} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Blood Test: Collection Address — Using AddressPickerSection */}
                {isBloodTest && collectionType === 'HOME' && (
                    <AddressPickerSection
                        selectedAddress={selectedAddress}
                        onAddressChange={setSelectedAddress}
                        showServiceabilityCheck={true}
                        serviceabilityStatus={serviceabilityStatus}
                        onServiceabilityChange={setServiceabilityStatus}
                        checkServiceabilityFn={async (lat: string, lng: string) => {
                            try {
                                const result: any = await labService.checkServiceability(lat, lng);
                                const isServiceable = result?.status === 'success' || result?.data?.status === 'success' || result?.serviceable === true;
                                setServiceabilityStatus(isServiceable ? 'serviceable' : 'non-serviceable');
                                return isServiceable;
                            } catch {
                                setServiceabilityStatus('non-serviceable');
                                return false;
                            }
                        }}
                        phoneNumber={phoneNumber}
                        onPhoneChange={setPhoneNumber}
                        landmark={landmark}
                        onLandmarkChange={setLandmark}
                        title="Collection Address"
                        showPhoneField={true}
                        showLandmarkField={true}
                        allowManualEntry={true}
                        initialLat={parseFloat(coords.lat)}
                        initialLng={parseFloat(coords.long)}
                    />
                )}

                {/* Delivery Address — Only for wellness/products — Using AddressPickerSection */}
                {params.category === 'wellness' && (
                    <AddressPickerSection
                        selectedAddress={selectedAddress}
                        onAddressChange={setSelectedAddress}
                        showServiceabilityCheck={false}
                        phoneNumber={phoneNumber}
                        onPhoneChange={setPhoneNumber}
                        title="Delivery Address"
                        showPhoneField={true}
                        showLandmarkField={false}
                        allowManualEntry={true}
                    />
                )}

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
                            <Ionicons name={m.icon} size={20} color={selectedMethod === m.type ? colors.primary : colors.textLight} />
                            <Text style={[styles.methodLabel, selectedMethod === m.type && styles.methodLabelActive]}>
                                {m.label}
                            </Text>
                            <Ionicons
                                name={selectedMethod === m.type ? 'radio-button-on' : 'radio-button-off'}
                                size={20}
                                color={selectedMethod === m.type ? colors.primary : colors.textLight}
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

            {/* Serviceability Alert for Blood Test */}
            {isBloodTest && serviceabilityStatus === 'non-serviceable' && selectedAddress && (
                <View style={styles.warningBanner}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text style={styles.warningText}>
                        Collection unavailable here. Please select a different address.
                    </Text>
                </View>
            )}

            {/* Pay Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.payBtn,
                        (payLoading || (isBloodTest && serviceabilityStatus === 'non-serviceable')) && styles.payBtnLoading
                    ]}
                    onPress={handlePay}
                    disabled={payLoading || (isBloodTest && serviceabilityStatus === 'non-serviceable')}
                    activeOpacity={0.85}
                >
                    {payLoading
                        ? <ActivityIndicator color={colors.textWhite} />
                        : <>
                            <Ionicons name={selectedMethod === 'CASH' ? "checkmark-circle-outline" : "lock-closed-outline"} size={18} color={colors.textWhite} />
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

            {/* Blood Test: Order Confirmation Modal */}
            {isBloodTest && (
                <Modal visible={confirmModalVisible} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Confirm Your Booking</Text>

                            <View style={styles.modalSummary}>
                                {bloodTestItems.map((item, idx) => (
                                    <View key={idx} style={styles.modalRow}>
                                        <Ionicons name="flask-outline" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={styles.modalRowLabel} numberOfLines={1}>{item.title}</Text>
                                        <Text style={styles.modalRowValue}>₹{item.price}</Text>
                                    </View>
                                ))}

                                <View style={[styles.modalRow, styles.modalDivider]}>
                                    <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.modalRowLabel}>Date & Time</Text>
                                    <Text style={styles.modalRowValue} numberOfLines={1}>
                                        {selectedDate?.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, {selectedTime}
                                    </Text>
                                </View>

                                <View style={[styles.modalRow, styles.modalDivider]}>
                                    <Ionicons name={collectionType === 'LAB' ? 'business-outline' : 'home-outline'} size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.modalRowLabel}>Collection</Text>
                                    <Text style={styles.modalRowValue}>{collectionType === 'LAB' ? 'Lab Visit' : 'Home Collection'}</Text>
                                </View>

                                {collectionType === 'HOME' && selectedAddress?.line1 && (
                                    <View style={[styles.modalRow, styles.modalDivider]}>
                                        <Ionicons name="location-outline" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={styles.modalRowLabel}>Address</Text>
                                        <Text style={[styles.modalRowValue, { maxWidth: '55%' }]} numberOfLines={2}>{selectedAddress.line1}</Text>
                                    </View>
                                )}

                                <View style={[styles.modalRow, styles.modalDivider, { marginTop: 4 }]}>
                                    <Ionicons name="cash-outline" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.modalRowLabel, { fontFamily: Fonts.semiBold, color: colors.textDark }]}>Total Payable</Text>
                                    <Text style={[styles.modalRowValue, { fontFamily: Fonts.semiBold, fontSize: 16, color: colors.primary }]}>
                                        ₹{finalAmount.toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setConfirmModalVisible(false)}
                                >
                                    <Text style={styles.modalCancelText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalConfirmBtn}
                                    onPress={() => {
                                        setConfirmModalVisible(false);
                                        executePayment();
                                    }}
                                >
                                    {payLoading
                                        ? <ActivityIndicator size="small" color="#FFFFFF" />
                                        : <Text style={styles.modalConfirmText}>
                                            {selectedMethod === 'CASH' ? 'Confirm Booking' : `Confirm & Pay`}
                                          </Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.primary },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    },
    backBtn: { padding: 8 },
    headerTitle: { 
        fontFamily: Fonts.semiBold, 
        fontSize: FontSize.heading2, 
        color: colors.textWhite,
        marginLeft: 12,
    },

    body: { flex: 1, backgroundColor: colors.bgScreen ?? '#FAFAF0', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    bodyContent: { padding: Spacing.xl, paddingBottom: 100, gap: Spacing.lg },

    card: {
        backgroundColor: colors.bgCard, borderRadius: Radius.lg ?? 12, padding: Spacing.xl, gap: Spacing.md,
        elevation: 1, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
    },
    cardTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark, marginBottom: Spacing.xs ?? 4 },

    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowLabel: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textLight },
    rowValue: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textDark },

    breakdownSection: {
        backgroundColor: colors.bgCardMuted,
        borderRadius: Radius.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
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
        color: colors.textMuted
    },
    breakdownValue: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption ?? 12,
        color: colors.textDark
    },

    totalRow: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
    totalLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark },
    totalValue: { fontFamily: Fonts.semiBold, fontSize: 20, color: colors.primary },
    gstNote: { fontFamily: Fonts.regular, fontSize: FontSize.caption ?? 12, color: colors.textMuted },

    couponRow: { flexDirection: 'row', gap: Spacing.sm },
    couponInput: {
        flex: 1, height: 44, borderWidth: 1.5, borderColor: colors.borderLight, borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textDark,
        backgroundColor: colors.bgCardMuted,
    },
    couponBtn: { paddingHorizontal: Spacing.lg, height: 44, backgroundColor: colors.primary, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
    couponBtnDisabled: { opacity: 0.45 },
    couponBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textWhite },
    couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isDarkMode ? 'rgba(46,125,50,0.1)' : '#E8F5E9', padding: Spacing.md, borderRadius: Radius.sm },
    couponAppliedText: { flex: 1, fontFamily: Fonts.medium, fontSize: FontSize.caption ?? 13, color: '#2e7d32' },

    methodRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: Spacing.md, 
        paddingVertical: Spacing.md, 
        paddingHorizontal: Spacing.lg, 
        borderRadius: Radius.md, 
        borderWidth: 1.5, 
        borderColor: colors.borderLight,
        backgroundColor: colors.bgCard,
    },
    methodRowActive: { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : '#F0FAF4' },
    methodLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textLight },
    methodLabelActive: { color: colors.textDark, fontFamily: Fonts.medium },

    securityNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md },
    securityText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSize.caption ?? 12, color: colors.textMuted, lineHeight: 18 },

    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.bgScreen ?? '#FAFAF0',
        padding: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl + 16 : Spacing.xl,
        borderTopWidth: 1, borderTopColor: colors.borderLight,
    },
    payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: Radius.lg ?? 12 },
    payBtnLoading: { opacity: 0.7 },
    payBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textWhite },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: '#FEE2E2',
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
    },
    warningText: {
        flex: 1,
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: '#991B1B',
    },
    benefitNote: {
        fontFamily: Fonts.medium,
        fontSize: 10,
        color: '#2e7d32',
        textAlign: 'right',
        marginTop: -2,
    },
    savingsBadge: {
        backgroundColor: isDarkMode ? 'rgba(46,125,50,0.1)' : '#E8F5E9',
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

    addressCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        backgroundColor: colors.bgCard,
    },
    addressCardActive: {
        borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : '#F0FAF4',
    },
    addressLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: colors.textDark,
    },
    addressSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption ?? 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    defaultBadge: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        color: colors.primary,
        marginTop: 4,
    },
    noAddressText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textMuted,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },

    // Blood Test Specific Styles
    sectionLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
        color: colors.textDark,
        marginBottom: Spacing.sm,
    },
    daysScroll: { marginBottom: Spacing.md },
    dayCard: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginRight: 8,
        minWidth: 90,
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    dayCardActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        shadowOpacity: 0.1,
    },
    dayText: {
        fontFamily: Fonts.medium,
        fontSize: 13,
        color: colors.textDark,
    },
    dayTextActive: { color: '#fff' },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    slotCard: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    slotCardActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        shadowOpacity: 0.1,
    },
    slotTime: {
        fontFamily: Fonts.medium,
        fontSize: 12,
        color: colors.textDark,
    },
    slotTimeActive: { color: '#fff' },
    noSlotsText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textMuted,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: Radius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textDark,
        marginTop: Spacing.md,
        backgroundColor: colors.bgCard,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 1,
        elevation: 1,
    },
    serviceabilityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1,
        marginTop: Spacing.md,
    },

    // Collection Type
    collectionOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: Radius.md,
        backgroundColor: colors.bgCard,
        marginBottom: 8,
    },
    collectionOptionActive: {
        borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : '#F0FAF4',
    },
    collectionOptionTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: colors.textMuted,
    },
    collectionOptionDesc: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption ?? 12,
        color: colors.textMuted,
        marginTop: 2,
    },

    // Confirmation Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 36,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 16,
        color: colors.textDark,
        marginBottom: 16,
    },
    modalSummary: {
        backgroundColor: colors.bgCardMuted,
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    modalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    modalDivider: {
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        marginTop: 4,
    },
    modalRowLabel: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: colors.textMuted,
    },
    modalRowValue: {
        fontFamily: Fonts.medium,
        fontSize: 13,
        color: colors.textDark,
        textAlign: 'right',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: 'center',
    },
    modalCancelText: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        color: colors.primary,
    },
    modalConfirmBtn: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: 13,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalConfirmText: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        color: '#FFFFFF',
    },
});

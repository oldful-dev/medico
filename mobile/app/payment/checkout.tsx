// Payment Screen — Razorpay native in-app popup
// Flow: Order summary → optional coupon → create booking → initiate order → native Razorpay → verify → success
// Edge cases: cancel (ondismiss), failure (retry), app crash (AsyncStorage recovery)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, StyleSheet, Platform, Alert, NativeModules, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { useTranslation } from 'react-i18next';
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
import { planService, Plan, BillingCycle } from '@/services/api/planService';

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
    const { t } = useTranslation();
    const { profile, refreshData, isLoading } = useUser();
    const { items, clearCategory, removeItems } = useCart();
    const rupee = <Text style={{ fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' }}>₹</Text>;

    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        // ─── Existing booking ID (legacy: service screens pre-created the booking)
        bookingId?: string;
        // ─── New: serialised CreateBookingPayload — checkout creates the booking itself
        bookingPayload?: string;
        subscriptionId?: string;
        upgradeSubId?: string;
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
        checkoutRoute?: string;
        selectedItemIds?: string;
    }>();

    const [productOrderId, setProductOrderId] = useState<string | null>(null);

    // Split items if category is 'all' or specific categories
    const selectedIds = params.selectedItemIds ? params.selectedItemIds.split(',') : [];
    const selectedItems = items.filter(i => selectedIds.length === 0 || selectedIds.includes(i.id));

    const isCategoryAll = params.category === 'all';
    
    // Blood test items: if category is 'blood-test' or 'all' (with blood test items selected)
    const bloodTestItems = (params.category === 'blood-test' || isCategoryAll)
        ? selectedItems.filter(i => i.serviceType?.toLowerCase().includes('blood') || i.serviceType === 'Bloodwork')
        : [];

    // Wellness items: if category is 'wellness' or 'all' (with wellness items selected)
    const wellnessItems = (params.category === 'wellness' || isCategoryAll)
        ? selectedItems.filter(i => i.serviceType === 'product')
        : [];

    const isBloodTest = bloodTestItems.length > 0;
    const isWellness = wellnessItems.length > 0;

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

    const isSubscription = !!params.subscriptionId || !!params.upgradeSubId;

    // ─── COD Restriction: Hide CASH if it's a subscription ──────────────────
    const availableMethods = isSubscription 
        ? PAYMENT_METHODS.filter(m => m.type !== 'CASH')
        : PAYMENT_METHODS;

    const bloodTestBaseAmount = bloodTestItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    const wellnessBaseAmount = wellnessItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    const baseAmount = isCategoryAll ? (bloodTestBaseAmount + wellnessBaseAmount) : parseFloat(params.amount ?? '0');
    const label  = params.label ?? 'Service Booking';

    const [calculatedPrices, setCalculatedPrices] = useState<{
        totalAmount: number;
        taxPercentage?: number;
        requiredPlanType?: 'CARE' | 'HOMEMAKER' | null;
        breakdown: {
            vendorFee: number;
            diagnosticFee: number;
            bookingFee: number;
            platformFee: number;
            taxes: number;
            ayuxaServiceFee: number;
            benefitDiscount: number;
            convenienceFee?: number;
            emergencyFee?: number;
            visitFee?: number;
            nightCharge?: number;
            surgeCharge?: number;
        };
        benefitApplied: boolean;
    } | null>(null);

    const CARE_CATEGORIES = [
        "DOCTOR_HOME_VISIT", "DOCTOR_VISIT", "TELECONSULT",
        "HOME_NURSE", "NURSE_VISIT", "CAREGIVER_VISIT", "CAREGIVER",
        "HOSPITAL_TRIP", "HOSPITAL_ACCOMPANIMENT", "TRANSPORTATION", "PICKUP_DROP",
        "BLOOD_TEST", "SCAN_ECG", "DIAGNOSTICS",
        "PHYSIO_FITNESS",
        "COMPANIONSHIP_CALL", "COMPANIONSHIP", "SPIRITUAL_ESCORT",
        "MEDICINE_DELIVERY",
        "LOCAL_MEETUP", "MEETUP",
        "PHONE_SUPPORT", "SOS",
        "BASE_PLAN", "CARE_MANAGER", "FAMILY_PORTAL",
    ];
    const HOME_CATEGORIES = [
        "HANDYMEN", "ZERO_SERVICE_FEE",
        "BILL_PAYMENT", "TECH_SUPPORT", "TECH_HELPER",
        "GROCERY_ASSIST", "GROCERY_RUN",
        "PAPERWORK_ASSIST", "BANK_PAPERWORK", "PAPER_LEGAL", "PAPERWORK_LEGAL",
        "DEEP_CLEANING", "SANITATION", "HOME_AUDIT", "CUSTOM_REQUEST", "ANYTHING_ELSE",
    ];

    const serviceCategory = params.bookingPayload ? mapLabelToCategory(label) : (isBloodTest ? 'BLOOD_TEST' : 'OTHER');
    const category = serviceCategory.toUpperCase();
    const upsellPlanType: 'CARE' | 'HOMEMAKER' | null = (calculatedPrices?.requiredPlanType as any) || (
        CARE_CATEGORIES.includes(category)
            ? "CARE"
            : HOME_CATEGORIES.includes(category)
                ? "HOMEMAKER"
                : null
    );

    const [isPaidBookingOverride, setIsPaidBookingOverride] = useState(false);
    const hasActivePlanForCategoryRaw = profile?.subscriptions?.some(
        (s: any) =>
            s.status === "ACTIVE" &&
            ((upsellPlanType === "CARE" && (s.plan?.planType === "CARE" || s.planType === "CARE" || s.category === "CARE")) ||
             (upsellPlanType === "HOMEMAKER" && (s.plan?.planType === "HOMEMAKER" || s.planType === "HOMEMAKER" || s.category === "HOMEMAKER")))
    ) ?? false;
    const hasActivePlanForCategory = hasActivePlanForCategoryRaw && !isPaidBookingOverride;

    const [eligiblePlans, setEligiblePlans] = useState<Plan[]>([]);
    const [loadingEligiblePlans, setLoadingEligiblePlans] = useState(false);
    const [isUpgraded, setIsUpgraded] = useState(false);
    const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
    const [selectedDuration, setSelectedDuration] = useState<BillingCycle>("QUARTERLY");

    const selectedUpgradePlan = eligiblePlans[selectedPlanIndex] || null;
    const [savingsInfo, setSavingsInfo] = useState<{
        bookingFeeWaived: number;
        platformFeeWaived: number;
        gstWaived: number;
        totalSavings: number;
        finalPayable: number;
        bookingTotalWithoutUpgrade: number;
        bookingTotalWithUpgrade: number;
        planPrice: number;
    } | null>(null);
    const [savingsLoading, setSavingsLoading] = useState(false);

    useEffect(() => {
        const fetchEligiblePlans = async () => {
            if (hasActivePlanForCategory || !upsellPlanType) return;
            try {
                setLoadingEligiblePlans(true);
                const res = await planService.getPlansByType(upsellPlanType);
                if (res.success && res.data) {
                    setEligiblePlans(res.data);
                    setSelectedPlanIndex(0);
                }
            } catch (e) {
                console.warn("Failed to fetch eligible plans:", e);
            } finally {
                setLoadingEligiblePlans(false);
            }
        };
        fetchEligiblePlans();
    }, [category, hasActivePlanForCategory, upsellPlanType]);

    useEffect(() => {
        const recalculateSavings = async () => {
            if (!isUpgraded || !selectedUpgradePlan) {
                setSavingsInfo(null);
                return;
            }
            try {
                setSavingsLoading(true);
                const fee = isBloodTest ? bloodTestBaseAmount : baseAmount;
                const res = await paymentService.calculateMembershipSavings({
                    serviceCategory: category,
                    vendorFee: fee,
                    diagnosticFee: 0,
                    planId: selectedUpgradePlan.id,
                    billingCycle: selectedDuration,
                });
                if (res.success && res.data) {
                    setSavingsInfo(res.data);
                }
            } catch (e) {
                console.warn("Failed to calculate membership savings:", e);
            } finally {
                setSavingsLoading(false);
            }
        };
        recalculateSavings();
    }, [isUpgraded, selectedDuration, baseAmount, bloodTestBaseAmount, isBloodTest, selectedUpgradePlan, category]);

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(isSubscription ? 'UPI' : 'UPI');
    const [couponCode,     setCouponCode]     = useState('');
    const [couponApplied,  setCouponApplied]  = useState(false);
    const [discount,       setDiscount]       = useState(0);
    const [couponLoading,  setCouponLoading]  = useState(false);
    const [payLoading,     setPayLoading]     = useState(false);
    const [, setFlowState] = useState<PaymentFlowState>('idle');
    const [, setPendingRecovery] = useState(false);

    // ─── Wellness Specific State ───────────────────────────────────────────
    const [shippingDetails, setShippingDetails] = useState<{
        rate: number;
        courierName: string;
        estimatedDays: string;
        available: boolean;
    } | null>(null);
    const [shippingLoading, setShippingLoading] = useState(false);

    // ─── Address Selection (for product/wellness/blood-test deliveries) ──────
    const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [landmark, setLandmark] = useState('');

    // ─── Sync phone from profile when it loads
    useEffect(() => {
        if (profile?.phone && !phoneNumber) {
            const cleanPhone = profile.phone.startsWith('+91') ? profile.phone.slice(3) : profile.phone;
            setPhoneNumber(cleanPhone);
        }
    }, [profile?.phone]);

    // ─── Sync default address from profile when it loads (for wellness & blood-test)
    useEffect(() => {
        if (profile?.addresses?.length && !selectedAddress) {
            const defaultAddr = (profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0]) as any;
            if (defaultAddr) {
                setSelectedAddress({
                    id: defaultAddr.id,
                    line1: defaultAddr.line1 || '',
                    line2: defaultAddr.line2,
                    cityName: defaultAddr.cityName || '',
                    pincode: defaultAddr.pincode || '',
                    landmark: defaultAddr.landmark,
                    latitude: defaultAddr.latitude || 28.7041,
                    longitude: defaultAddr.longitude || 77.1025,
                    fullName: defaultAddr.fullName || profile.name || '',
                    phone: defaultAddr.phone || '',
                    state: defaultAddr.state || '',
                    country: defaultAddr.country || 'India',
                });
            }
        }
    }, [profile?.addresses, selectedAddress, profile?.name]);

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

    useEffect(() => {
        if (params.bookingPayload || (isBloodTest && !isSubscription)) {
            const fetchCalculation = async () => {
                setCalcLoading(true);
                try {
                    const category = params.bookingPayload ? mapLabelToCategory(label) : 'BLOOD_TEST';
                    const fee = params.bookingPayload ? baseAmount : bloodTestBaseAmount;
                    const res = await paymentService.calculateCheckout({
                        serviceCategory: category,
                        vendorFee: fee,
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
        } else {
            setCalculatedPrices(null);
        }
    }, [params.bookingPayload, isBloodTest, bloodTestBaseAmount, isSubscription, label]);

    const benefitApplied = !!calculatedPrices?.benefitApplied;
    const bookingFee = isSubscription ? 0 : (calculatedPrices ? calculatedPrices.breakdown.bookingFee : 299);
    const platformFee = isSubscription ? 0 : (calculatedPrices ? calculatedPrices.breakdown.platformFee : 50);

    const convenienceFee = calculatedPrices ? (calculatedPrices.breakdown.convenienceFee || 0) : 0;
    const emergencyFee = calculatedPrices ? (calculatedPrices.breakdown.emergencyFee || 0) : 0;
    const visitFee = calculatedPrices ? (calculatedPrices.breakdown.visitFee || 0) : 0;
    const nightCharge = calculatedPrices ? (calculatedPrices.breakdown.nightCharge || 0) : 0;
    const surgeCharge = calculatedPrices ? (calculatedPrices.breakdown.surgeCharge || 0) : 0;
    const extraFeesSum = bookingFee + platformFee + convenienceFee + emergencyFee + visitFee + nightCharge + surgeCharge;
    const displayServiceFee = calculatedPrices ? calculatedPrices.breakdown.vendorFee : baseAmount;

    // serviceCategory is already defined above

    const isHomeEssentialService = 
        serviceCategory === 'HOME_ESSENTIALS' || 
        serviceCategory === 'PLUMBING_ELECTRICAL' || 
        serviceCategory === 'APPLIANCE_REPAIR' || 
        serviceCategory === 'TECH_HELPER' || 
        serviceCategory === 'DEEP_CLEANING' ||
        serviceCategory === 'GROCERY_RUN';

    const isDiagnosticOrFitnessService = 
        serviceCategory === 'BLOOD_TEST' || 
        serviceCategory === 'SCAN_ECG' || 
        serviceCategory === 'PHYSIO_FITNESS' ||
        serviceCategory === 'DIAGNOSTICS_FITNESS';

    const fallbackTaxPercentage = isHomeEssentialService ? 18 : (isDiagnosticOrFitnessService ? 18 : 6);
    const taxRateDisplay = calculatedPrices ? (calculatedPrices.taxPercentage ?? fallbackTaxPercentage) : fallbackTaxPercentage;

    let fallbackTaxableAmount = 0;
    if (isHomeEssentialService) {
        fallbackTaxableAmount = Number(baseAmount || 0) + extraFeesSum;
    } else {
        fallbackTaxableAmount = extraFeesSum;
    }

    const fallbackTax = Math.round(fallbackTaxableAmount * (fallbackTaxPercentage / 100));

    const taxes = isSubscription ? 0 : (calculatedPrices ? calculatedPrices.breakdown.taxes : fallbackTax);
    
    // Original charges before waiver (for displaying stroke-through / FREE)
    const showWaiver = benefitApplied || (isSubscription && !!params.bookingPayload) || isUpgraded;
    const originalBookingFee = showWaiver 
        ? (calculatedPrices?.benefitApplied 
            ? (Math.abs(calculatedPrices.breakdown.benefitDiscount) > 50 ? Math.abs(calculatedPrices.breakdown.benefitDiscount) - 50 : 299)
            : (calculatedPrices ? calculatedPrices.breakdown.bookingFee : 299))
        : bookingFee;
    const originalPlatformFee = showWaiver
        ? (calculatedPrices?.benefitApplied ? 50 : (calculatedPrices ? calculatedPrices.breakdown.platformFee : 50))
        : platformFee;

    const bloodTestTotal = isSubscription 
        ? bloodTestBaseAmount 
        : (calculatedPrices ? calculatedPrices.totalAmount : (bloodTestBaseAmount + extraFeesSum + taxes));

    const wellnessTax = Math.round(wellnessBaseAmount * 0.18);
    const wellnessShipping = Math.round(shippingDetails?.rate || 0);
    const wellnessTotal = wellnessBaseAmount + wellnessTax + wellnessShipping;

    const isLegacyService = !isBloodTest && !isWellness;
    const legacyServiceTotal = isSubscription
        ? baseAmount
        : (calculatedPrices ? calculatedPrices.totalAmount : (baseAmount + extraFeesSum + taxes));

    const amountWithTaxAndFee = isUpgraded && savingsInfo
        ? savingsInfo.finalPayable
        : (isLegacyService
            ? legacyServiceTotal
            : ((isBloodTest ? bloodTestTotal : 0) + (isWellness ? wellnessTotal : 0)));

    const displayTaxes = isUpgraded && savingsInfo
        ? Math.max(0, taxes - savingsInfo.gstWaived)
        : taxes;

    const [finalAmount,    setFinalAmount]    = useState(Math.round(amountWithTaxAndFee));

    useEffect(() => { setFinalAmount(Math.round(amountWithTaxAndFee - discount)); }, [amountWithTaxAndFee, discount]);

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

    // ─── Wellness: Fetch shipping rate when address changes
    useEffect(() => {
        if (!isWellness || !selectedAddress || !selectedAddress.pincode) {
            return;
        }
        const fetchShippingRate = async () => {
            setShippingLoading(true);
            try {
                const res = await storeService.getShippingRate({
                    pincode: selectedAddress.pincode,
                    items: wellnessItems.map(i => ({
                        productId: i.id,
                        quantity: i.quantity || 1,
                    })),
                });
                if (res.success && res.data) {
                    setShippingDetails(res.data);
                }
            } catch (e) {
                console.warn('Failed to fetch shipping rate:', e);
            } finally {
                setShippingLoading(false);
            }
        };
        fetchShippingRate();
    }, [selectedAddress?.id, selectedAddress?.pincode, params.category]);

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
                        t('checkout.pending_payment_title'),
                        t('checkout.pending_payment_msg'),
                        [
                            {
                                text: t('checkout.dismiss'),
                                style: 'cancel',
                                onPress: async () => {
                                    // Clear stale pending order
                                    await storageService.removeItem(STORAGE_KEYS.PENDING_ORDER_ID);
                                    await storageService.removeItem(STORAGE_KEYS.PENDING_BOOKING_ID);
                                    setPendingRecovery(false);
                                },
                            },
                            {
                                text: t('checkout.check_status'),
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
                Alert.alert(t('checkout.coupon_applied_title'), t('checkout.coupon_saved', { amount: res.data.discount.toLocaleString('en-IN') }));
            } else {
                Alert.alert(t('checkout.invalid_coupon'), t('checkout.invalid_coupon_msg'));
            }
        } catch {
            Alert.alert(t('common.error'), t('checkout.coupon_error'));
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
        if (isWellness) {
            // Check if all wellness products are still enabled
            try {
                const res = await storeService.getProducts({ limit: 1000 });
                const disabledItems: string[] = [];
                wellnessItems.forEach(item => {
                    const product = (res.data || []).find(p => p.id === item.id);
                    if (!product || !product.isEnabled) {
                        disabledItems.push(item.title);
                    }
                });
                if (disabledItems.length > 0) {
                    Alert.alert(
                        t('checkout.products_unavailable'),
                        t('checkout.products_unavailable_msg'),
                        [{ text: t('common.ok'), onPress: () => router.back() }]
                    );
                    setPayLoading(false);
                    return;
                }
            } catch (e) {
                console.warn('Failed to validate product status:', e);
            }

            if (!selectedAddress || !selectedAddress.line1) {
                Alert.alert(t('checkout.address_required'), t('checkout.address_required_msg'));
                return;
            }
            if (!selectedAddress.pincode || selectedAddress.pincode.length !== 6) {
                Alert.alert(t('checkout.pincode_required'), t('checkout.pincode_required_msg'));
                return;
            }
        }

        setPayLoading(true);
        try {
            // ─── STEP 1: Create bookings ONLY if we don't already have them
            setFlowState('creating_booking');
            let lastBookingId = isBloodTest ? sessionBookingId.current : null;
            let lastProductOrderId = isWellness ? productOrderId : null;

            if (isBloodTest && !lastBookingId) {
                // ─── Blood Test Booking ───────────────────────────────────────
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
                        phone: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`,
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
                        Alert.alert(t('checkout.booking_error'), t('checkout.blood_test_booking_error', { name: item.title || 'Blood Test' }));
                        return;
                    }
                    lastBookingId = (bookingRes as any).id;
                }
                sessionBookingId.current = lastBookingId;
            }

            if (isWellness && !lastProductOrderId) {
                // Create multi-item product order
                const checkoutPayload = {
                    items: wellnessItems.map(i => ({
                        productId: i.id,
                        quantity: i.quantity || 1,
                    })),
                    addressId: selectedAddress?.id,
                    address: selectedAddress ? JSON.stringify({
                        fullName: selectedAddress.fullName || profile?.name || '',
                        phone: phoneNumber || selectedAddress.phone || '',
                        line1: selectedAddress.line1,
                        line2: selectedAddress.line2,
                        city: selectedAddress.cityName,
                        state: selectedAddress.state,
                        pincode: selectedAddress.pincode,
                        country: selectedAddress.country || 'India',
                    }) : undefined,
                    pincode: selectedAddress?.pincode,
                };
                const checkoutRes = await storeService.checkoutCart(checkoutPayload);
                if (!checkoutRes.success || !checkoutRes.data?.order) {
                    setFlowState('failed');
                    Alert.alert(t('checkout.booking_error'), checkoutRes.message || t('checkout.booking_error'));
                    return;
                }
                lastProductOrderId = checkoutRes.data.order.id;
                setProductOrderId(lastProductOrderId);
            }

            if (isLegacyService && !sessionBookingId.current && params.bookingPayload && !params.subscriptionId) {
                // ─── Service/Product Booking ──────────────────────────────────
                const payload = JSON.parse(params.bookingPayload as string);
                const bookingRes = await bookingService.createBooking({
                    ...payload,
                    amount: finalAmount,
                    paymentMethod: selectedMethod,
                });
                if (!bookingRes.success || !bookingRes.data) {
                    setFlowState('failed');
                    Alert.alert(t('checkout.booking_error'), bookingRes.message ?? t('checkout.booking_error'));
                    return;
                }
                sessionBookingId.current = bookingRes.data.id;
            }

            // ─── STEP 2: Handle COD (Cash on Delivery) vs Razorpay
            if (selectedMethod === 'CASH') {
                // COD Flow — Direct success (Booking is already PENDING)
                setFlowState('success');
                
                // Confirm the lab order at partner end!
                if (isBloodTest && lastBookingId) {
                    try {
                        await labService.confirmBooking({
                            labOrderId: lastBookingId,
                            razorpayOrderId: 'COD',
                            isPaid: false
                        });
                    } catch (err) {
                        console.warn('Failed to confirm COD lab booking:', err);
                    }
                }

                // Clear cart categories
                if (params.selectedItemIds) {
                    removeItems(params.selectedItemIds.split(','));
                } else {
                    if (isBloodTest) clearCategory('blood-test');
                    if (isWellness) clearCategory('product');
                    if (isLegacyService && params.category) {
                        clearCategory(params.category === 'wellness' ? 'product' : params.category);
                    }
                }

                let alertMsg = '';
                if (isBloodTest && isWellness) {
                    alertMsg = t('checkout.combined_confirmed_msg') || `Your blood test and wellness product orders have been confirmed successfully via Cash on Delivery.`;
                } else if (isBloodTest) {
                    alertMsg = t('checkout.blood_test_confirmed_msg', { amount: Math.round(finalAmount).toLocaleString('en-IN') });
                } else if (isWellness) {
                    alertMsg = t('checkout.booking_received_msg', { amount: Math.round(finalAmount).toLocaleString('en-IN') }) || `Your order of ₹${Math.round(finalAmount)} has been placed successfully via Cash on Delivery.`;
                } else {
                    alertMsg = t('checkout.booking_received_msg', { amount: Math.round(finalAmount) });
                }

                Alert.alert(
                    t('checkout.booking_confirmed') || 'Booking Confirmed',
                    alertMsg,
                    [{ text: t('common.ok'), onPress: () => {
                        if (isBloodTest && !isWellness) {
                            router.replace({
                                pathname: '/blood-test/success',
                                params: { bookingId: lastBookingId!, amount: String(finalAmount), packageName: label }
                            });
                        } else if (isWellness || (isBloodTest && isWellness)) {
                            router.replace({
                                pathname: '/my-bookings',
                                params: { tab: 'wellness' }
                            } as any);
                        } else {
                            router.replace({
                                pathname: '/service-confirmation',
                                params: { bookingId: sessionBookingId.current! }
                            });
                        }
                    }}]
                );
                return;
            }

            // ─── STEP 3: Create Razorpay order on backend
            setFlowState('initiating_order');
            const initiatePayload: any = {
                amount: finalAmount,
                paymentMethod: selectedMethod,
                couponCode: couponApplied ? couponCode : undefined,
                ...(isUpgraded && selectedUpgradePlan && {
                    upgradePlanId: selectedUpgradePlan.id,
                    upgradeBillingCycle: selectedDuration,
                }),
            };

            if (isBloodTest) {
                initiatePayload.labOrderId = lastBookingId ?? undefined;
            }
            if (isWellness) {
                initiatePayload.productOrderId = lastProductOrderId ?? undefined;
            }
            if (isLegacyService) {
                if (params.bookingPayload && !params.subscriptionId) {
                    initiatePayload.bookingId = sessionBookingId.current ?? undefined;
                } else {
                    initiatePayload.subscriptionId = params.subscriptionId;
                }
            }

            const initiateRes = await paymentService.initiatePayment(initiatePayload);

            if (!initiateRes.success || !initiateRes.data) {
                setFlowState('failed');
                Alert.alert(t('checkout.payment_error'), initiateRes.message ?? t('checkout.payment_error'));
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
                        checkoutRoute: params.checkoutRoute || '',
                    },
                });
                return;
            }

            // ─── STEP 5: Guard — native module must exist (fails in Expo Go)
            if (!NativeModules.RNRazorpayCheckout) {
                Alert.alert(
                    t('checkout.build_required'),
                    t('checkout.build_required_msg'),
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

                // Clear cart categories
                if (params.selectedItemIds) {
                    removeItems(params.selectedItemIds.split(','));
                } else {
                    if (isBloodTest) clearCategory('blood-test');
                    if (isWellness) clearCategory('product');
                    if (isLegacyService && params.category) {
                        clearCategory(params.category === 'wellness' ? 'product' : params.category);
                    }
                }

                if (isBloodTest && !isWellness) {
                    // ─── Blood Test Success Route ──────────────────────────────
                    router.replace({
                        pathname: '/blood-test/success',
                        params: {
                            bookingId: lastBookingId ?? '',
                            amount: String(finalAmount),
                            packageName: label,
                        },
                    });
                } else if (isWellness || (isBloodTest && isWellness)) {
                    // ─── Wellness or Combined Success Route ─────────────────────
                    router.replace({
                        pathname: '/my-bookings',
                        params: { tab: 'wellness' }
                    } as any);
                } else {
                    // ─── Service Success Route ──────────────────────────────────
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
                            checkoutRoute: params.checkoutRoute || '',
                            category: params.category || '',
                        },
                    });
                }
            } else {
                setFlowState('failed');
                Alert.alert(
                    t('checkout.verification_failed'),
                    t('checkout.verification_failed_msg'),
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
                    t('checkout.payment_cancelled'),
                    t('checkout.payment_cancelled_msg'),
                    [{ text: t('common.ok') }],
                );
                return;
            }

            // Genuine payment failure — mark failed and offer retry
            setFlowState('failed');
            await cancelPaymentOnBackend();
            await clearPendingOrder();
            const msg = error?.description ?? error?.message ?? t('errors.generic');
            Alert.alert(
                t('checkout.payment_failed'),
                msg,
                [
                    { text: t('checkout.go_back'), style: 'cancel', onPress: () => router.back() },
                    { text: t('checkout.retry_payment'), onPress: () => {
                        setFlowState('idle');
                        // handlePay will be called again by the user pressing the button
                    }},
                ],
            );
        } finally {
            setPayLoading(false);
        }
    }, [payLoading, finalAmount, selectedMethod, couponApplied, couponCode, params, label, router, collectionType, selectedDate, selectedTime, selectedAddress, serviceabilityStatus, phoneNumber, wellnessItems, shippingDetails]);

    // ─── Open Razorpay native popup ─────────────────────────
    const handlePay = useCallback(async () => {
        if (payLoading) return;

        // ─── Blood Test Validation ────────────────────────────────────────────
        if (isBloodTest) {
            if (!selectedDate || !selectedTime) {
                Alert.alert(t('checkout.required'), t('checkout.select_date_time'));
                return;
            }
            if (collectionType === 'HOME') {
                if (!selectedAddress || !selectedAddress.line1) {
                    Alert.alert(t('checkout.address_required'), t('checkout.address_required_msg2'));
                    return;
                }
                if (!selectedAddress.pincode || selectedAddress.pincode.length !== 6) {
                    Alert.alert(t('checkout.pincode_required'), t('checkout.pincode_required_msg'));
                    return;
                }
                if (serviceabilityStatus === 'non-serviceable') {
                    Alert.alert(t('checkout.location_not_serviceable'), t('checkout.location_not_serviceable_msg'));
                    return;
                }
                if (serviceabilityStatus !== 'serviceable') {
                    Alert.alert(t('checkout.address_verification_needed'), t('checkout.address_verification_needed_msg'));
                    return;
                }
            }
            if (!phoneNumber?.trim() || phoneNumber.length < 10) {
                Alert.alert(t('checkout.phone_required'), t('checkout.phone_required_msg'));
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
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('checkout.header_title')}</Text>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

                {/* Order Summary */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{t('checkout.secure_payment_summary')}</Text>

                    {isBloodTest && (
                        <View style={{ marginBottom: Spacing.md }}>
                            <Text style={styles.sectionLabel}>{t('checkout.diagnostic_services') || 'Diagnostic Services'}</Text>
                            {bloodTestItems.map((item, idx) => (
                                <View key={`bt-summary-${idx}`} style={[styles.row, { paddingVertical: Spacing.xs }]}>
                                    <Text style={[styles.rowLabel, { flex: 1 }]} numberOfLines={1}>
                                        {item.title} {item.quantity > 1 ? `x${item.quantity}` : ''}
                                    </Text>
                                    <Text style={styles.rowValue}>{rupee}{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</Text>
                                </View>
                            ))}
                            <View style={styles.breakdownSection}>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>{t('checkout.tests_subtotal', 'Tests Subtotal')}</Text>
                                    <Text style={styles.breakdownValue}>{rupee}{bloodTestBaseAmount.toLocaleString('en-IN')}</Text>
                                </View>
                                {(!isSubscription || !!params.bookingPayload) && (
                                    <>
                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>{t('checkout.booking_fee')}</Text>
                                            {showWaiver ? (
                                                originalBookingFee > 0 ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Text style={[styles.breakdownValue, { textDecorationLine: 'line-through', color: colors.textMuted }]}>{rupee}{originalBookingFee}</Text>
                                                        <Text style={[styles.breakdownValue, { color: isDarkMode ? colors.primary : '#2e7d32', fontFamily: Fonts.semiBold }]}> {t('checkout.free')}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={[styles.breakdownValue, { color: isDarkMode ? colors.primary : '#2e7d32', fontFamily: Fonts.semiBold }]}>{t('checkout.free')}</Text>
                                                )
                                            ) : (
                                                <Text style={styles.breakdownValue}>{rupee}{bookingFee}</Text>
                                            )}
                                        </View>
                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>{t('checkout.platform_fee')}</Text>
                                            {showWaiver ? (
                                                originalPlatformFee > 0 ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Text style={[styles.breakdownValue, { textDecorationLine: 'line-through', color: colors.textMuted }]}>{rupee}{originalPlatformFee}</Text>
                                                        <Text style={[styles.breakdownValue, { color: isDarkMode ? colors.primary : '#2e7d32', fontFamily: Fonts.semiBold }]}> {t('checkout.free')}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={[styles.breakdownValue, { color: isDarkMode ? colors.primary : '#2e7d32', fontFamily: Fonts.semiBold }]}>{t('checkout.free')}</Text>
                                                )
                                            ) : (
                                                <Text style={styles.breakdownValue}>{rupee}{platformFee}</Text>
                                            )}
                                        </View>
                                        {convenienceFee > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.convenience_fee') || 'Convenience Fee'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{convenienceFee}</Text>
                                            </View>
                                        )}
                                        {emergencyFee > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.emergency_fee') || 'Emergency Premium'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{emergencyFee}</Text>
                                            </View>
                                        )}
                                        {visitFee > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.visit_fee') || 'Visit Charge'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{visitFee}</Text>
                                            </View>
                                        )}
                                        {nightCharge > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.night_charge') || 'Night Premium'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{nightCharge}</Text>
                                            </View>
                                        )}
                                        {surgeCharge > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.surge_charge') || 'Surge Charge'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{surgeCharge}</Text>
                                            </View>
                                        )}
                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>{t('checkout.taxes_gst', 'Taxes & GST')} ({taxRateDisplay}%)</Text>
                                            <Text style={styles.breakdownValue}>{rupee}{displayTaxes.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                                        </View>
                                    </>
                                )}
                                {showWaiver && (
                                    <Text style={styles.benefitNote}>{t('checkout.subscription_benefits_applied')}</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {isWellness && (
                        <View style={{ marginBottom: Spacing.md }}>
                            <Text style={styles.sectionLabel}>{t('checkout.wellness_products') || 'Wellness Products'}</Text>
                            {wellnessItems.map((item, idx) => (
                                <View key={`wl-summary-${idx}`} style={[styles.row, { paddingVertical: Spacing.xs }]}>
                                    <Text style={[styles.rowLabel, { flex: 1 }]} numberOfLines={1}>
                                        {item.title} {item.quantity > 1 ? `x${item.quantity}` : ''}
                                    </Text>
                                    <Text style={styles.rowValue}>{rupee}{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</Text>
                                </View>
                            ))}
                            <View style={styles.breakdownSection}>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>{t('checkout.subtotal') || 'Subtotal'}</Text>
                                    <Text style={styles.breakdownValue}>{rupee}{wellnessBaseAmount.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>{t('checkout.taxes_gst') || 'GST (18%)'}</Text>
                                    <Text style={styles.breakdownValue}>{rupee}{wellnessTax.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>{t('wellness.shipping_charge') || 'Shipping Charge'}</Text>
                                    {shippingLoading ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <Text style={styles.breakdownValue}>
                                            {!selectedAddress 
                                                ? t('checkout.select_address_to_calculate') || 'Select address' 
                                                : wellnessShipping > 0 
                                                    ? <Text>{rupee}{wellnessShipping}</Text> 
                                                    : t('checkout.free') || 'FREE'}
                                        </Text>
                                    )}
                                </View>
                                {shippingDetails && shippingDetails.courierName ? (
                                    <View style={styles.breakdownRow}>
                                        <Text style={styles.breakdownLabel}>{t('wellness.courier') || 'Courier Partner'}</Text>
                                        <Text style={[styles.breakdownValue, { fontFamily: Fonts.semiBold }]}>
                                            {shippingDetails.courierName}
                                        </Text>
                                    </View>
                                ) : null}
                                {shippingDetails && shippingDetails.estimatedDays ? (
                                    <View style={styles.breakdownRow}>
                                        <Text style={styles.breakdownLabel}>{t('wellness.estimated_delivery') || 'Estimated Delivery'}</Text>
                                        <Text style={styles.breakdownValue}>
                                            {t('wellness.delivery_in_days', { days: shippingDetails.estimatedDays }) || `Delivery in ${shippingDetails.estimatedDays} days`}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    )}

                    {isLegacyService && (
                        <View style={{ marginBottom: Spacing.md }}>
                            <View style={styles.row}>
                                <Text style={styles.rowLabel}>{label}</Text>
                                <Text style={styles.rowValue}>{rupee}{displayServiceFee.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={styles.breakdownSection}>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>{t('checkout.consultation_service_fee')}</Text>
                                    <Text style={styles.breakdownValue}>{rupee}{displayServiceFee.toLocaleString('en-IN')}</Text>
                                </View>
                                {(!isSubscription || !!params.bookingPayload) && (
                                    <>
                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>{t('checkout.booking_fee')}</Text>
                                            {showWaiver ? (
                                                originalBookingFee > 0 ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Text style={[styles.breakdownValue, { textDecorationLine: 'line-through', color: colors.textMuted }]}>{rupee}{originalBookingFee}</Text>
                                                        <Text style={[styles.breakdownValue, { color: isDarkMode ? colors.primary : '#2e7d32', fontFamily: Fonts.semiBold }]}> {t('checkout.free')}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={[styles.breakdownValue, { color: isDarkMode ? colors.primary : '#2e7d32', fontFamily: Fonts.semiBold }]}>{t('checkout.free')}</Text>
                                                )
                                            ) : (
                                                <Text style={styles.breakdownValue}>{rupee}{bookingFee}</Text>
                                            )}
                                        </View>
                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>{t('checkout.platform_fee')}</Text>
                                            {showWaiver ? (
                                                originalPlatformFee > 0 ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Text style={[styles.breakdownValue, { textDecorationLine: 'line-through', color: colors.textMuted }]}>{rupee}{originalPlatformFee}</Text>
                                                        <Text style={[styles.breakdownValue, { color: isDarkMode ? colors.primary : '#2e7d32', fontFamily: Fonts.semiBold }]}> {t('checkout.free')}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={[styles.breakdownValue, { color: isDarkMode ? colors.primary : '#2e7d32', fontFamily: Fonts.semiBold }]}>{t('checkout.free')}</Text>
                                                )
                                            ) : (
                                                <Text style={styles.breakdownValue}>{rupee}{platformFee}</Text>
                                            )}
                                        </View>
                                        {convenienceFee > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.convenience_fee') || 'Convenience Fee'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{convenienceFee}</Text>
                                            </View>
                                        )}
                                        {emergencyFee > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.emergency_fee') || 'Emergency Premium'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{emergencyFee}</Text>
                                            </View>
                                        )}
                                        {visitFee > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.visit_fee') || 'Visit Charge'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{visitFee}</Text>
                                            </View>
                                        )}
                                        {nightCharge > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.night_charge') || 'Night Premium'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{nightCharge}</Text>
                                            </View>
                                        )}
                                        {surgeCharge > 0 && (
                                            <View style={styles.breakdownRow}>
                                                <Text style={styles.breakdownLabel}>{t('checkout.surge_charge') || 'Surge Charge'}</Text>
                                                <Text style={styles.breakdownValue}>{rupee}{surgeCharge}</Text>
                                            </View>
                                        )}
                                        <View style={styles.breakdownRow}>
                                            <Text style={styles.breakdownLabel}>{t('checkout.taxes_gst', 'Taxes & GST')} ({taxRateDisplay}%)</Text>
                                            <Text style={styles.breakdownValue}>{rupee}{displayTaxes.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                                        </View>
                                    </>
                                )}
                                {showWaiver && (
                                    <Text style={styles.benefitNote}>{t('checkout.subscription_benefits_applied')}</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {couponApplied && (
                        <View style={styles.row}>
                            <Text style={[styles.rowLabel, { color: isDarkMode ? colors.primary : '#2e7d32' }]}>{t('checkout.coupon_discount')}</Text>
                            <Text style={[styles.rowValue, { color: isDarkMode ? colors.primary : '#2e7d32' }]}>- {rupee}{discount.toLocaleString('en-IN')}</Text>
                        </View>
                    )}
                    <View style={[styles.row, styles.totalRow]}>
                        <Text style={styles.totalLabel}>{t('checkout.total')}</Text>
                        <Text style={styles.totalValue}>{rupee}{(amountWithTaxAndFee - discount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
                    </View>

                    {showWaiver && (
                        <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>
                                {t('checkout.you_saved', { amount: (Math.round((originalBookingFee - bookingFee) + (originalPlatformFee - platformFee))).toLocaleString('en-IN') })}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Coupon */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{t('checkout.promo_code')}</Text>
                    {couponApplied ? (
                        <View style={styles.couponApplied}>
                            <Ionicons name="checkmark-circle" size={18} color={isDarkMode ? colors.primary : "#2e7d32"} />
                            <Text style={styles.couponAppliedText}>{t('checkout.coupon_applied_text', { code: couponCode, amount: discount })}</Text>
                            <TouchableOpacity onPress={handleRemoveCoupon}>
                                <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.couponRow}>
                            <TextInput
                                style={styles.couponInput}
                                placeholder={t('checkout.enter_coupon')}
                                placeholderTextColor={colors.textMuted}
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
                                    : <Text style={styles.couponBtnText}>{t('checkout.apply')}</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Checkout Membership Upgrade Card (Swiggy One style) */}
                {upsellPlanType && !hasActivePlanForCategory && eligiblePlans.length > 0 && (
                    <View style={[styles.card, styles.upgradeCard]}>
                        <TouchableOpacity
                            style={styles.upgradeHeader}
                            onPress={() => setIsUpgraded(!isUpgraded)}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={isUpgraded ? "checkbox" : "square-outline"}
                                size={24}
                                color={colors.primary}
                            />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.upgradeTitle}>
                                    {CARE_CATEGORIES.includes(category)
                                        ? "Upgrade to Care Membership"
                                        : "Upgrade to Home Essentials"}
                                </Text>
                                {savingsInfo && savingsInfo.totalSavings > 0 ? (
                                    <Text style={[styles.upgradeSaveText, { color: colors.primary }]}>
                                        Save ₹{Math.round(savingsInfo.totalSavings)} on this booking!
                                    </Text>
                                ) : (
                                    <Text style={styles.upgradeSubtitle}>Get ₹0 booking & platform fees instantly</Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {isUpgraded && (
                            <View style={styles.upgradeDetails}>
                                <View style={styles.waiverList}>
                                    <Text style={styles.waiverItem}>✓ Booking Fee Waived</Text>
                                    <Text style={styles.waiverItem}>✓ Platform Fee Waived</Text>
                                    <Text style={styles.waiverItem}>✓ GST on Fees Waived</Text>
                                </View>

                                {eligiblePlans.length > 1 && (
                                    <>
                                        <Text style={styles.planSelectorLabel}>Select Plan Option:</Text>
                                        <View style={styles.planSelector}>
                                            {eligiblePlans.map((plan, idx) => (
                                                <TouchableOpacity
                                                    key={plan.id}
                                                    style={[
                                                        styles.planSelectorBtn,
                                                        selectedPlanIndex === idx && styles.planSelectorBtnActive,
                                                    ]}
                                                    onPress={() => setSelectedPlanIndex(idx)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.planSelectorText,
                                                            selectedPlanIndex === idx && styles.planSelectorTextActive,
                                                        ]}
                                                    >
                                                        {plan.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}

                                <Text style={styles.durationSelectorLabel}>Select Plan Duration:</Text>
                                <View style={styles.durationSelector}>
                                    {[
                                        { key: 'QUARTERLY' as BillingCycle, label: '3 Months', price: selectedUpgradePlan?.quarterlyPrice },
                                        { key: 'BIANNUAL' as BillingCycle, label: '6 Months', price: selectedUpgradePlan?.biannualPrice },
                                        { key: 'YEARLY' as BillingCycle, label: '12 Months', price: selectedUpgradePlan?.yearlyPrice },
                                    ].map(dur => (
                                        <TouchableOpacity
                                            key={dur.key}
                                            style={[
                                                styles.durationBtn,
                                                selectedDuration === dur.key && styles.durationBtnActive,
                                            ]}
                                            onPress={() => setSelectedDuration(dur.key)}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.durationText,
                                                    selectedDuration === dur.key && styles.durationTextActive,
                                                ]}
                                            >
                                                {dur.label}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.durationPrice,
                                                    selectedDuration === dur.key && styles.durationPriceActive,
                                                ]}
                                            >
                                                ₹{dur.price}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Blood Test: Collection Date & Time */}
                {isBloodTest && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t('checkout.collection_date_time')}</Text>
                        <Text style={styles.sectionLabel}>{t('checkout.preferred_collection_date')}</Text>
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

                        <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>{t('checkout.collection_time')}</Text>
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
                            <Text style={styles.noSlotsText}>{t('checkout.no_slots')}</Text>
                        )}
                    </View>
                )}

                {/* Blood Test: Collection Type */}
                {isBloodTest && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t('checkout.collection_type')}</Text>
                        <TouchableOpacity
                            style={[styles.collectionOption, collectionType === 'HOME' && styles.collectionOptionActive]}
                            onPress={() => setCollectionType('HOME')}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="home" size={20} color={collectionType === 'HOME' ? colors.primary : colors.textMuted} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.collectionOptionTitle, collectionType === 'HOME' && { color: colors.textDark }]}>{t('checkout.home_collection')}</Text>
                                <Text style={styles.collectionOptionDesc}>{t('checkout.home_collection_desc')}</Text>
                            </View>
                            <Ionicons name={collectionType === 'HOME' ? 'checkmark-circle' : 'radio-button-off'} size={22} color={collectionType === 'HOME' ? colors.primary : '#D1D5DB'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.collectionOption, collectionType === 'LAB' && styles.collectionOptionActive]}
                            onPress={() => setCollectionType('LAB')}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="business" size={20} color={collectionType === 'LAB' ? colors.primary : colors.textMuted} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.collectionOptionTitle, collectionType === 'LAB' && { color: colors.textDark }]}>{t('checkout.lab_visit')}</Text>
                                <Text style={styles.collectionOptionDesc}>{t('checkout.lab_visit_desc')}</Text>
                            </View>
                            <Ionicons name={collectionType === 'LAB' ? 'checkmark-circle' : 'radio-button-off'} size={22} color={collectionType === 'LAB' ? colors.primary : '#D1D5DB'} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Single Merged Address Picker Section */}
                {((isBloodTest && collectionType === 'HOME') || isWellness) && (
                    <AddressPickerSection
                        selectedAddress={selectedAddress}
                        onAddressChange={setSelectedAddress}
                        showServiceabilityCheck={isBloodTest}
                        serviceabilityStatus={serviceabilityStatus}
                        onServiceabilityChange={setServiceabilityStatus}
                        checkServiceabilityFn={isBloodTest ? async (lat: string, lng: string) => {
                            try {
                                const result: any = await labService.checkServiceability(lat, lng);
                                const isServiceable = result?.status === 'success' || result?.data?.status === 'success' || result?.serviceable === true;
                                setServiceabilityStatus(isServiceable ? 'serviceable' : 'non-serviceable');
                                return isServiceable;
                            } catch {
                                setServiceabilityStatus('non-serviceable');
                                return false;
                            }
                        } : undefined}
                        phoneNumber={phoneNumber}
                        onPhoneChange={setPhoneNumber}
                        landmark={landmark}
                        onLandmarkChange={setLandmark}
                        title={isBloodTest ? t('checkout.collection_address') : t('checkout.delivery_address')}
                        showPhoneField={true}
                        showLandmarkField={isBloodTest}
                        allowManualEntry={true}
                        initialLat={isBloodTest ? parseFloat(coords.lat) : undefined}
                        initialLng={isBloodTest ? parseFloat(coords.long) : undefined}
                    />
                )}

                {/* Payment Method */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{t('checkout.payment_method')}</Text>
                    {availableMethods.map(m => (
                        <TouchableOpacity
                            key={m.type}
                            style={[styles.methodRow, selectedMethod === m.type && styles.methodRowActive]}
                            onPress={() => setSelectedMethod(m.type)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name={m.icon} size={20} color={selectedMethod === m.type ? colors.primary : colors.textMuted} />
                            <Text style={[styles.methodLabel, selectedMethod === m.type && styles.methodLabelActive]}>
                                {m.type === 'UPI' ? t('checkout.upi') : m.type === 'CARD' ? t('checkout.card') : t('checkout.cod')}
                            </Text>
                            <Ionicons
                                name={selectedMethod === m.type ? 'radio-button-on' : 'radio-button-off'}
                                size={20}
                                color={selectedMethod === m.type ? colors.primary : colors.textMuted}
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
                            ? t('checkout.security_cash')
                            : t('checkout.security_razorpay')
                        }
                    </Text>
                </View>

            </ScrollView>

            {/* Serviceability Alert for Blood Test */}
            {isBloodTest && serviceabilityStatus === 'non-serviceable' && selectedAddress && (
                <View style={styles.warningBanner}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text style={styles.warningText}>
                        {t('checkout.collection_unavailable')}
                    </Text>
                </View>
            )}

            {/* Pay Button */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
                                    ? t('checkout.confirm_booking_btn', { amount: finalAmount.toLocaleString('en-IN') })
                                    : t('checkout.pay_btn', { amount: finalAmount.toLocaleString('en-IN') })
                                }
                            </Text>
                        </>
                    }
                </TouchableOpacity>
            </View>

            {/* Blood Test / Combined: Order Confirmation Modal */}
            {isBloodTest && (
                <Modal visible={confirmModalVisible} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>{t('checkout.confirm_your_booking')}</Text>

                            <View style={styles.modalSummary}>
                                {bloodTestItems.map((item, idx) => (
                                    <View key={`bt-modal-${idx}`} style={styles.modalRow}>
                                        <Ionicons name="flask-outline" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={styles.modalRowLabel} numberOfLines={1}>{item.title}</Text>
                                        <Text style={styles.modalRowValue}>₹{item.price}</Text>
                                    </View>
                                ))}

                                {wellnessItems.map((item, idx) => (
                                    <View key={`wl-modal-${idx}`} style={styles.modalRow}>
                                        <Ionicons name="cube-outline" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={styles.modalRowLabel} numberOfLines={1}>
                                            {item.title} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                                        </Text>
                                        <Text style={styles.modalRowValue}>₹{(item.price || 0) * (item.quantity || 1)}</Text>
                                    </View>
                                ))}

                                <View style={[styles.modalRow, styles.modalDivider]}>
                                    <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.modalRowLabel}>{t('checkout.date_and_time')}</Text>
                                    <Text style={styles.modalRowValue} numberOfLines={1}>
                                        {selectedDate?.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, {selectedTime}
                                    </Text>
                                </View>

                                <View style={[styles.modalRow, styles.modalDivider]}>
                                    <Ionicons name={collectionType === 'LAB' ? 'business-outline' : 'home-outline'} size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.modalRowLabel}>{t('checkout.collection')}</Text>
                                    <Text style={styles.modalRowValue}>{collectionType === 'LAB' ? t('checkout.lab_visit') : t('checkout.home_collection')}</Text>
                                </View>

                                {((collectionType === 'HOME' && isBloodTest) || isWellness) && selectedAddress?.line1 && (
                                    <View style={[styles.modalRow, styles.modalDivider]}>
                                        <Ionicons name="location-outline" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={styles.modalRowLabel}>{t('checkout.address')}</Text>
                                        <Text style={[styles.modalRowValue, { maxWidth: '55%' }]} numberOfLines={2}>
                                            {selectedAddress.line1}{selectedAddress.cityName ? `, ${selectedAddress.cityName}` : ''}
                                        </Text>
                                    </View>
                                )}

                                <View style={[styles.modalRow, styles.modalDivider, { marginTop: 4 }]}>
                                    <Ionicons name="cash-outline" size={15} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.modalRowLabel, { fontFamily: Fonts.semiBold, color: colors.textDark }]}>{t('checkout.total_payable')}</Text>
                                    <Text style={[styles.modalRowValue, { fontFamily: Fonts.semiBold, fontSize: 16, color: colors.primary }]}>
                                        ₹{Math.round(finalAmount).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setConfirmModalVisible(false)}
                                >
                                    <Text style={styles.modalCancelText}>{t('checkout.edit')}</Text>
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
                                            {selectedMethod === 'CASH' ? t('checkout.confirm_booking') : t('checkout.confirm_and_pay')}
                                          </Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
            </SafeAreaView>
        </KeyboardAvoidingView>
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
    rowLabel: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textMuted },
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
    couponAppliedText: { flex: 1, fontFamily: Fonts.medium, fontSize: FontSize.caption ?? 13, color: isDarkMode ? colors.primary : '#2e7d32' },

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
    methodLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textMuted },
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
        color: isDarkMode ? colors.primary : '#2e7d32',
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
        color: isDarkMode ? colors.primary : '#2e7d32',
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
    upgradeCard: {
        borderColor: colors.primary,
        borderWidth: 1.5,
        backgroundColor: isDarkMode ? 'rgba(4, 131, 87, 0.05)' : '#F0FDF4',
        marginHorizontal: 16,
        padding: 16,
        marginTop: 16,
    },
    upgradeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    upgradeTitle: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: colors.textDark,
    },
    upgradeSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    upgradeSaveText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        marginTop: 2,
    },
    upgradeDetails: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: 16,
        gap: 16,
    },
    waiverList: {
        gap: 6,
    },
    waiverItem: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
        color: isDarkMode ? colors.primary : '#15803d',
    },
    durationSelectorLabel: {
        fontFamily: Fonts.medium,
        fontSize: 12,
        color: colors.textMuted,
    },
    durationSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    durationBtn: {
        flex: 1,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: colors.bgCard,
    },
    durationBtnActive: {
        borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(4, 131, 87, 0.1)' : '#E6F4EE',
    },
    durationText: {
        fontFamily: Fonts.medium,
        fontSize: 12,
        color: colors.textDark,
    },
    durationTextActive: {
        fontFamily: Fonts.bold,
        color: colors.primary,
    },
    durationPrice: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    durationPriceActive: {
        fontFamily: Fonts.semiBold,
        color: colors.primary,
    },
    planSelectorLabel: {
        fontFamily: Fonts.medium,
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 8,
    },
    planSelector: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    planSelectorBtn: {
        flex: 1,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: colors.bgCard,
    },
    planSelectorBtnActive: {
        borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(4, 131, 87, 0.1)' : '#E6F4EE',
    },
    planSelectorText: {
        fontFamily: Fonts.medium,
        fontSize: 12,
        color: colors.textDark,
    },
    planSelectorTextActive: {
        fontFamily: Fonts.bold,
        color: colors.primary,
    },
});

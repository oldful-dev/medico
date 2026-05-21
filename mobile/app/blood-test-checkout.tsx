// Unified Blood Test Checkout — Direct from Cart
// Flow: Date/Time/Address → Payment method → Razorpay → Success

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
import { labService, type LabSlot } from '@/services/api/labService';
import { locationService } from '@/services/device/locationService';
import { useUser } from '@/context/UserContext';
import { useCart } from '@/context/CartContext';

type PaymentFlowState = 'idle' | 'creating_booking' | 'initiating_order' | 'checkout_opened' | 'verifying' | 'success' | 'failed' | 'cancelled';
type MethodOption = { type: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap };

const PAYMENT_METHODS: MethodOption[] = [
    { type: 'UPI',  label: 'UPI (GPay / PhonePe / Paytm)', icon: 'phone-portrait-outline' },
    { type: 'CARD', label: 'Credit / Debit Card',         icon: 'card-outline' },
    { type: 'CASH', label: 'Cash on Delivery',             icon: 'cash-outline' },
];

export default function BloodTestCheckoutScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const { items, clearCategory } = useCart();
    const params = useLocalSearchParams<{
        fromCheckout?: string;
    }>();

    // Get blood test items from cart
    const bloodTestItems = items.filter(i =>
        i.serviceType?.toLowerCase().includes('blood') ||
        i.serviceType === 'Bloodwork'
    );

    // ─── Step 1: Date & Time Selection ──────────────────────────────────
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [slots, setSlots] = useState<LabSlot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [coords, setCoords] = useState({ lat: '12.9716', long: '77.5946' });

    // ─── Step 2: Address Selection ──────────────────────────────────────
    const [selectedAddress, setSelectedAddress] = useState<any>(
        profile?.addresses && profile.addresses.length > 0
            ? profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0]
            : null
    );
    const [landmark, setLandmark] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
    const [pincode, setPincode] = useState('');
    const [serviceabilityStatus, setServiceabilityStatus] = useState<'unchecked' | 'checking' | 'serviceable' | 'non-serviceable'>('unchecked');

    // ─── Payment ──────────────────────────────────────────────────────────
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // ─── Calculate total ──────────────────────────────────────────────────
    const baseAmount = bloodTestItems.reduce((sum, item) => sum + (item.price || 0), 0);
    const gst = Math.round(baseAmount * 0.18 * 100) / 100;
    const convenienceFee = 0;
    const totalAmount = Math.round((baseAmount + gst + convenienceFee - discount) * 100) / 100;

    // Initialize date
    useEffect(() => {
        const today = new Date();
        if (today.getHours() >= 16) today.setDate(today.getDate() + 1);
        setSelectedDate(today);
    }, []);

    // Auto-fill address from profile
    useEffect(() => {
        if (!selectedAddress && profile?.addresses?.length) {
            const defaultAddr = profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0];
            if (defaultAddr) {
                setSelectedAddress(defaultAddr);
                if (defaultAddr.pincode) setPincode(defaultAddr.pincode);
                if (defaultAddr.landmark) setLandmark(defaultAddr.landmark);
            }
        }
    }, [profile]);

    // Fetch slots when date changes
    useEffect(() => {
        if (!selectedDate) return;
        setSlotsLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        labService.getTimeSlots(dateStr, coords.lat, coords.long)
            .then(data => {
                const slots = Array.isArray(data) ? data : [];
                setSlots(slots);
                if (slots.length > 0) {
                    setSelectedTime(slots[0].slot || slots[0].slot_time || '');
                }
            })
            .catch(() => setSlots([]))
            .finally(() => setSlotsLoading(false));
    }, [selectedDate]);

    // Check serviceability
    const checkServiceability = useCallback(async () => {
        if (!selectedAddress?.pincode) {
            Alert.alert('Pincode Required', 'Please select a valid address with pincode');
            return;
        }
        setServiceabilityStatus('checking');
        try {
            const result: any = await labService.checkServiceability(coords.lat, coords.long);
            const isServiceable = result?.status === 'success' || result?.data?.status === 'success' || result?.serviceable === true;
            setServiceabilityStatus(isServiceable ? 'serviceable' : 'non-serviceable');
        } catch {
            setServiceabilityStatus('non-serviceable');
        }
    }, [selectedAddress, coords]);

    useEffect(() => {
        if (selectedAddress?.pincode) {
            checkServiceability();
        }
    }, [selectedAddress, checkServiceability]);

    const generateDays = () => {
        const arr = [];
        const start = selectedDate || new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            arr.push(d);
        }
        return arr;
    };

    const formatDate = (d: Date) => {
        return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
    };

    // Apply coupon
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
                Alert.alert('Success', `Coupon applied! You saved ₹${res.data.discount}`);
            } else {
                Alert.alert('Invalid', 'This coupon is not valid');
            }
        } catch {
            Alert.alert('Error', 'Could not apply coupon');
        }
    };

    // Validate before payment
    const validateCheckout = (): boolean => {
        if (!selectedDate || !selectedTime) {
            Alert.alert('Required', 'Please select date and time for collection');
            return false;
        }
        if (!selectedAddress) {
            Alert.alert('Address Required', 'Please select a delivery address');
            return false;
        }
        if (serviceabilityStatus !== 'serviceable') {
            Alert.alert('Not Serviceable', 'Blood test collection is not available at this location');
            return false;
        }
        if (!phoneNumber || phoneNumber.length < 10) {
            Alert.alert('Phone Required', 'Please enter a valid phone number');
            return false;
        }
        return true;
    };

    // Handle payment
    const handlePayment = async () => {
        if (!validateCheckout()) return;

        setIsLoading(true);
        try {
            // Create booking payload
            const bookingPayload = {
                packages: bloodTestItems.map(item => item.details?.code || item.id),
                selectedDate: selectedDate?.toISOString(),
                selectedTime,
                addressLine: `${selectedAddress?.line1}${selectedAddress?.line2 ? ', ' + selectedAddress.line2 : ''}`,
                cityName: selectedAddress?.cityName,
                pincode,
                landmark,
                latitude: coords.lat,
                longitude: coords.long,
                phoneNumber,
                paymentMethod: selectedMethod,
            };

            // Hold blood test booking via Redcliffe
            const bookingRes = await labService.holdBooking(bookingPayload);
            if (!bookingRes || !(bookingRes as any)?.id) {
                Alert.alert('Error', 'Could not create booking');
                return;
            }

            const bookingId = (bookingRes as any).id;

            // Handle COD
            if (selectedMethod === 'CASH') {
                clearCategory('blood-test');
                router.replace({
                    pathname: '/blood-test/success',
                    params: {
                        bookingId,
                        amount: String(totalAmount),
                        packageName: bloodTestItems.map(i => i.title).join(', '),
                    },
                });
                return;
            }

            // Initiate payment
            const payRes = await paymentService.initiatePayment({
                labOrderId: bookingId,
                amount: totalAmount,
                paymentMethod: selectedMethod,
                couponCode: couponApplied ? couponCode : undefined,
            });

            if (!payRes.success || !payRes.data) {
                Alert.alert('Error', 'Could not initiate payment');
                return;
            }

            const { orderId, amount: orderAmount, key: backendKey } = payRes.data as any;

            // Open Razorpay
            const options = {
                description: bloodTestItems.map(i => i.title).join(', '),
                image: 'https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/onlylogo.png',
                currency: 'INR',
                key: backendKey || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
                amount: String(Math.round(orderAmount * 100)),
                name: 'Ayuxa Healthcare',
                order_id: orderId,
                prefill: {
                    name: profile?.name || '',
                    contact: phoneNumber,
                    email: profile?.email || '',
                    method: selectedMethod.toLowerCase(),
                },
                theme: { color: Colors.primary },
            };

            const data = await RazorpayCheckout.open(options);

            // Verify payment
            const verifyRes = await paymentService.verifyPayment({
                razorpayPaymentId: data.razorpay_payment_id,
                razorpayOrderId: data.razorpay_order_id,
                razorpaySignature: data.razorpay_signature,
            });

            if (verifyRes.success) {
                clearCategory('blood-test');
                router.replace({
                    pathname: '/blood-test/success',
                    params: {
                        bookingId,
                        amount: String(totalAmount),
                        packageName: bloodTestItems.map(i => i.title).join(', '),
                    },
                });
            } else {
                Alert.alert('Error', 'Payment verification failed');
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            if (error.code !== 'E_CANCELED') {
                Alert.alert('Error', error.message || 'Payment failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (bloodTestItems.length === 0) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Blood Test Checkout</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <View style={styles.emptyContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No blood tests in cart</Text>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.push('/blood-test')}
                        >
                            <Text style={styles.backBtnText}>Browse Tests</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Blood Test Checkout</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Test Summary */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Tests Selected</Text>
                        {bloodTestItems.map((item, idx) => (
                            <View key={idx} style={styles.testItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.testName}>{item.title}</Text>
                                    <Text style={styles.testParams}>{item.details?.tests_count || 0} Parameters</Text>
                                </View>
                                <Text style={styles.testPrice}>₹{item.price?.toLocaleString('en-IN')}</Text>
                            </View>
                        ))}
                        <View style={styles.divider} />
                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>Subtotal</Text>
                            <Text style={styles.feeValue}>₹{baseAmount.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>GST (18%)</Text>
                            <Text style={styles.feeValue}>₹{gst.toLocaleString('en-IN')}</Text>
                        </View>
                        {discount > 0 && (
                            <View style={styles.feeRow}>
                                <Text style={[styles.feeLabel, { color: Colors.primary }]}>Discount</Text>
                                <Text style={[styles.feeValue, { color: Colors.primary }]}>-₹{discount.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        <View style={[styles.feeRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTopMargin: Spacing.md }]}>
                            <Text style={styles.totalLabel}>Total Amount</Text>
                            <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>

                    {/* Date & Time Selection */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Select Date & Time</Text>

                        <Text style={styles.stepLabel}>Preferred Collection Date</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.daysScroll}
                        >
                            {generateDays().map((day, idx) => (
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
                                        {formatDate(day)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[styles.stepLabel, { marginTop: Spacing.md }]}>Preferred Time Slot</Text>
                        {slotsLoading ? (
                            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.md }} />
                        ) : slots.length > 0 ? (
                            <View style={styles.slotsGrid}>
                                {slots.map((slot, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.slotCard,
                                            selectedTime === (slot.slot || slot.slot_time) && styles.slotCardActive,
                                        ]}
                                        onPress={() => setSelectedTime(slot.slot || slot.slot_time)}
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

                    {/* Address Selection */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Delivery Address</Text>
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
                                            color={selectedAddress?.id === addr.id ? Colors.primary : Colors.textMuted}
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

                        <TextInput
                            placeholder="Landmark (optional)"
                            style={styles.input}
                            value={landmark}
                            onChangeText={setLandmark}
                            placeholderTextColor={Colors.textMuted}
                        />

                        <TextInput
                            placeholder="Phone Number"
                            style={styles.input}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            placeholderTextColor={Colors.textMuted}
                        />

                        {serviceabilityStatus !== 'unchecked' && (
                            <View style={[styles.serviceabilityBanner, {
                                backgroundColor: serviceabilityStatus === 'serviceable' ? '#F0FDF4' : '#FEF2F2',
                                borderColor: serviceabilityStatus === 'serviceable' ? '#DCFCE7' : '#FECACA',
                            }]}>
                                <Ionicons
                                    name={serviceabilityStatus === 'serviceable' ? 'checkmark-circle' : 'alert-circle'}
                                    size={18}
                                    color={serviceabilityStatus === 'serviceable' ? Colors.primary : '#DC2626'}
                                />
                                <Text style={{
                                    color: serviceabilityStatus === 'serviceable' ? '#047857' : '#991B1B',
                                    marginLeft: 8,
                                    fontSize: FontSize.body,
                                }}>
                                    {serviceabilityStatus === 'serviceable'
                                        ? 'Collection available at this location'
                                        : 'Collection not available at this location'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Coupon */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Apply Coupon</Text>
                        <View style={styles.couponRow}>
                            <TextInput
                                placeholder="Enter coupon code"
                                style={styles.couponInput}
                                value={couponCode}
                                onChangeText={setCouponCode}
                                editable={!couponApplied}
                                placeholderTextColor={Colors.textMuted}
                            />
                            <TouchableOpacity
                                style={[styles.couponBtn, couponApplied && styles.couponBtnDisabled]}
                                onPress={couponApplied ? () => { setCouponCode(''); setCouponApplied(false); setDiscount(0); } : handleApplyCoupon}
                            >
                                <Text style={styles.couponBtnText}>
                                    {couponApplied ? 'Remove' : 'Apply'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Payment Method */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Payment Method</Text>
                        {PAYMENT_METHODS.map((method) => (
                            <TouchableOpacity
                                key={method.type}
                                style={[
                                    styles.methodCard,
                                    selectedMethod === method.type && styles.methodCardActive,
                                ]}
                                onPress={() => setSelectedMethod(method.type)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={selectedMethod === method.type ? 'radio-button-on' : 'radio-button-off'}
                                    size={20}
                                    color={selectedMethod === method.type ? Colors.primary : Colors.textMuted}
                                />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.methodLabel}>{method.label}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Security Badge */}
                    <View style={styles.trustRow}>
                        <Ionicons name="lock-closed-outline" size={16} color={Colors.primary} />
                        <Text style={styles.trustText}>Secured by Razorpay</Text>
                    </View>
                </ScrollView>

                {/* Pay Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={[styles.payBtn, isLoading && { opacity: 0.6 }]}
                        onPress={handlePayment}
                        disabled={isLoading}
                        activeOpacity={0.88}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="card-outline" size={18} color="#fff" />
                                <Text style={styles.payBtnText}>
                                    Pay ₹{totalAmount.toLocaleString('en-IN')}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F8FA' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 18,
        color: Colors.textDark,
        flex: 1,
        textAlign: 'center',
    },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 120 },

    card: {
        backgroundColor: '#fff',
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 16,
        color: Colors.textDark,
        marginBottom: Spacing.md,
    },

    // Test items
    testItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
    },
    testName: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    testParams: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
        marginTop: 2,
    },
    testPrice: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
    },

    divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
    feeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    feeLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
    },
    feeValue: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    totalLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 15,
        color: Colors.textDark,
    },
    totalValue: {
        fontFamily: Fonts.semiBold,
        fontSize: 16,
        color: Colors.primary,
    },

    // Date/Time selection
    stepLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
        color: Colors.textDark,
        marginBottom: Spacing.sm,
    },
    daysScroll: { marginBottom: Spacing.md },
    dayCard: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: 8,
        minWidth: 90,
        alignItems: 'center',
    },
    dayCardActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    dayText: {
        fontFamily: Fonts.medium,
        fontSize: 13,
        color: Colors.textDark,
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
        borderColor: Colors.border,
        alignItems: 'center',
    },
    slotCardActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    slotTime: {
        fontFamily: Fonts.medium,
        fontSize: 12,
        color: Colors.textDark,
    },
    slotTimeActive: { color: '#fff' },
    noSlotsText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },

    // Address
    addressCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: '#EEEEEE',
        marginBottom: Spacing.sm,
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
        fontSize: FontSize.caption,
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

    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginTop: Spacing.md,
    },

    serviceabilityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1,
        marginTop: Spacing.md,
    },

    // Coupon
    couponRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'center',
    },
    couponInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    couponBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: Radius.md,
        justifyContent: 'center',
    },
    couponBtnDisabled: { opacity: 0.6 },
    couponBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
        color: '#fff',
    },

    // Payment method
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    methodCardActive: { backgroundColor: '#F0FAF4' },
    methodLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },

    // Trust
    trustRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
    },
    trustText: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.primary,
    },

    // Bottom
    bottomContainer: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    payBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: 14,
        borderRadius: Radius.lg,
    },
    payBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: 16,
        color: '#fff',
    },

    // Empty state
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
    },
    emptyText: {
        fontFamily: Fonts.medium,
        fontSize: 16,
        color: Colors.textMuted,
    },
    backBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: Radius.lg,
        marginTop: Spacing.lg,
    },
    backBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        color: '#fff',
    },
});

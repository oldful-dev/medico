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
import { useCart } from '@/context/CartContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

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

export default function CartOrderSummaryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();
    const { clearCategory, removeItems } = useCart();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    
    const params = useLocalSearchParams<{
        category?: string;
        bookingPayload?: string;
        amount?: string;
        collectionType?: string;
        selectedItemIds?: string;
    }>();

    const category = params.category || 'Bloodwork';

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
    const convenienceFee = 0;
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
                Alert.alert('Success', `Coupon applied! You saved ₹${res.data.discount}`);
            } else {
                Alert.alert('Invalid', 'This coupon is not valid');
            }
        } catch {
            Alert.alert('Error', 'Could not apply coupon');
        }
    };

    const handlePaymentSuccess = (bookingId: string, isCod: boolean = false) => {
        // Clear only the checked-out items if provided, otherwise clear the category
        if (params.selectedItemIds) {
            removeItems(params.selectedItemIds.split(','));
        } else {
            clearCategory(category);
        }
        
        router.replace({
            pathname: '/cart/success',
            params: {
                bookingId,
                amount: String(totalAmount),
                category,
                isCod: isCod ? 'true' : undefined,
            },
        } as any);
    };

    const handlePayment = async () => {
        if (!bookingData) {
            Alert.alert('Error', 'Invalid booking data');
            return;
        }

        setIsLoading(true);
        try {
            // For Phase 1, we assume Bloodwork API for lab orders.
            // Future phases will split logic based on `category`.
            const finalBookingData = { ...bookingData, paymentMethod: selectedMethod };
            const bookingRes = await labService.holdBooking(finalBookingData);

            if (!bookingRes) {
                Alert.alert('Error', 'Could not create booking');
                return;
            }

            const bookingId = (bookingRes as any)?.id;

            if (!bookingId) {
                Alert.alert('Error', `Could not create booking`);
                return;
            }

            if (selectedMethod === 'CASH') {
                handlePaymentSuccess(bookingId, true);
                return;
            }

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

            const options = {
                description: `${category} Checkout`,
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
                                instruments: [{ method: selectedMethod.toLowerCase() as any }],
                            },
                        },
                        sequence: ['block.banks'],
                        preferences: { show_default_blocks: false },
                    },
                },
            };

            const data = await RazorpayCheckout.open(options);

            const verifyRes = await paymentService.verifyPayment({
                razorpayPaymentId: data.razorpay_payment_id,
                razorpayOrderId: data.razorpay_order_id,
                razorpaySignature: data.razorpay_signature,
            });

            if (verifyRes.success) {
                handlePaymentSuccess(bookingId);
            } else {
                Alert.alert('Error', 'Payment verification failed');
            }
        } catch (error: any) {
            if (error.code !== 'E_CANCELED') {
                const errorMsg = error.details?.message || error.message || 'Payment failed';
                Alert.alert('Error', errorMsg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <KeyboardAvoidingView style={[dynamicStyles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#252525' : '#FAF7ED'} />

            <View style={dynamicStyles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#E8E8E8' : TEXT_DARK} />
                </TouchableOpacity>
                <Text style={dynamicStyles.headerTitle}>Order Summary</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={dynamicStyles.content}>
                <View style={dynamicStyles.card}>
                    <View style={dynamicStyles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={dynamicStyles.testName}>{category} Checkout</Text>
                            <Text style={dynamicStyles.parametersText}>
                                {bookingData?.packages?.length || 0} items
                            </Text>
                        </View>
                        <View style={dynamicStyles.priceTag}>
                            <Text style={dynamicStyles.priceAmount}>₹{baseAmount}</Text>
                        </View>
                    </View>
                    <View style={{ marginTop: 12 }}>
                        {bookingData?.packages?.map((pkg: any, idx: number) => (
                            <View key={idx} style={dynamicStyles.itemRow}>
                                <Text style={dynamicStyles.itemText} numberOfLines={1}>• {pkg.name}</Text>
                                <Text style={dynamicStyles.itemPrice}>₹{pkg.cost}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={dynamicStyles.card}>
                    <View style={dynamicStyles.detailRow}>
                        <View style={dynamicStyles.detailIcon}><Ionicons name="calendar" size={16} color={colors.primary} /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={dynamicStyles.detailLabel}>Date & Time</Text>
                            <Text style={dynamicStyles.detailValue}>{bookingData?.slot?.date}, {bookingData?.slot?.time}</Text>
                        </View>
                    </View>

                    <View style={dynamicStyles.divider} />

                    <View style={dynamicStyles.detailRow}>
                        <View style={dynamicStyles.detailIcon}>
                            <Ionicons name={params.collectionType === 'LAB' ? 'business' : 'home'} size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={dynamicStyles.detailLabel}>Collection Type</Text>
                            <Text style={dynamicStyles.detailValue}>{params.collectionType === 'LAB' ? 'Lab Visit' : 'Home Collection'}</Text>
                        </View>
                    </View>

                    {params.collectionType !== 'LAB' && bookingData?.address?.line1 && (
                        <>
                            <View style={dynamicStyles.divider} />
                            <View style={dynamicStyles.detailRow}>
                                <View style={dynamicStyles.detailIcon}><Ionicons name="location" size={16} color={colors.primary} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={dynamicStyles.detailLabel}>Address</Text>
                                    <Text style={dynamicStyles.detailValue} numberOfLines={2}>
                                        {bookingData?.address?.line1}, {bookingData?.address?.pincode}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                <View style={dynamicStyles.card}>
                    <View style={dynamicStyles.breakdownRow}>
                        <Text style={dynamicStyles.breakdownLabel}>Subtotal</Text>
                        <Text style={dynamicStyles.breakdownValue}>₹{baseAmount.toFixed(2)}</Text>
                    </View>
                    <View style={dynamicStyles.breakdownRow}>
                        <Text style={dynamicStyles.breakdownLabel}>GST (18%)</Text>
                        <Text style={dynamicStyles.breakdownValue}>₹{gst.toFixed(2)}</Text>
                    </View>
                    {discount > 0 && (
                        <View style={dynamicStyles.breakdownRow}>
                            <Text style={[dynamicStyles.breakdownLabel, { color: colors.primary }]}>Discount</Text>
                            <Text style={[dynamicStyles.breakdownValue, { color: colors.primary }]}>-₹{discount.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={dynamicStyles.breakdownDivider} />
                    <View style={dynamicStyles.totalRow}>
                        <Text style={dynamicStyles.totalLabel}>Total Amount</Text>
                        <Text style={dynamicStyles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
                    </View>
                </View>

                <View style={dynamicStyles.card}>
                    <Text style={dynamicStyles.sectionTitle}>Apply Coupon Code</Text>
                    <View style={dynamicStyles.couponRow}>
                        <TextInput
                            placeholder="Enter coupon code"
                            placeholderTextColor={isDarkMode ? '#94A3B8' : TEXT_MUTED}
                            value={couponCode}
                            onChangeText={setCouponCode}
                            editable={!couponApplied}
                            style={dynamicStyles.couponInput}
                        />
                        <TouchableOpacity style={[dynamicStyles.applyBtn, couponApplied && dynamicStyles.applyBtnApplied]} onPress={handleApplyCoupon} disabled={couponApplied}>
                            <Text style={[dynamicStyles.applyBtnText, couponApplied && dynamicStyles.applyBtnTextApplied]}>{couponApplied ? '✓' : 'Apply'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={dynamicStyles.card}>
                    <Text style={dynamicStyles.sectionTitle}>Payment Method</Text>
                    {PAYMENT_METHODS.map(m => (
                        <TouchableOpacity key={m.type} style={[dynamicStyles.methodRow, selectedMethod === m.type && dynamicStyles.methodRowActive]} onPress={() => setSelectedMethod(m.type)} activeOpacity={0.8}>
                            <Ionicons name={m.icon as any} size={20} color={selectedMethod === m.type ? colors.primary : (isDarkMode ? '#94A3B8' : TEXT_MUTED)} />
                            <Text style={[dynamicStyles.methodLabel, selectedMethod === m.type && dynamicStyles.methodLabelActive]}>{m.label}</Text>
                            <Ionicons name={selectedMethod === m.type ? 'radio-button-on' : 'radio-button-off'} size={20} color={selectedMethod === m.type ? colors.primary : (isDarkMode ? '#94A3B8' : TEXT_MUTED)} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={dynamicStyles.footer}>
                <TouchableOpacity style={[dynamicStyles.payBtn, isLoading && dynamicStyles.payBtnDisabled]} onPress={handlePayment} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                        <Text style={dynamicStyles.payBtnText}>
                            {selectedMethod === 'CASH' ? 'Confirm Booking' : `Confirm & Pay ₹${totalAmount.toFixed(2)}`}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const makeStyles = (isDarkMode: boolean) => {
    const bgLight = isDarkMode ? '#1A1A1A' : '#FAF7ED';
    const bgCard = isDarkMode ? '#252525' : '#FAF7ED';
    const borderColor = isDarkMode ? '#3A3A3A' : CARD_BORDER;
    const textPrimary = isDarkMode ? '#E8E8E8' : TEXT_DARK;
    const textSecondary = isDarkMode ? '#A0A0A0' : TEXT_MUTED;
    const inputBg = isDarkMode ? '#303030' : '#FAF7ED';
    const inputBorder = isDarkMode ? '#404040' : CARD_BORDER;
    const iconBg = isDarkMode ? 'rgba(52, 199, 89, 0.14)' : LIGHT_GREEN_BG;
    
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: bgLight },
        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor, backgroundColor: bgCard },
        headerTitle: { fontSize: 16, fontWeight: '600', color: textPrimary, flex: 1, textAlign: 'center' },
        content: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, backgroundColor: bgLight },
        card: { backgroundColor: bgCard, borderWidth: 1, borderColor: borderColor, borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDarkMode ? 0.2 : 0.05, shadowRadius: 2, elevation: 1 },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        testName: { fontSize: 14, fontWeight: '600', color: textPrimary, marginBottom: 4 },
        parametersText: { fontSize: 12, color: textSecondary },
        priceTag: { backgroundColor: iconBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: isDarkMode ? '#1A5A41' : '#D1FAE5' },
        priceAmount: { fontSize: 14, fontWeight: '700', color: isDarkMode ? '#34C759' : PRIMARY_GREEN },
        itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
        itemText: { fontSize: 13, color: textSecondary, flex: 1, paddingRight: 10 },
        itemPrice: { fontSize: 13, color: textPrimary, fontWeight: '500' },
        detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
        detailIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: iconBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        detailLabel: { fontSize: 12, color: textSecondary, fontWeight: '500', marginBottom: 2 },
        detailValue: { fontSize: 13, fontWeight: '600', color: textPrimary },
        divider: { height: 1, backgroundColor: borderColor, marginVertical: 10 },
        breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
        breakdownLabel: { fontSize: 13, color: textSecondary, fontWeight: '500' },
        breakdownValue: { fontSize: 13, fontWeight: '600', color: textPrimary },
        breakdownDivider: { height: 1, backgroundColor: borderColor, marginVertical: 10 },
        totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        totalLabel: { fontSize: 14, fontWeight: '600', color: textPrimary },
        totalValue: { fontSize: 16, fontWeight: '700', color: isDarkMode ? '#34C759' : PRIMARY_GREEN },
        sectionTitle: { fontSize: 13, fontWeight: '600', color: textPrimary, marginBottom: 10 },
        couponRow: { flexDirection: 'row', gap: 8 },
        couponInput: { flex: 1, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: textPrimary, backgroundColor: inputBg },
        applyBtn: { paddingHorizontal: 16, borderRadius: 8, backgroundColor: PRIMARY_GREEN, justifyContent: 'center', alignItems: 'center' },
        applyBtnApplied: { backgroundColor: '#10B981' },
        applyBtnText: { fontSize: 12, fontWeight: '600', color: '#FAF7ED' },
        applyBtnTextApplied: { color: '#FAF7ED' },
        footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: borderColor, backgroundColor: bgCard },
        payBtn: { paddingVertical: 14, backgroundColor: PRIMARY_GREEN, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
        payBtnDisabled: { opacity: 0.6 },
        payBtnText: { fontSize: 15, fontWeight: '700', color: '#FAF7ED' },
        methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1.5, borderColor: borderColor, marginBottom: 8 },
        methodRowActive: { borderColor: PRIMARY_GREEN, backgroundColor: iconBg },
        methodLabel: { flex: 1, fontSize: 13, color: textSecondary, fontWeight: '400' },
        methodLabelActive: { color: textPrimary, fontWeight: '600' },
    });
};

const styles = makeStyles(false);

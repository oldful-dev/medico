import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { paymentService } from '@/services/api/paymentService';
import { labService } from '@/services/api/labService';
import { useUser } from '@/context/UserContext';

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
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();
    const params = useLocalSearchParams<{
        bookingPayload?: string;
        amount?: string;
        label?: string;
    }>();

    const [isLoading, setIsLoading] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [selectedMethod, setSelectedMethod] = useState<string>('UPI');

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
                Alert.alert('Success', `Coupon applied! You saved ₹${res.data.discount}`);
            } else {
                Alert.alert('Invalid', 'This coupon is not valid');
            }
        } catch {
            Alert.alert('Error', 'Could not apply coupon');
        }
    };

    const handlePayment = async () => {
        if (!bookingData) {
            Alert.alert('Error', 'Invalid booking data');
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
                Alert.alert('Error', 'Could not create booking - no response from server');
                return;
            }

            // The response from holdBooking is the updated labOrder object
            // which has: id, clientRefId, redcliffeBookingId, status, etc.
            const bookingId = (bookingRes as any)?.id;

            if (!bookingId) {
                console.error('🩸 Order Summary: No booking ID in response:', bookingRes);
                Alert.alert('Error', `Could not create booking`);
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
                Alert.alert('Error', 'Could not initiate payment');
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
                theme: { color: PRIMARY_GREEN },
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
                Alert.alert('Error', 'Payment verification failed');
            }
        } catch (error: any) {
            console.error('🩸 Order Summary: Payment/Booking error:', error);
            console.error('🩸 Error details:', {
                message: error.message,
                statusCode: error.statusCode,
                details: error.details,
            });
            if (error.code !== 'E_CANCELED') {
                const errorMsg = error.details?.message || error.message || 'Payment failed';
                Alert.alert('Error', errorMsg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order Summary</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Content */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* Test Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.testName}>{params.label}</Text>
                            <Text style={styles.parametersText}>{bookingData?.packages[0]?.name}</Text>
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
                            <Ionicons name="calendar" size={16} color={PRIMARY_GREEN} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.detailLabel}>Date & Time</Text>
                            <Text style={styles.detailValue}>
                                {bookingData?.slot?.date}, {bookingData?.slot?.time}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Collection Type */}
                    <View style={styles.detailRow}>
                        <View style={styles.detailIcon}>
                            <Ionicons name="home" size={16} color={PRIMARY_GREEN} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.detailLabel}>Collection Type</Text>
                            <Text style={styles.detailValue}>Home Collection</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Address */}
                    <View style={styles.detailRow}>
                        <View style={styles.detailIcon}>
                            <Ionicons name="location" size={16} color={PRIMARY_GREEN} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.detailLabel}>Address</Text>
                            <Text style={styles.detailValue} numberOfLines={2}>
                                {bookingData?.address?.line1}, {bookingData?.address?.pincode}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Price Breakdown */}
                <View style={styles.card}>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Subtotal</Text>
                        <Text style={styles.breakdownValue}>₹{baseAmount.toFixed(2)}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Convenience Fee</Text>
                        <Text style={styles.breakdownValue}>₹{convenienceFee.toFixed(2)}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>GST (18%)</Text>
                        <Text style={styles.breakdownValue}>₹{gst.toFixed(2)}</Text>
                    </View>

                    {discount > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: PRIMARY_GREEN }]}>Discount</Text>
                            <Text style={[styles.breakdownValue, { color: PRIMARY_GREEN }]}>-₹{discount.toFixed(2)}</Text>
                        </View>
                    )}

                    <View style={styles.breakdownDivider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Coupon Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Apply Coupon Code</Text>
                    <View style={styles.couponRow}>
                        <TextInput
                            placeholder="Enter coupon code"
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
                                {couponApplied ? '✓' : 'Apply'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Payment Method */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    {PAYMENT_METHODS.map(m => (
                        <TouchableOpacity
                            key={m.type}
                            style={[styles.methodRow, selectedMethod === m.type && styles.methodRowActive]}
                            onPress={() => setSelectedMethod(m.type)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name={m.icon as any} size={20} color={selectedMethod === m.type ? PRIMARY_GREEN : TEXT_MUTED} />
                            <Text style={[styles.methodLabel, selectedMethod === m.type && styles.methodLabelActive]}>
                                {m.label}
                            </Text>
                            <Ionicons
                                name={selectedMethod === m.type ? 'radio-button-on' : 'radio-button-off'}
                                size={20}
                                color={selectedMethod === m.type ? PRIMARY_GREEN : TEXT_MUTED}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Footer CTA */}
            <View style={styles.footer}>
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
                                ? 'Confirm Booking' 
                                : `Confirm & Pay ₹${totalAmount.toFixed(2)}`}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_DARK,
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
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
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
        color: TEXT_DARK,
        marginBottom: 4,
    },
    parametersText: {
        fontSize: 12,
        color: TEXT_MUTED,
    },
    priceTag: {
        backgroundColor: LIGHT_GREEN_BG,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1FAE5',
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
        color: TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    divider: {
        height: 1,
        backgroundColor: CARD_BORDER,
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
        color: TEXT_MUTED,
        fontWeight: '500',
    },
    breakdownValue: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    breakdownDivider: {
        height: 1,
        backgroundColor: CARD_BORDER,
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
        color: TEXT_DARK,
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_GREEN,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 10,
    },
    couponRow: {
        flexDirection: 'row',
        gap: 8,
    },
    couponInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: TEXT_DARK,
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
        color: '#FFFFFF',
    },
    applyBtnTextApplied: {
        color: '#FFFFFF',
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
        backgroundColor: '#FFFFFF',
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
        color: '#FFFFFF',
    },
    methodRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12, 
        paddingVertical: 12, 
        paddingHorizontal: 16, 
        borderRadius: 8, 
        borderWidth: 1.5, 
        borderColor: CARD_BORDER,
        marginBottom: 8,
    },
    methodRowActive: { borderColor: PRIMARY_GREEN, backgroundColor: LIGHT_GREEN_BG },
    methodLabel: { flex: 1, fontSize: 13, color: TEXT_MUTED, fontWeight: '400' },
    methodLabelActive: { color: TEXT_DARK, fontWeight: '600' },
});

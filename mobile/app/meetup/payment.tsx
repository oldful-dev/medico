import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing } from '@/constants/theme';

const PRIMARY = '#02743F';

const INCLUDES = [
    'Meetup coordination',
    'Event management support',
    'Registration handling',
    'Basic assistance support',
];

const EXTRA_CHARGES = [
    'Snacks',
    'Transportation',
    'Personal caregiver support',
    'Special medical assistance',
];

const PAYMENT_METHODS = [
    { id: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
    { id: 'card', label: 'Credit / Debit Card', icon: 'card-outline' },
    { id: 'netbanking', label: 'Net Banking', icon: 'globe-outline' },
    { id: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
];

export default function MeetupPaymentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<any>();

    const [selectedMethod, setSelectedMethod] = useState('upi');
    const [paying, setPaying] = useState(false);

    const serviceCharge = 299;

    const handlePay = async () => {
        setPaying(true);
        // Simulate payment
        setTimeout(() => {
            setPaying(false);
            router.replace({
                pathname: '/meetup/confirmation',
                params: { ...params },
            } as any);
        }, 1800);
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={PRIMARY} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment</Text>
                <View style={{ width: 30 }} />
            </View>

            {/* Step indicator */}
            <View style={styles.stepBar}>
                {['Registration', 'Pickup', 'Payment', 'Confirm'].map((step, i) => (
                    <React.Fragment key={step}>
                        <View style={styles.stepItem}>
                            <View style={[styles.stepDot, i <= 2 && styles.stepDotActive]}>
                                {i < 2
                                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                                    : i === 2
                                        ? <Ionicons name="card-outline" size={11} color="#fff" />
                                        : <Text style={styles.stepNum}>4</Text>
                                }
                            </View>
                            <Text style={[styles.stepLabel, i <= 2 && styles.stepLabelActive]}>{step}</Text>
                        </View>
                        {i < 3 && <View style={[styles.stepLine, i < 2 && styles.stepLineActive]} />}
                    </React.Fragment>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Service charge */}
                <View style={styles.chargeCard}>
                    <Text style={styles.chargeLabel}>Service Charge</Text>
                    <Text style={styles.chargeAmount}>₹{serviceCharge}</Text>

                    {/* Included */}
                    <View style={styles.divider} />
                    <Text style={styles.subHeading}>Included in Service Charge</Text>
                    {INCLUDES.map((item, i) => (
                        <View key={i} style={styles.includeRow}>
                            <Ionicons name="checkmark-circle" size={15} color={PRIMARY} />
                            <Text style={styles.includeText}>{item}</Text>
                        </View>
                    ))}

                    {/* Extra */}
                    <View style={styles.divider} />
                    <Text style={styles.extraHeading}>Additional Charges (Extra)</Text>
                    {EXTRA_CHARGES.map((item, i) => (
                        <View key={i} style={styles.extraRow}>
                            <Ionicons name="close-circle" size={15} color="#EF4444" />
                            <Text style={styles.extraText}>{item}</Text>
                        </View>
                    ))}
                </View>

                {/* Payment method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Payment Method</Text>
                    {PAYMENT_METHODS.map(method => (
                        <TouchableOpacity
                            key={method.id}
                            style={[styles.methodRow, selectedMethod === method.id && styles.methodRowActive]}
                            onPress={() => setSelectedMethod(method.id)}
                            activeOpacity={0.75}
                        >
                            <View style={[styles.methodIcon, selectedMethod === method.id && styles.methodIconActive]}>
                                <Ionicons name={method.icon as any} size={18} color={selectedMethod === method.id ? '#fff' : Colors.textMuted} />
                            </View>
                            <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelActive]}>
                                {method.label}
                            </Text>
                            <View style={[styles.radio, selectedMethod === method.id && styles.radioActive]}>
                                {selectedMethod === method.id && <View style={styles.radioDot} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Security note */}
                <View style={styles.secureRow}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={PRIMARY} />
                    <Text style={styles.secureText}>100% Secure & Encrypted Payment</Text>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <View>
                    <Text style={styles.totalLabel}>Total Payable</Text>
                    <Text style={styles.totalAmount}>₹{serviceCharge}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.payBtn, paying && styles.payBtnDisabled]}
                    onPress={handlePay}
                    disabled={paying}
                    activeOpacity={0.85}
                >
                    {paying
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Ionicons name="lock-closed" size={16} color="#fff" />
                            <Text style={styles.payBtnText}>Pay ₹{serviceCharge}</Text>
                        </>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5FAF7' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: PRIMARY, paddingHorizontal: Spacing.lg, paddingVertical: 14,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: '#fff' },
    stepBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: PRIMARY, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 4,
    },
    stepItem: { alignItems: 'center', gap: 4 },
    stepDot: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center',
    },
    stepDotActive: { backgroundColor: Colors.accent },
    stepNum: { fontFamily: Fonts.semiBold, fontSize: 10, color: 'rgba(255,255,255,0.6)' },
    stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
    stepLineActive: { backgroundColor: Colors.accent },
    stepLabel: { fontFamily: Fonts.regular, fontSize: 9, color: 'rgba(255,255,255,0.5)' },
    stepLabelActive: { color: '#fff', fontFamily: Fonts.semiBold },
    scrollContent: { padding: Spacing.lg },
    chargeCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    chargeLabel: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 4 },
    chargeAmount: { fontFamily: Fonts.bold, fontSize: 40, color: PRIMARY, textAlign: 'center', marginBottom: 4 },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 14 },
    subHeading: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textDark, marginBottom: 10 },
    includeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    includeText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textBody, flex: 1 },
    extraHeading: { fontFamily: Fonts.semiBold, fontSize: 13, color: '#DC2626', marginBottom: 10 },
    extraRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    extraText: { fontFamily: Fonts.regular, fontSize: 13, color: '#DC2626', flex: 1 },
    section: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark, marginBottom: 14 },
    methodRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    methodRowActive: { backgroundColor: '#F0FAF4', marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 10, borderBottomColor: 'transparent' },
    methodIcon: {
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
    },
    methodIconActive: { backgroundColor: PRIMARY },
    methodLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBody },
    methodLabelActive: { fontFamily: Fonts.semiBold, color: Colors.textDark },
    radio: {
        width: 20, height: 20, borderRadius: 10, borderWidth: 2,
        borderColor: Colors.borderLight, justifyContent: 'center', alignItems: 'center',
    },
    radioActive: { borderColor: PRIMARY },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
    secureRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingBottom: 4,
    },
    secureText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
    footer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: Colors.borderLight,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, elevation: 8,
    },
    totalLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
    totalAmount: { fontFamily: Fonts.semiBold, fontSize: 22, color: Colors.textDark },
    payBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: PRIMARY, borderRadius: 14,
        paddingHorizontal: 28, paddingVertical: 14, minWidth: 140, justifyContent: 'center',
    },
    payBtnDisabled: { opacity: 0.65 },
    payBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' },
});

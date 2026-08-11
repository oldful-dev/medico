import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { labService, LabOrderListItem } from '@/services/api/labService';

const PRIMARY = '#02743F';
const PRIMARY_LIGHT = '#E8F5EE';
const PRIMARY_DARK = '#015C32';

export default function BloodTestSuccessScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const params = useLocalSearchParams<{
        bookingId?: string;
        amount?: string;
        packageName?: string;
        isCod?: string;
        isCash?: string;
    }>();

    const isCod = params.isCod === 'true' || params.isCash === 'true';

    const bg = isDarkMode ? '#121212' : '#FAF7ED';
    const cardBg = isDarkMode ? '#1E1E1E' : '#F8FAF9';
    const border = isDarkMode ? '#2A2A2A' : '#E5E7EB';
    const textPrimary = isDarkMode ? '#F0F0F0' : '#1A1A1A';
    const textMuted = isDarkMode ? '#909090' : '#6B7280';

    // Live status right after booking — replaces the old static "what's next"
    // script so the first thing the customer sees reflects the real order,
    // not a canned 3-step promise that may not match reality.
    const [liveOrder, setLiveOrder] = useState<LabOrderListItem | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);

    useEffect(() => {
        if (!params.bookingId) { setStatusLoading(false); return; }
        labService.getLabOrderById(params.bookingId)
            .then(res => { if (res.success && res.data) setLiveOrder(res.data as LabOrderListItem); })
            .catch(() => { /* fall back to generic steps below */ })
            .finally(() => setStatusLoading(false));
    }, [params.bookingId]);

    const STATUS_STEP_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; textKey: string }> = {
        PENDING:         { icon: 'time-outline',          textKey: 'blood_test_success.status_pending' },
        HOLD_CREATED:    { icon: 'time-outline',          textKey: 'blood_test_success.status_pending' },
        PAYMENT_PENDING: { icon: 'card-outline',           textKey: 'blood_test_success.status_payment_pending' },
        CONFIRMED:       { icon: 'checkmark-circle-outline', textKey: 'blood_test_success.status_confirmed' },
        SAMPLE_COLLECTED:{ icon: 'flask-outline',           textKey: 'blood_test_success.status_sample_collected' },
        PROCESSING:      { icon: 'flask-outline',           textKey: 'blood_test_success.status_processing' },
        REPORT_GENERATED:{ icon: 'document-text-outline',   textKey: 'blood_test_success.status_report_ready' },
        RESCHEDULED:     { icon: 'calendar-outline',         textKey: 'blood_test_success.status_rescheduled' },
        FAILED:          { icon: 'alert-circle-outline',     textKey: 'blood_test_success.status_failed' },
        MANUAL_RECOVERY_NEEDED: { icon: 'alert-circle-outline', textKey: 'blood_test_success.status_needs_attention' },
    };
    const liveStatusCfg = liveOrder ? STATUS_STEP_CONFIG[liveOrder.status] : null;

    const steps = [
        { icon: 'bicycle-outline' as const, text: t('blood_test_success.phlebotomist_step') },
        { icon: 'flask-outline' as const, text: t('blood_test_success.collection_step') },
        { icon: 'document-text-outline' as const, text: t('blood_test_success.reports_step') },
    ];

    const details = [
        { label: t('blood_test_success.booking_id'), value: `#${params.bookingId || 'BT124567'}` },
        { label: t('blood_test_success.package_label'), value: params.packageName || 'Blood Test' },
        { 
            label: isCod ? 'Payable Amount (COD)' : t('blood_test_success.amount_paid'), 
            value: `₹${params.amount || '0'}` 
        },
    ];

    return (
        <View style={[styles.screen, { backgroundColor: bg, paddingTop: insets.top }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={bg} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
            >
                {/* Hero */}
                <View style={styles.hero}>
                    <View style={[styles.iconRing, { backgroundColor: isDarkMode ? '#0D2B1E' : PRIMARY_LIGHT }]}>
                        <View style={[styles.iconCircle, { backgroundColor: PRIMARY }]}>
                            <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                        </View>
                    </View>
                    <Text style={[styles.title, { color: textPrimary }]}>
                        {isCod ? 'Booking Confirmed!' : t('blood_test_success.payment_successful')}
                    </Text>
                    <Text style={[styles.subtitle, { color: textMuted }]}>
                        {isCod 
                            ? 'Your blood test has been scheduled. Please pay in cash at sample collection.'
                            : t('blood_test_success.booked_successfully')
                        }
                    </Text>
                </View>

                {/* Details card */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                    {details.map((row, i) => (
                        <View key={row.label} style={[styles.detailRow, i > 0 && { borderTopWidth: 1, borderTopColor: border }]}>
                            <Text style={[styles.detailLabel, { color: textMuted }]}>{row.label}</Text>
                            <Text style={[styles.detailValue, { color: textPrimary }]}>{row.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Confirmation note */}
                <View style={[styles.noticeRow, { backgroundColor: isDarkMode ? '#0D2B1E' : PRIMARY_LIGHT, borderColor: isDarkMode ? '#1A4A32' : '#C6E9D9' }]}>
                    <Ionicons name="information-circle-outline" size={18} color={PRIMARY} />
                    <Text style={[styles.noticeText, { color: isDarkMode ? '#7FD4A8' : PRIMARY_DARK }]}>
                        {t('blood_test_success.confirmation_note')}
                    </Text>
                </View>

                {/* Current status (live) or generic what's-next (fallback) */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                    <Text style={[styles.cardHeading, { color: textPrimary }]}>
                        {liveStatusCfg ? t('blood_test_success.current_status') : t('blood_test_success.whats_next')}
                    </Text>

                    {statusLoading ? (
                        <ActivityIndicator size="small" color={PRIMARY} style={{ marginVertical: 8 }} />
                    ) : liveStatusCfg ? (
                        <View style={styles.stepRow}>
                            <View style={[styles.stepIconBox, { backgroundColor: isDarkMode ? '#1A3D2B' : PRIMARY_LIGHT }]}>
                                <Ionicons name={liveStatusCfg.icon} size={18} color={PRIMARY} />
                            </View>
                            <Text style={[styles.stepText, { color: textPrimary }]}>{t(liveStatusCfg.textKey)}</Text>
                        </View>
                    ) : (
                        steps.map((step, i) => (
                            <View key={i} style={styles.stepRow}>
                                <View style={[styles.stepIconBox, { backgroundColor: isDarkMode ? '#1A3D2B' : PRIMARY_LIGHT }]}>
                                    <Ionicons name={step.icon} size={18} color={PRIMARY} />
                                </View>
                                <Text style={[styles.stepText, { color: textPrimary }]}>{step.text}</Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: bg, borderTopColor: border, paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: PRIMARY }]}
                    onPress={() => router.push('/my-bookings')}
                    activeOpacity={0.85}
                >
                    <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>{t('blood_test_success.view_my_bookings')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: PRIMARY, backgroundColor: isDarkMode ? '#1A3D2B' : PRIMARY_LIGHT }]}
                    onPress={() => router.replace('/(tabs)' as any)}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.secondaryBtnText, { color: PRIMARY }]}>{t('blood_test_success.back_to_home')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 32 },

    hero: { alignItems: 'center', marginBottom: 28 },
    iconRing: {
        width: 120, height: 120, borderRadius: 60,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center', letterSpacing: -0.3 },
    subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },

    card: {
        borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
    },
    cardHeading: { fontSize: 15, fontWeight: '700', marginBottom: 16, letterSpacing: -0.2 },

    detailRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12,
    },
    detailLabel: { fontSize: 13, fontWeight: '500' },
    detailValue: { fontSize: 14, fontWeight: '700' },

    noticeRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16,
    },
    noticeText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },

    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    stepIconBox: {
        width: 38, height: 38, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    stepText: { flex: 1, fontSize: 13, lineHeight: 19, paddingTop: 9 },

    footer: {
        paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, gap: 10,
    },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 15, borderRadius: 14,
    },
    primaryBtnText: { color: '#FAF7ED', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
    },
    secondaryBtnText: { fontSize: 15, fontWeight: '600' },
});

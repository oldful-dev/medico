// Subscription & Membership screen
// Shows active plan, benefits, upgrade options, renewal
import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { planService, Plan, BillingCycle } from '@/services/api/planService';
import { useUser } from '@/context/UserContext';

// ─── Tier config ──────────────────────────────────────────
const TIER_CONFIG: Record<string, { color: string; bg: string; gradient: string; icon: string }> = {
    'Basic Care':    { color: '#1D4ED8', bg: '#EFF6FF', gradient: '#DBEAFE', icon: 'shield-outline' },
    'Care Plus':     { color: '#048357', bg: '#F0FDF4', gradient: '#D1FAE5', icon: 'shield-half-outline' },
    'Premium Care':  { color: '#B45309', bg: '#FFFBEB', gradient: '#FEF3C7', icon: 'shield-checkmark-outline' },
};

function getTierConfig(name: string) {
    const key = Object.keys(TIER_CONFIG).find(k => name?.includes(k.split(' ')[0]));
    return TIER_CONFIG[key || 'Basic Care'] || TIER_CONFIG['Basic Care'];
}

function formatDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
}

function parseBenefits(raw?: string): string[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { }
    return raw.split('\n').map(s => s.trim()).filter(Boolean);
}

type CycleKey = 'QUARTERLY' | 'BIANNUAL' | 'YEARLY';
const CYCLES: { key: CycleKey; label: string; months: number }[] = [
    { key: 'QUARTERLY', label: '3 Months', months: 3 },
    { key: 'BIANNUAL',  label: '6 Months', months: 6 },
    { key: 'YEARLY',    label: '1 Year',   months: 12 },
];

function getPlanPrice(plan: Plan, cycle: CycleKey): number {
    if (cycle === 'QUARTERLY') return plan.quarterlyPrice;
    if (cycle === 'BIANNUAL')  return plan.biannualPrice;
    return plan.yearlyPrice;
}

// ─── Plan Card ────────────────────────────────────────────
function PlanCard({
    plan, cycle, isActive, onSelect,
}: {
    plan: Plan; cycle: CycleKey; isActive: boolean; onSelect: () => void;
}) {
    const tier = getTierConfig(plan.name);
    const price = getPlanPrice(plan, cycle);
    const benefits = parseBenefits(plan.benefits);
    const cycleLabel = CYCLES.find(c => c.key === cycle)?.label || '';

    return (
        <TouchableOpacity
            style={[styles.planCard, { borderColor: isActive ? tier.color : '#E5E7EB' }, isActive && { borderWidth: 2 }]}
            onPress={onSelect}
            activeOpacity={0.85}
        >
            {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: tier.color }]}>
                    <Text style={styles.activeBadgeText}>Active Plan</Text>
                </View>
            )}

            <View style={[styles.planHeader, { backgroundColor: tier.gradient }]}>
                <View style={[styles.planIconWrap, { backgroundColor: tier.bg }]}>
                    <Ionicons name={tier.icon as any} size={24} color={tier.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: tier.color }]}>{plan.name}</Text>
                    {plan.description ? <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text> : null}
                </View>
            </View>

            <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, { color: tier.color }]}>₹{price.toLocaleString('en-IN')}</Text>
                <Text style={styles.planCycleLabel}>/ {cycleLabel}</Text>
            </View>

            {benefits.length > 0 && (
                <View style={styles.benefitsList}>
                    {benefits.slice(0, 4).map((b, i) => (
                        <View key={i} style={styles.benefitRow}>
                            <Ionicons name="checkmark-circle" size={14} color={tier.color} />
                            <Text style={styles.benefitText}>{b}</Text>
                        </View>
                    ))}
                    {benefits.length > 4 && (
                        <Text style={[styles.moreBenefits, { color: tier.color }]}>+{benefits.length - 4} more benefits</Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Screen ───────────────────────────────────────────────
export default function SubscriptionScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCycle, setSelectedCycle] = useState<CycleKey>('YEARLY');
    const [initiating, setInitiating] = useState<string | null>(null); // planId being initiated

    const activeSub = profile?.subscriptions?.[0];
    const activePlanId = activeSub?.planId;

    useFocusEffect(useCallback(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await planService.getPlans();
                if (res.success && res.data) {
                    setPlans(res.data.filter(p => p.isVisible).sort((a, b) => a.sortOrder - b.sortOrder));
                }
            } catch { }
            setLoading(false);
        })();
    }, []));

    const handleSelectPlan = async (plan: Plan) => {
        const price = getPlanPrice(plan, selectedCycle);
        const cycleLabel = CYCLES.find(c => c.key === selectedCycle)?.label || '';

        Alert.alert(
            `Subscribe to ${plan.name}`,
            `₹${price.toLocaleString('en-IN')} for ${cycleLabel}\n\nProceed to payment?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    onPress: async () => {
                        setInitiating(plan.id);
                        try {
                            const res = await planService.initiateSubscription({
                                planId: plan.id,
                                billingCycle: selectedCycle,
                                amount: price,
                            });
                            if (res.success && res.data) {
                                router.push({
                                    pathname: '/payment/checkout',
                                    params: {
                                        subscriptionId: res.data.id,
                                        amount: String(price),
                                        planName: plan.name,
                                    },
                                } as any);
                            } else {
                                Alert.alert('Error', res.message || 'Could not initiate subscription.');
                            }
                        } catch {
                            Alert.alert('Error', 'Something went wrong. Please try again.');
                        } finally {
                            setInitiating(null);
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Membership</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Active subscription status */}
                {activeSub && (
                    <View style={styles.activeSubCard}>
                        <View style={styles.activeSubTop}>
                            <View style={styles.activeSubLeft}>
                                <Ionicons name="ribbon" size={26} color="#B45309" />
                                <View>
                                    <Text style={styles.activeSubTitle}>{activeSub.plan?.name || 'Active Plan'}</Text>
                                    <Text style={styles.activeSubMeta}>
                                        Since: {formatDate(activeSub.startDate || activeSub.createdAt || '')}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.activeStatusBadge, { backgroundColor: activeSub.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2' }]}>
                                <Text style={{ fontFamily: Fonts.medium, fontSize: 11, color: activeSub.status === 'ACTIVE' ? '#059669' : '#DC2626' }}>
                                    {activeSub.status || 'Active'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.renewalRow}>
                            <View style={styles.renewalDateBlock}>
                                <Ionicons name="time-outline" size={14} color="#B45309" />
                                <Text style={styles.renewalLabel}>Renews on</Text>
                                <Text style={styles.renewalDate}>{formatDate(activeSub.expiryDate || '')}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.renewBtn}
                                onPress={() => {
                                    const activePlan = plans.find(p => p.id === activePlanId);
                                    if (activePlan) handleSelectPlan(activePlan);
                                    else Alert.alert('Renew', 'Select a plan below to renew your membership.');
                                }}
                            >
                                <Ionicons name="refresh-outline" size={14} color="#fff" />
                                <Text style={styles.renewBtnText}>Renew Now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Billing cycle selector */}
                <Text style={styles.sectionLabel}>Choose Billing Cycle</Text>
                <View style={styles.cycleSelector}>
                    {CYCLES.map(c => (
                        <TouchableOpacity
                            key={c.key}
                            style={[styles.cycleBtn, selectedCycle === c.key && styles.cycleBtnActive]}
                            onPress={() => setSelectedCycle(c.key)}
                        >
                            <Text style={[styles.cycleBtnText, selectedCycle === c.key && styles.cycleBtnTextActive]}>
                                {c.label}
                            </Text>
                            {c.key === 'YEARLY' && (
                                <View style={styles.savingsBadge}>
                                    <Text style={styles.savingsBadgeText}>Best</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Plans */}
                <Text style={styles.sectionLabel}>Choose a Plan</Text>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Loading plans…</Text>
                    </View>
                ) : plans.length === 0 ? (
                    <View style={styles.center}>
                        <Ionicons name="ribbon-outline" size={48} color="#E5E7EB" />
                        <Text style={styles.emptyText}>No plans available right now.</Text>
                    </View>
                ) : (
                    plans.map(plan => (
                        <View key={plan.id} style={{ position: 'relative' }}>
                            <PlanCard
                                plan={plan}
                                cycle={selectedCycle}
                                isActive={plan.id === activePlanId}
                                onSelect={() => handleSelectPlan(plan)}
                            />
                            {initiating === plan.id && (
                                <View style={styles.cardOverlay}>
                                    <ActivityIndicator color={Colors.primary} />
                                </View>
                            )}
                        </View>
                    ))
                )}

                {/* Cancel note */}
                {activeSub && (
                    <TouchableOpacity style={styles.cancelLink} onPress={() => router.push('/help-support' as any)}>
                        <Text style={styles.cancelLinkText}>Want to cancel your subscription? Contact support →</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textDark },
    scrollContent: { padding: 16 },

    activeSubCard: {
        backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16,
        marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A',
    },
    activeSubTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    activeSubLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    activeSubTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark },
    activeSubMeta: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    activeStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    renewalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#FEF3C7', paddingTop: 12 },
    renewalDateBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    renewalLabel: { fontFamily: Fonts.regular, fontSize: 12, color: '#B45309' },
    renewalDate: { fontFamily: Fonts.semiBold, fontSize: 13, color: '#92400E' },
    renewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#B45309', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    renewBtnText: { fontFamily: Fonts.medium, fontSize: 13, color: '#fff' },

    sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textDark, marginBottom: 10 },

    cycleSelector: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    cycleBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent',
    },
    cycleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    cycleBtnText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textMuted },
    cycleBtnTextActive: { color: '#fff' },
    savingsBadge: { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginTop: 2 },
    savingsBadgeText: { fontFamily: Fonts.medium, fontSize: 9, color: '#B45309' },

    planCard: {
        backgroundColor: '#fff', borderRadius: 16, marginBottom: 14,
        borderWidth: 1, overflow: 'hidden',
        ...Shadow.card,
    },
    activeBadge: { paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end', borderBottomLeftRadius: 8 },
    activeBadgeText: { fontFamily: Fonts.medium, fontSize: 11, color: '#fff' },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
    planIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    planName: { fontFamily: Fonts.semiBold, fontSize: 16 },
    planDesc: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: 2, lineHeight: 16 },
    planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: 16, paddingBottom: 12 },
    planPrice: { fontFamily: Fonts.semiBold, fontSize: 26 },
    planCycleLabel: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted },

    benefitsList: { paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
    benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    benefitText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textBody, flex: 1, lineHeight: 18 },
    moreBenefits: { fontFamily: Fonts.medium, fontSize: 12, marginTop: 2 },

    cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },

    center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    loadingText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted },
    emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted },

    cancelLink: { alignItems: 'center', marginTop: 8 },
    cancelLinkText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline' },
});

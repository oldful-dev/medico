// Subscription & Membership screen
// Shows active plan, benefits, upgrade options, renewal
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { planService, Plan, BillingCycle } from '@/services/api/planService';
import { useUser } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from 'react-i18next';

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

function calculateDaysRemaining(expiryDate?: string): number | null {
    if (!expiryDate) return null;
    try {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diff = expiry.getTime() - today.getTime();
        const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
        return daysLeft > 0 ? daysLeft : 0;
    } catch {
        return null;
    }
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

// ─── Styles ───────────────────────────────────────────────
const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: isDarkMode ? '#252525' : '#fff', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#3A3A3A' : '#E5E7EB',
    },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: colors.textDark },
    scrollContent: { padding: 16 },
    activeSubCard: {
        backgroundColor: isDarkMode ? '#332400' : '#FFFBEB', borderRadius: 14, padding: 16,
        marginBottom: 20, borderWidth: 1, borderColor: isDarkMode ? '#654321' : '#FDE68A',
    },
    activeSubTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    activeSubLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    activeSubTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: colors.textDark },
    activeSubMeta: { fontFamily: Fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
    activeStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    durationSection: { borderTopWidth: 1, borderTopColor: isDarkMode ? '#654321' : '#FEF3C7', paddingTop: 12, marginBottom: 12, gap: 10 },
    durationBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    daysRemainingBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    durationLabel: { fontFamily: Fonts.regular, fontSize: 11, color: '#B45309', marginBottom: 2 },
    durationValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: '#92400E', lineHeight: 18 },
    daysLabel: { fontFamily: Fonts.regular, fontSize: 11, color: '#B45309', marginBottom: 2 },
    daysValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: '#059669' },
    daysValueWarning: { color: '#DC2626' },
    renewalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: isDarkMode ? '#654321' : '#FEF3C7', paddingTop: 12, marginBottom: 12 },
    renewalDateBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    renewalLabel: { fontFamily: Fonts.regular, fontSize: 12, color: '#B45309' },
    renewalDate: { fontFamily: Fonts.semiBold, fontSize: 13, color: '#92400E' },
    renewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#B45309', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    renewBtnText: { fontFamily: Fonts.medium, fontSize: 13, color: '#fff' },
    restrictionNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: isDarkMode ? 'rgba(180, 83, 9, 0.2)' : 'rgba(180, 83, 9, 0.1)', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#B45309' },
    restrictionText: { fontFamily: Fonts.regular, fontSize: 12, color: '#92400E', flex: 1, lineHeight: 16 },
    sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: colors.textDark, marginBottom: 10 },
    cycleSelector: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    cycleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: isDarkMode ? '#3A3A3A' : '#F3F4F6', borderWidth: 1, borderColor: 'transparent' },
    cycleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    cycleBtnText: { fontFamily: Fonts.medium, fontSize: 13, color: colors.textMuted },
    cycleBtnTextActive: { color: '#fff' },
    savingsBadge: { backgroundColor: isDarkMode ? '#654321' : '#FEF3C7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginTop: 2 },
    savingsBadgeText: { fontFamily: Fonts.medium, fontSize: 9, color: '#B45309' },
    planCard: { backgroundColor: isDarkMode ? '#252525' : '#fff', borderRadius: 16, marginBottom: 14, borderWidth: 1, overflow: 'hidden', ...Shadow.card },
    planCardDisabled: { opacity: 0.5 },
    activeBadge: { paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end', borderBottomLeftRadius: 8 },
    activeBadgeText: { fontFamily: Fonts.medium, fontSize: 11, color: '#fff' },
    disabledOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: isDarkMode ? 'rgba(37, 37, 37, 0.85)' : 'rgba(255, 255, 255, 0.85)', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
    disabledText: { fontFamily: Fonts.semiBold, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
    planIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    planName: { fontFamily: Fonts.semiBold, fontSize: 16 },
    planDesc: { fontFamily: Fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
    planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: 16, paddingBottom: 12 },
    planPrice: { fontFamily: Fonts.semiBold, fontSize: 26 },
    planCycleLabel: { fontFamily: Fonts.regular, fontSize: 13, color: colors.textMuted },
    benefitsList: { paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
    benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    benefitText: { fontFamily: Fonts.regular, fontSize: 13, color: isDarkMode ? '#E0E0E0' : '#2F2F2F', flex: 1, lineHeight: 18 },
    moreBenefits: { fontFamily: Fonts.medium, fontSize: 12, marginTop: 2 },
    cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: isDarkMode ? 'rgba(37, 37, 37, 0.7)' : 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
    center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    loadingText: { fontFamily: Fonts.regular, fontSize: 14, color: colors.textMuted },
    emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: colors.textMuted },
    cancelLink: { alignItems: 'center', marginTop: 8 },
    cancelLinkText: { fontFamily: Fonts.regular, fontSize: 13, color: colors.textMuted, textDecorationLine: 'underline' },
});

// ─── Plan Card ────────────────────────────────────────────
function PlanCard({
    plan, cycle, isActive, onSelect, isDisabled,
}: {
    plan: Plan; cycle: CycleKey; isActive: boolean; onSelect: () => void; isDisabled?: boolean;
}) {
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(isDarkMode, colors);
    const tier = getTierConfig(plan.name);
    const cardBg = isDarkMode ? '#1E1E1E' : '#FFFFFF';
    const headerBg = isDarkMode ? `${tier.color}22` : tier.gradient;
    const iconBg = isDarkMode ? `${tier.color}33` : tier.bg;
    const price = getPlanPrice(plan, cycle);
    const benefits = parseBenefits(plan.benefits);

    const planNameKey = plan.name.toLowerCase().replace(' ', '_');
    const hasTranslation = t('subscription.plan_names.' + planNameKey) !== 'subscription.plan_names.' + planNameKey;
    const localizedPlanName = hasTranslation ? t('subscription.plan_names.' + planNameKey) : plan.name;

    return (
        <TouchableOpacity
            style={[
                styles.planCard,
                { borderColor: isActive ? tier.color : isDarkMode ? '#3A3A3A' : '#E5E7EB', backgroundColor: cardBg },
                isActive && { borderWidth: 2 },
                isDisabled && !isActive && styles.planCardDisabled,
            ]}
            onPress={onSelect}
            activeOpacity={isDisabled ? 1 : 0.85}
            disabled={isDisabled}
        >
            {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: tier.color }]}>
                    <Text style={styles.activeBadgeText}>{t('subscription.active_plan')}</Text>
                </View>
            )}

            <View style={[styles.planHeader, { backgroundColor: headerBg }]}>
                <View style={[styles.planIconWrap, { backgroundColor: iconBg }]}>
                    <Ionicons name={tier.icon as any} size={24} color={tier.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: tier.color }]}>{localizedPlanName}</Text>
                    {plan.description ? <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text> : null}
                </View>
            </View>

            <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, { color: tier.color }]}>₹{price.toLocaleString('en-IN')}</Text>
                <Text style={styles.planCycleLabel}>/ {t('subscription.cycles.' + cycle.toLowerCase())}</Text>
            </View>

            {benefits.length > 0 && (
                <View style={[styles.benefitsList, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
                    {benefits.slice(0, 4).map((b, i) => (
                        <View key={i} style={styles.benefitRow}>
                            <Ionicons name="checkmark-circle" size={14} color={tier.color} />
                            <Text style={[styles.benefitText, { color: colors.textBody }]}>{b}</Text>
                        </View>
                    ))}
                    {benefits.length > 4 && (
                        <Text style={[styles.moreBenefits, { color: tier.color }]}>
                            {t('subscription.more_benefits', { count: benefits.length - 4 })}
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Screen ───────────────────────────────────────────────
export default function SubscriptionScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { profile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(isDarkMode, colors);
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

    const handleSelectPlan = async (plan: Plan, isFromRenewButton: boolean = false) => {
        const planNameKey = plan.name.toLowerCase().replace(' ', '_');
        const hasTranslation = t('subscription.plan_names.' + planNameKey) !== 'subscription.plan_names.' + planNameKey;
        const localizedPlanName = hasTranslation ? t('subscription.plan_names.' + planNameKey) : plan.name;

        // ─── Restrict plan change if user has active subscription ───
        if (activeSub && activeSub.status === 'ACTIVE') {
            // Only allow renewing the same plan via Renew button or contact support for upgrade
            if (plan.id === activePlanId && isFromRenewButton) {
                // User can renew their current plan via Renew Now button
                const price = getPlanPrice(plan, selectedCycle);
                const cycleLabel = t('subscription.cycles.' + selectedCycle.toLowerCase());

                Alert.alert(
                    t('subscription.renew_title', { name: localizedPlanName }),
                    t('subscription.renew_confirm_msg', { price: price.toLocaleString('en-IN'), cycle: cycleLabel }),
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('common.continue'),
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
                                        Alert.alert(t('common.error'), res.message || t('subscription.initiate_failed'));
                                    }
                                } catch {
                                    Alert.alert(t('common.error'), t('subscription.generic_failed'));
                                } finally {
                                    setInitiating(null);
                                }
                            },
                        },
                    ]
                );
            } else if (plan.id === activePlanId && !isFromRenewButton) {
                // User tapped card directly - block it
                Alert.alert(
                    t('subscription.renew_plan_alert_title'),
                    t('subscription.renew_plan_alert_msg'),
                    [{ text: t('common.ok'), style: 'cancel' }]
                );
            } else {
                // User cannot switch plans while active
                const activePlanName = activeSub.plan?.name || '';
                const activePlanNameKey = activePlanName.toLowerCase().replace(' ', '_');
                const hasActiveTranslation = t('subscription.plan_names.' + activePlanNameKey) !== 'subscription.plan_names.' + activePlanNameKey;
                const localizedActivePlanName = hasActiveTranslation ? t('subscription.plan_names.' + activePlanNameKey) : activePlanName;

                Alert.alert(
                    t('subscription.upgrade_plan_title'),
                    t('subscription.upgrade_plan_msg', { activePlan: localizedActivePlanName }),
                    [
                        { text: t('common.dismiss'), style: 'cancel' },
                        {
                            text: t('subscription.contact_support'),
                            onPress: () => router.push('/help-support' as any),
                        },
                    ]
                );
            }
            return;
        }

        // ─── Normal flow: No active subscription, allow subscribing to any plan ───
        const price = getPlanPrice(plan, selectedCycle);
        const cycleLabel = t('subscription.cycles.' + selectedCycle.toLowerCase());

        Alert.alert(
            t('subscription.subscribe_title', { name: localizedPlanName }),
            t('subscription.subscribe_confirm_msg', { price: price.toLocaleString('en-IN'), cycle: cycleLabel }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.continue'),
                    onPress: async () => {
                        setInitiating(plan.id);
                        try {
                            const res = await planService.initiateSubscription({
                                // Make sure we pass the correct params
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
                                Alert.alert(t('common.error'), res.message || t('subscription.initiate_failed'));
                            }
                        } catch {
                            Alert.alert(t('common.error'), t('subscription.generic_failed'));
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
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('subscription.header_title')}</Text>
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
                                    <Text style={styles.activeSubTitle}>
                                        {(() => {
                                            const name = activeSub.plan?.name || '';
                                            const nameKey = name.toLowerCase().replace(' ', '_');
                                            const hasTrans = t('subscription.plan_names.' + nameKey) !== 'subscription.plan_names.' + nameKey;
                                            return hasTrans ? t('subscription.plan_names.' + nameKey) : (name || t('subscription.active_plan_fallback'));
                                        })()}
                                    </Text>
                                    <Text style={styles.activeSubMeta}>
                                        {t('subscription.since')} {formatDate(activeSub.startDate || activeSub.createdAt || '')}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.activeStatusBadge, { backgroundColor: activeSub.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2' }]}>
                                <Text style={{ fontFamily: Fonts.medium, fontSize: 11, color: activeSub.status === 'ACTIVE' ? '#059669' : '#DC2626' }}>
                                    {activeSub.status || t('subscription.status_active')}
                                </Text>
                            </View>
                        </View>

                        {/* Duration and Days Remaining */}
                        <View style={styles.durationSection}>
                            <View style={styles.durationBlock}>
                                <Ionicons name="calendar-outline" size={16} color="#B45309" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.durationLabel}>{t('subscription.plan_duration')}</Text>
                                    <Text style={styles.durationValue}>
                                        {formatDate(activeSub.startDate || activeSub.createdAt || '')} • {formatDate(activeSub.expiryDate || '')}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.daysRemainingBlock}>
                                <Ionicons name="hourglass-outline" size={16} color={calculateDaysRemaining(activeSub.expiryDate) && calculateDaysRemaining(activeSub.expiryDate)! <= 7 ? '#DC2626' : '#B45309'} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.daysLabel}>{t('subscription.days_remaining')}</Text>
                                    {calculateDaysRemaining(activeSub.expiryDate) !== null ? (
                                        <Text style={[
                                            styles.daysValue,
                                            calculateDaysRemaining(activeSub.expiryDate)! <= 7 && styles.daysValueWarning
                                        ]}>
                                            {t('subscription.days_left_count', { count: calculateDaysRemaining(activeSub.expiryDate) })}
                                        </Text>
                                    ) : (
                                        <Text style={styles.daysValue}>—</Text>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={styles.renewalRow}>
                            <View style={styles.renewalDateBlock}>
                                <Ionicons name="time-outline" size={14} color="#B45309" />
                                <Text style={styles.renewalLabel}>{t('subscription.renews_on')}</Text>
                                <Text style={styles.renewalDate}>{formatDate(activeSub.expiryDate || '')}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.renewBtn}
                                onPress={() => {
                                    const activePlan = plans.find(p => p.id === activePlanId);
                                    if (activePlan) handleSelectPlan(activePlan, true); // true = from Renew button
                                    else Alert.alert(t('subscription.renew_alert_title'), t('subscription.renew_alert_msg'));
                                }}
                            >
                                <Ionicons name="refresh-outline" size={14} color="#fff" />
                                <Text style={styles.renewBtnText}>{t('subscription.renew_now')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Restriction Notice */}
                        {activeSub.status === 'ACTIVE' && (
                            <View style={styles.restrictionNotice}>
                                <Ionicons name="information-circle" size={16} color="#B45309" />
                                <Text style={styles.restrictionText}>
                                    {t('subscription.restriction_notice')}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Billing cycle selector */}
                <Text style={styles.sectionLabel}>{t('subscription.choose_billing_cycle')}</Text>
                <View style={styles.cycleSelector}>
                    {CYCLES.map(c => (
                        <TouchableOpacity
                            key={c.key}
                            style={[styles.cycleBtn, selectedCycle === c.key && styles.cycleBtnActive]}
                            onPress={() => setSelectedCycle(c.key)}
                        >
                            <Text style={[styles.cycleBtnText, selectedCycle === c.key && styles.cycleBtnTextActive]}>
                                {t('subscription.billing_cycles.' + c.key.toLowerCase())}
                            </Text>
                            {c.key === 'YEARLY' && (
                                <View style={styles.savingsBadge}>
                                    <Text style={styles.savingsBadgeText}>{t('subscription.best_tag')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Plans */}
                <Text style={styles.sectionLabel}>{t('subscription.choose_plan')}</Text>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>{t('subscription.loading_plans')}</Text>
                    </View>
                ) : plans.length === 0 ? (
                    <View style={styles.center}>
                        <Ionicons name="ribbon-outline" size={48} color="#E5E7EB" />
                        <Text style={styles.emptyText}>{t('subscription.no_plans')}</Text>
                    </View>
                ) : (
                    plans.map(plan => {
                        const isDisabled = activeSub && activeSub.status === 'ACTIVE' && plan.id !== activePlanId;
                        return (
                            <View key={plan.id} style={{ position: 'relative' }}>
                                <PlanCard
                                    plan={plan}
                                    cycle={selectedCycle}
                                    isActive={plan.id === activePlanId}
                                    onSelect={() => handleSelectPlan(plan)}
                                    isDisabled={isDisabled}
                                />
                                {isDisabled && (
                                    <View style={styles.disabledOverlay}>
                                        <Text style={styles.disabledText}>{t('subscription.contact_to_upgrade')}</Text>
                                    </View>
                                )}
                                {initiating === plan.id && (
                                    <View style={styles.cardOverlay}>
                                        <ActivityIndicator color={Colors.primary} />
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}

                {/* Cancel note */}
                {activeSub && (
                    <TouchableOpacity style={styles.cancelLink} onPress={() => router.push('/help-support' as any)}>
                        <Text style={styles.cancelLinkText}>{t('subscription.cancel_subscription_note')}</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}


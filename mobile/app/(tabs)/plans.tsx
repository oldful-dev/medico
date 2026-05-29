// Plans Screen — API-Driven (mirrors web plans page)
// Fetches plan data from GET /api/plans (same DB as web).
// On CTA press: initiates subscription → navigates to checkout with subscriptionId.
// After payment verify: refreshData() updates global profile with active plan.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAppConfig } from '@/context/AppConfigContext';
import { getIcon } from '@/components/sdui/SDUIRenderer';
import { planService, Plan, BillingCycle } from '@/services/api/planService';
import { useUser } from '@/context/UserContext';
import { useTranslation } from 'react-i18next';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

// ─── Static Layout Assets ─────────────────────────────────────────────────────
const imgHeartOutline = require('@/assets/images/37d35bff48c57182eb08ca96ee07ef22d24fd2db.png');

// ─── Billing cycle helpers ─────────────────────────────────────────────────────
const BILLING_CYCLES: { key: BillingCycle; labelKey: string; suffixKey: string; daysKey: string }[] = [
    { key: 'QUARTERLY', labelKey: 'plans.quarterly', suffixKey: 'plans.quarterly_suffix', daysKey: 'plans.quarterly_days' },
    { key: 'BIANNUAL',  labelKey: 'plans.biannually', suffixKey: 'plans.biannually_suffix', daysKey: 'plans.biannually_days' },
    { key: 'YEARLY',    labelKey: 'plans.yearly', suffixKey: 'plans.yearly_suffix', daysKey: 'plans.yearly_days' },
];

function getPriceForCycle(plan: Plan, cycle: BillingCycle): number {
    switch (cycle) {
        case 'QUARTERLY': return plan.quarterlyPrice;
        case 'BIANNUAL':  return plan.biannualPrice;
        case 'YEARLY':    return plan.yearlyPrice;
    }
}

export default function PlansScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { plansBanner, benefits } = useAppConfig();
    const { profile, refreshData } = useUser();
    const params = useLocalSearchParams<{
        bookingPayload?: string;
        amount?: string;
        label?: string;
        checkoutRoute?: string;
    }>();

    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors);

    // ─── Plan accent colours (index-based, matching SDUI palette) ─────────────────
    const planAccents = useMemo(() => [
        { card: colors.bgCard, title: colors.primary, tab_bg: isDarkMode ? 'rgba(52,199,89,0.1)' : '#F0FFF8', tab_active: colors.primary, tab_text: '#FFFFFF', price_bg: colors.primary },
        { card: isDarkMode ? '#1E8449' : colors.primary, title: isDarkMode ? '#AEF5C0' : '#0EDD94', tab_bg: 'rgba(255,255,255,0.15)', tab_active: isDarkMode ? '#AEF5C0' : '#0EDD94', tab_text: isDarkMode ? '#1E8449' : colors.primary, price_bg: isDarkMode ? '#AEF5C0' : '#0EDD94' },
    ], [colors, isDarkMode]);

    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCycle, setActiveCycle] = useState<BillingCycle>('QUARTERLY');
    const [initiating, setInitiating] = useState<string | null>(null); // planId being initiated
    const [userActiveSubscriptions, setUserActiveSubscriptions] = useState<any[]>([]);

    // ─── Fetch plans from API (same as web) ───────────────────────────────────
    const loadPlans = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await planService.getPlans();
            if (res.success && res.data) {
                setPlans(res.data);
            }
        } catch (err) {
            console.error('Failed to load plans:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ─── Check if user has active subscription ────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            const checkSubscription = async () => {
                try {
                    const res = await planService.checkActiveSubscription();
                    console.log('Subscription check:', res);
                    if (res.success && res.data) {
                        setUserActiveSubscriptions(res.data.subscriptions || []);
                        console.log('User has active subscriptions:', res.data.subscriptions);
                    }
                } catch (err) {
                    console.warn('Could not fetch subscription status:', err);
                }
            };

            loadPlans();
            checkSubscription();
        }, [loadPlans])
    );

    // ─── CTA handler — mirrors web handleChoosePlan ───────────────────────────
    const handleChoosePlan = useCallback(async (plan: Plan) => {
        console.log('handleChoosePlan called for:', plan.name);
        console.log('userActiveSubscriptions state:', userActiveSubscriptions);

        if (!profile) {
            Alert.alert(t('plans.login_required'), t('plans.login_required_desc'));
            return;
        }

        // Check if user already has active subscription in the same category
        const activeSubForCategory = userActiveSubscriptions.find(sub => sub.planType === plan.planType);
        if (activeSubForCategory) {
            if (plan.tierLevel < (activeSubForCategory.tierLevel ?? 0)) {
                Alert.alert(
                    t('plans.active_plan_title') || 'Active Plan',
                    t('plans.downgrade_blocked_msg') || 'You currently have an active membership. Downgrades can only be processed through support after your current plan expires.',
                    [{ text: t('common.ok'), onPress: () => {} }]
                );
                return;
            }
            const expiryDate = new Date(activeSubForCategory.expiryDate).toLocaleDateString();
            console.log('Blocking plan selection - user has active subscription in this category until:', expiryDate);
            Alert.alert(
                t('plans.active_plan_title'),
                t('plans.active_plan_desc', { planName: activeSubForCategory.planName, expiry: expiryDate }),
                [{ text: t('common.ok'), onPress: () => {} }]
            );
            return;
        }

        const price = getPriceForCycle(plan, activeCycle);
        if (!price || price <= 0) {
            Alert.alert(t('plans.unavailable'), t('plans.unavailable_desc'));
            return;
        }

        setInitiating(plan.id);
        try {
            // Step 1: Create PAYMENT_PENDING subscription on backend
            const subRes = await planService.initiateSubscription({
                planId: plan.id,
                billingCycle: activeCycle,
                amount: price,
            });

            if (!subRes.success || !subRes.data) {
                Alert.alert(t('common.error'), subRes.message ?? t('plans.initiate_error'));
                return;
            }

            const subscriptionId = subRes.data.id;

            // Step 2: Navigate to existing checkout screen with subscriptionId
            // Checkout handles: Razorpay open → verify → payment-success screen
            // On success, verify updates subscription → ACTIVE on backend.
            // We then call refreshData() via payment-success screen to sync profile.
             router.push({
                pathname: '/payment/checkout',
                params: {
                    subscriptionId,
                    amount: String(price),
                    label: `${plan.name} — ${t(BILLING_CYCLES.find(c => c.key === activeCycle)?.labelKey ?? 'plans.quarterly')}`,
                    userName: profile.name ?? '',
                    phone: profile.phone ?? '',
                    email: profile.email ?? '',
                    refreshProfileOnSuccess: '1',
                    bookingPayload: params.bookingPayload || '',
                    bookingAmount: params.amount || '',
                    bookingLabel: params.label || '',
                    checkoutRoute: params.checkoutRoute || '',
                },
            });
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('plans.subscribe_error'));
        } finally {
            setInitiating(null);
        }
    }, [profile, activeCycle, userActiveSubscriptions, router, params]);

    if (isLoading) {
        return (
            <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const cycleInfo = BILLING_CYCLES.find(c => c.key === activeCycle)!;

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('plans.tab_title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Value Plans Banner (SDUI text) ─── */}
                <View style={styles.valuePlanBanner}>
                    <Image source={imgHeartOutline} style={styles.heartPulseIcon} resizeMode="contain" />
                    <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>{plansBanner.title}</Text>
                        <Text style={styles.bannerSubtitle}>{plansBanner.subtitle}</Text>
                    </View>
                </View>

                {/* ─── Active Subscription Banner ─── */}
                {userActiveSubscriptions.map(sub => (
                    <View key={sub.id} style={styles.activeSubBanner}>
                        <View style={styles.activeSubIconBox}>
                            <Ionicons name="shield-checkmark" size={20} color={colors.textWhite} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.activeSubLabel}>{t('plans.your_active_plan')}</Text>
                            <Text style={styles.activeSubName}>{sub.planName ?? sub.plan?.name ?? t('plans.tab_title')}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.activeSubExpLabel}>{t('plans.expires')}</Text>
                            <Text style={styles.activeSubExpDate}>
                                {sub.expiryDate
                                    ? new Date(sub.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : 'N/A'}
                            </Text>
                        </View>
                    </View>
                ))}

                {/* ─── Billing Cycle Tabs ─── */}
                <View style={styles.cycleTabsRow}>
                    {BILLING_CYCLES.map(cycle => {
                        const isActive = cycle.key === activeCycle;
                        return (
                            <TouchableOpacity
                                key={cycle.key}
                                style={[styles.cycleTab, isActive && styles.cycleTabActive]}
                                onPress={() => setActiveCycle(cycle.key)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.cycleTabText, isActive && styles.cycleTabTextActive]}>
                                    {t(cycle.labelKey)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ─── Plans (vertical, full-width cards) ─── */}
                <View style={styles.plansContainer}>
                    {plans.map((plan, idx) => {
                        const accent = planAccents[idx % planAccents.length];
                        const price = getPriceForCycle(plan, activeCycle);
                        const isPro = idx === 1;
                        const activeSubForCategory = userActiveSubscriptions.find(sub => sub.planType === plan.planType);
                        const isActivePlan = activeSubForCategory?.planId === plan.id || (activeSubForCategory?.planName ?? activeSubForCategory?.plan?.name) === plan.name;
                        const isInitiating = initiating === plan.id;

                        return (
                            <View
                                key={plan.id}
                                style={[
                                    styles.planCard,
                                    { backgroundColor: accent.card },
                                    isPro && styles.planCardPro,
                                ]}
                            >
                                {/* Plan header row */}
                                <View style={styles.planCardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.planCardTitle, { color: accent.title }]}>
                                            {plan.name}
                                        </Text>
                                        {plan.description ? (
                                            <Text style={[styles.planCardDesc, isPro && { color: 'rgba(255,255,255,0.7)' }]}>
                                                {plan.description}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <View style={[styles.priceContainer, { backgroundColor: accent.price_bg }]}>
                                        <Text style={styles.priceText}>
                                            ₹{price.toLocaleString('en-IN')}
                                        </Text>
                                        <Text style={[styles.priceSuffix, isPro && { color: 'rgba(2,116,63,0.8)' }]}>
                                            {t(cycleInfo.suffixKey)}
                                        </Text>
                                        <Text style={[styles.validityText, isPro && { color: 'rgba(255,255,255,0.6)' }]}>
                                            {t(cycleInfo.daysKey)}
                                        </Text>
                                    </View>
                                </View>

                                {/* All features — fully visible, no truncation */}
                                <View style={styles.planFeatures}>
                                    {plan.benefits?.split(',').map((benefit, bIdx) => (
                                        <View key={bIdx} style={styles.featureItem}>
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={16}
                                                color={isPro ? '#0EDD94' : colors.primary}
                                                style={styles.featureCheck}
                                            />
                                            <Text style={[styles.featureText, isPro && { color: 'rgba(255,255,255,0.9)' }]}>
                                                {benefit.trim()}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* CTA Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.planActionButton,
                                        { backgroundColor: isPro ? '#0EDD94' : colors.primary },
                                        isActivePlan && styles.planActionButtonDisabled,
                                        (activeSubForCategory && !isActivePlan) && styles.planActionButtonDisabled,
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => handleChoosePlan(plan)}
                                    disabled={isActivePlan || isInitiating || (activeSubForCategory && !isActivePlan)}
                                >
                                    {isInitiating ? (
                                        <ActivityIndicator size="small" color={isPro ? colors.primary : colors.textWhite} />
                                    ) : (
                                        <Text style={[styles.planActionText, isPro && { color: colors.primary }]}>
                                            {isActivePlan ? t('plans.cta_active') : (activeSubForCategory ? t('plans.cta_locked') : t('plans.cta_choose'))}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>

                {/* ─── Why Subscribe (SDUI benefits) ─── */}
                <Text style={styles.sectionTitle}>{t('plans.why_subscribe')}</Text>
                <View style={styles.whySubscribeContainer}>
                    {benefits.map(benefit => (
                        <View key={benefit.id} style={styles.benefitRow}>
                            <View style={styles.benefitIconBox}>
                                <Image
                                    source={getIcon(benefit.icon_key)}
                                    style={styles.benefitIcon}
                                    resizeMode="contain"
                                />
                            </View>
                            <View style={styles.benefitTextGroup}>
                                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                                <Text style={styles.benefitDesc}>{benefit.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },

    headerContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: Spacing.lg, paddingBottom: 25, paddingTop: 10, position: 'relative',
    },
    backButton: { position: 'absolute', left: 20, padding: 5, zIndex: 10 },
    headerTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading2,
        color: colors.textWhite, textAlign: 'center', letterSpacing: -0.24,
    },
    scrollContent: { paddingBottom: 110 },

    valuePlanBanner: {
        backgroundColor: 'rgba(128, 249, 231, 0.15)', borderWidth: 1, borderColor: '#80F9E7',
        borderRadius: Radius.md, marginHorizontal: Spacing.lg,
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, paddingHorizontal: 12, marginTop: 15, marginBottom: 16,
    },
    heartPulseIcon: { width: 65, height: 48, marginRight: 10 },
    bannerTextContainer: { flex: 1, justifyContent: 'center' },
    bannerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark },
    bannerSubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textBody, marginTop: 2 },

    // Active subscription banner
    activeSubBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(4,131,87,0.1)', borderWidth: 1, borderColor: colors.primary,
        borderRadius: Radius.md, marginHorizontal: Spacing.lg, padding: Spacing.md, marginBottom: 16,
    },
    activeSubIconBox: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    activeSubLabel: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.primary },
    activeSubName: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark },
    activeSubExpLabel: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted },
    activeSubExpDate: { fontFamily: Fonts.semiBold, fontSize: FontSize.caption, color: colors.textBody },

    // Billing cycle tabs
    cycleTabsRow: {
        flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: 16,
        backgroundColor: colors.bgCardMuted, borderRadius: 12, padding: 4, gap: 4,
    },
    cycleTab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
    cycleTabActive: { backgroundColor: colors.primary },
    cycleTabText: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.textMuted },
    cycleTabTextActive: { color: colors.textWhite },

    plansContainer: { paddingHorizontal: Spacing.lg, paddingBottom: 8, gap: Spacing.lg },
    planCard: {
        borderRadius: Radius.xl, padding: Spacing.lg,
        ...Shadow.card, borderWidth: 1, borderColor: colors.borderLight,
    },
    planCardPro: { backgroundColor: colors.primary, borderColor: colors.primary },
    planCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, gap: 12 },
    planCardTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, marginBottom: 4 },
    planCardDesc: {
        fontFamily: Fonts.regular, fontSize: FontSize.caption,
        color: colors.textMuted, lineHeight: 16,
    },

    priceContainer: {
        borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
        alignItems: 'center', minWidth: 90,
    },
    priceText: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: colors.textWhite },
    priceSuffix: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: 'rgba(255,255,255,0.85)' },
    validityText: {
        fontFamily: Fonts.regular, fontSize: FontSize.caption,
        color: 'rgba(255,255,255,0.7)', marginTop: 2,
    },

    planFeatures: { marginBottom: Spacing.lg },
    featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    featureCheck: { marginRight: 8, marginTop: 1 },
    featureText: {
        fontFamily: Fonts.medium, fontSize: FontSize.body,
        color: colors.textBody, flex: 1, lineHeight: 20,
    },

    planActionButton: {
        borderRadius: 10, height: 46, justifyContent: 'center',
        alignItems: 'center',
    },
    planActionButtonDisabled: { backgroundColor: colors.bgCardMuted },
    planActionText: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textWhite,
    },

    sectionTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading1,
        color: colors.textDark, paddingHorizontal: 18, marginBottom: Spacing.lg, marginTop: 4,
    },
    whySubscribeContainer: {
        backgroundColor: colors.bgCard, borderRadius: Radius.xl * 2,
        marginHorizontal: Spacing.lg, padding: Spacing.xl, ...Shadow.card,
    },
    benefitRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
    benefitIconBox: { width: 35, height: 35, alignItems: 'center', marginRight: 10 },
    benefitIcon: { width: 25, height: 25 },
    benefitTextGroup: { flex: 1, justifyContent: 'center' },
    benefitTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textBody, marginBottom: 4 },
    benefitDesc: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted, lineHeight: 18 },
});

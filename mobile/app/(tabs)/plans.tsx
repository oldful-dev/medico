// Plans Screen — API-Driven (mirrors web plans page)
// Fetches plan data from GET /api/plans (same DB as web).
// On CTA press: initiates subscription → navigates to checkout with subscriptionId.
// After payment verify: refreshData() updates global profile with active plan.
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAppConfig } from '@/context/AppConfigContext';
import { getIcon } from '@/components/sdui/SDUIRenderer';
import { planService, Plan, BillingCycle } from '@/services/api/planService';
import { useUser } from '@/context/UserContext';
import { useTranslation } from 'react-i18next';

// ─── Static Layout Assets ─────────────────────────────────────────────────────
const imgHeartOutline = require('@/assets/images/37d35bff48c57182eb08ca96ee07ef22d24fd2db.png');

// ─── Billing cycle helpers ─────────────────────────────────────────────────────
const BILLING_CYCLES: { key: BillingCycle; label: string; suffix: string; days: string }[] = [
    { key: 'QUARTERLY', label: 'Quarterly',  suffix: '/ quarter',  days: '90 days' },
    { key: 'BIANNUAL',  label: 'Biannually', suffix: '/ 6 months', days: '180 days' },
    { key: 'YEARLY',    label: 'Yearly',     suffix: '/ year',     days: '365 days' },
];

function getPriceForCycle(plan: Plan, cycle: BillingCycle): number {
    switch (cycle) {
        case 'QUARTERLY': return plan.quarterlyPrice;
        case 'BIANNUAL':  return plan.biannualPrice;
        case 'YEARLY':    return plan.yearlyPrice;
    }
}

// ─── Plan accent colours (index-based, matching SDUI palette) ─────────────────
const PLAN_ACCENTS = [
    { card: '#FFFFFF', title: Colors.primary, tab_bg: '#F0FFF8', tab_active: Colors.primary, tab_text: '#FFFFFF', price_bg: Colors.primary },
    { card: Colors.primary, title: '#0EDD94', tab_bg: 'rgba(255,255,255,0.15)', tab_active: '#0EDD94', tab_text: Colors.primary, price_bg: '#0EDD94' },
];

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
    }>();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCycle, setActiveCycle] = useState<BillingCycle>('QUARTERLY');
    const [initiating, setInitiating] = useState<string | null>(null); // planId being initiated
    const [userActiveSubscription, setUserActiveSubscription] = useState<any>(null);

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
    useEffect(() => {
        const checkSubscription = async () => {
            try {
                const res = await planService.checkActiveSubscription();
                console.log('Subscription check:', res);
                if (res.success && res.data?.hasActiveSubscription) {
                    setUserActiveSubscription(res.data.subscription);
                    console.log('User has active subscription:', res.data.subscription);
                }
            } catch (err) {
                console.warn('Could not fetch subscription status:', err);
            }
        };

        loadPlans();
        checkSubscription();
    }, []);

    // ─── CTA handler — mirrors web handleChoosePlan ───────────────────────────
    const handleChoosePlan = useCallback(async (plan: Plan) => {
        console.log('handleChoosePlan called for:', plan.name);
        console.log('userActiveSubscription state:', userActiveSubscription);

        if (!profile) {
            Alert.alert('Login Required', 'Please login to subscribe to a plan.');
            return;
        }

        // Check if user already has active subscription
        if (userActiveSubscription) {
            const expiryDate = new Date(userActiveSubscription.expiryDate).toLocaleDateString();
            console.log('Blocking plan selection - user has active subscription until:', expiryDate);
            Alert.alert(
                'Active Plan',
                `You already have an active ${userActiveSubscription.planName} plan until ${expiryDate}.\n\nCancel your current plan to subscribe to another.`,
                [{ text: 'OK', onPress: () => {} }]
            );
            return;
        }

        const price = getPriceForCycle(plan, activeCycle);
        if (!price || price <= 0) {
            Alert.alert('Unavailable', 'This plan is not available for the selected period.');
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
                Alert.alert('Error', subRes.message ?? 'Could not initiate plan. Please try again.');
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
                    label: `${plan.name} — ${BILLING_CYCLES.find(c => c.key === activeCycle)?.label ?? activeCycle}`,
                    userName: profile.name ?? '',
                    phone: profile.phone ?? '',
                    email: profile.email ?? '',
                    // Signal checkout to call refreshData on success
                    refreshProfileOnSuccess: '1',
                    bookingPayload: params.bookingPayload || '',
                    bookingAmount: params.amount || '',
                    bookingLabel: params.label || '',
                },
            });
        } catch (err) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setInitiating(null);
        }
    }, [profile, activeCycle, router]);

    // ─── Active subscription check ────────────────────────────────────────────
    const getActiveSub = () =>
        profile?.subscriptions?.find((s: any) => s.status === 'ACTIVE');

    if (isLoading) {
        return (
            <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const activeSub = getActiveSub();
    const cycleInfo = BILLING_CYCLES.find(c => c.key === activeCycle)!;

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
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
                {activeSub && (
                    <View style={styles.activeSubBanner}>
                        <View style={styles.activeSubIconBox}>
                            <Ionicons name="shield-checkmark" size={20} color={Colors.textWhite} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.activeSubLabel}>Your Active Plan</Text>
                            <Text style={styles.activeSubName}>{activeSub.plan?.name ?? 'Care Plan'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.activeSubExpLabel}>Expires</Text>
                            <Text style={styles.activeSubExpDate}>
                                {activeSub.expiryDate
                                    ? new Date(activeSub.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : 'N/A'}
                            </Text>
                        </View>
                    </View>
                )}

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
                                    {cycle.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ─── Plans (vertical, full-width cards) ─── */}
                <View style={styles.plansContainer}>
                    {plans.map((plan, idx) => {
                        const accent = PLAN_ACCENTS[idx % PLAN_ACCENTS.length];
                        const price = getPriceForCycle(plan, activeCycle);
                        const isPro = idx === 1;
                        const isActivePlan = activeSub?.plan?.name === plan.name;
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
                                            {cycleInfo.suffix}
                                        </Text>
                                        <Text style={[styles.validityText, isPro && { color: 'rgba(255,255,255,0.6)' }]}>
                                            {cycleInfo.days}
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
                                                color={isPro ? '#0EDD94' : Colors.primary}
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
                                        { backgroundColor: isPro ? '#0EDD94' : Colors.primary },
                                        isActivePlan && styles.planActionButtonDisabled,
                                        (userActiveSubscription && !isActivePlan) && styles.planActionButtonDisabled,
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => handleChoosePlan(plan)}
                                    disabled={isActivePlan || isInitiating || (userActiveSubscription && !isActivePlan)}
                                >
                                    {isInitiating ? (
                                        <ActivityIndicator size="small" color={isPro ? Colors.primary : Colors.textWhite} />
                                    ) : (
                                        <Text style={[styles.planActionText, isPro && { color: Colors.primary }]}>
                                            {isActivePlan ? '✓ Active Plan' : (userActiveSubscription ? '🔒 Plan Active' : 'Choose Plan')}
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

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgScreen },

    headerContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg, paddingBottom: 25, paddingTop: 10, position: 'relative',
    },
    backButton: { position: 'absolute', left: 20, padding: 5, zIndex: 10 },
    headerTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading2,
        color: Colors.textWhite, textAlign: 'center', letterSpacing: -0.24,
    },
    scrollContent: { paddingBottom: 110 },

    valuePlanBanner: {
        backgroundColor: 'rgba(128, 249, 231, 0.38)', borderWidth: 1, borderColor: '#80F9E7',
        borderRadius: Radius.md, marginHorizontal: Spacing.lg,
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, paddingHorizontal: 12, marginTop: 15, marginBottom: 16,
    },
    heartPulseIcon: { width: 65, height: 48, marginRight: 10 },
    bannerTextContainer: { flex: 1, justifyContent: 'center' },
    bannerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textDark },
    bannerSubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: Colors.textBody, marginTop: 2 },

    // Active subscription banner
    activeSubBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#E8F9F2', borderWidth: 1, borderColor: Colors.primary,
        borderRadius: Radius.md, marginHorizontal: Spacing.lg, padding: Spacing.md, marginBottom: 16,
    },
    activeSubIconBox: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    activeSubLabel: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: Colors.primary },
    activeSubName: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textDark },
    activeSubExpLabel: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: Colors.textMuted },
    activeSubExpDate: { fontFamily: Fonts.semiBold, fontSize: FontSize.caption, color: Colors.textBody },

    // Billing cycle tabs
    cycleTabsRow: {
        flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: 16,
        backgroundColor: '#F0FFF8', borderRadius: 12, padding: 4, gap: 4,
    },
    cycleTab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
    cycleTabActive: { backgroundColor: Colors.primary },
    cycleTabText: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: Colors.textMuted },
    cycleTabTextActive: { color: Colors.textWhite },

    plansContainer: { paddingHorizontal: Spacing.lg, paddingBottom: 8, gap: Spacing.lg },
    planCard: {
        borderRadius: Radius.xl, padding: Spacing.lg,
        ...Shadow.card, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    },
    planCardPro: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    planCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, gap: 12 },
    planCardTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, marginBottom: 4 },
    planCardDesc: {
        fontFamily: Fonts.regular, fontSize: FontSize.caption,
        color: Colors.textMuted, lineHeight: 16,
    },

    priceContainer: {
        borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
        alignItems: 'center', minWidth: 90,
    },
    priceText: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: Colors.textWhite },
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
        color: Colors.textBody, flex: 1, lineHeight: 20,
    },

    planActionButton: {
        borderRadius: 10, height: 46, justifyContent: 'center',
        alignItems: 'center',
    },
    planActionButtonDisabled: { backgroundColor: '#E5E7EB' },
    planActionText: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textWhite,
    },

    sectionTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading1,
        color: Colors.textDark, paddingHorizontal: 18, marginBottom: Spacing.lg, marginTop: 4,
    },
    whySubscribeContainer: {
        backgroundColor: Colors.bgCard, borderRadius: Radius.xl * 2,
        marginHorizontal: Spacing.lg, padding: Spacing.xl, ...Shadow.card,
    },
    benefitRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
    benefitIconBox: { width: 35, height: 35, alignItems: 'center', marginRight: 10 },
    benefitIcon: { width: 25, height: 25 },
    benefitTextGroup: { flex: 1, justifyContent: 'center' },
    benefitTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textBody, marginBottom: 4 },
    benefitDesc: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: Colors.textMuted, lineHeight: 18 },
});

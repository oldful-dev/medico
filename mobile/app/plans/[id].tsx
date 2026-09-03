import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { planService, Plan, BillingCycle, ActiveSubscription } from '@/services/api/planService';
import { renderBenefitSvg } from '@/utils/benefitIconMap';

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
        default:          return 0;
    }
}

export default function PlanDetailsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(colors, isDarkMode);
    const { profile } = useUser();
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; iconName?: string }>({
        visible: false, title: '', message: ''
    });
    const triggerAlert = (title: string, message: string, iconName = 'warning-outline') => {
        setAlertConfig({ visible: true, title, message, iconName });
    };
    
    // params: 
    // id (plan ID), or 'renew' if coming directly from Renew button.
    // If id='renew', then subId is passed.
    const params = useLocalSearchParams<{ id: string; subId?: string; isRenewFlow?: string }>();
    const isDirectRenew = params.id === 'renew' && params.isRenewFlow === '1';

    const [plan, setPlan] = useState<Plan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCycle, setActiveCycle] = useState<BillingCycle>('QUARTERLY');
    const [initiating, setInitiating] = useState(false);
    
    const [userActiveSubscriptions, setUserActiveSubscriptions] = useState<ActiveSubscription[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                
                // 1. Fetch active subscriptions
                const subRes = await planService.checkActiveSubscription();
                if (subRes.success && subRes.data?.hasActiveSubscription) {
                    setUserActiveSubscriptions(subRes.data.subscriptions || []);
                }

                // 2. Fetch plan details
                let targetPlanId = params.id;
                if (isDirectRenew && params.subId) {
                    // Find the plan ID from the active subscriptions
                    const activeSub = subRes.data?.subscriptions?.find((s: any) => s.id === params.subId);
                    if (activeSub?.planId) {
                        targetPlanId = activeSub.planId;
                    }
                }

                if (targetPlanId && targetPlanId !== 'renew') {
                    const planRes = await planService.getPlanById(targetPlanId);
                    if (planRes.success && planRes.data) {
                        setPlan(planRes.data);
                    }
                }
            } catch (err) {
                console.error('Failed to load plan details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [params.id, params.subId, isDirectRenew]);

    const activeSubForCategory = useMemo(() => {
        if (!plan) return null;
        return userActiveSubscriptions.find(sub => sub.planType === plan.planType);
    }, [plan, userActiveSubscriptions]);

    const isActivePlan = activeSubForCategory?.planId === plan?.id;
    const isHigherTier = plan && activeSubForCategory && (plan.tierLevel ?? 0) > (activeSubForCategory.tierLevel ?? 0) && plan.planType === activeSubForCategory.planType;
    const isChangePlan = activeSubForCategory && !isActivePlan && !isHigherTier;
    const actionType = isDirectRenew || isActivePlan
        ? 'RENEW'
        : isHigherTier
            ? 'UPGRADE'
            : isChangePlan
                ? 'CHANGE_PLAN'
                : 'SUBSCRIBE';

    const handleAction = async () => {
        if (!profile) {
            triggerAlert(t('plans.login_required'), t('plans.login_required_desc'));
            return;
        }
        if (!plan) return;

        const price = getPriceForCycle(plan, activeCycle);
        if (!price || price <= 0) {
            triggerAlert(t('plans.unavailable'), t('plans.unavailable_desc'));
            return;
        }

        if (actionType === 'UPGRADE') {
            // Route to the dedicated upgrade screen with pro-rata preview
            router.push({
                pathname: '/plans/upgrade',
                params: { subId: activeSubForCategory!.id },
            } as any);
            return;
        }

        if (actionType === 'CHANGE_PLAN') {
            // Block downgrade — plans/[id].tsx only allows upgrade or renew
            triggerAlert(
                t('plans.downgrade_blocked_title'),
                t('plans.downgrade_blocked_msg')
            );
            return;
        }


        setInitiating(true);
        try {
            let subscriptionId = '';

            if (actionType === 'RENEW') {
                // Pass RENEW_ prefix to bypass new subscription creation on checkout
                subscriptionId = `RENEW_${activeSubForCategory!.id}`;
            } else {
                // SUBSCRIBE
                const subRes = await planService.initiateSubscription({
                    planId: plan.id,
                    billingCycle: activeCycle,
                    amount: price,
                });
                if (!subRes.success || !subRes.data) {
                    triggerAlert(t('plans.error'), subRes.message ?? t('plans.initiate_error'));
                    return;
                }
                subscriptionId = subRes.data.id;
            }

            router.push({
                pathname: '/payment/checkout',
                params: {
                    subscriptionId,
                    amount: String(price),
                    label: `${actionType === 'RENEW' ? 'Renew: ' : ''}${plan.name} — ${t(BILLING_CYCLES.find(c => c.key === activeCycle)?.labelKey ?? activeCycle)}`,
                    upgradeBillingCycle: activeCycle,
                    userName: profile.name ?? '',
                    phone: profile.phone ?? '',
                    email: profile.email ?? '',
                    refreshProfileOnSuccess: '1',
                },
            });
        } catch (e: any) {
            triggerAlert(t('plans.error'), e?.message || t('plans.subscribe_error'));
        } finally {
            setInitiating(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!plan) {
        return (
            <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: colors.textBody }}>{t('plans.not_found')}</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primary }}>{t('common.go_back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const price = getPriceForCycle(plan, activeCycle);
    const cycleInfo = BILLING_CYCLES.find(c => c.key === activeCycle)!;

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={colors.primary} />

            <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{plan.name}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.planHeaderCard}>
                    <Text style={styles.planTitle}>{plan.name}</Text>
                    {plan.description && <Text style={styles.planDesc}>{plan.description}</Text>}
                </View>

                {/* ─── Duration Options ─── */}
                <Text style={styles.sectionTitle}>Choose Duration</Text>
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

                {/* ─── Pricing Card ─── */}
                <View style={styles.pricingCard}>
                    <Text style={styles.pricingLabel}>Total Amount</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceValue}>₹{price.toLocaleString('en-IN')}</Text>
                        <Text style={styles.priceSuffix}> / {t(cycleInfo.suffixKey)}</Text>
                    </View>
                    <Text style={styles.priceSubtext}>{t(cycleInfo.daysKey)} validity</Text>
                </View>

                {/* ─── Features ─── */}
                <Text style={styles.sectionTitle}>Plan Features</Text>
                <View style={styles.featuresContainer}>
                    {plan.planBenefits && plan.planBenefits.length > 0 ? (
                        [...plan.planBenefits]
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((benefit, idx, arr) => (
                                <View
                                    key={benefit.id}
                                    style={[styles.featureItem, idx === arr.length - 1 && { marginBottom: 0 }]}
                                >
                                    <View style={[styles.featureIconBox, { backgroundColor: `${colors.primary}14` }]}>
                                        {renderBenefitSvg(benefit.benefitCode, 18, colors.primary)}
                                    </View>
                                    <View style={styles.featureTextCol}>
                                        <Text style={styles.featureText}>{benefit.title}</Text>
                                        {benefit.description ? (
                                            <Text style={styles.featureSubtext}>{benefit.description}</Text>
                                        ) : null}
                                        {benefit.usageLimit > 0 && (
                                            <Text style={styles.featureUsage}>
                                                {benefit.usageLimit}x per {benefit.usagePeriod.toLowerCase()}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))
                    ) : plan.benefits ? (
                        plan.benefits.split(',').map((benefit, bIdx, arr) => (
                            <View
                                key={bIdx}
                                style={[styles.featureItem, bIdx === arr.length - 1 && { marginBottom: 0 }]}
                            >
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.featureCheck} />
                                <Text style={styles.featureText}>{benefit.trim()}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.featureText, { color: colors.textMuted }]}>{t('plans.no_features')}</Text>
                    )}
                </View>
            </ScrollView>

            {/* ─── Bottom CTA Bar ─── */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    activeOpacity={0.8}
                    onPress={handleAction}
                    disabled={initiating}
                >
                    {initiating ? (
                        <ActivityIndicator size="small" color={colors.textWhite} />
                    ) : (
                        <Text style={styles.actionBtnText}>
                            {actionType === 'RENEW'
                                ? t('membership.renew_btn')
                                : actionType === 'UPGRADE'
                                    ? t('membership.upgrade_btn')
                                    : actionType === 'CHANGE_PLAN'
                                        ? 'Change to this Plan'
                                        : t('plans.subscribe')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                iconName={alertConfig.iconName as any || 'warning-outline'}
                buttonText="OK"
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const makeStyles = (colors: ThemeColors, dark: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: dark ? '#0F172A' : colors.bgScreen },
    headerContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.primary, paddingHorizontal: Spacing.lg, paddingBottom: 25, paddingTop: 10,
    },
    backButton: { position: 'absolute', left: 20, padding: 5, zIndex: 10 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: colors.textWhite },
    scrollContent: { paddingBottom: 120 },
    
    planHeaderCard: {
        backgroundColor: colors.primary, padding: Spacing.xl,
        borderBottomLeftRadius: Radius.xl * 2, borderBottomRightRadius: Radius.xl * 2,
        alignItems: 'center', marginBottom: Spacing.xl, ...Shadow.card,
    },
    planTitle: { fontFamily: Fonts.bold, fontSize: 28, color: colors.textWhite, marginBottom: 8 },
    planDesc: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: colors.textDark, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
    
    cycleTabsRow: {
        flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: 24,
        backgroundColor: colors.bgCardMuted, borderRadius: 12, padding: 4, gap: 4,
    },
    cycleTab: { flex: 1, paddingVertical: 12, borderRadius: 9, alignItems: 'center' },
    cycleTabActive: { backgroundColor: colors.primary, elevation: 2 },
    cycleTabText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textMuted },
    cycleTabTextActive: { color: colors.textWhite },

    pricingCard: {
        marginHorizontal: Spacing.lg, backgroundColor: colors.bgCard, borderRadius: Radius.xl,
        padding: Spacing.lg, borderWidth: 1, borderColor: colors.borderLight, ...Shadow.card,
        alignItems: 'center', marginBottom: 24,
    },
    pricingLabel: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.textMuted, marginBottom: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline' },
    priceValue: { fontFamily: Fonts.bold, fontSize: 36, color: colors.textDark },
    priceSuffix: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textBody, marginLeft: 4 },
    priceSubtext: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.primary, marginTop: 4 },

    featuresContainer: {
        marginHorizontal: Spacing.lg, backgroundColor: colors.bgCard, borderRadius: Radius.xl,
        padding: Spacing.xl, ...Shadow.card, borderWidth: 1, borderColor: colors.borderLight,
        marginBottom: 30,
    },
    featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
    featureCheck: { marginRight: 12, marginTop: 2 },
    featureText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textDark, flex: 1, lineHeight: 22 },
    featureIconBox: {
        width: 34, height: 34, borderRadius: Radius.md, marginRight: 12,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    featureTextCol: { flex: 1, gap: 3 },
    featureSubtext: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted, lineHeight: 18 },
    featureUsage: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.primary, marginTop: 1 },

    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.bgCard, paddingTop: Spacing.md, paddingHorizontal: Spacing.lg,
        borderTopWidth: 1, borderColor: colors.borderLight, elevation: 8,
    },
    actionBtn: {
        backgroundColor: colors.primary, borderRadius: Radius.lg, height: 52,
        alignItems: 'center', justifyContent: 'center',
    },
    actionBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textWhite },
});

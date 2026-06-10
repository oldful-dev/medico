/**
 * SubscriptionUpsellBanner
 *
 * Inline contextual card rendered inside service-checkout.tsx.
 * Shown when the user does NOT have an active subscription that covers the current service.
 *
 * - CARE services  → shows Care Plans
 * - HOMEMAKER services → shows Home Essential Plans
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { planService, Plan, BillingCycle } from '@/services/api/planService';
import { useUser } from '@/context/UserContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanTypeNeeded = 'CARE' | 'HOMEMAKER';

interface SubscriptionUpsellBannerProps {
    planTypeNeeded: PlanTypeNeeded;
    serviceLabel: string;
    bookingFee: number;
    platformFee: number;
}

// ─── Billing cycle options ─────────────────────────────────────────────────────

const CYCLES: { key: BillingCycle; label: string; months: number }[] = [
    { key: 'QUARTERLY', label: '3 months', months: 3 },
    { key: 'BIANNUAL',  label: '6 months', months: 6 },
    { key: 'YEARLY',    label: '12 months', months: 12 },
];

function getPriceForCycle(plan: Plan, cycle: BillingCycle): number {
    switch (cycle) {
        case 'QUARTERLY': return plan.quarterlyPrice;
        case 'BIANNUAL':  return plan.biannualPrice;
        case 'YEARLY':    return plan.yearlyPrice;
        default:          return plan.quarterlyPrice;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscriptionUpsellBanner({
    planTypeNeeded,
    serviceLabel,
    bookingFee,
    platformFee,
}: SubscriptionUpsellBannerProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const { profile } = useUser();
    const S = makeStyles(colors, isDarkMode, planTypeNeeded);

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('QUARTERLY');
    const [initiating, setInitiating] = useState(false);

    // Pulse animation for the CTA button
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.03, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await planService.getPlansByType(planTypeNeeded);
                if (res.success && res.data && res.data.length > 0) {
                    setPlans(res.data);
                }
            } catch { /* silent — banner is optional */ }
            finally { setLoading(false); }
        };
        load();
    }, [planTypeNeeded]);

    const handleSubscribe = useCallback(async () => {
        if (!profile) return;
        if (plans.length === 0) return;

        const cheapestPlan = plans[0]; // ordered by tierLevel asc from backend
        const price = getPriceForCycle(cheapestPlan, selectedCycle);

        setInitiating(true);
        try {
            const subRes = await planService.initiateSubscription({
                planId: cheapestPlan.id,
                billingCycle: selectedCycle,
                amount: price,
            });

            if (!subRes.success || !subRes.data) {
                return; // silently ignore — user can try from Plans tab
            }

            const cycleLabel = CYCLES.find(c => c.key === selectedCycle)?.label ?? selectedCycle;
            router.push({
                pathname: '/payment/checkout',
                params: {
                    subscriptionId: subRes.data.id,
                    amount: String(price),
                    label: `${cheapestPlan.name} — ${cycleLabel}`,
                    upgradeBillingCycle: selectedCycle,
                    userName: profile.name ?? '',
                    phone: profile.phone ?? '',
                    email: profile.email ?? '',
                    refreshProfileOnSuccess: '1',
                },
            });
        } catch { /* silent */ }
        finally { setInitiating(false); }
    }, [plans, selectedCycle, profile, router]);

    // Don't render if still loading or no plans exist
    if (loading) return null;
    if (plans.length === 0) return null;

    const cheapestPlan = plans[0];
    const price = getPriceForCycle(cheapestPlan, selectedCycle);
    const totalSavings = bookingFee + platformFee;
    const isCare = planTypeNeeded === 'CARE';

    return (
        <View style={S.container}>
            {/* Header strip */}
            <View style={S.headerStrip}>
                <View style={S.iconCircle}>
                    <Ionicons name={isCare ? 'medkit' : 'home'} size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={S.bannerTag}>
                        {t('upsell_banner.tag', { type: isCare ? t('upsell_banner.care') : t('upsell_banner.home') })}
                    </Text>
                    <Text style={S.bannerTitle}>{t('upsell_banner.title')}</Text>
                </View>
                <View style={S.savingsBadge}>
                    <Text style={S.savingsText}>
                        {t('upsell_banner.saves', { amount: totalSavings.toLocaleString('en-IN') })}
                    </Text>
                </View>
            </View>

            {/* Body */}
            <View style={S.body}>
                <Text style={S.bodyDesc}>
                    {t('upsell_banner.description', { label: serviceLabel })}
                </Text>

                {/* Benefit rows */}
                {[
                    { icon: 'checkmark-circle', text: t('upsell_banner.benefit_booking_fee', { amount: bookingFee }) },
                    { icon: 'checkmark-circle', text: t('upsell_banner.benefit_platform_fee', { amount: platformFee }) },
                    { icon: 'checkmark-circle', text: t('upsell_banner.benefit_gst') },
                ].map((b, i) => (
                    <View key={i} style={S.benefitRow}>
                        <Ionicons name={b.icon as any} size={16} color={isCare ? '#7C3AED' : '#0EA5E9'} />
                        <Text style={S.benefitText}>{b.text}</Text>
                    </View>
                ))}

                {/* Cycle selector */}
                <Text style={S.cycleLabel}>{t('upsell_banner.choose_duration')}</Text>
                <View style={S.cycleRow}>
                    {CYCLES.map(c => {
                        const cyclePrice = getPriceForCycle(cheapestPlan, c.key);
                        const active = c.key === selectedCycle;
                        return (
                            <TouchableOpacity
                                key={c.key}
                                style={[S.cycleChip, active && S.cycleChipActive]}
                                onPress={() => setSelectedCycle(c.key)}
                                activeOpacity={0.8}
                            >
                                <Text style={[S.cycleChipText, active && S.cycleChipTextActive]}>
                                    {c.label}
                                </Text>
                                <Text style={[S.cycleChipPrice, active && S.cycleChipPriceActive]}>
                                    ₹{cyclePrice.toLocaleString('en-IN')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* CTA */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                        style={[S.ctaBtn, initiating && { opacity: 0.7 }]}
                        onPress={handleSubscribe}
                        disabled={initiating}
                        activeOpacity={0.85}
                    >
                        {initiating ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="shield-checkmark" size={18} color="#fff" />
                                <Text style={S.ctaBtnText}>
                                    {t('upsell_banner.cta', { amount: price.toLocaleString('en-IN') })}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                <Text style={S.ctaHelper}>{t('upsell_banner.helper')}</Text>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: ThemeColors, dark: boolean, type: PlanTypeNeeded) => {
    const accent = type === 'CARE' ? '#7C3AED' : '#0EA5E9';
    const accentLight = type === 'CARE'
        ? (dark ? 'rgba(124,58,237,0.15)' : '#F5F3FF')
        : (dark ? 'rgba(14,165,233,0.15)' : '#F0F9FF');

    return StyleSheet.create({
        container: {
            borderRadius: Radius.xl,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: dark ? `${accent}50` : `${accent}30`,
            backgroundColor: dark ? '#1E293B' : '#fff',
            marginBottom: Spacing.lg,
            ...Shadow.card,
        },
        headerStrip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: accent,
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        iconCircle: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        bannerTag: {
            fontFamily: Fonts.medium,
            fontSize: 10,
            color: 'rgba(255,255,255,0.8)',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
        },
        bannerTitle: {
            fontFamily: Fonts.bold,
            fontSize: FontSize.body,
            color: '#fff',
            marginTop: 1,
        },
        savingsBadge: {
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
        },
        savingsText: {
            fontFamily: Fonts.semiBold,
            fontSize: 11,
            color: '#fff',
        },
        body: {
            padding: 16,
            backgroundColor: accentLight,
        },
        bodyDesc: {
            fontFamily: Fonts.medium,
            fontSize: FontSize.bodySmall,
            color: dark ? colors.textBody : '#374151',
            marginBottom: 12,
            lineHeight: 18,
        },
        benefitRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
        },
        benefitText: {
            fontFamily: Fonts.regular,
            fontSize: FontSize.caption,
            color: dark ? colors.textBody : '#374151',
        },
        cycleLabel: {
            fontFamily: Fonts.semiBold,
            fontSize: FontSize.caption,
            color: dark ? colors.textMuted : '#6B7280',
            marginTop: 14,
            marginBottom: 8,
        },
        cycleRow: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: 16,
        },
        cycleChip: {
            flex: 1,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 6,
            alignItems: 'center',
            backgroundColor: dark ? 'rgba(255,255,255,0.06)' : '#fff',
            borderWidth: 1.5,
            borderColor: dark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
        },
        cycleChipActive: {
            borderColor: accent,
            backgroundColor: dark ? `${accent}22` : `${accent}12`,
        },
        cycleChipText: {
            fontFamily: Fonts.medium,
            fontSize: 11,
            color: dark ? colors.textMuted : '#6B7280',
        },
        cycleChipTextActive: {
            color: accent,
        },
        cycleChipPrice: {
            fontFamily: Fonts.bold,
            fontSize: FontSize.bodySmall,
            color: dark ? colors.textBody : '#374151',
            marginTop: 2,
        },
        cycleChipPriceActive: {
            color: accent,
        },
        ctaBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: accent,
            borderRadius: Radius.lg,
            height: 50,
            ...Shadow.card,
        },
        ctaBtnText: {
            fontFamily: Fonts.bold,
            fontSize: FontSize.body,
            color: '#fff',
        },
        ctaHelper: {
            fontFamily: Fonts.regular,
            fontSize: 11,
            color: dark ? colors.textMuted : '#9CA3AF',
            textAlign: 'center',
            marginTop: 8,
        },
    });
};

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { planService, Plan, BillingCycle, UpgradeCalculation } from '@/services/api/planService';
import { Fonts, FontSize, Radius, Shadow } from '@/constants/theme';

type CycleOption = { key: BillingCycle; labelKey: string; daysKey: string };
const BILLING_CYCLES: CycleOption[] = [
    { key: 'QUARTERLY', labelKey: 'membership.three_months', daysKey: 'membership.days_90' },
    { key: 'BIANNUAL',  labelKey: 'membership.six_months',   daysKey: 'membership.days_180' },
    { key: 'YEARLY',    labelKey: 'membership.one_year',     daysKey: 'membership.days_365' },
];

function priceForCycle(plan: Plan, cycle: BillingCycle): number {
    if (cycle === 'QUARTERLY') return plan.quarterlyPrice;
    if (cycle === 'BIANNUAL')  return plan.biannualPrice;
    return plan.yearlyPrice;
}

export default function UpgradeScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const { profile } = useUser();
    const S = makeStyles(colors, isDarkMode);

    const { subId } = useLocalSearchParams<{ subId: string }>();

    const [loading, setLoading] = useState(true);
    const [currentPlan, setCurrentPlan] = useState<{ id: string; name: string } | null>(null);
    const [upgrades, setUpgrades] = useState<Plan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('QUARTERLY');
    const [calculation, setCalculation] = useState<UpgradeCalculation | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [confirming, setConfirming] = useState(false);

    // Load available upgrades
    useEffect(() => {
        if (!subId) return;
        (async () => {
            try {
                setLoading(true);
                const res = await planService.getAvailableUpgrades(subId);
                if (res.success && res.data) {
                    setCurrentPlan(res.data.currentPlan as any);
                    setUpgrades(res.data.availableUpgrades ?? []);
                    if (res.data.availableUpgrades?.length > 0) setSelectedPlan(res.data.availableUpgrades[0]);
                } else {
                    Alert.alert(t('membership.no_upgrades'), res.message ?? t('membership.no_upgrades_msg'));
                    router.back();
                }
            } catch {
                Alert.alert(t('common.error'), t('membership.load_error'));
                router.back();
            } finally { setLoading(false); }
        })();
    }, [subId]);

    // Recalculate on plan / cycle change
    useEffect(() => {
        if (!selectedPlan || !subId) return;
        (async () => {
            try {
                setCalculating(true);
                setCalculation(null);
                const res = await planService.calculateUpgrade(subId, selectedPlan.id, selectedCycle);
                if (res.success && res.data) setCalculation(res.data);
            } catch { /* silent */ }
            finally { setCalculating(false); }
        })();
    }, [selectedPlan, selectedCycle, subId]);

    const handleConfirm = async () => {
        if (!calculation || !selectedPlan || !subId) return;
        const { amountDue, creditAmount } = calculation.calculation;

        if (amountDue > 0) {
            setConfirming(true);
            try {
                const subRes = await planService.initiateSubscription({
                    planId: selectedPlan.id,
                    billingCycle: selectedCycle,
                    amount: amountDue,
                });
                if (subRes.success && subRes.data) {
                    const subscriptionId = subRes.data.id;
                    router.push({
                        pathname: '/payment/checkout',
                        params: {
                            subscriptionId,
                            amount: String(amountDue),
                            label: t('membership.upgrade_title') + ': ' + selectedPlan.name,
                            upgradeSubId: subId,
                            upgradeNewPlanId: selectedPlan.id,
                            upgradeNewBillingCycle: selectedCycle,
                            userName: profile?.name ?? '',
                            phone: profile?.phone ?? '',
                            email: profile?.email ?? '',
                            refreshProfileOnSuccess: '1',
                        },
                    } as any);
                } else {
                    Alert.alert(t('membership.upgrade_failed'), subRes.message ?? t('membership.upgrade_error'));
                }
            } catch (e: any) {
                Alert.alert(t('common.error'), e?.message ?? t('membership.upgrade_generic_error'));
            } finally {
                setConfirming(false);
            }
            return;
        }

        // Free upgrade — confirm then execute
        Alert.alert(
            t('membership.confirm_upgrade_title'),
            t('membership.confirm_upgrade_msg', {
                plan: selectedPlan.name,
                credit: creditAmount.toLocaleString('en-IN'),
            }),
            [
                { text: t('membership.cancel_btn'), style: 'cancel' },
                {
                    text: t('membership.upgrade_now_btn'),
                    onPress: async () => {
                        try {
                            setConfirming(true);
                            const res = await planService.executeUpgrade(subId, {
                                newPlanId: selectedPlan.id,
                                newBillingCycle: selectedCycle,
                            });
                            if (res.success) {
                                Alert.alert(
                                    t('membership.upgrade_success_title'),
                                    t('membership.upgrade_success_msg', { plan: selectedPlan.name }),
                                    [{ text: 'OK', onPress: () => router.replace('/plans/membership-dashboard' as any) }]
                                );
                            } else {
                                Alert.alert(t('membership.upgrade_failed'), res.message ?? t('membership.upgrade_error'));
                            }
                        } catch (e: any) {
                            Alert.alert(t('common.error'), e?.message ?? t('membership.upgrade_generic_error'));
                        } finally { setConfirming(false); }
                    },
                },
            ]
        );
    };

    const calc = calculation?.calculation;

    if (loading) {
        return (
            <View style={[S.screen, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
                <StatusBar style="light" backgroundColor={colors.primary} />
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={S.loadingText}>{t('membership.loading_upgrades')}</Text>
            </View>
        );
    }

    return (
        <View style={[S.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={S.header}>
                <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={S.headerTitle}>{t('membership.upgrade_title')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

                {/* Current plan badge */}
                {currentPlan && (
                    <View style={S.currentBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        <Text style={S.currentBadgeText}>
                            {t('membership.current_plan_label', { name: currentPlan.name })}
                        </Text>
                    </View>
                )}

                {/* Plan picker */}
                <Text style={S.sectionLabel}>{t('membership.choose_new_plan')}</Text>
                {upgrades.length === 0 ? (
                    <View style={S.emptyBox}>
                        <Ionicons name="ribbon-outline" size={32} color={colors.textMuted} />
                        <Text style={S.emptyText}>{t('membership.already_highest')}</Text>
                    </View>
                ) : (
                    upgrades.map(plan => {
                        const isSelected = selectedPlan?.id === plan.id;
                        return (
                            <TouchableOpacity
                                key={plan.id}
                                style={[S.planCard, isSelected && S.planCardSelected]}
                                onPress={() => setSelectedPlan(plan)}
                                activeOpacity={0.8}
                            >
                                <View style={S.planCardLeft}>
                                    <View style={[S.radioCircle, isSelected && S.radioSelected]}>
                                        {isSelected && <View style={S.radioDot} />}
                                    </View>
                                    <View>
                                        <Text style={[S.planCardName, isSelected && { color: colors.primary }]}>{plan.name}</Text>
                                        <Text style={S.planCardPrice}>
                                            {t('membership.from_price', { price: plan.quarterlyPrice.toLocaleString('en-IN') })}
                                        </Text>
                                    </View>
                                </View>
                                {isSelected && (
                                    <View style={S.selectedBadge}>
                                        <Text style={S.selectedBadgeText}>{t('membership.selected_label')}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}

                {/* Billing cycle */}
                {upgrades.length > 0 && (
                    <>
                        <Text style={S.sectionLabel}>{t('membership.billing_duration')}</Text>
                        <View style={S.cycleRow}>
                            {BILLING_CYCLES.map(c => {
                                const active = c.key === selectedCycle;
                                const price = selectedPlan ? priceForCycle(selectedPlan, c.key) : 0;
                                return (
                                    <TouchableOpacity
                                        key={c.key}
                                        style={[S.cycleBtn, active && S.cycleBtnActive]}
                                        onPress={() => setSelectedCycle(c.key)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[S.cycleBtnLabel, active && { color: '#FAF7ED' }]}>{t(c.labelKey)}</Text>
                                        <Text style={[S.cycleBtnPrice, active && { color: 'rgba(255,255,255,0.9)' }]}>₹{price.toLocaleString('en-IN')}</Text>
                                        <Text style={[S.cycleBtnDays, active && { color: 'rgba(255,255,255,0.65)' }]}>{t(c.daysKey)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* Credit breakdown card */}
                {upgrades.length > 0 && (
                    <View style={S.creditCard}>
                        <Text style={S.creditTitle}>{t('membership.credit_breakdown_title')}</Text>
                        {calculating ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
                        ) : calc ? (
                            <>
                                <CreditRow label={t('membership.days_remaining')} value={`${calc.daysRemaining} ${t('plans.quarterly_days').split(' ')[1] ?? 'days'}`} colors={colors} />
                                <CreditRow label={t('membership.daily_rate')} value={`₹${calc.dailyRate.toFixed(2)}`} colors={colors} />
                                <CreditRow label={t('membership.credit_from_plan')} value={`– ₹${calc.creditAmount.toLocaleString('en-IN')}`} valueColor="#059669" colors={colors} />
                                <CreditRow label={t('membership.new_plan_price')} value={`₹${calc.newPlanPrice.toLocaleString('en-IN')}`} colors={colors} />
                                <View style={S.sep} />
                                <CreditRow
                                    label={t('membership.amount_due')}
                                    value={calc.amountDue === 0 ? t('membership.free') : `₹${calc.amountDue.toLocaleString('en-IN')}`}
                                    valueColor={calc.amountDue === 0 ? '#059669' : colors.primary}
                                    bold
                                    colors={colors}
                                />
                                {calc.amountDue === 0 && (
                                    <View style={S.freeChip}>
                                        <Ionicons name="gift-outline" size={14} color="#059669" />
                                        <Text style={S.freeChipText}>{t('membership.credit_covers_full')}</Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <Text style={S.calcPlaceholder}>{t('membership.select_plan_prompt')}</Text>
                        )}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom CTA */}
            {upgrades.length > 0 && (
                <View style={[S.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        style={[S.ctaBtn, (!calc || confirming || calculating) && { opacity: 0.55 }]}
                        onPress={handleConfirm}
                        disabled={!calc || confirming || calculating}
                        activeOpacity={0.85}
                    >
                        {confirming ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="arrow-up-circle" size={18} color="#fff" />
                                <Text style={S.ctaBtnText}>
                                    {calc?.amountDue === 0
                                        ? t('membership.upgrade_free_btn')
                                        : t('membership.pay_and_upgrade_btn', { amount: (calc?.amountDue ?? 0).toLocaleString('en-IN') })}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Tiny helper row ──────────────────────────────────────────────────────────
function CreditRow({ label, value, valueColor, bold, colors }: {
    label: string; value: string; valueColor?: string; bold?: boolean; colors: ThemeColors;
}) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontFamily: bold ? Fonts.bold : Fonts.medium, fontSize: FontSize.bodySmall, color: bold ? colors.textDark : colors.textMuted }}>{label}</Text>
            <Text style={{ fontFamily: bold ? Fonts.bold : Fonts.semiBold, fontSize: bold ? 17 : FontSize.bodySmall, color: valueColor ?? colors.textDark }}>{value}</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (colors: ThemeColors, dark: boolean) => StyleSheet.create({
    screen:           { flex: 1, backgroundColor: dark ? '#0F172A' : '#F0F4F8' },
    header:           { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerTitle:      { fontFamily: Fonts.bold, fontSize: FontSize.heading2, color: '#FAF7ED', flex: 1 },
    scroll:           { padding: 16, paddingTop: 20 },
    loadingText:      { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textMuted, marginTop: 12 },

    currentBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.primary}12`, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 20, borderWidth: 1, borderColor: `${colors.primary}30` },
    currentBadgeText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textBody, flex: 1 },

    sectionLabel:     { fontFamily: Fonts.semiBold, fontSize: FontSize.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },

    emptyBox:         { alignItems: 'center', paddingVertical: 32, gap: 10, backgroundColor: dark ? '#1E293B' : '#FAF7ED', borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.borderLight },
    emptyText:        { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textMuted, textAlign: 'center' },

    planCard:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: dark ? '#1E293B' : '#FAF7ED', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: colors.borderLight, ...Shadow.card },
    planCardSelected: { borderColor: colors.primary },
    planCardLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radioCircle:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderLight, justifyContent: 'center', alignItems: 'center' },
    radioSelected:    { borderColor: colors.primary },
    radioDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    planCardName:     { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark },
    planCardPrice:    { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted, marginTop: 2 },
    selectedBadge:    { backgroundColor: `${colors.primary}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    selectedBadgeText:{ fontFamily: Fonts.semiBold, fontSize: 10, color: colors.primary },

    cycleRow:         { flexDirection: 'row', gap: 10, marginBottom: 20 },
    cycleBtn:         { flex: 1, backgroundColor: dark ? '#1E293B' : '#FAF7ED', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1.5, borderColor: colors.borderLight },
    cycleBtnActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
    cycleBtnLabel:    { fontFamily: Fonts.semiBold, fontSize: 11, color: colors.textDark, marginBottom: 4 },
    cycleBtnPrice:    { fontFamily: Fonts.bold, fontSize: 13, color: colors.textDark },
    cycleBtnDays:     { fontFamily: Fonts.regular, fontSize: 10, color: colors.textMuted, marginTop: 2 },

    creditCard:       { backgroundColor: dark ? '#1E293B' : '#FAF7ED', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: colors.borderLight, ...Shadow.card },
    creditTitle:      { fontFamily: Fonts.bold, fontSize: FontSize.body, color: colors.textDark, marginBottom: 14 },
    sep:              { borderTopWidth: 1, borderTopColor: colors.borderLight, marginBottom: 10, marginTop: 2 },
    freeChip:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: dark ? '#052E16' : '#D1FAE5', borderRadius: 8, padding: 10, marginTop: 4 },
    freeChipText:     { fontFamily: Fonts.medium, fontSize: 12, color: dark ? '#6EE7B7' : '#065F46' },
    calcPlaceholder:  { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted, textAlign: 'center', marginTop: 8 },

    bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: dark ? '#1E293B' : '#FAF7ED', borderTopWidth: 1, borderColor: colors.borderLight, paddingTop: 12, paddingHorizontal: 16 },
    ctaBtn:           { backgroundColor: colors.primary, borderRadius: Radius.lg, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaBtnText:       { fontFamily: Fonts.bold, fontSize: FontSize.body, color: '#FAF7ED' },
});

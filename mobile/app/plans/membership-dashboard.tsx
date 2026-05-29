import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { planService, ActiveSubscription, MembershipsResponse } from '@/services/api/planService';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

const CATEGORY_META: Record<string, { labelKey: string; icon: string; color: string }> = {
    CARE:      { labelKey: 'membership.care_label',      icon: 'heart',            color: '#02743F' },
    HOMEMAKER: { labelKey: 'membership.homemaker_label', icon: 'home',             color: '#6366F1' },
    DEFAULT:   { labelKey: 'membership.title',           icon: 'shield-checkmark', color: '#0EA5E9' },
};

const TIER_KEYS: Record<number, string> = { 0: 'membership.basic_tier', 1: 'membership.premium_tier', 2: 'membership.vip_tier' };

function formatDate(dateStr: string): string {
    try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
}

// ─── Membership Card ──────────────────────────────────────────────────────────
function MembershipCard({ sub, onUpgrade, onRenew }: {
    sub: ActiveSubscription;
    onUpgrade: () => void;
    onRenew: () => void;
}) {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const S = cardStyles(colors, isDarkMode);

    const meta = CATEGORY_META[sub.planType ?? 'DEFAULT'] ?? CATEGORY_META.DEFAULT;
    const days = sub.daysRemaining ?? 0;
    const tierKey = TIER_KEYS[sub.tierLevel ?? 0] ?? 'membership.basic_tier';
    const isExpired = sub.status === 'EXPIRED' || sub.status === 'CANCELLED';
    const urgency = isExpired ? '#EF4444' : days <= 7 ? '#EF4444' : days <= 30 ? '#F59E0B' : colors.primary;

    const cycleLabel =
        sub.billingCycle === 'YEARLY'   ? t('membership.cycle_yearly') :
        sub.billingCycle === 'BIANNUAL' ? t('membership.cycle_biannual') :
                                          t('membership.cycle_quarterly');

    return (
        <View style={S.card}>
            {/* Header strip */}
            <View style={[S.cardHeader, { backgroundColor: isExpired ? '#64748B' : meta.color }]}>
                <View style={S.headerLeft}>
                    <View style={S.iconCircle}>
                        <Ionicons name={meta.icon as any} size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={S.categoryLabel}>{t(meta.labelKey)}</Text>
                        <Text style={S.planName}>{sub.planName}</Text>
                    </View>
                </View>
                <View style={S.tierBadge}>
                    <Text style={S.tierText}>
                        {isExpired ? t('membership.expired_badge') || 'EXPIRED' : t(tierKey)}
                    </Text>
                </View>
            </View>

            {/* Stats row */}
            <View style={S.cardBody}>
                <View style={S.statsRow}>
                    <View style={S.statItem}>
                        <Text style={[S.statValue, { color: urgency }]}>{days}</Text>
                        <Text style={S.statLabel}>{t('membership.days_left')}</Text>
                    </View>
                    <View style={S.divider} />
                    <View style={S.statItem}>
                        <Text style={S.statValue}>₹{(sub.amount ?? 0).toLocaleString('en-IN')}</Text>
                        <Text style={S.statLabel}>{t('membership.paid')}</Text>
                    </View>
                    <View style={S.divider} />
                    <View style={S.statItem}>
                        <Text style={S.statValue}>{cycleLabel}</Text>
                        <Text style={S.statLabel}>{t('membership.cycle')}</Text>
                    </View>
                </View>

                {/* Expiry */}
                <View style={S.expiryRow}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                    <Text style={S.expiryText}>
                        {isExpired
                            ? t('membership.expired_on', { date: formatDate(sub.expiryDate) }) || `Expired on ${formatDate(sub.expiryDate)}`
                            : t('membership.expires_on', { date: formatDate(sub.expiryDate) })}
                    </Text>
                </View>

                {/* Action buttons */}
                <View style={S.actions}>
                    {isExpired ? (
                        <TouchableOpacity style={[S.btn, S.renewBtn]} onPress={onRenew} activeOpacity={0.8}>
                            <Ionicons name="refresh-outline" size={15} color="#fff" />
                            <Text style={[S.btnText, { color: '#fff' }]}>{t('membership.renew_plan_btn')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity style={[S.btn, S.upgradeBtn]} onPress={onUpgrade} activeOpacity={0.8}>
                                <Ionicons name="arrow-up-circle-outline" size={15} color={colors.primary} />
                                <Text style={[S.btnText, { color: colors.primary }]}>{t('membership.upgrade_btn')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[S.btn, S.renewBtn]} onPress={onRenew} activeOpacity={0.8}>
                                <Ionicons name="refresh-outline" size={15} color="#fff" />
                                <Text style={[S.btnText, { color: '#fff' }]}>{t('membership.renew_btn')}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
}

// ─── Empty card ───────────────────────────────────────────────────────────────
function EmptyCard({ category, onSubscribe }: { category: string; onSubscribe: () => void }) {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const meta = CATEGORY_META[category] ?? CATEGORY_META.DEFAULT;
    const bg = isDarkMode ? '#1E293B' : '#fff';

    return (
        <View style={{ backgroundColor: bg, borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1.5, borderColor: colors.borderLight, borderStyle: 'dashed' }}>
            <Ionicons name={meta.icon as any} size={28} color={colors.textMuted} />
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark, marginTop: 8 }}>
                {t('membership.no_plan_title', { category: t(meta.labelKey) })}
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                {t('membership.no_plan_sub')}
            </Text>
            <TouchableOpacity
                style={{ marginTop: 14, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 9 }}
                onPress={onSubscribe}
                activeOpacity={0.85}
            >
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: FontSize.caption, color: '#fff' }}>{t('membership.subscribe_now')}</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MembershipDashboardScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const S = makeStyles(colors, isDarkMode);

    const [data, setData] = useState<MembershipsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const res = await planService.getMemberships();
            if (res.success && res.data) setData(res.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };


    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const ALL_CATEGORIES = ['CARE', 'HOMEMAKER'];

    return (
        <View style={[S.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={S.header}>
                <TouchableOpacity onPress={() => router.back()} style={S.iconBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={S.headerCenter}>
                    <Text style={S.headerTitle}>{t('membership.title')}</Text>
                    <Text style={S.headerSub}>{t('membership.subtitle')}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/plans/upgrade-history' as any)} style={S.iconBtn}>
                    <Ionicons name="time-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={S.loader}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={S.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
                >
                    {ALL_CATEGORIES.map(cat => {
                        const subs = data?.memberships?.[cat] ?? [];
                        const activeSub = subs[0];
                        return (
                            <View key={cat} style={S.section}>
                                <Text style={S.sectionTitle}>{t(CATEGORY_META[cat]?.labelKey ?? 'membership.title')}</Text>
                                {activeSub ? (
                                    <MembershipCard
                                        sub={activeSub}
                                        onUpgrade={() => router.push({ pathname: '/plans/upgrade', params: { subId: activeSub.id } } as any)}
                                        onRenew={() => router.push({ pathname: '/plans/[id]', params: { id: activeSub.planId, subId: activeSub.id, isRenewFlow: '1' } } as any)}
                                    />
                                ) : (
                                    <EmptyCard category={cat} onSubscribe={() => router.push('/plans' as any)} />
                                )}
                            </View>
                        );
                    })}

                    {/* History shortcut */}
                    <TouchableOpacity style={S.historyLink} onPress={() => router.push('/plans/upgrade-history' as any)}>
                        <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                        <Text style={S.historyLinkText}>{t('membership.history_link')}</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (colors: ThemeColors, dark: boolean) => StyleSheet.create({
    screen:          { flex: 1, backgroundColor: dark ? '#0F172A' : '#F0F4F8' },
    header:          { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    iconBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerCenter:    { flex: 1 },
    headerTitle:     { fontFamily: Fonts.bold, fontSize: FontSize.heading2, color: '#fff' },
    headerSub:       { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
    loader:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll:          { padding: 16, paddingTop: 20 },
    section:         { marginBottom: 24 },
    sectionTitle:    { fontFamily: Fonts.semiBold, fontSize: FontSize.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    historyLink:     { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 14, backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.borderLight },
    historyLinkText: { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, color: colors.primary, flex: 1 },
});

const cardStyles = (colors: ThemeColors, dark: boolean) => StyleSheet.create({
    card:            { backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 20, overflow: 'hidden', ...Shadow.card, borderWidth: 1, borderColor: colors.borderLight },
    cardHeader:      { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle:      { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    categoryLabel:   { fontFamily: Fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.5 },
    planName:        { fontFamily: Fonts.bold, fontSize: 18, color: '#fff', marginTop: 2 },
    tierBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
    tierText:        { fontFamily: Fonts.semiBold, fontSize: 11, color: '#fff' },
    cardBody:        { padding: 16 },
    statsRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, backgroundColor: dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderRadius: 12, marginBottom: 12 },
    statItem:        { alignItems: 'center', flex: 1 },
    statValue:       { fontFamily: Fonts.bold, fontSize: 20, color: colors.textDark },
    statLabel:       { fontFamily: Fonts.regular, fontSize: 10, color: colors.textMuted, marginTop: 3 },
    divider:         { width: 1, height: 36, backgroundColor: colors.borderLight },
    expiryRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    expiryText:      { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.textMuted },
    downgradeNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: dark ? '#2D1F00' : '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 10 },
    downgradeText:   { fontFamily: Fonts.medium, fontSize: 12, color: dark ? '#FCD34D' : '#92400E', flex: 1, lineHeight: 17 },
    actions:         { flexDirection: 'column', gap: 10 },
    btn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: Radius.lg },
    upgradeBtn:      { backgroundColor: `${colors.primary}12`, borderWidth: 1.5, borderColor: colors.primary },
    renewBtn:        { backgroundColor: colors.primary },
    btnText:         { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall },
});

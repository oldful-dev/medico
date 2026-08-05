import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { planService, UpgradeHistoryItem } from '@/services/api/planService';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

type TypeStyle = { icon: string; color: string; bgKey: string };
const TYPE_META: Record<string, TypeStyle> = {
    UPGRADE:             { icon: 'arrow-up-circle',   color: '#059669', bgKey: 'upgrade' },
    DOWNGRADE_SCHEDULED: { icon: 'time',               color: '#F59E0B', bgKey: 'downgrade' },
    RENEW:               { icon: 'refresh-circle',     color: '#6366F1', bgKey: 'renew' },
};

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    } catch { return dateStr; }
}

function HistoryCard({ item }: { item: UpgradeHistoryItem }) {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();

    const typeMeta = TYPE_META[item.type] ?? TYPE_META.UPGRADE;
    const typeLabel =
        item.type === 'UPGRADE'             ? t('membership.type_upgrade') :
        item.type === 'DOWNGRADE_SCHEDULED' ? t('membership.type_downgrade') :
                                               t('membership.type_renew');

    const bgColor = isDarkMode
        ? (item.type === 'UPGRADE' ? '#052E16' : item.type === 'DOWNGRADE_SCHEDULED' ? '#2D1F00' : '#1E1B4B')
        : (item.type === 'UPGRADE' ? '#F0FDF4' : item.type === 'DOWNGRADE_SCHEDULED' ? '#FFFBEB' : '#EEF2FF');

    return (
        <View style={[cardS(colors, isDarkMode).card]}>
            {/* Top row: type badge + date */}
            <View style={cardS(colors, isDarkMode).topRow}>
                <View style={[cardS(colors, isDarkMode).badge, { backgroundColor: bgColor }]}>
                    <Ionicons name={typeMeta.icon as any} size={14} color={typeMeta.color} />
                    <Text style={[cardS(colors, isDarkMode).badgeText, { color: typeMeta.color }]}>{typeLabel}</Text>
                </View>
                <Text style={cardS(colors, isDarkMode).dateText}>{formatDate(item.upgradeDate)}</Text>
            </View>

            {/* Plan transition */}
            <View style={cardS(colors, isDarkMode).transition}>
                <View style={cardS(colors, isDarkMode).planBox}>
                    <Text style={cardS(colors, isDarkMode).planBoxLabel}>{t('membership.old_plan')}</Text>
                    <Text style={cardS(colors, isDarkMode).planBoxName}>{item.oldPlanName}</Text>
                </View>
                <View style={cardS(colors, isDarkMode).arrow}>
                    <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                </View>
                <View style={[cardS(colors, isDarkMode).planBox, { alignItems: 'flex-end' }]}>
                    <Text style={[cardS(colors, isDarkMode).planBoxLabel, { textAlign: 'right' }]}>{t('membership.new_plan')}</Text>
                    <Text style={[cardS(colors, isDarkMode).planBoxName, { color: typeMeta.color, textAlign: 'right' }]}>{item.newPlanName}</Text>
                </View>
            </View>

            {/* Financial details */}
            <View style={cardS(colors, isDarkMode).financials}>
                <FinRow
                    label={t('membership.credit_applied')}
                    value={item.creditApplied > 0 ? `– ₹${item.creditApplied.toLocaleString('en-IN')}` : '—'}
                    valueColor="#059669"
                    colors={colors}
                    isDarkMode={isDarkMode}
                />
                <FinRow
                    label={t('membership.amount_paid')}
                    value={item.amountPaid === 0 ? t('membership.free_upgrade') : `₹${item.amountPaid.toLocaleString('en-IN')}`}
                    valueColor={item.amountPaid === 0 ? '#059669' : colors.textDark}
                    bold
                    colors={colors}
                    isDarkMode={isDarkMode}
                />
            </View>
        </View>
    );
}

function FinRow({ label, value, valueColor, bold, colors, isDarkMode }: {
    label: string; value: string; valueColor?: string; bold?: boolean;
    colors: ThemeColors; isDarkMode: boolean;
}) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.textMuted }}>{label}</Text>
            <Text style={{ fontFamily: bold ? Fonts.bold : Fonts.semiBold, fontSize: bold ? FontSize.bodySmall : FontSize.caption, color: valueColor ?? colors.textDark }}>
                {value}
            </Text>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function UpgradeHistoryScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const S = makeStyles(colors, isDarkMode);

    const [history, setHistory] = useState<UpgradeHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHistory = async () => {
        try {
            const res = await planService.getUpgradeHistory();
            if (res.success && res.data) setHistory(res.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    useFocusEffect(useCallback(() => { fetchHistory(); }, []));

    const onRefresh = async () => { setRefreshing(true); await fetchHistory(); setRefreshing(false); };

    return (
        <View style={[S.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={S.header}>
                <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={S.headerCenter}>
                    <Text style={S.headerTitle}>{t('membership.history_title')}</Text>
                    <Text style={S.headerSub}>{t('membership.history_subtitle')}</Text>
                </View>
            </View>

            {/* Legend chips */}
            <View style={S.legend}>
                {(Object.entries(TYPE_META) as [string, TypeStyle][]).map(([key, meta]) => (
                    <View key={key} style={[S.legendChip, { borderColor: meta.color + '50' }]}>
                        <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                        <Text style={[S.legendText, { color: meta.color }]}>
                            {key === 'UPGRADE' ? t('membership.type_upgrade') :
                             key === 'DOWNGRADE_SCHEDULED' ? t('membership.type_downgrade') :
                             t('membership.type_renew')}
                        </Text>
                    </View>
                ))}
            </View>

            {loading ? (
                <View style={S.loader}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={S.loaderText}>{t('membership.history_loading')}</Text>
                </View>
            ) : history.length === 0 ? (
                <View style={S.emptyState}>
                    <Ionicons name="receipt-outline" size={52} color={colors.textMuted} />
                    <Text style={S.emptyTitle}>{t('membership.history_empty_title')}</Text>
                    <Text style={S.emptySub}>{t('membership.history_empty_sub')}</Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <HistoryCard item={item} />}
                    contentContainerStyle={S.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                    }
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    ListFooterComponent={<View style={{ height: 30 }} />}
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardS = (colors: ThemeColors, dark: boolean) => StyleSheet.create({
    card:        { backgroundColor: dark ? '#1E293B' : '#FAF7ED', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight, ...Shadow.card },
    topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText:   { fontFamily: Fonts.semiBold, fontSize: 11 },
    dateText:    { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.textMuted },
    transition:  { flexDirection: 'row', alignItems: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 14 },
    planBox:     { flex: 1 },
    planBoxLabel:{ fontFamily: Fonts.regular, fontSize: 10, color: colors.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    planBoxName: { fontFamily: Fonts.bold, fontSize: FontSize.bodySmall, color: colors.textDark },
    arrow:       { width: 32, alignItems: 'center' },
    financials:  { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12 },
});

const makeStyles = (colors: ThemeColors, dark: boolean) => StyleSheet.create({
    screen:      { flex: 1, backgroundColor: dark ? '#0F172A' : '#F0F4F8' },
    header:      { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerCenter:{ flex: 1 },
    headerTitle: { fontFamily: Fonts.bold, fontSize: FontSize.heading2, color: '#FAF7ED' },
    headerSub:   { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
    legend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: dark ? '#1E293B' : '#FAF7ED', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    legendChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    legendText:  { fontFamily: Fonts.semiBold, fontSize: 10 },
    loader:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loaderText:  { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textMuted },
    list:        { padding: 16, paddingTop: 16 },
    emptyState:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
    emptyTitle:  { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: colors.textDark, textAlign: 'center' },
    emptySub:    { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { referralService, MyReferral, ReferralStatus } from '@/services/api/referralService';

const STATUS_META: Record<ReferralStatus, { color: string; bg: string; key: string }> = {
    PENDING:   { color: '#F59E0B', bg: '#FEF3C7', key: 'refer_earn.status_pending' },
    QUALIFIED: { color: '#3B82F6', bg: '#DBEAFE', key: 'refer_earn.status_qualified' },
    REWARDED:  { color: '#10B981', bg: '#D1FAE5', key: 'refer_earn.status_rewarded' },
    VOID:      { color: '#9CA3AF', bg: '#F3F4F6', key: 'refer_earn.status_void' },
};

export default function ReferEarnScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);

    const [data, setData] = useState<MyReferral | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let alive = true;
            (async () => {
                setLoading(true);
                setError(null);
                try {
                    const res = await referralService.getMine();
                    if (!alive) return;
                    if (res.success && res.data) setData(res.data);
                    else setError(res.message || t('refer_earn.load_error'));
                } catch (e: any) {
                    if (alive) setError(e?.message || t('refer_earn.load_error'));
                } finally {
                    if (alive) setLoading(false);
                }
            })();
            return () => { alive = false; };
        }, [t])
    );

    const rewardLabel = (v: number, type?: 'flat' | 'percentage') =>
        type === 'percentage' ? `${v}%` : `₹${v}`;

    const shareMessage = data
        ? t('refer_earn.share_message', {
            code: data.referralCode,
            reward: rewardLabel(data.program.refereeRewardValue, data.program.discountType),
        })
        : '';

    const onShare = async () => {
        if (!data) return;
        try {
            await Share.share({ message: shareMessage });
        } catch { /* user cancelled */ }
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('refer_earn.title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : error ? (
                <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
            ) : data ? (
                <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>

                    {!data.program.enabled && (
                        <View style={styles.disabledBanner}>
                            <Text style={styles.disabledText}>{t('refer_earn.program_paused')}</Text>
                        </View>
                    )}

                    {/* Hero */}
                    <View style={styles.hero}>
                        <Ionicons name="gift" size={40} color={colors.primary} />
                        <Text style={styles.heroTitle}>
                            {t('refer_earn.hero_title', {
                                friendReward: rewardLabel(data.program.refereeRewardValue, data.program.discountType),
                                yourReward: rewardLabel(data.program.referrerRewardValue, data.program.discountType),
                            })}
                        </Text>
                        <Text style={styles.heroSub}>{t('refer_earn.hero_sub')}</Text>
                    </View>

                    {/* Code card */}
                    <View style={styles.codeCard}>
                        <Text style={styles.codeLabel}>{t('refer_earn.your_code')}</Text>
                        <Text style={styles.code}>{data.referralCode}</Text>
                        <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
                            <Ionicons name="share-social-outline" size={16} color="#fff" />
                            <Text style={styles.shareBtnText}>{t('refer_earn.share')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <Stat value={String(data.stats.total)} label={t('refer_earn.stat_invited')} colors={colors} />
                        <Stat value={String(data.stats.rewarded)} label={t('refer_earn.stat_rewarded')} colors={colors} />
                        <Stat value={`₹${Math.round(data.stats.totalEarned)}`} label={t('refer_earn.stat_earned')} colors={colors} />
                    </View>
                    {data.stats.slotsLeft <= 5 && (
                        <Text style={styles.slotsNote}>
                            {t('refer_earn.slots_left', { count: data.stats.slotsLeft })}
                        </Text>
                    )}

                    {/* How it works */}
                    <Text style={styles.sectionTitle}>{t('refer_earn.how_title')}</Text>
                    <Step n={1} text={t('refer_earn.how_1')} colors={colors} />
                    <Step n={2} text={t('refer_earn.how_2')} colors={colors} />
                    <Step n={3} text={t('refer_earn.how_3', {
                        reward: rewardLabel(data.program.referrerRewardValue, data.program.discountType),
                    })} colors={colors} />

                    {/* Referral list */}
                    {data.referrals.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>{t('refer_earn.your_referrals')}</Text>
                            {data.referrals.map((r) => {
                                const meta = STATUS_META[r.status];
                                return (
                                    <View key={r.id} style={styles.refRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.refName}>{r.refereeName}</Text>
                                            {r.status === 'REWARDED' && r.rewardCoupon && (
                                                <Text style={styles.refCoupon}>
                                                    {t('refer_earn.reward_coupon', { code: r.rewardCoupon.code })}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                                            <Text style={[styles.badgeText, { color: meta.color }]}>{t(meta.key)}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </>
                    )}
                </ScrollView>
            ) : null}

        </SafeAreaView>
    );
}

function Stat({ value, label, colors }: { value: string; label: string; colors: ThemeColors }) {
    return (
        <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: Fonts.bold, fontSize: 20, color: colors.primary }}>{value}</Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' }}>{label}</Text>
        </View>
    );
}

function Step({ n, text, colors }: { n: number; text: string; colors: ThemeColors }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Text style={{ color: '#fff', fontFamily: Fonts.bold, fontSize: 12 }}>{n}</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textDark }}>{text}</Text>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    backBtn: { padding: 2 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    errorText: { fontFamily: Fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    disabledBanner: { backgroundColor: isDark ? '#3A2A0A' : '#FEF3C7', borderRadius: Radius.md, padding: 12, marginBottom: 16 },
    disabledText: { fontFamily: Fonts.medium, fontSize: 12, color: isDark ? '#FDE68A' : '#92400E', textAlign: 'center' },
    hero: { alignItems: 'center', marginBottom: 20 },
    heroTitle: { fontFamily: Fonts.bold, fontSize: 18, color: colors.textDark, textAlign: 'center', marginTop: 10 },
    heroSub: { fontFamily: Fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
    codeCard: { backgroundColor: isDark ? '#0C2A1E' : '#EFF7F3', borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: Radius.lg, padding: 20, alignItems: 'center', marginBottom: 20 },
    codeLabel: { fontFamily: Fonts.regular, fontSize: 12, color: colors.textMuted },
    code: { fontFamily: Fonts.bold, fontSize: 28, letterSpacing: 3, color: colors.primary, marginVertical: 8 },
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: colors.primary, marginTop: 8 },
    shareBtnText: { fontFamily: Fonts.semiBold, fontSize: 13, color: '#fff' },
    statsRow: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: Radius.lg, paddingVertical: 16, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight },
    slotsNote: { fontFamily: Fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: colors.textDark, marginTop: 12, marginBottom: 12 },
    refRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    refName: { fontFamily: Fonts.medium, fontSize: 13, color: colors.textDark },
    refCoupon: { fontFamily: Fonts.regular, fontSize: 11, color: colors.primary, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontFamily: Fonts.semiBold, fontSize: 11 },
});

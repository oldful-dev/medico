import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { planService } from '@/services/api/planService';
import { renderBenefitSvg } from '@/utils/benefitIconMap';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

interface BenefitUsage {
    benefitCode: string;
    allowed: number;
    used: number;
    remaining: number;
    title: string;
    description?: string;
    usagePeriod: string;
}

export default function MembershipBenefitsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();

    const [benefits, setBenefits] = useState<BenefitUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBenefits = async () => {
        try {
            const res = await planService.getMyBenefits();
            if (res.success && res.data) {
                setBenefits(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch benefits:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBenefits();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBenefits();
        setRefreshing(false);
    };

    return (
        <View style={[styles.screen, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={colors.primary} />
            
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{t('membership.benefits_title', 'Membership Benefits')}</Text>
                    <Text style={styles.headerSub}>{t('membership.benefits_sub', 'Track your remaining plan quotas')}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {benefits.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="gift-outline" size={48} color={isDarkMode ? '#475569' : '#94A3B8'} />
                            <Text style={[styles.emptyText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                                {t('membership.no_benefits', 'No active benefits found. Subscribe to a plan to unlock premium healthcare!')}
                            </Text>
                            <TouchableOpacity style={[styles.subscribeBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/plans')}>
                                <Text style={styles.subscribeBtnText}>{t('membership.subscribe_now', 'Subscribe Now')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        benefits.map((benefit, index) => {
                            const isUnlimited = benefit.allowed === 0;
                            const isExhausted = !isUnlimited && benefit.remaining <= 0;
                            const progress = isUnlimited ? 1 : Math.max(0, Math.min(1, (benefit.allowed - benefit.used) / benefit.allowed));
                            
                            const barColor = isExhausted 
                                ? '#EF4444' 
                                : progress <= 0.2 
                                    ? '#F59E0B' 
                                    : colors.primary;

                            const periodLabel = benefit.usagePeriod === 'MONTH' 
                                ? t('membership.per_month', 'mo') 
                                : benefit.usagePeriod === 'QUARTER' 
                                    ? t('membership.per_quarter', 'quarter') 
                                    : t('membership.per_year', 'yr');

                            return (
                                <View 
                                    key={benefit.benefitCode + index} 
                                    style={[
                                        styles.card, 
                                        { 
                                            backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                                            borderColor: isDarkMode ? '#334155' : '#E2E8F0'
                                        }
                                    ]}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                                            {renderBenefitSvg(benefit.benefitCode, 22, isExhausted ? '#64748B' : colors.primary)}
                                        </View>
                                        <View style={styles.titleContainer}>
                                            <Text style={[styles.cardTitle, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>
                                                {benefit.title}
                                            </Text>
                                            {benefit.description && (
                                                <Text style={[styles.cardDesc, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                                                    {benefit.description}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Progress row */}
                                    <View style={styles.usageContainer}>
                                        <View style={styles.usageTextRow}>
                                            <Text style={[styles.usageLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                                                {isUnlimited 
                                                    ? t('membership.unlimited_usage', 'Unlimited Entitlement') 
                                                    : t('membership.quota_usage', 'Quota usage')
                                                }
                                            </Text>
                                            {isUnlimited ? (
                                                <View style={[styles.badge, { backgroundColor: isDarkMode ? '#065F46' : '#D1FAE5' }]}>
                                                    <Text style={[styles.badgeText, { color: isDarkMode ? '#34D399' : '#065f46' }]}>
                                                        {t('membership.unlimited', 'Unlimited')}
                                                    </Text>
                                                </View>
                                            ) : isExhausted ? (
                                                <View style={[styles.badge, { backgroundColor: isDarkMode ? '#7F1D1D' : '#FEE2E2' }]}>
                                                    <Text style={[styles.badgeText, { color: isDarkMode ? '#F87171' : '#B91C1C' }]}>
                                                        {t('membership.exhausted', 'Exhausted')}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={[styles.usageValue, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>
                                                    {benefit.remaining} / {benefit.allowed} {t('membership.remaining', 'left')}
                                                </Text>
                                            )}
                                        </View>

                                        {!isUnlimited && (
                                            <>
                                                <View style={[styles.progressBarTrack, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
                                                    <View 
                                                        style={[
                                                            styles.progressBarFill, 
                                                            { 
                                                                width: `${progress * 100}%`, 
                                                                backgroundColor: barColor 
                                                            }
                                                        ]} 
                                                    />
                                                </View>
                                                <Text style={[styles.cycleResetText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
                                                    {t('membership.resets_every', 'Resets every {{period}}', { period: periodLabel })}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 3,
            }
        })
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.heading3,
        color: '#fff',
    },
    headerSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: 'rgba(255, 255, 255, 0.75)',
        marginTop: 1,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        padding: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
    },
    subscribeBtn: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: Radius.full,
    },
    subscribeBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#fff',
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            }
        })
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
    },
    cardTitle: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.body,
    },
    cardDesc: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        marginTop: 3,
        lineHeight: 16,
    },
    usageContainer: {
        marginTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.03)',
        paddingTop: 12,
    },
    usageTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    usageLabel: {
        fontFamily: Fonts.medium,
        fontSize: 12,
    },
    usageValue: {
        fontFamily: Fonts.bold,
        fontSize: 13,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    badgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.caption,
    },
    progressBarTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: 6,
        borderRadius: 3,
    },
    cycleResetText: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        marginTop: 6,
        textAlign: 'right',
    }
});

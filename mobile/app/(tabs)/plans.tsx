// Plans Screen — Ayuxa Subscription & On-Demand Plans V2
// Two-section horizontal carousel layout:
//   Section 1: Ayuxa Care Plans    (planType = CARE)
//   Section 2: Ayuxa Home Essential Plans  (planType = HOMEMAKER)
// Dynamic pricing from API, structured planBenefits, global billing cycle toggle.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, FlatList, Dimensions, Animated, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { planService, Plan, PlanBenefit, BillingCycle, legalService } from '@/services/api/planService';
import { uiConfigService } from '@/services/api/uiConfigService';
import { useUser } from '@/context/UserContext';
import { useTranslation } from 'react-i18next';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { getText } from '@/i18n/utils/getText';
import { renderBenefitSvg } from '@/utils/benefitIconMap';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48; // 24px margin each side
const CARD_MARGIN = 12;

// ─── Billing cycle config ─────────────────────────────────────────────────────
const BILLING_CYCLES: { key: BillingCycle; label: string; suffix: string; months: number }[] = [
    { key: 'QUARTERLY', label: 'Quarterly', suffix: '3 mo', months: 3 },
    { key: 'BIANNUAL',  label: 'Biannually', suffix: '6 mo', months: 6 },
    { key: 'YEARLY',    label: 'Yearly', suffix: '12 mo', months: 12 },
];

function getPriceForCycle(plan: Plan, cycle: BillingCycle): number {
    switch (cycle) {
        case 'QUARTERLY': return plan.quarterlyPrice;
        case 'BIANNUAL':  return plan.biannualPrice;
        case 'YEARLY':    return plan.yearlyPrice;
        default:          return plan.quarterlyPrice;
    }
}

// ─── benefitCode → icon map ───────────────────────────────────────────────────
const BENEFIT_ICON_MAP: Record<string, string> = {
    BASE_PLAN: '✨',
    SOS: '🚨',
    TELECONSULT: '🩺',
    COMPANIONSHIP_CALL: '🤝',
    MEDICINE: '💊',
    MEDICINE_DELIVERY: '💊',
    BLOOD_TEST: '🧪',
    PHONE_SUPPORT: '📞',
    FAMILY_PORTAL: '👨‍👩‍👧',
    CARE_MANAGER: '🧑‍💼',
    CAREGIVER_VISIT: '🤲',
    NURSE_VISIT: '👩‍⚕️',
    SPIRITUAL_ESCORT: '🕊️',
    LOCAL_MEETUP: '🎉',
    HOSPITAL_ACCOMPANIMENT: '🏥',
    PICKUP_DROP: '🚗',
    HANDYMEN: '🔧',
    BILL_PAYMENT: '💳',
    TECH_SUPPORT: '📱',
    GROCERY_ASSIST: '🛒',
    PAPERWORK_ASSIST: '📄',
    DEEP_CLEANING: '🧹',
    SANITATION: '🧴',
    HOME_AUDIT: '🏠',
    CUSTOM_REQUEST: '📦',
    ZERO_SERVICE_FEE: '🎁',
};

function getBenefitIcon(code: string): string {
    return BENEFIT_ICON_MAP[code] ?? '✅';
}

// Keyword fallback icon mapper (for legacy benefits string fallback)
function getFeatureIconFallback(feature: string): string {
    const f = feature.toLowerCase();
    if (f.includes('doctor') || f.includes('physician')) return '🩺';
    if (f.includes('nurse') || f.includes('aide') || f.includes('nursing')) return '👩‍⚕️';
    if (f.includes('caregiver') || f.includes('companion')) return '🤝';
    if (f.includes('ambulance') || f.includes('hospital')) return '🚑';
    if (f.includes('blood') || f.includes('lab') || f.includes('diagnostic')) return '🧬';
    if (f.includes('medicine') || f.includes('pharmacy')) return '💊';
    if (f.includes('physio') || f.includes('therapy')) return '🧘';
    if (f.includes('fitness') || f.includes('exercise')) return '🏃';
    if (f.includes('meal') || f.includes('food')) return '🍱';
    if (f.includes('emergency') || f.includes('sos')) return '🆘';
    if (f.includes('insurance')) return '🛡️';
    if (f.includes('cleaning') || f.includes('sanitisation')) return '🧹';
    if (f.includes('plumb') || f.includes('appliance') || f.includes('repair')) return '🔧';
    if (f.includes('grocery') || f.includes('errand')) return '🛒';
    if (f.includes('driver') || f.includes('cab') || f.includes('transport')) return '🚗';
    if (f.includes('bill') || f.includes('bank') || f.includes('legal')) return '💳';
    if (f.includes('wellness') || f.includes('health')) return '💚';
    if (f.includes('scan') || f.includes('ecg')) return '🔬';
    return '✅';
}

function getBenefitCodeFromFeatureText(feature: string): string {
    const f = feature.toLowerCase();
    if (f.includes('sos') || f.includes('emergency')) return 'SOS';
    if (f.includes('doctor') || f.includes('teleconsult') || f.includes('physician')) return 'TELECONSULT';
    if (f.includes('medicine') || f.includes('delivery')) return 'MEDICINE_DELIVERY';
    if (f.includes('blood') || f.includes('test') || f.includes('lab') || f.includes('diagnostic')) return 'BLOOD_TEST';
    if (f.includes('support') || f.includes('call') || f.includes('phone')) return 'PHONE_SUPPORT';
    if (f.includes('caregiver') || f.includes('companion') || f.includes('visit')) return 'CAREGIVER_VISIT';
    if (f.includes('nurse')) return 'NURSE_VISIT';
    if (f.includes('audit') || f.includes('home')) return 'HOME_AUDIT';
    if (f.includes('grocery') || f.includes('errand')) return 'GROCERY_ASSIST';
    return 'DEFAULT';
}

/** Formats structured benefit usage limits into a readable badge string */
function formatUsageLimit(limit: number, period: string): string {
    if (!limit || limit <= 0) return '';
    const p = (period || '').toUpperCase();
    const shortPeriod =
        p.includes('MONTH') ? 'mo' :
        p.includes('QUARTER') ? 'qtr' :
        p.includes('YEAR') ? 'yr' : p.toLowerCase();
    return `${limit} / ${shortPeriod}`;
}

// ─── Collapsible Section Header with Optional Fade Subtitle ─────────────────
function SectionHeader({
    superTitle,
    subtitle,
    rotatingSubtitles,
    accentColor,
    colors,
}: {
    superTitle: string;
    subtitle?: string;
    rotatingSubtitles?: string[];
    accentColor: string;
    colors: ThemeColors;
}) {
    const [titleIdx, setTitleIdx] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!rotatingSubtitles || rotatingSubtitles.length === 0) return;
        const cycle = () => {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
            ]).start();
            setTitleIdx(prev => (prev + 1) % rotatingSubtitles.length);
        };
        const interval = setInterval(cycle, 2800);
        return () => clearInterval(interval);
    }, [rotatingSubtitles, fadeAnim]);

    return (
        <View style={[sectionHeaderStyles.container, { borderLeftColor: accentColor }]}>
            <Text style={[sectionHeaderStyles.superTitle, { color: accentColor }]}>
                {superTitle}
            </Text>
            {rotatingSubtitles && rotatingSubtitles.length > 0 ? (
                <Animated.Text
                    style={[sectionHeaderStyles.mainTitle, { color: colors.textDark, opacity: fadeAnim }]}
                    numberOfLines={1}
                >
                    {rotatingSubtitles[titleIdx]}
                </Animated.Text>
            ) : (
                <Text style={[sectionHeaderStyles.mainTitle, { color: colors.textDark }]} numberOfLines={1}>
                    {subtitle}
                </Text>
            )}
        </View>
    );
}

const sectionHeaderStyles = StyleSheet.create({
    container: {
        paddingLeft: 12,
        borderLeftWidth: 3,
        marginBottom: 14,
        marginHorizontal: 24,
    },
    superTitle: {
        fontFamily: Fonts.medium,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 3,
    },
    mainTitle: {
        fontFamily: Fonts.bold,
        fontSize: 20,
    },
});

// ─── Global Billing Cycle Toggle ──────────────────────────────────────────────
function BillingToggle({
    activeCycle,
    onCycleChange,
    colors,
    dark,
}: {
    activeCycle: BillingCycle;
    onCycleChange: (c: BillingCycle) => void;
    colors: ThemeColors;
    dark: boolean;
}) {
    const { t } = useTranslation();
    const billingCyclesTrans = [
        { key: 'QUARTERLY' as BillingCycle, label: t('plans.quarterly'), suffix: t('plans.quarterly_suffix'), months: 3 },
        { key: 'BIANNUAL' as BillingCycle,  label: t('plans.biannually'), suffix: t('plans.biannually_suffix'), months: 6 },
        { key: 'YEARLY' as BillingCycle,    label: t('plans.yearly'), suffix: t('plans.yearly_suffix'), months: 12 },
    ];

    return (
        <View style={[billingStyles.row, { backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(4,131,87,0.06)' }]}>
            {billingCyclesTrans.map(cycle => {
                const isActive = cycle.key === activeCycle;
                return (
                    <TouchableOpacity
                        key={cycle.key}
                        style={[
                            billingStyles.tab,
                            isActive && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
                        ]}
                        onPress={() => onCycleChange(cycle.key)}
                        activeOpacity={0.75}
                    >
                        <Text style={[billingStyles.tabText, { color: isActive ? '#fff' : colors.textMuted }]}>
                            {cycle.label}
                        </Text>
                        {!isActive && (
                            <Text style={[billingStyles.tabSub, { color: colors.textLight }]}>
                                {cycle.suffix}
                            </Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const billingStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        marginHorizontal: 24,
        borderRadius: 14,
        padding: 4,
        marginBottom: 24,
        gap: 3,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 11,
        alignItems: 'center',
    },
    tabText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
    },
    tabSub: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        marginTop: 2,
    },
});

// ─── Plan Card ────────────────────────────────────────────────────────────────
interface PlanCardProps {
    plan: Plan;
    activeCycle: BillingCycle;
    onCycleChange: (cycle: BillingCycle) => void;
    activeSub: any | null;
    isInitiating: boolean;
    onChoose: (plan: Plan) => void;
    colors: ThemeColors;
    dark: boolean;
    planIndex: number;
    planType: 'CARE' | 'HOMEMAKER';
}

function PlanCard({ plan, activeCycle, onCycleChange, activeSub, isInitiating, onChoose, colors, dark, planIndex, planType }: PlanCardProps) {
    const { t } = useTranslation();
    const isOnDemand = plan.quarterlyPrice === 0;
    const price = getPriceForCycle(plan, activeCycle);
    const isActivePlan = activeSub?.planId === plan.id;
    const hasActiveSub = !!activeSub;
    const [expanded, setExpanded] = useState(false);

    // Gradient palette per index
    const gradients = [
        { bg: dark ? '#1A2332' : '#FAF7ED', accent: '#048357', headerBg: '#048357', badge: '#E6F4EE', badgeText: '#048357' },
        { bg: dark ? '#1C1E2C' : '#FAF7ED', accent: '#7C3AED', headerBg: '#7C3AED', badge: '#EDE9FE', badgeText: '#5B21B6' },
        { bg: dark ? '#1E1A2E' : '#FAF7ED', accent: '#EA580C', headerBg: '#EA580C', badge: '#FEF3C7', badgeText: '#92400E' },
    ];
    const palette = gradients[planIndex % gradients.length];

    const fallbackFeatures = (plan.benefits || '').split(',').map(f => f.trim()).filter(Boolean);
    const cycleInfo = BILLING_CYCLES.find(c => c.key === activeCycle)!;

    const btnLabel = isOnDemand
        ? t('plans.request_now')
        : isActivePlan
            ? t('plans.current_plan')
            : hasActiveSub && !isActivePlan
                ? t('plans.already_subscribed')
                : isInitiating
                    ? ''
                    : t('plans.subscribe_now');

    const btnDisabled = !isOnDemand && (isActivePlan || (hasActiveSub && !isActivePlan) || isInitiating);

    return (
        <View style={[planCardStyles.card, { width: CARD_WIDTH, backgroundColor: palette.bg, borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            {/* Card Header */}
            <View style={[planCardStyles.header, { backgroundColor: palette.headerBg, flexDirection: 'column' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={planCardStyles.planType}>
                            {isOnDemand ? 'ON DEMAND' : (planType === 'CARE' ? 'CARE PLAN' : 'HOME PLAN')}
                        </Text>
                        <Text style={planCardStyles.planName}>{plan.name}</Text>
                        {plan.description ? (
                            <Text style={planCardStyles.planDesc} numberOfLines={2}>{plan.description}</Text>
                        ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        {isOnDemand ? (
                            <Text style={{ fontFamily: Fonts.bold, fontSize: 20, color: '#FAF7ED', marginTop: 4 }}>
                                {t('plans.pay_per_trip')}
                            </Text>
                        ) : (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                                    <Text style={{ fontFamily: Fonts.bold, fontSize: 24, color: '#FAF7ED' }}>₹</Text>
                                    <Text style={{ fontFamily: Fonts.bold, fontSize: 28, color: '#FAF7ED' }}>
                                        {price > 0 ? price.toLocaleString('en-IN') : '—'}
                                    </Text>
                                </View>
                                <Text style={{ fontFamily: Fonts.regular, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
                                    {cycleInfo.months === 3 ? '90 days' : cycleInfo.months === 6 ? '180 days' : '365 days'}
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Duration Toggle on the card itself */}
                {!isOnDemand && (
                    <View style={{ flexDirection: 'row', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 3, gap: 4, width: '100%' }}>
                        {BILLING_CYCLES.map((cycle) => {
                            const isCycleActive = activeCycle === cycle.key;
                            return (
                                <TouchableOpacity
                                    key={cycle.key}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 6,
                                        borderRadius: 6,
                                        backgroundColor: isCycleActive ? '#FFFFFF' : 'transparent',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    onPress={() => onCycleChange(cycle.key)}
                                >
                                    <Text style={{
                                        fontFamily: Fonts.semiBold,
                                        fontSize: 10,
                                        color: isCycleActive ? palette.accent : '#FAF7ED',
                                    }}>
                                        {cycle.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {!isOnDemand && isActivePlan && (
                    <View style={[planCardStyles.activeBadge, { marginTop: 8, alignSelf: 'flex-start' }]}>
                        <Text style={planCardStyles.activeBadgeText}>{t('plans.active_plan_banner')}</Text>
                    </View>
                )}
            </View>

            {/* Features List */}
            <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 }}>
                {(() => {
                    const benefitsList = plan.planBenefits && plan.planBenefits.length > 0 
                        ? plan.planBenefits.slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                        : fallbackFeatures.map((f, i) => ({ id: `fallback-${i}`, title: f, benefitCode: getBenefitCodeFromFeatureText(f), usageLimit: null, usagePeriod: null }));
                    
                    const maxCollapsed = 4;
                    const hasExcess = benefitsList.length > maxCollapsed;
                    const visibleBenefits = expanded ? benefitsList : benefitsList.slice(0, maxCollapsed);

                    return (
                        <>
                            {visibleBenefits.map((benefit: any) => {
                                const badgeText = benefit.id.startsWith('fallback') ? null : formatUsageLimit(benefit.usageLimit, benefit.usagePeriod);
                                return (
                                    <View key={benefit.id} style={planCardStyles.featureRow}>
                                        <View style={[planCardStyles.featureIconBox, { backgroundColor: `${palette.accent}12` }]}>
                                            {renderBenefitSvg(benefit.benefitCode, 16, palette.accent)}
                                        </View>
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                            <Text style={[planCardStyles.featureText, { color: dark ? 'rgba(255,255,255,0.8)' : '#374151' }]}>
                                                {benefit.title}
                                            </Text>
                                            {badgeText ? (
                                                <View style={[planCardStyles.usageBadge, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <Text style={[planCardStyles.usageBadgeText, { color: dark ? 'rgba(255,255,255,0.6)' : '#6B7280' }]}>
                                                        {badgeText}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            })}
                            {benefitsList.length === 0 && (
                                <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: dark ? 'rgba(255,255,255,0.35)' : '#9CA3AF', textAlign: 'center', paddingVertical: 16 }}>
                                    Features listed in plan details
                                </Text>
                            )}
                            {hasExcess && (
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: 8,
                                        marginTop: 4,
                                        gap: 4,
                                    }}
                                    onPress={() => setExpanded(!expanded)}
                                >
                                    <Text style={{ fontFamily: Fonts.semiBold, fontSize: 12, color: palette.accent }}>
                                        {expanded ? 'Show Less' : `View More (+${benefitsList.length - maxCollapsed} features)`}
                                    </Text>
                                    <Ionicons
                                        name={expanded ? "chevron-up" : "chevron-down"}
                                        size={14}
                                        color={palette.accent}
                                    />
                                </TouchableOpacity>
                            )}
                        </>
                    );
                })()}
            </View>

            {/* Disclaimer for Homemaker plans */}
            {planType === 'HOMEMAKER' && (
                <View style={[planCardStyles.disclaimerBox, { backgroundColor: dark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
                    <Text style={[planCardStyles.disclaimerText, { color: dark ? 'rgba(255,255,255,0.5)' : '#6B7280' }]}>
                        {t('plans.home_disclaimer')}
                    </Text>
                </View>
            )}

            {/* CTA */}
            <TouchableOpacity
                style={[
                    planCardStyles.ctaBtn,
                    btnDisabled
                        ? [planCardStyles.ctaBtnDisabled, { backgroundColor: dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', borderColor: dark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]
                        : { backgroundColor: palette.accent },
                ]}
                activeOpacity={0.8}
                onPress={() => onChoose(plan)}
                disabled={btnDisabled}
            >
                {isInitiating ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={[
                        planCardStyles.ctaText,
                        { color: btnDisabled ? (dark ? 'rgba(255,255,255,0.35)' : '#9CA3AF') : '#FAF7ED' },
                    ]}>
                        {btnLabel}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const planCardStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        marginRight: CARD_MARGIN,
        marginBottom: 16,
        overflow: 'hidden',
        ...Shadow.card,
    },
    header: {
        padding: 18,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    planType: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    planName: {
        fontFamily: Fonts.bold,
        fontSize: 22,
        color: '#FAF7ED',
    },
    planDesc: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
        lineHeight: 17,
    },
    activeBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    activeBadgeText: {
        fontFamily: Fonts.bold,
        fontSize: 10,
        color: '#FAF7ED',
        letterSpacing: 0.5,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    priceRupee: {
        fontFamily: Fonts.bold,
        fontSize: 18,
    },
    priceAmount: {
        fontFamily: Fonts.bold,
        fontSize: 34,
    },
    pricePer: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        marginTop: 2,
    },
    durationPill: {
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    durationText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
    },
    featuresScroll: {
        maxHeight: 220,
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 4,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    featureIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    featureEmoji: {
        fontSize: 15,
    },
    featureText: {
        fontFamily: Fonts.medium,
        fontSize: 13,
        flex: 1,
        lineHeight: 19,
    },
    usageBadge: {
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    usageBadgeText: {
        fontFamily: Fonts.medium,
        fontSize: 10,
    },
    ctaBtn: {
        margin: 18,
        marginTop: 12,
        borderRadius: 14,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaBtnDisabled: {
        borderWidth: 1,
    },
    ctaText: {
        fontFamily: Fonts.semiBold,
        fontSize: 15,
    },
    disclaimerBox: {
        marginHorizontal: 18,
        marginTop: 6,
        padding: 10,
        borderRadius: 10,
    },
    disclaimerText: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        lineHeight: 14,
        textAlign: 'center',
    },
});



// ─── Carousel dot indicator ───────────────────────────────────────────────────
function DotIndicator({ count, active, color }: { count: number; active: number; color: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12, marginBottom: 4 }}>
            {Array.from({ length: count }).map((_, i) => (
                <View
                    key={i}
                    style={{
                        width: i === active ? 18 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: i === active ? color : `${color}40`,
                    }}
                />
            ))}
        </View>
    );
}

// ─── Active subscription mini-banner ─────────────────────────────────────────
function ActiveSubBanner({ sub, colors }: { sub: any; colors: ThemeColors }) {
    if (!sub) return null;
    const expiry = sub.expiryDate
        ? new Date(sub.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';
    return (
        <View style={[activeBannerStyles.banner, { backgroundColor: 'rgba(4,131,87,0.07)', borderColor: colors.primary }]}>
            <View style={[activeBannerStyles.iconBox, { backgroundColor: colors.primary }]}>
                <Ionicons name="shield-checkmark" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[activeBannerStyles.label, { color: colors.primary }]}>Your Active Plan</Text>
                <Text style={[activeBannerStyles.name, { color: '#1E1E1E' }]}>{sub.planName ?? 'Active'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[activeBannerStyles.expLabel, { color: '#9CA3AF' }]}>Expires</Text>
                <Text style={[activeBannerStyles.expDate, { color: '#374151' }]}>{expiry}</Text>
            </View>
        </View>
    );
}

const activeBannerStyles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderRadius: 14,
        marginHorizontal: 24,
        padding: 12,
        marginBottom: 14,
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: { fontFamily: Fonts.medium, fontSize: 11 },
    name: { fontFamily: Fonts.semiBold, fontSize: 14 },
    expLabel: { fontFamily: Fonts.regular, fontSize: 11 },
    expDate: { fontFamily: Fonts.semiBold, fontSize: 12 },
});

// ─── Plan Section ────────────────────────────────────────────────────────────
interface PlanSectionProps {
    planType: 'CARE' | 'HOMEMAKER';
    superTitle: string;
    titles: string[];
    accentColor: string;
    activeSub: any | null;
    activeCycle: BillingCycle;
    onCycleChange: (cycle: BillingCycle) => void;
    colors: ThemeColors;
    dark: boolean;
    onChoose: (plan: Plan) => void;
    initiating: string | null;
    router: any;
}

function PlanSection({
    planType, superTitle, titles, accentColor, activeSub, activeCycle, onCycleChange,
    colors, dark, onChoose, initiating, router
}: PlanSectionProps) {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIdx, setActiveIdx] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await planService.getPlansByType(planType);
                if (res.success && res.data) {
                    setPlans(res.data);
                }
            } catch { /* silent */ } finally {
                setLoading(false);
            }
        })();
    }, [planType]);

    const totalDots = plans.length;

    const onScrollEnd = useCallback((e: any) => {
        const offset = e.nativeEvent.contentOffset.x;
        const index = Math.round(offset / (CARD_WIDTH + CARD_MARGIN));
        setActiveIdx(Math.max(0, Math.min(index, totalDots - 1)));
    }, [totalDots]);

    return (
        <View style={{ marginBottom: 32 }}>
            <SectionHeader
                superTitle={superTitle}
                rotatingSubtitles={planType === 'CARE' ? titles : undefined}
                subtitle={planType === 'HOMEMAKER' ? 'Home Essential Plans' : undefined}
                accentColor={accentColor}
                colors={colors}
            />

            {/* Active subscription banner */}
            {activeSub && <ActiveSubBanner sub={activeSub} colors={colors} />}

            {/* Carousel */}
            {loading ? (
                <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            ) : plans.length === 0 ? (
                <View style={{ height: 120, justifyContent: 'center', alignItems: 'center', marginHorizontal: 24 }}>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                        No plans available at the moment.
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        ref={flatListRef}
                        data={plans}
                        keyExtractor={item => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CARD_WIDTH + CARD_MARGIN}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingLeft: 24, paddingRight: 12 }}
                        onMomentumScrollEnd={onScrollEnd}
                        renderItem={({ item, index }) => {
                            return (
                                <PlanCard
                                    plan={item}
                                    activeCycle={activeCycle}
                                    onCycleChange={onCycleChange}
                                    activeSub={activeSub}
                                    isInitiating={initiating === item.id}
                                    onChoose={onChoose}
                                    colors={colors}
                                    dark={dark}
                                    planIndex={index}
                                    planType={planType}
                                />
                            );
                        }}
                    />
                    {totalDots > 1 && (
                        <DotIndicator count={totalDots} active={activeIdx} color={accentColor} />
                    )}
                </>
            )}
        </View>
    );
}

// ─── Main Plans Screen ────────────────────────────────────────────────────────
export default function PlansScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const { benefits } = useAppConfig();
    const S = makeStyles(colors, isDarkMode);
    const { t } = useTranslation();

    const [userActiveSubscriptions, setUserActiveSubscriptions] = useState<any[]>([]);
    const [initiating, setInitiating] = useState<string | null>(null);
    const [activeCycle, setActiveCycle] = useState<BillingCycle>('QUARTERLY');
    const [terms, setTerms] = useState<{ content: string; title: string } | null>(null);
    const [termsExpanded, setTermsExpanded] = useState(false);
    const [policyExpanded, setPolicyExpanded] = useState(false);

    // Load active subscriptions on focus
    useFocusEffect(
        useCallback(() => {
            (async () => {
                try {
                    const res = await planService.checkActiveSubscription();
                    if (res.success && res.data) {
                        setUserActiveSubscriptions(res.data.subscriptions || []);
                    }
                } catch { /* silent */ }
            })();
        }, [])
    );

    // Fetch subscription Terms & Conditions
    useEffect(() => {
        (async () => {
            try {
                const res = await legalService.getSubscriptionTerms();
                if (res.success && res.data) {
                    setTerms(res.data);
                }
            } catch { /* silent */ }
        })();
    }, []);

    const careActiveSub = useMemo(
        () => userActiveSubscriptions.find(sub => sub.planType === 'CARE') ?? null,
        [userActiveSubscriptions]
    );
    const homemakerActiveSub = useMemo(
        () => userActiveSubscriptions.find(sub => sub.planType === 'HOMEMAKER') ?? null,
        [userActiveSubscriptions]
    );

    // Handle plan selection — check auth, dynamic cycle price, then initiate
    const handleChoosePlan = useCallback(async (plan: Plan) => {
        if (plan.quarterlyPrice === 0) {
            router.push('/trip-travels');
            return;
        }
        if (!profile) {
            Alert.alert(t('plans.login_required'), t('plans.login_required_desc'));
            return;
        }

        // Check if they already have an active sub for this category
        const activeSubForCategory = userActiveSubscriptions.find(sub => sub.planType === plan.planType);
        if (activeSubForCategory) {
            if ((plan.tierLevel ?? 0) < (activeSubForCategory.tierLevel ?? 0)) {
                Alert.alert(
                    t('plans.downgrade_blocked_title'),
                    t('plans.downgrade_blocked_msg'),
                    [{ text: 'OK' }]
                );
                return;
            }
            if (activeSubForCategory.planId === plan.id) {
                const expiry = new Date(activeSubForCategory.expiryDate).toLocaleDateString();
                Alert.alert(
                    t('plans.already_subscribed'),
                    t('plans.active_plan_desc', { planName: activeSubForCategory.planName ?? plan.name, expiry }),
                    [
                        { text: 'Go to Dashboard', onPress: () => router.push('/plans/membership-dashboard' as any) },
                        { text: 'OK', style: 'cancel' },
                    ]
                );
                return;
            }
        }

        const price = getPriceForCycle(plan, activeCycle);
        if (!price || price <= 0) {
            Alert.alert(t('plans.unavailable'), t('plans.unavailable_desc'));
            return;
        }

        setInitiating(plan.id);
        try {
            const subRes = await planService.initiateSubscription({
                planId: plan.id,
                billingCycle: activeCycle,
                amount: price,
            });

            if (!subRes.success || !subRes.data) {
                Alert.alert(t('plans.error'), subRes.message ?? t('plans.subscribe_error'));
                return;
            }

            const cycleLabel = activeCycle === 'QUARTERLY' ? t('plans.quarterly') : activeCycle === 'BIANNUAL' ? t('plans.biannually') : t('plans.yearly');

            router.push({
                pathname: '/payment/checkout',
                params: {
                    subscriptionId: subRes.data.id,
                    amount: String(price),
                    label: `${plan.name} — ${cycleLabel}`,
                    userName: profile.name ?? '',
                    phone: profile.phone ?? '',
                    email: profile.email ?? '',
                    refreshProfileOnSuccess: '1',
                },
            });
        } catch (e: any) {
            Alert.alert(t('plans.error'), e?.message || t('plans.initiate_error'));
        } finally {
            setInitiating(null);
        }
    }, [profile, userActiveSubscriptions, activeCycle, router, t]);

    const CARE_ROTATING_SUBTITLES = [
        t('plans.care_subtitle_1'),
        t('plans.care_subtitle_2'),
        t('plans.care_subtitle_3'),
    ];
    const HOME_TITLES = [t('plans.home_title')];

    return (
        <View style={S.screen}>
            <View style={{ backgroundColor: colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={S.header}>
                <TouchableOpacity style={S.backBtn} onPress={() => router.replace('/(tabs)')}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={S.headerTitle}>{t('plans.tab_title')}</Text>
                    <Text style={S.headerSub}>{t('plans.value_plans_subtitle')}</Text>
                </View>
                <TouchableOpacity style={S.backBtn} onPress={() => router.push('/plans/membership-dashboard' as any)}>
                    <Ionicons name="card-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={S.scroll}
                showsVerticalScrollIndicator={false}
            >


                {/* ─── Section 1: Ayuxa Care Plans ─── */}
                <PlanSection
                    planType="CARE"
                    superTitle={t('plans.care_super_title')}
                    titles={CARE_ROTATING_SUBTITLES}
                    accentColor="#048357"
                    activeSub={careActiveSub}
                    activeCycle={activeCycle}
                    onCycleChange={setActiveCycle}
                    colors={colors}
                    dark={isDarkMode}
                    onChoose={handleChoosePlan}
                    initiating={initiating}
                    router={router}
                />

                {/* Collapsible Plan Usage Policy Notice */}
                <View style={[S.policyContainer, { backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
                    <TouchableOpacity
                        style={S.policyHeader}
                        onPress={() => setPolicyExpanded(!policyExpanded)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                            <Text style={[S.policyTitle, { color: colors.textDark }]}>{t('plans.plan_usage_policy')}</Text>
                        </View>
                        <Ionicons
                            name={policyExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textMuted}
                        />
                    </TouchableOpacity>
                    {policyExpanded && (
                        <View style={[S.policyContentBox, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
                            <Text style={[S.policyContentText, { color: colors.textMuted }]}>
                                {t('plans.policy_content')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Divider */}
                <View style={S.sectionDivider}>
                    <View style={[S.dividerLine, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]} />
                    <Text style={[S.dividerText, { color: isDarkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }]}>
                        &amp;
                    </Text>
                    <View style={[S.dividerLine, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]} />
                </View>

                {/* ─── Section 2: Home Essential Plans ─── */}
                <PlanSection
                    planType="HOMEMAKER"
                    superTitle={t('plans.home_super_title')}
                    titles={HOME_TITLES}
                    accentColor="#6366F1"
                    activeSub={homemakerActiveSub}
                    activeCycle={activeCycle}
                    onCycleChange={setActiveCycle}
                    colors={colors}
                    dark={isDarkMode}
                    onChoose={handleChoosePlan}
                    initiating={initiating}
                    router={router}
                />

                {/* ─── Why Subscribe ─── */}
                {benefits && benefits.length > 0 && (
                    <>
                        <Text style={[S.whyTitle, { color: colors.textDark }]}>{t('plans.why_ayuxa')}</Text>
                        <View style={[S.whyCard, { backgroundColor: isDarkMode ? '#1A2332' : '#FAF7ED', borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
                            {benefits.map((benefit: any) => (
                                <View key={benefit.id} style={S.whyRow}>
                                    <View style={[S.whyIconBox, { backgroundColor: 'rgba(4,131,87,0.08)' }]}>
                                        <Text style={{ fontSize: 18 }}>
                                            {benefit.icon_key?.includes('heart') ? '💚' :
                                             benefit.icon_key?.includes('shield') ? '🛡️' :
                                             benefit.icon_key?.includes('star') ? '⭐' :
                                             benefit.icon_key?.includes('home') ? '🏠' : '✅'}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[S.whyBenTitle, { color: colors.textDark }]}>{getText(benefit.title)}</Text>
                                        <Text style={[S.whyBenDesc, { color: colors.textMuted }]}>{getText(benefit.description)}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* Membership Dashboard Link */}
                <TouchableOpacity
                    style={[S.dashLink, { backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}
                    onPress={() => router.push('/plans/membership-dashboard' as any)}
                    activeOpacity={0.8}
                >
                    <View style={[S.dashLinkIcon, { backgroundColor: 'rgba(4,131,87,0.1)' }]}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[S.dashLinkTitle, { color: colors.textDark }]}>{t('plans.my_memberships')}</Text>
                        <Text style={[S.dashLinkSub, { color: colors.textMuted }]}>{t('plans.manage_plans')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Collapsible Subscription Terms & Conditions */}
                {terms && (
                    <View style={[S.termsContainer, { backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
                        <TouchableOpacity
                            style={S.termsHeader}
                            onPress={() => setTermsExpanded(!termsExpanded)}
                            activeOpacity={0.7}
                        >
                            <Text style={[S.termsTitle, { color: colors.textDark }]}>{terms.title || t('plans.terms_conditions_title')}</Text>
                            <Ionicons
                                name={termsExpanded ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={colors.textMuted}
                            />
                        </TouchableOpacity>
                        {termsExpanded && (
                            <View style={[S.termsContentBox, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
                                <Text style={[S.termsContentText, { color: colors.textMuted }]}>{terms.content}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (colors: ThemeColors, dark: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: dark ? '#0F172A' : '#F5F0E1',
    },
    header: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 18,
        paddingTop: 10,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: '#FAF7ED',
    },
    headerSub: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    scroll: {
        paddingTop: 24,
        paddingBottom: 140,
    },
    sectionDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        marginBottom: 28,
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontFamily: Fonts.bold,
        fontSize: 18,
    },
    whyTitle: {
        fontFamily: Fonts.bold,
        fontSize: 20,
        marginHorizontal: 24,
        marginBottom: 14,
    },
    whyCard: {
        marginHorizontal: 24,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        marginBottom: 20,
        ...Shadow.card,
    },
    whyRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    whyIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    whyBenTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        marginBottom: 3,
    },
    whyBenDesc: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        lineHeight: 18,
    },
    dashLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 24,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        ...Shadow.card,
    },
    dashLinkIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dashLinkTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 15,
    },
    dashLinkSub: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        marginTop: 2,
    },
    termsContainer: {
        marginHorizontal: 24,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        ...Shadow.card,
    },
    termsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    termsTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
    },
    termsContentBox: {
        padding: 16,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    termsContentText: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        lineHeight: 18,
    },
    policyContainer: {
        marginHorizontal: 24,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 20,
        ...Shadow.card,
    },
    policyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    policyTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
    },
    policyContentBox: {
        padding: 14,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    policyContentText: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        lineHeight: 18,
    },
});

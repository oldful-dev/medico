// Plans Screen — Server-Driven UI
// Plan cards, pricing, features and benefits come from AppConfigContext.
// Admin can update plan names, prices, features, and CTA without an app release.
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAppConfig } from '@/context/AppConfigContext';
import { getIcon } from '@/components/sdui/SDUIRenderer';
import { PlanConfig } from '@/services/api/appConfigService';
import { useTranslation } from 'react-i18next';

// ─── Static Layout Assets ─────────────────────────────────────────────────────
const imgHeartOutline = require('@/assets/images/37d35bff48c57182eb08ca96ee07ef22d24fd2db.png');

export default function PlansScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { plansBanner, plans, benefits } = useAppConfig();

    // Track active duration tab per plan (keyed by plan id)
    const [activeDuration, setActiveDuration] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        plans.forEach(p => { initial[p.id] = p.active_duration_label; });
        return initial;
    });

    const getActivePrice = (plan: PlanConfig): { price: string; suffix: string } => {
        const label = activeDuration[plan.id] ?? plan.active_duration_label;
        const dur = plan.durations.find(d => d.label === label) ?? plan.durations[plan.durations.length - 1];
        return { price: dur.price, suffix: dur.suffix };
    };

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <View style={styles.backButtonPlaceholder}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </View>
                <Text style={styles.headerTitle}>{t('plans.tab_title')}</Text>
                <View style={{ width: 40 }} />
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

                {/* ─── Plans Horizontal Scroll (SDUI cards) ─── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.plansScrollContainer}
                >
                    {plans.map(plan => {
                        const { price, suffix } = getActivePrice(plan);
                        const currentDuration = activeDuration[plan.id] ?? plan.active_duration_label;
                        return (
                            <View key={plan.id} style={styles.planCard}>
                                <Text style={[styles.planCardTitle, { color: plan.accent_color }]}>
                                    {plan.name}
                                </Text>

                                {/* Duration Tabs */}
                                <View style={[styles.planCardDurationTabs, { backgroundColor: plan.tab_bg }]}>
                                    {plan.durations.map(dur => {
                                        const isActive = dur.label === currentDuration;
                                        return isActive ? (
                                            <View
                                                key={dur.label}
                                                style={[styles.durationTabActive, { backgroundColor: plan.tab_active_bg }]}
                                            >
                                                <Text style={[styles.durationTabTextActive, { color: plan.tab_text_color }]}>
                                                    {dur.label}
                                                </Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                key={dur.label}
                                                onPress={() => setActiveDuration(prev => ({ ...prev, [plan.id]: dur.label }))}
                                            >
                                                <Text style={[styles.durationTabInactive, { color: plan.accent_color }]}>
                                                    {dur.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Price */}
                                <View style={styles.priceContainer}>
                                    <View style={[styles.priceBackground, { backgroundColor: plan.price_bg_color }]} />
                                    <Text style={styles.priceText}>
                                        {price}{' '}
                                        <Text style={styles.priceSuffix}>{suffix}</Text>
                                    </Text>
                                </View>

                                {/* Features */}
                                <View style={styles.planFeatures}>
                                    {plan.features.map((feature, i) => (
                                        <View key={i} style={styles.featureItem}>
                                            <Ionicons name="checkmark-outline" size={14} color={plan.accent_color} style={styles.featureCheck} />
                                            <Text style={[styles.featureText, { color: Colors.textBody }]}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* CTA Button */}
                                <TouchableOpacity
                                    style={[styles.planActionButton, { backgroundColor: plan.cta_color }]}
                                    activeOpacity={0.8}
                                    onPress={() => router.push(plan.cta_route as any)}
                                >
                                    <Text style={styles.planActionText}>{plan.cta_text}</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>

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
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg, paddingBottom: 25, paddingTop: 10,
    },
    backButtonPlaceholder: { padding: 5, opacity: 0 },
    headerTitle: {
        flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSize.heading2,
        color: Colors.textWhite, textAlign: 'center', letterSpacing: -0.24,
    },
    scrollContent: { paddingBottom: 110 },

    valuePlanBanner: {
        backgroundColor: 'rgba(128, 249, 231, 0.38)', borderWidth: 1, borderColor: '#80F9E7',
        borderRadius: Radius.md, marginHorizontal: Spacing.lg,
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, paddingHorizontal: 12, marginTop: 15, marginBottom: 20,
    },
    heartPulseIcon:     { width: 65, height: 48, marginRight: 10 },
    bannerTextContainer:{ flex: 1, justifyContent: 'center' },
    bannerTitle:        { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textDark },
    bannerSubtitle:     { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: Colors.textBody, marginTop: 2 },

    plansScrollContainer: { paddingHorizontal: Spacing.lg, paddingBottom: 25, gap: Spacing.lg },
    planCard: {
        backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
        width: 205, padding: Spacing.lg, ...Shadow.card,
    },
    planCardTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, marginBottom: Spacing.sm },

    planCardDurationTabs: {
        flexDirection: 'row', borderRadius: 8, padding: 3,
        marginBottom: 10, justifyContent: 'space-between', alignItems: 'center',
    },
    durationTabInactive: { fontFamily: Fonts.medium, fontSize: FontSize.caption, paddingHorizontal: 4 },
    durationTabActive: { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
    durationTabTextActive: { fontFamily: Fonts.medium, fontSize: FontSize.caption },

    priceContainer: {
        height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'flex-start',
        paddingHorizontal: Spacing.sm, marginBottom: Spacing.md, overflow: 'hidden',
    },
    priceBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    priceText:   { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, color: Colors.textWhite },
    priceSuffix: { fontFamily: Fonts.regular, fontWeight: 'normal' },

    planFeatures: { marginBottom: 15 },
    featureItem:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    featureCheck: { marginRight: 6, marginTop: 2 },
    featureText:  { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, flex: 1, lineHeight: 14 },

    planActionButton: { borderRadius: 6, height: 25, justifyContent: 'center', alignItems: 'center', marginTop: 'auto' },
    planActionText: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: Colors.textWhite },

    sectionTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading1,
        color: Colors.textDark, paddingHorizontal: 18, marginBottom: Spacing.lg,
    },
    whySubscribeContainer: {
        backgroundColor: Colors.bgCard, borderRadius: Radius.xl * 2,
        marginHorizontal: Spacing.lg, padding: Spacing.xl, ...Shadow.card,
    },
    benefitRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
    benefitIconBox:   { width: 35, height: 35, alignItems: 'center', marginRight: 10 },
    benefitIcon:      { width: 25, height: 25 },
    benefitTextGroup: { flex: 1, justifyContent: 'center' },
    benefitTitle:     { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textBody, marginBottom: 4 },
    benefitDesc:      { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: Colors.textMuted, lineHeight: 18 },
});

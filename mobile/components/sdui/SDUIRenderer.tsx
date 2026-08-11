// ──────────────────────────────────────────────
//  SDUI Renderer — Icon Registry + Section Components
//
//  React Native requires static require() calls for local images —
//  they cannot be dynamic. This registry maps icon_key strings from
//  the SDUI config to pre-bundled local assets, satisfying Metro's
//  static analysis requirement while keeping the data-layer dynamic.
//
//  Usage:
//    import { ICON_REGISTRY, getIcon } from '@/components/sdui/SDUIRenderer';
//    <Image source={getIcon('svc_doctor_visit')} />
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { HomeSection, SectionItem } from '@/services/api/appConfigService';
import { getText } from '@/i18n/utils/getText';
import { useTranslation } from 'react-i18next';

// ─── Icon Registry ───────────────────────────────────────────────────────────
// Maps every icon_key used in the SDUI JSON to a static local asset.
// Add new keys here when new services are added to the config.

export const ICON_REGISTRY: Record<string, ImageSourcePropType> = {
    // Quick service strip
    quick_doctor: require('@/assets/images/98e939543c86f26f5f26210bb160eb927b5ff057.png'),
    quick_nursing: require('@/assets/images/21e5a8a8650cf8eda36be3744c70099580173129.png'),
    quick_caregiver: require('@/assets/images/2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png'),
    quick_emergency: require('@/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png'),

    // ayuxacare services grid
    svc_doctor_visit: require('@/assets/images/32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png'),
    svc_homing_nursing: require('@/assets/images/afd8e2afab202de7ddce09bf8add378c861b9347.png'),
    svc_blood_test: require('@/assets/images/f74321d18a86a9e77628058ed35a50d284752eb2.png'),
    svc_fitness: require('@/assets/images/54f5c849cf75e776592dec8236f221da3694ca53.png'),
    svc_equipment: require('@/assets/images/d3906f517597b2ef10369d92c422b16bf20e879e.png'),
    svc_medicines: require('@/assets/images/79c15725f6f1a73658b615886f1289634cef9408.png'),
    svc_meal: require('@/assets/images/8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png'),
    svc_physio: require('@/assets/images/4ea419052803769fad63ff4292316ce7f8f77dbc.png'),
    svc_hospital_trip: require('@/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png'),
    svc_insurance: require('@/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png'),

    // Trust badges
    badge_support: require('@/assets/images/cea3b8dc2ce488942e83a8a4cd0dbe1e6173764b.png'),
    badge_caregivers: require('@/assets/images/4dcdffbd537a1de53d947d7f0c7c548318bc85a7.png'),
    badge_family: require('@/assets/images/f90ea6c9d084318475183b0a2f11175f0f34640e.png'),

    // SOS banner
    sos_icon: require('@/assets/images/5eedb2a89f68f0fea90ef304401e7d38d0fc1790.png'),
    sos_illustration: require('@/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png'),

    // Home essentials grid
    ess_ac_repair: require('@/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png'),
    ess_plumbing: require('@/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png'),
    ess_cleaning: require('@/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png'),
    ess_driver: require('@/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png'),
    ess_bills: require('@/assets/images/056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png'),
    ess_bank: require('@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png'),
    ess_grocery: require('@/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png'),
    ess_anything: require('@/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png'),

    // Plans benefits
    benefit_money_bag: require('@/assets/images/26948a93a4bbaa57b96ff130f4425886b3c5d292.png'),
    benefit_checkmark: require('@/assets/images/019640d27de157c119b045c46aae6a6559dd3a79.png'),
    benefit_family: require('@/assets/images/26945e6abc1b678cf3cb29a1a66c0cf290cc7cfd.png'),

    // Doctor visit — problem icons
    prob_fever: require('@/assets/images/85703338762dce300aaacb9a05f302adc3d527f4.png'),
    prob_bp_sugar: require('@/assets/images/a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png'),
    prob_general_weakness: require('@/assets/images/a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png'),
    prob_body_pain: require('@/assets/images/3a3fbbfc074010919d54378e2349e7a3ecdea262.png'),
    prob_post_surgery: require('@/assets/images/cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png'),
    prob_stroke: require('@/assets/images/9c25016906e38b6b999adf0f9fb6cb2adb589322.png'),
    prob_frozen_shoulder: require('@/assets/images/05879295a9b69201cfab443f22bf9218402f1522.png'),
    prob_other: require('@/assets/images/34a78d011624199a5541b871a68bb218b41e5aba.png'),

    // Doctor visit — doctor type icons
    doc_gp: require('@/assets/images/9bbd0539ddfd504d8362c951cb07d107b0df9fdf.png'),
    doc_physio: require('@/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png'),
};

/** Returns the local asset for a given icon_key, or undefined if not found. */
export const getIcon = (key: string): ImageSourcePropType | undefined =>
    ICON_REGISTRY[key];

/** Resolves an item's image: prefers image_url (remote), falls back to icon_key (local). */
const resolveImage = (item: { image_url?: string; icon_key?: string }): ImageSourcePropType | undefined =>
    item.image_url ? { uri: item.image_url } : (item.icon_key ? getIcon(item.icon_key) : undefined);

// ─── Translation & Dynamic Mapping Helpers ────────────────────────────────────

function translateSectionTitle(title: string | undefined, t: any): string {
  if (!title) return '';
  const clean = title.toLowerCase().trim();
  if (clean.includes('ayuxa') || clean.includes('services')) {
    return t('home.view_all_services', 'Ayuxa Services');
  }
  if (clean.includes('essential')) {
    return t('home.home_essentials', 'Home Essentials');
  }
  return title;
}

function translateSDUIItem(label: string, route: string | undefined, t: any): string {
  if (!route) return label;
  const cleanRoute = route.toLowerCase().trim();
  
  let key = '';
  if (cleanRoute.includes('physio-fitness')) key = 'physio_fitness';
  else if (cleanRoute.includes('meal-service') || cleanRoute.includes('tiffin')) key = 'meal_service';
  else if (cleanRoute.includes('medical-equipment') || cleanRoute.includes('equipment')) key = 'medical_equipment';
  else if (cleanRoute.includes('insurance')) key = 'insurance';
  else if (cleanRoute.includes('tech-helper')) key = 'tech_helper';
  else if (cleanRoute.includes('doctor-visit')) key = 'doctor_visit';
  else if (cleanRoute.includes('nurse-care')) key = 'nurse_care';
  else if (cleanRoute.includes('caregiver-support')) key = 'caregiver_support';
  else if (cleanRoute.includes('hospital-trip')) key = 'hospital_trip';
  else if (cleanRoute.includes('blood-test')) key = 'blood_test';
  else if (cleanRoute.includes('order-medicines')) key = 'order_medicines';
  else if (cleanRoute.includes('appliance-repair')) key = 'appliance_repair';
  else if (cleanRoute.includes('plumbing-electrical')) key = 'plumbing_electrical';
  else if (cleanRoute.includes('deep-cleaning')) key = 'deep_cleaning';
  else if (cleanRoute.includes('driving-cab')) key = 'driving_cab';
  else if (cleanRoute.includes('bill-payment')) key = 'bill_payment';
  else if (cleanRoute.includes('bank-paperwork')) key = 'bank_paperwork';
  else if (cleanRoute.includes('grocery-run')) key = 'grocery_run';
  else if (cleanRoute.includes('anything-else')) key = 'anything_else';
  else if (cleanRoute.includes('paper-legal')) key = 'paper_legal';
  else if (cleanRoute.includes('trip-travels')) key = 'trip_travels';
  else if (cleanRoute.includes('smart-upgrade')) key = 'smart_upgrade';
  
  if (key) {
    const translated = t('services.' + key);
    if (translated && translated !== 'services.' + key) {
      return translated;
    }
  }
  
  return label;
}

// ─── Section Renderer ─────────────────────────────────────────────────────────
// Renders a single home section based on its `type` field.

interface SectionRendererProps {
    section: HomeSection;
    itemWidth: number;       // pre-calculated pixel width for service grid items
    itemHeight: number;      // pre-calculated pixel height for service grid items
    imageHeight: number;     // pre-calculated image height inside service grid
    essentialItemWidth: number;
    essentialItemHeight: number;
}

export function SectionRenderer({
    section,
    itemWidth,
    itemHeight,
    imageHeight,
    essentialItemWidth,
    essentialItemHeight,
}: SectionRendererProps) {
    const router = useRouter();
    const { t } = useTranslation();

    if (!section.visible) return null;

    const visibleItems = (section.items ?? [])
        .filter(i => i.visible)
        .sort((a, b) => a.sort_order - b.sort_order);

    const translateSOSText = (text: string) => {
        if (text === 'Need Immediate') return t('sos.need_medical', 'Need Immediate');
        if (text === 'Medical Support?') return t('sos.medical_support', 'Medical Support?');
        if (text === 'Click here') return t('sos.click_here', 'Click here');
        return text;
    };

    switch (section.type) {
        case 'quick_services':
            return (
                <View style={styles.quickServiceCard}>
                    {visibleItems.map(item => {
                        const translatedLabel = translateSDUIItem(item.label, item.route, t);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.quickServiceBox}
                                onPress={() => item.route && router.push(item.route as any)}
                            >
                                <Image
                                    source={resolveImage(item)}
                                    style={styles.quickServiceIcon}
                                    resizeMode="contain"
                                />
                                {translatedLabel.split('\n').map((line, i) => (
                                    <Text key={i} style={styles.quickServiceLabel}>{line}</Text>
                                ))}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );

        case 'service_grid': {
            const maxItems = section.config?.max_items ?? 6;
            const displayItems = visibleItems.slice(0, maxItems);
            return (
                <View style={styles.servicesCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{translateSectionTitle(section.title, t)}</Text>
                        {section.view_all_route && (
                            <TouchableOpacity onPress={() => router.push(section.view_all_route as any)}>
                                <Text style={styles.viewAllText}>{t('common.view_all')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.serviceGrid}>
                        {displayItems.map(item => {
                            const translatedLabel = translateSDUIItem(item.label, item.route, t);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.serviceGridItem, { width: itemWidth, height: itemHeight }]}
                                    onPress={() => item.route && router.push(item.route as any)}
                                >
                                    <Image
                                        source={resolveImage(item)}
                                        style={[styles.serviceGridImage, { width: itemWidth, height: imageHeight }]}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.serviceGridLabelContainer}>
                                        {translatedLabel.split('\n').map((line, i) => (
                                            <Text key={i} style={styles.serviceGridLabel}>{line}</Text>
                                        ))}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        {Array.from({ length: (3 - (displayItems.length % 3)) % 3 }).map((_, idx) => (
                            <View key={`dummy-${idx}`} style={{ width: itemWidth, height: 0 }} />
                        ))}
                    </View>
                </View>
            );
        }

        case 'trust_badges':
            return (
                <View style={styles.trustCard}>
                    {visibleItems.map((badge, i) => (
                        <React.Fragment key={badge.id}>
                            <View style={styles.trustItem}>
                                <Image source={resolveImage(badge)} style={styles.trustIcon} resizeMode="contain" />
                                <Text style={styles.trustLabel}>{badge.label}</Text>
                            </View>
                            {i < visibleItems.length - 1 && <View style={styles.trustDivider} />}
                        </React.Fragment>
                    ))}
                </View>
            );

        case 'sos_banner': {
            const cfg = section.config ?? {};
            return (
                <View style={styles.sosBanner}>
                    <View style={styles.sosContent}>
                        <Image source={cfg.icon_url ? { uri: cfg.icon_url } : getIcon('sos_icon')} style={styles.sosIcon} resizeMode="contain" />
                        <View style={styles.sosTextGroup}>
                            {cfg.title_line1 && <Text style={styles.sosTitle}>{translateSOSText(cfg.title_line1)}</Text>}
                            {cfg.title_line2 && <Text style={styles.sosTitle}>{translateSOSText(cfg.title_line2)}</Text>}
                            <TouchableOpacity
                                style={styles.sosButton}
                                onPress={() => cfg.cta_route && router.push(cfg.cta_route as any)}
                            >
                                <Text style={styles.sosButtonText}>{translateSOSText(cfg.cta_text ?? 'Click here')}</Text>
                                <Ionicons name="arrow-forward" size={10} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Image source={cfg.illustration_url ? { uri: cfg.illustration_url } : getIcon('sos_illustration')} style={styles.sosIllustration} resizeMode="contain" />
                </View>
            );
        }

        case 'essentials_grid': {
            return (
                <EssentialsGrid
                    section={section}
                    visibleItems={visibleItems}
                    essentialItemWidth={essentialItemWidth}
                    essentialItemHeight={essentialItemHeight}
                    router={router}
                />
            );
        }

        default:
            return null;
    }
}

// ─── Essentials Grid (with View More) ────────────────────────────────────────

function EssentialsGrid({
    section,
    visibleItems,
    essentialItemWidth,
    essentialItemHeight,
    router,
}: {
    section: HomeSection;
    visibleItems: SectionItem[];
    essentialItemWidth: number;
    essentialItemHeight: number;
    router: ReturnType<typeof useRouter>;
}) {
    const { t } = useTranslation();
    const columns = section.config?.columns ?? 4;
    const maxVisibleRows = section.config?.max_visible_rows ?? 0; // 0 = show all
    const [expanded, setExpanded] = useState(false);

    // Split items into rows
    const allRows: any[][] = [];
    for (let i = 0; i < visibleItems.length; i += columns) {
        const row = visibleItems.slice(i, i + columns);
        while (row.length < columns) {
            row.push({ isDummy: true, id: `dummy-${row.length}` } as any);
        }
        allRows.push(row);
    }

    const shouldCollapse = maxVisibleRows > 0 && allRows.length > maxVisibleRows;
    const displayRows = shouldCollapse && !expanded
        ? allRows.slice(0, maxVisibleRows)
        : allRows;

    return (
        <View style={styles.essentialsCard}>
            <View style={styles.sectionHeader}>
                <Text style={styles.essentialsTitle}>{translateSectionTitle(section.title, t)}</Text>
                {section.view_all_route && (
                    <TouchableOpacity onPress={() => router.push(section.view_all_route as any)}>
                        <Text style={styles.viewAllSmall}>{t('common.view_all')}</Text>
                    </TouchableOpacity>
                )}
            </View>
            {displayRows.map((row, ri) => (
                <View key={ri} style={styles.essentialsRow}>
                    {row.map(item => {
                        if (item.isDummy) {
                            return <View key={item.id} style={{ width: essentialItemWidth, height: 0 }} />;
                        }
                        const translatedLabel = translateSDUIItem(item.label, item.route, t);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.essentialItem, { width: essentialItemWidth, height: essentialItemHeight }]}
                                onPress={() => item.route && router.push(item.route as any)}
                            >
                                <View style={styles.essentialIconCircle}>
                                    <Image source={resolveImage(item)} style={styles.essentialIcon} resizeMode="contain" />
                                </View>
                                {translatedLabel.split('\n').map((line, i) => (
                                    <Text key={i} style={styles.essentialLabel}>{line}</Text>
                                ))}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
            {shouldCollapse && (
                <TouchableOpacity style={styles.viewMoreButton} onPress={() => setExpanded(prev => !prev)}>
                    <Text style={styles.viewMoreText}>{expanded ? t('common.view_less', 'View Less') : t('common.view_more', 'View More')}</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primary} />
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// These mirror the styles in index.tsx exactly — the renderer uses the same
// design tokens so visual output is identical to the old hardcoded version.

const styles = StyleSheet.create({
    // Quick services
    quickServiceCard: {
        marginHorizontal: Spacing.cardMargin, marginTop: Spacing.sectionGap,
        backgroundColor: Colors.bgCard, borderRadius: Radius.xl,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, ...Shadow.card,
    },
    quickServiceBox: {
        flex: 1, minHeight: 85, alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.bgCardMuted, borderRadius: Radius.lg,
        paddingVertical: Spacing.sm, marginHorizontal: Spacing.xs,
    },
    quickServiceIcon: { width: 44, height: 44, marginBottom: Spacing.xs },
    quickServiceLabel: {
        fontFamily: Fonts.medium, fontSize: FontSize.caption,
        color: Colors.primaryText, textAlign: 'center', lineHeight: 12,
    },

    // Service grid
    servicesCard: {
        marginHorizontal: Spacing.cardMargin, marginTop: Spacing.sectionGap,
        backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadow.card,
    },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg,
    },
    sectionTitle: { fontFamily: Fonts.bold, fontSize: FontSize.heading2, color: Colors.primaryDeep },
    viewAllText: { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, color: Colors.textLight },
    serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    serviceGridItem: {
        marginBottom: Spacing.md, borderRadius: Radius.md,
        backgroundColor: Colors.bgCardMuted, overflow: 'hidden', alignItems: 'center',
    },
    serviceGridImage: { borderTopLeftRadius: Radius.md, borderTopRightRadius: Radius.md },
    serviceGridLabelContainer: {
        flex: 1, width: '100%', paddingHorizontal: Spacing.xs, alignItems: 'center', justifyContent: 'center',
    },
    serviceGridLabel: {
        fontFamily: Fonts.medium, fontSize: FontSize.bodySmall,
        color: Colors.primaryText, textAlign: 'center', lineHeight: 14,
    },

    // Trust badges
    trustCard: {
        marginHorizontal: Spacing.cardMargin, marginTop: Spacing.sectionGap,
        backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
        flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, ...Shadow.card,
    },
    trustItem: { flex: 1, alignItems: 'center' },
    trustIcon: { width: 44, height: 44, marginBottom: Spacing.sm },
    trustLabel: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: Colors.primaryText, textAlign: 'center' },
    trustDivider: { width: 1, height: '70%', backgroundColor: Colors.textLight, opacity: 0.3 },

    // SOS banner
    sosBanner: {
        marginHorizontal: Spacing.cardMargin, marginTop: Spacing.sectionGap,
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.primaryDark,
        borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
    },
    sosContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    sosIcon: { width: 44, height: 44 },
    sosTextGroup: { gap: 2 },
    sosTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, color: Colors.textDark },
    sosButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
        borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 6,
        gap: Spacing.xs, marginTop: 6, alignSelf: 'flex-start',
    },
    sosButtonText: { fontFamily: Fonts.semiBold, fontSize: FontSize.caption, color: Colors.textWhite },
    sosIllustration: { width: 60, height: 60 },

    // Essentials grid
    essentialsCard: {
        marginHorizontal: Spacing.cardMargin, marginTop: Spacing.sectionGap,
        backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadow.card,
    },
    essentialsTitle: { fontFamily: Fonts.bold, fontSize: FontSize.heading3, color: Colors.primaryDeep },
    viewAllSmall: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: Colors.textLight },
    essentialsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
    essentialItem: {
        borderWidth: 1, borderColor: Colors.accent, borderRadius: Radius.sm,
        alignItems: 'center', justifyContent: 'center', paddingVertical: 6,
    },
    essentialIconCircle: {
        width: '60%', aspectRatio: 1, borderRadius: Radius.full, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
    },
    essentialIcon: { width: '80%', height: '80%' },
    essentialLabel: {
        fontFamily: Fonts.medium, fontSize: FontSize.caption,
        color: Colors.textMuted, textAlign: 'center', lineHeight: 12,
    },

    // View More / View Less
    viewMoreButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: Spacing.sm, marginTop: 4, gap: 4,
    },
    viewMoreText: {
        fontFamily: Fonts.medium, fontSize: FontSize.bodySmall,
        color: Colors.primary,
    },
});

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { labService } from '@/services/api/labService';
import type { LabPackage } from '@/services/api/labService';
import { BloodTestDetailModal } from './detail-modal';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';

const CATEGORIES = ['All', 'Popular', 'Health Checks', 'Wellness'];

const getTestIcon = (name: string): { lib: 'ion' | 'mci'; icon: string; color: string; bg: string } => {
    const n = name.toLowerCase();
    if (n.includes('urine'))                               return { lib: 'mci', icon: 'test-tube',     color: '#8B5CF6', bg: '#F3EFFE' };
    if (n.includes('iron'))                                return { lib: 'mci', icon: 'flask',         color: '#14B8A6', bg: '#EFFCFA' };
    if (n.includes('full body') || n.includes('checkup')) return { lib: 'ion', icon: 'fitness',       color: '#F43F5E', bg: '#FFF0F3' };
    if (n.includes('screening') || n.includes('advanced'))return { lib: 'ion', icon: 'scan',          color: '#0EA5E9', bg: '#EFF8FF' };
    if (n.includes('hba1c') || n.includes('hemoglobin'))  return { lib: 'ion', icon: 'pulse',         color: '#EF4444', bg: '#FFF1F1' };
    if (n.includes('thyroid') || n.includes('tsh'))       return { lib: 'ion', icon: 'cellular',      color: '#EC4899', bg: '#FDF2F8' };
    if (n.includes('vitamin') || n.includes('deficiency'))return { lib: 'ion', icon: 'sunny',         color: '#F59E0B', bg: '#FFFBEB' };
    if (n.includes('diabetes') || n.includes('glucose'))  return { lib: 'mci', icon: 'water',         color: '#3B82F6', bg: '#EFF4FF' };
    if (n.includes('test'))                                return { lib: 'mci', icon: 'stethoscope',   color: '#10B981', bg: '#EDFCF4' };
    return                                                        { lib: 'ion', icon: 'shield-checkmark', color: '#6366F1', bg: '#F0F0FF' };
};

// ─── Package Card ─────────────────────────────────────────────────────────────
const PackageCard = memo(({
    item,
    onViewDetails,
    onBookNow,
    themeColors,
}: {
    item: LabPackage;
    onViewDetails: (code: string) => void;
    onBookNow: (pkg: LabPackage) => void;
    themeColors: ReturnType<typeof useThemeColors>;
}) => {
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(themeColors, isDarkMode);
    const { lib, icon, color, bg } = getTestIcon(item.name);
    const IconComp = lib === 'mci' ? MaterialCommunityIcons : Ionicons;
    const discountPct = item.discounted_cost
        ? Math.round(((item.cost - item.discounted_cost) / item.cost) * 100)
        : 0;
    const price = item.discounted_cost || item.cost;

    return (
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
            {discountPct > 0 && (
                <View style={styles.ribbon}>
                    <Text style={styles.ribbonText}>{t('blood_test.save_pct', { pct: discountPct })}</Text>
                </View>
            )}

            <View style={styles.cardInner}>
                {/* Icon */}
                <View style={[styles.iconBox, { backgroundColor: bg }]}>
                    <IconComp name={icon as any} size={24} color={color} />
                </View>

                {/* Content */}
                <View style={styles.cardBody}>
                    <Text style={[styles.cardName, { color: themeColors.textDark }]} numberOfLines={2}>
                        {item.name}
                    </Text>

                    <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="package-variant-closed" size={11} color={themeColors.textMuted} />
                        <Text style={[styles.metaText, { color: themeColors.textMuted }]}>
                            {item.packages_count || 1} {item.packages_count === 1 ? t('blood_test.package_one') : t('blood_test.package_other')}
                        </Text>
                        <Text style={[styles.metaDot, { color: themeColors.textMuted }]}>·</Text>
                        <Ionicons name="flask-outline" size={11} color={themeColors.textMuted} />
                        <Text style={[styles.metaText, { color: themeColors.textMuted }]}>
                            {item.tests_count || 0} {item.tests_count === 1 ? t('blood_test.parameter_one') : t('blood_test.parameter_other')}
                        </Text>
                        <Text style={[styles.metaDot, { color: themeColors.textMuted }]}>·</Text>
                        <Ionicons name="home-outline" size={11} color={themeColors.textMuted} />
                        <Text style={[styles.metaText, { color: themeColors.textMuted }]}>{t('blood_test.home_lab')}</Text>
                    </View>

                    <View style={styles.cardFooter}>
                        <View>
                            {item.discounted_cost ? (
                                <View>
                                    <Text style={[styles.strikePrice, { color: themeColors.textMuted }]}>₹{item.cost}</Text>
                                    <Text style={styles.finalPrice}>₹{price}</Text>
                                </View>
                            ) : (
                                <Text style={styles.finalPrice}>₹{price}</Text>
                            )}
                        </View>

                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={[styles.detailsBtn, { borderColor: themeColors.primary }]}
                                onPress={() => onViewDetails(item.code)}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.detailsBtnText, { color: themeColors.primary }]}>{t('blood_test.details_btn')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bookBtn}
                                onPress={() => onBookNow(item)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.bookBtnText}>{t('booking.book_now')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
});
PackageCard.displayName = 'PackageCard';

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function BloodTestScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const themeColors = useThemeColors();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);

    const [packages, setPackages] = useState<LabPackage[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState(0);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [detailModalCode, setDetailModalCode] = useState('');
    const [searchText, setSearchText] = useState('');

    const isRebook = params.rebook === 'true';
    const rebookPackageCode = params.packageCode as string | undefined;
    const isFromCheckout = params.fromCheckout === 'true';

    const { addItem, itemCount } = useCart();
    const { showToast } = useToast();

    useEffect(() => { fetchPackages(); }, []);

    useEffect(() => {
        if (isRebook && rebookPackageCode && packages.length > 0) {
            const pkg = packages.find(p => p.code === rebookPackageCode);
            if (pkg) {
                addItem({ id: pkg.code, serviceType: 'Bloodwork', title: pkg.name, price: pkg.discounted_cost || pkg.cost, quantity: 1, details: pkg });
                router.push('/cart' as any);
            }
        }
    }, [isRebook, rebookPackageCode, packages]);

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const pkgs = await labService.getPackages();
            setPackages(pkgs || []);
        } catch { /* silent */ } finally { setLoading(false); }
    };

    const handleViewDetails = useCallback((code: string) => {
        setDetailModalCode(code);
        setDetailModalVisible(true);
    }, []);

    const handleAddToCart = useCallback((pkg: LabPackage) => {
        addItem({ id: pkg.code, serviceType: 'Bloodwork', title: pkg.name, price: pkg.discounted_cost || pkg.cost, quantity: 1, details: pkg });
        setDetailModalVisible(false);
        showToast(t('blood_test.added_to_cart_msg', { name: pkg.name }));
    }, [addItem, showToast, t]);

    const handleBookNow = useCallback((pkg: LabPackage) => {
        setDetailModalVisible(false);
        addItem({ id: pkg.code, serviceType: 'Bloodwork', title: pkg.name, price: pkg.discounted_cost || pkg.cost, quantity: 1, details: pkg });
        router.push({
            pathname: '/payment/checkout',
            params: { category: 'blood-test', amount: String(pkg.discounted_cost || pkg.cost), label: pkg.name, skipUpsell: '1', selectedItemIds: pkg.code },
        } as any);
    }, [router, addItem]);

    const filteredPackages = useMemo(() =>
        packages.filter(pkg => pkg.name.toLowerCase().includes(searchText.toLowerCase())),
        [packages, searchText]
    );

    const renderItem = useCallback(({ item }: { item: LabPackage }) => (
        <PackageCard
            item={item}
            onViewDetails={handleViewDetails}
            onBookNow={handleBookNow}
            themeColors={themeColors}
        />
    ), [handleViewDetails, handleBookNow, themeColors]);

    return (
        <View style={[styles.screen, { backgroundColor: colors.primary, paddingTop: insets.top }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={colors.primary} />

            {/* ── Green Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{t('blood_test.page_title')}</Text>
                    <Text style={styles.headerSub}>{t('blood_test.nabl_sub')}</Text>
                </View>
                {!isFromCheckout ? (
                    <TouchableOpacity
                        onPress={() => itemCount > 0 && router.push('/(tabs)/cart' as any)}
                        style={styles.cartBtn}
                    >
                        <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                        {itemCount > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{itemCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {/* ── Trust strip inside green area ── */}
            <View style={styles.trustStrip}>
                {[
                    { icon: 'home-outline' as const, label: t('blood_test.trust_home') },
                    { icon: 'time-outline' as const, label: t('blood_test.trust_reports') },
                    { icon: 'shield-checkmark-outline' as const, label: t('blood_test.trust_nabl') },
                ].map((b, i) => (
                    <View key={i} style={styles.trustItem}>
                        <Ionicons name={b.icon} size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.trustLabel}>{b.label}</Text>
                    </View>
                ))}
            </View>

            {/* ── White rounded panel ── */}
            <View style={[styles.contentPanel, { backgroundColor: themeColors.bgScreen }]}>
                {/* Search */}
                <View style={[styles.searchBar, { backgroundColor: themeColors.bgCard, borderColor: themeColors.borderLight }]}>
                    <Ionicons name="search-outline" size={16} color={themeColors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder={t('blood_test.search_placeholder')}
                        placeholderTextColor={themeColors.textMuted}
                        style={[styles.searchInput, { color: themeColors.textDark }]}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={15} color={themeColors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                    style={styles.chipsScroll}
                >
                    {CATEGORIES.map((cat, idx) => {
                        const active = activeCategory === idx;
                        const catKeys = ['cat_all', 'cat_popular', 'cat_health_checks', 'cat_wellness'];
                        return (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => setActiveCategory(idx)}
                                style={[
                                    styles.chip,
                                    active
                                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                                        : { backgroundColor: themeColors.bgCard, borderColor: themeColors.borderLight },
                                ]}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.chipText, active ? { color: '#FFFFFF' } : { color: themeColors.textMuted }]}>
                                    {t(`blood_test.${catKeys[idx]}`)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* List */}
                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>{t('blood_test.loading_packages')}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredPackages}
                        renderItem={renderItem}
                        keyExtractor={item => item.code}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <Text style={[styles.countLabel, { color: themeColors.textMuted }]}>
                                {filteredPackages.length === 1
                                    ? t('blood_test.packages_count_one', { count: 1 })
                                    : t('blood_test.packages_count_other', { count: filteredPackages.length })}
                            </Text>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Ionicons name="search-outline" size={42} color={themeColors.textMuted} style={{ opacity: 0.35, marginBottom: 10 }} />
                                <Text style={[styles.emptyTitle, { color: themeColors.textDark }]}>{t('blood_test.empty_title')}</Text>
                                <Text style={[styles.emptySub, { color: themeColors.textMuted }]}>{t('blood_test.empty_sub')}</Text>
                            </View>
                        }
                        maxToRenderPerBatch={10}
                        initialNumToRender={8}
                    />
                )}
            </View>

            <BloodTestDetailModal
                visible={detailModalVisible}
                packageCode={detailModalCode}
                onClose={() => setDetailModalVisible(false)}
                onAddToCart={handleAddToCart}
                onBookNow={handleBookNow}
            />
        </View>
    );
}

const makeStyles = (themeColors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
        gap: Spacing.md,
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
    headerSub: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 1,
        letterSpacing: 0.3,
    },
    cartBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 9,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: themeColors.primary,
    },
    cartBadgeText: { fontFamily: Fonts.semiBold, fontSize: 9, color: '#FFFFFF' },

    // Trust strip
    trustStrip: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    trustLabel: { fontFamily: Fonts.regular, fontSize: 10, color: 'rgba(255,255,255,0.75)' },

    // White panel
    contentPanel: {
        flex: 1,
        borderTopLeftRadius: Radius.xl * 2,
        borderTopRightRadius: Radius.xl * 2,
        paddingTop: Spacing.lg,
        ...Shadow.header,
    },

    // Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderRadius: Radius.md,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        padding: 0,
    },

    // Chips
    chipsScroll: { flexGrow: 0, marginBottom: Spacing.sm },
    chipsRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingRight: Spacing.xl },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    chipText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall },

    // Count label
    countLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        marginBottom: Spacing.sm,
    },

    // List
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },

    // Card
    card: {
        borderRadius: Radius.lg,
        marginBottom: Spacing.md,
        padding: Spacing.md,
        overflow: 'hidden',
        ...Shadow.card,
        shadowOpacity: 0.06,
        elevation: 2,
    },
    ribbon: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#EF4444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderTopRightRadius: Radius.lg,
        borderBottomLeftRadius: Radius.sm,
    },
    ribbonText: {
        fontFamily: Fonts.semiBold,
        fontSize: 9,
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        marginTop: 2,
    },
    cardBody: { flex: 1, gap: 5 },
    cardName: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        lineHeight: 20,
        paddingRight: 52, // space for discount ribbon
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
    },
    metaText: { fontFamily: Fonts.regular, fontSize: 11 },
    metaDot: { fontSize: 11, opacity: 0.5 },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    strikePrice: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        textDecorationLine: 'line-through',
    },
    finalPrice: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.heading2,
        color: themeColors.primary,
        letterSpacing: -0.5,
    },
    btnRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    detailsBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: Radius.sm,
        borderWidth: 1.5,
    },
    detailsBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall },
    bookBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: Radius.sm,
        backgroundColor: themeColors.primary,
    },
    bookBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, color: '#FFFFFF' },

    // Loading / empty
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, paddingTop: 60 },
    loadingText: { fontFamily: Fonts.regular, fontSize: FontSize.body },
    emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, marginBottom: 6, textAlign: 'center' },
    emptySub: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, textAlign: 'center', lineHeight: 18 },
});

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

            {/* Icon */}
            <View style={[styles.iconBox, { backgroundColor: bg }]}>
                <IconComp name={icon as any} size={22} color={color} />
            </View>

            {/* Content */}
            <View style={styles.cardBody}>
                <Text style={[styles.cardName, { color: themeColors.textDark }]} numberOfLines={2}>
                    {item.name}
                </Text>

                <View style={styles.metaRow}>
                    <Ionicons name="flask-outline" size={11} color={themeColors.textMuted} />
                    <Text style={[styles.metaText, { color: themeColors.textMuted }]} numberOfLines={1}>
                        {item.tests_count || 0} {item.tests_count === 1 ? t('blood_test.parameter_one') : t('blood_test.parameter_other')}
                    </Text>
                </View>

                {item.fasting && item.fasting_time ? (
                    <View style={styles.fastingChip}>
                        <Ionicons name="warning-outline" size={10} color="#D97706" />
                        <Text style={styles.fastingChipText} numberOfLines={1}>{item.fasting_time}</Text>
                    </View>
                ) : null}

                <View style={styles.priceBlock}>
                    {item.discounted_cost ? (
                        <>
                            <Text style={[styles.strikePrice, { color: themeColors.textMuted }]}>₹{item.cost}</Text>
                            <Text style={styles.finalPrice}>₹{price}</Text>
                        </>
                    ) : (
                        <Text style={styles.finalPrice}>₹{price}</Text>
                    )}
                </View>

                <View style={styles.btnCol}>
                    <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => onBookNow(item)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.bookBtnText}>{t('booking.book_now')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.detailsBtn, { borderColor: themeColors.primary }]}
                        onPress={() => onViewDetails(item.code)}
                        activeOpacity={0.75}
                    >
                        <Text style={[styles.detailsBtnText, { color: themeColors.primary }]}>{t('blood_test.details_btn')}</Text>
                    </TouchableOpacity>
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

    const [packages, setPackages] = useState<LabPackage[]>([]);       // paginated catalog
    const [searchResults, setSearchResults] = useState<LabPackage[] | null>(null); // server search hits; null = not searching
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searching, setSearching] = useState(false);
    const pageRef = React.useRef(1);
    const hasMoreRef = React.useRef(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'discount'>('popular');
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
        // Rebook: the package may not be on the first loaded page, so search
        // for it directly instead of scanning the in-memory list.
        if (!isRebook || !rebookPackageCode) return;
        (async () => {
            try {
                const { items } = await labService.getPackages(rebookPackageCode);
                const pkg = items.find(p => p.code === rebookPackageCode) || items[0];
                if (pkg) {
                    addItem({ id: pkg.code, serviceType: 'Bloodwork', title: pkg.name, price: pkg.discounted_cost || pkg.cost, quantity: 1, details: pkg });
                    router.push('/cart' as any);
                }
            } catch { /* silent */ }
        })();
    }, [isRebook, rebookPackageCode]);

    const fetchPackages = async () => {
        setLoading(true);
        pageRef.current = 1;
        hasMoreRef.current = true;
        try {
            const { items, hasMore } = await labService.getPackages();
            setPackages(items);
            hasMoreRef.current = hasMore;
        } catch { /* silent */ } finally { setLoading(false); }
    };

    // Server-side search: Redcliffe's ?search= matches the whole catalog (all
    // ~1700 packages), not just the pages we've loaded. Debounced per keystroke.
    useEffect(() => {
        const q = searchText.trim();
        if (!q) { setSearchResults(null); setSearching(false); return; }
        setSearching(true);
        const id = setTimeout(async () => {
            try {
                const { items } = await labService.getPackages(q);
                setSearchResults(items);
            } catch { setSearchResults([]); }
            finally { setSearching(false); }
        }, 350);
        return () => clearTimeout(id);
    }, [searchText]);

    const loadMorePackages = useCallback(async () => {
        // Server-side pages only apply to the unfiltered catalog; while searching
        // or on a category chip we work off the already-loaded / search result set.
        if (loadingMore || loading || !hasMoreRef.current || searchText.trim() || activeCategory !== 'all') return;
        setLoadingMore(true);
        try {
            const next = pageRef.current + 1;
            const { items, hasMore } = await labService.getPackages('', next);
            setPackages(prev => {
                const seen = new Set(prev.map(p => p.code));
                return [...prev, ...items.filter(p => !seen.has(p.code))];
            });
            pageRef.current = next;
            hasMoreRef.current = hasMore;
        } catch { /* silent */ } finally { setLoadingMore(false); }
    }, [loadingMore, loading, searchText, activeCategory]);

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

    // Categories are derived from whatever Redcliffe actually returns for this
    // catalog (category_for_web), not a static guess — so the chips never show
    // a category with zero matching packages.
    const categories = useMemo(() => {
        const names = new Map<string, number>();
        for (const pkg of packages) {
            for (const cat of pkg.category_for_web || []) {
                names.set(cat.name, (names.get(cat.name) || 0) + 1);
            }
        }
        return Array.from(names.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name]) => name);
    }, [packages]);

    const filteredPackages = useMemo(() => {
        // Searching → server results (whole catalog); otherwise the paginated
        // list. Local name filter still applied so it updates instantly while
        // the debounced request is in flight.
        const base = searchResults ?? packages;
        let list = searchText.trim()
            ? base.filter(pkg => pkg.name.toLowerCase().includes(searchText.toLowerCase()))
            : base;

        if (activeCategory !== 'all') {
            list = list.filter(pkg => (pkg.category_for_web || []).some(c => c.name === activeCategory));
        }

        const sorted = [...list];
        switch (sortBy) {
            case 'price_asc':
                sorted.sort((a, b) => (a.discounted_cost || a.cost) - (b.discounted_cost || b.cost));
                break;
            case 'price_desc':
                sorted.sort((a, b) => (b.discounted_cost || b.cost) - (a.discounted_cost || a.cost));
                break;
            case 'discount':
                sorted.sort((a, b) => {
                    const discA = a.discounted_cost ? Math.round(((a.cost - a.discounted_cost) / a.cost) * 100) : 0;
                    const discB = b.discounted_cost ? Math.round(((b.cost - b.discounted_cost) / b.cost) * 100) : 0;
                    return discB - discA;
                });
                break;
            default:
                // 'popular' — keep API's natural ordering (Redcliffe returns by relevance)
                break;
        }
        return sorted;
    }, [packages, searchResults, searchText, activeCategory, sortBy]);

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

                {/* Category chips — built from what the API actually returned */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                    style={styles.chipsScroll}
                >
                    {['all', ...categories].map((cat) => {
                        const active = activeCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setActiveCategory(cat)}
                                style={[
                                    styles.chip,
                                    active
                                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                                        : { backgroundColor: themeColors.bgCard, borderColor: themeColors.borderLight },
                                ]}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.chipText, active ? { color: '#FAF7ED' } : { color: themeColors.textMuted }]}>
                                    {cat === 'all' ? t('blood_test.cat_all') : cat}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Count + Sort */}
                <View style={styles.countSortRow}>
                    <Text style={[styles.countLabel, { color: themeColors.textMuted }]}>
                        {filteredPackages.length === 1
                            ? t('blood_test.packages_count_one', { count: 1 })
                            : t('blood_test.packages_count_other', { count: filteredPackages.length })}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
                        {([
                            { key: 'popular', label: t('blood_test.sort_popular') },
                            { key: 'price_asc', label: t('blood_test.sort_price_asc') },
                            { key: 'price_desc', label: t('blood_test.sort_price_desc') },
                            { key: 'discount', label: t('blood_test.sort_discount') },
                        ] as const).map(opt => {
                            const active = sortBy === opt.key;
                            return (
                                <TouchableOpacity
                                    key={opt.key}
                                    onPress={() => setSortBy(opt.key)}
                                    style={[styles.sortChip, active && { backgroundColor: colors.primary + '1A', borderColor: colors.primary }]}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.sortChipText, { color: active ? colors.primary : themeColors.textMuted }]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Grid */}
                {loading || (searching && filteredPackages.length === 0) ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>{t('blood_test.loading_packages')}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredPackages}
                        renderItem={renderItem}
                        keyExtractor={item => item.code}
                        numColumns={2}
                        columnWrapperStyle={styles.gridRow}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onEndReached={loadMorePackages}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            (loadingMore || searching) ? (
                                <View style={{ paddingVertical: Spacing.lg }}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            searching ? null : (
                                <View style={styles.emptyBox}>
                                    <Ionicons name="search-outline" size={42} color={themeColors.textMuted} style={{ opacity: 0.35, marginBottom: 10 }} />
                                    <Text style={[styles.emptyTitle, { color: themeColors.textDark }]}>{t('blood_test.empty_title')}</Text>
                                    <Text style={[styles.emptySub, { color: themeColors.textMuted }]}>{t('blood_test.empty_sub')}</Text>
                                </View>
                            )
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
        color: '#FAF7ED',
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
    cartBadgeText: { fontFamily: Fonts.semiBold, fontSize: 9, color: '#FAF7ED' },

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

    // Count + Sort
    countSortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    countLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        flexShrink: 0,
    },
    sortRow: { gap: 6 },
    sortChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    sortChipText: { fontFamily: Fonts.medium, fontSize: 11 },

    // List (2-column grid)
    listContent: {
        paddingHorizontal: Spacing.lg - Spacing.xs,
        paddingBottom: Spacing.xl * 2,
    },
    gridRow: {
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },

    // Card (grid tile)
    card: {
        flex: 1,
        borderRadius: Radius.lg,
        marginBottom: Spacing.sm,
        padding: Spacing.sm,
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
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderTopRightRadius: Radius.lg,
        borderBottomLeftRadius: Radius.sm,
        zIndex: 1,
    },
    ribbonText: {
        fontFamily: Fonts.semiBold,
        fontSize: 8,
        color: '#FAF7ED',
        letterSpacing: 0.3,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardBody: { gap: 4 },
    cardName: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
        lineHeight: 17,
        minHeight: 34,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: { fontFamily: Fonts.regular, fontSize: 10.5, flexShrink: 1 },
    metaDot: { fontSize: 11, opacity: 0.5 },
    fastingChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        alignSelf: 'flex-start',
        backgroundColor: '#FEF3C7',
        borderRadius: Radius.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 2,
        maxWidth: '100%',
    },
    fastingChipText: {
        fontFamily: Fonts.medium,
        fontSize: 9,
        color: '#B45309',
    },
    priceBlock: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        marginTop: 4,
        flexWrap: 'wrap',
    },
    strikePrice: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        textDecorationLine: 'line-through',
    },
    finalPrice: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.body,
        color: themeColors.primary,
        letterSpacing: -0.3,
    },
    btnCol: { gap: 6, marginTop: 8 },
    detailsBtn: {
        alignItems: 'center',
        paddingVertical: 6,
        borderRadius: Radius.sm,
        borderWidth: 1.5,
    },
    detailsBtnText: { fontFamily: Fonts.semiBold, fontSize: 11 },
    bookBtn: {
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: Radius.sm,
        backgroundColor: themeColors.primary,
    },
    bookBtnText: { fontFamily: Fonts.semiBold, fontSize: 11, color: '#FAF7ED' },

    // Loading / empty
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, paddingTop: 60 },
    loadingText: { fontFamily: Fonts.regular, fontSize: FontSize.body },
    emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, marginBottom: 6, textAlign: 'center' },
    emptySub: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, textAlign: 'center', lineHeight: 18 },
});

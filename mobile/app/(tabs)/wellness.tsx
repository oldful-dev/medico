import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    RefreshControl,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { storeService, Product } from '@/services/api/storeService';
import { useCart } from '@/context/CartContext';

// Using local images or placeholder for Hero if a specific illustration isn't explicitly supplied
// For this teaser, we'll build a vibrant Hero with a prominent 'Ayuxa Care' logo or generic medical icon
const imgPlaceholderHero = require('@/assets/images/8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png');

const CATEGORIES = [
    { id: 1, title: 'Genuine Medicines', subtitle: '(Prescription & OTC)', icon: 'medical' },
    { id: 2, title: 'Sugar-Free Foods', subtitle: '(Biscuits, Atta, Snacks)', icon: 'fast-food' },
    { id: 3, title: 'Mobility Aids', subtitle: '(Walking Sticks, Walkers)', icon: 'walk' },
    { id: 4, title: 'Adult Care', subtitle: '(Diapers, Lotions, Hygiene)', icon: 'body' },
    { id: 5, title: 'Health Devices', subtitle: '(BP Monitors, Oximeters)', icon: 'pulse' },
];

export default function WellnessScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { addItem, items } = useCart();

    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const ITEMS_PER_PAGE = 9;

    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const CATEGORY_LIST = [
        'All',
        'Wellness Essentials',
        'Healthcare Devices',
        'Fitness & Recovery',
        'Mobility Aids',
        'Health Monitors',
        'Supplements',
        'Personal Care'
    ];

    const fetchProducts = useCallback(async () => {
        try {
            const res = await storeService.getProducts({ isEnabled: true, limit: 100 });
            const filtered = (res.data || []).filter(p => p.stock > 0);
            setAllProducts(filtered);
            // Show first 9 items
            setDisplayedProducts(filtered.slice(0, ITEMS_PER_PAGE));
            setPage(0);
        } catch {
            setAllProducts([]);
            setDisplayedProducts([]);
        }
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchProducts();
            setLoading(false);
        })();
    }, [fetchProducts]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    }, [fetchProducts]);

    const loadMore = useCallback(() => {
        const nextPage = page + 1;
        const startIndex = nextPage * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;

        if (startIndex < allProducts.length) {
            setDisplayedProducts(prev => [...prev, ...allProducts.slice(startIndex, endIndex)]);
            setPage(nextPage);
        }
    }, [page, allProducts]);

    const handleAddToCart = (product: Product) => {
        addItem({
            id: product.id,
            serviceType: 'product',
            title: product.name,
            price: product.price,
            quantity: 1,
            details: { productId: product.id, imageUrl: product.imageUrl },
        });
        Alert.alert('Added to Cart', `${product.name} added to cart!`, [
            { text: 'Continue', style: 'cancel' },
            { text: 'View Cart', onPress: () => router.push('/(tabs)/cart' as any) },
        ]);
    };

    let filteredProducts = displayedProducts;

    if (selectedCategory !== 'All') {
        filteredProducts = filteredProducts.filter(p => p.category?.name === selectedCategory);
    }

    if (search.trim()) {
        filteredProducts = filteredProducts.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.category?.name.toLowerCase().includes(search.toLowerCase())
        );
    }

    // ── LOADING ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.screen}>
                <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
                <StatusBar style="light" backgroundColor={Colors.primary} />
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Ayuxa Wellness</Text>
                </View>
                <View style={[styles.contentContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </View>
        );
    }

    // ── STORE VIEW (products exist) ────────────────────────────────────────────
    if (allProducts.length > 0) {
        const hasMoreProducts = filteredProducts.length < allProducts.length;

        return (
            <View style={styles.screen}>
                <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
                <StatusBar style="light" backgroundColor={Colors.primary} />
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Wellness Store</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/cart' as any)} style={styles.cartIconBtn}>
                        <Ionicons name="cart-outline" size={22} color="#fff" />
                        {items.length > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{items.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.searchRow}>
                        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search products..."
                            placeholderTextColor={Colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                        style={{ flexGrow: 0, marginBottom: Spacing.sm }}
                    >
                        {CATEGORY_LIST.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <FlatList
                        data={filteredProducts}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                        onEndReached={() => {
                            if (!search && selectedCategory === 'All' && hasMoreProducts) {
                                loadMore();
                            }
                        }}
                        onEndReachedThreshold={0.5}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No products found</Text>
                            </View>
                        }
                        ListFooterComponent={
                            !search && hasMoreProducts ? (
                                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} activeOpacity={0.7}>
                                    <Text style={styles.loadMoreText}>Load More Products</Text>
                                </TouchableOpacity>
                            ) : null
                        }
                        renderItem={({ item: product }) => {
                            const discount = product.mrp > product.price
                                ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                                : 0;
                            const lowStock = product.stock <= 5 && product.stock > 0;
                            return (
                                <TouchableOpacity
                                    style={styles.card}
                                    activeOpacity={0.9}
                                    onPress={() => router.push(`/wellness-product?id=${product.id}` as any)}
                                >
                                    <View style={styles.imageBox}>
                                        {product.imageUrl ? (
                                            <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="cover" />
                                        ) : (
                                            <View style={styles.imageFallback}>
                                                <Ionicons name="cube-outline" size={36} color={Colors.borderLight} />
                                            </View>
                                        )}
                                        {discount > 0 && (
                                            <View style={styles.discountBadge}>
                                                <Text style={styles.discountText}>{discount}% OFF</Text>
                                            </View>
                                        )}
                                        {lowStock && (
                                            <View style={styles.lowStockBadge}>
                                                <Text style={styles.lowStockText}>Only {product.stock} left</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.cardBody}>
                                        {product.category && (
                                            <Text style={styles.categoryLabel}>{product.category.name}</Text>
                                        )}
                                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                                        <View style={styles.priceRow}>
                                            <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
                                            {product.mrp > product.price && (
                                                <Text style={styles.mrp}>₹{product.mrp.toLocaleString('en-IN')}</Text>
                                            )}
                                        </View>
                                        <View style={styles.ctaRow}>
                                            <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToCart(product)}>
                                                <Ionicons name="cart-outline" size={14} color="#fff" />
                                                <Text style={styles.addBtnText}>Add</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.detailBtn}
                                                onPress={() => router.push(`/wellness-product?id=${product.id}` as any)}
                                            >
                                                <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </View>
        );
    }

    // ── COMING SOON (no products) — UI untouched ──────────────────────────────
    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Ayuxa Wellness</Text>
            </View>

            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ─── The Visual Hook (Hero Section) ─── */}
                    <View style={styles.heroSection}>
                        <View style={styles.heroImageContainer}>
                            {/* We fallback to the meal service image or any generic asset since we lack a specific "senior receiving package" image, but styled beautifully */}
                            <Image source={imgPlaceholderHero} style={styles.heroImage} resizeMode="contain" />
                            <View style={styles.comingSoonBadge}>
                                <Text style={styles.comingSoonBadgeText}>{t('wellness.coming_soon').toUpperCase()}</Text>
                            </View>
                        </View>

                        <Text style={styles.heroHeadline}>The Ayuxa Wellness Store is Opening Soon!</Text>
                        <Text style={styles.heroSubHeadline}>
                            Genuine Medicines, Senior Care Products, and Daily Essentials delivered to your door.
                        </Text>
                    </View>

                    {/* ─── "What can you buy here?" (Teaser Grid) ─── */}
                    <View style={styles.teaserSection}>
                        <Text style={styles.teaserSectionTitle}>What can you buy here?</Text>
                        <Text style={styles.teaserSectionSubtitle}>
                            A fully-stocked pharmacy and senior-care shop right at your fingertips.
                        </Text>

                        <View style={styles.gridContainer}>
                            {CATEGORIES.map((cat) => (
                                <View key={cat.id} style={styles.gridItem}>
                                    <View style={styles.iconCircle}>
                                        <Ionicons name={cat.icon as any} size={28} color="#A0A0A0" />
                                    </View>
                                    <View style={styles.gridTextGroup}>
                                        <Text style={styles.gridItemTitle}>{cat.title}</Text>
                                        <Text style={styles.gridItemSub}>{cat.subtitle}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.footerSpacing} />
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.primary, // Matches app theme header
    },
    /* ─── Header ─── */
    headerContainer: {
        backgroundColor: '#048357',
        alignItems: 'center',
        paddingVertical: 15,
        paddingBottom: 25,
    },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        letterSpacing: -0.24,
    },
    cartIconBtn: {
        position: 'absolute',
        right: Spacing.md,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    cartBadgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: '#fff',
    },
    /* ─── Main Content Container (Cream Box) ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
        borderTopLeftRadius: Radius.xl * 2,
        borderTopRightRadius: Radius.xl * 2,
        ...Shadow.card,
    },
    scrollContent: {
        paddingTop: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },

    /* ─── Hero Section ─── */
    heroSection: {
        alignItems: 'center',
        marginBottom: 35,
    },
    heroImageContainer: {
        width: 200,
        height: 180,
        backgroundColor: 'rgba(2, 116, 63, 0.05)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    heroImage: {
        width: 140,
        height: 140,
        opacity: 0.8,
    },
    comingSoonBadge: {
        position: 'absolute',
        bottom: -15,
        backgroundColor: Colors.primaryDark, // Green highlighting the coming soon
        paddingHorizontal: Spacing.lg,
        paddingVertical: 6,
        borderRadius: Radius.xl,
        borderWidth: 2,
        borderColor: Colors.bgScreen, // Matches body background
    },
    comingSoonBadgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.textWhite,
        letterSpacing: 1,
    },
    heroHeadline: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading1,
        color: Colors.textBody,
        textAlign: 'center',
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        lineHeight: 30,
    },
    heroSubHeadline: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: Spacing.lg,
    },

    /* ─── Teaser Layout ─── */
    teaserSection: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        ...Shadow.card,
    },
    teaserSectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textBody,
        marginBottom: 6,
    },
    teaserSectionSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        marginBottom: Spacing.xl,
    },

    gridContainer: {
        flexDirection: 'column',
        gap: 15,
    },
    gridItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        padding: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EAEAEA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    gridTextGroup: {
        flex: 1,
        justifyContent: 'center',
    },
    gridItemTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: '#707070', // Greyed-out text effect
        marginBottom: 2,
    },
    gridItemSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textLight, // Highly faded subtitle
    },
    footerSpacing: {
        height: 80,
    },

    /* ─── Store View (products exist) ─── */
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textBody,
    },
    categoryScroll: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        alignItems: 'center',
    },
    categoryChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: Radius.xl,
        backgroundColor: Colors.bgCard,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    categoryChipText: {
        fontFamily: Fonts.medium,
        fontSize: 13,
        color: Colors.textMuted,
    },
    categoryChipTextActive: {
        color: Colors.textWhite,
        fontFamily: Fonts.semiBold,
    },
    listContent: {
        paddingHorizontal: Spacing.md,
        paddingBottom: 100,
        paddingTop: Spacing.sm,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    card: {
        width: '48.5%',
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadow.card,
    },
    imageBox: {
        aspectRatio: 1,
        backgroundColor: '#f5f5f5',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imageFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#10b981',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 20,
    },
    discountText: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        color: '#fff',
    },
    lowStockBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#f59e0b',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 20,
    },
    lowStockText: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        color: '#fff',
    },
    cardBody: {
        padding: Spacing.sm,
        gap: 3,
    },
    categoryLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    productName: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        lineHeight: 16,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginTop: 2,
    },
    price: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textBody,
    },
    mrp: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    ctaRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
    },
    addBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: Colors.primary,
        paddingVertical: 7,
        borderRadius: Radius.sm,
    },
    addBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: '#fff',
    },
    detailBtn: {
        width: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
    },
    emptyBox: {
        paddingTop: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
    },
    loadMoreBtn: {
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadMoreText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textWhite,
        letterSpacing: 0.5,
    },
});

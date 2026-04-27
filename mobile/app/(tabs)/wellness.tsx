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
// For this teaser, we'll build a vibrant Hero with a prominent 'Oldful' logo or generic medical icon
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
    const { addItem } = useCart();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const fetchProducts = useCallback(async () => {
        try {
            const res = await storeService.getProducts({ isEnabled: true, limit: 50 });
            setProducts((res.data || []).filter(p => p.stock > 0));
        } catch {
            setProducts([]);
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

    const filteredProducts = search.trim()
        ? products.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.category?.name.toLowerCase().includes(search.toLowerCase())
          )
        : products;

    // ── LOADING ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.screen}>
                <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
                <StatusBar style="light" backgroundColor={Colors.primary} />
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Oldful Wellness</Text>
                </View>
                <View style={[styles.contentContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </View>
        );
    }

    // ── STORE VIEW (products exist) ────────────────────────────────────────────
    if (products.length > 0) {
        return (
            <View style={styles.screen}>
                <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
                <StatusBar style="light" backgroundColor={Colors.primary} />
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Wellness Store</Text>
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
                    <FlatList
                        data={filteredProducts}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No products found</Text>
                            </View>
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
                <Text style={styles.headerTitle}>Oldful Wellness</Text>
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

                        <Text style={styles.heroHeadline}>The Oldful Wellness Store is Opening Soon!</Text>
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
});

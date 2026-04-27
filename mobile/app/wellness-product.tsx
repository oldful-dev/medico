import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { storeService, Product } from '@/services/api/storeService';
import { useCart } from '@/context/CartContext';

export default function WellnessProductScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { addItem } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [related, setRelated] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const res = await storeService.getProductById(id);
                if (res.data) {
                    setProduct(res.data);
                    if (res.data.categoryId) {
                        const relRes = await storeService.getProducts({ isEnabled: true, categoryId: res.data.categoryId, limit: 5 });
                        const items: Product[] = (relRes.data || [])
                            .filter(p => p.id !== id && p.stock > 0)
                            .slice(0, 4);
                        setRelated(items);
                    }
                }
            } catch {
                // fail silently
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const handleAddToCart = () => {
        if (!product) return;
        addItem({
            id: product.id,
            serviceType: 'product',
            title: product.name,
            price: product.price,
            quantity: 1,
            details: { productId: product.id, imageUrl: product.imageUrl },
        });
        Alert.alert('Added to Cart', `${product.name} added to cart!`, [
            { text: 'Continue Shopping', style: 'cancel' },
            { text: 'View Cart', onPress: () => router.push('/(tabs)/cart' as any) },
        ]);
    };

    if (loading) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <StatusBar style="dark" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={Colors.textBody} />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </View>
        );
    }

    if (!product) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <StatusBar style="dark" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={Colors.textBody} />
                    </TouchableOpacity>
                </View>
                <View style={styles.notFoundBox}>
                    <Ionicons name="cube-outline" size={64} color={Colors.borderLight} />
                    <Text style={styles.notFoundText}>Product not found</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backLink}>← Back to Wellness Store</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const discount = product.mrp > product.price
        ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
        : 0;
    const savings = product.mrp > product.price ? product.mrp - product.price : 0;
    const stockStatus = product.stock === 0 ? 'out' : product.stock <= 5 ? 'low' : 'ok';

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={Colors.textBody} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {product.category?.name ?? 'Product'}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/cart' as any)} style={styles.backBtn}>
                    <Ionicons name="cart-outline" size={22} color={Colors.textBody} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

                {/* Product Image */}
                <View style={styles.imageContainer}>
                    {product.imageUrl && !imageError ? (
                        <Image
                            source={{ uri: product.imageUrl }}
                            style={styles.productImage}
                            resizeMode="cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <View style={styles.imageFallback}>
                            <Ionicons name="cube-outline" size={72} color={Colors.borderLight} />
                        </View>
                    )}
                    {discount > 0 && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{discount}% OFF</Text>
                        </View>
                    )}
                    {stockStatus === 'low' && (
                        <View style={styles.lowStockBadge}>
                            <Text style={styles.lowStockText}>Only {product.stock} left</Text>
                        </View>
                    )}
                    {stockStatus === 'out' && (
                        <View style={styles.outBadge}>
                            <Text style={styles.outText}>Out of Stock</Text>
                        </View>
                    )}
                </View>

                {/* Product Details */}
                <View style={styles.detailsContainer}>

                    {product.category && (
                        <Text style={styles.categoryLabel}>{product.category.name}</Text>
                    )}
                    <Text style={styles.productName}>{product.name}</Text>

                    {/* Stars (static quality badge) */}
                    <View style={styles.starsRow}>
                        {[1,2,3,4,5].map(s => (
                            <Ionicons key={s} name="star" size={14} color="#f59e0b" />
                        ))}
                        <Text style={styles.verifiedText}>Verified Quality</Text>
                    </View>

                    {/* Price Block */}
                    <View style={styles.priceCard}>
                        <View style={styles.priceRow}>
                            <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
                            {product.mrp > product.price && (
                                <Text style={styles.mrp}>₹{product.mrp.toLocaleString('en-IN')}</Text>
                            )}
                            {discount > 0 && (
                                <View style={styles.discountPill}>
                                    <Text style={styles.discountPillText}>{discount}% off</Text>
                                </View>
                            )}
                        </View>
                        {savings > 0 && (
                            <Text style={styles.savingsText}>
                                You save ₹{savings.toLocaleString('en-IN')} on this order
                            </Text>
                        )}
                        <Text style={styles.taxText}>Inclusive of all taxes</Text>
                    </View>

                    {/* Stock Status */}
                    <View style={styles.stockRow}>
                        {stockStatus === 'ok' && (
                            <>
                                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                <Text style={[styles.stockText, { color: '#059669' }]}>In Stock</Text>
                            </>
                        )}
                        {stockStatus === 'low' && (
                            <>
                                <Ionicons name="warning" size={16} color="#f59e0b" />
                                <Text style={[styles.stockText, { color: '#d97706' }]}>Only {product.stock} units left</Text>
                            </>
                        )}
                        {stockStatus === 'out' && (
                            <>
                                <Ionicons name="warning" size={16} color="#ef4444" />
                                <Text style={[styles.stockText, { color: '#dc2626' }]}>Out of Stock</Text>
                            </>
                        )}
                    </View>

                    {/* Trust Signals */}
                    <View style={styles.trustRow}>
                        {[
                            { icon: 'car-outline', label: 'Fast Delivery' },
                            { icon: 'shield-checkmark-outline', label: 'Genuine' },
                            { icon: 'refresh-outline', label: 'Easy Returns' },
                        ].map(({ icon, label }) => (
                            <View key={label} style={styles.trustItem}>
                                <Ionicons name={icon as any} size={18} color={Colors.primary} />
                                <Text style={styles.trustLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Description */}
                    {product.description && (
                        <View style={styles.descSection}>
                            <Text style={styles.sectionTitle}>About this Product</Text>
                            <Text style={styles.descText}>{product.description}</Text>
                        </View>
                    )}

                    {/* Related Products */}
                    {related.length > 0 && (
                        <View style={styles.relatedSection}>
                            <View style={styles.relatedHeader}>
                                <Text style={styles.sectionTitle}>
                                    More in {product.category?.name}
                                </Text>
                                <TouchableOpacity onPress={() => router.back()}>
                                    <Text style={styles.viewAllText}>View all →</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll}>
                                {related.map(rel => {
                                    const relDiscount = rel.mrp > rel.price
                                        ? Math.round(((rel.mrp - rel.price) / rel.mrp) * 100) : 0;
                                    return (
                                        <TouchableOpacity
                                            key={rel.id}
                                            style={styles.relatedCard}
                                            onPress={() => router.replace(`/wellness-product?id=${rel.id}` as any)}
                                        >
                                            <View style={styles.relatedImageBox}>
                                                {rel.imageUrl ? (
                                                    <Image source={{ uri: rel.imageUrl }} style={styles.relatedImage} resizeMode="cover" />
                                                ) : (
                                                    <Ionicons name="cube-outline" size={28} color={Colors.borderLight} />
                                                )}
                                                {relDiscount > 0 && (
                                                    <View style={styles.relatedBadge}>
                                                        <Text style={styles.relatedBadgeText}>{relDiscount}% OFF</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.relatedBody}>
                                                <Text style={styles.relatedName} numberOfLines={2}>{rel.name}</Text>
                                                <Text style={styles.relatedPrice}>₹{rel.price.toLocaleString('en-IN')}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Sticky Add to Cart */}
            <View style={[styles.stickyBar, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    style={[styles.addBtn, stockStatus === 'out' && styles.addBtnDisabled]}
                    onPress={handleAddToCart}
                    disabled={stockStatus === 'out'}
                    activeOpacity={0.85}
                >
                    <Ionicons name="cart-outline" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>
                        {stockStatus === 'out' ? 'Out of Stock' : 'Add to Cart'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        backgroundColor: Colors.bgScreen,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textBody,
        marginHorizontal: Spacing.sm,
    },
    loadingBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notFoundBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    notFoundText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textMuted,
    },
    backLink: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
    },

    // Image
    imageContainer: {
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
        top: 14,
        left: 14,
        backgroundColor: '#10b981',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    discountText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
        color: '#fff',
    },
    lowStockBadge: {
        position: 'absolute',
        top: 14,
        right: 14,
        backgroundColor: '#f59e0b',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    lowStockText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
        color: '#fff',
    },
    outBadge: {
        position: 'absolute',
        top: 14,
        right: 14,
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    outText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
        color: '#fff',
    },

    // Details
    detailsContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    categoryLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 11,
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    productName: {
        fontFamily: Fonts.semiBold,
        fontSize: 22,
        color: Colors.textBody,
        lineHeight: 30,
    },
    starsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    verifiedText: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textMuted,
        marginLeft: 4,
    },
    priceCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.md,
        gap: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        flexWrap: 'wrap',
    },
    price: {
        fontFamily: Fonts.semiBold,
        fontSize: 28,
        color: Colors.textBody,
    },
    mrp: {
        fontFamily: Fonts.regular,
        fontSize: 16,
        color: Colors.textMuted,
        textDecorationLine: 'line-through',
    },
    discountPill: {
        backgroundColor: '#d1fae5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    discountPillText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
        color: '#059669',
    },
    savingsText: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
        color: '#059669',
    },
    taxText: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textMuted,
    },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    stockText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
    },
    trustRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    trustItem: {
        flex: 1,
        alignItems: 'center',
        gap: 5,
        backgroundColor: Colors.bgCard,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.md,
        paddingVertical: Spacing.sm,
    },
    trustLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
    descSection: {
        gap: 8,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textBody,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        paddingBottom: 8,
    },
    descText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
        lineHeight: 24,
    },

    // Related
    relatedSection: {
        gap: Spacing.sm,
    },
    relatedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    viewAllText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.primary,
    },
    relatedScroll: {
        marginTop: 4,
    },
    relatedCard: {
        width: 140,
        marginRight: Spacing.sm,
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadow.card,
    },
    relatedImageBox: {
        aspectRatio: 1,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    relatedImage: {
        width: '100%',
        height: '100%',
    },
    relatedBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: '#10b981',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 10,
    },
    relatedBadgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: 9,
        color: '#fff',
    },
    relatedBody: {
        padding: Spacing.sm,
        gap: 3,
    },
    relatedName: {
        fontFamily: Fonts.semiBold,
        fontSize: 11,
        color: Colors.textBody,
        lineHeight: 15,
    },
    relatedPrice: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textBody,
    },

    // Sticky bar
    stickyBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.bgScreen,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        paddingHorizontal: Spacing.lg,
        paddingTop: 12,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
        paddingVertical: 16,
    },
    addBtnDisabled: {
        backgroundColor: '#d1d5db',
    },
    addBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#fff',
    },
});

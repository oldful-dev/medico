import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { storeService, Product } from '@/services/api/storeService';
import { useCart } from '@/context/CartContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';

export default function WellnessProductScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { addItem, items, updateQuantity, removeItem } = useCart();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors);

    const [product, setProduct] = useState<Product | null>(null);
    const [related, setRelated] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const cartItem = items.find(i => i.id === product?.id);
    const quantityInCart = cartItem ? cartItem.quantity : 0;

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
        showToast(t('wellness.added_to_cart_title'));
    };

    if (loading) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={colors.textBody} />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (!product) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={colors.textBody} />
                    </TouchableOpacity>
                </View>
                <View style={styles.notFoundBox}>
                    <Ionicons name="cube-outline" size={64} color={colors.borderLight} />
                    <Text style={styles.notFoundText}>{t('wellness.product_not_found')}</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backLink}>{t('wellness.back_to_store')}</Text>
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
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.textBody} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {product.category?.name ?? 'Product'}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/cart' as any)} style={styles.cartBtn}>
                    <Ionicons name="cart-outline" size={22} color={colors.textBody} />
                    {items.length > 0 && (
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{items.length}</Text>
                        </View>
                    )}
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
                            <Ionicons name="cube-outline" size={72} color={colors.borderLight} />
                        </View>
                    )}
                    {discount > 0 && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{t('wellness.off_badge', { percent: discount })}</Text>
                        </View>
                    )}
                    {stockStatus === 'out' && (
                        <View style={styles.outBadge}>
                            <Text style={styles.outText}>{t('wellness.sold_out')}</Text>
                        </View>
                    )}
                    {stockStatus === 'low' && (
                        <View style={styles.lowStockBadge}>
                            <Text style={styles.lowStockText}>{t('wellness.only_left', { count: product.stock })}</Text>
                        </View>
                    )}
                </View>

                {/* Details */}
                <View style={styles.detailsContainer}>
                    <Text style={styles.categoryLabel}>{product.category?.name}</Text>
                    <Text style={styles.productName}>{product.name}</Text>

                    {/* Ratings */}
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                                key={s}
                                name={s <= Math.round(product.rating || 4) ? 'star' : 'star-outline'}
                                size={14}
                                color="#FFB000"
                            />
                        ))}
                        <Text style={styles.verifiedText}>
                            ({product.rating || 4.0}) · {t('wellness.genuine_product')}
                        </Text>
                    </View>

                    {/* Price Card */}
                    <View style={styles.priceCard}>
                        <View style={styles.priceRow}>
                            <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
                            {product.mrp > product.price && (
                                <>
                                    <Text style={styles.mrp}>{t('wellness.mrp_prefix')} ₹{product.mrp.toLocaleString('en-IN')}</Text>
                                    <View style={styles.discountPill}>
                                        <Text style={styles.discountPillText}>{t('wellness.off_badge', { percent: discount })}</Text>
                                    </View>
                                </>
                            )}
                        </View>
                        {savings > 0 && (
                            <Text style={styles.savingsText}>
                                {t('wellness.you_save', { amount: savings.toLocaleString('en-IN') })}
                            </Text>
                        )}
                        <Text style={styles.taxText}>{t('wellness.tax_inclusive')}</Text>
                    </View>

                    {/* Stock Status details */}
                    <View style={styles.stockRow}>
                        {stockStatus === 'ok' && (
                            <>
                                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                <Text style={[styles.stockText, { color: '#059669' }]}>{t('wellness.in_stock')}</Text>
                            </>
                        )}
                        {stockStatus === 'low' && (
                            <>
                                <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                                <Text style={[styles.stockText, { color: '#d97706' }]}>
                                    {t('wellness.hurry_stock', { count: product.stock })}
                                </Text>
                            </>
                        )}
                        {stockStatus === 'out' && (
                            <>
                                <Ionicons name="warning" size={16} color="#ef4444" />
                                <Text style={[styles.stockText, { color: '#dc2626' }]}>{t('wellness.out_of_stock')}</Text>
                            </>
                        )}
                    </View>

                    {/* Trust Signals */}
                    <View style={styles.trustRow}>
                        {[
                            { icon: 'car-outline', label: t('wellness.fast_delivery') },
                            { icon: 'shield-checkmark-outline', label: t('wellness.genuine') },
                            { icon: 'refresh-outline', label: t('wellness.easy_returns') },
                        ].map(({ icon, label }) => (
                            <View key={label} style={styles.trustItem}>
                                <Ionicons name={icon as any} size={18} color={colors.primary} />
                                <Text style={styles.trustLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Description */}
                    {product.description && (
                        <View style={styles.descSection}>
                            <Text style={styles.sectionTitle}>{t('wellness.about_product')}</Text>
                            <Text style={styles.descText}>{product.description}</Text>
                        </View>
                    )}

                    {/* Specifications */}
                    <View style={styles.specSection}>
                        <Text style={styles.sectionTitle}>{t('wellness.specifications') || 'Product Specifications'}</Text>
                        <View style={styles.specTable}>
                            {[
                                { label: 'SKU', value: product.sku || 'N/A' },
                                { label: t('wellness.weight') || 'Weight', value: product.weight ? `${product.weight} kg` : '0.1 kg' },
                                { label: t('wellness.dimensions') || 'Dimensions (L × W × H)', value: product.length && product.width && product.height ? `${product.length} × ${product.width} × ${product.height} cm` : '10 × 10 × 10 cm' },
                            ].map((spec, idx, arr) => (
                                <View key={spec.label} style={[styles.specRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}>
                                    <Text style={styles.specLabel}>{spec.label}</Text>
                                    <Text style={styles.specValue}>{spec.value}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Related Products */}
                    {related.length > 0 && (
                        <View style={styles.relatedSection}>
                            <View style={styles.relatedHeader}>
                                <Text style={styles.sectionTitle}>
                                    {t('wellness.more_in_category', { category: product.category?.name })}
                                </Text>
                                <TouchableOpacity onPress={() => router.back()}>
                                    <Text style={styles.viewAllText}>{t('wellness.view_all')}</Text>
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
                                                    <Ionicons name="cube-outline" size={28} color={colors.borderLight} />
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

            {/* Sticky Add to Cart / Quantity Selector */}
            <View style={[styles.stickyBar, { paddingBottom: insets.bottom + 12 }]}>
                {stockStatus === 'out' ? (
                    <TouchableOpacity
                        style={[styles.addBtn, styles.addBtnDisabled]}
                        disabled={true}
                    >
                        <Text style={styles.addBtnText}>{t('wellness.out_of_stock')}</Text>
                    </TouchableOpacity>
                ) : quantityInCart > 0 ? (
                    <View style={styles.quantitySelectorContainer}>
                        <TouchableOpacity
                            style={styles.quantityBtn}
                            onPress={() => {
                                if (quantityInCart > 1) {
                                    updateQuantity(product.id, quantityInCart - 1);
                                } else {
                                    removeItem(product.id);
                                }
                            }}
                        >
                            <Ionicons name="remove" size={20} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>
                            {quantityInCart}
                        </Text>
                        <TouchableOpacity
                            style={styles.quantityBtn}
                            onPress={() => {
                                if (quantityInCart < product.stock) {
                                    updateQuantity(product.id, quantityInCart + 1);
                                } else {
                                    Alert.alert(t('common.error'), t('wellness.only_left', { count: product.stock }));
                                }
                            }}
                        >
                            <Ionicons name="add" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={handleAddToCart}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="cart-outline" size={20} color="#fff" />
                        <Text style={styles.addBtnText}>{t('wellness.add_to_cart')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.bgScreen,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        backgroundColor: colors.bgScreen,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.bgCardMuted,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.bgCardMuted,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
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
        borderColor: colors.bgCard,
    },
    cartBadgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: '#FAF7ED',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.textBody,
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
        color: colors.textMuted,
    },
    backLink: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.primary,
    },

    // Image
    imageContainer: {
        aspectRatio: 1,
        backgroundColor: colors.bgCardMuted,
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
        color: '#FAF7ED',
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
        color: '#FAF7ED',
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
        color: '#FAF7ED',
    },

    // Details
    detailsContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    categoryLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 11,
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    productName: {
        fontFamily: Fonts.semiBold,
        fontSize: 22,
        color: colors.textBody,
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
        color: colors.textMuted,
        marginLeft: 4,
    },
    priceCard: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
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
        color: colors.textBody,
    },
    mrp: {
        fontFamily: Fonts.regular,
        fontSize: 16,
        color: colors.textMuted,
        textDecorationLine: 'line-through',
    },
    discountPill: {
        backgroundColor: 'rgba(5,150,105,0.1)',
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
        color: colors.textMuted,
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
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: Radius.md,
        paddingVertical: Spacing.sm,
    },
    trustLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        color: colors.textMuted,
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
        color: colors.textBody,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        paddingBottom: 8,
    },
    descText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textDark,
        lineHeight: 24,
    },
    specSection: {
        gap: 8,
        marginTop: Spacing.md,
    },
    specTable: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden',
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    specLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textMuted,
    },
    specValue: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: colors.textDark,
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
        borderBottomColor: colors.borderLight,
    },
    viewAllText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: colors.primary,
    },
    relatedScroll: {
        marginTop: 4,
    },
    relatedCard: {
        width: 140,
        marginRight: Spacing.sm,
        backgroundColor: colors.bgCard,
        borderRadius: Radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...Shadow.card,
    },
    relatedImageBox: {
        aspectRatio: 1,
        backgroundColor: colors.bgCardMuted,
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
        color: '#FAF7ED',
    },
    relatedBody: {
        padding: Spacing.sm,
        gap: 3,
    },
    relatedName: {
        fontFamily: Fonts.semiBold,
        fontSize: 11,
        color: colors.textBody,
        lineHeight: 15,
    },
    relatedPrice: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.textBody,
    },

    // Sticky bar
    stickyBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.bgScreen,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingHorizontal: Spacing.lg,
        paddingTop: 12,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        borderRadius: Radius.lg,
        paddingVertical: 16,
    },
    quantitySelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primary,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.md,
        height: 54,
    },
    quantityBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#FAF7ED',
    },
    addBtnDisabled: {
        backgroundColor: colors.bgCardMuted,
    },
    addBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#FAF7ED',
    },
});

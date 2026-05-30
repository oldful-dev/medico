import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useUser } from '@/context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { storeService } from '@/services/api/storeService';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

// ─── Category Mapping ────────────────────────────────────────
type ServiceCategory = 'blood-test' | 'wellness' | 'service' | 'doctor' | 'nurse' | 'other';

const CATEGORY_CONFIG: Record<ServiceCategory, {
    label: string;
    icon: string;
    color: string;
    checkoutFlow: string; // route path
    description: string;
}> = {
    'blood-test': {
        label: 'Bloodwork',
        icon: 'test-tube',
        color: '#EF4444',
        checkoutFlow: '/blood-test',
        description: 'Schedule blood collection',
    },
    'wellness': {
        label: 'Wellness Products',
        icon: 'leaf',
        color: '#10B981',
        checkoutFlow: '/payment/checkout',
        description: 'Order supplements & wellness items',
    },
    'doctor': {
        label: 'Doctor Consultation',
        icon: 'stethoscope',
        color: '#3B82F6',
        checkoutFlow: '/doctor-visit',
        description: 'Book doctor consultation',
    },
    'nurse': {
        label: 'Nurse Care',
        icon: 'medical-bag',
        color: '#8B5CF6',
        checkoutFlow: '/all-ayuxa-services',
        description: 'Home nursing care',
    },
    'service': {
        label: 'Services',
        icon: 'briefcase',
        color: '#F59E0B',
        checkoutFlow: '/all-ayuxa-services',
        description: 'Concierge services',
    },
    'other': {
        label: 'Other',
        icon: 'cube-outline',
        color: '#6B7280',
        checkoutFlow: '/payment/checkout',
        description: 'Other items',
    },
};

const SERVICE_ICON: Record<string, string> = {
    'doctor-visit':   'stethoscope',
    'nurse-care':     'medical-bag',
    'transportation': 'car-estate',
    'insurance':      'shield-check',
    'blood-test':     'test-tube',
    'product':        'package-variant',
};

// ─── Categorize items ──────────────────────────────────────────
function categorizeItem(serviceType: string): ServiceCategory {
    const lower = serviceType.toLowerCase();
    if (lower.includes('blood') || lower.includes('lab') || lower.includes('test')) return 'blood-test';
    if (lower.includes('wellness') || lower.includes('supplement') || lower.includes('vitamin') || lower.includes('product')) return 'wellness';
    if (lower.includes('doctor') || lower.includes('consult')) return 'doctor';
    if (lower.includes('nurse')) return 'nurse';
    if (lower.includes('service') || lower.includes('concierge')) return 'service';
    return 'other';
}

export default function CartScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const { 
        items, removeItem, clearCategory, selectedItemIds, toggleItemSelection, 
        selectItemsOfCategory, isItemSelected 
    } = useCart();

    const getCategoryLabel = (category: ServiceCategory) => {
        return t(`cart.category_${category === 'blood-test' ? 'bloodwork' : category === 'service' ? 'services' : category}`);
    };
    const { profile } = useUser();
    const [showMixedCartInfo, setShowMixedCartInfo] = useState(false);
    const [disabledProductIds, setDisabledProductIds] = useState<Set<string>>(new Set());

    // Check for active subscription/plan
    const hasActivePlan = profile?.subscriptions?.some((s: any) => s.status === 'ACTIVE');
    const activePlanId = profile?.subscriptions?.find((s: any) => s.status === 'ACTIVE')?.id;

    const TAB_BAR_HEIGHT = 83;

    // Check product status on mount and when items change
    useEffect(() => {
        const checkProductStatus = async () => {
            const wellnessItems = items.filter(i => categorizeItem(i.serviceType) === 'wellness');
            if (wellnessItems.length === 0) {
                setDisabledProductIds(new Set());
                return;
            }
            try {
                const res = await storeService.getProducts({ limit: 1000 });
                const disabledIds = new Set<string>();
                wellnessItems.forEach(item => {
                    const product = (res.data || []).find(p => p.id === item.id);
                    if (!product || !product.isEnabled) {
                        disabledIds.add(item.id);
                    }
                });
                setDisabledProductIds(disabledIds);
            } catch (e) {
                console.warn('Failed to check product status:', e);
            }
        };
        checkProductStatus();
    }, [items]);

    // Group items by category
    const groupedByCategory = items.reduce((acc, item) => {
        const category = categorizeItem(item.serviceType);
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {} as Record<ServiceCategory, typeof items>);

    const categories = Object.keys(groupedByCategory) as ServiceCategory[];
    const isMixedCart = categories.length > 1;

    const subtotal    = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const taxes       = Math.round(subtotal * 0.18);
    const platformFee = items.length > 0 ? 49 : 0;
    const grandTotal  = subtotal + taxes + platformFee;

    if (items.length === 0) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <StatusBar style="dark" />
                <View style={styles.emptyHeader}>
                    <Text style={styles.emptyHeaderTitle}>{t('cart.header_title')}</Text>
                </View>
                <View style={styles.emptyBody}>
                    <MaterialCommunityIcons name="cart-off" size={72} color="#E0E0E0" />
                    <Text style={styles.emptyTitle}>{t('cart.empty_title')}</Text>
                    <Text style={styles.emptySubtitle}>{t('cart.empty_subtitle')}</Text>
                    <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/')}>
                        <Text style={styles.browseBtnText}>{t('cart.browse_services')}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const handleCategoryCheckout = (category: ServiceCategory) => {
        const config = CATEGORY_CONFIG[category];
        const categoryItems = groupedByCategory[category];
        const categorySelectedItems = categoryItems.filter(item => selectedItemIds.includes(item.id));

        // Check if any wellness items are disabled
        if (category === 'wellness') {
            const disabledItems = categorySelectedItems.filter(item => disabledProductIds.has(item.id));
            if (disabledItems.length > 0) {
                Alert.alert(
                    t('checkout.products_unavailable'),
                    t('checkout.products_unavailable_msg'),
                    [
                        { text: t('common.remove'), onPress: () => disabledItems.forEach(i => removeItem(i.id)) },
                        { text: t('common.keep'), style: 'cancel' },
                    ]
                );
                return;
            }
        }

        const categoryTotal = categorySelectedItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

        if (category === 'blood-test') {
            router.push({
                pathname: '/payment/checkout',
                params: {
                    category: 'blood-test',
                    amount: String(categoryTotal),
                    label: t('cart.blood_test_package'),
                    itemCount: categorySelectedItems.length,
                    skipUpsell: '1',
                    selectedItemIds: categorySelectedItems.map(i => i.id).join(','),
                },
            } as any);
        } else if (category === 'doctor') {
            // Doctor booking → doctor-visit screen with plan info
            router.push({
                pathname: config.checkoutFlow as any,
                params: {
                    ...(hasActivePlan && activePlanId && { subscriptionId: activePlanId }),
                },
            } as any);
        } else if (category === 'nurse' || category === 'service') {
            // Service bookings → all-ayuxa-services or specific service screen with plan info
            router.push({
                pathname: config.checkoutFlow as any,
                params: {
                    ...(hasActivePlan && activePlanId && { subscriptionId: activePlanId }),
                },
            } as any);
        } else {
            // Products/Wellness: use payment checkout with plan info for benefit calculation
            router.push({
                pathname: config.checkoutFlow as any,
                params: {
                    amount: String(categoryTotal),
                    label: getCategoryLabel(category),
                    category,
                    itemCount: categorySelectedItems.length,
                    selectedItemIds: categorySelectedItems.map(i => i.id).join(','),
                    // Pass plan info for benefit calculation at checkout
                    ...(hasActivePlan && activePlanId && { subscriptionId: activePlanId }),
                    skipUpsell: hasActivePlan ? '1' : '0',
                },
            } as any);
        }
    };

    const handleCheckoutAll = () => {
        const selectedItems = items.filter(i => selectedItemIds.includes(i.id));
        const selectedTotal = selectedItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

        // Check for disabled wellness products among selected items
        const disabledSelected = selectedItems.filter(item => disabledProductIds.has(item.id));
        if (disabledSelected.length > 0) {
            Alert.alert(
                t('checkout.products_unavailable'),
                t('checkout.products_unavailable_msg'),
                [
                    { text: t('common.remove'), onPress: () => disabledSelected.forEach(i => removeItem(i.id)) },
                    { text: t('common.keep'), style: 'cancel' },
                ]
            );
            return;
        }

        // Navigate to payment checkout
        router.push({
            pathname: '/payment/checkout',
            params: {
                category: 'all',
                amount: String(selectedTotal),
                label: t('cart.checkout_all_label') || 'Combined Checkout',
                itemCount: selectedItems.length,
                selectedItemIds: selectedItems.map(i => i.id).join(','),
                ...(hasActivePlan && activePlanId && { subscriptionId: activePlanId }),
                skipUpsell: '1',
            },
        } as any);
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('cart.header_title')}</Text>
                <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{items.length} {items.length === 1 ? t('cart.item').toLowerCase() : t('cart.items').toLowerCase()}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scroll, { paddingBottom: 20 + TAB_BAR_HEIGHT }]}
            >
                {/* ── Active Plan Benefit Banner ── */}
                {hasActivePlan && (
                    <View style={styles.benefitBanner}>
                        <View style={styles.benefitContent}>
                            <Ionicons name="star" size={20} color="#10B981" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.benefitTitle}>{t('cart.plan_benefits_active')}</Text>
                                <Text style={styles.benefitText}>{t('cart.plan_benefits_desc')}</Text>
                            </View>
                            <View style={styles.benefitBadge}>
                                <Text style={styles.benefitBadgeText}>{t('cart.active')}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* ── Mixed Cart Warning ── */}
                {isMixedCart && !showMixedCartInfo && (
                    <TouchableOpacity
                        style={styles.mixedCartBanner}
                        onPress={() => setShowMixedCartInfo(true)}
                    >
                        <View style={styles.mixedCartContent}>
                            <Ionicons name="information-circle" size={20} color="#F59E0B" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.mixedCartTitle}>{t('cart.mixed_cart')}</Text>
                                <Text style={styles.mixedCartText}>{t('cart.mixed_cart_desc')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* ── Category Sections ── */}
                {categories.map(category => {
                    const categoryItems = groupedByCategory[category];
                    const categorySelectedItems = categoryItems.filter(item => selectedItemIds.includes(item.id));
                    const categoryTotal = categorySelectedItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
                    const config = CATEGORY_CONFIG[category];

                    return (
                        <View key={category} style={styles.categorySection}>
                            {/* Category Header */}
                            <View style={[styles.categoryHeader, { borderLeftColor: config.color }]}>
                                <TouchableOpacity 
                                    onPress={() => {
                                        const isAllSelected = categoryItems.every(i => selectedItemIds.includes(i.id));
                                        selectItemsOfCategory(category, !isAllSelected);
                                    }}
                                    style={{ marginRight: 8 }}
                                >
                                    <Ionicons 
                                        name={categoryItems.every(i => selectedItemIds.includes(i.id)) ? "checkmark-circle" : "ellipse-outline"} 
                                        size={22} 
                                        color={categoryItems.every(i => selectedItemIds.includes(i.id)) ? config.color : colors.textMuted} 
                                    />
                                </TouchableOpacity>
                                <View style={[styles.categoryIcon, { backgroundColor: `${config.color}15` }]}>
                                    <MaterialCommunityIcons name={config.icon as any} size={20} color={config.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.categoryTitle}>{getCategoryLabel(category)}</Text>
                                    <Text style={styles.categoryItemCount}>
                                        {categoryItems.length} {categoryItems.length === 1 ? t('cart.item').toLowerCase() : t('cart.items').toLowerCase()}
                                    </Text>
                                </View>
                                <Text style={styles.categoryTotal}>₹{categoryTotal.toLocaleString('en-IN')}</Text>
                            </View>

                            {/* Category Items */}
                            <View style={styles.itemsContainer}>
                                {categoryItems.map(item => {
                                    const icon = SERVICE_ICON[item.serviceType] || 'medical-bag';
                                    const itemTotal = (item.price || 0) * (item.quantity || 1);
                                    const isDisabled = disabledProductIds.has(item.id);
                                    return (
                                        <View key={item.id} style={[styles.cartItem, isDisabled && styles.cartItemDisabled]}>
                                            {isDisabled && (
                                                <View style={styles.disabledOverlay}>
                                                    <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                                                    <Text style={styles.disabledLabel}>{t('cart.no_longer_available')}</Text>
                                                </View>
                                            )}
                                            <View style={[styles.itemContent, isDisabled && { opacity: 0.5 }]}>
                                                <TouchableOpacity 
                                                    onPress={() => !isDisabled && toggleItemSelection(item.id)}
                                                    disabled={isDisabled}
                                                    style={{ marginRight: 8, justifyContent: 'center' }}
                                                >
                                                    <Ionicons 
                                                        name={selectedItemIds.includes(item.id) ? "checkmark-circle" : "ellipse-outline"} 
                                                        size={20} 
                                                        color={selectedItemIds.includes(item.id) ? config.color : colors.textMuted} 
                                                    />
                                                </TouchableOpacity>
                                                <View style={[styles.itemIcon, { backgroundColor: `${config.color}08` }]}>
                                                    <MaterialCommunityIcons name={icon as any} size={18} color={config.color} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                                                    {item.details?.when && (
                                                        <Text style={styles.itemMeta} numberOfLines={1}>
                                                            {item.details.when}
                                                        </Text>
                                                    )}
                                                </View>
                                                <TouchableOpacity onPress={() => removeItem(item.id)}>
                                                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.itemPrice}>
                                                <Text style={styles.itemPriceText}>
                                                    {itemTotal > 0 ? `₹${itemTotal.toLocaleString('en-IN')}` : 'TBD'}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Category Checkout Button */}
                            <TouchableOpacity
                                style={[
                                    styles.categoryCheckoutBtn, 
                                    { backgroundColor: config.color },
                                    categorySelectedItems.length === 0 && { backgroundColor: colors.borderLight, opacity: 0.5 }
                                ]}
                                onPress={() => handleCategoryCheckout(category)}
                                disabled={categorySelectedItems.length === 0}
                                activeOpacity={0.88}
                            >
                                <Ionicons name="arrow-forward" size={16} color={categorySelectedItems.length === 0 ? colors.textMuted : "#fff"} />
                                <Text style={[styles.categoryCheckoutText, categorySelectedItems.length === 0 && { color: colors.textMuted }]}>{t('cart.checkout')}</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* ── Grand Total & Checkout All ── */}
                {items.filter(i => selectedItemIds.includes(i.id)).length > 0 && (
                    <View style={styles.grandTotalContainer}>
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>{t('cart.selected_total') || 'Selected Total'}</Text>
                            <Text style={styles.grandTotalValue}>₹{items.filter(i => selectedItemIds.includes(i.id)).reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0).toLocaleString('en-IN')}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.checkoutAllBtn}
                            onPress={() => handleCheckoutAll()}
                            activeOpacity={0.88}
                        >
                            <Ionicons name="cart" size={18} color="#fff" />
                            <Text style={styles.checkoutAllBtnText}>
                                {t('cart.checkout_all')?.replace(' (Coming Soon)', '') || 'Checkout All'} ({items.filter(i => selectedItemIds.includes(i.id)).length})
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Trust Row ── */}
                <View style={styles.trustRow}>
                    {[
                        { icon: 'lock-closed-outline', key: 'secure_payment', label: t('cart.secure_payment') },
                        { icon: 'shield-checkmark-outline', key: 'verified', label: t('cart.verified') },
                        { icon: 'flash-outline', key: 'quick', label: t('cart.quick') },
                    ].map(({ icon, key, label }) => (
                        <View key={key} style={styles.trustItem}>
                            <Ionicons name={icon as any} size={16} color={colors.primary} />
                            <Text style={styles.trustLabel}>{label}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },

    // Empty state
    emptyHeader: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.bgCard,
    },
    emptyHeaderTitle: { fontFamily: Fonts.semiBold, fontSize: 20, color: colors.textDark },
    emptyBody: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 10 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 20, color: colors.textDark, marginTop: 12 },
    emptySubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textMuted },
    browseBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.primary, borderRadius: Radius.lg,
        paddingVertical: 14, paddingHorizontal: 28, marginTop: 16,
    },
    browseBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: '#fff' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: 20, color: colors.textDark },
    headerBadge: {
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(4,131,87,0.1)',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    headerBadgeText: { fontFamily: Fonts.semiBold, fontSize: 12, color: colors.primary },

    scroll: { paddingTop: Spacing.md, paddingHorizontal: Spacing.md, gap: Spacing.md },

    // Active plan benefit banner
    benefitBanner: {
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : '#F0FDF4',
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(52,199,89,0.2)' : '#DCFCE7',
        borderRadius: Radius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    benefitContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    benefitTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: isDarkMode ? '#4FD485' : '#065F46' },
    benefitText: { fontFamily: Fonts.regular, fontSize: 12, color: isDarkMode ? '#AEF5C0' : '#047857' },
    benefitBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    benefitBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10, color: '#fff' },

    // Mixed cart banner
    mixedCartBanner: {
        backgroundColor: isDarkMode ? 'rgba(245,158,11,0.1)' : '#FFFBEB',
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(245,158,11,0.2)' : '#FEF3C7',
        borderRadius: Radius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    mixedCartContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    mixedCartTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: isDarkMode ? '#FFC107' : '#92400E' },
    mixedCartText: { fontFamily: Fonts.regular, fontSize: 12, color: isDarkMode ? '#FFE0B2' : '#B45309' },

    // Category Section
    grandTotalContainer: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginTop: Spacing.xs,
        ...Shadow.card,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    grandTotalLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 16,
        color: colors.textDark,
    },
    grandTotalValue: {
        fontFamily: Fonts.bold,
        fontSize: 20,
        color: colors.primary,
    },
    checkoutAllBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: Radius.md,
    },
    checkoutAllBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: 15,
        color: '#fff',
    },
    categorySection: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...Shadow.card,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
        borderLeftWidth: 4,
        backgroundColor: colors.bgCardMuted,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: colors.textDark },
    categoryItemCount: { fontFamily: Fonts.regular, fontSize: 12, color: colors.textMuted },
    categoryTotal: { fontFamily: Fonts.semiBold, fontSize: 16, color: colors.textDark },

    // Items container
    itemsContainer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.xs,
    },
    cartItem: {
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        position: 'relative',
    },
    cartItemDisabled: {
        backgroundColor: colors.bgCardMuted,
    },
    disabledOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: Spacing.md,
        zIndex: 10,
        gap: 6,
    },
    disabledLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
        color: '#EF4444',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemTitle: { fontFamily: Fonts.medium, fontSize: 13, color: colors.textDark },
    itemMeta: { fontFamily: Fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
    itemPrice: {
        paddingLeft: 40,
        paddingBottom: Spacing.xs,
    },
    itemPriceText: { fontFamily: Fonts.semiBold, fontSize: 13, color: colors.primary },

    // Category Checkout Button
    categoryCheckoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        paddingVertical: 12,
        borderRadius: Radius.md,
    },
    categoryCheckoutText: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#fff' },

    // Trust
    trustRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: colors.bgCard,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginTop: Spacing.sm,
    },
    trustItem: { alignItems: 'center', gap: 4 },
    trustLabel: { fontFamily: Fonts.regular, fontSize: 10, color: colors.textMuted, textAlign: 'center' },
});

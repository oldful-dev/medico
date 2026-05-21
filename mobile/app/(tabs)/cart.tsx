import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { LinearGradient } from 'expo-linear-gradient';

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
    if (lower.includes('wellness') || lower.includes('supplement') || lower.includes('vitamin')) return 'wellness';
    if (lower.includes('doctor') || lower.includes('consult')) return 'doctor';
    if (lower.includes('nurse')) return 'nurse';
    if (lower.includes('service') || lower.includes('concierge')) return 'service';
    return 'other';
}

export default function CartScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { items, removeItem, clearCategory } = useCart();
    const [showMixedCartInfo, setShowMixedCartInfo] = useState(false);

    const TAB_BAR_HEIGHT = 83;

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
                    <Text style={styles.emptyHeaderTitle}>Cart</Text>
                </View>
                <View style={styles.emptyBody}>
                    <MaterialCommunityIcons name="cart-off" size={72} color="#E0E0E0" />
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySubtitle}>Add a service to get started</Text>
                    <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/')}>
                        <Text style={styles.browseBtnText}>Browse Services</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const handleCategoryCheckout = (category: ServiceCategory) => {
        const config = CATEGORY_CONFIG[category];
        const categoryItems = groupedByCategory[category];
        const categoryTotal = categoryItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

        if (category === 'blood-test') {
            // Blood test has its own flow
            router.push(config.checkoutFlow as any);
        } else if (category === 'doctor') {
            // Doctor booking has its own flow
            router.push(config.checkoutFlow as any);
        } else if (category === 'nurse' || category === 'service') {
            // Service bookings
            router.push(config.checkoutFlow as any);
        } else {
            // Products/Wellness: use payment checkout
            router.push({
                pathname: config.checkoutFlow as any,
                params: {
                    amount: String(categoryTotal),
                    label: config.label,
                    category,
                    itemCount: categoryItems.length,
                },
            } as any);
        }
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Cart</Text>
                <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{items.length} item{items.length > 1 ? 's' : ''}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scroll, { paddingBottom: 20 + TAB_BAR_HEIGHT }]}
            >
                {/* ── Mixed Cart Warning ── */}
                {isMixedCart && !showMixedCartInfo && (
                    <TouchableOpacity
                        style={styles.mixedCartBanner}
                        onPress={() => setShowMixedCartInfo(true)}
                    >
                        <View style={styles.mixedCartContent}>
                            <Ionicons name="information-circle" size={20} color="#F59E0B" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.mixedCartTitle}>Mixed Cart</Text>
                                <Text style={styles.mixedCartText}>Checkout separately for each category</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* ── Category Sections ── */}
                {categories.map(category => {
                    const categoryItems = groupedByCategory[category];
                    const categoryTotal = categoryItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
                    const config = CATEGORY_CONFIG[category];

                    return (
                        <View key={category} style={styles.categorySection}>
                            {/* Category Header */}
                            <View style={[styles.categoryHeader, { borderLeftColor: config.color }]}>
                                <View style={[styles.categoryIcon, { backgroundColor: `${config.color}15` }]}>
                                    <MaterialCommunityIcons name={config.icon as any} size={20} color={config.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.categoryTitle}>{config.label}</Text>
                                    <Text style={styles.categoryItemCount}>
                                        {categoryItems.length} item{categoryItems.length > 1 ? 's' : ''}
                                    </Text>
                                </View>
                                <Text style={styles.categoryTotal}>₹{categoryTotal.toLocaleString('en-IN')}</Text>
                            </View>

                            {/* Category Items */}
                            <View style={styles.itemsContainer}>
                                {categoryItems.map(item => {
                                    const icon = SERVICE_ICON[item.serviceType] || 'medical-bag';
                                    const itemTotal = (item.price || 0) * (item.quantity || 1);
                                    return (
                                        <View key={item.id} style={styles.cartItem}>
                                            <View style={styles.itemContent}>
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
                                style={[styles.categoryCheckoutBtn, { backgroundColor: config.color }]}
                                onPress={() => handleCategoryCheckout(category)}
                                activeOpacity={0.88}
                            >
                                <Ionicons name="arrow-forward" size={16} color="#fff" />
                                <Text style={styles.categoryCheckoutText}>Checkout</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* ── Trust Row ── */}
                <View style={styles.trustRow}>
                    {[
                        { icon: 'lock-closed-outline', label: 'Secure Payment' },
                        { icon: 'shield-checkmark-outline', label: 'Verified' },
                        { icon: 'flash-outline', label: 'Quick' },
                    ].map(({ icon, label }) => (
                        <View key={label} style={styles.trustItem}>
                            <Ionicons name={icon as any} size={16} color={Colors.primary} />
                            <Text style={styles.trustLabel}>{label}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F7F8FA' },

    // Empty state
    emptyHeader: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBEB',
        backgroundColor: '#fff',
    },
    emptyHeaderTitle: { fontFamily: Fonts.semiBold, fontSize: 20, color: Colors.textBody },
    emptyBody: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 10 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 20, color: Colors.textBody, marginTop: 12 },
    emptySubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textMuted },
    browseBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.primary, borderRadius: Radius.lg,
        paddingVertical: 14, paddingHorizontal: 28, marginTop: 16,
    },
    browseBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: '#fff' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
    },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: 20, color: Colors.textBody },
    headerBadge: {
        backgroundColor: 'rgba(4,131,87,0.1)',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    headerBadgeText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.primary },

    scroll: { paddingTop: Spacing.md, paddingHorizontal: Spacing.md, gap: Spacing.md },

    // Mixed cart banner
    mixedCartBanner: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FEF3C7',
        borderRadius: Radius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    mixedCartContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    mixedCartTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#92400E' },
    mixedCartText: { fontFamily: Fonts.regular, fontSize: 12, color: '#B45309' },

    // Category Section
    categorySection: {
        backgroundColor: '#fff',
        borderRadius: Radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#EBEBEB',
        ...Shadow.card,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
        borderLeftWidth: 4,
        backgroundColor: '#FAFAFA',
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textBody },
    categoryItemCount: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
    categoryTotal: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textBody },

    // Items container
    itemsContainer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.xs,
    },
    cartItem: {
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
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
    itemTitle: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textBody },
    itemMeta: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
    itemPrice: {
        paddingLeft: 40,
        paddingBottom: Spacing.xs,
    },
    itemPriceText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.primary },

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
        backgroundColor: '#fff',
        borderRadius: Radius.lg,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: '#EBEBEB',
        marginTop: Spacing.sm,
    },
    trustItem: { alignItems: 'center', gap: 4 },
    trustLabel: { fontFamily: Fonts.regular, fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
});

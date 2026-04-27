import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { LinearGradient } from 'expo-linear-gradient';

const SERVICE_ICON: Record<string, string> = {
    'doctor-visit':   'stethoscope',
    'nurse-care':     'medical-bag',
    'transportation': 'car-estate',
    'insurance':      'shield-check',
    'blood-test':     'test-tube',
    'product':        'package-variant',
};

export default function CartScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { items, removeItem } = useCart();

    const TAB_BAR_HEIGHT = 83;

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
                contentContainerStyle={[styles.scroll, { paddingBottom: 80 + TAB_BAR_HEIGHT }]}
            >
                {/* ── Cart Items ── */}
                <View style={styles.section}>
                    {items.map(item => {
                        const icon = SERVICE_ICON[item.serviceType] || 'medical-bag';
                        const itemTotal = (item.price || 0) * (item.quantity || 1);
                        return (
                            <View key={item.id} style={styles.card}>
                                {/* Icon + Info */}
                                <View style={styles.cardRow}>
                                    <View style={styles.iconBox}>
                                        <MaterialCommunityIcons name={icon as any} size={22} color={Colors.primary} />
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                                        {item.details?.when && (
                                            <View style={styles.metaRow}>
                                                <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                                                <Text style={styles.metaText}>{item.details.when}</Text>
                                            </View>
                                        )}
                                        {item.details?.address && (
                                            <View style={styles.metaRow}>
                                                <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                                <Text style={styles.metaText} numberOfLines={1}>{item.details.address}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>

                                {/* Divider + Price */}
                                <View style={styles.cardFooter}>
                                    {(item.quantity || 1) > 1 && (
                                        <Text style={styles.qtyText}>₹{item.price} × {item.quantity}</Text>
                                    )}
                                    <Text style={styles.itemPrice}>
                                        {itemTotal > 0 ? `₹${itemTotal.toLocaleString('en-IN')}` : 'Price on confirmation'}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* ── Bill Summary ── */}
                <View style={styles.billCard}>
                    <Text style={styles.billTitle}>Bill Summary</Text>

                    <View style={styles.billRows}>
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Item Total</Text>
                            <Text style={styles.billValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>GST & Service Tax (18%)</Text>
                            <Text style={styles.billValue}>₹{taxes.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Platform Fee</Text>
                            <Text style={styles.billValue}>₹{platformFee}</Text>
                        </View>
                    </View>

                    <View style={styles.billDivider} />

                    <View style={styles.billRow}>
                        <Text style={styles.grandLabel}>Total Payable</Text>
                        <Text style={styles.grandValue}>₹{grandTotal.toLocaleString('en-IN')}</Text>
                    </View>
                </View>

                {/* ── Trust row ── */}
                <View style={styles.trustRow}>
                    {[
                        { icon: 'lock-closed-outline', label: 'Secure Payment' },
                        { icon: 'shield-checkmark-outline', label: 'Verified Providers' },
                        { icon: 'flash-outline', label: 'Quick Setup' },
                    ].map(({ icon, label }) => (
                        <View key={label} style={styles.trustItem}>
                            <Ionicons name={icon as any} size={18} color={Colors.primary} />
                            <Text style={styles.trustLabel}>{label}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* ── Sticky Footer ── */}
            <View style={[styles.footer, { bottom: TAB_BAR_HEIGHT, paddingBottom: 12 }]}>
                <View style={styles.footerLeft}>
                    <Text style={styles.footerLabel}>Grand Total</Text>
                    <Text style={styles.footerAmount}>₹{grandTotal.toLocaleString('en-IN')}</Text>
                </View>
                <TouchableOpacity
                    style={styles.checkoutBtn}
                    activeOpacity={0.88}
                    onPress={() => router.push({
                        pathname: '/payment/checkout',
                        params: { amount: String(grandTotal), label: 'Service Booking' },
                    })}
                >
                    <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.checkoutGradient}>
                        <Text style={styles.checkoutText}>Proceed to Pay</Text>
                        <Ionicons name="chevron-forward" size={18} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
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

    scroll: { paddingTop: Spacing.md },
    section: { paddingHorizontal: Spacing.md, gap: Spacing.sm },

    // Cart card
    card: {
        backgroundColor: '#fff',
        borderRadius: Radius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: '#EBEBEB',
        ...Shadow.card,
    },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    iconBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: 'rgba(4,131,87,0.08)',
        justifyContent: 'center', alignItems: 'center',
    },
    cardInfo: { flex: 1, gap: 4 },
    cardTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textBody, lineHeight: 20 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, flex: 1 },
    removeBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: '#FFF0F0',
        justifyContent: 'center', alignItems: 'center',
    },
    cardFooter: {
        flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
        gap: 8, marginTop: 10,
        paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    qtyText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
    itemPrice: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: Colors.textBody },

    // Bill Summary
    billCard: {
        margin: Spacing.md,
        backgroundColor: '#fff',
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: '#EBEBEB',
        ...Shadow.card,
    },
    billTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textBody, marginBottom: Spacing.md },
    billRows: { gap: 10, marginBottom: Spacing.md },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billLabel: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textMuted },
    billValue: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.textBody },
    billDivider: { height: 1, backgroundColor: '#EBEBEB', marginBottom: Spacing.md },
    grandLabel: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textBody },
    grandValue: { fontFamily: Fonts.semiBold, fontSize: 18, color: Colors.primary },

    // Trust
    trustRow: {
        flexDirection: 'row', justifyContent: 'space-around',
        marginHorizontal: Spacing.md, marginBottom: Spacing.md,
        backgroundColor: '#fff', borderRadius: Radius.lg,
        paddingVertical: Spacing.md,
        borderWidth: 1, borderColor: '#EBEBEB',
    },
    trustItem: { alignItems: 'center', gap: 6 },
    trustLabel: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, textAlign: 'center' },

    // Footer
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.lg, paddingTop: 14,
        backgroundColor: '#fff',
        borderTopWidth: 1, borderTopColor: '#EBEBEB',
        ...Shadow.header,
    },
    footerLeft: { flex: 1 },
    footerLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
    footerAmount: { fontFamily: Fonts.semiBold, fontSize: 20, color: Colors.textBody },
    checkoutBtn: { flex: 1.4, height: 52, borderRadius: Radius.lg, overflow: 'hidden' },
    checkoutGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    checkoutText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: '#fff' },
});

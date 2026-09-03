import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl, Platform, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { bookingService, Booking } from '@/services/api/bookingService';
import { storeService, ProductOrder } from '@/services/api/storeService';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { apiClient } from '@/services/api/apiClient';
import { PRODUCT_ORDER_TERMINAL, toDisplayStage } from '@/utils/productOrderStatus';

type TabType = 'Active' | 'Payment' | 'History' | 'Products';
type ProductFilterType = 'All' | 'Active' | 'Completed' | 'Cancelled';

const PRODUCT_STATUS_META: Record<string, { labelKey: string; bg: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    PENDING:    { labelKey: 'wellness.stage_placed',  bg: '#FFF8E1', color: '#F59E0B', icon: 'time-outline' },
    PAID:       { labelKey: 'wellness.stage_paid',  bg: '#EFF6FF', color: '#3B82F6', icon: 'checkmark-circle-outline' },
    CONFIRMED:  { labelKey: 'wellness.stage_confirmed',   bg: '#F5F3FF', color: '#8B5CF6', icon: 'cube-outline' },
    DISPATCHED: { labelKey: 'wellness.stage_dispatched',   bg: '#FFF7ED', color: '#F97316', icon: 'car-outline' },
    DELIVERED:  { labelKey: 'wellness.stage_delivered',    bg: '#ECFDF5', color: '#10B981', icon: 'checkmark-done-circle-outline' },
    CANCELLED:  { labelKey: 'wellness.stage_cancelled',    bg: '#FEF2F2', color: '#EF4444', icon: 'close-circle-outline' },
};

/**
 * ORDER HISTORY — Service Bookings + Product Orders
 * Tabs: Active | Payment | History | Products
 */
export default function OrderHistoryScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);

    const params = useLocalSearchParams<{ tab?: string }>();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [productOrders, setProductOrders] = useState<ProductOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>((params.tab as TabType) || 'Active');
    const [productFilter, setProductFilter] = useState<ProductFilterType>('All');

    const fetchAll = useCallback(async () => {
        try {
            if (!refreshing) setLoading(true);
            const [bookRes, orderRes] = await Promise.allSettled([
                bookingService.getMyBookings(),
                storeService.getMyOrders({ limit: 50 }),
            ]);
            if (bookRes.status === 'fulfilled' && bookRes.value.success && bookRes.value.data) {
                setBookings(bookRes.value.data);
            }
            if (orderRes.status === 'fulfilled' && orderRes.value.success && orderRes.value.data) {
                setProductOrders(Array.isArray(orderRes.value.data) ? orderRes.value.data : []);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

    const onRefresh = () => { setRefreshing(true); fetchAll(); };

    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

    const isPastBooking = (booking: Booking) => {
        const scheduledDate = new Date(booking.scheduledDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return scheduledDate < today;
    };

    const handleCancel = (booking: Booking) => {
        const isStale = isPastBooking(booking);
        const message = isStale
            ? `Cancel booking #${booking.bookingCode}? The service date has passed. If you paid online, a refund will be initiated.`
            : `Cancel booking #${booking.bookingCode}? This cannot be undone.`;
        Alert.alert('Cancel Booking', message, [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Cancel Booking', style: 'destructive',
                onPress: async () => {
                    try {
                        setCancellingId(booking.id);
                        const res = await bookingService.cancelBooking(booking.id);
                        if (res.success) {
                            setBookings(prev => prev.map(b =>
                                b.id === booking.id ? { ...b, status: 'CANCELLED' } : b
                            ));
                            Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.' +
                                (isStale ? '\n\nIf a payment was made, a refund will be processed.' : ''));
                        } else {
                            Alert.alert('Error', 'Could not cancel booking. Please contact support.');
                        }
                    } catch {
                        Alert.alert('Error', 'Could not cancel booking. Please contact support.');
                    } finally {
                        setCancellingId(null);
                    }
                },
            },
        ]);
    };

    const handleDownloadOrderInvoice = async (order: ProductOrder) => {
        if (downloadingInvoiceId === order.id) return;
        setDownloadingInvoiceId(order.id);
        try {
            const token = apiClient.getAuthToken();
            const baseUrl = apiClient.getBaseUrl();
            const url = `${baseUrl}/orders/${order.id}/invoice`;
            const localUri = `${FileSystem.cacheDirectory}Invoice_${order.orderCode || order.id}.pdf`;

            const result = await FileSystem.downloadAsync(url, localUri, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (result.status !== 200) throw new Error(`Server ${result.status}`);

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(result.uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Invoice – ${order.orderCode || order.id}`,
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert('Invoice Downloaded', `Saved to: ${result.uri}`);
            }
        } catch (err: any) {
            console.error('[OrderHistory] Invoice download failed:', err);
            Alert.alert('Download Failed', 'Could not download invoice. Please try again.');
        } finally {
            setDownloadingInvoiceId(null);
        }
    };

    // ─── Filtering Logic ───
    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            if (activeTab === 'Active') {
                return ['CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING'].includes(b.status) && !isPastBooking(b);
            }
            if (activeTab === 'Payment') return ['PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(b.status);
            if (activeTab === 'History') {
                if (['COMPLETED', 'CANCELLED'].includes(b.status)) return true;
                if (['CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'].includes(b.status) && isPastBooking(b)) return true;
                return false;
            }
            return false;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [bookings, activeTab]);

    // ─── Product Orders Filtering ───
    // "Active" is everything not yet in a terminal state, rather than an
    // explicit list of in-progress statuses — a granular carrier status
    // (IN_TRANSIT, PICKED_UP, etc.) the app doesn't otherwise special-case
    // still counts as active instead of silently vanishing from every tab.
    const filteredProductOrders = useMemo(() => {
        return productOrders.filter(o => {
            if (productFilter === 'All') return true;
            if (productFilter === 'Active') return !PRODUCT_ORDER_TERMINAL.has(o.status);
            if (productFilter === 'Completed') return o.status === 'DELIVERED';
            if (productFilter === 'Cancelled') return o.status === 'CANCELLED' || o.status === 'RETURNED';
            return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [productOrders, productFilter]);

    // ─── Render Empty State ───
    const renderEmptyState = (message: string, sub: string, icon: keyof typeof Ionicons.glyphMap) => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name={icon} size={40} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{message}</Text>
            <Text style={styles.emptySubtitle}>{sub}</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/' as any)}>
                <Text style={styles.exploreBtnText}>
                    {activeTab === 'Products' ? t('order_history.shop_now') || 'Shop Now' : t('order_history.book_new_service') || 'Book New Service'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    // ─── Product Order Card ───
    const renderProductCard = (order: ProductOrder) => {
        const meta = PRODUCT_STATUS_META[order.status] || PRODUCT_STATUS_META[toDisplayStage(order.status)] || PRODUCT_STATUS_META.PENDING;
        const isActive = !PRODUCT_ORDER_TERMINAL.has(order.status);
        const items = Array.isArray(order.items) ? order.items : [];
        const itemCount = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);

        return (
            <TouchableOpacity
                key={order.id}
                style={styles.bookingCard}
                onPress={() => router.push({ pathname: '/order-tracking', params: { orderId: order.id } } as any)}
                activeOpacity={0.8}
                accessibilityLabel={`Order ${order.orderCode}`}
            >
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.serviceInfo}>
                        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                            <Ionicons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.serviceName}>
                                {order.product?.name
                                    ? order.product.name
                                    : items.length > 0
                                        ? `${items[0].name}${items.length > 1 ? t('order_history.more_items', { count: items.length - 1 }) : ''}`
                                        : t('order_history.wellness_product_fallback')}
                            </Text>
                            <Text style={styles.bookingCode}>#{order.orderCode}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.statusText, { color: meta.color }]}>{t(meta.labelKey) || meta.labelKey}</Text>
                    </View>
                </View>

                {/* Details */}
                <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.detailText}>
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            })}
                        </Text>
                    </View>
                    {order.courierName && (
                        <View style={styles.detailRow}>
                            <Ionicons name="cube-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.detailText}>{order.courierName}</Text>
                        </View>
                    )}
                    {order.awbCode && (
                        <View style={styles.detailRow}>
                            <Ionicons name="barcode-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.detailText}>AWB: {order.awbCode}</Text>
                        </View>
                    )}
                    {order.trackingStatus && (
                        <View style={styles.detailRow}>
                            <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.detailText}>{order.trackingStatus}</Text>
                        </View>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                    <Text style={styles.priceText}>₹{order.amount.toFixed(2)}</Text>
                    <View style={styles.footerActions}>
                        {isActive && (
                            <TouchableOpacity
                                style={styles.trackBtn}
                                onPress={() => router.push({ pathname: '/order-tracking', params: { orderId: order.id } } as any)}
                            >
                                <Ionicons name="navigate" size={13} color="#fff" />
                                <Text style={styles.trackBtnText}>{t('order_history.track_btn') || 'Track'}</Text>
                            </TouchableOpacity>
                        )}
                        {!['PENDING', 'CANCELLED', 'RETURNED'].includes(order.status) ? (
                            <TouchableOpacity
                                style={[styles.invoiceBtn, downloadingInvoiceId === order.id && { opacity: 0.6 }]}
                                onPress={() => handleDownloadOrderInvoice(order)}
                                disabled={downloadingInvoiceId === order.id}
                            >
                                {downloadingInvoiceId === order.id ? (
                                    <ActivityIndicator size="small" color="#02743F" />
                                ) : (
                                    <Ionicons name="receipt-outline" size={13} color="#02743F" />
                                )}
                                <Text style={styles.invoiceBtnText}>
                                    {downloadingInvoiceId === order.id ? '...' : 'Invoice'}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.screen}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* ─── Header ─── */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20) }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('order_history.header_title') || 'My Orders'}</Text>
            </View>

            {/* ─── Tab Bar ─── */}
            <View style={styles.tabBar}>
                {(['Active', 'Payment', 'History', 'Products'] as TabType[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                        accessibilityLabel={`${tab} tab`}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'Active' ? t('order_history.tab_active') || 'Active'
                                : tab === 'Payment' ? t('order_history.tab_payment') || 'Payment'
                                : tab === 'History' ? t('order_history.tab_history') || 'History'
                                : t('order_history.tab_products') || 'Products'}
                        </Text>
                        {activeTab === tab && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
                ) : activeTab === 'Products' ? (
                    // ── Products Tab ──────────────────────────────────────────
                    <>
                        {/* Product Status Filter Pills */}
                        <View style={styles.productFilterRow}>
                            {(['All', 'Active', 'Completed', 'Cancelled'] as ProductFilterType[]).map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.filterPill, productFilter === f && styles.filterPillActive]}
                                    onPress={() => setProductFilter(f)}
                                >
                                    <Text style={[styles.filterPillText, productFilter === f && styles.filterPillTextActive]}>
                                        {f}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {filteredProductOrders.length === 0
                            ? renderEmptyState(
                                productFilter === 'All'
                                    ? (t('order_history.empty_products_title') || 'No product orders yet')
                                    : `No ${productFilter.toLowerCase()} orders`,
                                productFilter === 'All'
                                    ? (t('order_history.empty_products_desc') || 'Shop our Wellness Store to see orders here.')
                                    : `Your ${productFilter.toLowerCase()} product orders will appear here.`,
                                'bag-outline'
                            )
                            : filteredProductOrders.map(renderProductCard)
                        }
                    </>
                ) : (
                    // ── Service Booking Tabs ──────────────────────────────────
                    filteredBookings.length === 0
                        ? renderEmptyState(
                            `No ${activeTab.toLowerCase()} bookings`,
                            'Your entries for this category will appear here once you take action.',
                            activeTab === 'History' ? 'receipt-outline' : 'calendar-clear-outline',
                        )
                        : filteredBookings.map((booking) => (
                            <TouchableOpacity
                                key={booking.id}
                                style={styles.bookingCard}
                                onPress={() => router.push({ pathname: '/service-confirmation', params: { bookingId: booking.id } })}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.serviceInfo}>
                                        <View style={styles.iconBox}>
                                            <MaterialCommunityIcons name="medical-bag" size={20} color={colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.serviceName}>{booking.service?.name || 'Service'}</Text>
                                            <Text style={styles.bookingCode}>#{booking.bookingCode}</Text>
                                        </View>
                                    </View>
                                    {(() => {
                                        const isStale = isPastBooking(booking) && ['CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'].includes(booking.status);
                                        const badgeBg = booking.status === 'COMPLETED' ? '#E8F5E9'
                                            : booking.status === 'CANCELLED' ? '#FFEBEE'
                                                : isStale ? '#FFF8E1' : '#FFF3E0';
                                        const badgeColor = booking.status === 'COMPLETED' ? '#2E7D32'
                                            : booking.status === 'CANCELLED' ? '#C62828'
                                                : isStale ? '#F57F17' : '#EF6C00';
                                        const badgeLabel = isStale ? 'AWAITING CLOSE' : booking.status.replace('_', ' ');
                                        return (
                                            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                                                <Text style={[styles.statusText, { color: badgeColor }]}>{badgeLabel}</Text>
                                            </View>
                                        );
                                    })()}
                                </View>

                                <View style={styles.cardDetails}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailText}>
                                            {new Date(booking.scheduledDate).toLocaleDateString([], {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                            })} • {booking.scheduledTime || 'ASAP'}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailText} numberOfLines={1}>{booking.addressLine || 'Home Address'}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <Text style={styles.priceText}>₹{booking.amount}</Text>
                                    <View style={styles.footerActions}>
                                        {activeTab === 'Payment' && (
                                            <TouchableOpacity
                                                style={styles.payBtn}
                                                onPress={() => router.push({
                                                    pathname: '/payment/checkout',
                                                    params: { bookingId: booking.id, amount: String(booking.amount), label: booking.service?.name },
                                                })}
                                            >
                                                <Text style={styles.payBtnText}>Pay Now</Text>
                                            </TouchableOpacity>
                                        )}
                                        {activeTab === 'History' && ['COMPLETED', 'CANCELLED'].includes(booking.status) && (
                                            <TouchableOpacity
                                                style={styles.rebookBtn}
                                                onPress={() => router.push('/' as any)}
                                            >
                                                <Text style={styles.rebookBtnText}>Re-order</Text>
                                            </TouchableOpacity>
                                        )}
                                        {(activeTab === 'Active' || activeTab === 'Payment' ||
                                            (activeTab === 'History' && !['COMPLETED', 'CANCELLED'].includes(booking.status))
                                        ) && (
                                            <TouchableOpacity
                                                style={styles.cancelBtn}
                                                onPress={() => handleCancel(booking)}
                                                disabled={cancellingId === booking.id}
                                            >
                                                {cancellingId === booking.id
                                                    ? <ActivityIndicator size="small" color="#E53935" />
                                                    : <Text style={styles.cancelBtnText}>Cancel</Text>
                                                }
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                )}
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 15,
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', marginRight: 8 },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: colors.textDark },
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 50 },

    /* Product Filter Pills */
    productFilterRow: {
        flexDirection: 'row', gap: 8, flexWrap: 'wrap',
        paddingBottom: 12, paddingTop: 4,
    },
    filterPill: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1, borderColor: colors.borderLight,
        backgroundColor: colors.bgCard,
    },
    filterPillActive: {
        borderColor: colors.primary,
        backgroundColor: isDark ? 'rgba(2,116,63,0.15)' : '#F0FDF4',
    },
    filterPillText: {
        fontFamily: Fonts.medium, fontSize: 13, color: colors.textMuted,
    },
    filterPillTextActive: {
        color: colors.primary, fontFamily: Fonts.bold,
    },

    /* Tab Bar */
    tabBar: {
        flexDirection: 'row', backgroundColor: colors.bgCard,
        paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
    tabItemActive: {},
    tabText: { fontFamily: Fonts.medium, fontSize: 12, color: colors.textMuted },
    tabTextActive: { color: colors.primary, fontFamily: Fonts.bold },
    tabUnderline: {
        position: 'absolute', bottom: 0, width: '70%', height: 3,
        backgroundColor: colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3,
    },

    /* Booking / Product Card */
    bookingCard: {
        backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: colors.borderLight,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 2 },
        }),
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
    serviceInfo: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
    iconBox: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(4,131,87,0.06)',
        justifyContent: 'center', alignItems: 'center',
    },
    serviceName: { fontFamily: Fonts.bold, fontSize: 15, color: colors.textDark, flexShrink: 1 },
    bookingCode: { fontFamily: Fonts.medium, fontSize: 11, color: colors.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontFamily: Fonts.bold, textTransform: 'uppercase' },

    cardDetails: { gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontFamily: Fonts.medium, fontSize: 12, color: colors.textMuted, flex: 1 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    footerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    priceText: { fontFamily: Fonts.bold, fontSize: 18, color: colors.textDark },

    trackBtn: {
        backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    trackBtnText: { color: '#FAF7ED', fontFamily: Fonts.bold, fontSize: 12 },
    invoiceBtn: {
        borderWidth: 1, borderColor: '#02743F',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: isDark ? 'rgba(2,116,63,0.1)' : '#F0FDF4',
    },
    invoiceBtnText: { color: '#02743F', fontFamily: Fonts.bold, fontSize: 12 },
    payBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 10 },
    payBtnText: { color: '#FAF7ED', fontFamily: Fonts.bold, fontSize: 13 },
    rebookBtn: { borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
    rebookBtnText: { color: colors.primary, fontFamily: Fonts.bold, fontSize: 12 },
    cancelBtn: { borderWidth: 1, borderColor: '#E53935', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, minWidth: 68, alignItems: 'center' },
    cancelBtnText: { color: '#E53935', fontFamily: Fonts.bold, fontSize: 12 },

    /* Empty State */
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyIconCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9F9F9',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 20, borderWidth: 1, borderColor: colors.borderLight,
    },
    emptyTitle: { fontFamily: Fonts.bold, fontSize: 18, color: colors.textDark, marginBottom: 8 },
    emptySubtitle: {
        fontFamily: Fonts.medium, fontSize: 13, color: colors.textMuted,
        textAlign: 'center', paddingHorizontal: 40, lineHeight: 18, marginBottom: 25,
    },
    exploreBtn: {
        backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 12,
        borderRadius: 15,
    },
    exploreBtnText: { fontFamily: Fonts.bold, color: '#FAF7ED', fontSize: 14 },
});

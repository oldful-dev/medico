// Order Tracking Screen
// Shows live Delhivery tracking for a product order with a visual timeline
import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Linking, Platform, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { storeService, ProductOrder, TrackingData, TrackingActivity } from '@/services/api/storeService';
import { Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { getAssetUrl } from '@/utils/getAssetUrl';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { apiClient } from '@/services/api/apiClient';
import { toDisplayStage } from '@/utils/productOrderStatus';

// ─── Status → Icon/Color mapping ────────────────
const STATUS_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; labelKey: string }> = {
    PENDING:    { icon: 'time-outline',          color: '#F59E0B', labelKey: 'wellness.stage_placed'   },
    PAID:       { icon: 'checkmark-circle-outline', color: '#3B82F6', labelKey: 'wellness.stage_paid' },
    CONFIRMED:  { icon: 'cube-outline',          color: '#8B5CF6', labelKey: 'wellness.stage_confirmed'    },
    DISPATCHED: { icon: 'car-outline',           color: '#F97316', labelKey: 'wellness.stage_dispatched'    },
    DELIVERED:  { icon: 'checkmark-done-circle', color: '#10B981', labelKey: 'wellness.stage_delivered'     },
    CANCELLED:  { icon: 'close-circle-outline',  color: '#EF4444', labelKey: 'wellness.stage_cancelled'     },
};

const ORDER_STAGES = ['PENDING', 'PAID', 'CONFIRMED', 'DISPATCHED', 'DELIVERED'] as const;

const formatEtd = (etd: string | number) => {
    try {
        const d = new Date(etd);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
        return '';
    }
};

const formatActivityDate = (dateStr: string | number) => {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return '—';
    }
};

export default function OrderTrackingScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const rupee = <Text style={{ fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' }}>₹</Text>;

    const [order, setOrder] = useState<ProductOrder | null>(null);
    const [tracking, setTracking] = useState<TrackingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);

    const fetchTracking = useCallback(async () => {
        if (!orderId) return;
        try {
            if (!refreshing) setLoading(true);
            setError(null);
            const res = await storeService.getOrderTracking(orderId);
            if (res.success && res.data) {
                setOrder(res.data.order);
                setTracking(res.data.tracking);
            } else {
                setError(t('wellness.load_tracking_error') || 'Could not load tracking information.');
            }
        } catch {
            setError(t('wellness.load_tracking_fail') || 'Failed to load tracking. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [orderId, refreshing, t]);

    useFocusEffect(useCallback(() => { fetchTracking(); }, [fetchTracking]));

    const onRefresh = () => { setRefreshing(true); fetchTracking(); };

    const handleDownloadInvoice = async () => {
        if (!order || downloadingInvoice) return;
        setDownloadingInvoice(true);
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
            console.error('[OrderTracking] Invoice download failed:', err);
            Alert.alert('Download Failed', 'Could not download invoice. Please try again.');
        } finally {
            setDownloadingInvoice(false);
        }
    };

    const currentStatus = order?.status || 'PENDING';
    const displayStatus = toDisplayStage(currentStatus);
    const statusMeta = STATUS_META[currentStatus] || STATUS_META[displayStatus] || STATUS_META.PENDING;
    const stageIndex = ORDER_STAGES.indexOf(displayStatus as any);

    // ─── Render ───────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={24} color={colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('wellness.track_order_title') || 'Track Order'}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>{t('wellness.fetching_tracking') || 'Fetching tracking details…'}</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="warning-outline" size={48} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchTracking}>
                        <Text style={styles.retryText}>{t('wellness.try_again') || 'Try Again'}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Status Hero Card */}
                    <View style={[styles.heroCard, { borderColor: statusMeta.color + '40' }]}>
                        <View style={[styles.heroIconCircle, { backgroundColor: statusMeta.color + '20' }]}>
                            <Ionicons name={statusMeta.icon} size={40} color={statusMeta.color} />
                        </View>
                        <Text style={[styles.heroStatus, { color: statusMeta.color }]}>{t(statusMeta.labelKey) || statusMeta.labelKey}</Text>
                        <Text style={styles.heroOrderCode}>{order?.orderCode}</Text>
                        {(() => {
                            const formatted = tracking?.etd ? formatEtd(tracking.etd) : '';
                            if (!formatted) return null;
                            return (
                                <View style={styles.etdRow}>
                                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                                    <Text style={styles.etdText}>
                                        {t('wellness.expected_by', { date: formatted }) || `Expected by ${formatted}`}
                                    </Text>
                                </View>
                            );
                        })()}
                        {order?.courierName && (
                            <Text style={styles.courierName}>📦 {order.courierName}</Text>
                        )}
                        {order?.awbCode && (
                            <Text style={styles.awbText}>{t('wellness.awb_code', { code: order.awbCode }) || `AWB: ${order.awbCode}`}</Text>
                        )}
                    </View>

                    {/* Progress Bar */}
                    {currentStatus !== 'CANCELLED' && currentStatus !== 'RETURNED' && (
                        <View style={styles.progressSection}>
                            <Text style={styles.sectionTitle}>{t('wellness.order_progress') || 'Order Progress'}</Text>
                            <View style={styles.progressRow}>
                                {ORDER_STAGES.map((stage, idx) => {
                                    const meta = STATUS_META[stage];
                                    const isCompleted = idx <= stageIndex;
                                    const isCurrent = idx === stageIndex;
                                    return (
                                        <React.Fragment key={stage}>
                                            <View style={styles.stageWrapper}>
                                                <View style={[
                                                    styles.stageCircle,
                                                    isCompleted && { backgroundColor: meta.color, borderColor: meta.color },
                                                    !isCompleted && { borderColor: colors.borderLight },
                                                ]}>
                                                    {isCompleted
                                                        ? <Ionicons name={meta.icon} size={16} color="#fff" />
                                                        : <View style={[styles.stageDot, { backgroundColor: colors.borderLight }]} />
                                                    }
                                                </View>
                                                <Text style={[
                                                    styles.stageLabel,
                                                    isCurrent && { color: meta.color, fontFamily: Fonts.bold },
                                                    !isCompleted && { color: colors.textMuted },
                                                ]} numberOfLines={2}>
                                                    {t(meta.labelKey) || meta.labelKey}
                                                </Text>
                                            </View>
                                            {idx < ORDER_STAGES.length - 1 && (
                                                <View style={[
                                                    styles.progressLine,
                                                    { backgroundColor: idx < stageIndex ? colors.primary : colors.borderLight },
                                                ]} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Product Details Section */}
                    {order && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('wellness.order_details') || 'Order Details'}</Text>
                            <View style={styles.card}>
                                {(() => {
                                    const items = Array.isArray(order.items) ? order.items : [];
                                    if (items.length > 0) {
                                        return items.map((item, idx) => (
                                            <View key={idx} style={[styles.productRow, idx > 0 && styles.productBorderTop]}>
                                                <Image
                                                    source={item.imageUrl ? { uri: getAssetUrl(item.imageUrl) } : require('@/assets/images/65a7d95e579c06bade85c7970d17cfcc5d7b7c55.png')}
                                                    style={styles.productImage}
                                                    resizeMode="cover"
                                                />
                                                <View style={styles.productMeta}>
                                                    <Text style={styles.productName}>{item.name}</Text>
                                                    {item.sku && <Text style={styles.productSku}>{t('wellness.sku') || 'SKU'}: {item.sku}</Text>}
                                                    <View style={styles.productPriceQty}>
                                                        <Text style={styles.productQty}>{t('wellness.qty') || 'Qty'}: {item.quantity || 1}</Text>
                                                        <Text style={styles.productPrice}>{rupee}{Number(item.price || 0).toLocaleString('en-IN')}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ));
                                    } else if (order.product) {
                                        return (
                                            <View style={styles.productRow}>
                                                <Image
                                                    source={order.product.imageUrl ? { uri: getAssetUrl(order.product.imageUrl) } : require('@/assets/images/65a7d95e579c06bade85c7970d17cfcc5d7b7c55.png')}
                                                    style={styles.productImage}
                                                    resizeMode="cover"
                                                />
                                                <View style={styles.productMeta}>
                                                    <Text style={styles.productName}>{order.product.name}</Text>
                                                    <View style={styles.productPriceQty}>
                                                        <Text style={styles.productQty}>{t('wellness.qty') || 'Qty'}: {order.quantity || 1}</Text>
                                                        <Text style={styles.productPrice}>{rupee}{Number((order.subtotal || 0) / (order.quantity || 1) || order.amount || 0).toLocaleString('en-IN')}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    }
                                    return null;
                                })()}
                            </View>
                        </View>
                    )}

                    {/* Delivery Address Section */}
                    {(() => {
                        let addrObj = null;
                        if (order?.address) {
                            try {
                                addrObj = JSON.parse(order.address);
                            } catch (e) {}
                        }
                        if (!addrObj) return null;
                        return (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t('wellness.delivery_address') || 'Delivery Address'}</Text>
                                <View style={styles.card}>
                                    <Text style={styles.addressName}>{addrObj.fullName || order?.user?.name || 'Customer'}</Text>
                                    <Text style={styles.addressText}>
                                        {addrObj.line1}
                                        {addrObj.line2 ? `, ${addrObj.line2}` : ''}
                                    </Text>
                                    {addrObj.landmark ? <Text style={styles.addressText}>{addrObj.landmark}</Text> : null}
                                    <Text style={styles.addressText}>
                                        {(addrObj.city || addrObj.cityName)}, {addrObj.state} - {addrObj.pincode}
                                    </Text>
                                    <Text style={styles.addressPhone}>📞 {addrObj.phone || order?.user?.phone || ''}</Text>
                                </View>
                            </View>
                        );
                    })()}

                    {/* Payment Summary Section */}
                    {order && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('wellness.payment_summary') || 'Payment Summary'}</Text>
                            <View style={styles.card}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{t('wellness.product_total') || 'Product Total'}</Text>
                                    <Text style={styles.summaryValue}>{rupee}{Number(order.subtotal || order.amount || 0).toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{t('wellness.tax_gst') || 'Taxes & GST'}</Text>
                                    <Text style={styles.summaryValue}>{rupee}{Number(order.tax || 0).toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{t('wellness.shipping_charges') || 'Shipping Charges'}</Text>
                                    <Text style={styles.summaryValue}>
                                        {Number(order.shippingCharge || 0) > 0 ? <>{rupee}{Number(order.shippingCharge).toLocaleString('en-IN')}</> : t('checkout.free') || 'FREE'}
                                    </Text>
                                </View>
                                {Number(order.discount || 0) > 0 && (
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { color: '#10B981' }]}>{t('wellness.discount') || 'Discount'}</Text>
                                        <Text style={[styles.summaryValue, { color: '#10B981' }]}>-{rupee}{Number(order.discount).toLocaleString('en-IN')}</Text>
                                    </View>
                                )}
                                <View style={styles.summaryDivider} />
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>{t('wellness.order_total') || 'Order Total'}</Text>
                                    <Text style={styles.totalValue}>{rupee}{Number(order.amount || 0).toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{t('wellness.payment_method') || 'Payment Method'}</Text>
                                    <Text style={styles.summaryValue}>
                                        {order.status === 'PENDING' && !order.awbCode 
                                            ? t('wellness.cash_on_delivery') || 'Cash on Delivery'
                                            : t('wellness.prepaid') || 'Prepaid'
                                        }
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Live Tracking Timeline */}
                    {tracking && tracking.activities?.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('wellness.track_order_title') || 'Tracking Timeline'}</Text>
                            {tracking.activities.map((activity: TrackingActivity, idx: number) => (
                                <View key={idx} style={styles.timelineItem}>
                                    <View style={styles.timelineLine}>
                                        <View style={[
                                            styles.timelineDot,
                                            idx === 0 && { backgroundColor: colors.primary, width: 14, height: 14 },
                                        ]} />
                                        {idx < tracking.activities.length - 1 && (
                                            <View style={[styles.timelineConnector, { backgroundColor: colors.borderLight }]} />
                                        )}
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.activityStatus}>{activity.status || activity.activity}</Text>
                                        {activity.location && (
                                            <View style={styles.locationRow}>
                                                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                                                <Text style={styles.activityLocation}>{activity.location}</Text>
                                            </View>
                                        )}
                                        <Text style={styles.activityDate}>
                                            {activity.date ? formatActivityDate(activity.date) : '—'}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* No tracking yet */}
                    {!tracking?.activities?.length && order?.awbCode && (
                        <View style={styles.noTrackingCard}>
                            <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
                            <Text style={styles.noTrackingText}>
                                {t('wellness.packing_status_msg') || "Your order is being packed. Tracking updates will appear once it's shipped."}
                            </Text>
                        </View>
                    )}

                    {/* Open Delhivery tracking link */}
                    {order?.trackingUrl && (
                        <TouchableOpacity
                            style={styles.trackBtn}
                            onPress={() => Linking.openURL(order.trackingUrl!)}
                            accessibilityLabel="Track on Delhivery"
                        >
                            <Ionicons name="open-outline" size={18} color="#fff" />
                            <Text style={styles.trackBtnText}>{t('wellness.track_on_courier_website') || 'Track on Courier Website'}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Download Invoice — shown for paid orders */}
                    {order && order.status !== 'PENDING' && order.status !== 'CANCELLED' && (
                        <TouchableOpacity
                            style={[styles.invoiceBtn, downloadingInvoice && { opacity: 0.6 }]}
                            onPress={handleDownloadInvoice}
                            disabled={downloadingInvoice}
                            accessibilityLabel="Download Invoice"
                        >
                            {downloadingInvoice ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                            )}
                            <Text style={styles.invoiceBtnText}>
                                {downloadingInvoice ? 'Generating Invoice...' : 'Download Invoice'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────
const makeStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bgScreen },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    backBtn: { width: 40, alignItems: 'flex-start' },
    headerTitle: { fontFamily: Fonts.bold, fontSize: FontSize.heading2, color: colors.textDark },
    scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: Spacing.xl },
    loadingText: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted },
    errorText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textDark, textAlign: 'center' },
    retryBtn: {
        backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: Radius.md,
    },
    retryText: { fontFamily: Fonts.bold, fontSize: FontSize.bodySmall, color: '#FAF7ED' },

    heroCard: {
        backgroundColor: colors.bgCard, borderRadius: Radius.lg, borderWidth: 1.5,
        padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 2 },
        }),
    },
    heroIconCircle: {
        width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    heroStatus: { fontFamily: Fonts.bold, fontSize: FontSize.heading1, marginBottom: 4 },
    heroOrderCode: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted, marginBottom: Spacing.sm },
    etdRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
    etdText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textMuted },
    courierName: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textDark, marginTop: 8 },
    awbText: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted, marginTop: 4 },

    progressSection: { marginBottom: Spacing.lg },
    sectionTitle: {
        fontFamily: Fonts.bold, fontSize: FontSize.body, color: colors.textDark,
        marginBottom: Spacing.md,
    },
    progressRow: { flexDirection: 'row', alignItems: 'flex-start' },
    stageWrapper: { alignItems: 'center', flex: 1 },
    stageCircle: {
        width: 36, height: 36, borderRadius: 18, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    },
    stageDot: { width: 8, height: 8, borderRadius: 4 },
    stageLabel: {
        fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textDark,
        textAlign: 'center',
    },
    progressLine: { flex: 1, height: 2, marginTop: 17 },

    section: { marginBottom: Spacing.lg },
    card: {
        backgroundColor: colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.borderLight,
        padding: Spacing.md,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 1 },
        }),
        marginBottom: Spacing.sm,
    },
    productRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'center' },
    productBorderTop: { borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: 8 },
    productImage: { width: 64, height: 64, borderRadius: Radius.md, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' },
    productMeta: { flex: 1, gap: 4 },
    productName: { fontFamily: Fonts.bold, fontSize: FontSize.bodySmall, color: colors.textDark },
    productSku: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted },
    productPriceQty: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    productQty: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.textMuted },
    productPrice: { fontFamily: Fonts.bold, fontSize: FontSize.bodySmall, color: colors.textDark },

    addressName: { fontFamily: Fonts.bold, fontSize: FontSize.bodySmall, color: colors.textDark, marginBottom: 4 },
    addressText: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.textMuted, lineHeight: 18 },
    addressPhone: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.textDark, marginTop: 6 },

    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    summaryLabel: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: colors.textMuted },
    summaryValue: { fontFamily: Fonts.bold, fontSize: FontSize.caption, color: colors.textDark },
    summaryDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    totalLabel: { fontFamily: Fonts.bold, fontSize: FontSize.body, color: colors.textDark },
    totalValue: { fontFamily: Fonts.bold, fontSize: FontSize.body, color: colors.primary },

    timelineItem: { flexDirection: 'row', marginBottom: Spacing.md },
    timelineLine: { width: 24, alignItems: 'center', marginRight: Spacing.md },
    timelineDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: colors.textMuted,
    },
    timelineConnector: { width: 2, flex: 1, marginTop: 4 },
    timelineContent: { flex: 1, paddingBottom: Spacing.md },
    activityStatus: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textDark },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    activityLocation: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted },
    activityDate: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted, marginTop: 2 },

    noTrackingCard: {
        backgroundColor: colors.bgCard, borderRadius: Radius.lg, padding: Spacing.xl,
        alignItems: 'center', gap: 12, marginBottom: Spacing.lg,
    },
    noTrackingText: {
        fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted,
        textAlign: 'center', lineHeight: 20,
    },
    trackBtn: {
        backgroundColor: colors.primary, borderRadius: Radius.md, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginBottom: Spacing.lg,
    },
    trackBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.body, color: '#FAF7ED' },
    invoiceBtn: {
        borderWidth: 1.5, borderColor: colors.primary, borderRadius: Radius.md,
        paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8, marginBottom: Spacing.md,
        backgroundColor: isDark ? 'rgba(2,116,63,0.1)' : '#F0FDF4',
    },
    invoiceBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.body, color: colors.primary },
});

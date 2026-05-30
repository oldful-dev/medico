import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { labService, LabOrderListItem } from '@/services/api/labService';
import { bookingService, Booking as ServiceBooking } from '@/services/api/bookingService';
import { meetupService } from '@/services/api/meetupService';
import { storeService, ProductOrder } from '@/services/api/storeService';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/context/CartContext';

const PRIMARY = '#02743F';
const PRIMARY_LIGHT = '#F0FAF4';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';

// ─── Category mapping from ServiceType ────────────────────────────────────────
const WELLNESS_TYPES = new Set([
    'DOCTOR_HOME_VISIT', 'HOME_NURSE', 'PHYSIO_FITNESS', 'HOSPITAL_TRIP', 'INSURANCE',
]);
const HEALTH_TYPES = new Set([
    'BLOOD_TEST', 'MEDICINES', 'EQUIPMENT_RENTAL',
]);

function serviceCategory(serviceType: string): 'wellness' | 'health' | 'concierge' {
    const t = serviceType?.toUpperCase();
    if (WELLNESS_TYPES.has(t)) return 'wellness';
    if (HEALTH_TYPES.has(t)) return 'health';
    return 'concierge';
}

// ─── Booking shape ─────────────────────────────────────────────────────────────
interface Booking {
    id: string;
    category: 'wellness' | 'health' | 'concierge' | 'meetup' | 'lab' | 'wellness_product';
    serviceName: string;
    bookingId: string;
    scheduledDate: string;
    scheduledTime?: string;
    rescheduledDate?: string;
    rescheduledTime?: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
    paymentStatus: 'pending' | 'paid' | 'failed';
    assignedPersonnel?: string;
    collectionType?: string;
    reportReady: boolean;
    reportUrl?: string;
    packageCode?: string;
    createdAt: string;
    // For service re-booking
    amount?: number;
    packagePrice?: number; // Redcliffe package cost (for lab rebook pricing)
    serviceId?: string;
    cityId?: string;
}

type FilterTab = 'all' | 'wellness' | 'health' | 'concierge' | 'upcoming' | 'completed' | 'cancelled' | 'rescheduled';

const TAB_CONFIG: { key: FilterTab; label: string; icon: string }[] = [
    { key: 'all',         label: 'All',         icon: 'layers-outline' },
    { key: 'wellness',    label: 'Wellness',     icon: 'heart-outline' },
    { key: 'health',      label: 'Health',       icon: 'fitness-outline' },
    { key: 'concierge',   label: 'Concierge',    icon: 'briefcase-outline' },
    { key: 'upcoming',    label: 'Upcoming',     icon: 'calendar-outline' },
    { key: 'completed',   label: 'Completed',    icon: 'checkmark-circle-outline' },
    { key: 'cancelled',   label: 'Cancelled',    icon: 'close-circle-outline' },
    { key: 'rescheduled', label: 'Rescheduled',  icon: 'refresh-circle-outline' },
];

const STATUS_META: Record<Booking['status'], { label: string; color: string }> = {
    confirmed:   { label: 'Confirmed',   color: '#059669' },
    pending:     { label: 'Pending',     color: '#D97706' },
    completed:   { label: 'Completed',   color: PRIMARY },
    cancelled:   { label: 'Cancelled',   color: '#EF4444' },
    rescheduled: { label: 'Rescheduled', color: '#7C3AED' },
};

const CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
    wellness:  { icon: 'heart',          color: '#EF4444', label: 'Wellness'  },
    health:    { icon: 'fitness',        color: '#3B82F6', label: 'Health'    },
    concierge: { icon: 'briefcase',      color: '#F59E0B', label: 'Concierge' },
    meetup:    { icon: 'people',         color: '#8B5CF6', label: 'Meetup'    },
    lab:       { icon: 'flask',          color: '#06B6D4', label: 'Lab Test'  },
    wellness_product: { icon: 'basket',  color: '#10B981', label: 'Product'   },
};

// ─── Normalizers ───────────────────────────────────────────────────────────────
function mapLabStatus(s: string): Booking['status'] {
    if (s === 'REPORT_GENERATED' || s === 'SAMPLE_COLLECTED') return 'completed';
    if (s === 'CANCELLED' || s === 'FAILED') return 'cancelled';
    if (s === 'RESCHEDULED') return 'rescheduled';
    if (s === 'CONFIRMED' || s === 'HOLD_CREATED') return 'confirmed';
    return 'pending';
}

function normalizeLabOrder(order: LabOrderListItem): Booking {
    const pkg = order.packages?.[0];
    const payment = order.payments?.[0];
    // pkg.cost = Redcliffe package price; payment.amount = actual paid amount
    const packagePrice = pkg?.cost || pkg?.price || pkg?.discounted_cost || 0;
    const paidAmount = payment?.amount || 0;
    return {
        id: order.id,
        category: 'lab',
        serviceName: pkg?.name || pkg?.packageName || 'Blood Test',
        bookingId: order.clientRefId,
        scheduledDate: order.slot?.date || '',
        scheduledTime: order.slot?.time,
        rescheduledDate: order.rescheduledDate,
        rescheduledTime: order.rescheduledTime,
        collectionType: order.bookingType === 'HOME' ? 'Home Collection' : 'Drop-off',
        status: mapLabStatus(order.status),
        paymentStatus: payment?.status === 'SUCCESS' ? 'paid' : payment?.status === 'FAILED' ? 'failed' : 'pending',
        reportReady: order.status === 'REPORT_GENERATED' && !!order.reportUrl,
        reportUrl: order.reportUrl,
        packageCode: pkg?.code || pkg?.packageCode || '',
        createdAt: order.createdAt,
        // Use paidAmount for display, packagePrice for rebook pricing
        amount: paidAmount || packagePrice,
        packagePrice,
    };
}

function mapServiceStatus(s: string): Booking['status'] {
    if (s === 'COMPLETED' || s === 'IN_PROGRESS') return 'completed';
    if (s === 'CANCELLED' || s === 'PAYMENT_FAILED' || s === 'SLA_BREACH') return 'cancelled';
    if (s === 'CONFIRMED' || s === 'ASSIGNED') return 'confirmed';
    return 'pending';
}

function normalizeServiceBooking(b: ServiceBooking): Booking {
    const rawType = b.service?.serviceType || 'MISC';
    const latestPayment = b.payments?.[0];
    const payStatus = latestPayment?.status === 'SUCCESS' ? 'paid'
        : latestPayment?.status === 'FAILED' ? 'failed'
        : 'pending';
    return {
        id: b.id,
        category: serviceCategory(rawType),
        serviceName: b.service?.name || 'Service',
        bookingId: b.bookingCode,
        scheduledDate: b.scheduledDate ? String(b.scheduledDate) : '',
        scheduledTime: b.scheduledTime ?? undefined,
        collectionType: b.addressLine ? 'Home Visit' : undefined,
        status: mapServiceStatus(b.status),
        paymentStatus: payStatus,
        assignedPersonnel: b.caregiver?.name ?? undefined,
        reportReady: false,
        createdAt: b.createdAt ? String(b.createdAt) : '',
        amount: b.amount || 0,
        serviceId: b.serviceId,
        cityId: b.cityId,
    };
}

function normalizeMeetup(reg: any): Booking {
    return {
        id: reg.id,
        category: 'meetup',
        serviceName: reg.meetup?.title || 'Local Meetup',
        bookingId: reg.bookingCode,
        scheduledDate: reg.meetup?.eventDate || '',
        scheduledTime: reg.meetup?.startTime ?? undefined,
        collectionType: reg.pickupEnabled ? 'Pickup' : 'Self Arranged',
        status: reg.status === 'CONFIRMED' || reg.status === 'ATTENDED' ? 'confirmed'
            : reg.status === 'CANCELLED' ? 'cancelled' : 'pending',
        paymentStatus: reg.paymentStatus === 'PAID' ? 'paid' : 'pending',
        reportReady: false,
        createdAt: reg.createdAt,
    };
}

function mapProductStatus(s: string): Booking['status'] {
    if (s === 'DELIVERED') return 'completed';
    if (s === 'CANCELLED') return 'cancelled';
    if (s === 'CONFIRMED' || s === 'DISPATCHED' || s === 'PAID') return 'confirmed';
    return 'pending';
}

function normalizeProductOrder(order: ProductOrder): Booking {
    const items = Array.isArray(order.items) ? order.items : [];
    let serviceName = '';
    if (order.product?.name) {
        serviceName = order.product.name;
    } else if (items.length > 0) {
        serviceName = items[0].name || 'Wellness Product';
        if (items.length > 1) {
            serviceName += ` + ${items.length - 1} more items`;
        }
    } else {
        serviceName = 'Wellness Product';
    }

    return {
        id: order.id,
        category: 'wellness_product',
        serviceName,
        bookingId: order.orderCode,
        scheduledDate: order.createdAt,
        status: mapProductStatus(order.status),
        paymentStatus: order.status === 'PENDING' ? 'pending' : (order.status === 'CANCELLED' ? 'failed' : 'paid'),
        reportReady: false,
        createdAt: order.createdAt,
        amount: order.amount,
    };
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function MyBookingsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
    const { addItem, clearCategory } = useCart();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<FilterTab>((initialTab as FilterTab) || 'all');
    const tabScrollRef = useRef<ScrollView>(null);

    useFocusEffect(useCallback(() => { fetchAll(); }, []));

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [labRes, svcRes, meetupRes, productRes] = await Promise.allSettled([
                labService.getUserLabOrders(),
                bookingService.getMyBookings(),
                meetupService.getMyRegistrations(),
                storeService.getMyOrders({ limit: 50 }),
            ]);
            const all: Booking[] = [];
            if (labRes.status === 'fulfilled' && labRes.value.success && Array.isArray(labRes.value.data))
                all.push(...(labRes.value.data as LabOrderListItem[]).map(normalizeLabOrder));
            if (svcRes.status === 'fulfilled' && svcRes.value.success && Array.isArray(svcRes.value.data))
                all.push(...(svcRes.value.data as ServiceBooking[]).map(normalizeServiceBooking));
            if (meetupRes.status === 'fulfilled' && meetupRes.value.success && Array.isArray(meetupRes.value.data))
                all.push(...(meetupRes.value.data as any[]).map(normalizeMeetup));
            if (productRes.status === 'fulfilled' && productRes.value.success && Array.isArray(productRes.value.data))
                all.push(...(productRes.value.data as ProductOrder[]).map(normalizeProductOrder));
            all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setBookings(all);
        } catch (e) {
            console.error('fetchAll bookings error:', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

    // ─── Counts per tab ──────────────────────────────────────────────────────
    const now = new Date();
    const counts: Record<FilterTab, number> = {
        all:         bookings.length,
        wellness:    bookings.filter(b => b.category === 'wellness' || b.category === 'wellness_product').length,
        health:      bookings.filter(b => b.category === 'health' || b.category === 'lab').length,
        concierge:   bookings.filter(b => b.category === 'concierge').length,
        upcoming:    bookings.filter(b => new Date(b.scheduledDate) > now && b.status !== 'cancelled' && b.status !== 'completed').length,
        completed:   bookings.filter(b => b.status === 'completed').length,
        cancelled:   bookings.filter(b => b.status === 'cancelled').length,
        rescheduled: bookings.filter(b => b.status === 'rescheduled').length,
    };

    const filtered = bookings.filter(b => {
        switch (activeTab) {
            case 'all':         return true;
            case 'wellness':    return b.category === 'wellness' || b.category === 'wellness_product';
            case 'health':      return b.category === 'health' || b.category === 'lab';
            case 'concierge':   return b.category === 'concierge';
            case 'upcoming':    return new Date(b.scheduledDate) > now && b.status !== 'cancelled' && b.status !== 'completed';
            case 'completed':   return b.status === 'completed';
            case 'cancelled':   return b.status === 'cancelled';
            case 'rescheduled': return b.status === 'rescheduled';
            default:            return true;
        }
    });

    // Group into Upcoming / Past sections
    const upcomingItems = filtered.filter(b => new Date(b.scheduledDate) > now && b.status !== 'cancelled' && b.status !== 'completed');
    const pastItems     = filtered.filter(b => !upcomingItems.includes(b));

    // ─── Cancel handler ──────────────────────────────────────────────────────
    const handleCancel = (booking: Booking) => {
        Alert.alert(t('my_bookings.cancel_alert_title'), t('my_bookings.cancel_alert_msg'), [
            { text: t('common.no'), style: 'cancel' },
            {
                text: t('my_bookings.cancel_confirm_btn'), style: 'destructive',
                onPress: async () => {
                    try {
                        let res: any;
                        if (booking.category === 'lab') {
                            res = await labService.cancelLabOrder(booking.id);
                        } else if (booking.category === 'meetup') {
                            res = await meetupService.cancelRegistration(booking.id);
                        } else {
                            res = await bookingService.cancelBooking(booking.id);
                        }
                        if (res?.success) {
                            Alert.alert(t('my_bookings.cancelled_title'), t('my_bookings.cancelled_msg'));
                            fetchAll();
                        } else {
                            Alert.alert(t('common.error'), res?.message || t('my_bookings.cancel_failed'));
                        }
                    } catch {
                        Alert.alert(t('common.error'), t('common.generic_error'));
                    }
                },
            },
        ]);
    };

    const S = makeStyles(isDarkMode, colors);

    // ─── Booking Card ────────────────────────────────────────────────────────
    const renderCard = (booking: Booking) => {
        const meta   = CATEGORY_META[booking.category] ?? CATEGORY_META.concierge;
        const status = STATUS_META[booking.status];
        const isUpcoming = booking.status === 'confirmed' || booking.status === 'pending';
        const isRescheduled = booking.status === 'rescheduled';
        const showDate = !!booking.scheduledDate;

        const navToDetail = () => {
            if (booking.category === 'wellness_product') {
                router.push({ pathname: '/order-tracking', params: { orderId: booking.id } } as any);
            } else {
                const type = booking.category === 'lab' ? 'lab'
                    : booking.category === 'meetup' ? 'meetup' : 'service';
                router.push({ pathname: '/booking-details', params: { bookingId: booking.id, type } } as any);
            }
        };

        const collectionTypeKey = booking.collectionType
            ? booking.collectionType.toLowerCase().replace(' ', '_').replace('-', '_')
            : '';

        return (
            <TouchableOpacity key={booking.id} style={S.card} onPress={navToDetail} activeOpacity={0.75}>

                {/* ── Top row: category chip + status pill ── */}
                <View style={S.cardHead}>
                    <View style={[S.catChip, { backgroundColor: `${meta.color}18` }]}>
                        <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                        <Text style={[S.catChipText, { color: meta.color }]}>{t('my_bookings.categories.' + booking.category)}</Text>
                    </View>
                    <View style={[S.statusPill, { backgroundColor: `${status.color}18` }]}>
                        <View style={[S.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[S.statusPillText, { color: status.color }]}>{t('my_bookings.statuses.' + booking.status)}</Text>
                    </View>
                </View>

                {/* ── Service name + Booking ID ── */}
                <Text style={S.serviceName} numberOfLines={2}>{booking.serviceName}</Text>
                <Text style={S.bookingIdText}>#{booking.bookingId}</Text>

                {/* ── Divider ── */}
                <View style={S.divider} />

                {/* ── Date / Time ── */}
                {showDate && (
                    <View style={S.infoRow}>
                        <View style={S.infoItem}>
                            <Ionicons name="calendar-outline" size={13} color={TEXT_MUTED} />
                            {isRescheduled && booking.rescheduledDate ? (
                                <View style={{ flex: 1 }}>
                                    <Text style={[S.infoText, { textDecorationLine: 'line-through' }]} numberOfLines={1}>
                                        {formatDate(booking.scheduledDate)}{booking.scheduledTime ? ` · ${booking.scheduledTime}` : ''}
                                    </Text>
                                    <Text style={[S.infoText, { color: '#7C3AED', fontWeight: '600' }]} numberOfLines={1}>
                                        {formatDate(booking.rescheduledDate)}{booking.rescheduledTime ? ` · ${booking.rescheduledTime}` : ''}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={S.infoText} numberOfLines={1}>
                                    {formatDate(booking.scheduledDate)}{booking.scheduledTime ? ` · ${booking.scheduledTime}` : ''}
                                </Text>
                            )}
                        </View>
                        {booking.collectionType && (
                            <View style={S.infoItem}>
                                <Ionicons name="location-outline" size={13} color={TEXT_MUTED} />
                                <Text style={S.infoText}>{t('my_bookings.collection_types.' + collectionTypeKey)}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Assigned Personnel ── */}
                {booking.assignedPersonnel && (
                    <View style={S.personnelRow}>
                        <View style={S.personnelAvatar}>
                            <Ionicons name="person" size={12} color={PRIMARY} />
                        </View>
                        <Text style={S.personnelText} numberOfLines={1}>
                            {t('my_bookings.assigned')}: <Text style={S.personnelName}>{booking.assignedPersonnel}</Text>
                        </Text>
                    </View>
                )}

                {/* ── Payment badge ── */}
                <View style={S.paymentRow}>
                    <View style={[
                        S.payBadge,
                        booking.paymentStatus === 'paid' ? S.payBadgePaid
                        : booking.paymentStatus === 'failed' ? S.payBadgeFailed
                        : S.payBadgePending,
                    ]}>
                        <Ionicons
                            name={booking.paymentStatus === 'paid' ? 'checkmark-circle' : booking.paymentStatus === 'failed' ? 'close-circle' : 'time'}
                            size={11}
                            color={booking.paymentStatus === 'paid' ? '#059669' : booking.paymentStatus === 'failed' ? '#EF4444' : '#D97706'}
                        />
                        <Text style={[
                            S.payBadgeText,
                            { color: booking.paymentStatus === 'paid' ? '#059669' : booking.paymentStatus === 'failed' ? '#EF4444' : '#D97706' },
                        ]}>
                            {t('my_bookings.payment_statuses.' + booking.paymentStatus)}
                        </Text>
                    </View>
                </View>

                {/* ── Action buttons ── */}
                <View style={S.actions}>
                    {/* View Details — always shown */}
                    <TouchableOpacity style={[S.actionBtn, S.detailsBtn]} onPress={(e) => { e.stopPropagation(); navToDetail(); }}>
                        <Ionicons name="eye-outline" size={13} color={PRIMARY} />
                        <Text style={S.detailsBtnText}>{t('my_bookings.actions.view_details')}</Text>
                    </TouchableOpacity>

                    {/* Download Report */}
                    {booking.reportReady && booking.reportUrl && (
                        <TouchableOpacity
                            style={[S.actionBtn, S.reportBtn]}
                            onPress={(e) => { e.stopPropagation(); Linking.openURL(booking.reportUrl!); }}
                        >
                            <Ionicons name="download-outline" size={13} color="#0EA5E9" />
                            <Text style={S.reportBtnText}>{t('my_bookings.actions.report')}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Rebook — completed/cancelled bookings */}
                    {(booking.status === 'completed' || booking.status === 'cancelled') && booking.category !== 'wellness_product' && (
                        <TouchableOpacity
                            style={[S.actionBtn, S.rebookBtn]}
                            onPress={(e) => {
                                e.stopPropagation();
                                if (booking.category === 'lab') {
                                    // Lab rebook: add to cart then go to unified checkout with slot picker
                                    const price = booking.packagePrice || booking.amount || 0;
                                    clearCategory('blood-test');
                                    addItem({
                                        id: booking.packageCode || booking.id,
                                        serviceType: 'Bloodwork',
                                        title: booking.serviceName,
                                        price,
                                        quantity: 1,
                                        details: {
                                            code: booking.packageCode,
                                            name: booking.serviceName,
                                            cost: price,
                                        },
                                    });
                                    router.push({
                                        pathname: '/payment/checkout',
                                        params: {
                                            category: 'blood-test',
                                            amount: String(price),
                                            label: booking.serviceName,
                                            skipUpsell: '1',
                                        },
                                    } as any);
                                } else {
                                    // Service bookings → directly to checkout with previous payload
                                    const bookingPayload = JSON.stringify({
                                        serviceId: booking.serviceId,
                                        cityId: booking.cityId,
                                        scheduledDate: new Date().toISOString(),
                                        formDataJson: {},
                                    });
                                    router.push({
                                        pathname: '/payment/checkout',
                                        params: {
                                            bookingPayload,
                                            amount: String(booking.amount ?? 0),
                                            label: booking.serviceName,
                                            skipUpsell: '1',
                                        },
                                    } as any);
                                }
                            }}
                        >
                            <Ionicons name="refresh-outline" size={13} color={PRIMARY} />
                            <Text style={S.rebookBtnText}>{t('my_bookings.actions.rebook')}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Cancel — upcoming only */}
                    {isUpcoming && booking.category !== 'wellness_product' && (
                        <TouchableOpacity
                            style={[S.actionBtn, S.cancelBtn]}
                            onPress={(e) => { e.stopPropagation(); handleCancel(booking); }}
                        >
                            <Ionicons name="close-circle-outline" size={13} color="#EF4444" />
                            <Text style={S.cancelBtnText}>{t('my_bookings.actions.cancel')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // ─── Section renderer ─────────────────────────────────────────────────────
    const renderSection = (title: string, items: Booking[], accentColor: string) => {
        if (items.length === 0) return null;
        const sectionTitleKey = title === 'Upcoming' ? 'upcoming_section' : 'past_section';
        return (
            <View style={S.section} key={title}>
                <View style={S.sectionHead}>
                    <View style={[S.sectionAccent, { backgroundColor: accentColor }]} />
                    <Text style={S.sectionTitle}>{t('my_bookings.' + sectionTitleKey)}</Text>
                    <View style={[S.sectionCount, { backgroundColor: `${accentColor}18` }]}>
                        <Text style={[S.sectionCountText, { color: accentColor }]}>{items.length}</Text>
                    </View>
                </View>
                {items.map(renderCard)}
            </View>
        );
    };

    return (
        <View style={[S.screen, { paddingTop: insets.top }]}>
            <StatusBar backgroundColor={PRIMARY} style="light" />

            {/* ── Header ── */}
            <View style={S.header}>
                <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={S.headerCenter}>
                    <Text style={S.headerTitle}>{t('my_bookings.header_title')}</Text>
                    <Text style={S.headerSub}>{t('my_bookings.header_sub')}</Text>
                </View>
                <TouchableOpacity onPress={fetchAll} style={S.refreshBtn}>
                    <Ionicons name="refresh-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* ── Stats strip ── */}
            <View style={S.statsStrip}>
                {[
                    { label: 'Total',     value: bookings.length,       color: 'rgba(255,255,255,0.9)', key: 'total' },
                    { label: 'Upcoming',  value: counts.upcoming,       color: '#86EFAC', key: 'upcoming' },
                    { label: 'Completed', value: counts.completed,      color: '#93C5FD', key: 'completed' },
                    { label: 'Cancelled', value: counts.cancelled,      color: '#FCA5A5', key: 'cancelled' },
                ].map(s => (
                    <View key={s.label} style={S.statItem}>
                        <Text style={[S.statValue, { color: s.color }]}>{s.value}</Text>
                        <Text style={S.statLabel}>{t('my_bookings.stats.' + s.key)}</Text>
                    </View>
                ))}
            </View>

            {/* ── Tabs ── */}
            <View style={S.tabsWrapper}>
                <ScrollView
                    ref={tabScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={S.tabsScroll}
                >
                    {TAB_CONFIG.map(({ key, label, icon }) => {
                        const active = activeTab === key;
                        const count  = counts[key];
                        return (
                            <TouchableOpacity
                                key={key}
                                style={[S.tab, active && S.tabActive]}
                                onPress={() => setActiveTab(key)}
                                activeOpacity={0.75}
                            >
                                <Ionicons
                                    name={icon as any}
                                    size={12}
                                    color={active ? '#fff' : (isDarkMode ? '#999' : TEXT_MUTED)}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={[S.tabLabel, active && S.tabLabelActive]}>
                                    {t('my_bookings.tabs.' + key)}
                                </Text>
                                {count > 0 && (
                                    <View style={[S.tabCount, active && S.tabCountActive]}>
                                        <Text style={[S.tabCountText, active && S.tabCountTextActive]}>{count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ── Content ── */}
            {loading ? (
                <View style={S.loader}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={S.loaderText}>{t('my_bookings.loading')}</Text>
                </View>
            ) : filtered.length === 0 ? (
                <View style={S.empty}>
                    <View style={S.emptyIcon}>
                        <Ionicons name="calendar-outline" size={40} color={TEXT_MUTED} />
                    </View>
                    <Text style={S.emptyTitle}>{t('my_bookings.empty_title')}</Text>
                    <Text style={S.emptySub}>
                        {activeTab === 'all'
                            ? t('my_bookings.empty_sub_all')
                            : t('my_bookings.empty_sub_tab', { tab: t('my_bookings.tabs.' + activeTab) })}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={S.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
                >
                    {renderSection('Upcoming', upcomingItems, '#059669')}
                    {renderSection('Past & Completed', pastItems, '#6B7280')}
                    <View style={{ height: 32 }} />
                </ScrollView>
            )}
        </View>
    );
}

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    screen:       { flex: 1, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' },

    // ── Header ──
    header:       { backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    refreshBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1 },
    headerTitle:  { fontSize: 18, fontWeight: '700', color: '#fff' },
    headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

    // ── Stats strip ──
    statsStrip:   { backgroundColor: PRIMARY, flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 18, paddingTop: 4, gap: 0 },
    statItem:     { flex: 1, alignItems: 'center' },
    statValue:    { fontSize: 20, fontWeight: '700', lineHeight: 24 },
    statLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

    // ── Tabs ──
    tabsWrapper:  {
        backgroundColor: isDarkMode ? '#1F2937' : '#fff',
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, elevation: 2,
    },
    tabsScroll:   { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
    tab:          {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
        borderWidth: 1, borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
    },
    tabActive:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
    tabLabel:     { fontSize: 12, fontWeight: '500', color: isDarkMode ? '#9CA3AF' : TEXT_MUTED },
    tabLabelActive: { color: '#fff', fontWeight: '600' },
    tabCount:     { marginLeft: 5, backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
    tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    tabCountText: { fontSize: 10, fontWeight: '700', color: isDarkMode ? '#9CA3AF' : TEXT_MUTED },
    tabCountTextActive: { color: '#fff' },

    // ── Loader / empty ──
    loader:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loaderText:   { fontSize: 13, color: isDarkMode ? '#9CA3AF' : TEXT_MUTED },
    empty:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    emptyIcon:    { width: 80, height: 80, borderRadius: 40, backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle:   { fontSize: 16, fontWeight: '700', color: isDarkMode ? '#F9FAFB' : TEXT_DARK, marginBottom: 6 },
    emptySub:     { fontSize: 13, color: isDarkMode ? '#9CA3AF' : TEXT_MUTED, textAlign: 'center', lineHeight: 20 },

    // ── List ──
    listContent:  { paddingHorizontal: 16, paddingTop: 16 },

    // ── Section ──
    section:      { marginBottom: 8 },
    sectionHead:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 8, gap: 8 },
    sectionAccent: { width: 3, height: 18, borderRadius: 2 },
    sectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: isDarkMode ? '#D1D5DB' : '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6 },
    sectionCount: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    sectionCountText: { fontSize: 11, fontWeight: '700' },

    // ── Card ──
    card: {
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDarkMode ? '#374151' : CARD_BORDER,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.2 : 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    cardHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    catChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    catChipText:  { fontSize: 11, fontWeight: '600' },
    statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    statusDot:    { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 11, fontWeight: '600' },

    serviceName:  { fontSize: 15, fontWeight: '700', color: isDarkMode ? '#F9FAFB' : TEXT_DARK, lineHeight: 22, marginBottom: 2 },
    bookingIdText: { fontSize: 11, color: isDarkMode ? '#6B7280' : TEXT_MUTED, fontWeight: '500', marginBottom: 12 },

    divider:      { height: 1, backgroundColor: isDarkMode ? '#374151' : '#F3F4F6', marginBottom: 12 },

    infoRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
    infoItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 5, flex: 1 },
    infoText:     { fontSize: 12, color: isDarkMode ? '#9CA3AF' : TEXT_MUTED, fontWeight: '500', flex: 1 },

    personnelRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    personnelAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: `${PRIMARY}18`, justifyContent: 'center', alignItems: 'center' },
    personnelText:  { flex: 1, fontSize: 12, color: isDarkMode ? '#9CA3AF' : TEXT_MUTED },
    personnelName:  { color: isDarkMode ? '#D1D5DB' : TEXT_DARK, fontWeight: '600' },

    paymentRow:   { marginBottom: 12 },
    payBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    payBadgePaid:    { backgroundColor: '#D1FAE5' },
    payBadgeFailed:  { backgroundColor: '#FEE2E2' },
    payBadgePending: { backgroundColor: '#FEF3C7' },
    payBadgeText:    { fontSize: 11, fontWeight: '600' },

    actions:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: isDarkMode ? '#374151' : '#F3F4F6', paddingTop: 12 },
    actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },

    detailsBtn:   { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
    detailsBtnText: { fontSize: 12, fontWeight: '600', color: PRIMARY },

    reportBtn:    { backgroundColor: '#E0F2FE', borderColor: '#7DD3FC' },
    reportBtnText: { fontSize: 12, fontWeight: '600', color: '#0EA5E9' },

    rebookBtn:    { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
    rebookBtnText: { fontSize: 12, fontWeight: '600', color: PRIMARY },

    cancelBtn:    { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
    cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
});

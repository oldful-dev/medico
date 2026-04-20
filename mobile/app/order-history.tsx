import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { bookingService, Booking } from '@/services/api/bookingService';
import { useTranslation } from 'react-i18next';

type TabType = 'Active' | 'Payment' | 'History';

/**
 * ORDER HISTORY — Restored Tabbed UI
 * Strict post-booking tracking.
 */
export default function OrderHistoryScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('Active');

    const fetchBookings = useCallback(async () => {
        try {
            if (!refreshing) setLoading(true);
            const res = await bookingService.getMyBookings();
            if (res.success && res.data) {
                setBookings(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [fetchBookings])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    // ─── Filtering Logic ───
    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            if (activeTab === 'Active') return ['CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING'].includes(b.status);
            if (activeTab === 'Payment') return ['PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(b.status);
            if (activeTab === 'History') return ['COMPLETED', 'CANCELLED'].includes(b.status);
            return false;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [bookings, activeTab]);

    // ─── Render Components ───

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons
                    name={activeTab === 'History' ? 'receipt-outline' : 'calendar-clear-outline'}
                    size={40} color={Colors.primary}
                />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} bookings</Text>
            <Text style={styles.emptySubtitle}>Your entries for this category will appear here once you take action.</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/')}>
                <Text style={styles.exploreBtnText}>Book New Service</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.screen}>
            <StatusBar style="dark" />

            {/* ─── Header ─── */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20) }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
            </View>

            {/* ─── Custom Tab Bar (Old Style) ─── */}
            <View style={styles.tabBar}>
                {(['Active', 'Payment', 'History'] as TabType[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab}
                        </Text>
                        {activeTab === tab && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
                ) : filteredBookings.length === 0 ? renderEmptyState() : (
                    filteredBookings.map((booking) => (
                        <TouchableOpacity
                            key={booking.id}
                            style={styles.bookingCard}
                            onPress={() => router.push({ pathname: '/service-confirmation', params: { bookingId: booking.id } })}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.serviceInfo}>
                                    <View style={styles.iconBox}>
                                        <MaterialCommunityIcons name="medical-bag" size={20} color={Colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.serviceName}>{booking.service?.name || 'Service'}</Text>
                                        <Text style={styles.bookingCode}>#{booking.bookingCode}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: booking.status === 'COMPLETED' ? '#E8F5E9' : '#FFF3E0' }]}>
                                    <Text style={[styles.statusText, { color: booking.status === 'COMPLETED' ? '#2E7D32' : '#EF6C00' }]}>
                                        {booking.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardDetails}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                                    <Text style={styles.detailText}>
                                        {new Date(booking.scheduledDate).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} • {booking.scheduledTime || 'ASAP'}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                                    <Text style={styles.detailText} numberOfLines={1}>{booking.addressLine || 'Home Address'}</Text>
                                </View>
                            </View>

                            <View style={styles.cardFooter}>
                                <Text style={styles.priceText}>₹{booking.amount}</Text>
                                {activeTab === 'Payment' && (
                                    <TouchableOpacity
                                        style={styles.payBtn}
                                        onPress={() => router.push({
                                            pathname: '/payment/checkout',
                                            params: { bookingId: booking.id, amount: String(booking.amount), label: booking.service?.name }
                                        })}
                                    >
                                        <Text style={styles.payBtnText}>Pay Now</Text>
                                    </TouchableOpacity>
                                )}
                                {activeTab === 'History' && (
                                    <TouchableOpacity style={styles.rebookBtn}>
                                        <Text style={styles.rebookBtnText}>Rebook</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FAFAFA' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF'
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', marginRight: -8 },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textDark, flex: 1, textAlign: 'left' },
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 50 },

    /* Tab Bar */
    tabBar: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    tabItem: { flex: 1, paddingVertical: 15, alignItems: 'center', position: 'relative' },
    tabItemActive: {},
    tabText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textMuted },
    tabTextActive: { color: Colors.primary, fontFamily: Fonts.bold },
    tabUnderline: { position: 'absolute', bottom: 0, width: '60%', height: 3, backgroundColor: Colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 },

    /* Booking Card */
    bookingCard: {
        backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 16,
        ...Shadow.card, borderWidth: 1, borderColor: '#F0F0F0'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15, gap: 10 },
    serviceInfo: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(4, 131, 87, 0.05)', justifyContent: 'center', alignItems: 'center' },
    serviceName: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.textDark, flexShrink: 1 },
    bookingCode: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontFamily: Fonts.bold, textTransform: 'uppercase' },

    cardDetails: { gap: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.textLight, flex: 1 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
    priceText: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textDark },
    payBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
    payBtnText: { color: '#FFF', fontFamily: Fonts.bold, fontSize: 13 },
    rebookBtn: { borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 10 },
    rebookBtnText: { color: Colors.primary, fontFamily: Fonts.bold, fontSize: 12 },

    /* Empty State */
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#EEE' },
    emptyTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textDark, marginBottom: 8 },
    emptySubtitle: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18, marginBottom: 25 },
    exploreBtn: { backgroundColor: Colors.primaryDark, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 15, ...Shadow.card },
    exploreBtnText: { fontFamily: Fonts.bold, color: '#FFF', fontSize: 14 },
});

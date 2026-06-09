import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { labService } from '@/services/api/labService';
import { useUser } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';

const TABS = ['Upcoming', 'Completed', 'Wellness', 'Health', 'Concierge'];

interface UnifiedBooking {
    id: string;
    displayId: string;
    category: string;
    title: string;
    date: string;
    time: string;
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    amount: number;
    address: string;
    reportUrl?: string;
    raw: any;
}

export default function BookingsScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const insets = useSafeAreaInsets(); // eslint-disable-line @typescript-eslint/no-unused-vars
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(isDarkMode, colors);

    const [activeTab, setActiveTab] = useState(0);
    const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = useCallback(async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const [labOrdersRes] = await Promise.all([
                labService.getUserLabOrders().catch(() => ({ data: [] }))
            ]);
            const labOrders: any[] = (labOrdersRes as any)?.data || [];

            const mappedLabs: UnifiedBooking[] = labOrders.map((order: any) => {
                let normStatus: UnifiedBooking['status'] = 'CONFIRMED';
                const s = String(order.status).toUpperCase();
                if (s === 'PENDING') normStatus = 'PENDING';
                if (s === 'COMPLETED' || s === 'DELIVERED' || s === 'REPORT_GENERATED') normStatus = 'COMPLETED';
                if (s === 'CANCELLED' || s === 'FAILED') normStatus = 'CANCELLED';

                return {
                    id: order.id || order._id,
                    displayId: order.clientRefId || order.id?.slice(-8),
                    category: 'Health',
                    title: order.packages?.[0]?.name || 'Blood Test',
                    date: order.slot?.date || 'N/A',
                    time: order.slot?.time || 'N/A',
                    status: normStatus,
                    amount: Math.round(order.packages?.[0]?.cost || 0),
                    address: order.address?.line1 || 'Home Collection',
                    reportUrl: order.reportUrl,
                    raw: order,
                };
            });

            const allBookings = [...mappedLabs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setBookings(allBookings);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const filteredBookings = bookings.filter(b => {
        const tab = TABS[activeTab];
        if (tab === 'Upcoming') return b.status === 'PENDING' || b.status === 'CONFIRMED';
        if (tab === 'Completed') return b.status === 'COMPLETED';
        if (tab === 'Wellness') return b.category === 'Wellness';
        if (tab === 'Health') return b.category === 'Health';
        if (tab === 'Concierge') return b.category === 'Concierge';
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '#059669';
            case 'CONFIRMED': return '#2563EB';
            case 'PENDING': return '#D97706';
            case 'CANCELLED': return '#DC2626';
            default: return TEXT_MUTED;
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '#D1FAE5';
            case 'CONFIRMED': return '#DBEAFE';
            case 'PENDING': return '#FEF3C7';
            case 'CANCELLED': return '#FEE2E2';
            default: return '#F3F4F6';
        }
    };

    const handleCancel = (item: UnifiedBooking) => {
        Alert.alert(
            'Cancel Booking',
            `Cancel "${item.title}" scheduled for ${item.date}?`,
            [
                { text: 'Keep Booking', style: 'cancel' },
                {
                    text: 'Cancel Booking', style: 'destructive',
                    onPress: () => Alert.alert('Cancellation Requested', 'Our team will process your cancellation and reach out shortly.'),
                },
            ]
        );
    };

    const handleRebook = (item: UnifiedBooking) => {
        if (item.category === 'Health') {
            router.push('/blood-test' as any);
        } else {
            Alert.alert('Rebook', 'Please browse services to book again.');
        }
    };

    const getStaffName = (item: UnifiedBooking): string | null => {
        const raw = item.raw;
        if (raw?.assignedPhlebotomist?.name) return raw.assignedPhlebotomist.name;
        if (raw?.assignedStaff?.name) return raw.assignedStaff.name;
        if (raw?.phlebotomistName) return raw.phlebotomistName;
        return null;
    };

    const renderBookingCard = ({ item }: { item: UnifiedBooking }) => {
        const isUpcoming = item.status === 'PENDING' || item.status === 'CONFIRMED';
        const staffName = getStaffName(item);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.category}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: getStatusBg(item.status) }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.bookingTitle}>{item.title}</Text>
                    <Text style={styles.bookingId}>Booking ID: #{item.displayId}</Text>

                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={14} color={TEXT_MUTED} />
                        <Text style={styles.detailText}>{item.date} • {item.time}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={14} color={TEXT_MUTED} />
                        <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
                    </View>

                    {staffName && (
                        <View style={styles.staffRow}>
                            <View style={styles.staffAvatar}>
                                <Ionicons name="person" size={13} color={PRIMARY_GREEN} />
                            </View>
                            <Text style={styles.staffText}>Assigned: <Text style={styles.staffName}>{staffName}</Text></Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.amount}>₹{item.amount}</Text>
                    <View style={styles.footerActions}>
                        {item.status === 'COMPLETED' && item.reportUrl ? (
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => Linking.openURL(item.reportUrl!)}
                            >
                                <Ionicons name="download-outline" size={14} color="#fff" />
                                <Text style={styles.actionBtnText}>Report</Text>
                            </TouchableOpacity>
                        ) : null}
                        {item.status === 'COMPLETED' && (
                            <TouchableOpacity style={styles.rebookBtn} onPress={() => handleRebook(item)}>
                                <Ionicons name="refresh-outline" size={14} color={PRIMARY_GREEN} />
                                <Text style={styles.rebookBtnText}>Rebook</Text>
                            </TouchableOpacity>
                        )}
                        {isUpcoming && (
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.outlineBtn}
                            onPress={() => Alert.alert('Details', 'Booking details view coming soon.')}
                        >
                            <Text style={styles.outlineBtnText}>Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bgScreen }]} edges={['top']}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 24 }} />
            </View>

            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsScroll}
                    contentContainerStyle={styles.tabsContent}
                >
                    {TABS.map((tab, idx) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === idx && styles.tabActive]}
                            onPress={() => setActiveTab(idx)}
                        >
                            <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBookingCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-clear-outline" size={64} color="#E5E7EB" />
                            <Text style={styles.emptyTitle}>No bookings found</Text>
                            <Text style={styles.emptySubtitle}>You don&apos;t have any bookings in this section yet.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#FAFAFA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: isDarkMode ? '#252525' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#3A3A3A' : CARD_BORDER },
    headerTitle: { fontSize: 16, fontWeight: '600', color: TEXT_DARK, flex: 1, textAlign: 'center' },
    tabsScroll: { backgroundColor: isDarkMode ? '#252525' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#3A3A3A' : CARD_BORDER },
    tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: isDarkMode ? '#3A3A3A' : '#F3F4F6' },
    tabActive: { backgroundColor: PRIMARY_GREEN },
    tabText: { fontSize: 13, fontWeight: '500', color: TEXT_MUTED },
    tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
    listContent: { padding: 16, paddingBottom: 40 },
    card: { backgroundColor: isDarkMode ? '#252525' : '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: isDarkMode ? '#3A3A3A' : CARD_BORDER, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#3A3A3A' : '#F3F4F6' },
    badge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600', color: PRIMARY_GREEN, textTransform: 'uppercase' },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardBody: { padding: 14 },
    bookingTitle: { fontSize: 15, fontWeight: '600', color: TEXT_DARK, marginBottom: 4 },
    bookingId: { fontSize: 12, color: TEXT_MUTED, marginBottom: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
    detailText: { fontSize: 13, color: TEXT_DARK, flex: 1 },
    staffRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: isDarkMode ? '#1F3A1F' : '#F0FDF4', padding: 8, borderRadius: 8 },
    staffAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: isDarkMode ? '#0F5F3A' : '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
    staffText: { fontSize: 12, color: TEXT_MUTED, flex: 1 },
    staffName: { fontWeight: '600', color: TEXT_DARK },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: isDarkMode ? '#1F1F1F' : '#F9FAFB', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? '#3A3A3A' : '#F3F4F6' },
    amount: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
    footerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY_GREEN, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
    actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
    rebookBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: PRIMARY_GREEN, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
    rebookBtnText: { color: PRIMARY_GREEN, fontSize: 12, fontWeight: '600' },
    cancelBtn: { borderWidth: 1, borderColor: '#FCA5A5', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
    cancelBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
    outlineBtn: { borderWidth: 1, borderColor: isDarkMode ? '#3A3A3A' : CARD_BORDER, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, backgroundColor: isDarkMode ? 'transparent' : '#FFFFFF' },
    outlineBtnText: { color: TEXT_DARK, fontSize: 12, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: isDarkMode ? '#E5E5E5' : TEXT_DARK, marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: isDarkMode ? '#A0A0A0' : TEXT_MUTED, textAlign: 'center' },
});

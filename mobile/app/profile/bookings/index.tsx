import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { labService } from '@/services/api/labService';
import { useUser } from '@/context/UserContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

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
    raw: any; // original backend object
}

export default function BookingsScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const insets = useSafeAreaInsets(); // eslint-disable-line @typescript-eslint/no-unused-vars
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    
    const [activeTab, setActiveTab] = useState(0);
    const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = useCallback(async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            // Phase 1: Client-side merging
            // Future: Add doctorService.getBookings(), productService.getOrders() to Promise.all
            const [labOrdersRes] = await Promise.all([
                labService.getUserLabOrders().catch(() => ({ data: [] }))
            ]);
            const labOrders: any[] = (labOrdersRes as any)?.data || [];

            // Map Lab Orders to UnifiedBooking
            const mappedLabs: UnifiedBooking[] = labOrders.map((order: any) => {
                // Determine normalized status
                let normStatus: UnifiedBooking['status'] = 'CONFIRMED';
                const s = String(order.status).toUpperCase();
                if (s === 'PENDING') normStatus = 'PENDING';
                if (s === 'COMPLETED' || s === 'DELIVERED' || s === 'REPORT_GENERATED') normStatus = 'COMPLETED';
                if (s === 'CANCELLED' || s === 'FAILED') normStatus = 'CANCELLED';

                return {
                    id: order.id || order._id,
                    displayId: order.clientRefId || order.id?.slice(-8),
                    category: 'Health', // Bloodwork goes to Health
                    title: order.packages?.[0]?.name || 'Blood Test',
                    date: order.slot?.date || 'N/A',
                    time: order.slot?.time || 'N/A',
                    status: normStatus,
                    amount: order.packages?.[0]?.cost || 0,
                    address: order.address?.line1 || 'Home Collection',
                    reportUrl: order.reportUrl, // If backend provides it
                    raw: order,
                };
            });

            // Flatten all merged data
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
                                <Ionicons name="refresh-outline" size={14} color={colors.primary} />
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textDark} />
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
                    <ActivityIndicator size="large" color={colors.primary} />
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
                            <Ionicons name="calendar-clear-outline" size={64} color={colors.textLight} />
                            <Text style={styles.emptyTitle}>No bookings found</Text>
                            <Text style={styles.emptySubtitle}>You don't have any bookings in this section yet.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgScreen },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    headerTitle: { fontSize: 16, fontWeight: '600', color: colors.textDark, flex: 1, textAlign: 'center' },
    tabsScroll: { backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bgCardMuted },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
    tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
    listContent: { padding: 16, paddingBottom: 40 },
    card: { backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 16, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    badge: { backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary, textTransform: 'uppercase' },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardBody: { padding: 14 },
    bookingTitle: { fontSize: 15, fontWeight: '600', color: colors.textDark, marginBottom: 4 },
    bookingId: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
    detailText: { fontSize: 13, color: colors.textDark, flex: 1 },
    staffRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : '#F0FDF4', padding: 8, borderRadius: 8 },
    staffAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.2)' : '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
    staffText: { fontSize: 12, color: colors.textMuted, flex: 1 },
    staffName: { fontWeight: '600', color: colors.textDark },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.bgCardMuted, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderTopWidth: 1, borderTopColor: colors.borderLight },
    amount: { fontSize: 15, fontWeight: '700', color: colors.textDark },
    footerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
    actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
    rebookBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
    rebookBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    cancelBtn: { borderWidth: 1, borderColor: '#FCA5A5', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
    cancelBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
    outlineBtn: { borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, backgroundColor: colors.bgCard },
    outlineBtnText: { color: colors.textDark, fontSize: 12, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textDark, marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});

import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { bookingService, Booking } from '@/services/api/bookingService';


type TabType = 'All' | 'Active' | 'Pending Payment' | 'Completed';

const SERVICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    'DOCTOR_HOME_VISIT': 'medkit-outline',
    'HOME_NURSE': 'heart-outline',
    'HOSPITAL_TRIP': 'car-outline',
    'BLOOD_TEST': 'water-outline',
    'MEDICINES': 'medical-outline',
    'INSURANCE': 'shield-checkmark-outline',
    'PHYSIO_FITNESS': 'fitness-outline',
    'EQUIPMENT_RENTAL': 'construct-outline',
    'HOME_ESSENTIALS': 'sparkles-outline',
    'TIFFIN': 'restaurant-outline',
    'TECH_HELPER': 'phone-portrait-outline',
    'PAPERWORK_LEGAL': 'document-text-outline',
};

export default function OrderHistoryScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('All');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBookings = async () => {
        try {
            const res = await bookingService.getMyBookings();
            if (res.success && res.data) {
                setBookings(res.data);
            }
        } catch (err) {
            console.error('Order history fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchBookings(); }, []);

    const onRefresh = () => { setRefreshing(true); fetchBookings(); };

    const mapStatus = (status: string): string => {
        if (status === 'COMPLETED')         return 'Completed';
        if (status === 'CANCELLED')         return 'Cancelled';
        if (status === 'PAYMENT_PENDING')   return 'Pending Payment'; // Awaiting Razorpay
        if (status === 'PAYMENT_FAILED')    return 'Payment Failed';  // Failed / dismissed
        return 'Active'; // PENDING (COD), CONFIRMED, ASSIGNED, IN_PROGRESS
    };

    const filteredBookings = bookings.filter(b => {
        const mapped = mapStatus(b.status);
        if (activeTab === 'All') return true;
        if (activeTab === 'Active') return mapped === 'Active';
        if (activeTab === 'Pending Payment') return mapped === 'Pending Payment' || mapped === 'Payment Failed';
        return mapped === activeTab;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed':        return '#34C759';
            case 'Cancelled':        return '#FF3B30';
            case 'Payment Failed':   return '#FF3B30';
            case 'Pending Payment':  return '#FF9500'; // orange — awaiting action
            default:                 return '#048357'; // Active
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'Completed':        return '#F0FFF4';
            case 'Cancelled':        return '#FFF5F5';
            case 'Payment Failed':   return '#FFF5F5';
            case 'Pending Payment':  return '#FFF8EE'; // soft orange
            default:                 return '#E8F5E9'; // Active
        }
    };

    const getIcon = (booking: Booking): keyof typeof Ionicons.glyphMap => {
        const slug = booking.service?.slug?.toUpperCase().replace(/-/g, '_') || '';
        return SERVICE_ICONS[slug] || 'receipt-outline';
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Order History</Text>
                    <View style={{ width: 24 }} />
                </View>
            </SafeAreaView>

            <View style={styles.body}>
                {/* ─── Tabs ─── */}
                <View style={styles.tabRow}>
                    {(['All', 'Active', 'Pending Payment', 'Completed'] as TabType[]).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ─── Content ─── */}
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#048357" />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#048357']} />}
                    >
                        {filteredBookings.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="receipt-outline" size={60} color="#AAAEAC" />
                                <Text style={styles.emptyTitle}>No Orders Found</Text>
                                <Text style={styles.emptyDesc}>You don&apos;t have any {activeTab.toLowerCase()} orders yet.</Text>
                            </View>
                        ) : (
                            filteredBookings.map(booking => {
                                const displayStatus = mapStatus(booking.status);
                                return (
                                    <View key={booking.id} style={styles.orderCard}>
                                        <View style={styles.orderLeft}>
                                            <View style={styles.orderIconCircle}>
                                                <Ionicons name={getIcon(booking)} size={22} color="#048357" />
                                            </View>
                                            <View style={styles.orderInfo}>
                                                <Text style={styles.orderService}>{booking.service?.name || 'Service'}</Text>
                                                <Text style={styles.orderDate}>{new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.orderRight}>
                                            <Text style={styles.orderAmount}>₹{booking.amount}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: getStatusBg(displayStatus) }]}>
                                                <Text style={[styles.statusText, { color: getStatusColor(displayStatus) }]}>{displayStatus}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#048357' },
    headerSafe: { backgroundColor: '#048357' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4 },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20, color: '#FFFFFF',
    },
    body: { flex: 1, backgroundColor: '#FFFFE3', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, gap: 10 },
    tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E5' },
    tabActive: { backgroundColor: '#048357', borderColor: '#048357' },
    tabText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13, color: '#555555',
    },
    tabTextActive: { color: '#FFFFFF' },
    scrollContent: { padding: 20, paddingBottom: 50 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    orderCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    orderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    orderIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
    orderInfo: { flex: 1 },
    orderService: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14, color: '#2F2F2F',
    },
    orderDate: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: '#898989', marginTop: 2,
    },
    orderRight: { alignItems: 'flex-end' },
    orderAmount: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15, color: '#2F2F2F',
    },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
    statusText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11,
    },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18, color: '#2F2F2F', marginTop: 16,
    },
    emptyDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: '#898989', marginTop: 4, textAlign: 'center',
    },
});

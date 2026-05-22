import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing } from '@/constants/theme';

const PRIMARY = '#02743F';

const MOCK_BOOKINGS = [
    {
        id: 'MB001',
        meetupId: '1',
        title: 'Morning Wellness Meetup at the Park',
        date: '25 Jun 2026',
        time: '07:30 AM',
        venue: 'Cubbon Park, Bengaluru',
        pinCode: '560038',
        status: 'confirmed',
        paymentStatus: 'paid',
        amount: 299,
        pickupEnabled: true,
        pickupAddress: '12, MG Road, Bengaluru',
        createdAt: '2026-05-23T10:00:00Z',
    },
];

type Tab = 'upcoming' | 'past';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    confirmed:  { label: 'Confirmed',  color: PRIMARY,    bg: '#D1FAE5' },
    pending:    { label: 'Pending',    color: '#D97706',  bg: '#FEF3C7' },
    cancelled:  { label: 'Cancelled',  color: '#DC2626',  bg: '#FEE2E2' },
    attended:   { label: 'Attended',   color: '#7C3AED',  bg: '#EDE9FE' },
};

export default function MeetupMyBookingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<Tab>('upcoming');
    const [bookings, setBookings] = useState(MOCK_BOOKINGS);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const now = new Date();
    const upcomingBookings = bookings.filter(b => new Date(b.createdAt) && b.status !== 'cancelled' && b.status !== 'attended');
    const pastBookings = bookings.filter(b => b.status === 'attended' || b.status === 'cancelled');

    const displayed = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

    const onRefresh = async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={PRIMARY} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>My Bookings</Text>
                    <Text style={styles.headerSub}>Local meetup registrations</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{upcomingBookings.length}</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsRow}>
                {(['upcoming', 'past'] as Tab[]).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'upcoming' ? 'Upcoming' : 'Past'}
                        </Text>
                        {tab === 'upcoming' && upcomingBookings.length > 0 && (
                            <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                                <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>
                                    {upcomingBookings.length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
                >
                    {displayed.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'upcoming' ? 'No upcoming meetups' : 'No past meetups'}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeTab === 'upcoming'
                                    ? 'Browse and join a local meetup near you'
                                    : 'Your attended meetups will appear here'}
                            </Text>
                            {activeTab === 'upcoming' && (
                                <TouchableOpacity
                                    style={styles.browseBtn}
                                    onPress={() => router.push('/meetup' as any)}
                                >
                                    <Text style={styles.browseBtnText}>Browse Meetups</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        displayed.map(booking => {
                            const status = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
                            return (
                                <View key={booking.id} style={styles.bookingCard}>
                                    {/* Image placeholder + Upcoming tag */}
                                    <View style={styles.cardBanner}>
                                        <Ionicons name="people" size={32} color="rgba(255,255,255,0.45)" />
                                        <View style={[styles.statusTag, { backgroundColor: status.bg }]}>
                                            <Text style={[styles.statusTagText, { color: status.color }]}>{status.label}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardBody}>
                                        <Text style={styles.cardTitle}>{booking.title}</Text>

                                        <View style={styles.cardMeta}>
                                            <View style={styles.metaItem}>
                                                <Ionicons name="calendar-outline" size={13} color={PRIMARY} />
                                                <Text style={styles.metaText}>{booking.date}</Text>
                                            </View>
                                            <View style={styles.metaItem}>
                                                <Ionicons name="time-outline" size={13} color={PRIMARY} />
                                                <Text style={styles.metaText}>{booking.time}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.cardMeta}>
                                            <View style={styles.metaItem}>
                                                <Ionicons name="location-outline" size={13} color={PRIMARY} />
                                                <Text style={styles.metaText}>{booking.venue}</Text>
                                            </View>
                                            <View style={styles.metaItem}>
                                                <Ionicons name="keypad-outline" size={13} color={PRIMARY} />
                                                <Text style={styles.metaText}>PIN: {booking.pinCode}</Text>
                                            </View>
                                        </View>

                                        {booking.pickupEnabled && (
                                            <View style={styles.pickupRow}>
                                                <Ionicons name="car-outline" size={13} color={PRIMARY} />
                                                <Text style={styles.pickupText}>Pickup: {booking.pickupAddress}</Text>
                                            </View>
                                        )}

                                        <View style={styles.cardFooter}>
                                            <View style={styles.amountBadge}>
                                                <Text style={styles.amountText}>₹{booking.amount} • {booking.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.viewBtn}
                                                onPress={() => router.push({ pathname: '/meetup/details', params: { id: booking.meetupId } } as any)}
                                            >
                                                <Text style={styles.viewBtnText}>View Details</Text>
                                                <Ionicons name="arrow-forward" size={13} color={PRIMARY} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* FAB — browse more */}
            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 20 }]}
                onPress={() => router.push('/meetup' as any)}
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={22} color="#fff" />
                <Text style={styles.fabText}>Join Meetup</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5FAF7' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: PRIMARY, paddingHorizontal: Spacing.lg, paddingVertical: 14,
        paddingBottom: 20, gap: Spacing.md,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: '#fff' },
    headerSub: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    countBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    },
    countText: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#fff' },
    tabsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
        paddingHorizontal: Spacing.lg,
    },
    tab: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 14, marginRight: 24,
        borderBottomWidth: 3, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: PRIMARY },
    tabText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textMuted },
    tabTextActive: { fontFamily: Fonts.semiBold, color: PRIMARY },
    tabBadge: {
        backgroundColor: Colors.borderLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
    },
    tabBadgeActive: { backgroundColor: '#D1FAE5' },
    tabBadgeText: { fontFamily: Fonts.semiBold, fontSize: 11, color: Colors.textMuted },
    tabBadgeTextActive: { color: PRIMARY },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: Spacing.lg, paddingBottom: 80 },
    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textDark, marginBottom: 8, textAlign: 'center' },
    emptySub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
    browseBtn: {
        backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    },
    browseBtnText: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#fff' },
    bookingCard: {
        backgroundColor: '#fff', borderRadius: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
        overflow: 'hidden',
    },
    cardBanner: {
        height: 90, backgroundColor: PRIMARY,
        justifyContent: 'center', alignItems: 'center',
    },
    statusTag: {
        position: 'absolute', top: 10, right: 10,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    },
    statusTagText: { fontFamily: Fonts.semiBold, fontSize: 11 },
    cardBody: { padding: 14 },
    cardTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark, marginBottom: 10, lineHeight: 21 },
    cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 6 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
    metaText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textBody, flex: 1 },
    pickupRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#EDF7F1', borderRadius: 8, padding: 8, marginVertical: 8,
    },
    pickupText: { fontFamily: Fonts.regular, fontSize: 12, color: PRIMARY, flex: 1 },
    cardFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight,
    },
    amountBadge: {
        backgroundColor: '#EDF7F1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    },
    amountText: { fontFamily: Fonts.semiBold, fontSize: 12, color: PRIMARY },
    viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewBtnText: { fontFamily: Fonts.semiBold, fontSize: 13, color: PRIMARY },
    fab: {
        position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: PRIMARY, borderRadius: 28,
        paddingHorizontal: 18, paddingVertical: 12,
        shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
    },
    fabText: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#fff' },
});

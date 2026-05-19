import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, RefreshControl, SectionList, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { labService, LabOrderListItem } from '@/services/api/labService';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';

interface Booking {
    id: string;
    serviceType: string;
    packageName: string;
    packageCode: string;
    bookingId: string;
    scheduledDate: string;
    scheduledTime?: string;
    collectionType: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'failed';
    reportReady: boolean;
    reportUrl?: string;
    testsCount?: number;
    createdAt: string;
}

type FilterTab = 'wellness' | 'health' | 'upcoming' | 'completed';

// Mapper functions to normalize LabOrder → Booking
function mapLabStatus(s: string): Booking['status'] {
    if (s === 'REPORT_GENERATED' || s === 'SAMPLE_COLLECTED') return 'completed';
    if (s === 'CANCELLED' || s === 'FAILED') return 'cancelled';
    if (s === 'CONFIRMED' || s === 'HOLD_CREATED') return 'confirmed';
    return 'pending';
}

function normalizeLabOrder(order: LabOrderListItem): Booking {
    const pkg = order.packages?.[0];
    const payment = order.payments?.[0];
    return {
        id: order.id,
        serviceType: 'blood-test',
        packageName: pkg?.name || pkg?.packageName || 'Blood Test',
        packageCode: pkg?.code || pkg?.packageCode || '',
        bookingId: order.clientRefId,
        scheduledDate: order.slot?.date || '',
        scheduledTime: order.slot?.time,
        collectionType: order.bookingType === 'HOME' ? 'home' : 'drop-off',
        status: mapLabStatus(order.status),
        paymentStatus: payment?.status === 'SUCCESS' ? 'paid' : payment?.status === 'FAILED' ? 'failed' : 'pending',
        reportReady: order.status === 'REPORT_GENERATED' && !!order.reportUrl,
        reportUrl: order.reportUrl,
        createdAt: order.createdAt,
    };
}

export default function MyBookingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<FilterTab>('health');

    useFocusEffect(
        React.useCallback(() => {
            fetchBookings();
        }, [])
    );

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const res = await labService.getUserLabOrders();
            if (res.success && res.data && Array.isArray(res.data)) {
                const normalizedBookings = (res.data as LabOrderListItem[]).map(normalizeLabOrder);
                setBookings(normalizedBookings);
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBookings();
        setRefreshing(false);
    };

    const getFilteredBookings = (): Booking[] => {
        const now = new Date();
        return bookings.filter(b => {
            if (activeTab === 'health') {
                return b.serviceType === 'blood-test';
            }
            if (activeTab === 'wellness') {
                return b.serviceType === 'wellness';
            }
            if (activeTab === 'upcoming') {
                return new Date(b.scheduledDate) > now && b.status !== 'cancelled';
            }
            if (activeTab === 'completed') {
                return b.status === 'completed' || new Date(b.scheduledDate) <= now;
            }
            return false;
        });
    };

    const getGroupedBookings = () => {
        const filtered = getFilteredBookings();
        const now = new Date();
        const upcoming = filtered.filter(b => new Date(b.scheduledDate) > now && b.status !== 'cancelled');
        const completed = filtered.filter(b => !upcoming.includes(b));

        const sections = [];
        if (upcoming.length > 0) {
            sections.push({ title: 'Upcoming', data: upcoming, isUpcoming: true });
        }
        if (completed.length > 0) {
            sections.push({ title: 'Completed', data: completed, isUpcoming: false });
        }

        return sections;
    };

    const upcomingCount = bookings.filter(b => new Date(b.scheduledDate) > new Date() && b.status !== 'cancelled').length;
    const completedCount = bookings.filter(b => b.status === 'completed').length;

    const renderBookingCard = (booking: Booking) => (
        <TouchableOpacity
            style={styles.bookingCard}
            onPress={() => router.push({
                pathname: '/booking-details',
                params: { bookingId: booking.id, type: 'lab' },
            } as any)}
            activeOpacity={0.7}
        >
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.bookingName} numberOfLines={1}>{booking.packageName}</Text>
                    <Text style={styles.bookingId}>Booking ID: #{booking.bookingId}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: booking.status === 'completed' ? PRIMARY_GREEN : '#F59E0B' }
                ]}>
                    <Text style={styles.statusBadgeText}>
                        {booking.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </Text>
                </View>
            </View>

            <View style={styles.detailsRow}>
                <View style={{ flex: 1 }}>
                    <View style={styles.detailItem}>
                        <Ionicons name="calendar" size={13} color={TEXT_MUTED} />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                            {booking.scheduledTime ? `, ${booking.scheduledTime}` : ''}
                        </Text>
                    </View>
                </View>
                <View style={styles.badgesGroup}>
                    {booking.collectionType === 'home' && (
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>Home</Text>
                        </View>
                    )}
                    {booking.testsCount && (
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{booking.testsCount} Tests</Text>
                        </View>
                    )}
                </View>
            </View>

            {booking.status === 'completed' && booking.reportReady && (
                <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={(e) => {
                        e.stopPropagation();
                        if (booking.reportUrl) {
                            Linking.openURL(booking.reportUrl);
                        }
                    }}
                >
                    <Ionicons name="download" size={14} color={PRIMARY_GREEN} />
                    <Text style={styles.downloadBtnText}>Download Report</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );

    const renderSectionHeader = (section: any) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <TouchableOpacity>
                <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
        </View>
    );

    const groupedBookings = getGroupedBookings();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Bookings</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {(['wellness', 'health', 'upcoming', 'completed'] as FilterTab[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[
                            styles.tab,
                            activeTab === tab && styles.tabActive,
                        ]}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === tab && styles.tabTextActive,
                        ]}>
                            {tab === 'health' ? 'Health' :
                                tab === 'wellness' ? 'Wellness' :
                                    tab === 'upcoming' ? `Upcoming (${upcomingCount})` :
                                        `Completed (${completedCount})`}
                        </Text>
                        {activeTab === tab && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            ) : groupedBookings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={48} color={TEXT_MUTED} />
                    <Text style={styles.emptyText}>No bookings found</Text>
                    <Text style={styles.emptySubtext}>Book a service to see it here</Text>
                </View>
            ) : (
                <SectionList
                    sections={groupedBookings}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => renderBookingCard(item)}
                    renderSectionHeader={({ section }) => renderSectionHeader(section)}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: PRIMARY_GREEN,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_MUTED,
    },
    tabTextActive: {
        color: PRIMARY_GREEN,
    },
    tabUnderline: {
        position: 'absolute',
        bottom: -2,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: PRIMARY_GREEN,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    viewAllLink: {
        fontSize: 12,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    bookingCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    bookingName: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_DARK,
        marginBottom: 4,
    },
    bookingId: {
        fontSize: 11,
        color: TEXT_MUTED,
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        textTransform: 'capitalize',
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 11,
        color: TEXT_MUTED,
        fontWeight: '500',
    },
    badgesGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    typeBadge: {
        backgroundColor: CARD_BORDER,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    typeBadgeText: {
        fontSize: 10,
        color: TEXT_DARK,
        fontWeight: '500',
    },
    downloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
        gap: 6,
        marginTop: 10,
    },
    downloadBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_DARK,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: TEXT_MUTED,
        marginTop: 4,
    },
});

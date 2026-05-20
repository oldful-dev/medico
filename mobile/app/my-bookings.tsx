import React, { useState, useCallback } from 'react';
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
    serviceType: string;        // blood-test, wellness, concierge, etc.
    packageName: string;        // Service name
    packageCode: string;
    bookingId: string;          // Display ID
    scheduledDate: string;
    scheduledTime?: string;
    rescheduledDate?: string;   // New date if rescheduled by admin
    rescheduledTime?: string;   // New time if rescheduled by admin
    collectionType?: string;    // home, drop-off, etc.
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
    paymentStatus: 'pending' | 'paid' | 'failed';
    reportReady: boolean;
    reportUrl?: string;
    testsCount?: number;
    assignedPersonnel?: string; // Caregiver/staff name
    createdAt: string;
}

type FilterTab = 'wellness' | 'health' | 'concierge' | 'upcoming' | 'completed' | 'cancelled' | 'rescheduled';

// Mapper functions to normalize LabOrder → Booking
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
    return {
        id: order.id,
        serviceType: 'blood-test',
        packageName: pkg?.name || pkg?.packageName || 'Blood Test',
        packageCode: pkg?.code || pkg?.packageCode || '',
        bookingId: order.clientRefId,
        scheduledDate: order.slot?.date || '',
        scheduledTime: order.slot?.time,
        rescheduledDate: order.rescheduledDate,
        rescheduledTime: order.rescheduledTime,
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
        useCallback(() => {
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
            if (activeTab === 'health') return b.serviceType === 'blood-test';
            if (activeTab === 'wellness') return b.serviceType === 'wellness';
            if (activeTab === 'concierge') return b.serviceType === 'concierge';
            if (activeTab === 'upcoming') return new Date(b.scheduledDate) > now && !['cancelled', 'rescheduled'].includes(b.status);
            if (activeTab === 'completed') return b.status === 'completed';
            if (activeTab === 'cancelled') return b.status === 'cancelled';
            if (activeTab === 'rescheduled') return b.status === 'rescheduled';
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
            {/* Service name + Status badge */}
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.bookingName} numberOfLines={1}>{booking.packageName}</Text>
                    <Text style={styles.bookingId}>Booking ID: #{booking.bookingId}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    {
                        backgroundColor: booking.status === 'completed' ? PRIMARY_GREEN :
                            booking.status === 'cancelled' ? '#EF4444' :
                            booking.status === 'rescheduled' ? '#8B5CF6' :
                            '#F59E0B'
                    }
                ]}>
                    <Text style={styles.statusBadgeText}>
                        {booking.status === 'completed' ? 'Completed' :
                            booking.status === 'cancelled' ? 'Cancelled' :
                            booking.status === 'rescheduled' ? 'Rescheduled' :
                            booking.status === 'confirmed' ? 'Upcoming' :
                            'Pending'}
                    </Text>
                </View>
            </View>

            {/* Date & Time + Collection type (show rescheduled if applicable) */}
            <View style={styles.detailsRow}>
                <View style={{ flex: 1 }}>
                    {booking.status === 'rescheduled' && booking.rescheduledDate ? (
                        <>
                            <View style={styles.detailItem}>
                                <Ionicons name="calendar" size={13} color={TEXT_MUTED} />
                                <Text style={[styles.detailText, { textDecorationLine: 'line-through' }]} numberOfLines={1}>
                                    {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                    {booking.scheduledTime ? `, ${booking.scheduledTime}` : ''}
                                </Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Ionicons name="checkmark-circle" size={13} color={PRIMARY_GREEN} />
                                <Text style={[styles.detailText, { color: PRIMARY_GREEN, fontWeight: '600' }]} numberOfLines={1}>
                                    {new Date(booking.rescheduledDate).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                    {booking.rescheduledTime ? `, ${booking.rescheduledTime}` : ''}
                                </Text>
                            </View>
                        </>
                    ) : (
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
                    )}
                </View>
                <View style={styles.badgesGroup}>
                    {booking.collectionType && (
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>
                                {booking.collectionType === 'home' ? 'Home' : booking.collectionType}
                            </Text>
                        </View>
                    )}
                    {booking.testsCount && (
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{booking.testsCount} Tests</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Assigned Personnel */}
            {booking.assignedPersonnel && (
                <View style={styles.personnelRow}>
                    <Ionicons name="person-outline" size={13} color={TEXT_MUTED} />
                    <Text style={styles.personnelText} numberOfLines={1}>
                        Assigned: {booking.assignedPersonnel}
                    </Text>
                </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionButtonsRow}>
                {/* Download Report (completed with report ready) */}
                {booking.status === 'completed' && booking.reportReady && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.downloadBtn]}
                        onPress={(e) => {
                            e.stopPropagation();
                            if (booking.reportUrl) {
                                Linking.openURL(booking.reportUrl);
                            }
                        }}
                    >
                        <Ionicons name="download" size={13} color={PRIMARY_GREEN} />
                        <Text style={styles.downloadBtnText}>Report</Text>
                    </TouchableOpacity>
                )}

                {/* Rebook for Completed / Cancelled bookings */}
                {(booking.status === 'completed' || booking.status === 'cancelled') && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rebookBtn]}
                        onPress={(e) => {
                            e.stopPropagation();
                            router.push({
                                pathname: '/blood-test',
                                params: {
                                    rebook: 'true',
                                    packageCode: booking.packageCode,
                                    packageName: booking.packageName,
                                },
                            } as any);
                        }}
                    >
                        <Ionicons name="refresh" size={13} color={PRIMARY_GREEN} />
                        <Text style={styles.rebookBtnText}>Rebook</Text>
                    </TouchableOpacity>
                )}

                {/* View Details for Upcoming / Rescheduled bookings */}
                {(booking.status === 'confirmed' || booking.status === 'pending' || booking.status === 'rescheduled') && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.viewDetailsBtn]}
                        onPress={(e) => {
                            e.stopPropagation();
                            router.push({
                                pathname: '/booking-details',
                                params: { bookingId: booking.id, type: 'lab' },
                            } as any);
                        }}
                    >
                        <Ionicons name="information-circle-outline" size={13} color={PRIMARY_GREEN} />
                        <Text style={styles.viewDetailsBtnText}>Details</Text>
                    </TouchableOpacity>
                )}

                {/* Cancel Booking (only for confirmed/upcoming) */}
                {booking.status === 'confirmed' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.cancelBtn]}
                        onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert(
                                'Cancel Booking',
                                'Are you sure you want to cancel this booking?',
                                [
                                    { text: 'No', style: 'cancel' },
                                    {
                                        text: 'Yes, Cancel',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                const res = await labService.cancelLabOrder(booking.id);
                                                if (res.success) {
                                                    Alert.alert('Success', 'Booking cancelled successfully');
                                                    fetchBookings();
                                                } else {
                                                    Alert.alert('Error', res.message || 'Failed to cancel booking');
                                                }
                                            } catch (error) {
                                                Alert.alert('Error', 'Failed to cancel booking');
                                                console.error('Cancel error:', error);
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Ionicons name="close-circle-outline" size={13} color="#EF4444" />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderSectionHeader = (section: any) => {
        // Only show "View All" if current tab is a service type (not already a status tab)
        const isServiceTypeTab = ['wellness', 'health', 'concierge'].includes(activeTab);
        const canViewAll = isServiceTypeTab && section.data.length > 0;

        return (
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {canViewAll && (
                    <TouchableOpacity
                        onPress={() => {
                            const tabMap: Record<string, FilterTab> = {
                                'Upcoming': 'upcoming',
                                'Completed': 'completed',
                            };
                            const tab = tabMap[section.title];
                            if (tab) setActiveTab(tab);
                        }}
                    >
                        <Text style={styles.viewAllLink}>View All</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const groupedBookings = getGroupedBookings();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar backgroundColor="#FFFFFF" />

            {/* Header — back button + title */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Tabs — scrollable, filled active style */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsScroll}
                contentContainerStyle={styles.tabsContent}
            >
                <View style={styles.tabsContainer}>
                    {(['wellness', 'health', 'concierge', 'upcoming', 'completed', 'cancelled', 'rescheduled'] as FilterTab[]).map((tab) => {
                        const tabCounts: Record<FilterTab, number> = {
                            wellness: bookings.filter(b => b.serviceType === 'wellness').length,
                            health: bookings.filter(b => b.serviceType === 'blood-test').length,
                            concierge: bookings.filter(b => b.serviceType === 'concierge').length,
                            upcoming: upcomingCount,
                            completed: completedCount,
                            cancelled: bookings.filter(b => b.status === 'cancelled').length,
                            rescheduled: bookings.filter(b => b.status === 'rescheduled').length,
                        };
                        const count = tabCounts[tab];
                        return (
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
                                            tab === 'concierge' ? 'Concierge' :
                                                tab === 'upcoming' ? `Upcoming (${count})` :
                                                    tab === 'completed' ? `Completed (${count})` :
                                                        tab === 'cancelled' ? `Cancelled (${count})` :
                                                            `Rescheduled (${count})`}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: TEXT_DARK,
        flex: 1,
        textAlign: 'center',
    },
    tabsScroll: {
        paddingHorizontal: 16,
        marginBottom: 8,
        marginTop: 8,
        flexGrow: 0,
        height: 44,
        minHeight: 44,
        maxHeight: 44,
    },
    tabsContent: {
        paddingRight: 16,
        paddingBottom: 0,
        gap: 6,
    },
    tabsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tab: {
        marginRight: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'transparent',
        height: 36,
        justifyContent: 'center',
    },
    tabActive: {
        backgroundColor: PRIMARY_GREEN,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '500',
        color: TEXT_MUTED,
    },
    tabTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    tabUnderline: {
        display: 'none',
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
    personnelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        paddingVertical: 6,
    },
    personnelText: {
        fontSize: 11,
        color: TEXT_MUTED,
        fontWeight: '500',
        flex: 1,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
        paddingTop: 10,
        marginTop: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    downloadBtn: {
        backgroundColor: '#F0FDF4',
    },
    downloadBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    viewDetailsBtn: {
        backgroundColor: '#F0FDF4',
    },
    viewDetailsBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    rebookBtn: {
        backgroundColor: '#F0FDF4',
    },
    rebookBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    cancelBtn: {
        backgroundColor: '#FEE2E2',
    },
    cancelBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#EF4444',
    },
    tabsScrollContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: 60,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
        color: TEXT_DARK,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 12,
        color: TEXT_MUTED,
        marginTop: 4,
    },
});

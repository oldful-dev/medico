import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, RefreshControl, SectionList, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { labService, LabOrderListItem } from '@/services/api/labService';
import { bookingService, Booking as ServiceBooking } from '@/services/api/bookingService';
import { meetupService } from '@/services/api/meetupService';
import { useCart } from '@/context/CartContext';

const PRIMARY_GREEN = '#02743F';
const PRIMARY_LIGHT = '#F0FAF4';
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

type FilterTab = 'all' | 'health' | 'services' | 'meetup' | 'upcoming' | 'completed' | 'cancelled';

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

function mapServiceStatus(s: string): Booking['status'] {
    if (s === 'COMPLETED' || s === 'IN_PROGRESS') return 'completed';
    if (s === 'CANCELLED' || s === 'PAYMENT_FAILED') return 'cancelled';
    if (s === 'CONFIRMED' || s === 'ASSIGNED') return 'confirmed';
    return 'pending';
}

function normalizeServiceBooking(b: ServiceBooking): Booking {
    return {
        id: b.id,
        serviceType: 'service',
        packageName: b.service?.name || 'Service',
        packageCode: '',
        bookingId: b.bookingCode,
        scheduledDate: b.scheduledDate ? String(b.scheduledDate) : '',
        scheduledTime: b.scheduledTime ?? undefined,
        collectionType: b.addressLine ? 'home' : undefined,
        status: mapServiceStatus(b.status),
        paymentStatus: (b as any).paymentStatus === 'SUCCESS' ? 'paid' : (b as any).paymentStatus === 'FAILED' ? 'failed' : 'pending',
        reportReady: false,
        assignedPersonnel: b.caregiver?.name ?? undefined,
        createdAt: b.createdAt ? String(b.createdAt) : '',
    };
}

function normalizeMeetupRegistration(reg: any): Booking {
    return {
        id: reg.id,
        serviceType: 'meetup',
        packageName: reg.meetup?.title || 'Local Meetup',
        packageCode: '',
        bookingId: reg.bookingCode,
        scheduledDate: reg.meetup?.eventDate || '',
        scheduledTime: reg.meetup?.startTime ?? undefined,
        collectionType: reg.pickupEnabled ? 'pickup' : undefined,
        status: reg.status === 'CONFIRMED' || reg.status === 'ATTENDED' ? 'confirmed'
            : reg.status === 'CANCELLED' ? 'cancelled' : 'pending',
        paymentStatus: reg.paymentStatus === 'PAID' ? 'paid' : 'pending',
        reportReady: false,
        createdAt: reg.createdAt,
    };
}

export default function MyBookingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { tab, scrollToCheckout } = useLocalSearchParams<{ tab?: string; scrollToCheckout?: string }>();
    const { cart } = useCart();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<FilterTab>((tab as FilterTab) || 'all');
    const scrollViewRef = useRef<ScrollView>(null);

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
            // If coming from checkout flow, scroll to checkout section after data loads
            if (scrollToCheckout === 'true') {
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
            }
        }, [scrollToCheckout])
    );

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const [labRes, serviceRes, meetupRes] = await Promise.allSettled([
                labService.getUserLabOrders(),
                bookingService.getMyBookings(),
                meetupService.getMyRegistrations(),
            ]);

            const all: Booking[] = [];

            if (labRes.status === 'fulfilled' && labRes.value.success && Array.isArray(labRes.value.data)) {
                all.push(...(labRes.value.data as LabOrderListItem[]).map(normalizeLabOrder));
            }
            if (serviceRes.status === 'fulfilled' && serviceRes.value.success && Array.isArray(serviceRes.value.data)) {
                all.push(...(serviceRes.value.data as ServiceBooking[]).map(normalizeServiceBooking));
            }
            if (meetupRes.status === 'fulfilled' && meetupRes.value.success && Array.isArray(meetupRes.value.data)) {
                all.push(...(meetupRes.value.data as any[]).map(normalizeMeetupRegistration));
            }

            all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setBookings(all);
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

    const getBloodTestCartItems = () => {
        if (!cart || !cart.items) return [];
        return cart.items.filter((item: any) => item.serviceType === 'blood-test');
    };

    const getFilteredBookings = (): Booking[] => {
        const now = new Date();
        return bookings.filter(b => {
            if (activeTab === 'all') return true;
            if (activeTab === 'health') return b.serviceType === 'blood-test';
            if (activeTab === 'services') return b.serviceType === 'service';
            if (activeTab === 'meetup') return b.serviceType === 'meetup';
            if (activeTab === 'upcoming') return new Date(b.scheduledDate) > now && b.status !== 'cancelled';
            if (activeTab === 'completed') return b.status === 'completed';
            if (activeTab === 'cancelled') return b.status === 'cancelled';
            return false;
        });
    };

    const getGroupedBookings = () => {
        const filtered = getFilteredBookings();
        const now = new Date();
        const upcoming = filtered.filter(b => {
            const d = new Date(b.scheduledDate);
            return !isNaN(d.getTime()) && d > now && b.status !== 'cancelled';
        });
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

    const upcomingCount = bookings.filter(b => {
        const d = new Date(b.scheduledDate);
        return !isNaN(d.getTime()) && d > new Date() && b.status !== 'cancelled';
    }).length;
    const completedCount = bookings.filter(b => b.status === 'completed').length;

    const renderBookingCard = (booking: Booking) => (
        <TouchableOpacity
            style={styles.bookingCard}
            onPress={() => {
                const type = booking.serviceType === 'blood-test' ? 'lab'
                    : booking.serviceType === 'meetup' ? 'meetup'
                    : 'service';
                router.push({ pathname: '/booking-details', params: { bookingId: booking.id, type } } as any);
            }}
            activeOpacity={0.7}
        >
            {/* Service name + Status badge */}
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.bookingName} numberOfLines={1}>{booking.packageName}</Text>
                    <Text style={styles.bookingId}>
                        {booking.serviceType === 'meetup' ? '🎪 Meetup' :
                         booking.serviceType === 'blood-test' ? '🩸 Blood Test' : '🏥 Service'}
                        {'  ·  '}#{booking.bookingId}
                    </Text>
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

                {/* Rebook for Completed / Cancelled blood tests only */}
                {booking.serviceType === 'blood-test' && (booking.status === 'completed' || booking.status === 'cancelled') && (
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

                {/* View Details for upcoming bookings */}
                {(booking.status === 'confirmed' || booking.status === 'pending') && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.viewDetailsBtn]}
                        onPress={(e) => {
                            e.stopPropagation();
                            const type = booking.serviceType === 'blood-test' ? 'lab'
                                : booking.serviceType === 'meetup' ? 'meetup'
                                : 'service';
                            router.push({ pathname: '/booking-details', params: { bookingId: booking.id, type } } as any);
                        }}
                    >
                        <Ionicons name="information-circle-outline" size={13} color={PRIMARY_GREEN} />
                        <Text style={styles.viewDetailsBtnText}>Details</Text>
                    </TouchableOpacity>
                )}

                {/* Cancel Booking (only for confirmed/pending) */}
                {(booking.status === 'confirmed' || booking.status === 'pending') && (
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
                                                let res;
                                                if (booking.serviceType === 'blood-test') {
                                                    res = await labService.cancelLabOrder(booking.id);
                                                } else if (booking.serviceType === 'meetup') {
                                                    res = await meetupService.cancelRegistration(booking.id);
                                                } else {
                                                    res = await bookingService.cancelBooking(booking.id);
                                                }
                                                if (res.success) {
                                                    Alert.alert('Success', 'Booking cancelled successfully');
                                                    fetchBookings();
                                                } else {
                                                    Alert.alert('Error', res.message || 'Failed to cancel booking');
                                                }
                                            } catch (error) {
                                                Alert.alert('Error', 'Failed to cancel booking');
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
            <StatusBar backgroundColor={PRIMARY_GREEN} barStyle="light-content" />

            {/* Green Hero Header */}
            <View style={styles.heroHeader}>
                <View style={styles.heroContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.heroTitleWrap}>
                        <Text style={styles.heroTitle}>My Bookings</Text>
                        <Text style={styles.heroSubtitle}>Track your health appointments</Text>
                    </View>
                    <View style={{ width: 24 }} />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={styles.statIcon}>
                            <Ionicons name="calendar" size={18} color={PRIMARY_GREEN} />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{upcomingCount}</Text>
                            <Text style={styles.statLabel}>Upcoming</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statIcon}>
                            <Ionicons name="checkmark-circle" size={18} color={PRIMARY_GREEN} />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{completedCount}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statIcon}>
                            <Ionicons name="layers" size={18} color={PRIMARY_GREEN} />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{bookings.length}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Tabs — scrollable, filled active style */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsScroll}
                contentContainerStyle={styles.tabsContent}
            >
                <View style={styles.tabsContainer}>
                    {(['all', 'health', 'services', 'meetup', 'upcoming', 'completed', 'cancelled'] as FilterTab[]).map((t) => {
                        const tabCounts: Record<FilterTab, number> = {
                            all: bookings.length,
                            health: bookings.filter(b => b.serviceType === 'blood-test').length,
                            services: bookings.filter(b => b.serviceType === 'service').length,
                            meetup: bookings.filter(b => b.serviceType === 'meetup').length,
                            upcoming: upcomingCount,
                            completed: completedCount,
                            cancelled: bookings.filter(b => b.status === 'cancelled').length,
                        };
                        const count = tabCounts[t];
                        const labels: Record<FilterTab, string> = {
                            all: `All (${count})`,
                            health: `Blood Tests (${count})`,
                            services: `Services (${count})`,
                            meetup: `Meetups (${count})`,
                            upcoming: `Upcoming (${count})`,
                            completed: `Completed (${count})`,
                            cancelled: `Cancelled (${count})`,
                        };
                        return (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setActiveTab(t)}
                                style={[styles.tab, activeTab === t && styles.tabActive]}
                            >
                                <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                                    {labels[t]}
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
            ) : (
                <ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {groupedBookings.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={48} color={TEXT_MUTED} />
                            <Text style={styles.emptyText}>No bookings found</Text>
                            <Text style={styles.emptySubtext}>Book a service to see it here</Text>
                        </View>
                    ) : (
                        <View style={styles.listContent}>
                            {groupedBookings.map((section) => (
                                <View key={section.title}>
                                    {renderSectionHeader(section)}
                                    {section.data.map((item) => (
                                        <View key={item.id}>
                                            {renderBookingCard(item)}
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Checkout Section (when coming from cart) */}
                    {scrollToCheckout === 'true' && getBloodTestCartItems().length > 0 && (
                        <View style={styles.checkoutSection}>
                            <Text style={styles.checkoutTitle}>Ready to Checkout?</Text>
                            <Text style={styles.checkoutSubtitle}>
                                You have {getBloodTestCartItems().length} blood test{getBloodTestCartItems().length > 1 ? 's' : ''} pending checkout
                            </Text>

                            {/* Pending Items Preview */}
                            <View style={styles.checkoutItems}>
                                {getBloodTestCartItems().map((item: any) => (
                                    <View key={item.id} style={styles.checkoutItemCard}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.checkoutItemName} numberOfLines={2}>
                                                {item.packageName || item.name || 'Blood Test'}
                                            </Text>
                                            <Text style={styles.checkoutItemPrice}>
                                                ₹{item.price || 0}
                                            </Text>
                                        </View>
                                        <Text style={styles.checkoutItemQty}>Qty: {item.quantity || 1}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Checkout Button */}
                            <TouchableOpacity
                                style={styles.checkoutButton}
                                onPress={() => {
                                    router.push({
                                        pathname: '/blood-test-checkout',
                                        params: { fromCheckout: 'true' },
                                    } as any);
                                }}
                            >
                                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{ height: 24 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    heroHeader: {
        backgroundColor: PRIMARY_GREEN,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTitleWrap: {
        flex: 1,
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    heroSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.75)',
        fontWeight: '500',
        marginTop: 2,
    },
    tabsScroll: {
        paddingHorizontal: 16,
        marginBottom: 0,
        marginTop: 16,
        flexGrow: 0,
        height: 44,
        minHeight: 44,
        maxHeight: 44,
    },
    tabsContent: {
        paddingRight: 16,
        paddingBottom: 0,
        gap: 10,
    },
    tabsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tab: {
        paddingVertical: 9,
        paddingHorizontal: 15,
        borderRadius: 8,
        backgroundColor: '#F0F0F0',
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
        paddingVertical: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        marginTop: 18,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: TEXT_DARK,
        letterSpacing: 0.3,
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
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
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
        backgroundColor: PRIMARY_LIGHT,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
    },
    downloadBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    viewDetailsBtn: {
        backgroundColor: PRIMARY_LIGHT,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
    },
    viewDetailsBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    rebookBtn: {
        backgroundColor: PRIMARY_LIGHT,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
    },
    rebookBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    cancelBtn: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FECACA',
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
        paddingVertical: 80,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_DARK,
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 13,
        color: TEXT_MUTED,
        marginTop: 6,
        textAlign: 'center',
    },
    checkoutSection: {
        backgroundColor: PRIMARY_LIGHT,
        marginHorizontal: 16,
        marginTop: 28,
        marginBottom: 16,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: PRIMARY_GREEN,
    },
    checkoutTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: TEXT_DARK,
        marginBottom: 6,
    },
    checkoutSubtitle: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 16,
    },
    checkoutItems: {
        gap: 10,
        marginBottom: 14,
    },
    checkoutItemCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    checkoutItemName: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 4,
    },
    checkoutItemPrice: {
        fontSize: 11,
        color: PRIMARY_GREEN,
        fontWeight: '700',
    },
    checkoutItemQty: {
        fontSize: 11,
        color: TEXT_MUTED,
        fontWeight: '500',
    },
    checkoutButton: {
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    checkoutButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

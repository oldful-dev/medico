import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { bookingService, Booking } from '@/services/api/bookingService';

export default function MyBookingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBookings = async () => {
        try {
            const response = await bookingService.getMyBookings();
            if (response.success && response.data) {
                setBookings(response.data);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const handleCancelBooking = (bookingId: string) => {
        Alert.alert(
            "Cancel Booking",
            "Are you sure you want to cancel this booking?",
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Cancel", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const res = await bookingService.cancelBooking(bookingId);
                            if (res.success) {
                                Alert.alert("Success", "Booking cancelled successfully");
                                fetchBookings(); // Refresh list
                            } else {
                                Alert.alert("Error", res.message || "Failed to cancel booking");
                            }
                        } catch (err) {
                            Alert.alert("Error", "Something went wrong");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '#048357';
            case 'PENDING': return '#F2994A';
            case 'CANCELLED': return '#EB5757';
            case 'IN_PROGRESS': return Colors.primary;
            default: return Colors.textMuted;
        }
    };

    const renderBookingItem = ({ item }: { item: Booking }) => (
        <TouchableOpacity
            style={styles.bookingCard}
            onPress={() => router.push({
                pathname: '/service-confirmation',
                params: {
                    serviceName: item.service?.name || 'Service',
                    requestId: item.bookingCode,
                    description: item.symptoms?.join(', ') || 'Service Request',
                    address: item.addressLine || 'Address not specified',
                    status: item.status,
                    fee: `₹${item.amount}`
                }
            })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.serviceInfo}>
                    <View style={styles.iconBox}>
                        <Ionicons name="construct-outline" size={20} color={Colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.serviceName}>{item.service?.name || 'Service Request'}</Text>
                        <Text style={styles.bookingCode}>{item.bookingCode}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.footerText}>{new Date(item.scheduledDate).toLocaleDateString()}</Text>
                </View>
                <View style={styles.footerItem}>
                    <Ionicons name="wallet-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.footerText}>₹{item.amount}</Text>
                </View>
                
                {['PENDING', 'CONFIRMED', 'ASSIGNED'].includes(item.status) ? (
                    <TouchableOpacity 
                        style={styles.cancelLink}
                        onPress={() => handleCancelBooking(item.id)}
                    >
                        <Text style={styles.cancelLinkText}>Cancel</Text>
                    </TouchableOpacity>
                ) : (
                    <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <View style={{ width: 34 }} />
            </View>

            <View style={styles.contentContainer}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : bookings.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="calendar-outline" size={64} color={Colors.borderLight} />
                        <Text style={styles.emptyTitle}>No Bookings Yet</Text>
                        <Text style={styles.emptySubtitle}>Your service requests will appear here.</Text>
                        <TouchableOpacity
                            style={styles.exploreBtn}
                            onPress={() => router.replace('/(tabs)')}
                        >
                            <Text style={styles.exploreBtnText}>Explore Services</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={bookings}
                        renderItem={renderBookingItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 20,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        textAlign: 'center',
        letterSpacing: -0.24,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
        borderTopLeftRadius: Radius.xl * 2,
        borderTopRightRadius: Radius.xl * 2,
        overflow: 'hidden',
    },
    listContent: {
        padding: Spacing.lg,
        paddingBottom: 40,
    },
    bookingCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadow.card,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    serviceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    serviceName: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 2,
    },
    bookingCode: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.sm,
    },
    statusText: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        textTransform: 'uppercase',
    },
    cardDivider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: Spacing.md,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    emptyTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xs,
    },
    emptySubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    exploreBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: Radius.full,
    },
    exploreBtnText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textWhite,
    },
    cancelLink: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    cancelLinkText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
        color: '#EB5757',
    },
});

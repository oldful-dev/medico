import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ScrollView,
    ActivityIndicator,
    Image,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts, FontSize, Radius, Shadow } from '@/constants/theme';
import { bookingService, Booking } from '@/services/api/bookingService';
import { useCart } from '@/context/CartContext';
import { useUser } from '@/context/UserContext';
import { useTranslation } from 'react-i18next';

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

export default function CartScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { items, removeItem, totalAmount } = useCart();
    const { profile } = useUser();
    
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const getIcon = (booking: Booking): keyof typeof Ionicons.glyphMap => {
        const slug = booking.service?.slug?.toUpperCase().replace(/-/g, '_') || '';
        return SERVICE_ICONS[slug] || 'calendar-outline';
    };

    const fetchActiveBookings = async () => {
        try {
            if (!refreshing) setLoading(true);
            const res = await bookingService.getMyBookings();
            
            if (res.success && res.data) {
                // Same logic as Order History but filtered for Active
                const active = res.data.filter(b => 
                    b.status !== 'COMPLETED' && b.status !== 'CANCELLED'
                );
                setBookings(active);
            }
        } catch (err) {
            console.error('Failed to fetch bookings for cart:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchActiveBookings();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchActiveBookings();
    };

    const hasData = items.length > 0 || bookings.length > 0;

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>My Cart & Bookings</Text>
            </View>

            <View style={styles.contentContainer}>
                {loading && !refreshing ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    <ScrollView 
                        style={styles.scrollView} 
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                    >
                        {/* ─── Membership Card ─── */}
                        <TouchableOpacity 
                            style={styles.membershipCard}
                            onPress={() => router.push('/plans')}
                        >
                            <View style={styles.membershipIconBg}>
                                <Ionicons name="ribbon-outline" size={24} color={Colors.textWhite} />
                            </View>
                            <View style={styles.membershipTextContainer}>
                                <Text style={styles.membershipTitle}>
                                    {profile?.subscriptions && profile.subscriptions.length > 0 
                                        ? profile.subscriptions[0].plan?.name + ' Member' 
                                        : 'Join Oldful Club'}
                                </Text>
                                <Text style={styles.membershipSubtitle}>
                                    {profile?.subscriptions && profile.subscriptions.length > 0 
                                        ? 'Your benefits are active. Enjoy priority care.' 
                                        : 'Unlock priority support & 20% off on services.'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textWhite} />
                        </TouchableOpacity>

                        {!hasData && (
                            <View style={styles.emptyStateContainerSmall}>
                                <View style={styles.iconCircleSmall}>
                                    <Ionicons name="calendar-clear-outline" size={40} color={Colors.primary} />
                                </View>
                                <Text style={styles.emptyHeadlineSmall}>{t('cart.empty_title')}</Text>
                                <TouchableOpacity
                                    style={styles.exploreButtonSmall}
                                    onPress={() => router.push('/')}
                                >
                                    <Text style={styles.exploreButtonTextSmall}>{t('cart.explore_services')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Upcoming Bookings */}
                        {bookings.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionTitleRow}>
                                        <Ionicons name="calendar" size={18} color={Colors.primary} />
                                        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                                    </View>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{bookings.length}</Text>
                                    </View>
                                </View>

                                {bookings.map(booking => (
                                    <TouchableOpacity 
                                        key={booking.id} 
                                        style={styles.card}
                                        onPress={() => router.push({ pathname: '/service-confirmation', params: { bookingId: booking.id } })}
                                    >
                                        <View style={styles.cardLeft}>
                                            <View style={styles.iconBox}>
                                                <Ionicons name={getIcon(booking)} size={20} color={Colors.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.cardTitle} numberOfLines={1}>
                                                    {booking.service?.name || 'Service Booking'}
                                                </Text>
                                                <Text style={styles.cardSubtitle}>
                                                    {new Date(booking.scheduledDate).toLocaleDateString([], { day: '2-digit', month: 'short' })} • {booking.status}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity 
                                            style={styles.trackBtn}
                                            onPress={() => router.push({ pathname: '/service-confirmation', params: { bookingId: booking.id } })}
                                        >
                                            <Text style={styles.trackBtnText}>Track</Text>
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Cart Items */}
                        {items.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionTitleRow}>
                                        <Ionicons name="cart" size={18} color={Colors.primary} />
                                        <Text style={styles.sectionTitle}>Services in Cart</Text>
                                    </View>
                                </View>

                                {items.map(item => (
                                    <View key={item.id} style={styles.card}>
                                        <View style={styles.cardLeft}>
                                            <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                                                <Ionicons name="medkit-outline" size={20} color={Colors.sosRed} />
                                            </View>
                                            <View>
                                                <Text style={styles.cardTitle}>{item.title}</Text>
                                                <Text style={styles.cardSubtitle}>₹{item.price}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => removeItem(item.id)}>
                                            <Ionicons name="trash-outline" size={20} color={Colors.textLight} />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                <View style={styles.checkoutBox}>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Total Amount</Text>
                                        <Text style={styles.totalValue}>₹{totalAmount}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.checkoutBtn}>
                                        <Text style={styles.checkoutBtnText}>{t('cart.checkout')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        
                        <TouchableOpacity 
                            style={styles.historyLink}
                            onPress={() => router.push('/order-history' as any)}
                        >
                            <Text style={styles.historyLinkText}>View Order History</Text>
                            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                    </ScrollView>
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
    headerContainer: {
        backgroundColor: Colors.primary,
        alignItems: 'center',
        paddingVertical: 15,
        paddingBottom: 25,
        position: 'relative',
    },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        letterSpacing: -0.24,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        ...Shadow.card,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingTop: 30,
        paddingBottom: 120,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    membershipCard: {
        backgroundColor: Colors.primaryDark,
        borderRadius: Radius.md,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        ...Shadow.card,
    },
    membershipIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    membershipTextContainer: {
        flex: 1,
    },
    membershipTitle: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: Colors.textWhite,
    },
    membershipSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    emptyStateContainerSmall: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    iconCircleSmall: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    emptyHeadlineSmall: {
        fontFamily: Fonts.medium,
        fontSize: 16,
        color: Colors.textDark,
        marginBottom: 20,
    },
    exploreButtonSmall: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 10,
        borderRadius: 20,
    },
    exploreButtonTextSmall: {
        fontFamily: Fonts.medium,
        color: Colors.textWhite,
        fontSize: 14,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    badge: {
        backgroundColor: Colors.primary,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeText: {
        color: Colors.textWhite,
        fontSize: 12,
        fontFamily: Fonts.bold,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: 15,
        marginBottom: 12,
        ...Shadow.card,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        color: Colors.textDark,
    },
    cardSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 2,
    },
    trackBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Radius.sm,
    },
    trackBtnText: {
        color: Colors.textWhite,
        fontSize: 12,
        fontFamily: Fonts.medium,
    },
    checkoutBox: {
        marginTop: 10,
        backgroundColor: '#E8F5E9',
        borderRadius: Radius.md,
        padding: 15,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    totalLabel: {
        fontFamily: Fonts.medium,
        fontSize: 14,
        color: Colors.textDark,
    },
    totalValue: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: Colors.primary,
    },
    checkoutBtn: {
        backgroundColor: Colors.primary,
        height: 40,
        borderRadius: Radius.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkoutBtnText: {
        color: Colors.textWhite,
        fontFamily: Fonts.semiBold,
    },
    historyLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: 10,
    },
    historyLinkText: {
        fontFamily: Fonts.medium,
        fontSize: 14,
        color: Colors.primary,
        textDecorationLine: 'underline',
    },
});

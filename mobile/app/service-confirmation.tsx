import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { bookingService, Booking } from '@/services/api/bookingService';

export default function ServiceConfirmationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{
        bookingId: string;
        // Fallbacks for direct navigation or old flows
        serviceName?: string;
        requestId?: string;
        description?: string;
        address?: string;
        status?: string;
        fee?: string;
    }>();

    const [booking, setBooking] = React.useState<Booking | null>(null);
    const [loading, setLoading] = React.useState(!!params.bookingId);

    React.useEffect(() => {
        if (params.bookingId) {
            fetchBooking(params.bookingId);
        }
    }, [params.bookingId]);

    const fetchBooking = async (id: string) => {
        try {
            setLoading(true);
            const res = await bookingService.getBookingById(id);
            if (res.success && res.data) {
                setBooking(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch booking details:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to format description from JSON
    const formatDescription = (b: Booking) => {
        if (b.symptoms && b.symptoms.length > 0) return b.symptoms.join(', ');
        
        // If it's a home essential with formDataJson
        let formData = (b as any).formDataJson;
        
        // Handle stringified JSON from backend
        if (typeof formData === 'string') {
            try {
                formData = JSON.parse(formData);
            } catch (e) {
                // Not valid JSON, use as is if it's a string
            }
        }

        if (formData && typeof formData === 'object') {
            return Object.values(formData).filter(v => !!v).join(' - ');
        }
        
        return 'Service request details';
    };

    // Derive display values
    const dispName = booking?.service?.name || params.serviceName || 'Service';
    const dispId = booking?.bookingCode || params.requestId || 'REQ-PENDING';
    const dispDesc = booking ? formatDescription(booking) : params.description || 'Details pending...';
    const dispAddr = booking?.addressLine || params.address || 'Address pending...';
    const dispStatus = booking?.status || params.status || 'Confirmed';
    const dispFee = booking?.amount ? `₹${booking.amount}` : params.fee || 'To be decided';
    const dispDate = booking?.scheduledDate ? new Date(booking.scheduledDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Date pending...';

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{loading ? 'Fetching Booking...' : 'Booking Confirmed'}</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* ─── Content Card ─── */}
            <View style={styles.contentCard}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Success Icon & Title */}
                    <View style={styles.successSection}>
                        <View style={styles.successCircle}>
                            <Ionicons name="checkmark" size={48} color={Colors.textWhite} />
                        </View>
                        <Text style={styles.successTitle}>{loading ? 'Please wait...' : 'Booking Received!'}</Text>
                        <Text style={styles.successSubtitle}>
                            {booking ? 'Your service request has been successfully submitted.' : 'Fetching your booking details...'}
                        </Text>
                    </View>

                    {/* Booking ID Card */}
                    <View style={styles.bookingIdCard}>
                        <View>
                            <Text style={styles.bookingIdLabel}>Request ID</Text>
                            <Text style={styles.bookingIdValue}>{dispId}</Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>{dispStatus}</Text>
                        </View>
                    </View>

                    {/* Details Card */}
                    <View style={styles.detailsCard}>
                        <Text style={styles.detailsCardTitle}>Service Details</Text>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="construct-outline" size={16} color={Colors.primary} />
                            </View>
                             <View style={styles.detailTextGroup}>
                                 <Text style={styles.detailLabel}>Service</Text>
                                 <Text style={styles.detailValue}>{dispName}</Text>
                             </View>
                         </View>
 
                         <View style={styles.detailDivider} />
 
                         <View style={styles.detailRow}>
                             <View style={styles.detailIconBox}>
                                 <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                             </View>
                             <View style={styles.detailTextGroup}>
                                 <Text style={styles.detailLabel}>Description</Text>
                                 <Text style={styles.detailValue}>{dispDesc}</Text>
                             </View>
                         </View>
 
                         <View style={styles.detailDivider} />

                         <View style={styles.detailRow}>
                             <View style={styles.detailIconBox}>
                                 <Ionicons name="location-outline" size={16} color={Colors.primary} />
                             </View>
                             <View style={styles.detailTextGroup}>
                                 <Text style={styles.detailLabel}>Address</Text>
                                 <Text style={styles.detailValue}>{dispAddr}</Text>
                             </View>
                         </View>

                         <View style={styles.detailDivider} />

                         <View style={styles.detailRow}>
                             <View style={styles.detailIconBox}>
                                 <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                             </View>
                             <View style={styles.detailTextGroup}>
                                 <Text style={styles.detailLabel}>Scheduled Date</Text>
                                 <Text style={styles.detailValue}>{dispDate}</Text>
                             </View>
                         </View>

                         <View style={styles.detailDivider} />

                         <View style={styles.detailRow}>
                             <View style={styles.detailIconBox}>
                                 <Ionicons name="wallet-outline" size={16} color={Colors.primary} />
                             </View>
                             <View style={styles.detailTextGroup}>
                                 <Text style={styles.detailLabel}>Booking Fee / Estimate</Text>
                                 <Text style={styles.detailValue}>{dispFee}</Text>
                             </View>
                         </View>
                     </View>
 
                     {/* Info Banner */}
                     <View style={styles.infoBanner}>
                         <Ionicons name="information-circle" size={18} color={Colors.primaryDark} />
                         <Text style={styles.infoBannerText}>
                             {(() => {
                                 const lower = dispName.toLowerCase();
                                 if (lower.includes('driver') || lower.includes('cab') || lower.includes('hospital'))
                                     return 'A driver will be assigned to your trip shortly. You can track your cab location.';
                                 if (lower.includes('medicine') || lower.includes('blood') || lower.includes('order'))
                                     return 'Your order is being processed. You can track the delivery status here.';
                                 if (lower.includes('meal') || lower.includes('tiffin'))
                                     return 'Our kitchen has received your request. You can track your tiffin delivery.';
                                 if (lower.includes('nurse') || lower.includes('physio') || lower.includes('fitness') || lower.includes('doctor'))
                                     return 'A healthcare professional or therapist will be assigned to you shortly.';
                                 if (lower.includes('paper') || lower.includes('legal') || lower.includes('bank') || lower.includes('bill') || lower.includes('upgrade'))
                                     return 'An Oldful concierge assistant will be assigned to handle your request.';
                                 if (lower.includes('cleaning') || lower.includes('repair') || lower.includes('plumbing') || lower.includes('electrical') || lower.includes('tech'))
                                     return 'A certified technician is being prepared for your home visit.';
                                 return 'A dedicated partner will be assigned to your request shortly. You can track their status.';
                             })()}
                         </Text>
                     </View>
                </ScrollView>

                {/* ─── Bottom Buttons ─── */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={[styles.actionButton, styles.trackBtn]} activeOpacity={0.8}>
                        <Text style={[styles.actionButtonText, styles.trackText]}>
                            {(() => {
                                const lower = dispName.toLowerCase();
                                if (lower.includes('driver') || lower.includes('cab') || lower.includes('hospital')) return 'Track Car/Cab';
                                if (lower.includes('nurse') || lower.includes('physio') || lower.includes('fitness') || lower.includes('doctor')) return 'Track Professional';
                                if (lower.includes('medicine') || lower.includes('blood')) return 'Track Order';
                                if (lower.includes('meal') || lower.includes('tiffin')) return 'Track Tiffin';
                                if (lower.includes('cleaning') || lower.includes('repair') || lower.includes('plumbing') || lower.includes('electrical') || lower.includes('tech')) return 'Track Technician';
                                if (lower.includes('paper') || lower.includes('legal') || lower.includes('bank') || lower.includes('bill') || lower.includes('anything') || lower.includes('travel') || lower.includes('upgrade')) return 'Track Assistant';
                                return 'Track Progress';
                            })()}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.cancelBtn]} activeOpacity={0.8}>
                        <Text style={[styles.actionButtonText, styles.cancelText]}>Cancel Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.callBtn]} activeOpacity={0.8}>
                        <Ionicons name="call-outline" size={18} color={Colors.primaryDark} style={{ marginRight: 8 }} />
                        <Text style={[styles.actionButtonText, styles.callText]}>Call Support</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.homeButton} activeOpacity={0.8} onPress={() => router.replace('/(tabs)')}>
                        <Ionicons name="arrow-back-outline" size={18} color={Colors.primaryDark} style={{ marginRight: 8 }} />
                        <Text style={styles.homeButtonText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.primary,
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        paddingTop: Spacing.md,
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

    /* ─── Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: 32,
        paddingBottom: 220, // extra padding for bottom buttons
    },

    /* ─── Success Section ─── */
    successSection: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    successTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading1,
        color: Colors.primaryDark,
        marginBottom: Spacing.xs,
        letterSpacing: -0.24,
    },
    successSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },

    /* ─── Booking ID Card ─── */
    bookingIdCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        marginBottom: Spacing.lg,
        borderWidth: 0.8,
        borderColor: 'rgba(4, 131, 87, 0.2)',
        borderStyle: 'dashed',
    },
    bookingIdLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },
    bookingIdValue: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primaryDark,
        letterSpacing: 0.5,
    },
    statusBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    statusBadgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.caption,
        color: Colors.primaryDark,
    },

    /* ─── Details Card ─── */
    detailsCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadow.card,
    },
    detailsCardTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primaryDark,
        marginBottom: Spacing.lg,
        letterSpacing: -0.24,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    detailIconBox: {
        width: 32,
        height: 32,
        borderRadius: Radius.sm,
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    detailTextGroup: {
        flex: 1,
    },
    detailLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textLight,
        marginBottom: 2,
    },
    detailValue: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textBody,
    },
    detailDivider: {
        height: 0.5,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },

    /* ─── Info Banner ─── */
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    infoBannerText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.primaryDark,
        lineHeight: 16,
    },

    /* ─── Bottom Bar ─── */
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.bgScreen,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: 36,
        alignItems: 'center',
        gap: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    actionButton: {
        width: '100%',
        maxWidth: 320,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    actionButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
    },
    trackBtn: {
        backgroundColor: Colors.primaryDark,
    },
    trackText: {
        color: Colors.textWhite,
    },
    cancelBtn: {
        backgroundColor: '#FFF0F0',
        borderWidth: 1,
        borderColor: '#FFCCCC',
    },
    cancelText: {
        color: Colors.sosRed,
    },
    callBtn: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    callText: {
        color: Colors.primaryDark,
    },
    homeButton: {
        width: '100%',
        maxWidth: 320,
        height: 48,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: 4,
    },
    homeButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.primaryDark,
        textDecorationLine: 'underline',
    },
});

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Alert,
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
        } catch {
            console.error('Failed to fetch booking details');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRequest = () => {
        if (!booking?.id) return;

        Alert.alert(
            "Cancel Request",
            "Are you sure you want to cancel this booking request?",
            [
                { text: "No, Keep It", style: "cancel" },
                { 
                    text: "Yes, Cancel", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await bookingService.cancelBooking(booking.id);
                            if (res.success) {
                                Alert.alert("Success", "Booking cancelled successfully");
                                fetchBooking(booking.id); // Refresh
                            } else {
                                Alert.alert("Error", res.message || "Failed to cancel booking");
                            }
                        } catch (err) {
                            Alert.alert("Error", "Something went wrong while cancelling");
                        }
                    }
                }
            ]
        );
    };

    // Helper to format description from JSON
    const formatDescription = (b: Booking) => {
        let lines: string[] = [];

        if (b.symptoms && b.symptoms.length > 0) {
            lines.push(`Primary: ${b.symptoms.join(', ')}`);
        }
        
        let formData = b.formDataJson;
        if (typeof formData === 'string') {
            try {
                formData = JSON.parse(formData);
            } catch { }
        }
        
        if (formData && typeof formData === 'object') {
            // Fields to skip in text display (attachments, technical IDs, image fields)
            const skipKeys = new Set(['attachments', 'serviceId', 'cityId']);

            Object.entries(formData).forEach(([key, value]) => {
                if (skipKeys.has(key)) return;
                if (!value) return;

                // Skip arrays of URLs (image upload fields)
                if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
                    const looksLikeUrls = value.every((v: string) =>
                        v.startsWith('http://') || v.startsWith('https://') || v.startsWith('gs://')
                    );
                    if (looksLikeUrls) return; // These are image attachments — rendered separately
                }

                // Humanize keys
                const label = key
                    .replace(/_/g, ' ')
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .replace('Req ', 'Request ')
                    .replace('Desc', 'Description');

                if (Array.isArray(value)) {
                    if (value.length > 0 && typeof value[0] === 'string') {
                        lines.push(`${label}: ${value.join(', ')}`);
                    }
                } else if (typeof value === 'string') {
                    // Skip values that look like URLs (single image fields)
                    if (value.startsWith('http://') || value.startsWith('https://')) return;
                    lines.push(`${label}: ${value}`);
                } else if (typeof value === 'number' || typeof value === 'boolean') {
                    lines.push(`${label}: ${value}`);
                }
            });
        }
        
        if (lines.length === 0) return 'Standard service request details';
        return lines.join('\n');
    };

    // Helper to get attachments — collects URLs from 'attachments' key AND any image_upload field
    const getAttachments = (b: Booking): string[] => {
        let formData = b.formDataJson;
        if (typeof formData === 'string') {
            try {
                formData = JSON.parse(formData);
            } catch { }
        }
        if (!formData || typeof formData !== 'object') return [];

        const urls: string[] = [];
        Object.values(formData).forEach((value: any) => {
            if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                urls.push(value);
            } else if (Array.isArray(value)) {
                value.forEach((v: any) => {
                    if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
                        urls.push(v);
                    }
                });
            }
        });
        return urls;
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
                            {booking ? 'Your service request has been successfully submitted.' : (loading ? 'Fetching your booking details...' : 'Successfully booked!')}
                        </Text>
                    </View>

                    {loading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: 20 }} />}

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
                                 <Text style={styles.detailLabel}>Additional Details</Text>
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

                     {/* ─── Attachments Section ─── */}
                     {booking && getAttachments(booking).length > 0 && (
                         <View style={styles.attachmentsSection}>
                             <Text style={styles.attachmentsTitle}>Uploaded Photos / Documents</Text>
                             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentsScroll}>
                                 {getAttachments(booking).map((url, idx) => (
                                     <TouchableOpacity key={idx} activeOpacity={0.9} style={{ marginRight: 10 }}>
                                        <Image source={{ uri: url }} style={styles.attachmentImage} resizeMode="cover" />
                                     </TouchableOpacity>
                                 ))}
                             </ScrollView>
                             <Text style={styles.attachmentsSubtitle}>{getAttachments(booking).length} file(s) uploaded</Text>
                         </View>
                     )}
 
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
                                     return 'An Ayuxa concierge assistant will be assigned to handle your request.';
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
                    {booking && !['CANCELLED', 'COMPLETED'].includes(booking.status) && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.cancelBtn]} 
                            activeOpacity={0.8}
                            onPress={handleCancelRequest}
                        >
                            <Text style={[styles.actionButtonText, styles.cancelText]}>Cancel Request</Text>
                        </TouchableOpacity>
                    )}
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
        textAlign: "left", marginLeft: 12,
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
    /* ─── Attachments ─── */
    attachmentsSection: {
        marginTop: Spacing.lg,
        marginBottom: Spacing.md,
    },
    attachmentsTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.primaryDark,
        marginBottom: Spacing.sm,
    },
    attachmentsSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: Colors.textMuted,
        marginTop: 4,
    },
    attachmentsScroll: {
        paddingRight: 20,
    },
    attachmentImage: {
        width: 120,
        height: 120,
        borderRadius: Radius.md,
        backgroundColor: '#eee',
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

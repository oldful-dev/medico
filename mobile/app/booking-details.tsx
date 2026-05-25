import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { bookingService } from '@/services/api/bookingService';
import { labService, LabOrderListItem } from '@/services/api/labService';
import { meetupService } from '@/services/api/meetupService';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';
const SUCCESS_GREEN = '#10B981';
const WARNING_AMBER = '#F59E0B';

interface BookingDetail {
    id: string;
    bookingId: string;
    packageName: string;
    packageCode: string;
    serviceType: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
    paymentStatus: 'pending' | 'paid' | 'failed';
    scheduledDate: string;
    scheduledTime?: string;
    rescheduledDate?: string;
    rescheduledTime?: string;
    collectionType: 'home' | 'lab';
    address?: string;
    pincode?: string;
    landmark?: string;
    phoneNumber?: string;
    testsCount?: number;
    assignedPersonnel?: string;
    reportReady: boolean;
    reportUrl?: string;
    reportGeneratedAt?: string;
    createdAt: string;
    amount: number;
}

// Map LabOrder to BookingDetail
function normalizeLabOrderDetail(order: LabOrderListItem): BookingDetail {
    const pkg = order.packages?.[0];
    const payment = order.payments?.[0];
    const mapLabStatus = (s: string): BookingDetail['status'] => {
        if (s === 'REPORT_GENERATED' || s === 'SAMPLE_COLLECTED') return 'completed';
        if (s === 'CANCELLED' || s === 'FAILED') return 'cancelled';
        if (s === 'RESCHEDULED') return 'rescheduled';
        if (s === 'CONFIRMED' || s === 'HOLD_CREATED') return 'confirmed';
        return 'pending';
    };
    return {
        id: order.id,
        bookingId: order.clientRefId,
        packageName: pkg?.name || pkg?.packageName || 'Blood Test',
        packageCode: pkg?.code || pkg?.packageCode || '',
        serviceType: 'blood-test',
        status: mapLabStatus(order.status),
        paymentStatus: payment?.status === 'SUCCESS' ? 'paid' : payment?.status === 'FAILED' ? 'failed' : 'pending',
        scheduledDate: order.slot?.date || '',
        scheduledTime: order.slot?.time,
        rescheduledDate: order.rescheduledDate,
        rescheduledTime: order.rescheduledTime,
        collectionType: order.bookingType === 'HOME' ? 'home' : 'lab',
        address: order.address?.line1 || '',
        pincode: order.address?.pincode || '',
        landmark: order.address?.landmark || '',
        testsCount: order.packages?.length || 1,
        assignedPersonnel: typeof order.assignedStaff === 'string'
            ? order.assignedStaff
            : order.assignedStaff?.name || '',
        reportReady: order.status === 'REPORT_GENERATED' && !!order.reportUrl,
        reportUrl: order.reportUrl,
        createdAt: order.createdAt,
        amount: payment?.amount || 0,
    };
}

function normalizeMeetupDetail(reg: any): BookingDetail {
    const meetup = reg.meetup || {};
    return {
        id: reg.id,
        bookingId: reg.bookingCode,
        packageName: meetup.title || 'Local Meetup',
        packageCode: '',
        serviceType: 'meetup',
        status: reg.status === 'CONFIRMED' || reg.status === 'ATTENDED' ? 'confirmed'
            : reg.status === 'CANCELLED' ? 'cancelled' : 'pending',
        paymentStatus: reg.paymentStatus === 'PAID' ? 'paid' : 'pending',
        scheduledDate: meetup.eventDate || '',
        scheduledTime: meetup.startTime,
        collectionType: reg.pickupEnabled ? 'home' : 'lab',
        address: reg.pickupEnabled ? reg.pickupAddress || '' : meetup.venue || '',
        pincode: meetup.pinCode || '',
        landmark: reg.pickupLandmark || '',
        reportReady: false,
        createdAt: reg.createdAt,
        amount: reg.amountPaid || 0,
        assignedPersonnel: reg.pickupEnabled && reg.preferredPickupTime ? `Pickup at ${reg.preferredPickupTime}` : undefined,
    };
}

function normalizeServiceDetail(b: any): BookingDetail {
    const mapStatus = (s: string): BookingDetail['status'] => {
        if (s === 'COMPLETED' || s === 'IN_PROGRESS') return 'completed';
        if (s === 'CANCELLED' || s === 'PAYMENT_FAILED') return 'cancelled';
        if (s === 'CONFIRMED' || s === 'ASSIGNED') return 'confirmed';
        return 'pending';
    };
    return {
        id: b.id,
        bookingId: b.bookingCode,
        packageName: b.service?.name || 'Service',
        packageCode: b.service?.slug || '',
        serviceType: 'service',
        status: mapStatus(b.status),
        paymentStatus: b.paymentStatus === 'SUCCESS' ? 'paid' : b.paymentStatus === 'FAILED' ? 'failed' : 'pending',
        scheduledDate: b.scheduledDate ? String(b.scheduledDate) : '',
        scheduledTime: b.scheduledTime,
        collectionType: 'home',
        address: b.addressLine || '',
        reportReady: false,
        createdAt: b.createdAt ? String(b.createdAt) : '',
        amount: b.amount || 0,
        assignedPersonnel: b.caregiver?.name,
    };
}

export default function BookingDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { bookingId, type } = useLocalSearchParams<{ bookingId?: string; type?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(isDarkMode, colors);
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);

    useEffect(() => {
        if (bookingId) {
            fetchBookingDetails();
        }
    }, [bookingId, type]);

    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            if (type === 'lab') {
                const res = await labService.getLabOrderById(bookingId || '');
                if (res.success && res.data) {
                    setBooking(normalizeLabOrderDetail(res.data as LabOrderListItem));
                } else {
                    Alert.alert('Error', 'Failed to load booking details');
                }
            } else if (type === 'meetup') {
                const res = await meetupService.getRegistrationById(bookingId || '');
                if (res.success && res.data) {
                    setBooking(normalizeMeetupDetail(res.data));
                } else {
                    Alert.alert('Error', 'Failed to load meetup details');
                }
            } else {
                const res = await bookingService.getBookingById(bookingId || '');
                if (res.success && res.data) {
                    setBooking(normalizeServiceDetail(res.data));
                } else {
                    Alert.alert('Error', 'Failed to load booking details');
                }
            }
        } catch (error) {
            console.error('Failed to fetch booking details:', error);
            Alert.alert('Error', 'Failed to load booking details');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!booking?.reportUrl) {
            Alert.alert('Error', 'Report URL not available');
            return;
        }

        try {
            setDownloading(true);
            const supported = await Linking.canOpenURL(booking.reportUrl);
            if (supported) {
                await Linking.openURL(booking.reportUrl);
            } else {
                Alert.alert('Error', 'Cannot open report');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to download report');
        } finally {
            setDownloading(false);
        }
    };

    const handleCancelBooking = async () => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this booking?',
            [
                { text: 'No', onPress: () => {} },
                {
                    text: 'Yes, Cancel',
                    onPress: async () => {
                        try {
                            let res;
                            if (type === 'lab') {
                                res = await labService.cancelLabOrder(booking?.id || '');
                            } else if (type === 'meetup') {
                                res = await meetupService.cancelRegistration(booking?.id || '');
                            } else {
                                res = await bookingService.cancelBooking(booking?.id || '');
                            }
                            if (res.success) {
                                Alert.alert('Success', 'Booking cancelled successfully');
                                router.back();
                            } else {
                                Alert.alert('Error', 'Failed to cancel booking');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to cancel booking');
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const handleBookAgain = () => {
        router.push('/blood-test');
    };

    const handleRescheduleClick = () => {
        Alert.alert(
            'Reschedule Appointment',
            'Reschedule requests must be approved by our admin team. You can contact our support team to request a reschedule.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Contact Support',
                    onPress: () => {
                        router.push('/help-support' as any);
                    },
                },
            ]
        );
    };

    const isUpcoming = booking && new Date(booking.scheduledDate) > new Date() && booking.status !== 'cancelled';
    const isCompleted = booking?.status === 'completed';

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF' }]}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#1A1A1A' : '#FFFFFF'} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF' }]}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#1A1A1A' : '#FFFFFF'} />
                <View style={styles.centerContainer}>
                    <Text style={[styles.errorText, { color: isDarkMode ? '#E0E0E0' : '#000000' }]}>Booking not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF' }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#1A1A1A' : '#FFFFFF'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDarkMode ? '#252525' : '#FFFFFF' }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#E0E0E0' : TEXT_DARK} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDarkMode ? '#E0E0E0' : TEXT_DARK }]}>Booking Details</Text>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: isCompleted ? SUCCESS_GREEN : WARNING_AMBER },
                    ]}
                >
                    <Text style={styles.statusBadgeText}>
                        {isCompleted ? 'Completed' : 'Upcoming'}
                    </Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* Package Card */}
                <View style={styles.card}>
                    <View style={styles.packageHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.packageName}>{booking.packageName}</Text>
                            <Text style={styles.bookingId}>Booking ID: #{booking.bookingId}</Text>
                        </View>
                    </View>
                </View>

                {/* Rescheduled Notice (if applicable) */}
                {booking.status === 'rescheduled' && booking.rescheduledDate && (
                    <View style={[styles.card, styles.rescheduleCard]}>
                        <View style={styles.rescheduleHeader}>
                            <Ionicons name="alert-circle" size={16} color="#8B5CF6" />
                            <Text style={styles.rescheduleTitle}>Appointment Rescheduled</Text>
                        </View>
                        <View style={styles.rescheduleDates}>
                            <View>
                                <Text style={styles.rescheduleLabel}>Original Date</Text>
                                <Text style={styles.rescheduleValueOld}>
                                    {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                    {booking.scheduledTime && `, ${booking.scheduledTime}`}
                                </Text>
                            </View>
                            <View style={styles.rescheduleArrow}>
                                <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
                            </View>
                            <View>
                                <Text style={styles.rescheduleLabel}>New Date</Text>
                                <Text style={styles.rescheduleValueNew}>
                                    {new Date(booking.rescheduledDate).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                    {booking.rescheduledTime && `, ${booking.rescheduledTime}`}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Details Grid */}
                <View style={styles.card}>
                    <View style={styles.detailsGrid}>
                        {/* Date */}
                        <View style={styles.gridItem}>
                            <View style={styles.gridIcon}>
                                <Ionicons name="calendar" size={16} color={PRIMARY_GREEN} />
                            </View>
                            <Text style={styles.gridLabel}>Date & Time</Text>
                            <Text style={styles.gridValue}>
                                {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                                {booking.scheduledTime && `, ${booking.scheduledTime}`}
                            </Text>
                        </View>

                        {/* Collection Type */}
                        <View style={styles.gridItem}>
                            <View style={styles.gridIcon}>
                                <Ionicons name="home" size={16} color={PRIMARY_GREEN} />
                            </View>
                            <Text style={styles.gridLabel}>Collection Type</Text>
                            <Text style={styles.gridValue}>
                                {booking.collectionType === 'home' ? 'Home Collection' : 'Lab Visit'}
                            </Text>
                        </View>

                        {/* Tests Count */}
                        {booking.testsCount && (
                            <View style={styles.gridItem}>
                                <View style={styles.gridIcon}>
                                    <Ionicons name="flask" size={16} color={PRIMARY_GREEN} />
                                </View>
                                <Text style={styles.gridLabel}>Tests</Text>
                                <Text style={styles.gridValue}>{booking.testsCount}</Text>
                            </View>
                        )}

                        {/* Status */}
                        <View style={styles.gridItem}>
                            <View style={styles.gridIcon}>
                                <Ionicons name="checkmark-circle" size={16} color={PRIMARY_GREEN} />
                            </View>
                            <Text style={styles.gridLabel}>Status</Text>
                            <Text style={[styles.gridValue, { color: isCompleted ? SUCCESS_GREEN : booking?.status === 'rescheduled' ? '#8B5CF6' : WARNING_AMBER }]}>
                                {booking?.status === 'rescheduled' ? 'Rescheduled' : isCompleted ? 'Completed' : 'Upcoming'}
                            </Text>
                        </View>

                        {/* Assigned Personnel */}
                        <View style={styles.gridItem}>
                            <View style={styles.gridIcon}>
                                <Ionicons name="person" size={16} color={PRIMARY_GREEN} />
                            </View>
                            <Text style={styles.gridLabel}>Assigned Personnel</Text>
                            <Text style={styles.gridValue}>
                                {booking.assignedPersonnel || 'Not assigned'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Address Card */}
                {booking.collectionType === 'home' && booking.address && (
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="location" size={16} color={PRIMARY_GREEN} />
                            <Text style={styles.sectionTitle}>Collection Address</Text>
                        </View>
                        <Text style={styles.addressText}>{booking.address}</Text>
                        {booking.pincode && <Text style={styles.pincodeText}>{booking.pincode}</Text>}
                        {booking.landmark && (
                            <Text style={styles.landmarkText}>Landmark: {booking.landmark}</Text>
                        )}
                    </View>
                )}

                {/* Payment Card */}
                <View style={styles.card}>
                    <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Amount Paid</Text>
                        <View style={styles.paymentAmount}>
                            <Text style={styles.amountText}>₹{booking.amount}</Text>
                            <View style={[styles.paymentStatus, { backgroundColor: booking.paymentStatus === 'paid' ? SUCCESS_GREEN : '#EF4444' }]}>
                                <Text style={styles.paymentStatusText}>{booking.paymentStatus}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Report Section (if completed) */}
                {isCompleted && booking.reportReady && (
                    <View style={styles.card}>
                        <View style={styles.reportHeader}>
                            <View>
                                <Text style={styles.reportTitle}>Report is ready</Text>
                                {booking.reportGeneratedAt && (
                                    <Text style={styles.reportDate}>
                                        {new Date(booking.reportGeneratedAt).toLocaleDateString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.reportBadge}>
                                <Ionicons name="checkmark-circle" size={20} color={SUCCESS_GREEN} />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
                            onPress={handleDownloadReport}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <ActivityIndicator size="small" color={PRIMARY_GREEN} />
                            ) : (
                                <>
                                    <Ionicons name="download" size={16} color={PRIMARY_GREEN} />
                                    <Text style={styles.downloadBtnText}>Download Report</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Info Note (if upcoming) */}
                {isUpcoming && (
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={16} color={WARNING_AMBER} />
                        <Text style={styles.infoText}>
                            Our phlebotomist will contact you before arriving. Please keep your phone reachable.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.footer}>
                {isUpcoming ? (
                    <>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleRescheduleClick}
                        >
                            <Text style={styles.actionBtnText}>Reschedule</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.cancelBtn]}
                            onPress={handleCancelBooking}
                        >
                            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={styles.actionBtn} onPress={handleBookAgain}>
                        <Text style={styles.actionBtnText}>Book Again</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        textTransform: 'capitalize',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    packageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    packageName: {
        fontSize: 14,
        fontWeight: '700',
        color: isDarkMode ? '#E0E0E0' : TEXT_DARK,
        marginBottom: 4,
    },
    bookingId: {
        fontSize: 11,
        color: isDarkMode ? '#A0A0A0' : TEXT_MUTED,
        fontWeight: '500',
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
    },
    gridIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.15)' : '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    gridLabel: {
        fontSize: 10,
        color: isDarkMode ? '#A0A0A0' : TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 2,
    },
    gridValue: {
        fontSize: 12,
        fontWeight: '600',
        color: isDarkMode ? '#E0E0E0' : TEXT_DARK,
        textAlign: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: isDarkMode ? '#E0E0E0' : TEXT_DARK,
    },
    addressText: {
        fontSize: 13,
        fontWeight: '600',
        color: isDarkMode ? '#E0E0E0' : TEXT_DARK,
        marginBottom: 4,
    },
    pincodeText: {
        fontSize: 12,
        color: isDarkMode ? '#A0A0A0' : TEXT_MUTED,
        marginBottom: 4,
    },
    landmarkText: {
        fontSize: 12,
        color: isDarkMode ? '#A0A0A0' : TEXT_MUTED,
        fontStyle: 'italic',
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: isDarkMode ? '#E0E0E0' : TEXT_DARK,
    },
    paymentAmount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    amountText: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_GREEN,
    },
    paymentStatus: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    paymentStatusText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        textTransform: 'capitalize',
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    reportTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: isDarkMode ? '#E0E0E0' : TEXT_DARK,
        marginBottom: 2,
    },
    reportDate: {
        fontSize: 11,
        color: isDarkMode ? '#A0A0A0' : TEXT_MUTED,
    },
    reportBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.15)' : '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    downloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.15)' : '#F0FDF4',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
        gap: 6,
    },
    downloadBtnDisabled: {
        opacity: 0.6,
    },
    downloadBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        backgroundColor: isDarkMode ? 'rgba(217,119,6,0.15)' : '#FFFBEB',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(217,119,6,0.3)' : '#FEF3C7',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 12,
        color: isDarkMode ? '#D4A574' : '#92400E',
        flex: 1,
        lineHeight: 17,
        paddingTop: 2,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#3A3A3A' : CARD_BORDER,
        backgroundColor: isDarkMode ? '#252525' : '#FFFFFF',
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
    },
    rescheduleCard: {
        backgroundColor: isDarkMode ? 'rgba(139,92,246,0.15)' : '#F5F3FF',
        borderColor: isDarkMode ? 'rgba(139,92,246,0.3)' : '#E9D5FF',
    },
    rescheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    rescheduleTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8B5CF6',
    },
    rescheduleDates: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rescheduleLabel: {
        fontSize: 10,
        color: isDarkMode ? '#A0A0A0' : TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 4,
    },
    rescheduleValueOld: {
        fontSize: 12,
        fontWeight: '600',
        color: isDarkMode ? '#E0E0E0' : TEXT_DARK,
        textDecorationLine: 'line-through',
    },
    rescheduleValueNew: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8B5CF6',
    },
    rescheduleArrow: {
        paddingTop: 14,
        paddingHorizontal: 4,
    },
});

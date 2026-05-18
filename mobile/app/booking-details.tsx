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
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'failed';
    scheduledDate: string;
    scheduledTime?: string;
    collectionType: 'home' | 'lab';
    address?: string;
    pincode?: string;
    landmark?: string;
    phoneNumber?: string;
    testsCount?: number;
    reportReady: boolean;
    reportUrl?: string;
    reportGeneratedAt?: string;
    createdAt: string;
    amount: number;
}

export default function BookingDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (bookingId) {
            fetchBookingDetails();
        }
    }, [bookingId]);

    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            const res = await bookingService.getBookingDetails(bookingId || '');
            if (res.success && res.data) {
                setBooking(res.data);
            } else {
                Alert.alert('Error', 'Failed to load booking details');
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
                            const res = await bookingService.cancelBooking(booking?.id || '');
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

    const isUpcoming = booking && new Date(booking.scheduledDate) > new Date() && booking.status !== 'cancelled';
    const isCompleted = booking?.status === 'completed';

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar backgroundColor="#FFFFFF" />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar backgroundColor="#FFFFFF" />
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>Booking not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Details</Text>
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
                            <Text style={[styles.gridValue, { color: isCompleted ? SUCCESS_GREEN : WARNING_AMBER }]}>
                                {isCompleted ? 'Completed' : 'Upcoming'}
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
                        <TouchableOpacity style={styles.actionBtn}>
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
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_DARK,
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
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
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
        color: TEXT_DARK,
        marginBottom: 4,
    },
    bookingId: {
        fontSize: 11,
        color: TEXT_MUTED,
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
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    gridLabel: {
        fontSize: 10,
        color: TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 2,
    },
    gridValue: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_DARK,
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
        color: TEXT_DARK,
    },
    addressText: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 4,
    },
    pincodeText: {
        fontSize: 12,
        color: TEXT_MUTED,
        marginBottom: 4,
    },
    landmarkText: {
        fontSize: 12,
        color: TEXT_MUTED,
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
        color: TEXT_DARK,
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
        color: TEXT_DARK,
        marginBottom: 2,
    },
    reportDate: {
        fontSize: 11,
        color: TEXT_MUTED,
    },
    reportBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    downloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: '#F0FDF4',
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
        backgroundColor: '#FFFBEB',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FEF3C7',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 12,
        color: '#92400E',
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
        color: TEXT_DARK,
    },
    footer: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#FFFFFF',
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
});

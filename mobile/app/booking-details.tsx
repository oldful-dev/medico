import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Image } from 'react-native';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { bookingService } from '@/services/api/bookingService';
import { labService, LabOrderListItem, DigitalReportEntry } from '@/services/api/labService';
import { meetupService } from '@/services/api/meetupService';
import { activityService, ActivityUpdate } from '@/services/api/activityService';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/context/CartContext';
import { useUser } from '@/context/UserContext';
import { initSocket, joinUserRoom, onSocket } from '@/services/socket/socketManager';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { apiClient } from '@/services/api/apiClient';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';
const SUCCESS_GREEN = '#10B981';
const WARNING_AMBER = '#F59E0B';
const DANGER_RED = '#EF4444';
const PURPLE = '#8B5CF6';

// Mirrors EVENT_CONFIG_BASE in profile/activity-center.tsx so the same event
// types render with consistent color/icon meaning across the app.
const ACTIVITY_EVENT_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    doctor_assigned:       { icon: 'medical-outline',         color: '#2563EB' },
    caregiver_assigned:    { icon: 'heart-outline',           color: '#DB2777' },
    nurse_assigned:        { icon: 'bandage-outline',         color: '#7C3AED' },
    appointment_confirmed: { icon: 'checkmark-circle-outline', color: '#059669' },
    sample_collected:      { icon: 'flask-outline',            color: '#7C3AED' },
    out_for_delivery:      { icon: 'bicycle-outline',          color: '#D97706' },
    medicine_delivered:    { icon: 'bag-check-outline',        color: '#048357' },
    service_rescheduled:   { icon: 'calendar-outline',         color: '#EA580C' },
    payment_confirmed:     { icon: 'card-outline',             color: '#0284C7' },
    phlebo_assigned:       { icon: 'person-outline',            color: '#2563EB' },
    sample_processing:     { icon: 'hourglass-outline',         color: '#7C3AED' },
    booking_cancelled:     { icon: 'close-circle-outline',      color: '#DC2626' },
};

interface BookingDetail {
    id: string;
    bookingId: string;
    packageName: string;
    packageCode: string;
    serviceType: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'expired'
        | 'hold_created' | 'payment_pending' | 'processing' | 'needs_attention';
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
    trackingLink?: string | null;
    reportReady: boolean;
    reportUrl?: string;
    reportGeneratedAt?: string;
    createdAt: string;
    amount: number;
    packagePrice?: number; // Redcliffe package cost for rebook pricing
    // For re-booking service orders
    serviceId?: string;
    cityId?: string;
}

// Map LabOrder to BookingDetail
function normalizeLabOrderDetail(order: LabOrderListItem): BookingDetail {
    const pkg = order.packages?.[0];
    const payment = order.payments?.[0];
    // Mirrors the same real-LabStatus mapping in my-bookings.tsx — keeps
    // "sample processing" and "needs manual recovery" distinct from generic
    // pending/confirmed so the customer sees an honest, granular status.
    const mapLabStatus = (s: string): BookingDetail['status'] => {
        if (s === 'REPORT_GENERATED') return 'completed';
        if (s === 'SAMPLE_COLLECTED' || s === 'PROCESSING') return 'processing';
        if (s === 'CANCELLED' || s === 'FAILED') return 'cancelled';
        if (s === 'RESCHEDULED') return 'rescheduled';
        if (s === 'CONFIRMED') return 'confirmed';
        if (s === 'HOLD_CREATED') return 'hold_created';
        if (s === 'PAYMENT_PENDING') return 'payment_pending';
        if (s === 'MANUAL_RECOVERY_NEEDED') return 'needs_attention';
        return 'pending';
    };
    // pkg.cost = Redcliffe package price; payment.amount = actual paid
    const packagePrice = Math.round(pkg?.cost || (pkg as any)?.price || (pkg as any)?.discounted_cost || 0);
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
        trackingLink: order.trackingLink,
        reportReady: order.status === 'REPORT_GENERATED' && !!order.reportUrl,
        reportUrl: order.reportUrl,
        createdAt: order.createdAt,
        // Use payment amount for display; fall back to package cost
        amount: Math.round(payment?.amount || packagePrice),
        packagePrice,
    };
}

function normalizeMeetupDetail(reg: any): BookingDetail {
    const meetup = reg.meetup || {};
    const eventDate = meetup.eventDate;
    const startTime = meetup.startTime;
    const endTime = meetup.endTime;
    const thresholdStr = endTime || startTime || "23:59";
    
    let isPast = false;
    if (eventDate) {
        const d = new Date(eventDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        
        let hours = 0;
        let minutes = 0;
        if (thresholdStr) {
            const ampmMatch = thresholdStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (ampmMatch) {
                hours = parseInt(ampmMatch[1], 10);
                minutes = parseInt(ampmMatch[2], 10);
                const ampm = ampmMatch[3].toUpperCase();
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
            } else {
                const match = thresholdStr.match(/(\d+):(\d+)/);
                if (match) {
                    hours = parseInt(match[1], 10);
                    minutes = parseInt(match[2], 10);
                }
            }
        }
        
        const hh = String(hours).padStart(2, '0');
        const min = String(minutes).padStart(2, '0');
        const eventDateTime = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00+05:30`);
        isPast = new Date() > eventDateTime;
    }

    let bookingStatus: BookingDetail['status'] = 'confirmed';
    if (reg.status === 'CANCELLED') {
        bookingStatus = 'cancelled';
    } else if (reg.status === 'ATTENDED') {
        bookingStatus = 'completed';
    } else if (isPast) {
        bookingStatus = 'expired';
    } else if (reg.status === 'PENDING') {
        bookingStatus = 'pending';
    }

    return {
        id: reg.id,
        bookingId: reg.bookingCode,
        packageName: meetup.title || 'Local Meetup',
        packageCode: '',
        serviceType: 'meetup',
        status: bookingStatus,
        paymentStatus: reg.paymentStatus === 'PAID' ? 'paid' : 'pending',
        scheduledDate: meetup.eventDate || '',
        scheduledTime: meetup.startTime,
        collectionType: reg.pickupEnabled ? 'home' : 'lab',
        address: reg.pickupEnabled ? reg.pickupAddress || '' : meetup.venue || '',
        pincode: meetup.pinCode || '',
        landmark: reg.pickupLandmark || '',
        reportReady: false,
        createdAt: reg.createdAt,
        amount: Math.round(reg.amountPaid || 0),
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
        amount: Math.round(b.amount || 0),
        serviceId: b.serviceId,
        cityId: b.cityId,
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
    const { t } = useTranslation();
    const { addItem, clearCategory } = useCart();
    const { profile } = useUser();
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
    const [activityUpdates, setActivityUpdates] = useState<ActivityUpdate[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [testResultsExpanded, setTestResultsExpanded] = useState(false);
    const [testResultsLoading, setTestResultsLoading] = useState(false);
    const [digitalReport, setDigitalReport] = useState<DigitalReportEntry[] | null>(null);
    const [historicalValues, setHistoricalValues] = useState<Record<string, { date: string; value: string; is_highlighted?: boolean }[]>>({});

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        iconName?: string;
        buttonText?: string;
        onClose?: () => void;
        secondaryButtonText?: string;
        onSecondaryPress?: () => void;
        secondaryDestructive?: boolean;
    }>({
        visible: false, title: '', message: ''
    });
    const triggerAlert = (
        title: string,
        message: string,
        iconName = 'warning-outline',
        buttonText = 'OK',
        onClose?: () => void,
        secondaryButtonText?: string,
        onSecondaryPress?: () => void,
        secondaryDestructive = false
    ) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            iconName,
            buttonText,
            onClose,
            secondaryButtonText,
            onSecondaryPress,
            secondaryDestructive
        });
    };

    useEffect(() => {
        if (bookingId) {
            fetchBookingDetails();
        }
    }, [bookingId, type]);

    // ─── Live personnel/status timeline (lab bookings only) ────────────────
    // The backend already emits ActivityUpdate rows + a Socket.io event whenever
    // admin assigns staff or an event fires; getMyUpdates() returns every update
    // across the user's orders, so we just filter to this one booking.
    const fetchActivityUpdates = useCallback(async (silent = false) => {
        if (type !== 'lab' || !bookingId) return;
        if (!silent) setActivityLoading(true);
        try {
            const res = await activityService.getMyUpdates();
            const all: ActivityUpdate[] = (res as any)?.data || [];
            setActivityUpdates(all.filter(u => u.labOrderId === bookingId));
        } catch { /* silent — timeline is supplementary, not blocking */ }
        finally { setActivityLoading(false); }
    }, [type, bookingId]);

    useEffect(() => {
        fetchActivityUpdates();
    }, [fetchActivityUpdates]);

    useEffect(() => {
        if (type !== 'lab' || !bookingId) return;
        let unsubscribe: (() => void) | undefined;
        (async () => {
            try {
                await initSocket();
                if (profile?.id) await joinUserRoom(profile.id);
                unsubscribe = onSocket('activity_update_created', (update: ActivityUpdate) => {
                    if (update.labOrderId === bookingId) {
                        setActivityUpdates(prev => [update, ...prev]);
                    }
                });
            } catch { /* socket is best-effort; polling fallback already covers first load */ }
        })();
        return () => { unsubscribe?.(); };
    }, [type, bookingId, profile?.id]);

    // ─── Structured test results (fetched on-demand, not on mount) ─────────
    // GET /labs/booking/:id/digital-report returns real Redcliffe per-parameter
    // values (name/value/unit/reference range/is_highlighted) — distinct from
    // the PDF-only consolidated report already used by the Download button.
    const handleToggleTestResults = async () => {
        const next = !testResultsExpanded;
        setTestResultsExpanded(next);
        if (!next || digitalReport || !bookingId) return;

        setTestResultsLoading(true);
        try {
            const res = await labService.getDigitalReport(bookingId);
            const entries: DigitalReportEntry[] = (res as any)?.data || [];
            setDigitalReport(entries);

            // Pull prior values for the same parameters from the user's other
            // completed orders — plain client-side aggregation, no new endpoint.
            const paramNames = new Set<string>();
            entries.forEach(e => e.test_values?.forEach(v => paramNames.add(v.test_parameter?.name)));

            if (paramNames.size > 0) {
                const ordersRes = await labService.getUserLabOrders();
                const otherOrders = ((ordersRes as any)?.data || [])
                    .filter((o: LabOrderListItem) => o.id !== bookingId && o.status === 'REPORT_GENERATED');

                const reports = await Promise.all(
                    otherOrders.slice(0, 5).map((o: LabOrderListItem) =>
                        labService.getDigitalReport(o.id).catch(() => null))
                );

                const history: Record<string, { date: string; value: string; is_highlighted?: boolean }[]> = {};
                reports.forEach((r: any) => {
                    const rEntries: DigitalReportEntry[] = r?.data || [];
                    rEntries.forEach(e => {
                        e.test_values?.forEach(v => {
                            const name = v.test_parameter?.name;
                            if (!name || !paramNames.has(name)) return;
                            if (!history[name]) history[name] = [];
                            history[name].push({ date: e.collection_date, value: v.value, is_highlighted: v.is_highlighted });
                        });
                    });
                });
                Object.values(history).forEach(rows => rows.sort((a, b) => b.date.localeCompare(a.date)));
                setHistoricalValues(history);
            }
        } catch { /* structured results are supplementary — PDF download still works */ }
        finally { setTestResultsLoading(false); }
    };

    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            if (type === 'lab') {
                const res = await labService.getLabOrderById(bookingId || '');
                if (res.success && res.data) {
                    setBooking(normalizeLabOrderDetail(res.data as LabOrderListItem));
                } else {
                    triggerAlert(t('common.error'), t('booking_details.fail_load'));
                }
            } else if (type === 'meetup') {
                const res = await meetupService.getRegistrationById(bookingId || '');
                if (res.success && res.data) {
                    setBooking(normalizeMeetupDetail(res.data));
                } else {
                    triggerAlert(t('common.error'), t('booking_details.fail_load_meetup'));
                }
            } else {
                const res = await bookingService.getBookingById(bookingId || '');
                if (res.success && res.data) {
                    setBooking(normalizeServiceDetail(res.data));
                } else {
                    triggerAlert(t('common.error'), t('booking_details.fail_load'));
                }
            }
        } catch (error) {
            console.error('Failed to fetch booking details:', error);
            triggerAlert(t('common.error'), t('booking_details.fail_load'));
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!booking?.reportUrl) {
            triggerAlert(t('common.error'), t('booking_details.report_url_unavailable'));
            return;
        }

        try {
            setDownloading(true);
            const supported = await Linking.canOpenURL(booking.reportUrl);
            if (supported) {
                await Linking.openURL(booking.reportUrl);
            } else {
                triggerAlert(t('common.error'), t('booking_details.cannot_open_report'));
            }
        } catch (error) {
            triggerAlert(t('common.error'), t('booking_details.fail_download'));
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadInvoice = async () => {
        if (!booking?.id || downloadingInvoice) return;
        setDownloadingInvoice(true);
        try {
            const token = apiClient.getAuthToken();
            const baseUrl = apiClient.getBaseUrl();
            // Lab-order payments use Payment.labOrderId, not Payment.bookingId, so
            // they're served by a separate invoice endpoint under /labs/.
            const url = type === 'lab'
                ? `${baseUrl}/labs/booking/${booking.id}/invoice`
                : `${baseUrl}/bookings/${booking.id}/invoice`;

            const localUri = `${FileSystem.cacheDirectory}Invoice_${booking.bookingId || booking.id}.pdf`;

            const downloadResult = await FileSystem.downloadAsync(url, localUri, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (downloadResult.status !== 200) {
                throw new Error(`Server returned ${downloadResult.status}`);
            }

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Invoice – ${booking.bookingId || booking.id}`,
                    UTI: 'com.adobe.pdf',
                });
            } else {
                triggerAlert('Invoice Downloaded', `Saved to: ${downloadResult.uri}`, 'checkmark-circle-outline');
            }
        } catch (err: any) {
            console.error('[BookingDetails] Invoice download failed:', err);
            triggerAlert(
                'Download Failed',
                err?.message?.includes('404') || err?.message?.includes('not found')
                    ? 'Invoice not available yet. It may still be generating after payment.'
                    : 'Could not download invoice. Please try again.'
            );
        } finally {
            setDownloadingInvoice(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!isUpcoming) {
            triggerAlert(t('common.error'), t('booking_details.fail_cancel'));
            return;
        }
        triggerAlert(
            t('booking_details.cancel_alert_title'),
            t('booking_details.cancel_alert_msg'),
            'warning-outline',
            t('booking_details.yes_cancel'),
            async () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
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
                        triggerAlert(t('common.success'), t('booking_details.cancel_success'), 'checkmark-circle-outline', 'OK', () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            router.back();
                        });
                    } else {
                        triggerAlert(t('common.error'), t('booking_details.fail_cancel'));
                    }
                } catch (error) {
                    triggerAlert(t('common.error'), t('booking_details.fail_cancel'));
                }
            },
            t('common.no'),
            () => setAlertConfig(prev => ({ ...prev, visible: false })),
            true
        );
    };

    const handleBookAgain = () => {
        if (!booking) return;

        if (type === 'lab') {
            // Blood test re-booking: add package to cart, then go to unified checkout
            // Checkout will show the date/time slot picker dynamically (category='blood-test')
            const price = booking.packagePrice || booking.amount || 0;
            clearCategory('blood-test'); // clear old items first
            addItem({
                id: booking.packageCode || booking.id,
                serviceType: 'Bloodwork',
                title: booking.packageName,
                price,
                quantity: 1,
                details: {
                    code: booking.packageCode,
                    name: booking.packageName,
                    cost: price,
                },
            });
            router.push({
                pathname: '/payment/checkout',
                params: {
                    category: 'blood-test',
                    amount: String(price),
                    label: booking.packageName,
                    skipUpsell: '1',
                },
            } as any);
            return;
        }

        // Service / meetup re-booking → directly to unified checkout (skip form)
        const bookingPayload = JSON.stringify({
            serviceId: booking.serviceId,
            cityId: booking.cityId,
            scheduledDate: new Date().toISOString(),
            formDataJson: {},
        });

        router.push({
            pathname: '/payment/checkout',
            params: {
                bookingPayload,
                amount: String(booking.amount),
                label: booking.packageName,
                skipUpsell: '1',
            },
        } as any);
    };

    const handleRescheduleClick = () => {
        triggerAlert(
            t('booking_details.reschedule_title'),
            t('booking_details.reschedule_msg'),
            'warning-outline',
            t('booking_details.contact_support'),
            () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                router.push('/help-support' as any);
            },
            t('common.cancel'),
            () => setAlertConfig(prev => ({ ...prev, visible: false }))
        );
    };

    const isUpcoming = booking && new Date(booking.scheduledDate) > new Date() && booking.status !== 'cancelled' && booking.status !== 'expired' && booking.status !== 'completed';
    const isCompleted = booking?.status === 'completed';
    const isExpired = booking?.status === 'expired';

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#111827' : '#F5F0E1' }]}>
                <StatusBar style="light" backgroundColor={PRIMARY_GREEN} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#111827' : '#F5F0E1' }]}>
                <StatusBar style="light" backgroundColor={PRIMARY_GREEN} />
                <View style={styles.centerContainer}>
                    <Text style={[styles.errorText, { color: isDarkMode ? '#F9FAFB' : '#000000' }]}>{t('booking_details.booking_not_found')}</Text>
                </View>
                <CustomAlertModal
                    visible={alertConfig.visible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    iconName={alertConfig.iconName as any || 'warning-outline'}
                    buttonText={alertConfig.buttonText || 'OK'}
                    onClose={alertConfig.onClose || (() => setAlertConfig(prev => ({ ...prev, visible: false })))}
                    secondaryButtonText={alertConfig.secondaryButtonText}
                    onSecondaryPress={alertConfig.onSecondaryPress}
                    secondaryDestructive={alertConfig.secondaryDestructive}
                />
            </View>
        );
    }

    const headerStatusColor = booking.status === 'cancelled' ? DANGER_RED
        : booking.status === 'rescheduled' ? PURPLE
        : isCompleted ? SUCCESS_GREEN
        : isExpired ? DANGER_RED
        : booking.status === 'processing' ? '#0EA5E9'
        : booking.status === 'needs_attention' ? '#EA580C'
        : WARNING_AMBER;
    const headerStatusLabel = booking.status === 'cancelled' ? t('booking_details.cancelled', 'Cancelled')
        : booking.status === 'rescheduled' ? t('booking_details.rescheduled_status')
        : isCompleted ? t('booking_details.completed')
        : isExpired ? t('booking_details.expired')
        : booking.status === 'processing' ? t('booking_details.processing', 'Sample Processing')
        : booking.status === 'needs_attention' ? t('booking_details.needs_attention', 'Needs Attention')
        : booking.status === 'hold_created' ? t('booking_details.hold_created', 'Slot Reserved')
        : booking.status === 'payment_pending' ? t('booking_details.payment_pending', 'Payment Pending')
        : t('booking_details.upcoming');

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#111827' : '#F5F0E1' }]}>
            <StatusBar style="light" backgroundColor={PRIMARY_GREEN} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
                    <Ionicons name="arrow-back" size={22} color="#FAF7ED" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('booking_details.header')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: headerStatusColor }]}>
                    <Text style={styles.statusBadgeText}>
                        {headerStatusLabel}
                    </Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Package Card */}
                <View style={styles.card}>
                    <View style={styles.packageHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.packageName}>{booking.packageName}</Text>
                            <Text style={styles.bookingId}>{t('booking_details.booking_id', { id: booking.bookingId })}</Text>
                        </View>
                    </View>
                </View>

                {/* Rescheduled Notice (if applicable) */}
                {booking.status === 'rescheduled' && booking.rescheduledDate && (
                    <View style={[styles.card, styles.rescheduleCard]}>
                        <View style={styles.rescheduleHeader}>
                            <Ionicons name="alert-circle" size={16} color="#8B5CF6" />
                            <Text style={styles.rescheduleTitle}>{t('booking_details.appointment_rescheduled')}</Text>
                        </View>
                        <View style={styles.rescheduleDates}>
                            <View>
                                <Text style={styles.rescheduleLabel}>{t('booking_details.original_date')}</Text>
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
                                <Text style={styles.rescheduleLabel}>{t('booking_details.new_date')}</Text>
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
                            <Text style={styles.gridLabel}>{t('booking_details.date_time')}</Text>
                            <Text style={styles.gridValue}>
                                {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                                {booking.scheduledTime && `, ${booking.scheduledTime}`}
                            </Text>
                        </View>

                        {/* Collection Type / Service Type */}
                        <View style={styles.gridItem}>
                            <View style={styles.gridIcon}>
                                <Ionicons name="home" size={16} color={PRIMARY_GREEN} />
                            </View>
                            <Text style={styles.gridLabel}>
                                {booking.serviceType === 'blood-test' 
                                    ? t('booking_details.collection_type') 
                                    : t('booking_details.service')}
                            </Text>
                            <Text style={styles.gridValue}>
                                {booking.serviceType === 'blood-test'
                                    ? (booking.collectionType === 'home' ? t('booking_details.home_collection') : t('booking_details.lab_visit'))
                                    : booking.packageName}
                            </Text>
                        </View>

                        {/* Tests Count */}
                        {booking.testsCount && (
                            <View style={styles.gridItem}>
                                <View style={styles.gridIcon}>
                                    <Ionicons name="flask" size={16} color={PRIMARY_GREEN} />
                                </View>
                                <Text style={styles.gridLabel}>{t('booking_details.tests')}</Text>
                                <Text style={styles.gridValue}>{booking.testsCount}</Text>
                            </View>
                        )}

                        {/* Status */}
                        <View style={styles.gridItem}>
                            <View style={styles.gridIcon}>
                                <Ionicons name="checkmark-circle" size={16} color={PRIMARY_GREEN} />
                            </View>
                            <Text style={styles.gridLabel}>{t('booking_details.status')}</Text>
                            <Text style={[styles.gridValue, { color: headerStatusColor }]}>
                                {headerStatusLabel}
                            </Text>
                        </View>

                        {/* Assigned Personnel */}
                        <View style={styles.gridItem}>
                            <View style={styles.gridIcon}>
                                <Ionicons name="person" size={16} color={PRIMARY_GREEN} />
                            </View>
                            <Text style={styles.gridLabel}>{t('booking_details.assigned_personnel')}</Text>
                            <Text style={styles.gridValue}>
                                {booking.assignedPersonnel || t('booking_details.not_assigned')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Address Card */}
                {booking.collectionType === 'home' && booking.address && (
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="location" size={16} color={PRIMARY_GREEN} />
                            <Text style={styles.sectionTitle}>{t('booking_details.collection_address')}</Text>
                        </View>
                        <Text style={styles.addressText}>{booking.address}</Text>
                        {booking.pincode && <Text style={styles.pincodeText}>{booking.pincode}</Text>}
                        {booking.landmark && (
                            <Text style={styles.landmarkText}>{t('booking_details.landmark', { value: booking.landmark })}</Text>
                        )}
                    </View>
                )}

                {/* Live Personnel / Status Timeline (lab bookings only) */}
                {type === 'lab' && (
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="pulse" size={16} color={PRIMARY_GREEN} />
                            <Text style={styles.sectionTitle}>{t('booking_details.timeline_title', 'Live Updates')}</Text>
                        </View>

                        {activityLoading ? (
                            <ActivityIndicator size="small" color={PRIMARY_GREEN} style={{ marginVertical: 12 }} />
                        ) : activityUpdates.length === 0 ? (
                            <View style={styles.timelineEmpty}>
                                <Ionicons name="time-outline" size={18} color={TEXT_MUTED} />
                                <Text style={styles.timelineEmptyText}>
                                    {t('booking_details.personnel_pending', 'Personnel Assignment Pending')}
                                </Text>
                            </View>
                        ) : (
                            activityUpdates.map((update, idx) => {
                                const cfg = ACTIVITY_EVENT_CONFIG[update.eventType] || ACTIVITY_EVENT_CONFIG.appointment_confirmed;
                                return (
                                    <View key={update.id} style={[styles.timelineItem, idx === activityUpdates.length - 1 && { borderBottomWidth: 0 }]}>
                                        <View style={[styles.timelineDot, { backgroundColor: cfg.color }]}>
                                            <Ionicons name={cfg.icon} size={13} color="#FFFFFF" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.timelineStatusDetail}>
                                                {update.statusDetail || update.eventType.replace(/_/g, ' ')}
                                            </Text>
                                            <View style={styles.timelineStaffRow}>
                                                {update.staffPhotoUrl ? (
                                                    <Image source={{ uri: update.staffPhotoUrl }} style={styles.timelineStaffPhoto} />
                                                ) : (
                                                    <View style={styles.timelineStaffPhotoFallback}>
                                                        <Ionicons name="person" size={14} color={TEXT_MUTED} />
                                                    </View>
                                                )}
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.timelineStaffName}>{update.staffName}</Text>
                                                    {update.eta ? (
                                                        <Text style={styles.timelineEta}>{t('booking_details.eta', 'ETA')} {update.eta}</Text>
                                                    ) : null}
                                                </View>
                                                {update.staffPhone ? (
                                                    <TouchableOpacity
                                                        style={styles.timelineCallBtn}
                                                        onPress={() => Linking.openURL(`tel:${update.staffPhone}`)}
                                                    >
                                                        <Ionicons name="call" size={13} color="#FFFFFF" />
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}

                        {booking.trackingLink ? (
                            <TouchableOpacity
                                style={styles.trackPhleboBtn}
                                onPress={() => WebBrowser.openBrowserAsync(booking.trackingLink!)}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                                <Text style={styles.trackPhleboBtnText}>{t('booking_details.track_phlebo', 'Track Phlebotomist')}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )}

                {/* Payment Card */}
                <View style={styles.card}>
                    <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>{t('booking_details.amount_paid')}</Text>
                        <View style={styles.paymentAmount}>
                            <Text style={styles.amountText}>₹{Math.round(booking.amount)}</Text>
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
                                <Text style={styles.reportTitle}>{t('booking_details.report_ready')}</Text>
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
                                    <Text style={styles.downloadBtnText}>{t('booking_details.download_report')}</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Structured Test Results (real Redcliffe values, expand on tap) */}
                        <TouchableOpacity
                            style={styles.testResultsToggle}
                            onPress={handleToggleTestResults}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="flask-outline" size={15} color={PRIMARY_GREEN} />
                            <Text style={styles.testResultsToggleText}>{t('booking_details.view_test_results', 'View Test Results')}</Text>
                            <Ionicons name={testResultsExpanded ? 'chevron-up' : 'chevron-down'} size={15} color={TEXT_MUTED} />
                        </TouchableOpacity>

                        {testResultsExpanded && (
                            testResultsLoading ? (
                                <ActivityIndicator size="small" color={PRIMARY_GREEN} style={{ marginVertical: 12 }} />
                            ) : !digitalReport || digitalReport.length === 0 ? (
                                <Text style={styles.testResultsEmpty}>
                                    {t('booking_details.test_results_unavailable', 'Test results not available yet')}
                                </Text>
                            ) : (
                                digitalReport.map((entry) => (
                                    <View key={entry.booking_id} style={styles.groupCard}>
                                        {entry.test_values?.map((tv) => {
                                            const history = historicalValues[tv.test_parameter?.name] || [];
                                            return (
                                                <View key={tv.id} style={styles.paramList}>
                                                    <View style={styles.testValueRow}>
                                                        <Text style={styles.testValueName} numberOfLines={2}>{tv.test_parameter?.name}</Text>
                                                        <Text style={[styles.testValueNumber, tv.is_highlighted && { color: '#EF4444' }]}>
                                                            {tv.value} {tv.test_parameter?.unit}
                                                        </Text>
                                                    </View>
                                                    {(tv.test_parameter?.reference_range_male || tv.test_parameter?.reference_range_female) && (
                                                        <Text style={styles.testValueRange}>
                                                            {t('booking_details.reference_range', 'Reference')}: {tv.test_parameter.reference_range_male || tv.test_parameter.reference_range_female}
                                                        </Text>
                                                    )}

                                                    {history.length > 0 && (
                                                        <View style={styles.trendBox}>
                                                            <Text style={styles.trendLabel}>{t('booking_details.past_readings', 'Past Readings')}</Text>
                                                            {history.map((h, i) => (
                                                                <View key={i} style={styles.trendRow}>
                                                                    <View style={[styles.trendDot, { backgroundColor: h.is_highlighted ? '#EF4444' : '#10B981' }]} />
                                                                    <Text style={styles.trendDate}>
                                                                        {new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                    </Text>
                                                                    <Text style={[styles.trendValue, h.is_highlighted && { color: '#EF4444' }]}>{h.value}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))
                            )
                        )}
                    </View>
                )}

                {/* Info Note (if upcoming blood test) */}
                {isUpcoming && booking.serviceType === 'blood-test' && (
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={16} color={WARNING_AMBER} />
                        <Text style={styles.infoText}>
                            {t('booking_details.phlebotomist_note')}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={styles.footerRow}>
                    {isUpcoming ? (
                        <>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={handleRescheduleClick}
                            >
                                <Text style={styles.actionBtnText}>{t('booking_details.reschedule')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.cancelBtn]}
                                onPress={handleCancelBooking}
                            >
                                <Text style={styles.cancelBtnText}>{t('booking_details.cancel_booking')}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleBookAgain}>
                            <Text style={styles.actionBtnText}>{t('booking_details.book_again')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Download Invoice */}
                {booking.paymentStatus === 'paid' && (
                    <TouchableOpacity
                        style={[styles.invoiceBtn, downloadingInvoice && { opacity: 0.6 }]}
                        onPress={handleDownloadInvoice}
                        disabled={downloadingInvoice}
                        activeOpacity={0.8}
                    >
                        {downloadingInvoice ? (
                            <ActivityIndicator size="small" color={PRIMARY_GREEN} />
                        ) : (
                            <Ionicons name="receipt-outline" size={16} color={PRIMARY_GREEN} />
                        )}
                        <Text style={styles.invoiceBtnText}>
                            {downloadingInvoice ? 'Generating...' : 'Download Invoice'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                iconName={alertConfig.iconName as any || 'warning-outline'}
                buttonText={alertConfig.buttonText || 'OK'}
                onClose={alertConfig.onClose || (() => setAlertConfig(prev => ({ ...prev, visible: false })))}
                secondaryButtonText={alertConfig.secondaryButtonText}
                onSecondaryPress={alertConfig.onSecondaryPress}
                secondaryDestructive={alertConfig.secondaryDestructive}
            />
        </View>
    );
}

const makeStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        backgroundColor: PRIMARY_GREEN,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
        color: '#FAF7ED',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FAF7ED',
        textTransform: 'capitalize',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: isDarkMode ? '#1F2937' : '#FAF7ED',
        borderWidth: 1,
        borderColor: isDarkMode ? '#374151' : CARD_BORDER,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.2 : 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    packageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    packageName: {
        fontSize: 15,
        fontWeight: '700',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
        marginBottom: 4,
        lineHeight: 22,
    },
    bookingId: {
        fontSize: 11,
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
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
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 2,
    },
    gridValue: {
        fontSize: 12,
        fontWeight: '600',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
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
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
    },
    addressText: {
        fontSize: 13,
        fontWeight: '600',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
        marginBottom: 4,
    },
    pincodeText: {
        fontSize: 12,
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
        marginBottom: 4,
    },
    landmarkText: {
        fontSize: 12,
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
        fontStyle: 'italic',
    },
    timelineEmpty: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    timelineEmptyText: {
        fontSize: 12,
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#374151' : '#F0F0F0',
    },
    timelineDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
    },
    timelineStatusDetail: {
        fontSize: 12.5,
        fontWeight: '600',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
        marginBottom: 6,
        textTransform: 'capitalize',
    },
    timelineStaffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timelineStaffPhoto: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    timelineStaffPhotoFallback: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: isDarkMode ? '#374151' : '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineStaffName: {
        fontSize: 12,
        fontWeight: '600',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
    },
    timelineEta: {
        fontSize: 10.5,
        color: '#059669',
        fontWeight: '500',
    },
    timelineCallBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: PRIMARY_GREEN,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackPhleboBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 10,
        paddingVertical: 11,
        marginTop: 10,
    },
    trackPhleboBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
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
        color: '#FAF7ED',
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
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
        marginBottom: 2,
    },
    reportDate: {
        fontSize: 11,
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
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
    testResultsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        paddingVertical: 10,
    },
    testResultsToggleText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
    },
    testResultsEmpty: {
        fontSize: 12,
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
        paddingVertical: 8,
    },
    groupCard: {
        backgroundColor: isDarkMode ? '#252525' : '#F5F0E1',
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#EBEBEB',
        overflow: 'hidden',
    },
    paramList: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#3A3A3A' : '#EBEBEB',
    },
    testValueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
    },
    testValueName: {
        flex: 1,
        fontSize: 12.5,
        fontWeight: '600',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
    },
    testValueNumber: {
        fontSize: 13,
        fontWeight: '700',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
    },
    testValueRange: {
        fontSize: 11,
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
        marginTop: 2,
    },
    trendBox: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#3A3A3A' : '#EBEBEB',
    },
    trendLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 3,
    },
    trendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    trendDate: {
        flex: 1,
        fontSize: 11,
        color: isDarkMode ? '#9CA3AF' : TEXT_MUTED,
    },
    trendValue: {
        fontSize: 11.5,
        fontWeight: '600',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
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
        flexDirection: 'column',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#374151' : CARD_BORDER,
        backgroundColor: isDarkMode ? '#1F2937' : '#FAF7ED',
    },
    footerRow: {
        flexDirection: 'row',
        gap: 10,
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
        backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#FAF7ED',
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FAF7ED',
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
    },
    invoiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
        backgroundColor: isDarkMode ? 'rgba(2,116,63,0.1)' : '#F0FDF4',
    },
    invoiceBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: PRIMARY_GREEN,
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
        color: isDarkMode ? '#6B7280' : TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 4,
    },
    rescheduleValueOld: {
        fontSize: 12,
        fontWeight: '600',
        color: isDarkMode ? '#F9FAFB' : TEXT_DARK,
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

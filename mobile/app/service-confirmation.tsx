import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { bookingService, Booking } from '@/services/api/bookingService';
import { useTranslation } from 'react-i18next';

const PRIMARY = '#02743F';
const PRIMARY_DARK = '#015C32';
const PRIMARY_LIGHT = '#E8F5EE';

export default function ServiceConfirmationScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();

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

    const params = useLocalSearchParams<{
        bookingId?: string;
        bookingCode?: string;
        meetupEventDate?: string;
        meetupStartTime?: string;
        meetupEndTime?: string;
        meetupVenue?: string;
        meetupPinCode?: string;
        pickupEnabled?: string;
        pickupAddress?: string;
        preferredTime?: string;
        serviceName?: string;
        requestId?: string;
        description?: string;
        address?: string;
        status?: string;
        fee?: string;
    }>();

    const isMeetup = !!params.bookingCode && !!params.meetupEventDate;

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isMeetup) {
            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]).start();
        }
    }, [isMeetup]);

    const [booking, setBooking] = React.useState<Booking | null>(null);
    const [loading, setLoading] = React.useState(!isMeetup && !!params.bookingId);

    React.useEffect(() => {
        if (!isMeetup && params.bookingId) fetchBooking(params.bookingId);
    }, [params.bookingId, isMeetup]);

    const fetchBooking = async (id: string) => {
        try {
            setLoading(true);
            const res = await bookingService.getBookingById(id);
            if (res.success && res.data) setBooking(res.data);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (!booking?.id) return;
        triggerAlert(
            t('service_confirmation.cancel_request'),
            t('service_confirmation.cancel_confirm'),
            'warning-outline',
            t('service_confirmation.yes_cancel'),
            async () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                try {
                    const res = await bookingService.cancelBooking(booking.id);
                    if (res.success) {
                        triggerAlert(t('service_confirmation.cancelled'), t('service_confirmation.cancelled_msg'), 'checkmark-circle-outline', t('common.ok'), () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            fetchBooking(booking.id);
                        });
                    } else {
                        triggerAlert(t('common.error'), res.message || t('service_confirmation.cancel_failed'));
                    }
                } catch {
                    triggerAlert(t('common.error'), t('service_confirmation.something_wrong'));
                }
            },
            t('service_confirmation.no_keep_it'),
            () => setAlertConfig(prev => ({ ...prev, visible: false })),
            true
        );
    };

    const formatDescription = (b: Booking) => {
        const lines: string[] = [];
        if (b.symptoms?.length) lines.push(`Primary: ${b.symptoms.join(', ')}`);
        let fd = b.formDataJson;
        if (typeof fd === 'string') { try { fd = JSON.parse(fd); } catch { } }
        if (fd && typeof fd === 'object') {
            const skip = new Set(['attachments', 'serviceId', 'cityId']);
            Object.entries(fd).forEach(([k, v]) => {
                if (skip.has(k) || !v) return;
                if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string' &&
                    v.every((s: string) => s.startsWith('http') || s.startsWith('gs://'))) return;
                const label = k.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')
                    .replace(/^./, s => s.toUpperCase());
                if (Array.isArray(v) && typeof v[0] === 'string') lines.push(`${label}: ${v.join(', ')}`);
                else if (typeof v === 'string' && !v.startsWith('http')) lines.push(`${label}: ${v}`);
                else if (typeof v === 'number' || typeof v === 'boolean') lines.push(`${label}: ${v}`);
            });
        }
        return lines.length ? lines.join('\n') : t('service_confirmation.standard_request');
    };

    const getAttachments = (b: Booking): string[] => {
        let fd = b.formDataJson;
        if (typeof fd === 'string') { try { fd = JSON.parse(fd); } catch { } }
        if (!fd || typeof fd !== 'object') return [];
        const urls: string[] = [];
        Object.values(fd).forEach((v: any) => {
            if (typeof v === 'string' && v.startsWith('http')) urls.push(v);
            else if (Array.isArray(v)) v.forEach((s: any) => { if (typeof s === 'string' && s.startsWith('http')) urls.push(s); });
        });
        return urls;
    };

    const getInfoText = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('driver') || n.includes('cab') || n.includes('hospital')) return t('service_confirmation.info_driver');
        if (n.includes('medicine') || n.includes('blood') || n.includes('order')) return t('service_confirmation.info_order');
        if (n.includes('meal') || n.includes('tiffin')) return t('service_confirmation.info_meal');
        if (n.includes('nurse') || n.includes('physio') || n.includes('doctor')) return t('service_confirmation.info_healthcare');
        if (n.includes('paper') || n.includes('legal') || n.includes('bank') || n.includes('bill')) return t('service_confirmation.info_concierge');
        if (n.includes('cleaning') || n.includes('repair') || n.includes('plumbing') || n.includes('tech')) return t('service_confirmation.info_technician');
        return t('service_confirmation.info_default');
    };

    const getTrackLabel = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('driver') || n.includes('cab') || n.includes('hospital')) return t('service_confirmation.track_cab');
        if (n.includes('nurse') || n.includes('physio') || n.includes('doctor')) return t('service_confirmation.track_professional');
        if (n.includes('medicine') || n.includes('blood')) return t('service_confirmation.track_order');
        if (n.includes('meal') || n.includes('tiffin')) return t('service_confirmation.track_tiffin');
        if (n.includes('cleaning') || n.includes('repair') || n.includes('plumbing') || n.includes('tech')) return t('service_confirmation.track_technician');
        return t('service_confirmation.track_progress');
    };

    // ─── Theme tokens ─────────────────────────────────────────────────────────
    const bg         = isDarkMode ? '#121212' : '#FAF7ED';
    const cardBg     = isDarkMode ? '#1E1E1E' : '#FAF7ED';
    const cardBorder = isDarkMode ? '#2A2A2A' : '#E9ECF0';
    const textHigh   = isDarkMode ? '#F0F0F0' : '#1A1A1A';
    const textMid    = isDarkMode ? '#A0A0A0' : '#6B7280';
    const divider    = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const greenBg    = isDarkMode ? '#0D2B1E' : PRIMARY_LIGHT;
    const greenBorder= isDarkMode ? '#1A4A32' : '#C6E9D9';
    const greenText  = isDarkMode ? '#7FD4A8' : PRIMARY_DARK;

    // ─── Meetup mode ──────────────────────────────────────────────────────────
    if (isMeetup) {
        const meetupDate = (() => {
            if (!params.meetupEventDate) return '—';
            const d = new Date(params.meetupEventDate);
            return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleDateString('en-IN', { weekday: 'long' })}`;
        })();
        const meetupTime = params.meetupEndTime
            ? `${params.meetupStartTime} – ${params.meetupEndTime}`
            : (params.meetupStartTime ?? '—');

        const meetupDetailRows = [
            { icon: 'calendar-outline' as const, label: t('service_confirmation.date'), value: meetupDate },
            { icon: 'time-outline' as const, label: t('service_confirmation.time'), value: meetupTime },
            { icon: 'location-outline' as const, label: t('service_confirmation.venue'), value: params.meetupVenue ?? '—' },
            ...(params.meetupPinCode ? [{ icon: 'keypad-outline' as const, label: t('service_confirmation.pin_code'), value: params.meetupPinCode }] : []),
        ];

        const nextSteps = [
            { icon: 'phone-portrait-outline' as const, text: t('service_confirmation.step_sms') },
            { icon: 'people-outline' as const, text: t('service_confirmation.step_call') },
            { icon: 'car-outline' as const, text: params.pickupEnabled === 'true' ? t('service_confirmation.step_pickup') : t('service_confirmation.step_reach_venue') },
        ];

        return (
            <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
                <StatusBar style={isDarkMode ? 'light' : 'light'} backgroundColor={PRIMARY} />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 32, paddingBottom: insets.bottom + 100 }}>
                    {/* Success animation */}
                    <View style={{ alignItems: 'center', marginBottom: 28 }}>
                        <Animated.View style={{
                            width: 110, height: 110, borderRadius: 55,
                            backgroundColor: greenBg, justifyContent: 'center', alignItems: 'center',
                            marginBottom: 20, transform: [{ scale: scaleAnim }],
                        }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="checkmark" size={44} color="#fff" />
                            </View>
                        </Animated.View>
                        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                            <Text style={{ fontSize: 22, fontWeight: '700', color: textHigh, marginBottom: 8, textAlign: 'center' }}>{t('service_confirmation.registration_confirmed')}</Text>
                            <Text style={{ fontSize: 14, color: textMid, textAlign: 'center', lineHeight: 20 }}>{t('service_confirmation.meetup_joined')}</Text>
                            {params.bookingCode && (
                                <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY, marginTop: 12 }}>{t('service_confirmation.booking_code', { code: params.bookingCode })}</Text>
                            )}
                        </Animated.View>
                    </View>

                    {/* Details card */}
                    <Animated.View style={{ opacity: fadeAnim, backgroundColor: cardBg, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: cardBorder }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: textHigh, marginBottom: 16 }}>{t('service_confirmation.meeting_details')}</Text>
                        {meetupDetailRows.map((row, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: greenBg, justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name={row.icon} size={16} color={PRIMARY} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: textMid, marginBottom: 2 }}>{row.label}</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: textHigh }}>{row.value}</Text>
                                </View>
                            </View>
                        ))}
                        {params.pickupEnabled === 'true' && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: greenBg, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                                <Ionicons name="car-outline" size={16} color={PRIMARY} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: PRIMARY, marginBottom: 2 }}>{t('service_confirmation.pickup_arranged')}</Text>
                                    {params.pickupAddress ? <Text style={{ fontSize: 13, color: textMid }}>{params.pickupAddress}</Text> : null}
                                    {params.preferredTime ? <Text style={{ fontSize: 13, color: textMid }}>{t('service_confirmation.at_time', { time: params.preferredTime })}</Text> : null}
                                </View>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: greenBg, borderRadius: 10, padding: 12 }}>
                            <Ionicons name="information-circle-outline" size={16} color={PRIMARY} />
                            <Text style={{ fontSize: 12, color: textMid, flex: 1, lineHeight: 18 }}>{t('service_confirmation.will_contact_soon')}</Text>
                        </View>
                    </Animated.View>

                    {/* What's next */}
                    <Animated.View style={{ opacity: fadeAnim, backgroundColor: cardBg, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: cardBorder }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: textHigh, marginBottom: 14 }}>{t('service_confirmation.whats_next')}</Text>
                        {nextSteps.map((item, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: i < nextSteps.length - 1 ? 12 : 0 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: greenBg, justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name={item.icon} size={15} color={PRIMARY} />
                                </View>
                                <Text style={{ fontSize: 13, color: textMid, flex: 1 }}>{item.text}</Text>
                            </View>
                        ))}
                    </Animated.View>
                </ScrollView>

                <View style={{ backgroundColor: bg, paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: cardBorder, gap: 10 }}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15 }}
                        onPress={() => router.replace('/meetup/my-bookings' as any)} activeOpacity={0.85}
                    >
                        <Ionicons name="calendar-outline" size={18} color="#fff" />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FAF7ED' }}>{t('service_confirmation.go_my_bookings')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: cardBorder, borderRadius: 14, paddingVertical: 14 }}
                        onPress={() => router.replace('/(tabs)' as any)} activeOpacity={0.85}
                    >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: textMid }}>{t('service_confirmation.back_to_home')}</Text>
                    </TouchableOpacity>
                </View>

                <CustomAlertModal
                    visible={alertConfig.visible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    iconName={alertConfig.iconName as any || 'warning-outline'}
                    buttonText={alertConfig.buttonText || t('common.ok')}
                    onClose={alertConfig.onClose || (() => setAlertConfig(prev => ({ ...prev, visible: false })))}
                    secondaryButtonText={alertConfig.secondaryButtonText}
                    onSecondaryPress={alertConfig.onSecondaryPress}
                    secondaryDestructive={alertConfig.secondaryDestructive}
                />
            </View>
        );
    }

    // ─── Standard service booking ─────────────────────────────────────────────
    const dispName   = booking?.service?.name || params.serviceName || t('service_confirmation.service');
    const dispId     = booking?.bookingCode || params.requestId || 'REQ-PENDING';
    const dispDesc   = booking ? formatDescription(booking) : (params.description || t('service_confirmation.details_pending'));
    const dispAddr   = booking?.addressLine || params.address || t('service_confirmation.address_pending');
    const dispStatus = booking?.status || params.status || t('service_confirmation.confirmed_status');
    const dispFee    = booking?.amount ? `₹${booking.amount}` : (params.fee || t('service_confirmation.to_be_decided'));
    const dispDate   = booking?.scheduledDate
        ? new Date(booking.scheduledDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
        : t('service_confirmation.date_pending');
    const attachments = booking ? getAttachments(booking) : [];

    const serviceDetailRows = [
        { icon: 'construct-outline' as const, label: t('service_confirmation.service'), value: dispName },
        { icon: 'information-circle-outline' as const, label: t('service_confirmation.additional_details'), value: dispDesc },
        { icon: 'location-outline' as const, label: t('service_confirmation.address'), value: dispAddr },
        { icon: 'calendar-outline' as const, label: t('service_confirmation.scheduled_date'), value: dispDate },
        { icon: 'wallet-outline' as const, label: t('service_confirmation.booking_fee_estimate'), value: dispFee },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
            <View style={{ backgroundColor: PRIMARY, height: 0 }} />
            <StatusBar style="light" backgroundColor={PRIMARY} />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY, paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#FAF7ED', marginLeft: 12, letterSpacing: -0.3 }}>
                    {loading ? t('common.loading') : t('service_confirmation.booking_confirmed')}
                </Text>
            </View>

            {/* White card with rounded top */}
            <View style={{ flex: 1, backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -12, overflow: 'hidden' }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: insets.bottom + 100 }}>

                    {/* Success icon + title */}
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}>
                            <Ionicons name="checkmark" size={38} color="#FFFFFF" />
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: textHigh, marginBottom: 6, letterSpacing: -0.3 }}>
                            {loading ? t('service_confirmation.please_wait') : t('service_confirmation.booking_received')}
                        </Text>
                        <Text style={{ fontSize: 14, color: textMid, textAlign: 'center', lineHeight: 20 }}>
                            {loading ? t('service_confirmation.fetching_details') : t('service_confirmation.service_submitted')}
                        </Text>
                    </View>

                    {loading && <ActivityIndicator size="large" color={PRIMARY} style={{ marginBottom: 20 }} />}

                    {/* Request ID + status badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: greenBg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: greenBorder, borderStyle: 'dashed' }}>
                        <View>
                            <Text style={{ fontSize: 11, color: textMid, fontWeight: '500', marginBottom: 2 }}>{t('service_confirmation.request_id')}</Text>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: greenText, letterSpacing: 0.5 }}>{dispId}</Text>
                        </View>
                        <View style={{ backgroundColor: isDarkMode ? '#1A4A32' : '#D4EDDA', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: isDarkMode ? PRIMARY : '#A8D5B8' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#7FD4A8' : PRIMARY_DARK }}>{dispStatus}</Text>
                        </View>
                    </View>

                    {/* Service details card */}
                    <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: cardBorder }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: textHigh, marginBottom: 14, letterSpacing: -0.2 }}>{t('service_confirmation.service_details')}</Text>
                        {serviceDetailRows.map((row, i) => (
                            <View key={row.label}>
                                {i > 0 && <View style={{ height: 0.5, backgroundColor: divider, marginVertical: 2 }} />}
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 12 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: greenBg, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 }}>
                                        <Ionicons name={row.icon} size={15} color={PRIMARY} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: textMid, marginBottom: 2, fontWeight: '500' }}>{row.label}</Text>
                                        <Text style={{ fontSize: 13, color: textHigh, lineHeight: 18 }}>{row.value}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Attachments */}
                    {attachments.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: textHigh, marginBottom: 10 }}>{t('service_confirmation.uploaded_files')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                {attachments.map((url, idx) => (
                                    <TouchableOpacity key={idx} activeOpacity={0.9}>
                                        <Image source={{ uri: url }} style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: '#eee' }} resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <Text style={{ fontSize: 11, color: textMid, marginTop: 6 }}>{t('service_confirmation.files_uploaded_count', { count: attachments.length })}</Text>
                        </View>
                    )}

                    {/* Info banner */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: greenBg, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: greenBorder }}>
                        <Ionicons name="information-circle" size={18} color={PRIMARY} style={{ marginTop: 1 }} />
                        <Text style={{ flex: 1, fontSize: 13, color: greenText, lineHeight: 19 }}>{getInfoText(dispName)}</Text>
                    </View>
                </ScrollView>

                {/* Footer buttons — inside scroll flow via paddingBottom, not absolute */}
                <View style={{ backgroundColor: bg, paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: cardBorder, gap: 10 }}>
                    <TouchableOpacity style={{ backgroundColor: PRIMARY, paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.85}>
                        <Text style={{ color: '#FAF7ED', fontSize: 15, fontWeight: '700' }}>{getTrackLabel(dispName)}</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {booking && !['CANCELLED', 'COMPLETED'].includes(booking.status) && (
                            <TouchableOpacity
                                style={{ flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', backgroundColor: isDarkMode ? '#2A1515' : '#FFF0F0', borderWidth: 1, borderColor: '#FFCCCC' }}
                                onPress={handleCancel} activeOpacity={0.85}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#E53E3E' }}>{t('service_confirmation.cancel')}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: greenBg, borderWidth: 1, borderColor: greenBorder }}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="call-outline" size={16} color={PRIMARY} />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: PRIMARY }}>{t('service_confirmation.call_support')}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={{ alignItems: 'center', paddingVertical: 12 }}
                        onPress={() => router.replace('/(tabs)' as any)} activeOpacity={0.8}
                    >
                        <Text style={{ fontSize: 14, color: textMid, fontWeight: '500', textDecorationLine: 'underline' }}>{t('service_confirmation.back_to_home')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                iconName={alertConfig.iconName as any || 'warning-outline'}
                buttonText={alertConfig.buttonText || t('common.ok')}
                onClose={alertConfig.onClose || (() => setAlertConfig(prev => ({ ...prev, visible: false })))}
                secondaryButtonText={alertConfig.secondaryButtonText}
                onSecondaryPress={alertConfig.onSecondaryPress}
                secondaryDestructive={alertConfig.secondaryDestructive}
            />
        </View>
    );
}

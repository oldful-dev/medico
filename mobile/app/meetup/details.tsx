import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { meetupService } from '@/services/api/meetupService';
import type { Meetup } from '@/services/api/meetupService';
import { useTranslation } from 'react-i18next';

const PRIMARY = '#02743F';

export default function MeetupDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const { t } = useTranslation();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [meetup, setMeetup] = useState<Meetup | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRegistrations, setUserRegistrations] = useState<any[]>([]);

    useEffect(() => {
        if (!id) return;
        const loadData = async () => {
            try {
                const meetupRes = await meetupService.getMeetupById(id);
                if (meetupRes.success && meetupRes.data) setMeetup(meetupRes.data);

                const regRes = await meetupService.getMyRegistrations();
                if (regRes.success && regRes.data) setUserRegistrations(regRes.data);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    // Check if user already registered for this meetup
    const userRegistrationForThisMeetup = userRegistrations.find(r => r.meetupId === id);
    const canBook = !userRegistrationForThisMeetup;

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1A1A1A' : '#F5FAF7' }}>
                <ActivityIndicator size="large" color={PRIMARY} />
            </View>
        );
    }

    if (!meetup) return null;

    const seatsLeft = meetup.availableSeats;
    const seatsLow = seatsLeft <= 15;
    const eventDate = new Date(meetup.eventDate);
    const dateStr = eventDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const dayOfWeek = eventDate.toLocaleDateString('en-IN', { weekday: 'long' });

    return (
        <View style={[makeStyles(isDarkMode, colors).screen, { paddingTop: insets.top }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={PRIMARY} />

            {/* Header */}
            <View style={makeStyles(isDarkMode, colors).header}>
                <TouchableOpacity onPress={() => router.back()} style={makeStyles(isDarkMode, colors).backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={makeStyles(isDarkMode, colors).headerTitle}>{t('meetup.details_header', 'Local Meet Up Details')}</Text>
                <View style={{ width: 30 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={makeStyles(isDarkMode, colors).scrollContent}>
                {/* Banner with Image */}
                {meetup.imageUrl ? (
                    <Image source={{ uri: meetup.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
                ) : (
                    <View style={makeStyles(isDarkMode, colors).banner}>
                        <Ionicons name="people" size={56} color="rgba(255,255,255,0.35)" />
                        <Text style={makeStyles(isDarkMode, colors).bannerLabel}>{t('meetup.community_meetup', 'Community Meetup')}</Text>
                    </View>
                )}

                {/* Main card */}
                <View style={makeStyles(isDarkMode, colors).card}>
                    {seatsLow && (
                        <View style={makeStyles(isDarkMode, colors).limitedBadge}>
                            <Ionicons name="alert-circle" size={13} color="#D97706" />
                            <Text style={makeStyles(isDarkMode, colors).limitedText}>{t('meetup.limited_seats_left', { seats: seatsLeft })}</Text>
                        </View>
                    )}

                    <Text style={makeStyles(isDarkMode, colors).title}>{meetup.title}</Text>
                    <Text style={makeStyles(isDarkMode, colors).desc}>{meetup.description}</Text>

                    <View style={makeStyles(isDarkMode, colors).divider} />

                    {/* Details */}
                    {[
                        { icon: 'calendar-outline', label: t('meetup.detail_date', 'Date'), value: `${dateStr}, ${dayOfWeek}` },
                        { icon: 'time-outline', label: t('meetup.detail_time', 'Time'), value: meetup.endTime ? `${meetup.startTime} – ${meetup.endTime}` : meetup.startTime },
                        { icon: 'location-outline', label: t('meetup.detail_venue', 'Venue'), value: meetup.venue },
                        { icon: 'keypad-outline', label: t('meetup.detail_pincode', 'PIN Code'), value: meetup.pinCode ? `${meetup.pinCode}  (${t('meetup.detail_pincode_sub', 'Only for this area')})` : '—' },
                        { icon: 'person-outline', label: t('meetup.detail_organizer', 'Organizer'), value: meetup.organizerName ?? t('meetup.organizer_default', 'Ayuxa Senior Community') },
                    ].map((row, i) => (
                        <View key={i} style={makeStyles(isDarkMode, colors).detailRow}>
                            <View style={makeStyles(isDarkMode, colors).detailIcon}>
                                <Ionicons name={row.icon as any} size={16} color={PRIMARY} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={makeStyles(isDarkMode, colors).detailLabel}>{row.label}</Text>
                                <Text style={makeStyles(isDarkMode, colors).detailValue}>{row.value}</Text>
                            </View>
                        </View>
                    ))}

                    <View style={makeStyles(isDarkMode, colors).divider} />

                    {/* What's included */}
                    {meetup.includedItems.length > 0 && (
                        <>
                            <Text style={makeStyles(isDarkMode, colors).sectionLabel}>{t('meetup.whats_included', "What's Included")}</Text>
                            <View style={makeStyles(isDarkMode, colors).includesBox}>
                                {meetup.includedItems.map((item: string, i: number) => (
                                    <View key={i} style={makeStyles(isDarkMode, colors).includeRow}>
                                        <Ionicons name="checkmark" size={14} color={PRIMARY} />
                                        <Text style={makeStyles(isDarkMode, colors).includeText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky footer */}
            <View style={[makeStyles(isDarkMode, colors).footer, { paddingBottom: insets.bottom + 12 }]}>
                <View>
                    <Text style={makeStyles(isDarkMode, colors).footerLabel}>{t('meetup.service_charge', 'Service Charge')}</Text>
                    <Text style={makeStyles(isDarkMode, colors).footerPrice}>₹{meetup.serviceCharge ?? 299}</Text>
                </View>
                <TouchableOpacity
                    style={[makeStyles(isDarkMode, colors).joinBtn, !canBook && makeStyles(isDarkMode, colors).joinBtnDisabled]}
                    onPress={() => {
                        if (!canBook) {
                            const statusLabel = userRegistrationForThisMeetup?.status === 'CANCELLED' ? t('meetup.status_cancelled', 'Cancelled') : userRegistrationForThisMeetup?.status;
                            Alert.alert(
                                t('meetup.already_registered_title', 'Already Registered'),
                                t('meetup.already_registered_msg', { status: statusLabel }),
                                [{ text: t('common.ok', 'OK') }]
                            );
                            return;
                        }
                        router.push({
                            pathname: '/meetup/register',
                            params: {
                                id: meetup.id,
                                meetupEventDate: meetup.eventDate,
                                meetupStartTime: meetup.startTime,
                                meetupEndTime: meetup.endTime ?? '',
                                meetupVenue: meetup.venue,
                                meetupPinCode: meetup.pinCode ?? '',
                                meetupServiceCharge: String(meetup.serviceCharge ?? 299),
                                includedItems: JSON.stringify(meetup.includedItems ?? []),
                                extraCharges: JSON.stringify(meetup.extraCharges ?? []),
                            },
                        } as any);
                    }}
                    activeOpacity={0.85}
                    disabled={!canBook}
                >
                    <Text style={makeStyles(isDarkMode, colors).joinBtnText}>
                        {canBook ? t('meetup.join_now', 'Join Now') : t('meetup.already_registered_btn', 'Already Registered')}
                    </Text>
                    {canBook && <Ionicons name="arrow-forward" size={18} color="#fff" />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bannerImage: { width: '100%', height: 200 },
});

const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F5FAF7' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: PRIMARY,
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: '#FAF7ED' },
    scrollContent: { paddingBottom: 20 },
    bannerImage: {
        width: '100%', height: 200,
    },
    banner: {
        height: 180, backgroundColor: PRIMARY,
        justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    bannerLabel: { fontFamily: Fonts.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
    card: {
        backgroundColor: isDarkMode ? '#252525' : '#FAF7ED', marginHorizontal: 16, marginTop: -20,
        borderRadius: 20, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
    },
    limitedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 14,
    },
    limitedText: { fontFamily: Fonts.semiBold, fontSize: 12, color: '#D97706' },
    title: { fontFamily: Fonts.semiBold, fontSize: 18, color: isDarkMode ? '#FFFFFF' : Colors.textDark, lineHeight: 26, marginBottom: 8 },
    desc: { fontFamily: Fonts.regular, fontSize: 13, color: isDarkMode ? '#CCCCCC' : Colors.textMuted, lineHeight: 20 },
    divider: { height: 1, backgroundColor: isDarkMode ? '#3A3A3A' : Colors.borderLight, marginVertical: 16 },
    detailRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14,
    },
    detailIcon: {
        width: 34, height: 34, borderRadius: 10, backgroundColor: isDarkMode ? '#3A3A3A' : '#EDF7F1',
        justifyContent: 'center', alignItems: 'center',
    },
    detailLabel: { fontFamily: Fonts.regular, fontSize: 11, color: isDarkMode ? '#999999' : Colors.textMuted, marginBottom: 2 },
    detailValue: { fontFamily: Fonts.semiBold, fontSize: 14, color: isDarkMode ? '#FFFFFF' : Colors.textDark },
    sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: isDarkMode ? '#FFFFFF' : Colors.textDark, marginBottom: 12 },
    includesBox: { backgroundColor: isDarkMode ? '#2A2A2A' : '#F5FAF7', borderRadius: 12, padding: 14, gap: 10 },
    includeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    includeText: { fontFamily: Fonts.regular, fontSize: 13, color: isDarkMode ? '#CCCCCC' : Colors.textBody, flex: 1 },
    footer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: isDarkMode ? '#252525' : '#FAF7ED', paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: isDarkMode ? '#3A3A3A' : Colors.borderLight,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, elevation: 8,
    },
    footerLabel: { fontFamily: Fonts.regular, fontSize: 12, color: isDarkMode ? '#999999' : Colors.textMuted },
    footerPrice: { fontFamily: Fonts.semiBold, fontSize: 22, color: isDarkMode ? '#FFFFFF' : Colors.textDark },
    joinBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: PRIMARY, borderRadius: 14,
        paddingHorizontal: 28, paddingVertical: 14,
    },
    joinBtnDisabled: { opacity: 0.5 },
    joinBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#FAF7ED' },
});

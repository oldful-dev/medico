import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { meetupService } from '@/services/api/meetupService';
import type { Meetup } from '@/services/api/meetupService';
import { locationService } from '@/services/device/locationService';

const PRIMARY = '#02743F';
const BG = '#F5FAF7';

function formatMeetupDate(dateStr: string) {
    const d = new Date(dateStr);
    return {
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        dayOfWeek: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    };
}

export default function MeetupsListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const [meetups, setMeetups] = useState<Meetup[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const featuredMeetup = meetups.find(m => m.isFeatured);
    const upcomingMeetups = meetups.filter(m => m !== featuredMeetup);

    const fetchMeetups = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            // Detect user's pincode from GPS to filter meetups by location
            let pinCode: string | undefined;
            try {
                const coords = await locationService.getCurrentLocation();
                const address = await locationService.getAddressFromCoordinates(coords);
                const detected = await locationService.getPincodeFromAddress(coords, address);
                pinCode = detected ?? undefined;
            } catch {
                // If GPS fails, show all meetups (no filter)
            }

            const res = await meetupService.getMeetups({ pinCode });
            if (res.success && res.data) {
                setMeetups(res.data);
            } else {
                setError(res.message ?? 'Failed to load meetups');
            }
        } catch (e: any) {
            setError(e?.message ?? 'Network error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchMeetups(); }, [fetchMeetups]));

    const onRefresh = async () => {
        setRefreshing(true);
        fetchMeetups(true);
    };

    const seatsLabel = (available: number | undefined, total: number) => {
        if (!total || available === undefined) return { text: 'Seats Available', color: PRIMARY, bg: '#D1FAE5' };
        const pct = available / total;
        if (pct <= 0.2) return { text: 'Almost Full', color: '#DC2626', bg: '#FEE2E2' };
        if (pct <= 0.4) return { text: 'Limited Seats', color: '#D97706', bg: '#FEF3C7' };
        return { text: 'Seats Available', color: PRIMARY, bg: '#D1FAE5' };
    };

    return (
        <View style={[makeStyles(isDarkMode, colors).screen, { paddingTop: insets.top }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={PRIMARY} />

            {/* ── Header ── */}
            <View style={makeStyles(isDarkMode, colors).header}>
                <TouchableOpacity onPress={() => router.back()} style={makeStyles(isDarkMode, colors).backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={makeStyles(isDarkMode, colors).headerTitle}>Local Meetups</Text>
                    <Text style={makeStyles(isDarkMode, colors).headerSub}>Senior community events near you</Text>
                </View>
                <View style={makeStyles(isDarkMode, colors).liveBadge}>
                    <View style={makeStyles(isDarkMode, colors).liveDot} />
                    <Text style={makeStyles(isDarkMode, colors).liveText}>LIVE</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
                contentContainerStyle={makeStyles(isDarkMode, colors).scrollContent}
            >
                {/* ── Featured banner ── */}
                {featuredMeetup && (() => {
                    const seats = seatsLabel(featuredMeetup.availableSeats, featuredMeetup.capacity);
                    const { date, dayOfWeek } = formatMeetupDate(featuredMeetup.eventDate);
                    return (
                        <View style={makeStyles(isDarkMode, colors).featuredCard}>
                            {/* Banner image / placeholder */}
                            <View style={makeStyles(isDarkMode, colors).bannerImg}>
                                <Ionicons name="people" size={48} color="rgba(255,255,255,0.4)" />
                                <Text style={makeStyles(isDarkMode, colors).bannerImgLabel}>Community Event</Text>
                            </View>

                            {/* Seats badge */}
                            <View style={[makeStyles(isDarkMode, colors).seatsBadge, { backgroundColor: seats.bg }]}>
                                <View style={[makeStyles(isDarkMode, colors).seatsDot, { backgroundColor: seats.color }]} />
                                <Text style={[makeStyles(isDarkMode, colors).seatsText, { color: seats.color }]}>{seats.text}</Text>
                            </View>

                            <View style={makeStyles(isDarkMode, colors).featuredBody}>
                                <Text style={makeStyles(isDarkMode, colors).featuredTitle}>{featuredMeetup.title}</Text>
                                <Text style={makeStyles(isDarkMode, colors).featuredDesc} numberOfLines={2}>{featuredMeetup.description}</Text>

                                <View style={makeStyles(isDarkMode, colors).metaRow}>
                                    <View style={makeStyles(isDarkMode, colors).metaItem}>
                                        <Ionicons name="calendar-outline" size={14} color={PRIMARY} />
                                        <Text style={makeStyles(isDarkMode, colors).metaText}>{date}, {dayOfWeek}</Text>
                                    </View>
                                    <View style={makeStyles(isDarkMode, colors).metaItem}>
                                        <Ionicons name="time-outline" size={14} color={PRIMARY} />
                                        <Text style={makeStyles(isDarkMode, colors).metaText}>{featuredMeetup.startTime} Onwards</Text>
                                    </View>
                                    <View style={makeStyles(isDarkMode, colors).metaItem}>
                                        <Ionicons name="location-outline" size={14} color={PRIMARY} />
                                        <Text style={makeStyles(isDarkMode, colors).metaText}>{featuredMeetup.venue}</Text>
                                    </View>
                                </View>

                                <View style={makeStyles(isDarkMode, colors).pinRow}>
                                    <Ionicons name="pin" size={13} color="#fff" />
                                    <Text style={makeStyles(isDarkMode, colors).pinText}>PARK – PIN CODE {featuredMeetup.pinCode}</Text>
                                </View>

                                <TouchableOpacity
                                    style={makeStyles(isDarkMode, colors).joinBtn}
                                    onPress={() => router.push({ pathname: '/meetup/details', params: { id: featuredMeetup.id } } as any)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={makeStyles(isDarkMode, colors).joinBtnText}>Join Meetup — ₹{featuredMeetup.serviceCharge}</Text>
                                </TouchableOpacity>
                                <Text style={makeStyles(isDarkMode, colors).extraNote}>Snacks, transportation and additional assistance charges are extra.</Text>
                            </View>
                        </View>
                    );
                })()}

                {/* ── Upcoming meetups ── */}
                {upcomingMeetups.length > 0 && (
                    <View style={makeStyles(isDarkMode, colors).upcomingSection}>
                        <View style={makeStyles(isDarkMode, colors).sectionHeaderRow}>
                            <Text style={makeStyles(isDarkMode, colors).sectionTitle}>Upcoming Local Meetups</Text>
                        </View>

                        {upcomingMeetups.map(meetup => {
                            const seats = seatsLabel(meetup.availableSeats, meetup.capacity);
                            const { date } = formatMeetupDate(meetup.eventDate);
                            return (
                                <TouchableOpacity
                                    key={meetup.id}
                                    style={makeStyles(isDarkMode, colors).upcomingCard}
                                    onPress={() => router.push({ pathname: '/meetup/details', params: { id: meetup.id } } as any)}
                                    activeOpacity={0.8}
                                >
                                    <View style={makeStyles(isDarkMode, colors).upcomingImgBox}>
                                        <Ionicons name="people" size={28} color="rgba(255,255,255,0.6)" />
                                    </View>
                                    <View style={makeStyles(isDarkMode, colors).upcomingInfo}>
                                        <Text style={makeStyles(isDarkMode, colors).upcomingTitle} numberOfLines={2}>{meetup.title}</Text>
                                        <View style={makeStyles(isDarkMode, colors).upcomingMeta}>
                                            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                                            <Text style={makeStyles(isDarkMode, colors).upcomingMetaText}>{date}, {meetup.startTime}</Text>
                                        </View>
                                        <View style={makeStyles(isDarkMode, colors).upcomingMeta}>
                                            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                            <Text style={makeStyles(isDarkMode, colors).upcomingMetaText}>{meetup.venue}</Text>
                                        </View>
                                        <View style={[makeStyles(isDarkMode, colors).upcomingBadge, { backgroundColor: seats.bg }]}>
                                            <Text style={[makeStyles(isDarkMode, colors).upcomingBadgeText, { color: seats.color }]}>{seats.text}</Text>
                                        </View>
                                    </View>
                                    <View style={makeStyles(isDarkMode, colors).upcomingPrice}>
                                        <Text style={makeStyles(isDarkMode, colors).upcomingPriceText}>₹{meetup.serviceCharge}</Text>
                                        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {loading && (
                    <View style={makeStyles(isDarkMode, colors).loader}>
                        <ActivityIndicator size="large" color={PRIMARY} />
                        <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: 12 }}>
                            Loading meetups...
                        </Text>
                    </View>
                )}
                {!loading && error && (
                    <View style={makeStyles(isDarkMode, colors).loader}>
                        <Ionicons name="wifi-outline" size={40} color={Colors.textMuted} />
                        <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark, marginTop: 12 }}>
                            Couldn&apos;t load meetups
                        </Text>
                        <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                            {error}
                        </Text>
                        <TouchableOpacity
                            onPress={() => fetchMeetups()}
                            style={{ marginTop: 16, backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
                        >
                            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: '#fff' }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {!loading && !error && meetups.length === 0 && (
                    <View style={makeStyles(isDarkMode, colors).loader}>
                        <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
                        <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark, marginTop: 12 }}>
                            No meetups available
                        </Text>
                        <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginTop: 6, textAlign: 'center' }}>
                            Check back soon for upcoming community events
                        </Text>
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F5FAF7' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: PRIMARY,
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
        paddingBottom: 18, gap: Spacing.md,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: '#fff' },
    headerSub: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    liveBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
    liveText: { fontFamily: Fonts.semiBold, fontSize: 10, color: '#fff', letterSpacing: 0.8 },
    scrollContent: { paddingTop: 16, paddingBottom: 20 },

    // Featured card
    featuredCard: {
        marginHorizontal: Spacing.lg, borderRadius: 18,
        backgroundColor: isDarkMode ? '#252525' : '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
        overflow: 'hidden', marginBottom: 24,
    },
    bannerImg: {
        height: 160, backgroundColor: PRIMARY,
        justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    bannerImgLabel: { fontFamily: Fonts.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
    seatsBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        alignSelf: 'flex-start', marginLeft: 16, marginTop: 12,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    seatsDot: { width: 6, height: 6, borderRadius: 3 },
    seatsText: { fontFamily: Fonts.semiBold, fontSize: 11 },
    featuredBody: { padding: 16 },
    featuredTitle: { fontFamily: Fonts.semiBold, fontSize: 17, color: isDarkMode ? '#FFFFFF' : Colors.textDark, marginBottom: 6, lineHeight: 24 },
    featuredDesc: { fontFamily: Fonts.regular, fontSize: 13, color: isDarkMode ? '#CCCCCC' : Colors.textMuted, marginBottom: 14, lineHeight: 19 },
    metaRow: { gap: 8, marginBottom: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontFamily: Fonts.regular, fontSize: 13, color: isDarkMode ? '#CCCCCC' : Colors.textBody },
    pinRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: PRIMARY, alignSelf: 'flex-start',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16,
    },
    pinText: { fontFamily: Fonts.semiBold, fontSize: 12, color: '#fff' },
    joinBtn: {
        backgroundColor: PRIMARY, borderRadius: 12,
        paddingVertical: 15, alignItems: 'center', marginBottom: 8,
    },
    joinBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' },
    extraNote: { fontFamily: Fonts.regular, fontSize: 11, color: isDarkMode ? '#CCCCCC' : Colors.textMuted, textAlign: 'center' },

    // Upcoming
    upcomingSection: { paddingHorizontal: Spacing.lg },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: isDarkMode ? '#FFFFFF' : Colors.textDark },
    viewAll: { fontFamily: Fonts.medium, fontSize: 13, color: PRIMARY },
    upcomingCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: isDarkMode ? '#252525' : '#fff', borderRadius: 14,
        padding: 12, marginBottom: 12,
        borderWidth: 1, borderColor: isDarkMode ? '#3A3A3A' : Colors.borderLight,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    upcomingImgBox: {
        width: 72, height: 72, borderRadius: 10,
        backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
        marginRight: 12, flexShrink: 0,
    },
    upcomingInfo: { flex: 1, gap: 4 },
    upcomingTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: isDarkMode ? '#FFFFFF' : Colors.textDark, lineHeight: 18 },
    upcomingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    upcomingMetaText: { fontFamily: Fonts.regular, fontSize: 11, color: isDarkMode ? '#999999' : Colors.textMuted },
    upcomingBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 2 },
    upcomingBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10 },
    upcomingPrice: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
    upcomingPriceText: { fontFamily: Fonts.semiBold, fontSize: 14, color: PRIMARY },
    loader: { alignItems: 'center', paddingVertical: 20 },
});

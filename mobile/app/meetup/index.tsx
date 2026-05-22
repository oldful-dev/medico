import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    FlatList, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

const PRIMARY = '#02743F';
const BG = '#F5FAF7';

// ─── Mock data (replace with API) ─────────────────────────
const MOCK_MEETUPS = [
    {
        id: '1',
        title: 'Morning Wellness Meetup at the Park',
        description: 'Join us for a refreshing morning of light activities, wellness, social interaction and senior friendly games.',
        date: '25 Jun 2026',
        dayOfWeek: 'Thursday',
        timeStart: '07:30 AM',
        timeEnd: '10:30 AM',
        venue: 'Cubbon Park, Bengaluru',
        pinCode: '560038',
        organizer: 'Ayuxa Senior Community',
        serviceCharge: 299,
        seatsTotal: 60,
        seatsAvailable: 15,
        featured: true,
        image: null,
        includes: [
            'Meetup coordination',
            'Event management support',
            'Basic assistance support',
            'Registration handling',
        ],
    },
    {
        id: '2',
        title: 'Morning Walk & Talk',
        description: 'A gentle morning walk followed by a group discussion session at the botanical garden.',
        date: '28 Jun 2026',
        dayOfWeek: 'Sunday',
        timeStart: '07:00 AM',
        timeEnd: '09:00 AM',
        venue: 'Lalbagh Botanical Garden',
        pinCode: '560027',
        organizer: 'Ayuxa Senior Community',
        serviceCharge: 199,
        seatsTotal: 30,
        seatsAvailable: 8,
        featured: false,
        image: null,
        includes: [
            'Walk coordination',
            'Basic assistance support',
        ],
    },
];

export default function MeetupsListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [meetups, setMeetups] = useState(MOCK_MEETUPS);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const featuredMeetup = meetups.find(m => m.featured);
    const upcomingMeetups = meetups.filter(m => !m.featured);

    const onRefresh = async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

    const seatsLabel = (available: number, total: number) => {
        const pct = available / total;
        if (pct <= 0.2) return { text: 'Almost Full', color: '#DC2626', bg: '#FEE2E2' };
        if (pct <= 0.4) return { text: 'Limited Seats', color: '#D97706', bg: '#FEF3C7' };
        return { text: 'Seats Available', color: PRIMARY, bg: '#D1FAE5' };
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={PRIMARY} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Local Meetups</Text>
                    <Text style={styles.headerSub}>Senior community events near you</Text>
                </View>
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Featured banner ── */}
                {featuredMeetup && (() => {
                    const seats = seatsLabel(featuredMeetup.seatsAvailable, featuredMeetup.seatsTotal);
                    return (
                        <View style={styles.featuredCard}>
                            {/* Banner image / placeholder */}
                            <View style={styles.bannerImg}>
                                <Ionicons name="people" size={48} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.bannerImgLabel}>Community Event</Text>
                            </View>

                            {/* Seats badge */}
                            <View style={[styles.seatsBadge, { backgroundColor: seats.bg }]}>
                                <View style={[styles.seatsDot, { backgroundColor: seats.color }]} />
                                <Text style={[styles.seatsText, { color: seats.color }]}>{seats.text}</Text>
                            </View>

                            <View style={styles.featuredBody}>
                                <Text style={styles.featuredTitle}>{featuredMeetup.title}</Text>
                                <Text style={styles.featuredDesc} numberOfLines={2}>{featuredMeetup.description}</Text>

                                <View style={styles.metaRow}>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="calendar-outline" size={14} color={PRIMARY} />
                                        <Text style={styles.metaText}>{featuredMeetup.date}, {featuredMeetup.dayOfWeek}</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="time-outline" size={14} color={PRIMARY} />
                                        <Text style={styles.metaText}>{featuredMeetup.timeStart} Onwards</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="location-outline" size={14} color={PRIMARY} />
                                        <Text style={styles.metaText}>{featuredMeetup.venue}</Text>
                                    </View>
                                </View>

                                <View style={styles.pinRow}>
                                    <Ionicons name="pin" size={13} color="#fff" />
                                    <Text style={styles.pinText}>PARK – PIN CODE {featuredMeetup.pinCode}</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.joinBtn}
                                    onPress={() => router.push({ pathname: '/meetup/details', params: { id: featuredMeetup.id } } as any)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.joinBtnText}>Join Meetup — ₹{featuredMeetup.serviceCharge}</Text>
                                </TouchableOpacity>
                                <Text style={styles.extraNote}>Snacks, transportation and additional assistance charges are extra.</Text>
                            </View>
                        </View>
                    );
                })()}

                {/* ── Upcoming meetups ── */}
                {upcomingMeetups.length > 0 && (
                    <View style={styles.upcomingSection}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Upcoming Local Meetups</Text>
                            <TouchableOpacity>
                                <Text style={styles.viewAll}>View All</Text>
                            </TouchableOpacity>
                        </View>

                        {upcomingMeetups.map(meetup => {
                            const seats = seatsLabel(meetup.seatsAvailable, meetup.seatsTotal);
                            return (
                                <TouchableOpacity
                                    key={meetup.id}
                                    style={styles.upcomingCard}
                                    onPress={() => router.push({ pathname: '/meetup/details', params: { id: meetup.id } } as any)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.upcomingImgBox}>
                                        <Ionicons name="people" size={28} color="rgba(255,255,255,0.6)" />
                                    </View>
                                    <View style={styles.upcomingInfo}>
                                        <Text style={styles.upcomingTitle} numberOfLines={2}>{meetup.title}</Text>
                                        <View style={styles.upcomingMeta}>
                                            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                                            <Text style={styles.upcomingMetaText}>{meetup.date}, {meetup.timeStart}</Text>
                                        </View>
                                        <View style={styles.upcomingMeta}>
                                            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                            <Text style={styles.upcomingMetaText}>{meetup.venue}</Text>
                                        </View>
                                        <View style={[styles.upcomingBadge, { backgroundColor: seats.bg }]}>
                                            <Text style={[styles.upcomingBadgeText, { color: seats.color }]}>{seats.text}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.upcomingPrice}>
                                        <Text style={styles.upcomingPriceText}>₹{meetup.serviceCharge}</Text>
                                        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {loading && (
                    <View style={styles.loader}>
                        <ActivityIndicator color={PRIMARY} />
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: BG },
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
        backgroundColor: '#fff',
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
    featuredTitle: { fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.textDark, marginBottom: 6, lineHeight: 24 },
    featuredDesc: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, marginBottom: 14, lineHeight: 19 },
    metaRow: { gap: 8, marginBottom: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textBody },
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
    extraNote: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, textAlign: 'center' },

    // Upcoming
    upcomingSection: { paddingHorizontal: Spacing.lg },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark },
    viewAll: { fontFamily: Fonts.medium, fontSize: 13, color: PRIMARY },
    upcomingCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#fff', borderRadius: 14,
        padding: 12, marginBottom: 12,
        borderWidth: 1, borderColor: Colors.borderLight,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    upcomingImgBox: {
        width: 72, height: 72, borderRadius: 10,
        backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
        marginRight: 12, flexShrink: 0,
    },
    upcomingInfo: { flex: 1, gap: 4 },
    upcomingTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textDark, lineHeight: 18 },
    upcomingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    upcomingMetaText: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
    upcomingBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 2 },
    upcomingBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10 },
    upcomingPrice: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
    upcomingPriceText: { fontFamily: Fonts.semiBold, fontSize: 14, color: PRIMARY },
    loader: { alignItems: 'center', paddingVertical: 20 },
});

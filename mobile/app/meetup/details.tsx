import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

const PRIMARY = '#02743F';

const MOCK_MEETUPS: Record<string, any> = {
    '1': {
        id: '1',
        title: 'Morning Wellness Meetup at the Park',
        description: 'Join us for a refreshing morning of light activities, wellness, social interaction and senior friendly games.',
        date: '25 Jun 2026', dayOfWeek: 'Thursday',
        timeStart: '07:30 AM', timeEnd: '10:30 AM',
        venue: 'Cubbon Park, Bengaluru',
        pinCode: '560038',
        organizer: 'Ayuxa Senior Community',
        serviceCharge: 299,
        seatsTotal: 60, seatsAvailable: 15,
        includes: [
            'Meetup coordination',
            'Event management support',
            'Basic assistance support',
            'Registration handling',
        ],
    },
    '2': {
        id: '2',
        title: 'Morning Walk & Talk',
        description: 'A gentle morning walk followed by a group discussion session at the botanical garden.',
        date: '28 Jun 2026', dayOfWeek: 'Sunday',
        timeStart: '07:00 AM', timeEnd: '09:00 AM',
        venue: 'Lalbagh Botanical Garden',
        pinCode: '560027',
        organizer: 'Ayuxa Senior Community',
        serviceCharge: 199,
        seatsTotal: 30, seatsAvailable: 8,
        includes: ['Walk coordination', 'Basic assistance support'],
    },
};

export default function MeetupDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const meetup = MOCK_MEETUPS[id ?? '1'];

    if (!meetup) return null;

    const seatsLeft = meetup.seatsAvailable;
    const seatsLow = seatsLeft <= 15;

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={PRIMARY} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Local Meet Up Details</Text>
                <View style={{ width: 30 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Banner */}
                <View style={styles.banner}>
                    <Ionicons name="people" size={56} color="rgba(255,255,255,0.35)" />
                    <Text style={styles.bannerLabel}>Community Meetup</Text>
                </View>

                {/* Main card */}
                <View style={styles.card}>
                    {seatsLow && (
                        <View style={styles.limitedBadge}>
                            <Ionicons name="alert-circle" size={13} color="#D97706" />
                            <Text style={styles.limitedText}>Limited Seats Available — {seatsLeft} left</Text>
                        </View>
                    )}

                    <Text style={styles.title}>{meetup.title}</Text>
                    <Text style={styles.desc}>{meetup.description}</Text>

                    <View style={styles.divider} />

                    {/* Details */}
                    {[
                        { icon: 'calendar-outline', label: 'Date', value: `${meetup.date}, ${meetup.dayOfWeek}` },
                        { icon: 'time-outline', label: 'Time', value: `${meetup.timeStart} – ${meetup.timeEnd}` },
                        { icon: 'location-outline', label: 'Venue', value: meetup.venue },
                        { icon: 'keypad-outline', label: 'PIN Code', value: `${meetup.pinCode}  (Only for this area)` },
                        { icon: 'person-outline', label: 'Organizer', value: meetup.organizer },
                    ].map((row, i) => (
                        <View key={i} style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <Ionicons name={row.icon as any} size={16} color={PRIMARY} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailLabel}>{row.label}</Text>
                                <Text style={styles.detailValue}>{row.value}</Text>
                            </View>
                        </View>
                    ))}

                    <View style={styles.divider} />

                    {/* What's included */}
                    <Text style={styles.sectionLabel}>What's Included</Text>
                    <View style={styles.includesBox}>
                        {meetup.includes.map((item: string, i: number) => (
                            <View key={i} style={styles.includeRow}>
                                <Ionicons name="checkmark" size={14} color={PRIMARY} />
                                <Text style={styles.includeText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <View>
                    <Text style={styles.footerLabel}>Service Charge</Text>
                    <Text style={styles.footerPrice}>₹{meetup.serviceCharge}</Text>
                </View>
                <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => router.push({ pathname: '/meetup/register', params: { id: meetup.id } } as any)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.joinBtnText}>Join Now</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5FAF7' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: PRIMARY,
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: '#fff' },
    scrollContent: { paddingBottom: 20 },
    banner: {
        height: 180, backgroundColor: PRIMARY,
        justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    bannerLabel: { fontFamily: Fonts.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
    card: {
        backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20,
        borderRadius: 20, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
    },
    limitedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 14,
    },
    limitedText: { fontFamily: Fonts.semiBold, fontSize: 12, color: '#D97706' },
    title: { fontFamily: Fonts.semiBold, fontSize: 18, color: Colors.textDark, lineHeight: 26, marginBottom: 8 },
    desc: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 16 },
    detailRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14,
    },
    detailIcon: {
        width: 34, height: 34, borderRadius: 10, backgroundColor: '#EDF7F1',
        justifyContent: 'center', alignItems: 'center',
    },
    detailLabel: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
    detailValue: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textDark },
    sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textDark, marginBottom: 12 },
    includesBox: { backgroundColor: '#F5FAF7', borderRadius: 12, padding: 14, gap: 10 },
    includeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    includeText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textBody, flex: 1 },
    footer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: Colors.borderLight,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, elevation: 8,
    },
    footerLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
    footerPrice: { fontFamily: Fonts.semiBold, fontSize: 22, color: Colors.textDark },
    joinBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: PRIMARY, borderRadius: 14,
        paddingHorizontal: 28, paddingVertical: 14,
    },
    joinBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' },
});

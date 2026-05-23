import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { meetupService } from '@/services/api/meetupService';
import type { Meetup } from '@/services/api/meetupService';

const PRIMARY = '#02743F';

export default function MeetupDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [meetup, setMeetup] = useState<Meetup | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        meetupService.getMeetupById(id).then(res => {
            if (res.success && res.data) setMeetup(res.data);
        }).finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FAF7' }}>
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
                {/* Banner with Image */}
                {meetup.imageUrl ? (
                    <Image source={{ uri: meetup.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
                ) : (
                    <View style={styles.banner}>
                        <Ionicons name="people" size={56} color="rgba(255,255,255,0.35)" />
                        <Text style={styles.bannerLabel}>Community Meetup</Text>
                    </View>
                )}

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
                        { icon: 'calendar-outline', label: 'Date', value: `${dateStr}, ${dayOfWeek}` },
                        { icon: 'time-outline', label: 'Time', value: meetup.endTime ? `${meetup.startTime} – ${meetup.endTime}` : meetup.startTime },
                        { icon: 'location-outline', label: 'Venue', value: meetup.venue },
                        { icon: 'keypad-outline', label: 'PIN Code', value: meetup.pinCode ? `${meetup.pinCode}  (Only for this area)` : '—' },
                        { icon: 'person-outline', label: 'Organizer', value: meetup.organizerName ?? 'Ayuxa Senior Community' },
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
                    {meetup.includedItems.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>What's Included</Text>
                            <View style={styles.includesBox}>
                                {meetup.includedItems.map((item: string, i: number) => (
                                    <View key={i} style={styles.includeRow}>
                                        <Ionicons name="checkmark" size={14} color={PRIMARY} />
                                        <Text style={styles.includeText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <View>
                    <Text style={styles.footerLabel}>Service Charge</Text>
                    <Text style={styles.footerPrice}>₹{meetup.serviceCharge ?? 299}</Text>
                </View>
                <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => router.push({
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
                    } as any)}
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
    bannerImage: {
        width: '100%', height: 200,
    },
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

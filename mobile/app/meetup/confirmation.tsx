import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing } from '@/constants/theme';

const PRIMARY = '#02743F';

export default function MeetupConfirmationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<any>();

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
    }, []);

    const meetupDate = '25 Jun 2026, Thursday';
    const meetupTime = '07:30 AM – 10:30 AM';
    const meetupVenue = 'Cubbon Park, Bengaluru';
    const meetupPinCode = '560038';

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={PRIMARY} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Success animation */}
                <View style={styles.successSection}>
                    <Animated.View style={[styles.checkCircleOuter, { transform: [{ scale: scaleAnim }] }]}>
                        <View style={styles.checkCircleInner}>
                            <Ionicons name="checkmark" size={44} color="#fff" />
                        </View>
                    </Animated.View>

                    <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                        <Text style={styles.successTitle}>Registration Confirmed!</Text>
                        <Text style={styles.successSub}>You have successfully joined the Local Meet Up.</Text>
                    </Animated.View>
                </View>

                {/* Meeting details */}
                <Animated.View style={[styles.detailsCard, { opacity: fadeAnim }]}>
                    <Text style={styles.detailsHeading}>Meeting Details</Text>

                    {[
                        { icon: 'calendar-outline', label: 'Date', value: meetupDate },
                        { icon: 'time-outline', label: 'Time', value: meetupTime },
                        { icon: 'location-outline', label: 'Venue', value: meetupVenue },
                        { icon: 'keypad-outline', label: 'PIN Code', value: meetupPinCode },
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

                    {params.pickupEnabled === 'true' && (
                        <View style={styles.pickupConfirm}>
                            <Ionicons name="car-outline" size={16} color={PRIMARY} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.pickupLabel}>Pickup Arranged</Text>
                                <Text style={styles.pickupValue}>{params.pickupAddress}</Text>
                                {params.preferredTime && (
                                    <Text style={styles.pickupValue}>At {params.preferredTime}</Text>
                                )}
                            </View>
                        </View>
                    )}

                    <View style={styles.noticeBox}>
                        <Ionicons name="information-circle-outline" size={16} color={PRIMARY} />
                        <Text style={styles.noticeText}>
                            We will contact you soon with more details.
                        </Text>
                    </View>
                </Animated.View>

                {/* What's next */}
                <Animated.View style={[styles.nextCard, { opacity: fadeAnim }]}>
                    <Text style={styles.nextHeading}>What's Next?</Text>
                    {[
                        { icon: 'phone-portrait-outline', text: 'You\'ll receive a confirmation SMS' },
                        { icon: 'people-outline', text: 'Our team will call you 1 day before the event' },
                        { icon: 'car-outline', text: params.pickupEnabled === 'true' ? 'Pickup will be arranged at your address' : 'Please reach the venue on time' },
                    ].map((item, i) => (
                        <View key={i} style={styles.nextRow}>
                            <View style={styles.nextIcon}>
                                <Ionicons name={item.icon as any} size={15} color={PRIMARY} />
                            </View>
                            <Text style={styles.nextText}>{item.text}</Text>
                        </View>
                    ))}
                </Animated.View>

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    style={styles.bookingsBtn}
                    onPress={() => router.replace('/meetup/my-bookings' as any)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="calendar-outline" size={18} color="#fff" />
                    <Text style={styles.bookingsBtnText}>Go to My Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => router.replace('/(tabs)' as any)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.homeBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5FAF7' },
    scrollContent: { padding: Spacing.lg, paddingTop: 32 },
    successSection: { alignItems: 'center', marginBottom: 28 },
    checkCircleOuter: {
        width: 110, height: 110, borderRadius: 55,
        backgroundColor: 'rgba(2,116,63,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    checkCircleInner: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
    },
    successTitle: { fontFamily: Fonts.semiBold, fontSize: 22, color: Colors.textDark, marginBottom: 8, textAlign: 'center' },
    successSub: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
    detailsCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    detailsHeading: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark, marginBottom: 16 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    detailIcon: {
        width: 34, height: 34, borderRadius: 10, backgroundColor: '#EDF7F1',
        justifyContent: 'center', alignItems: 'center',
    },
    detailLabel: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
    detailValue: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textDark },
    pickupConfirm: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: '#EDF7F1', borderRadius: 10, padding: 12, marginBottom: 12,
    },
    pickupLabel: { fontFamily: Fonts.semiBold, fontSize: 12, color: PRIMARY, marginBottom: 2 },
    pickupValue: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textBody },
    noticeBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#F0FAF4', borderRadius: 10, padding: 12,
    },
    noticeText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, flex: 1, lineHeight: 18 },
    nextCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    nextHeading: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textDark, marginBottom: 14 },
    nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    nextIcon: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: '#EDF7F1',
        justifyContent: 'center', alignItems: 'center',
    },
    nextText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textBody, flex: 1 },
    footer: {
        backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: 10,
    },
    bookingsBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14,
    },
    bookingsBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' },
    homeBtn: {
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: Colors.borderLight, borderRadius: 14, paddingVertical: 13,
    },
    homeBtnText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textMuted },
});

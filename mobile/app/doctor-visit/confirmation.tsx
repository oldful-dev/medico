// Booking Confirmation Screen
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ConfirmationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Confirmed</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* ─── Content Card ─── */}
            <View style={styles.contentCard}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Success Icon & Title */}
                    <View style={styles.successSection}>
                        <View style={styles.successCircle}>
                            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
                        </View>
                        <Text style={styles.successTitle}>Booking Confirmed!</Text>
                        <Text style={styles.successSubtitle}>
                            Your doctor home visit has been successfully booked.
                        </Text>
                    </View>

                    {/* Booking ID Card */}
                    <View style={styles.bookingIdCard}>
                        <Text style={styles.bookingIdLabel}>Booking ID</Text>
                        <Text style={styles.bookingIdValue}>MED-2026-03-02-001</Text>
                    </View>

                    {/* Booking Details Card */}
                    <View style={styles.detailsCard}>
                        <Text style={styles.detailsCardTitle}>Appointment Details</Text>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="medkit" size={16} color="#048357" />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Service</Text>
                                <Text style={styles.detailValue}>Doctor Home Visit</Text>
                            </View>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="person" size={16} color="#048357" />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Doctor Type</Text>
                                <Text style={styles.detailValue}>General Physician (MBBS)</Text>
                            </View>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="calendar" size={16} color="#048357" />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Schedule</Text>
                                <Text style={styles.detailValue}>ASAP (Urgent)</Text>
                            </View>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="location" size={16} color="#048357" />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Address</Text>
                                <Text style={styles.detailValue}>123 Baker St, London</Text>
                            </View>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="alert-circle" size={16} color="#048357" />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Problem</Text>
                                <Text style={styles.detailValue}>Fever / Flu</Text>
                            </View>
                        </View>
                    </View>

                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="information-circle" size={18} color="#02743F" />
                        <Text style={styles.infoBannerText}>
                            You will receive a notification once a doctor accepts your request.
                        </Text>
                    </View>
                </ScrollView>

                {/* ─── Bottom Buttons ─── */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.trackButton} activeOpacity={0.8}>
                        <Text style={styles.trackButtonText}>Track Visit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.homeButton} activeOpacity={0.8}>
                        <Text style={styles.homeButtonText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357',
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: -0.24,
    },

    /* ─── Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: '#FDFDE8',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 140,
    },

    /* ─── Success Section ─── */
    successSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#048357',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#048357',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    successTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 22,
        color: '#02743F',
        marginBottom: 6,
        letterSpacing: -0.24,
    },
    successSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#777777',
        textAlign: 'center',
        lineHeight: 20,
    },

    /* ─── Booking ID Card ─── */
    bookingIdCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        borderWidth: 0.8,
        borderColor: 'rgba(4, 131, 87, 0.2)',
        borderStyle: 'dashed',
    },
    bookingIdLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: '#777777',
    },
    bookingIdValue: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        color: '#02743F',
        letterSpacing: 0.5,
    },

    /* ─── Details Card ─── */
    detailsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    detailsCardTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: '#02743F',
        marginBottom: 16,
        letterSpacing: -0.24,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    detailIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailTextGroup: {
        flex: 1,
    },
    detailLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#AAAEAC',
        marginBottom: 2,
    },
    detailValue: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: '#2F2F2F',
    },
    detailDivider: {
        height: 0.5,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },

    /* ─── Info Banner ─── */
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
    },
    infoBannerText: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#02743F',
        lineHeight: 16,
    },

    /* ─── Bottom Bar ─── */
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FDFDE8',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 36,
        alignItems: 'center',
        gap: 10,
    },
    trackButton: {
        width: '85%',
        maxWidth: 320,
        height: 48,
        backgroundColor: '#02743F',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FFFFFF',
    },
    homeButton: {
        width: '85%',
        maxWidth: 320,
        height: 44,
        backgroundColor: 'transparent',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#02743F',
    },
    homeButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#02743F',
    },
});

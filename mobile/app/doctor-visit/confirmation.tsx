// Booking Confirmation Screen
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

export default function ConfirmationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(colors, isDarkMode);

    const params = useLocalSearchParams<{
        visitType?: string;
        doctorType?: string;
        when?: string;
        problem?: string;
        address?: string;
        bookingId?: string;
    }>();

    const {
        visitType = 'Home Session',
        doctorType = 'General Physician',
        when = 'ASAP (Urgent)',
        problem = 'Fever / Flu',
        address = '123 Baker St, London',
        bookingId = 'MED-2026-03-05-001'
    } = params;

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Confirmed</Text>
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
                            Your appointment for {visitType} has been successfully booked.
                        </Text>
                    </View>

                    {/* Booking ID Card */}
                    <View style={styles.bookingIdCard}>
                        <View>
                            <Text style={styles.bookingIdLabel}>Booking ID</Text>
                            <Text style={styles.bookingIdValue}>{bookingId}</Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>Confirmed</Text>
                        </View>
                    </View>

                    {/* Booking Details Card */}
                    <View style={styles.detailsCard}>
                        <Text style={styles.detailsCardTitle}>Appointment Details</Text>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name={visitType === 'Clinic Visit' ? "business-outline" : "home-outline"} size={16} color={colors.primary} />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Visit Type</Text>
                                <Text style={styles.detailValue}>{visitType}</Text>
                            </View>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="medkit" size={16} color={colors.primary} />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Service</Text>
                                <Text style={styles.detailValue}>Doctor Visit</Text>
                            </View>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="person" size={16} color={colors.primary} />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Doctor Type</Text>
                                <Text style={styles.detailValue}>{doctorType}</Text>
                            </View>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="calendar" size={16} color={colors.primary} />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Schedule</Text>
                                <Text style={styles.detailValue}>{when}</Text>
                            </View>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="location" size={16} color={colors.primary} />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Address</Text>
                                <Text style={styles.detailValue}>{address}</Text>
                            </View>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <Ionicons name="alert-circle" size={16} color={colors.primary} />
                            </View>
                            <View style={styles.detailTextGroup}>
                                <Text style={styles.detailLabel}>Problem</Text>
                                <Text style={styles.detailValue}>{problem}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="information-circle" size={18} color={colors.primary} />
                        <Text style={styles.infoBannerText}>
                            {visitType === 'Home Session'
                                ? "You will receive a notification once a doctor accepts your request."
                                : "Please arrive at the clinic 10 minutes prior to your scheduled time."}
                        </Text>
                    </View>
                </ScrollView>

                {/* ─── Bottom Buttons ─── */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={[styles.actionButton, styles.rescheduleBtn]} activeOpacity={0.8}>
                        <Ionicons name="map-outline" size={18} color={colors.textWhite} style={{ marginRight: 8 }} />
                        <Text style={[styles.actionButtonText, styles.rescheduleText]}>Get Directions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.cancelBtn]} activeOpacity={0.8}>
                        <Text style={[styles.actionButtonText, styles.cancelText]}>Cancel Appointment</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.callBtn]} activeOpacity={0.8}>
                        <Ionicons name="call-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.actionButtonText, styles.callText]}>Call Support</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.homeButton} activeOpacity={0.8} onPress={() => router.replace('/(tabs)')}>
                        <Ionicons name="home-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.homeButtonText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.primary,
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 20,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: colors.textWhite,
        textAlign: "left", marginLeft: 12,
        letterSpacing: -0.24,
    },

    /* ─── Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: colors.bgScreen,
        borderTopLeftRadius: Radius.xl * 2,
        borderTopRightRadius: Radius.xl * 2,
        overflow: 'hidden',
        ...Shadow.card,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: 32,
        paddingBottom: 300, // accommodate larger bottom bar
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
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    successTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading1,
        color: colors.primary,
        marginBottom: 6,
        letterSpacing: -0.24,
    },
    successSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },

    /* ─── Booking ID Card ─── */
    bookingIdCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.1)' : 'rgba(4, 131, 87, 0.08)',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 12,
        marginBottom: 16,
        borderWidth: 0.8,
        borderColor: isDarkMode ? 'rgba(52, 199, 89, 0.25)' : 'rgba(4, 131, 87, 0.2)',
        borderStyle: 'dashed',
    },
    bookingIdLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: colors.textMuted,
    },
    bookingIdValue: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.primary,
        letterSpacing: 0.5,
    },

    /* ─── Details Card ─── */
    statusBadge: {
        backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.15)' : '#E8F5E9',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    statusBadgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.caption,
        color: colors.primary,
    },
    detailsCard: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: 16,
        ...Shadow.card,
    },
    detailsCardTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.primary,
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
        borderRadius: Radius.sm,
        backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.15)' : 'rgba(4, 131, 87, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    detailTextGroup: {
        flex: 1,
    },
    detailLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: colors.textLight,
        marginBottom: 2,
    },
    detailValue: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: colors.textDark,
    },
    detailDivider: {
        height: 0.5,
        backgroundColor: colors.borderLight,
    },

    /* ─── Info Banner ─── */
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.15)' : 'rgba(4, 131, 87, 0.08)',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        gap: 10,
    },
    infoBannerText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: colors.primary,
        lineHeight: 16,
    },

    /* ─── Bottom Bar ─── */
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.bgScreen,
        paddingHorizontal: Spacing.xl,
        paddingTop: 16,
        paddingBottom: 36,
        alignItems: 'center',
        gap: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    actionButton: {
        width: '100%',
        maxWidth: 320,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    actionButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
    },
    rescheduleBtn: {
        backgroundColor: colors.primary,
    },
    rescheduleText: {
        color: colors.textWhite,
    },
    cancelBtn: {
        backgroundColor: isDarkMode ? 'rgba(255, 59, 48, 0.1)' : '#FFF0F0',
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(255, 59, 48, 0.25)' : '#FFCCCC',
    },
    cancelText: {
        color: colors.sosRed,
    },
    callBtn: {
        backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.15)' : '#E8F5E9',
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(52, 199, 89, 0.25)' : '#A5D6A7',
    },
    callText: {
        color: colors.primary,
    },
    homeButton: {
        width: '100%',
        maxWidth: 320,
        height: 48,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: 4,
    },
    homeButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: colors.primary,
        textDecorationLine: 'underline',
    },
});

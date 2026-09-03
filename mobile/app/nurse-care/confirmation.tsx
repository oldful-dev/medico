import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

export default function NurseCareConfirmationScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    // Generate a random booking ID for demonstration
    const bookingId = `NC-${Math.floor(100000 + Math.random() * 900000)}`;

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('nurse_confirmation.header')}</Text></View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Success Status ─── */}
                <View style={styles.statusContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="checkmark" size={40} color={Colors.primary} />
                    </View>
                    <Text style={styles.statusTitle}>{t('nurse_confirmation.title')}</Text>
                    <Text style={styles.statusSubTitle}>
                        {t('nurse_confirmation.message')}
                    </Text>
                </View>

                {/* ─── Request Details Card ─── */}
                <View style={styles.detailsCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardSectionTitle}>{t('nurse_confirmation.request_summary')}</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{t('nurse_confirmation.pending')}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('nurse_confirmation.request_id')}</Text>
                        <Text style={[styles.detailValue, { fontFamily: Fonts.semiBold }]}>#{bookingId}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('nurse_confirmation.patient')}</Text>
                        <Text style={styles.detailValue}>{params.recipient || t('nurse_confirmation.not_specified')}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('nurse_confirmation.staff_type')}</Text>
                        <Text style={styles.detailValue}>{params.staff || t('nurse_confirmation.qualified_nurse')}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('nurse_confirmation.duration')}</Text>
                        <Text style={styles.detailValue}>{params.duration || t('nurse_confirmation.default_duration')}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('nurse_confirmation.condition')}</Text>
                        <Text style={styles.detailValue}>{params.condition || t('nurse_confirmation.not_specified')}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('nurse_confirmation.gender_pref')}</Text>
                        <Text style={styles.detailValue}>{params.gender || t('nurse_confirmation.any')}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t('nurse_confirmation.booking_fee')}</Text>
                        <Text style={styles.totalValue}>₹299</Text>
                    </View>
                    <Text style={styles.feeNote}>{t('nurse_confirmation.cost_note')}</Text>
                </View>

                {/* ─── Actions ─── */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity style={[styles.actionButton, styles.primaryOutlineButton]}>
                        <Ionicons name="call-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.primaryOutlineButtonText}>{t('nurse_confirmation.call_support')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.primaryFilledButton}
                        onPress={() => router.replace('/(tabs)' as any)}
                    >
                        <Text style={styles.primaryFilledButtonText}>{t('nurse_confirmation.back_home')}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        paddingBottom: Spacing.xl,
        borderBottomLeftRadius: Radius.xl,
        borderBottomRightRadius: Radius.xl,
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textWhite,
        textAlign: "left", marginLeft: 12,
        letterSpacing: -0.24,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl * 2,
    },
    statusContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xl * 1.5,
        marginTop: Spacing.md,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(4, 131, 87, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    statusTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textDark,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    statusSubTitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: Spacing.lg,
    },
    detailsCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
        ...Shadow.card,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    cardSectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
    },
    badge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Radius.full,
    },
    badgeText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: '#E65100',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: Spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    detailLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        flex: 1,
    },
    detailValue: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.textDark,
        flex: 2,
        textAlign: 'right',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
    },
    totalValue: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.primary,
    },
    feeNote: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
        textAlign: 'right',
        marginTop: 4,
    },
    actionContainer: {
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    actionButton: {
        flexDirection: 'row',
        height: 52,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryOutlineButton: {
        borderWidth: 1.5,
        borderColor: Colors.primary,
        backgroundColor: 'transparent',
    },
    primaryFilledButton: {
        backgroundColor: Colors.primary,
        height: 52,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryOutlineButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button,
        color: Colors.primary,
    },
    primaryFilledButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button,
        color: Colors.textWhite,
    },
});

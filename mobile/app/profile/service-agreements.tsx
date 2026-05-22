import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function ServiceAgreementsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [expandedAgreement, setExpandedAgreement] = useState<string | null>(null);

    const agreements = [
        {
            id: 'active_care',
            title: 'Active Care Plan Agreement',
            description: 'Daily care and health monitoring services',
            status: 'active',
            startDate: '15 Jan 2026',
            endDate: '14 Apr 2026',
            duration: '90 days',
        },
        {
            id: 'emergency_support',
            title: 'Emergency Support Agreement',
            description: 'Round-the-clock emergency response',
            status: 'active',
            startDate: '15 Jan 2026',
            endDate: '14 Apr 2026',
            duration: '90 days',
        },
        {
            id: 'past_agreement',
            title: 'Wellness Plan Agreement',
            description: 'Monthly wellness check-ups',
            status: 'expired',
            startDate: '01 Oct 2025',
            endDate: '31 Dec 2025',
            duration: '92 days',
        },
    ];

    const handleViewAgreement = (agreementId: string) => {
        Alert.alert(
            'Service Agreement',
            'This feature is coming soon. You will be able to view, download, and manage service agreements here.',
            [{ text: 'OK' }]
        );
    };

    const getStatusColor = (status: string) => {
        if (status === 'active') return '#4ADE80';
        if (status === 'expired') return '#FCA5A5';
        return Colors.textMuted;
    };

    const getStatusBgColor = (status: string) => {
        if (status === 'active') return '#DCFCE7';
        if (status === 'expired') return '#FEE2E2';
        return '#F5F5F5';
    };

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Service Agreements</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                    View and manage your active service agreements and subscription plans.
                </Text>

                {agreements.map((agreement) => (
                    <View key={agreement.id} style={styles.agreementCard}>
                        <TouchableOpacity
                            style={styles.agreementHeader}
                            onPress={() => setExpandedAgreement(expandedAgreement === agreement.id ? null : agreement.id)}
                            activeOpacity={0.7}
                        >
                            <View style={{ flex: 1 }}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.agreementTitle}>{agreement.title}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(agreement.status) }]}>
                                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(agreement.status) }]} />
                                        <Text style={[styles.statusLabel, { color: getStatusColor(agreement.status) }]}>
                                            {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.agreementDescription}>{agreement.description}</Text>
                            </View>
                            <Ionicons
                                name={expandedAgreement === agreement.id ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={Colors.textMuted}
                            />
                        </TouchableOpacity>

                        {expandedAgreement === agreement.id && (
                            <View style={styles.agreementContent}>
                                <View style={styles.infoGrid}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.label}>Duration</Text>
                                        <Text style={styles.value}>{agreement.duration}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.label}>Start Date</Text>
                                        <Text style={styles.value}>{agreement.startDate}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.label}>End Date</Text>
                                        <Text style={styles.value}>{agreement.endDate}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleViewAgreement(agreement.id)}
                                >
                                    <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
                                    <Text style={styles.actionButtonText}>View Agreement</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.secondaryButton}>
                                    <Ionicons name="download-outline" size={16} color={Colors.primary} />
                                    <Text style={styles.secondaryButtonText}>Download PDF</Text>
                                </TouchableOpacity>

                                {agreement.status === 'active' && (
                                    <TouchableOpacity style={styles.cancelButton}>
                                        <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                                        <Text style={styles.cancelButtonText}>Cancel Agreement</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                ))}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.infoTitle}>Service Agreements</Text>
                        <Text style={styles.infoText}>
                            These agreements outline the terms and conditions of your subscription plan. All active agreements are legally binding.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    backButton: {
        padding: Spacing.sm,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    description: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
        lineHeight: 20,
    },
    agreementCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },
    agreementHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
        gap: Spacing.md,
    },
    agreementTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        flex: 1,
    },
    agreementDescription: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.sm,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.caption,
    },
    agreementContent: {
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        padding: Spacing.md,
        backgroundColor: '#FAFAFA',
    },
    infoGrid: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    infoItem: {
        flex: 1,
        backgroundColor: Colors.bgCard,
        padding: Spacing.sm,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    label: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
        marginBottom: 4,
    },
    value: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.textDark,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: Radius.sm,
        marginBottom: Spacing.sm,
    },
    actionButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textWhite,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: Radius.sm,
        marginBottom: Spacing.sm,
    },
    secondaryButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        paddingVertical: Spacing.md,
        borderRadius: Radius.sm,
    },
    cancelButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#EF4444',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: `${Colors.primary}10`,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
        padding: Spacing.md,
        borderRadius: Radius.sm,
        marginTop: Spacing.lg,
    },
    infoTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
        marginBottom: 4,
    },
    infoText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        lineHeight: 18,
    },
});

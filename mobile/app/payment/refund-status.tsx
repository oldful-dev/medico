// Refund Status - Track refund progress
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


// ─── Refund Timeline Steps ───
const TIMELINE_STEPS = [
    { label: 'Refund Requested', date: '02 Mar 2026, 3:00 PM', status: 'completed' },
    { label: 'Under Review', date: '02 Mar 2026, 3:15 PM', status: 'completed' },
    { label: 'Approved', date: '03 Mar 2026, 10:30 AM', status: 'current' },
    { label: 'Refund Initiated', date: '', status: 'pending' },
    { label: 'Refund Credited', date: '', status: 'pending' },
];

export default function RefundStatusScreen() {
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
                <Text style={styles.headerTitle}>Refund Status</Text>
            </View>

            {/* ─── Content Card ─── */}
            <View style={styles.contentCard}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Status Summary Card */}
                    <View style={styles.statusSummary}>
                        <View style={styles.statusIconContainer}>
                            <View style={styles.statusIconCircle}>
                                <Ionicons name="hourglass" size={28} color="#FFFFFF" />
                            </View>
                        </View>
                        <Text style={styles.statusTitle}>Refund In Progress</Text>
                        <Text style={styles.statusSubtitle}>
                            Your refund request has been approved and is being processed.
                        </Text>

                        <View style={styles.amountRow}>
                            <Text style={styles.amountLabel}>Refund Amount</Text>
                            <Text style={styles.amountValue}>₹499.00</Text>
                        </View>
                    </View>

                    {/* Order Reference */}
                    <View style={styles.refCard}>
                        <View style={styles.refRow}>
                            <Text style={styles.refLabel}>Booking ID</Text>
                            <Text style={styles.refValue}>MED-2026-03-02-001</Text>
                        </View>
                        <View style={styles.refDivider} />
                        <View style={styles.refRow}>
                            <Text style={styles.refLabel}>Request ID</Text>
                            <Text style={styles.refValue}>REF-2026-03-02-042</Text>
                        </View>
                        <View style={styles.refDivider} />
                        <View style={styles.refRow}>
                            <Text style={styles.refLabel}>Refund To</Text>
                            <Text style={styles.refValue}>Original Payment Method</Text>
                        </View>
                    </View>

                    {/* Timeline Card */}
                    <View style={styles.timelineCard}>
                        <Text style={styles.timelineCardTitle}>Refund Progress</Text>

                        {TIMELINE_STEPS.map((step, index) => {
                            const isCompleted = step.status === 'completed';
                            const isCurrent = step.status === 'current';
                            const isPending = step.status === 'pending';
                            const isLast = index === TIMELINE_STEPS.length - 1;

                            return (
                                <View key={index} style={styles.timelineItem}>
                                    {/* Dot and Connector */}
                                    <View style={styles.timelineDotColumn}>
                                        <View style={[
                                            styles.timelineDot,
                                            isCompleted && styles.timelineDotCompleted,
                                            isCurrent && styles.timelineDotCurrent,
                                            isPending && styles.timelineDotPending,
                                        ]}>
                                            {isCompleted && (
                                                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                                            )}
                                            {isCurrent && (
                                                <View style={styles.timelineDotInner} />
                                            )}
                                        </View>
                                        {!isLast && (
                                            <View style={[
                                                styles.timelineConnector,
                                                (isCompleted || isCurrent) && styles.timelineConnectorActive,
                                            ]} />
                                        )}
                                    </View>

                                    {/* Text */}
                                    <View style={styles.timelineTextGroup}>
                                        <Text style={[
                                            styles.timelineLabel,
                                            isPending && styles.timelineLabelPending,
                                            isCurrent && styles.timelineLabelCurrent,
                                        ]}>
                                            {step.label}
                                        </Text>
                                        {step.date !== '' && (
                                            <Text style={styles.timelineDate}>{step.date}</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Estimated Time */}
                    <View style={styles.estimateBanner}>
                        <Ionicons name="time-outline" size={18} color="#02743F" />
                        <Text style={styles.estimateText}>
                            Estimated completion: 5-7 business days from approval date.
                        </Text>
                    </View>

                    {/* Help Section */}
                    <TouchableOpacity style={styles.helpCard}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#02743F" />
                        <View style={styles.helpTextGroup}>
                            <Text style={styles.helpTitle}>Need Help?</Text>
                            <Text style={styles.helpSubtitle}>Contact support for refund queries</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#AAAEAC" />
                    </TouchableOpacity>
                </ScrollView>
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
        textAlign: 'left', marginLeft: 12,
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
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 40,
    },

    /* ─── Status Summary Card ─── */
    statusSummary: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    statusIconContainer: {
        marginBottom: 12,
    },
    statusIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E8A317',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: '#E8A317',
        marginBottom: 6,
        letterSpacing: -0.24,
    },
    statusSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777777',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        backgroundColor: 'rgba(4, 131, 87, 0.06)',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    amountLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#777777',
    },
    amountValue: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: '#02743F',
    },

    /* ─── Reference Card ─── */
    refCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    refRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    refLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777777',
    },
    refValue: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
    },
    refDivider: {
        height: 0.5,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },

    /* ─── Timeline Card ─── */
    timelineCard: {
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
    timelineCardTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: '#02743F',
        marginBottom: 16,
        letterSpacing: -0.24,
    },
    timelineItem: {
        flexDirection: 'row',
        minHeight: 48,
    },
    timelineDotColumn: {
        alignItems: 'center',
        width: 24,
        marginRight: 12,
    },
    timelineDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineDotCompleted: {
        backgroundColor: '#048357',
    },
    timelineDotCurrent: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2.5,
        borderColor: '#E8A317',
    },
    timelineDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E8A317',
    },
    timelineDotPending: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#DADADA',
    },
    timelineConnector: {
        width: 2,
        flex: 1,
        backgroundColor: '#DADADA',
        marginVertical: 2,
    },
    timelineConnectorActive: {
        backgroundColor: '#048357',
    },
    timelineTextGroup: {
        flex: 1,
        paddingBottom: 16,
    },
    timelineLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: '#2F2F2F',
        marginBottom: 2,
    },
    timelineLabelCurrent: {
        color: '#E8A317',
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
    },
    timelineLabelPending: {
        color: '#AAAEAC',
    },
    timelineDate: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#AAAEAC',
    },

    /* ─── Estimate Banner ─── */
    estimateBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
        gap: 10,
    },
    estimateText: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#02743F',
        lineHeight: 16,
    },

    /* ─── Help Card ─── */
    helpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    helpTextGroup: {
        flex: 1,
    },
    helpTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: '#2F2F2F',
    },
    helpSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#AAAEAC',
    },
});

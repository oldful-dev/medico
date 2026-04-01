// Refund Request - Submit refund request
// PRD: SLA breach refunds, Compassionate Clause (demise/hospitalization)
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

// ─── Refund Reason Options ───
const REFUND_REASONS = [
    { id: '1', label: 'Service not completed as expected', selected: true },
    { id: '2', label: 'SLA breach (excessive wait time)', selected: false },
    { id: '3', label: 'Compassionate Clause (hospitalization)', selected: false },
    { id: '4', label: 'Compassionate Clause (demise/bereavement)', selected: false },
    { id: '5', label: 'Duplicate booking / accidental charge', selected: false },
    { id: '6', label: 'Other reason', selected: false },
];

export default function RefundRequestScreen() {
    const { t } = useTranslation();
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
                <Text style={styles.headerTitle}>Refund Request</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* ─── Content Card ─── */}
            <View style={styles.contentCard}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="shield-checkmark" size={20} color="#02743F" />
                        <Text style={styles.infoBannerText}>
                            We review all refund requests within 24-48 hours. Your money is safe with us.
                        </Text>
                    </View>

                    {/* Order Details Card */}
                    <View style={styles.orderCard}>
                        <Text style={styles.orderCardTitle}>Order Details</Text>
                        <View style={styles.orderRow}>
                            <Text style={styles.orderLabel}>Booking ID</Text>
                            <Text style={styles.orderValue}>MED-2026-03-02-001</Text>
                        </View>
                        <View style={styles.orderDivider} />
                        <View style={styles.orderRow}>
                            <Text style={styles.orderLabel}>Service</Text>
                            <Text style={styles.orderValue}>Doctor Home Visit</Text>
                        </View>
                        <View style={styles.orderDivider} />
                        <View style={styles.orderRow}>
                            <Text style={styles.orderLabel}>Amount Paid</Text>
                            <Text style={styles.orderValueHighlight}>₹499.00</Text>
                        </View>
                        <View style={styles.orderDivider} />
                        <View style={styles.orderRow}>
                            <Text style={styles.orderLabel}>Date</Text>
                            <Text style={styles.orderValue}>02 Mar 2026</Text>
                        </View>
                    </View>

                    {/* Reason Selection */}
                    <View style={styles.reasonCard}>
                        <Text style={styles.reasonCardTitle}>Reason for Refund</Text>
                        <Text style={styles.reasonSubtitle}>Please select the most appropriate reason:</Text>

                        {REFUND_REASONS.map((reason) => (
                            <TouchableOpacity
                                key={reason.id}
                                style={[
                                    styles.reasonItem,
                                    reason.selected && styles.reasonItemSelected,
                                ]}
                            >
                                <Ionicons
                                    name={reason.selected ? 'radio-button-on' : 'radio-button-off'}
                                    size={20}
                                    color={reason.selected ? '#048357' : '#AAAEAC'}
                                />
                                <Text style={[
                                    styles.reasonText,
                                    reason.selected && styles.reasonTextSelected,
                                ]}>
                                    {reason.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Additional Details */}
                    <View style={styles.detailsInputCard}>
                        <Text style={styles.detailsInputTitle}>Additional Details</Text>
                        <Text style={styles.detailsInputSubtitle}>
                            Provide more context to help us process your request faster.
                        </Text>
                        <View style={styles.textAreaContainer}>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Describe your issue in detail..."
                                placeholderTextColor="#AAAEAC"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Upload Evidence */}
                    <View style={styles.uploadCard}>
                        <View style={styles.uploadDashedBox}>
                            <Ionicons name="cloud-upload-outline" size={32} color="#048357" />
                            <Text style={styles.uploadTitle}>Attach Supporting Documents</Text>
                            <Text style={styles.uploadSubtitle}>JPG, PNG or PDF, max 10MB</Text>
                            <TouchableOpacity style={styles.uploadButton}>
                                <Text style={styles.uploadButtonText}>SELECT FILE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Refund Policy Note */}
                    <View style={styles.policyNote}>
                        <Ionicons name="information-circle-outline" size={16} color="#777777" />
                        <Text style={styles.policyNoteText}>
                            Refunds are processed within 5-7 business days to the original payment method.
                            Compassionate Clause refunds are prioritized.
                        </Text>
                    </View>
                </ScrollView>

                {/* ─── Submit Button ─── */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
                        <Text style={styles.submitButtonText}>Submit Refund Request</Text>
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
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 120,
    },

    /* ─── Info Banner ─── */
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
        gap: 10,
    },
    infoBannerText: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#02743F',
        lineHeight: 16,
    },

    /* ─── Order Card ─── */
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    orderCardTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: '#02743F',
        marginBottom: 14,
        letterSpacing: -0.24,
    },
    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    orderLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777777',
    },
    orderValue: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
    },
    orderValueHighlight: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        color: '#02743F',
    },
    orderDivider: {
        height: 0.5,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },

    /* ─── Reason Card ─── */
    reasonCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    reasonCardTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: '#02743F',
        marginBottom: 4,
        letterSpacing: -0.24,
    },
    reasonSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#AAAEAC',
        marginBottom: 14,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 6,
        gap: 10,
    },
    reasonItemSelected: {
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
    },
    reasonText: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#555555',
        lineHeight: 18,
    },
    reasonTextSelected: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#02743F',
    },

    /* ─── Additional Details ─── */
    detailsInputCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    detailsInputTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: '#02743F',
        marginBottom: 4,
        letterSpacing: -0.24,
    },
    detailsInputSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#AAAEAC',
        marginBottom: 12,
    },
    textAreaContainer: {
        backgroundColor: 'rgba(217, 217, 217, 0.2)',
        borderRadius: 10,
        borderWidth: 0.8,
        borderColor: 'rgba(143, 143, 143, 0.2)',
    },
    textArea: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
        padding: 12,
        height: 100,
    },

    /* ─── Upload Card ─── */
    uploadCard: {
        alignItems: 'center',
        marginBottom: 16,
    },
    uploadDashedBox: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#1E1E1E',
        borderRadius: 16,
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
    },
    uploadTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#2F2F2F',
        marginTop: 6,
        marginBottom: 4,
    },
    uploadSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 9,
        color: '#555555',
        marginBottom: 10,
    },
    uploadButton: {
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    uploadButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 9,
        color: '#02743F',
        textTransform: 'uppercase',
    },

    /* ─── Policy Note ─── */
    policyNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: 4,
    },
    policyNoteText: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#AAAEAC',
        lineHeight: 15,
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
    },
    submitButton: {
        width: '85%',
        maxWidth: 320,
        height: 48,
        backgroundColor: '#02743F',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FFFFFF',
    },
});

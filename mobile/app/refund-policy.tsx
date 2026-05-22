import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function RefundPolicyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const Section = ({ title, body }: { title: string, body: string }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.bodyText}>{body}</Text>
        </View>
    );

    const BulletPoint = ({ text }: { text: string }) => (
        <View style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>{text}</Text>
        </View>
    );

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Refund & Cancellation</Text>
            </View>

            <View style={styles.contentCard}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <Text style={styles.lastUpdated}>Last Updated: 01/01/2026</Text>

                    <Text style={styles.majorHeading}>REFUND & CANCELLATION POLICY</Text>

                    <Section
                        title="Subscription Cancellation"
                        body="You may cancel your subscription at any time. To cancel, please log into your account or contact our support team. Cancellations must be submitted in writing 7 days before your renewal date to avoid being charged for the next billing cycle."
                    />

                    <Section
                        title="Refund Eligibility"
                        body="Refunds are processed based on the following conditions:"
                    />
                    <View style={styles.section}>
                        <BulletPoint text="Full Refund: If a service is not provided as per our Service Level Agreement (SLA), you are entitled to a full refund for that month." />
                        <BulletPoint text="Pro-rata Refund: For mid-cycle cancellations, refunds are calculated on a pro-rata basis based on the number of days remaining in your billing cycle." />
                        <BulletPoint text="No Refund: If you cancel after the service period has commenced and services have been delivered, no refund will be issued." />
                    </View>

                    <Section
                        title="Refund Timeline"
                        body="Approved refunds are processed within 5-7 business days. The refund will be credited back to the original payment method used. Please allow an additional 5-10 business days for the amount to appear in your account, depending on your bank or payment provider."
                    />

                    <Section
                        title="Service Level Agreement (SLA)"
                        body="Ayuxa commits to the following service standards:"
                    />
                    <View style={styles.section}>
                        <BulletPoint text="Caregiver Deployment: Within 24-48 hours of subscription confirmation" />
                        <BulletPoint text="Service Availability: 6 days per week (Sunday off, unless requested)" />
                        <BulletPoint text="Service Hours: As agreed upon in your subscription plan" />
                        <BulletPoint text="Caregiver Quality: Vetted, trained, and background-checked professionals" />
                        <Text style={[styles.bodyText, { marginTop: 10 }]}>If we fail to meet these standards, you may request a service credit or refund.</Text>
                    </View>

                    <Section
                        title="Non-Refundable Conditions"
                        body="The following situations are not eligible for refunds:"
                    />
                    <View style={styles.section}>
                        <BulletPoint text="Cancellation initiated by the user after services have been delivered" />
                        <BulletPoint text="Service suspension due to user non-payment or breach of terms" />
                        <BulletPoint text="Refusal to cooperate with caregivers or violation of our code of conduct" />
                        <BulletPoint text="Third-party service failures (e.g., external medical services)" />
                    </View>

                    <View style={styles.alertBox}>
                        <Ionicons name="warning" size={20} color="#D32F2F" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.alertTitle}>Important Notice</Text>
                            <Text style={styles.alertText}>
                                Promotional discounts and special offers are non-refundable. Any refund granted will be calculated based on the standard price, not the discounted rate.
                            </Text>
                        </View>
                    </View>

                    <Section
                        title="How to Request a Refund"
                        body="To request a refund, please follow these steps:\n\n1. Log into your account and navigate to 'Billing & Subscriptions'\n2. Select the subscription you wish to refund\n3. Click 'Request Refund' and provide reason details\n4. Our support team will review and respond within 3 business days"
                    />

                    <Section
                        title="Dispute Resolution"
                        body="If you believe a refund was denied incorrectly, you may escalate your case. Contact our support team at support@ayuxacare.com with documentation of the issue. We will investigate and respond within 7 business days."
                    />

                    <Section
                        title="Contact Us"
                        body="For refund-related inquiries, please contact:\n\nAyuxa Care Support\nEmail: support@ayuxacare.com\nPhone: +91-800-1234-5678\nAddress: Ayuxa Care HQ, New Delhi, India"
                    />

                    <View style={styles.divider} />
                    <Text style={styles.footerText}>This policy is subject to change at any time. We will notify users of significant changes.</Text>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
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
    contentCard: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    lastUpdated: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
        fontStyle: 'italic',
    },
    majorHeading: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.heading2,
        color: Colors.primary,
        marginBottom: Spacing.lg,
        marginTop: Spacing.lg,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: Spacing.sm,
    },
    bodyText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        lineHeight: 20,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
        marginTop: 6,
        flexShrink: 0,
    },
    bulletText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        flex: 1,
        lineHeight: 18,
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FEE2E2',
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F',
        padding: Spacing.md,
        borderRadius: Radius.sm,
        marginBottom: Spacing.lg,
    },
    alertTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#D32F2F',
        marginBottom: 4,
    },
    alertText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: '#C62828',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: Spacing.lg,
    },
    footerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

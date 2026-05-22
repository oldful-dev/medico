import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
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
                <Text style={styles.headerTitle}>Privacy Policy</Text>
            </View>

            <View style={styles.contentCard}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <Text style={styles.lastUpdated}>Last Updated: 01/01/2026</Text>

                    <Text style={styles.majorHeading}>PRIVACY POLICY</Text>

                    <Section
                        title="Introduction"
                        body="At Ayuxa Care, we are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information."
                    />

                    <Section
                        title="Information We Collect"
                        body="We collect information you provide directly to us, such as when you create an account, subscribe to services, or contact us. This may include:"
                    />
                    <View style={styles.section}>
                        <BulletPoint text="Personal identification information (name, email, phone number)" />
                        <BulletPoint text="Medical and health information (blood type, allergies, medical history)" />
                        <BulletPoint text="Demographic information (age, gender, address)" />
                        <BulletPoint text="Payment information (processed securely through third-party providers)" />
                        <BulletPoint text="Emergency contact details" />
                        <BulletPoint text="Usage data and device information" />
                    </View>

                    <Section
                        title="How We Use Your Information"
                        body="We use the information we collect for the following purposes:"
                    />
                    <View style={styles.section}>
                        <BulletPoint text="To provide and maintain our services" />
                        <BulletPoint text="To process transactions and send related information" />
                        <BulletPoint text="To send promotional communications (with your consent)" />
                        <BulletPoint text="To respond to your inquiries and provide support" />
                        <BulletPoint text="To improve our services and personalize your experience" />
                        <BulletPoint text="To comply with legal obligations" />
                        <BulletPoint text="To detect and prevent fraud" />
                    </View>

                    <Section
                        title="Data Security"
                        body="We implement industry-standard security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is completely secure. We cannot guarantee absolute security."
                    />

                    <Section
                        title="Data Sharing & Third Parties"
                        body="We do not sell your personal information. We may share your information with:"
                    />
                    <View style={styles.section}>
                        <BulletPoint text="Service providers who assist us in operating our website and conducting our business" />
                        <BulletPoint text="Healthcare providers and caregivers involved in delivering your care" />
                        <BulletPoint text="Legal authorities when required by law" />
                        <BulletPoint text="Business partners for service delivery (with your consent)" />
                    </View>

                    <Section
                        title="Your Rights"
                        body="You have the right to access, correct, or delete your personal information. You may also opt-out of marketing communications at any time. To exercise these rights, please contact us using the information provided below."
                    />

                    <Section
                        title="Cookies & Tracking"
                        body="Our platform uses cookies and similar tracking technologies to enhance user experience and analyze platform usage. You can disable cookies through your browser settings, though this may impact functionality."
                    />

                    <Section
                        title="Children's Privacy"
                        body="Our services are not intended for individuals under 18 years old. We do not knowingly collect information from children. If we become aware of such collection, we will take steps to delete this information promptly."
                    />

                    <Section
                        title="Contact Us"
                        body="If you have questions about this Privacy Policy or our privacy practices, please contact us at:\n\nAyuxa Care\nEmail: privacy@ayuxacare.com\nPhone: +91-800-1234-5678\nAddress: Ayuxa Care HQ, New Delhi, India"
                    />

                    <View style={styles.divider} />
                    <Text style={styles.footerText}>By using our platform, you consent to this Privacy Policy.</Text>

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

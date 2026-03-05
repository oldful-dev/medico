import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function TermsPolicyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
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
                <Text style={styles.headerTitle}>Terms & Privacy</Text>
                <View style={{ width: 34 }} />
            </View>

            <View style={styles.contentCard}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <Text style={styles.lastUpdated}>Last Updated: 01/01/2026</Text>
                    <Text style={styles.introText}>
                        By using the Oldful app or website, you agree to the following terms.
                    </Text>

                    {/* Terms & Conditions */}
                    <Text style={styles.majorHeading}>Terms & Conditions</Text>

                    <Section title="Service Description">
                        <Text style={styles.bodyText}>
                            Oldful provides elder care management services including:
                        </Text>
                        <BulletPoint text="Home caregiver assistance" />
                        <BulletPoint text="Health monitoring support" />
                        <BulletPoint text="Coordination with medical professionals" />
                        <BulletPoint text="Assistance with daily living activities" />
                        <BulletPoint text="Facilitation of third-party services such as physiotherapy, cleaning, and diagnostics" />
                        <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
                            Oldful acts as a care management platform that connects users with verified service providers.
                        </Text>
                    </Section>

                    <Section title="User Responsibilities">
                        <Text style={styles.bodyText}>Users must:</Text>
                        <BulletPoint text="Provide accurate personal and medical information" />
                        <BulletPoint text="Maintain a safe environment for caregivers" />
                        <BulletPoint text="Treat staff with respect and dignity" />
                        <Text style={[styles.highlightText, { marginTop: Spacing.sm }]}>
                            Oldful has a zero-tolerance policy for abuse or harassment toward staff.
                        </Text>
                    </Section>

                    <Section title="Payments & Subscriptions">
                        <Text style={styles.bodyText}>Services may include:</Text>
                        <BulletPoint text="Monthly subscriptions" />
                        <BulletPoint text="Quarterly plans" />
                        <BulletPoint text="Annual plans" />
                        <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
                            Subscriptions may auto-renew unless cancelled before the renewal date. Failure to pay service fees may result in temporary suspension of services.
                        </Text>
                    </Section>

                    <View style={styles.alertBox}>
                        <Ionicons name="warning" size={20} color="#D32F2F" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.alertTitle}>Emergency Disclaimer</Text>
                            <Text style={styles.alertText}>
                                Oldful is not an emergency medical service. In case of life-threatening emergencies, contact an Ambulance or Hospital exactly.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Privacy Policy */}
                    <Text style={styles.majorHeading}>Privacy Policy</Text>

                    <Text style={styles.bodyText}>
                        Oldful is committed to protecting the privacy and dignity of our users. We collect personal information only to provide better care services.
                    </Text>

                    <Section title="Information We Collect">
                        <BulletPoint text="Name, age, and contact details" />
                        <BulletPoint text="Address for service delivery" />
                        <BulletPoint text="Emergency contacts" />
                        <BulletPoint text="Health information and prescriptions" />
                        <BulletPoint text="Service usage data" />
                    </Section>

                    <Section title="How We Use Your Information">
                        <Text style={styles.bodyText}>Your data may be used for:</Text>
                        <BulletPoint text="Service delivery & Care coordination" />
                        <BulletPoint text="Appointment reminders & Emergency notifications" />
                        <BulletPoint text="Improving services" />
                    </Section>

                    <Section title="Data Protection">
                        <Text style={styles.bodyText}>
                            Oldful follows industry-standard security practices including secure servers, data encryption, and restricted access to sensitive information.
                        </Text>
                        <Text style={[styles.highlightText, { marginTop: Spacing.sm }]}>
                            Your data is never sold to third parties.
                        </Text>
                    </Section>

                    <Section title="Your Rights">
                        <Text style={styles.bodyText}>Users can request:</Text>
                        <BulletPoint text="Access to their data" />
                        <BulletPoint text="Correction of inaccurate information" />
                        <BulletPoint text="Withdrawal of consent for data processing" />
                    </Section>

                    <View style={styles.contactWrapper}>
                        <Text style={styles.sectionTitle}>Contact for Privacy Concerns</Text>
                        <Text style={styles.bodyText}>Email: privacy@oldful.com</Text>
                        <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
                            Oldful Gentlora Esteem LLP{'\n'}
                            No 402-B 1TF, ITI HBCS Layout{'\n'}
                            Phase 3, Mysore Road{'\n'}
                            Rajarajeshwari Nagar{'\n'}
                            Bangalore – 560039
                        </Text>
                    </View>

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.xl,
        paddingTop: Spacing.sm,
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        textAlign: 'center',
        letterSpacing: -0.24,
    },
    contentCard: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
        borderTopLeftRadius: Radius.xl * 2,
        borderTopRightRadius: Radius.xl * 2,
        overflow: 'hidden',
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl,
    },
    lastUpdated: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
        marginBottom: Spacing.xs,
        textAlign: 'left',
    },
    introText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textBody,
        lineHeight: 22,
        marginBottom: Spacing.lg,
    },
    majorHeading: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading1,
        color: Colors.primary,
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginBottom: Spacing.sm,
    },
    bodyText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        lineHeight: 22,
    },
    highlightText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.textDark,
        lineHeight: 22,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
        paddingRight: Spacing.md,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
        marginTop: 8,
        marginRight: Spacing.sm,
    },
    bulletText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        lineHeight: 22,
    },
    alertBox: {
        flexDirection: 'row',
        backgroundColor: '#FFEBEB',
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F',
    },
    alertTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#D32F2F',
        marginBottom: 2,
    },
    alertText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: '#555555',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: Spacing.md,
        marginBottom: Spacing.lg,
    },
    contactWrapper: {
        backgroundColor: '#FFFFFF',
        borderRadius: Radius.md,
        padding: Spacing.lg,
        marginTop: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    bottomSpacer: {
        height: 60,
    },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function TermsPolicyScreen() {
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
                <Text style={styles.headerTitle}>Policies & Legal</Text>
            </View>

            <View style={styles.contentCard}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <Text style={styles.lastUpdated}>Last Updated: 01/01/2026</Text>

                    {/* ──────────────────────────────────────────────────────────────────
                               TERMS AND CONDITIONS (T&C)
                    ────────────────────────────────────────────────────────────────── */}
                    <Text style={styles.majorHeading}>TERMS AND CONDITIONS (T&C)</Text>
                    
                    <Section 
                        title="Acceptance of Terms" 
                        body="By accessing the website www.ayuxacare.com (“Website”) or subscribing to the services provided by Ayuxa (“Company,” “we,” “us,” or “our”), you (“User,” “Client,” or “Subscriber”) agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services." 
                    />

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Service Description</Text>
                        <Text style={styles.bodyText}>Ayuxa provides comprehensive elder care management services, including but not limited to:</Text>
                        <BulletPoint text="Care coordination and health monitoring." />
                        <BulletPoint text="Assistance with daily living activities via deployed caregivers." />
                        <BulletPoint text="Facilitation of third-party services (e.g., physiotherapy, home maintenance)." />
                        <Text style={[styles.bodyText, { marginTop: 10 }]}>Note: Ayuxa acts as a care management platform. While we vet our partners, specific medical or maintenance services may be executed by independent third-party professionals.</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>User Obligations & Eligibility</Text>
                        <BulletPoint text="Accuracy of Information: You agree to provide accurate, current, and complete medical and personal information regarding the elder. Ayuxa is not liable for adverse outcomes resulting from withheld or inaccurate medical history." />
                        <BulletPoint text="Safe Environment: You agree to provide a safe and respectful environment for our caregivers and service partners. We have a zero-tolerance policy for abuse, harassment, or misconduct towards our staff." />
                        <BulletPoint text="Authority: If you are subscribing on behalf of an elder, you represent that you have the legal authority/consent to make decisions regarding their care." />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Subscription, Payments, and Billing</Text>
                        <BulletPoint text="Subscription Model: Services are offered on a subscription basis (e.g., Monthly, Quarterly, Annual)." />
                        <BulletPoint text="Auto-Renewal: Subscriptions will automatically renew at the end of the billing cycle unless cancelled in writing 7 days prior to the renewal date." />
                        <BulletPoint text="Payment Terms: Fees must be paid in advance. We reserve the right to suspend services immediately if payment is not received by the due date." />
                        <BulletPoint text="Refund Policy: Cancellations for mid-cycle cancellations are calculated on a pro-rata basis. Full refunds are issued only if Ayuxa fails to deploy a caregiver/service as per the SLA." />
                    </View>

                    <View style={styles.alertBox}>
                        <Ionicons name="warning" size={20} color="#D32F2F" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.alertTitle}>Medical Emergency Protocol</Text>
                            <Text style={styles.alertText}>
                                Ayuxa is NOT an Emergency Service: In the event of a life-threatening medical emergency (heart attack, stroke, etc.), the User must contact emergency services (Ambulance/Hospital) immediately.
                            </Text>
                        </View>
                    </View>

                    <Section 
                        title="Limitation of Liability" 
                        body="Ayuxa integrates services from third-party vendors. We are not liable for the negligence or malpractice of these independent providers, though we will assist in dispute resolution. Total liability shall not exceed the amount paid by the User in the three months preceding the claim." 
                    />

                    <View style={styles.divider} />

                    {/* ──────────────────────────────────────────────────────────────────
                               STATUTORY DISCLOSURES
                    ────────────────────────────────────────────────────────────────── */}
                    <Text style={styles.majorHeading}>STATUTORY DISCLOSURES</Text>
                    
                    <View style={styles.contactWrapper}>
                        <Text style={styles.sectionTitle}>Corporate Identity</Text>
                        <Text style={styles.bodyText}>
                            Legal Name: AYUXA GENTLORA ESTEEM LLP{"\n"}
                            Address: No 402-B 1TF, ITI HBCS Layout, Phase 3, Mysore Road, Rajarajeshwari Nagar, Bangalore 560039{"\n"}
                            Email: compliance@ayuxacare.com{"\n"}
                            Mobile: +91-94801-98108
                        </Text>
                    </View>

                    <Section 
                        title="Grievance Redressal (Rule 4(4))" 
                        body="Officer: SK Murgan. Email: compliance@ayuxacare.com. We acknowledge complaints within 48 hours and resolve within 1 month." 
                    />

                    <View style={styles.divider} />

                    {/* ──────────────────────────────────────────────────────────────────
                               SERVICE SCOPE & OPERATIONAL POLICY
                    ────────────────────────────────────────────────────────────────── */}
                    <Text style={styles.majorHeading}>SERVICE SCOPE & OPERATIONAL POLICY</Text>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Scope of Services (What We Do)</Text>
                        <BulletPoint text="Personal Care: Bathing, hygiene, dressing, and mobility assistance." />
                        <BulletPoint text="Health Support: Vitals monitoring, medication reminders, and basic exercise assistance." />
                        <BulletPoint text="Nutritional Support: Feeding and light meal preparation for the patient only." />
                        <BulletPoint text="Companionship: Reading, conversation, and accompanying on walks." />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Service Exclusions (What We DO NOT Do)</Text>
                        <BulletPoint text="Domestic Help: We are not maids. Staff will not clean the entire house or cook for other family members." />
                        <BulletPoint text="Invasive Procedures: No injections or catheter work unless a Registered Nurse is specifically booked." />
                        <BulletPoint text="Financial Handling: Staff are forbidden from handling cash or ATM transactions." />
                    </View>

                    <View style={styles.divider} />

                    {/* ──────────────────────────────────────────────────────────────────
                               PRIVACY POLICY
                    ────────────────────────────────────────────────────────────────── */}
                    <Text style={styles.majorHeading}>PRIVACY POLICY</Text>
                    <Text style={styles.bodyText}>Ayuxa is committed to protecting the privacy and dignity of our users. This policy is in compliance with the IT Act 2000 and the Digital Personal Data Protection Act 2023.</Text>

                    <View style={[styles.section, { marginTop: 15 }]}>
                        <Text style={styles.sectionTitle}>Information We Collect</Text>
                        <BulletPoint text="Identity: Name, age, gender, DOB." />
                        <BulletPoint text="Health Information: Medical history, prescriptions, diagnostic reports." />
                        <BulletPoint text="Financial: Bank/Card details processed securely via third-party gateways." />
                    </View>

                    <Section 
                        title="Disclosure of Information" 
                        body="We do not sell your personal data. We only share info with vetted service partners to fulfill requests, or with medical professionals in emergencies." 
                    />

                    <Section 
                        title="User Rights" 
                        body="You have the right to access your data, request corrections, and withdraw consent at any time by writing to compliance@ayuxacare.com." 
                    />

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
        textAlign: "left", marginLeft: 12,
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
        lineHeight: 20,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
        marginTop: 7,
        marginRight: Spacing.sm,
    },
    bulletText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        lineHeight: 18,
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
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    bottomSpacer: {
        height: 60,
    },
});

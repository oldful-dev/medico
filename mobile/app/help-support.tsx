import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

export default function HelpSupportScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = React.useState('');

    const FAQs = [
        { q: 'How do I book a service?', a: 'You can book any service from the Home screen by clicking on the service icon and following the instructions.' },
        { q: 'Is SOS always available?', a: 'Yes, our SOS emergency feature is available 24/7. It alerts our response team and your emergency contacts immediately.' },
        { q: 'How can I get my lab reports?', a: 'Once your lab results are ready, they will be uploaded to "My Health -> My Prescriptions" section and also shared via WhatsApp/Email.' },
        { q: 'What is the refund policy?', a: 'Cancellations made 2 hours before the scheduled time are eligible for a full refund. Refunds settle in 5-7 business days.' },
        { q: 'How to add emergency contacts?', a: 'Go to "My Profile -> Emergency Contacts" to add or update your family contact details.' },
    ];

    const filteredFAQs = FAQs.filter(f => 
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.a.toLowerCase().includes(searchQuery.toLowerCase())
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
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 34 }} />
            </View>

            <View style={styles.contentCard}>
                {/* Search Bar */}
                <View style={styles.searchWrapper}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search FAQs..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {searchQuery.length > 0 ? (
                        <View style={styles.faqResults}>
                            <Text style={styles.sectionTitle}>Search Results</Text>
                            {filteredFAQs.map((item, i) => (
                                <View key={i} style={styles.faqItem}>
                                    <Text style={styles.faqQuestion}>{item.q}</Text>
                                    <Text style={styles.faqAnswer}>{item.a}</Text>
                                </View>
                            ))}
                            {filteredFAQs.length === 0 && <Text style={styles.noResults}>No matches found.</Text>}
                        </View>
                    ) : (
                        <>
                            <Text style={styles.pageDescription}>
                                If you need assistance with bookings, services, or payments, our support team is available to help.
                            </Text>

                            {/* Contact Options */}
                            <Text style={styles.sectionTitle}>Contact Options</Text>

                            <TouchableOpacity style={styles.contactCard} activeOpacity={0.7}>
                                <View style={styles.iconBoxCall}>
                                    <Ionicons name="call" size={22} color={Colors.textWhite} />
                                </View>
                                <View style={styles.contactTextGroup}>
                                    <Text style={styles.contactTitle}>Call Us</Text>
                                    <Text style={styles.contactDesc}>Speak directly with our support team.</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.contactCard} activeOpacity={0.7}>
                                <View style={styles.iconBoxWhatsapp}>
                                    <Ionicons name="logo-whatsapp" size={24} color={Colors.textWhite} />
                                </View>
                                <View style={styles.contactTextGroup}>
                                    <Text style={styles.contactTitle}>WhatsApp Us</Text>
                                    <Text style={styles.contactDesc}>Get quick help through WhatsApp chat.</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.contactCard} activeOpacity={0.7}>
                                <View style={styles.iconBoxTicket}>
                                    <Ionicons name="chatbubbles" size={22} color={Colors.textWhite} />
                                </View>
                                <View style={styles.contactTextGroup}>
                                    <Text style={styles.contactTitle}>Raise a Ticket</Text>
                                    <Text style={styles.contactDesc}>Submit a request and we'll respond shortly.</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                            </TouchableOpacity>

                            {/* Support Promise */}
                            <Text style={styles.sectionTitle}>Support Promise</Text>
                            <View style={styles.infoCard}>
                                <View style={styles.listItem}>
                                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                                    <Text style={styles.listText}>Complaint acknowledgement within 48 hours</Text>
                                </View>
                                <View style={styles.listItem}>
                                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                                    <Text style={styles.listText}>Issue resolution within 1 month</Text>
                                </View>
                                <View style={styles.listItem}>
                                    <Ionicons name="information-circle" size={18} color={Colors.primary} />
                                    <Text style={styles.listText}>A unique ticket number will be provided to track your request.</Text>
                                </View>
                            </View>

                            {/* FAQs Section (Preview) */}
                            <Text style={styles.sectionTitle}>Common FAQs</Text>
                            {FAQs.slice(0, 3).map((item, i) => (
                                <View key={i} style={styles.faqCard}>
                                    <Text style={styles.faqQuestion}>{item.q}</Text>
                                    <Text style={styles.faqAnswer}>{item.a}</Text>
                                </View>
                            ))}
                        </>
                    )}

                    {/* Support Contacts */}
                    <Text style={styles.sectionTitle}>Support Contact</Text>
                    <View style={styles.infoCard}>
                        <Text style={styles.contactHeader}>Customer Support</Text>
                        <Text style={styles.contactDetail}>Phone: +91 94801 98108</Text>
                        <Text style={styles.contactDetail}>Email: client@oldful.com</Text>

                        <View style={styles.divider} />

                        <Text style={styles.contactHeader}>Grievance Officer</Text>
                        <Text style={styles.contactDetail}>Name: SK Murgan</Text>
                        <Text style={styles.contactDetail}>Email: compliance@oldful.com</Text>
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
    pageDescription: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textBody,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginBottom: Spacing.md,
        marginTop: Spacing.sm,
    },
    contactCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        ...Shadow.card,
    },
    iconBoxCall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4A90E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    iconBoxWhatsapp: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#25D366',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    iconBoxTicket: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F5A623',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    contactTextGroup: {
        flex: 1,
    },
    contactTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 2,
    },
    contactDesc: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },
    infoCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        ...Shadow.card,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    listText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        lineHeight: 20,
    },
    contactHeader: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 4,
    },
    contactDetail: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        marginBottom: 2,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: Spacing.md,
    },
    bottomSpacer: {
        height: 60,
    },
    searchWrapper: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.primary,
        paddingBottom: Spacing.lg,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.md,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.xs,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    faqResults: {
        marginTop: Spacing.sm,
    },
    faqItem: {
        marginBottom: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        paddingBottom: Spacing.md,
    },
    faqQuestion: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 4,
    },
    faqAnswer: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        lineHeight: 20,
    },
    faqCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        ...Shadow.card,
    },
    noResults: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        textAlign: 'center',
        marginTop: Spacing.xl,
    },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

export default function HelpSupportScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

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
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

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
        height: 40,
    },
});

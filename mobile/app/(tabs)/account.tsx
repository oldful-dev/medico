// Account Tab - User Profile Screen
// PRD: Profile info, medical card, prescriptions, management links
import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Switch,
    Modal,
    Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

// ─── Figma-exported Assets ───
const avatarImg = require('@/assets/images/65a7d95e579c06bade85c7970d17cfcc5d7b7c55.png');
const prescriptionIcon = require('@/assets/images/12a939ac9402eccf1948ba9378dc7ffb078381cb.png');
const familyIcon = require('@/assets/images/26945e6abc1b678cf3cb29a1a66c0cf290cc7cfd.png');
const medicineIcon = require('@/assets/images/d5af1afa1cde66e54aeb1999694662d16773e7f1.png');
const mapPinIcon = require('@/assets/images/cdbf0706933902cbeda980a0b28531b20ee3c70b.png');
const creditCardIcon = require('@/assets/images/1552f99b4321880dc3208d769c4ba401b9a3aafd.png');

export default function AccountScreen() {
    const router = useRouter();
    const [notifyEnabled, setNotifyEnabled] = useState(true);
    const [whatsappEnabled, setWhatsappEnabled] = useState(true);
    const [promoEnabled, setPromoEnabled] = useState(false);

    // Language Support
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [currentLang, setCurrentLang] = useState('English');
    const LANGUAGES = ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu'];

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />

            {/* ─── Header Section (Green Background) ─── */}
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>My Profile</Text>
                </View>
            </SafeAreaView>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Profile Details Card ─── */}
                {/* Figma: bg white, h=140, r=15, shadow */}
                <View style={styles.profileCard}>
                    <View style={styles.profileInfoText}>
                        <Text style={styles.profileName}>Mr. Shankar</Text>
                        <Text style={styles.profileDetailLine}>
                            <Text style={styles.profileDetailKey}>Oldful ID: </Text>
                            <Text style={styles.profileDetailValue}>#BLR-8821</Text>
                        </Text>
                        <Text style={styles.profileDetailLine}>
                            <Text style={styles.profileDetailKeyNormal}>Name : </Text>
                            <Text style={styles.profileDetailValue}>Example(Mr.Shnkar)</Text>
                        </Text>
                        <Text style={styles.profileAddressLine}>
                            <Text style={styles.profileAddressKey}>Address:Customer</Text>
                            <Text style={styles.profileAddressValue}> +91 8548463545</Text>
                        </Text>
                    </View>

                    {/* Avatar Container */}
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarWrapper}>
                            <Image source={avatarImg} style={styles.avatarImage} resizeMode="cover" />
                        </View>
                        {/* Edit Button overlay */}
                        <TouchableOpacity style={styles.editButton}>
                            <Ionicons name="create-outline" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── Section Title ─── */}
                <Text style={styles.sectionHeading}>
                    <Text style={styles.sectionHeadingGreen}>My</Text> Health
                </Text>

                {/* ─── Medical Card ─── */}
                <TouchableOpacity style={styles.medicalCard} activeOpacity={0.8}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>My Medical Card</Text>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </View>
                    <Text style={styles.medicalText}>Blood Group: O+,Diabetic(yes),Hypertension(yes),</Text>
                    <Text style={styles.medicalText}>
                        Allergies:<Text style={styles.medicalTextBold}>No</Text>
                    </Text>
                </TouchableOpacity>

                {/* ─── Prescriptions Card ─── */}
                <View style={styles.prescriptionsCard}>
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.titleWithIcon}>
                            <Text style={styles.cardTitle}>My Prescriptions</Text>
                            <Image source={prescriptionIcon} style={styles.iconSmall} />
                        </View>
                    </View>

                    {/* Bullet List Item */}
                    <View style={styles.listItemRow}>
                        <View style={styles.bulletPoint} />
                        <Text style={styles.listText}>View uploaded prescriptions</Text>
                    </View>

                    {/* Notification Info & Toggle */}
                    <View style={styles.notificationGroup}>
                        <View style={styles.notificationDetails}>
                            <View style={styles.notificationRow}>
                                <Image source={familyIcon} style={styles.iconTiny} />
                                <Text style={styles.notificationText}>Son,Daughter,Neighbour</Text>
                            </View>
                            <View style={styles.notificationRow}>
                                <Image source={medicineIcon} style={styles.iconTiny} />
                                <Text style={styles.notificationText}>Notify them for every booking?</Text>
                            </View>
                        </View>
                        <Switch
                            trackColor={{ false: '#AAAEAC', true: Colors.primary }}
                            thumbColor={'#FFFFFF'}
                            ios_backgroundColor="#AAAEAC"
                            onValueChange={() => setNotifyEnabled(prev => !prev)}
                            value={notifyEnabled}
                        />
                    </View>

                    {/* Add Contact Button */}
                    <TouchableOpacity style={styles.addContactButton}>
                        <Text style={styles.addContactText}>+Add Contact</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── Link Sections ─── */}
                <View style={styles.linksContainer}>

                    {/* Section 2: Management & Logistics */}
                    <Text style={styles.subHeading}>Management & Logistics</Text>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7}>
                        <View style={styles.linkLeft}><Ionicons name="location-outline" size={24} color={Colors.primary} /><Text style={styles.linkTitle}>Manage Addresses</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7}>
                        <View style={styles.linkLeft}><Ionicons name="card-outline" size={24} color={Colors.primary} /><Text style={styles.linkTitle}>Payments & Wallet</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.settingCard}
                        activeOpacity={0.7}
                        onPress={() => router.push('/my-bookings')}
                    >
                        <View style={styles.linkLeft}><Ionicons name="time-outline" size={24} color={Colors.primary} /><Text style={styles.linkTitle}>My Bookings</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>

                    {/* Section 3: App Preferences */}
                    <Text style={styles.subHeading}>App Preferences</Text>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7} onPress={() => setLangModalVisible(true)}>
                        <View style={styles.linkLeft}>
                            <Ionicons name="language-outline" size={24} color={Colors.primary} />
                            <Text style={styles.linkTitle}>Change Language</Text>
                        </View>
                        <View style={styles.rightWithText}>
                            <Text style={styles.selectedSettingText}>{currentLang}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                        </View>
                    </TouchableOpacity>

                    {/* Notification Toggles */}
                    <View style={styles.settingCardNonClickable}>
                        <View style={styles.linkLeft}>
                            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                            <Text style={styles.linkTitle}>WhatsApp Updates</Text>
                        </View>
                        <Switch trackColor={{ false: '#AAAEAC', true: Colors.primary }} thumbColor={'#FFFFFF'}
                            ios_backgroundColor="#AAAEAC" onValueChange={setWhatsappEnabled} value={whatsappEnabled} />
                    </View>
                    <View style={styles.settingCardNonClickable}>
                        <View style={styles.linkLeft}>
                            <Ionicons name="megaphone-outline" size={24} color={Colors.primary} />
                            <Text style={styles.linkTitle}>Promotional Offers</Text>
                        </View>
                        <Switch trackColor={{ false: '#AAAEAC', true: Colors.primary }} thumbColor={'#FFFFFF'}
                            ios_backgroundColor="#AAAEAC" onValueChange={setPromoEnabled} value={promoEnabled} />
                    </View>

                    {/* Section 4: Support & Legal */}
                    <Text style={styles.subHeading}>Support & Legal</Text>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7} onPress={() => router.push('/help-support' as any)}>
                        <View style={styles.linkLeft}><Ionicons name="headset-outline" size={24} color={Colors.primary} /><Text style={styles.linkTitle}>Help & Support</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7} onPress={() => router.push('/rate-us' as any)}>
                        <View style={styles.linkLeft}><Ionicons name="star-outline" size={24} color={Colors.primary} /><Text style={styles.linkTitle}>Rate Oldful</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7} onPress={() => router.push('/terms-policy' as any)}>
                        <View style={styles.linkLeft}><Ionicons name="document-text-outline" size={24} color={Colors.primary} /><Text style={styles.linkTitle}>Terms & Privacy Policy</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        activeOpacity={0.6}
                        onPress={() => router.replace('/(auth)/login' as any)}
                    >
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Spacer for Tab Bar */}
                <View style={styles.bottomSpacer} />

            </ScrollView>

            {/* Language Selection Modal */}
            <Modal visible={langModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Select Language</Text>
                        {LANGUAGES.map(lang => (
                            <TouchableOpacity
                                key={lang}
                                style={[styles.langOption, currentLang === lang && styles.langOptionSelected]}
                                onPress={() => { setCurrentLang(lang); setLangModalVisible(false); }}
                            >
                                <Text style={[styles.langText, currentLang === lang && styles.langTextSelected]}>{lang}</Text>
                                {currentLang === lang && <Ionicons name="checkmark-circle" size={24} color="#048357" />}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setLangModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    /* ─── Screen ─── */
    screen: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Cream background from Figma
    },

    /* ─── Header ─── */
    headerSafe: {
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: Radius.xl,
        borderBottomRightRadius: Radius.xl,
        zIndex: 10,
    },
    headerRow: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 10,
    },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        letterSpacing: -0.24,
    },

    /* ─── Scroll Container ─── */
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xl,
    },

    /* ─── Profile Card ─── */
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 22,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 6,
        marginBottom: 35,
    },
    profileInfoText: {
        flex: 1,
        gap: 6,
    },
    profileName: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button,
        color: Colors.textDark,
        marginBottom: 2,
    },
    profileDetailLine: {
        fontSize: FontSize.body,
        lineHeight: 20,
    },
    profileDetailKey: {
        fontFamily: Fonts.medium,
        color: Colors.textDark,
    },
    profileDetailKeyNormal: {
        fontFamily: Fonts.semiBold,
        color: Colors.textDark,
    },
    profileDetailValue: {
        fontFamily: Fonts.regular,
        color: Colors.textBody,
    },
    profileAddressLine: {
        fontSize: FontSize.bodySmall,
        marginTop: 4,
        lineHeight: 18,
    },
    profileAddressKey: {
        fontFamily: Fonts.medium,
        color: Colors.textDark,
    },
    profileAddressValue: {
        fontFamily: Fonts.regular,
        color: Colors.textDark,
    },
    avatarContainer: {
        position: 'relative',
        marginLeft: 10,
    },
    avatarWrapper: {
        width: 95,
        height: 95,
        borderRadius: 47.5,
        backgroundColor: '#EBEBEB',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    avatarImage: {
        width: 64,
        height: 90,
    },
    editButton: {
        position: 'absolute',
        top: 0,
        right: -5,
        width: 27,
        height: 27,
        backgroundColor: '#FFFFFF',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#AAAEAC',
        justifyContent: 'center',
        alignItems: 'center',
    },

    sectionHeading: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textDark,
        marginLeft: Spacing.sm,
        marginBottom: Spacing.lg,
        letterSpacing: -0.24,
    },
    sectionHeadingGreen: {
        color: Colors.primary,
    },

    /* ─── Cards Common ─── */
    medicalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadow.card,
    },
    prescriptionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadow.card,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    titleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    cardTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        letterSpacing: -0.24,
    },
    iconSmall: {
        width: 18,
        height: 18,
    },

    /* ─── Medical Text ─── */
    medicalText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        lineHeight: 22,
    },
    medicalTextBold: {
        fontFamily: Fonts.semiBold,
        color: Colors.textDark,
    },

    /* ─── Prescription Content ─── */
    listItemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
        paddingRight: Spacing.md,
        gap: Spacing.sm,
    },
    bulletPoint: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
        marginTop: 6,
    },
    listText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textDark,
        flex: 1,
        lineHeight: 20,
    },
    notificationGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.04)',
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    notificationDetails: {
        flex: 1,
        gap: 8,
    },
    notificationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconTiny: {
        width: 14,
        height: 14,
        resizeMode: 'contain',
    },
    notificationText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
    },
    addContactButton: {
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    addContactText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
        letterSpacing: -0.24,
    },

    /* ─── Link Sections & Modals ─── */
    linksContainer: {
        marginTop: Spacing.xl,
    },
    subHeading: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginLeft: Spacing.sm,
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
        letterSpacing: -0.24,
    },
    settingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
        ...Shadow.card,
    },
    settingCardNonClickable: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
        ...Shadow.card,
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    linkTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    rightWithText: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectedSettingText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },

    /* ─── Logout Button ─── */
    logoutButton: {
        backgroundColor: '#FFE6E6', // Soft red background
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl, // extra padding before bottom bar
        borderWidth: 1,
        borderColor: '#FFB3B3',
    },
    logoutText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#D32F2F', // Strong red text
        letterSpacing: -0.24,
    },

    bottomSpacer: {
        height: 100, // accommodate custom tab bar
    },

    /* ─── Language Modal ─── */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        ...Shadow.card,
    },
    modalTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    langOptionSelected: {
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
        borderRadius: Radius.sm,
        borderBottomWidth: 0,
        paddingHorizontal: Spacing.sm,
    },
    langText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    langTextSelected: {
        fontFamily: Fonts.semiBold,
        color: Colors.primary,
    },
    modalCancel: {
        marginTop: Spacing.xl,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    modalCancelText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textMuted,
    },
});

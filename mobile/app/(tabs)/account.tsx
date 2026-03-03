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

// ─── Figma-exported Assets ───
const avatarImg = require('@/assets/images/65a7d95e579c06bade85c7970d17cfcc5d7b7c55.png');
const prescriptionIcon = require('@/assets/images/12a939ac9402eccf1948ba9378dc7ffb078381cb.png');
const familyIcon = require('@/assets/images/26945e6abc1b678cf3cb29a1a66c0cf290cc7cfd.png');
const medicineIcon = require('@/assets/images/d5af1afa1cde66e54aeb1999694662d16773e7f1.png');
const mapPinIcon = require('@/assets/images/cdbf0706933902cbeda980a0b28531b20ee3c70b.png');
const creditCardIcon = require('@/assets/images/1552f99b4321880dc3208d769c4ba401b9a3aafd.png');

export default function AccountScreen() {
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
                            <Ionicons name="create-outline" size={14} color="#048357" />
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
                            trackColor={{ false: '#AAAEAC', true: '#048357' }}
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
                        <View style={styles.linkLeft}><Ionicons name="location-outline" size={24} color="#048357" /><Text style={styles.linkTitle}>Manage Addresses</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7}>
                        <View style={styles.linkLeft}><Ionicons name="card-outline" size={24} color="#048357" /><Text style={styles.linkTitle}>Payments & Wallet</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7}>
                        <View style={styles.linkLeft}><Ionicons name="time-outline" size={24} color="#048357" /><Text style={styles.linkTitle}>Order History</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>

                    {/* Section 3: App Preferences */}
                    <Text style={styles.subHeading}>App Preferences</Text>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7} onPress={() => setLangModalVisible(true)}>
                        <View style={styles.linkLeft}>
                            <Ionicons name="language-outline" size={24} color="#048357" />
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
                        <Switch trackColor={{ false: '#AAAEAC', true: '#048357' }} thumbColor={'#FFFFFF'}
                            ios_backgroundColor="#AAAEAC" onValueChange={setWhatsappEnabled} value={whatsappEnabled} />
                    </View>
                    <View style={styles.settingCardNonClickable}>
                        <View style={styles.linkLeft}>
                            <Ionicons name="megaphone-outline" size={24} color="#048357" />
                            <Text style={styles.linkTitle}>Promotional Offers</Text>
                        </View>
                        <Switch trackColor={{ false: '#AAAEAC', true: '#048357' }} thumbColor={'#FFFFFF'}
                            ios_backgroundColor="#AAAEAC" onValueChange={setPromoEnabled} value={promoEnabled} />
                    </View>

                    {/* Section 4: Support & Legal */}
                    <Text style={styles.subHeading}>Support & Legal</Text>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7}>
                        <View style={styles.linkLeft}><Ionicons name="headset-outline" size={24} color="#048357" /><Text style={styles.linkTitle}>Help & Support</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7}>
                        <View style={styles.linkLeft}><Ionicons name="star-outline" size={24} color="#048357" /><Text style={styles.linkTitle}>Rate Oldful</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingCard} activeOpacity={0.7}>
                        <View style={styles.linkLeft}><Ionicons name="document-text-outline" size={24} color="#048357" /><Text style={styles.linkTitle}>Terms & Privacy Policy</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutButton} activeOpacity={0.6}>
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
        backgroundColor: '#048357',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        zIndex: 10,
    },
    headerRow: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 10,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 20,
        color: '#FFFFFF',
        letterSpacing: -0.24,
    },

    /* ─── Scroll Container ─── */
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 15,
        paddingTop: 25,
        paddingBottom: 20,
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
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 15,
        color: '#000000',
        marginBottom: 2,
    },
    profileDetailLine: {
        fontSize: 14,
        lineHeight: 20,
    },
    profileDetailKey: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        color: '#000000',
    },
    profileDetailKeyNormal: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        color: '#000000',
    },
    profileDetailValue: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        color: '#2F2F2F',
    },
    profileAddressLine: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 18,
    },
    profileAddressKey: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        color: '#1E1E1E',
    },
    profileAddressValue: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        color: '#1E1E1E',
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

    /* ─── Section Heading ─── */
    sectionHeading: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 20,
        color: '#2F2F2F',
        marginLeft: 16,
        marginBottom: 15,
        letterSpacing: -0.24,
    },
    sectionHeadingGreen: {
        color: '#048357',
    },

    /* ─── Cards Common ─── */
    medicalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        paddingHorizontal: 16,
        paddingVertical: 15,
        marginBottom: 15,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 6,
    },
    prescriptionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 18,
        marginBottom: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 6,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    titleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 15,
        color: '#000000',
        letterSpacing: -0.24,
    },
    iconSmall: {
        width: 19,
        height: 28,
    },

    /* ─── Medical Text ─── */
    medicalText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 12,
        color: '#555555',
        lineHeight: 20,
        letterSpacing: -0.24,
    },
    medicalTextBold: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        color: '#2F2F2F',
    },

    /* ─── Prescription Content ─── */
    listItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingLeft: 4,
    },
    bulletPoint: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#000000',
        marginRight: 8,
    },
    listText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 15,
        color: '#000000',
    },
    notificationGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingLeft: 6,
    },
    notificationDetails: {
        gap: 4,
    },
    notificationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    iconTiny: {
        width: 19,
        height: 19,
        resizeMode: 'contain',
    },
    notificationText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 12,
        color: '#000000',
    },
    addContactButton: {
        backgroundColor: 'rgba(217,217,217,0.59)',
        borderWidth: 1,
        borderColor: '#AAAEAC',
        borderRadius: 5,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    addContactText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 12,
        color: '#000000',
    },

    /* ─── Link Sections & Modals ─── */
    linksContainer: {
        gap: 6,
    },
    subHeading: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#048357', // Accent color to break sections up
        marginTop: 20,
        marginBottom: 8,
        marginLeft: 10,
    },
    settingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        height: 55,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 5,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    settingCardNonClickable: { // Same layout, just no active opacity tap event needed
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        height: 55,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 5,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    linkTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
    },
    rightWithText: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    selectedSettingText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#898989',
    },
    logoutButton: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 12,
    },
    logoutText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#AAAEAC', // Greyed out priority
    },

    /* ─── Modal Styles ─── */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    modalTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: '#2F2F2F',
        marginBottom: 15,
    },
    langOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    langOptionSelected: {
        backgroundColor: '#F0FFF7',
    },
    langText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: '#555555',
    },
    langTextSelected: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        color: '#048357',
    },
    modalCancel: {
        marginTop: 20,
        alignItems: 'center',
        paddingVertical: 15,
    },
    modalCancelText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#FF4D4D',
    },

    bottomSpacer: {
        height: 100, // accommodate bottom tab bar
    },
});

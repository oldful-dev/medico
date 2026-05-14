// Account Tab — My Profile (PRD 4-Section Layout)
// Section 1: My Health | Section 2: Management & Logistics
// Section 3: App Preferences | Section 4: Support & Legal
import React, { useState, useCallback } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    Switch, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { userService } from '@/services/api/userService';
import { getAssetUrl } from '@/utils/getAssetUrl';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

// ─── Local Assets ───
const avatarImg = require('@/assets/images/65a7d95e579c06bade85c7970d17cfcc5d7b7c55.png');

export default function AccountScreen() {
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const { logout } = useAuth();
    const { languages } = useAppConfig();

    const { t } = useTranslation();
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Language Modal
    const { preferredLanguage, setPreferredLanguage } = useUser();
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [savingLang, setSavingLang] = useState(false);

    const handleToggle = async (key: string, value: boolean) => {
        if (!profile) return;
        
        // Optimistic update
        const oldProfile = { ...profile };
        const newProfile = { ...profile, [key]: value };
        setProfile(newProfile);

        try {
            const res = await userService.updateProfile({ [key]: value } as any);
            if (!res.success) {
                setProfile(oldProfile);
                Alert.alert('Error', res.message || 'Failed to update preference');
            }
        } catch (error) {
            setProfile(oldProfile);
            Alert.alert('Error', 'Network error. Please try again.');
        }
    };

    const currentLangLabel = languages.find(l => l.code === preferredLanguage)?.label ?? 'English';

    const handleLangSelect = async (code: string) => {
        setSavingLang(true);
        try {
            await userService.updateProfile({ preferredLanguage: code });
            setPreferredLanguage(code);   // persists to AsyncStorage via context
        } catch {
            // non-fatal — local state still updates
            setPreferredLanguage(code);
        } finally {
            setSavingLang(false);
            setLangModalVisible(false);
        }
    };

    // Refetch on focus
    useFocusEffect(
        useCallback(() => {
            const refetch = async () => {
                try {
                    const res = await userService.getProfile();
                    if (res.success && res.data) setProfile(res.data);
                } catch { }
            };
            refetch();
        }, [setProfile])
    );

    // Medical card summary
    const medicalCard = profile?.medicalCards?.[0];
    const bloodGroup = medicalCard?.bloodGroup || t('account.not_set');
    const allergies = medicalCard?.allergies?.length ? medicalCard.allergies.join(', ') : t('account.none');

    // Profile Image Upload
    const handleAvatarUpload = async () => {
        Alert.alert(t('account.update_photo'), t('account.choose_option'), [
            {
                text: t('account.camera'), onPress: async () => {
                    const perm = await ImagePicker.requestCameraPermissionsAsync();
                    if (!perm.granted) { Alert.alert(t('common.permission_required'), t('account.camera_permission')); return; }
                    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
                    if (!result.canceled && result.assets[0]) uploadImage(result.assets[0]);
                }
            },
            {
                text: t('account.gallery'), onPress: async () => {
                    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!perm.granted) { Alert.alert(t('common.permission_required'), t('account.gallery_permission')); return; }
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
                    if (!result.canceled && result.assets[0]) uploadImage(result.assets[0]);
                }
            },
            { text: t('common.cancel'), style: 'cancel' },
        ]);
    };

    const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
        setUploadingAvatar(true);
        try {
            const file = { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || 'avatar.jpg' };
            const res = await userService.uploadProfileAvatar(file);
            if (res.success && res.data) {
                setProfile(res.data);
                Alert.alert(t('common.success'), 'Profile photo updated!');
            } else {
                Alert.alert(t('common.error'), res.message || 'Upload failed.');
            }
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || 'Upload failed.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Logout
    const handleLogout = () => {
        Alert.alert(t('account.logout_confirm'), t('account.logout_message'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('account.logout'), style: 'destructive', onPress: async () => {
                    try { await logout(); } catch { }
                    router.replace('/(auth)/login' as any);
                }
            },
        ]);
    };

    // ─── Render ───
    return (
        <View style={styles.screen}>
            <StatusBar style="light" />

            {/* ─── Header ─── */}
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>My Profile</Text>
                </View>
            </SafeAreaView>

            <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">

                {/* ─── Profile Card ─── */}
                <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={() => router.push('/edit-profile' as any)}>
                    <View style={styles.profileInfoText}>
                        <Text style={styles.profileName}>{profile?.name || 'Loading...'}</Text>
                        <Text style={styles.profileDetail}>
                            <Text style={styles.boldKey}>ID: </Text>{profile?.uniqueUserId || 'Pending'}
                        </Text>
                        <Text style={styles.profileDetail}>
                            <Text style={styles.boldKey}>Email: </Text>{profile?.email || 'Not provided'}
                        </Text>
                        <Text style={styles.profileDetail}>
                            <Text style={styles.boldKey}>Phone: </Text>{profile?.phone || '...'}
                        </Text>
                        <Text style={styles.profileDetail} numberOfLines={1}>
                            <Text style={styles.boldKey}>Address: </Text>
                            {(() => {
                                const defAddr = profile?.addresses?.find(a => a.isDefault) || profile?.addresses?.[0];
                                return defAddr ? `${defAddr.line1}, ${defAddr.cityName}` : 'Not set';
                            })()}
                        </Text>
                    </View>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarWrapper}>
                            {uploadingAvatar ? (
                                <ActivityIndicator size="large" color={Colors.primary} />
                            ) : (
                                <Image
                                    source={profile?.profileImageUrl ? { uri: `${getAssetUrl(profile.profileImageUrl)}&_=${Math.random()}` } : avatarImg}
                                    style={profile?.profileImageUrl ? styles.avatarFull : styles.avatarDefault}
                                    resizeMode="cover"
                                    key={`${profile?.profileImageUrl}-${Math.random()}`}
                                />
                            )}
                        </View>
                        <TouchableOpacity style={styles.editPhotoBtn} onPress={handleAvatarUpload}>
                            <Ionicons name="camera-outline" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {/* ══════════════════════════════════════════════════
                    SECTION 1: My Health
                   ══════════════════════════════════════════════════ */}
                <Text style={styles.sectionHeading}>
                    <Text style={styles.sectionGreen}>{t('account.my_health')}</Text>
                </Text>

                {/* My Medical Card */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => router.push('/edit-medical-card' as any)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#FFF0E0' }]}>
                            <Ionicons name="medical-outline" size={20} color="#F5A623" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.linkTitle}>{t('account.medical_card')}</Text>
                            <Text style={styles.linkSubtitle}>Blood: {bloodGroup} • Allergies: {allergies}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                </TouchableOpacity>

                {/* My Prescriptions */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => router.push('/my-prescriptions' as any)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="document-text-outline" size={20} color="#048357" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.linkTitle}>{t('account.prescriptions')}</Text>
                            <Text style={styles.linkSubtitle}>View uploaded prescriptions & reports</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                </TouchableOpacity>

                {/* Emergency Contacts */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => router.push('/emergency-contacts' as any)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#FFE6E6' }]}>
                            <Ionicons name="people-outline" size={20} color="#FF3B30" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.linkTitle}>{t('account.emergency_contacts')}</Text>
                            <Text style={styles.linkSubtitle}>
                                {(profile?.emergencyContacts?.length || 0) > 0
                                    ? `${profile?.emergencyContacts?.length} contact(s) saved`
                                    : 'Add son, daughter, neighbour'}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                </TouchableOpacity>

                {/* ══════════════════════════════════════════════════
                    SECTION 2: Management & Logistics
                   ══════════════════════════════════════════════════ */}
                <Text style={styles.sectionHeading}>{t('account.management')}</Text>

                {/* Management & Logistics */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => router.push('/manage-addresses' as any)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="location-outline" size={20} color="#1E88E5" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.linkTitle}>{t('account.management')}</Text>
                            <Text style={styles.linkSubtitle}>Home, Second Home, Clinic</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                </TouchableOpacity>

                {/* Payments & Wallet */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => router.push('/payments-wallet' as any)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="wallet-outline" size={20} color="#8E24AA" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.linkTitle}>{t('account.payments_wallet')}</Text>
                            <Text style={styles.linkSubtitle}>Save cards for easy checkout</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                </TouchableOpacity>

                {/* Order History */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => router.push('/order-history' as any)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="receipt-outline" size={20} color="#EF6C00" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.linkTitle}>{t('account.order_history')}</Text>
                            <Text style={styles.linkSubtitle}>Past bookings, orders & subscriptions</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                </TouchableOpacity>

                {/* ══════════════════════════════════════════════════
                    SECTION 3: App Preferences
                   ══════════════════════════════════════════════════ */}
                <Text style={styles.sectionHeading}>{t('account.preferences')}</Text>

                {/* Change Language */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => setLangModalVisible(true)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#E8EAF6' }]}>
                            <Ionicons name="language-outline" size={20} color="#3F51B5" />
                        </View>
                        <Text style={styles.linkTitle}>{t('account.change_language')}</Text>
                    </View>
                    <View style={styles.rightWithText}>
                        <Text style={styles.selectedText}>{currentLangLabel}</Text>
                        <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                    </View>
                </TouchableOpacity>

                {/* Push Notifications */}
                <View style={styles.toggleCard}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#E1F5FE' }]}>
                            <Ionicons name="notifications-outline" size={20} color="#0288D1" />
                        </View>
                        <Text style={styles.linkTitle}>Push Notifications</Text>
                    </View>
                    <Switch 
                        trackColor={{ false: '#AAAEAC', true: Colors.primary }} 
                        thumbColor="#FFFFFF"
                        ios_backgroundColor="#AAAEAC" 
                        onValueChange={(val) => handleToggle('pushEnabled', val)} 
                        value={!!profile?.pushEnabled} 
                    />
                </View>

                {/* SMS Alerts */}
                <View style={styles.toggleCard}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="chatbubble-outline" size={20} color="#EF6C00" />
                        </View>
                        <Text style={styles.linkTitle}>SMS Alerts</Text>
                    </View>
                    <Switch 
                        trackColor={{ false: '#AAAEAC', true: Colors.primary }} 
                        thumbColor="#FFFFFF"
                        ios_backgroundColor="#AAAEAC" 
                        onValueChange={(val) => handleToggle('smsEnabled', val)} 
                        value={!!profile?.smsEnabled} 
                    />
                </View>

                {/* WhatsApp Updates */}
                <View style={styles.toggleCard}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                        </View>
                        <Text style={styles.linkTitle}>{t('account.whatsapp_updates')}</Text>
                    </View>
                    <Switch 
                        trackColor={{ false: '#AAAEAC', true: Colors.primary }} 
                        thumbColor="#FFFFFF"
                        ios_backgroundColor="#AAAEAC" 
                        onValueChange={(val) => handleToggle('whatsappEnabled', val)} 
                        value={!!profile?.whatsappEnabled} 
                    />
                </View>

                {/* Promotional Offers */}
                <View style={styles.toggleCard}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#FFF8E1' }]}>
                            <Ionicons name="megaphone-outline" size={20} color="#FFA000" />
                        </View>
                        <Text style={styles.linkTitle}>{t('account.promotional_offers')}</Text>
                    </View>
                    <Switch 
                        trackColor={{ false: '#AAAEAC', true: Colors.primary }} 
                        thumbColor="#FFFFFF"
                        ios_backgroundColor="#AAAEAC" 
                        onValueChange={(val) => handleToggle('emailMarketingEnabled', val)} 
                        value={!!profile?.emailMarketingEnabled} 
                    />
                </View>

                {/* ══════════════════════════════════════════════════
                    SECTION 4: Support & Legal
                   ══════════════════════════════════════════════════ */}
                <Text style={styles.sectionHeading}>{t('account.support')}</Text>

                {/* Help & Support */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => router.push('/help-support' as any)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#E1F5FE' }]}>
                            <Ionicons name="headset-outline" size={20} color="#0288D1" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.linkTitle}>{t('account.help_support')}</Text>
                            <Text style={styles.linkSubtitle}>Call Us, WhatsApp, Raise a Ticket</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                </TouchableOpacity>

                {/* Rate Ayuxa Care */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => router.push('/rate-us' as any)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#FFF9C4' }]}>
                            <Ionicons name="star-outline" size={20} color="#FFC107" />
                        </View>
                        <Text style={styles.linkTitle}>{t('account.rate_us')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                </TouchableOpacity>

                {/* Terms & Privacy */}
                <TouchableOpacity style={styles.linkCard} activeOpacity={0.7} onPress={() => router.push('/terms-policy' as any)}>
                    <View style={styles.linkLeft}>
                        <View style={[styles.linkIcon, { backgroundColor: '#F3F3F3' }]}>
                            <Ionicons name="document-text-outline" size={20} color="#616161" />
                        </View>
                        <Text style={styles.linkTitle}>{t('account.terms_privacy')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#AAAEAC" />
                </TouchableOpacity>

                {/* ─── Log Out (grey/small at bottom) ─── */}
                <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.6} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={16} color="#898989" />
                    <Text style={styles.logoutText}>{t('account.logout')}</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </KeyboardAwareScrollView>

            {/* ─── Language Modal ─── */}
            <Modal visible={langModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>{t('account.select_language')}</Text>
                        {savingLang ? (
                            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
                        ) : (
                            languages.map(lang => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[styles.langOption, preferredLanguage === lang.code && styles.langOptionActive]}
                                    onPress={() => handleLangSelect(lang.code)}
                                >
                                    <View>
                                        <Text style={[styles.langText, preferredLanguage === lang.code && styles.langTextActive]}>
                                            {lang.label}
                                        </Text>
                                        <Text style={styles.langNative}>{lang.native_label}</Text>
                                    </View>
                                    {preferredLanguage === lang.code && <Ionicons name="checkmark-circle" size={22} color="#048357" />}
                                </TouchableOpacity>
                            ))
                        )}
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
    screen: { flex: 1, backgroundColor: '#FDFDE8' },
    headerSafe: { backgroundColor: Colors.primary, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, zIndex: 10 },
    headerRow: { height: 60, justifyContent: 'center', alignItems: 'center', paddingBottom: 10 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: Colors.textWhite, letterSpacing: -0.24, textAlign: 'center' },

    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xl },

    /* ─── Profile Card ─── */
    profileCard: {
        backgroundColor: '#FFF', borderRadius: 15, padding: 22, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 6,
        marginBottom: 30,
    },
    profileInfoText: { flex: 1, gap: 4 },
    profileName: { fontFamily: Fonts.semiBold, fontSize: FontSize.button, color: Colors.textDark, marginBottom: 2 },
    profileDetail: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: Colors.textBody, lineHeight: 20 },
    boldKey: { fontFamily: Fonts.medium, color: Colors.textDark },
    avatarContainer: { position: 'relative', marginLeft: 10 },
    avatarWrapper: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#EBEBEB', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    avatarDefault: { width: 60, height: 85 },
    avatarFull: { width: 90, height: 90 },
    editPhotoBtn: {
        position: 'absolute', top: -2, right: -4, width: 26, height: 26,
        backgroundColor: '#FFF', borderRadius: 5, borderWidth: 1, borderColor: '#AAAEAC',
        justifyContent: 'center', alignItems: 'center',
    },

    /* ─── Section Headings ─── */
    sectionHeading: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: Colors.textDark, marginLeft: 4, marginBottom: 14, marginTop: 24, letterSpacing: -0.24 },
    sectionGreen: { color: Colors.primary },

    /* ─── Link Cards ─── */
    linkCard: {
        backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, ...Shadow.card,
    },
    linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    linkIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    linkTitle: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.textDark },
    linkSubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: Colors.textMuted, marginTop: 2 },
    rightWithText: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    selectedText: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: Colors.textMuted },

    /* ─── Toggle Cards ─── */
    toggleCard: {
        backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, ...Shadow.card,
    },

    /* ─── Log Out (grey/small) ─── */
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, marginTop: 20, borderRadius: 8,
        backgroundColor: '#F2F2F2', borderWidth: 1, borderColor: '#E5E5E5',
    },
    logoutText: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: '#898989' },

    /* ─── Modal ─── */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.xl },
    modalContainer: { backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.xl, ...Shadow.card },
    modalTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: Colors.textDark, marginBottom: Spacing.md, textAlign: 'center' },
    langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    langOptionActive: { backgroundColor: 'rgba(4,131,87,0.05)', borderRadius: Radius.sm, borderBottomWidth: 0, paddingHorizontal: Spacing.sm },
    langText: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textDark },
    langTextActive: { fontFamily: Fonts.semiBold, color: Colors.primary },
    langNative: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: Colors.textMuted, marginTop: 1 },
    modalCancel: { marginTop: Spacing.xl, paddingVertical: Spacing.sm, alignItems: 'center' },
    modalCancelText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.textMuted },
});

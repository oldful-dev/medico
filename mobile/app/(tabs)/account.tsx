// Account Tab — My Profile
import React, { useState, useCallback } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    Switch, Modal, Alert, ActivityIndicator, Linking,
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
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { userService } from '@/services/api/userService';
import { getAssetUrl } from '@/utils/getAssetUrl';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

const avatarImg = require('@/assets/images/65a7d95e579c06bade85c7970d17cfcc5d7b7c55.png');

// ─── Membership config ────────────────────────────────
const MEMBERSHIP_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; border: string }> = {
    premium:  { label: 'Premium Care',  color: '#92400E', bg: '#FEF3C7', icon: 'trophy',          border: '#FDE68A' },
    care_plus:{ label: 'Care Plus',     color: '#065F46', bg: '#D1FAE5', icon: 'shield-checkmark', border: '#6EE7B7' },
    basic:    { label: 'Basic Care',    color: '#1E40AF', bg: '#DBEAFE', icon: 'shield-half',      border: '#BFDBFE' },
    free:     { label: 'Free',          color: '#6B7280', bg: '#F3F4F6', icon: 'person-circle',    border: '#E5E7EB' },
};

// ─── Social links ────────────────────────────────────
const SOCIAL_LINKS = [
    { icon: 'logo-instagram', color: '#E1306C', url: 'https://instagram.com/ayuxacare' },
    { icon: 'logo-facebook', color: '#1877F2', url: 'https://facebook.com/ayuxacare' },
    { icon: 'logo-linkedin', color: '#0A66C2', url: 'https://linkedin.com/company/ayuxacare' },
    { icon: 'logo-youtube', color: '#FF0000', url: 'https://youtube.com/@ayuxacare' },
    { icon: 'logo-x', color: '#000000', url: 'https://x.com/ayuxacare' },
    { icon: 'logo-whatsapp', color: '#25D366', url: 'https://wa.me/918012345678' },
];

export default function AccountScreen() {
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const { logout } = useAuth();
    const { languages } = useAppConfig();
    const { t } = useTranslation();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors);

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const { preferredLanguage, setPreferredLanguage } = useUser();
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [savingLang, setSavingLang] = useState(false);
    const [docsExpanded, setDocsExpanded] = useState(false);

    const handleToggle = async (key: string, value: boolean) => {
        if (!profile) return;
        const oldProfile = { ...profile };
        setProfile({ ...profile, [key]: value });
        try {
            const res = await userService.updateProfile({ [key]: value } as any);
            if (!res.success) {
                setProfile(oldProfile);
                Alert.alert('Error', res.message || 'Failed to update preference');
            }
        } catch {
            setProfile(oldProfile);
            Alert.alert('Error', 'Network error. Please try again.');
        }
    };

    const currentLangLabel = languages.find(l => l.code === preferredLanguage)?.label ?? 'English';

    const handleLangSelect = async (code: string) => {
        setSavingLang(true);
        try {
            await userService.updateProfile({ preferredLanguage: code });
            setPreferredLanguage(code);
        } catch {
            setPreferredLanguage(code);
        } finally {
            setSavingLang(false);
            setLangModalVisible(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            (async () => {
                try {
                    const res = await userService.getProfile();
                    if (res.success && res.data) setProfile(res.data);
                } catch { }
            })();
        }, [setProfile])
    );

    const medicalCard = profile?.medicalCards?.[0];
    const bloodGroup = medicalCard?.bloodGroup || 'Not set';
    const allergies = medicalCard?.allergies?.length ? medicalCard.allergies.join(', ') : 'None';

    const activeSub = profile?.subscriptions?.[0];
    const resolveMembershipKey = (): string => {
        const tier = activeSub?.plan?.tier?.toLowerCase();
        if (tier && MEMBERSHIP_CONFIG[tier]) return tier;
        const name = (activeSub?.plan?.name || '').toLowerCase();
        if (name.includes('premium')) return 'premium';
        if (name.includes('care plus') || name.includes('care_plus')) return 'care_plus';
        if (name.includes('basic')) return 'basic';
        return activeSub ? 'basic' : 'free';
    };
    const membership = MEMBERSHIP_CONFIG[resolveMembershipKey()];

    // Profile completion %
    const completionFields = [
        profile?.name, profile?.phone, profile?.email, profile?.gender,
        profile?.dateOfBirth, profile?.profileImageUrl,
        profile?.addresses?.length, profile?.emergencyContacts?.length,
        profile?.medicalCards?.length,
    ];
    const completionPct = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

    const handleAvatarUpload = async () => {
        Alert.alert('Update Photo', 'Choose option', [
            {
                text: 'Camera', onPress: async () => {
                    const perm = await ImagePicker.requestCameraPermissionsAsync();
                    if (!perm.granted) { Alert.alert('Permission required', 'Camera access needed'); return; }
                    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
                    if (!result.canceled && result.assets[0]) uploadImage(result.assets[0]);
                }
            },
            {
                text: 'Gallery', onPress: async () => {
                    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!perm.granted) { Alert.alert('Permission required', 'Gallery access needed'); return; }
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
                    if (!result.canceled && result.assets[0]) uploadImage(result.assets[0]);
                }
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
        setUploadingAvatar(true);
        try {
            const file = { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `avatar_${Date.now()}.jpg` };
            const res = await userService.uploadProfileAvatar(file);
            if (res.success && res.data) {
                setProfile(res.data);
            } else {
                Alert.alert('Error', res.message || 'Upload failed.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Upload failed.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive', onPress: async () => {
                    try { await logout(); } catch { }
                    router.replace('/(auth)/login' as any);
                }
            },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This will permanently delete your account and all data. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => router.push('/help-support' as any) },
            ]
        );
    };

    // ─── Render ───
    return (
        <View style={styles.screen}>
            <StatusBar style={isDarkMode ? 'light' : 'light'} />

            {/* ─── Green Header Bar ─── */}
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>My Profile</Text>
                </View>
            </SafeAreaView>

            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                enableOnAndroid
                extraScrollHeight={20}
                keyboardShouldPersistTaps="handled"
            >

                {/* ═══════════════════════════════════════
                    PROFILE HEADER CARD
                   ═══════════════════════════════════════ */}
                <View style={styles.profileCard}>
                    {/* Top row: avatar + info */}
                    <View style={styles.profileTopRow}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarWrapper}>
                                {uploadingAvatar ? (
                                    <ActivityIndicator size="large" color={colors.primary} />
                                ) : (
                                    <Image
                                        source={profile?.profileImageUrl
                                            ? { uri: `${getAssetUrl(profile.profileImageUrl)}&_=${Math.random()}` }
                                            : avatarImg}
                                        style={profile?.profileImageUrl ? styles.avatarFull : styles.avatarDefault}
                                        resizeMode="cover"
                                    />
                                )}
                            </View>
                            <TouchableOpacity style={styles.editPhotoBtn} onPress={handleAvatarUpload}>
                                <Ionicons name="camera-outline" size={13} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Name + badges */}
                        <View style={styles.profileMeta}>
                            <View style={styles.nameRow}>
                                <Text style={styles.profileName} numberOfLines={1}>{profile?.name || '—'}</Text>
                                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                            </View>

                            {/* Membership badge — always visible */}
                            <TouchableOpacity
                                style={[styles.memberBadge, { backgroundColor: membership.bg, borderColor: membership.border }]}
                                onPress={() => router.push('/profile/subscription' as any)}
                                activeOpacity={0.75}
                            >
                                <Ionicons name={membership.icon as any} size={13} color={membership.color} />
                                <Text style={[styles.memberBadgeText, { color: membership.color }]}>
                                    {membership.label}
                                </Text>
                                {membership.label === 'Free' && (
                                    <Text style={[styles.memberBadgeUpgrade, { color: membership.color }]}>· Upgrade</Text>
                                )}
                            </TouchableOpacity>

                            {/* AYUXA ID */}
                            <View style={styles.idPill}>
                                <Text style={styles.idPillText}>ID: {profile?.uniqueUserId || 'Pending'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Contact info */}
                    <View style={styles.contactGrid}>
                        <View style={styles.contactRow}>
                            <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.contactText}>{profile?.phone || '—'}</Text>
                        </View>
                        <View style={styles.contactRow}>
                            <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.contactText} numberOfLines={1}>{profile?.email || 'Not provided'}</Text>
                        </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.profileActions}>
                        <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => router.push('/edit-profile' as any)}>
                            <Ionicons name="create-outline" size={15} color="#fff" />
                            <Text style={styles.actionBtnPrimaryText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnOutline} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={15} color={colors.textMuted} />
                            <Text style={styles.actionBtnOutlineText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={13} color="#EF4444" />
                        <Text style={styles.deleteAccountText}>Delete My Account</Text>
                    </TouchableOpacity>

                    {/* Profile completion */}
                    <View style={styles.completionRow}>
                        <Text style={styles.completionLabel}>Profile Completion</Text>
                        <Text style={styles.completionPct}>{completionPct}%</Text>
                    </View>
                    <View style={styles.completionTrack}>
                        <View style={[styles.completionFill, { width: `${completionPct}%` as any }]} />
                    </View>
                </View>

                {/* ═══════════════════════════════════════
                    SECTION 1 — Activity Center (Live Updates)
                   ═══════════════════════════════════════ */}
                <SectionHeading title="Activity Center" colors={colors} />
                <MenuRow
                    icon="pulse-outline"
                    iconBg="#FFF0E0"
                    iconColor="#F59E0B"
                    title="Live Updates"
                    subtitle="Doctor, nurse, caregiver assignments & delivery updates"
                    onPress={() => router.push('/profile/activity-center' as any)}
                    colors={colors}
                />

                {/* ═══════════════════════════════════════
                    SECTION 2 — Bookings & Addresses & Family
                   ═══════════════════════════════════════ */}
                <SectionHeading title="Bookings & Services" colors={colors} />
                <MenuRow
                    icon="calendar-outline"
                    iconBg="#E8F5E9"
                    iconColor="#048357"
                    title="My Bookings"
                    subtitle="Health, wellness, concierge bookings & history"
                    onPress={() => router.push('/my-bookings' as any)}
                    colors={colors}
                />

                <SectionHeading title="Addresses & People" colors={colors} />
                <MenuRow
                    icon="location-outline"
                    iconBg="#E3F2FD"
                    iconColor="#1E88E5"
                    title="Manage Addresses"
                    subtitle="Home, Office, Parents Home, Other"
                    onPress={() => router.push('/manage-addresses' as any)}
                    colors={colors}
                />
                <MenuRow
                    icon="person-add-outline"
                    iconBg="#EDE9FE"
                    iconColor="#7C3AED"
                    title="Family Members"
                    subtitle="Father, mother, spouse, children & dependents"
                    onPress={() => router.push('/family-members' as any)}
                    colors={colors}
                />
                <MenuRow
                    icon="people-outline"
                    iconBg="#FFE6E6"
                    iconColor="#FF3B30"
                    title="Emergency Contacts"
                    subtitle={profile?.emergencyContacts?.length
                        ? `${profile.emergencyContacts.length} contact(s) saved`
                        : 'Add emergency contacts'}
                    onPress={() => router.push('/emergency-contacts' as any)}
                    colors={colors}
                />

                {/* ═══════════════════════════════════════
                    SECTION 3 — Medical & Health
                   ═══════════════════════════════════════ */}
                <SectionHeading title="Health & Medical" green colors={colors} />
                <MenuRow
                    icon="medical-outline"
                    iconBg="#FFF0E0"
                    iconColor="#F5A623"
                    title="Medical Card"
                    subtitle={`Blood: ${bloodGroup} • Allergies: ${allergies}`}
                    onPress={() => router.push('/profile/medical-card' as any)}
                    colors={colors}
                />
                <MenuRow
                    icon="documents-outline"
                    iconBg="#E8F5E9"
                    iconColor="#048357"
                    title="Medical Logs"
                    subtitle="Prescriptions, reports, scans, discharge summaries"
                    onPress={() => router.push('/profile/medical-logs' as any)}
                    colors={colors}
                />

                {/* ═══════════════════════════════════════
                    SECTION 4 — Payments & Subscription
                   ═══════════════════════════════════════ */}
                <SectionHeading title="Payments & Plans" colors={colors} />
                <MenuRow
                    icon="wallet-outline"
                    iconBg="#F3E5F5"
                    iconColor="#8E24AA"
                    title="Payment Methods"
                    subtitle="Cards, UPI, wallet, net banking"
                    onPress={() => router.push('/payments-wallet' as any)}
                    colors={colors}
                />
                <MenuRow
                    icon="ribbon-outline"
                    iconBg="#FEF3C7"
                    iconColor="#B45309"
                    title="Subscription & Membership"
                    subtitle={activeSub ? `${activeSub.plan?.name || 'Active Plan'} · Renew soon` : 'Upgrade to a plan'}
                    onPress={() => router.push('/profile/subscription' as any)}
                    colors={colors}
                />

                {/* ═══════════════════════════════════════
                    SECTION 5 — Preferences & Notifications
                   ═══════════════════════════════════════ */}
                <SectionHeading title="Preferences" colors={colors} />
                <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => setLangModalVisible(true)}>
                    <View style={styles.menuLeft}>
                        <View style={[styles.menuIcon, { backgroundColor: '#E8EAF6' }]}>
                            <Ionicons name="language-outline" size={20} color="#3F51B5" />
                        </View>
                        <Text style={styles.menuTitle}>Language</Text>
                    </View>
                    <View style={styles.menuRight}>
                        <Text style={styles.menuValue}>{currentLangLabel}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                    </View>
                </TouchableOpacity>
                <ToggleRow icon="moon-outline" iconBg="#1E1B4B15" iconColor="#4338CA" title="Dark Mode" value={isDarkMode} onToggle={toggleDarkMode} colors={colors} />

                <SectionHeading title="Notifications" colors={colors} />
                <ToggleRow icon="notifications-outline" iconBg="#E1F5FE" iconColor="#0288D1" title="Push Notifications" value={!!profile?.pushEnabled} onToggle={v => handleToggle('pushEnabled', v)} colors={colors} />
                <ToggleRow icon="chatbubble-outline" iconBg="#FFF3E0" iconColor="#EF6C00" title="SMS Alerts" value={!!profile?.smsEnabled} onToggle={v => handleToggle('smsEnabled', v)} colors={colors} />
                <ToggleRow icon="logo-whatsapp" iconBg="#E8F5E9" iconColor="#25D366" title="WhatsApp Updates" value={!!profile?.whatsappEnabled} onToggle={v => handleToggle('whatsappEnabled', v)} colors={colors} />
                <ToggleRow icon="mail-outline" iconBg="#EDE9FE" iconColor="#7C3AED" title="Email Notifications" value={!!profile?.emailMarketingEnabled} onToggle={v => handleToggle('emailMarketingEnabled', v)} colors={colors} />
                <ToggleRow icon="megaphone-outline" iconBg="#FFF8E1" iconColor="#FFA000" title="Promotional Offers" value={!!profile?.emailMarketingEnabled} onToggle={v => handleToggle('emailMarketingEnabled', v)} colors={colors} />

                {/* ═══════════════════════════════════════
                    SECTION 6 — Help & Support
                   ═══════════════════════════════════════ */}
                <SectionHeading title="Help & Support" colors={colors} />
                <MenuRow icon="headset-outline" iconBg="#E1F5FE" iconColor="#0288D1" title="Help & Support" subtitle="Call, WhatsApp, email, raise a ticket" onPress={() => router.push('/help-support' as any)} colors={colors} />
                <MenuRow icon="star-outline" iconBg="#FFF9C4" iconColor="#FFC107" title="Rate Us" subtitle="Share your experience with AYUXA" onPress={() => router.push('/rate-us' as any)} colors={colors} />

                {/* ═══════════════════════════════════════
                    SECTION 7 — Legal & Documents
                   ═══════════════════════════════════════ */}
                <SectionHeading title="Terms, Conditions & Documents" colors={colors} />

                {/* Collapsible Documents Dropdown */}
                <TouchableOpacity
                    style={[styles.docDropdownHeader, { borderColor: colors.border }]}
                    onPress={() => setDocsExpanded(!docsExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={styles.docDropdownLeft}>
                        <View style={[styles.docDropdownIcon, { backgroundColor: '#F3F3F3' }]}>
                            <Ionicons name="documents-outline" size={18} color="#616161" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.docDropdownTitle}>Documents & Policies</Text>
                            <Text style={styles.docDropdownSub}>{docsExpanded ? 'Tap to collapse' : 'View all documents'}</Text>
                        </View>
                    </View>
                    <Ionicons name={docsExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.text} />
                </TouchableOpacity>

                {/* Expanded Content */}
                {docsExpanded && (
                    <View style={[styles.docDropdownContent, { borderColor: colors.border }]}>
                        <MenuRow icon="document-text-outline" iconBg="#FFF3E0" iconColor="#F57C00" title="Terms & Conditions" onPress={() => router.push('/terms-policy' as any)} colors={colors} />
                        <MenuRow icon="shield-outline" iconBg="#E8F5E9" iconColor="#2E7D32" title="Privacy Policy" onPress={() => router.push('/privacy-policy' as any)} colors={colors} />
                        <MenuRow icon="receipt-outline" iconBg="#FCE4EC" iconColor="#C2185B" title="Refund Policy" onPress={() => router.push('/refund-policy' as any)} colors={colors} />
                        <MenuRow icon="checkmark-circle-outline" iconBg="#F3E5F5" iconColor="#6A1B9A" title="Consent Forms" onPress={() => router.push('/profile/consent-forms' as any)} colors={colors} />
                        <MenuRow icon="contract-outline" iconBg="#E0F2F1" iconColor="#00796B" title="Service Agreements" onPress={() => router.push('/profile/service-agreements' as any)} colors={colors} />
                        <MenuRow icon="eye-outline" iconBg="#EFF7F6" iconColor="#004D40" title="View Documents" onPress={() => router.push('/profile/view-documents' as any)} colors={colors} />
                        <MenuRow icon="download-outline" iconBg="#F1F8E9" iconColor="#558B2F" title="Download Documents" onPress={() => router.push('/profile/download-documents' as any)} colors={colors} />
                    </View>
                )}

                {/* ═══════════════════════════════════════
                    SECTION 8 — Social Media
                   ═══════════════════════════════════════ */}
                <SectionHeading title="Follow Us" colors={colors} />
                <View style={styles.socialRow}>
                    {SOCIAL_LINKS.map((s, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.socialBtn, { backgroundColor: `${s.color}15` }]}
                            onPress={() => Linking.openURL(s.url)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={s.icon as any} size={22} color={s.color} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </KeyboardAwareScrollView>

            {/* ─── Language Modal ─── */}
            <Modal visible={langModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Select Language</Text>
                        {savingLang ? (
                            <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.xl }} />
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
                                    {preferredLanguage === lang.code && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
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

// ─── Shared small components ──────────────────────────────
function SectionHeading({ title, green, colors }: { title: string; green?: boolean; colors: ThemeColors }) {
    const s = makeSharedStyles(colors);
    return (
        <Text style={[s.sectionHeading, green && { color: colors.primary }]}>
            {title}
        </Text>
    );
}

function MenuRow({
    icon, iconBg, iconColor, title, subtitle, onPress, colors
}: {
    icon: string; iconBg: string; iconColor: string;
    title: string; subtitle?: string; onPress: () => void; colors: ThemeColors;
}) {
    const s = makeSharedStyles(colors);
    return (
        <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={onPress}>
            <View style={s.menuLeft}>
                <View style={[s.menuIcon, { backgroundColor: iconBg }]}>
                    <Ionicons name={icon as any} size={20} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.menuTitle}>{title}</Text>
                    {subtitle ? <Text style={s.menuSubtitle}>{subtitle}</Text> : null}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>
    );
}

function ToggleRow({
    icon, iconBg, iconColor, title, value, onToggle, colors
}: {
    icon: string; iconBg: string; iconColor: string;
    title: string; value: boolean; onToggle: (v: boolean) => void; colors: ThemeColors;
}) {
    const s = makeSharedStyles(colors);
    return (
        <View style={s.menuRow}>
            <View style={s.menuLeft}>
                <View style={[s.menuIcon, { backgroundColor: iconBg }]}>
                    <Ionicons name={icon as any} size={20} color={iconColor} />
                </View>
                <Text style={s.menuTitle}>{title}</Text>
            </View>
            <Switch
                trackColor={{ false: colors.textLight, true: colors.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.textLight}
                onValueChange={onToggle}
                value={value}
            />
        </View>
    );
}

// ─── Style factories ──────────────────────────────────────

function makeSharedStyles(c: ThemeColors) {
    return StyleSheet.create({
        sectionHeading: {
            fontFamily: Fonts.semiBold,
            fontSize: FontSize.heading3,
            color: c.textDark,
            marginLeft: 4, marginBottom: 10, marginTop: 24,
            letterSpacing: -0.2,
        },
        menuRow: {
            backgroundColor: c.bgCard, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 8, ...Shadow.card,
        },
        menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
        menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
        menuTitle: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: c.textDark },
        menuSubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: c.textMuted, marginTop: 1 },
    });
}

function makeStyles(c: ThemeColors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: c.bgScreen },
        headerSafe: { backgroundColor: c.primary, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, zIndex: 10 },
        headerRow: { height: 56, justifyContent: 'center', alignItems: 'center', paddingBottom: 8 },
        headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: c.textWhite, letterSpacing: -0.24 },

        scrollView: { flex: 1 },
        scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xl },

        profileCard: {
            backgroundColor: c.bgCard, borderRadius: 16, padding: 18, marginBottom: 8,
            shadowColor: c.shadowColor, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
        },
        profileTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
        avatarContainer: { position: 'relative' },
        avatarWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.bgCardMuted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
        avatarDefault: { width: 56, height: 76 },
        avatarFull: { width: 80, height: 80 },
        editPhotoBtn: {
            position: 'absolute', bottom: 0, right: -2, width: 24, height: 24,
            backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.borderLight,
            justifyContent: 'center', alignItems: 'center',
        },
        profileMeta: { flex: 1, gap: 6, paddingTop: 2 },
        nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        profileName: { fontFamily: Fonts.semiBold, fontSize: 16, color: c.textDark, flex: 1 },
        memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', borderWidth: 1 },
        memberBadgeText: { fontFamily: Fonts.medium, fontSize: 11 },
        memberBadgeUpgrade: { fontFamily: Fonts.medium, fontSize: 11, opacity: 0.7 },
        idPill: { backgroundColor: c.bgCardMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
        idPillText: { fontFamily: Fonts.regular, fontSize: 11, color: c.textMuted, letterSpacing: 0.2 },

        contactGrid: { gap: 6, marginBottom: 14, paddingLeft: 2 },
        contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        contactText: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: c.textBody, flex: 1 },

        profileActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
        actionBtnPrimary: {
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: c.primary, borderRadius: 10, paddingVertical: 10,
        },
        actionBtnPrimaryText: { fontFamily: Fonts.medium, fontSize: 13, color: '#fff' },
        actionBtnOutline: {
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderWidth: 1, borderColor: c.borderLight, borderRadius: 10, paddingVertical: 10, backgroundColor: c.bgCardMuted,
        },
        actionBtnOutlineText: { fontFamily: Fonts.medium, fontSize: 13, color: c.textMuted },
        deleteAccountBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6 },
        deleteAccountText: { fontFamily: Fonts.regular, fontSize: 12, color: '#EF4444' },
        completionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 4 },
        completionLabel: { fontFamily: Fonts.regular, fontSize: 11, color: c.textMuted },
        completionPct: { fontFamily: Fonts.semiBold, fontSize: 11, color: c.primary },
        completionTrack: { height: 4, backgroundColor: c.borderLight, borderRadius: 2, overflow: 'hidden' },
        completionFill: { height: 4, backgroundColor: c.primary, borderRadius: 2 },

        menuRow: {
            backgroundColor: c.bgCard, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 8, ...Shadow.card,
        },
        menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
        menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
        menuTitle: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: c.textDark },
        menuRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        menuValue: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: c.textMuted },

        socialRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', paddingVertical: 8 },
        socialBtn: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

        modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: Spacing.xl },
        modalContainer: { backgroundColor: c.bgCard, borderRadius: Radius.lg, padding: Spacing.xl, ...Shadow.card },
        modalTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: c.textDark, marginBottom: Spacing.md, textAlign: 'center' },
        langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: c.borderLight },
        langOptionActive: { backgroundColor: `${c.primary}10`, borderRadius: Radius.sm, borderBottomWidth: 0, paddingHorizontal: Spacing.sm },
        langText: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: c.textDark },
        langTextActive: { fontFamily: Fonts.semiBold, color: c.primary },
        langNative: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: c.textMuted, marginTop: 1 },
        modalCancel: { marginTop: Spacing.xl, paddingVertical: Spacing.sm, alignItems: 'center' },
        modalCancelText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: c.textMuted },

        docDropdownHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderRadius: Radius.md,
            padding: Spacing.md,
            marginBottom: Spacing.sm,
            marginHorizontal: 0,
        },
        docDropdownLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            gap: Spacing.md,
        },
        docDropdownIcon: {
            width: 40,
            height: 40,
            borderRadius: Radius.sm,
            justifyContent: 'center',
            alignItems: 'center',
        },
        docDropdownTitle: {
            fontFamily: Fonts.semiBold,
            fontSize: FontSize.body,
            color: c.textDark,
        },
        docDropdownSub: {
            fontFamily: Fonts.regular,
            fontSize: FontSize.caption,
            color: c.textMuted,
            marginTop: 2,
        },
        docDropdownContent: {
            borderWidth: 1,
            borderRadius: Radius.md,
            borderTopWidth: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            overflow: 'hidden',
            marginBottom: Spacing.lg,
        },
    });
}

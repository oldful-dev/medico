// Account Tab — My Profile
import React, { useState, useCallback } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    Switch, Modal, ActivityIndicator, Linking,
} from 'react-native';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
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
import { userService, ApiError } from '@/services/api/userService';
import { getAssetUrl } from '@/utils/getAssetUrl';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { legalService, LegalDocument } from '@/services/api/legalService';
import { useApiWithSessionRedirect } from '@/hooks/useApiWithSessionRedirect';

const avatarImg = require('@/assets/images/65a7d95e579c06bade85c7970d17cfcc5d7b7c55.png');

// ─── Membership config ────────────────────────────────
const MEMBERSHIP_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; border: string }> = {
    premium:  { label: 'Premium Care',  color: '#92400E', bg: '#FEF3C7', icon: 'trophy',          border: '#FDE68A' },
    care_plus:{ label: 'Care Plus',     color: '#065F46', bg: '#D1FAE5', icon: 'shield-checkmark', border: '#6EE7B7' },
    basic:    { label: 'Basic Care',    color: '#1E40AF', bg: '#DBEAFE', icon: 'shield-half',      border: '#BFDBFE' },
    free:     { label: 'Free',          color: '#6B7280', bg: '#F3F4F6', icon: 'person-circle',    border: '#E5E7EB' },
};

// ─── Social links (order per spec: Instagram, Facebook, LinkedIn, YouTube, X, WhatsApp)
const SOCIAL_LINKS = [
    { key: 'instagram', icon: 'logo-instagram', color: '#E1306C', label: 'Instagram',        handle: '@ayuxacare',             url: 'https://www.instagram.com/ayuxacare' },
    { key: 'facebook',  icon: 'logo-facebook',  color: '#1877F2', label: 'Facebook',         handle: 'facebook.com/ayuxacare', url: 'https://www.facebook.com/ayuxacare' },
    { key: 'linkedin',  icon: 'logo-linkedin',  color: '#0A66C2', label: 'LinkedIn',         handle: 'AYUXA Care',             url: 'https://www.linkedin.com/company/ayuxacare' },
    { key: 'youtube',   icon: 'logo-youtube',   color: '#FF0000', label: 'YouTube',          handle: '@ayuxacare',             url: 'https://youtube.com/@ayuxacare' },
    { key: 'twitter',   icon: 'logo-x',         color: '#000000', label: 'X (Twitter)',      handle: '@ayuxacare',             url: 'https://x.com/ayuxacare' },
    { key: 'whatsapp',  icon: 'logo-whatsapp',  color: '#25D366', label: 'WhatsApp Channel', handle: 'Join our channel',       url: 'https://whatsapp.com/channel/0029VbCl0Lg0lwgh76DNaH1d' },
];

const getDocStyle = (type: string, isDarkMode: boolean) => {
    switch (type) {
        case 'TERMS_AND_CONDITIONS':
            return {
                icon: 'document-text-outline' as const,
                bg: isDarkMode ? '#2D1F0A' : '#FFF3E0',
                color: '#F57C00',
            };
        case 'PRIVACY_POLICY':
            return {
                icon: 'shield-checkmark-outline' as const,
                bg: isDarkMode ? '#0A2010' : '#E8F5E9',
                color: '#2E7D32',
            };
        case 'REFUND_POLICY':
            return {
                icon: 'receipt-outline' as const,
                bg: isDarkMode ? '#2D0A1A' : '#FCE4EC',
                color: '#C2185B',
            };
        case 'DISCLAIMER':
            return {
                icon: 'warning-outline' as const,
                bg: isDarkMode ? '#2D1A0A' : '#FFF3E0',
                color: '#EF6C00',
            };
        case 'SERVICE_POLICY':
            return {
                icon: 'clipboard-outline' as const,
                bg: isDarkMode ? '#1A0A2D' : '#EDE7F6',
                color: '#6A1B9A',
            };
        case 'STATUTORY_DISCLOSURES':
            return {
                icon: 'business-outline' as const,
                bg: isDarkMode ? '#0A1F2D' : '#E1F5FE',
                color: '#00838F',
            };
        case 'COOKIE_POLICY':
            return {
                icon: 'cafe-outline' as const,
                bg: isDarkMode ? '#2D2410' : '#FFF8E1',
                color: '#8D6E63',
            };
        default:
            return {
                icon: 'document-text-outline' as const,
                bg: isDarkMode ? '#0A1A2E' : '#E3F2FD',
                color: '#0284C7',
            };
    }
};

export default function AccountScreen() {
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const { logout } = useAuth();
    const { languages } = useAppConfig();
    const { t } = useTranslation();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { handleApiError } = useApiWithSessionRedirect();
    const colors = useThemeColors();
    const styles = makeStyles(colors);

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const { preferredLanguage, setPreferredLanguage } = useUser();
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [savingLang, setSavingLang] = useState(false);
    const [docsExpanded, setDocsExpanded] = useState(false);
    const [supportExpanded, setSupportExpanded] = useState(false);
    const [socialExpanded, setSocialExpanded] = useState(false);

    const [publishedDocs, setPublishedDocs] = useState<LegalDocument[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    // Native Alert.alert is globally muted app-wide (see app/_layout.tsx)
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; iconName: string }>({
        visible: false,
        title: '',
        message: '',
        iconName: 'warning-outline',
    });
    const triggerAlert = (title: string, message: string, iconName = 'warning-outline') => {
        setAlertConfig({ visible: true, title, message, iconName });
    };

    // 2-button confirmation dialogs (logout / delete-account / emergency-call)
    const [confirmDialog, setConfirmDialog] = useState<{
        visible: boolean;
        title: string;
        message: string;
        iconName: string;
        confirmText: string;
        onConfirm: () => void;
        cancelText?: string;
        destructive?: boolean;
    } | null>(null);
    const closeConfirmDialog = () => setConfirmDialog(null);

    // Avatar picker action sheet (Camera / Gallery / Cancel)
    const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);

    const fetchPublishedDocs = async () => {
        try {
            setLoadingDocs(true);
            const res = await legalService.getPublishedDocuments();
            if (res.success && res.data) {
                setPublishedDocs(res.data);
            }
        } catch (error) {
            console.error('Failed to load published documents', error);
        } finally {
            setLoadingDocs(false);
        }
    };

    React.useEffect(() => {
        if (docsExpanded) {
            fetchPublishedDocs();
        }
    }, [docsExpanded]);

    const handleToggle = async (key: string, value: boolean) => {
        if (!profile) return;
        const oldProfile = { ...profile };
        setProfile({ ...profile, [key]: value });
        try {
            const res = await userService.updateProfile({ [key]: value } as any);
            if (!res.success) {
                setProfile(oldProfile);
                triggerAlert(t('common.error'), res.message || t('account.failed_update_pref'));
            }
        } catch (error) {
            const handled = await handleApiError(error);
            if (!handled) {
                setProfile(oldProfile);
                triggerAlert(t('common.error'), t('common.generic_error'));
            }
        }
    };

    const currentLangLabel = languages.find(l => l.code === preferredLanguage)?.label ?? 'English';

    const handleLangSelect = async (code: string) => {
        setSavingLang(true);
        try {
            await userService.updateProfile({ preferredLanguage: code });
            setPreferredLanguage(code);
        } catch (error) {
            const handled = await handleApiError(error);
            if (!handled) {
                setPreferredLanguage(code);
            }
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
                } catch (error) {
                    await handleApiError(error);
                }
            })();
        }, [setProfile, handleApiError])
    );

    const medicalCard = profile?.medicalCards?.[0];
    const bloodGroup = medicalCard?.bloodGroup || t('account.not_set');
    const allergies = medicalCard?.allergies?.length ? medicalCard.allergies.join(', ') : t('common.none');

    const activeSubs = profile?.subscriptions?.filter((sub: any) => sub.status === 'ACTIVE') || [];
    const getMembershipConfig = (sub: any) => {
        const tier = sub?.plan?.tier?.toLowerCase();
        if (tier && MEMBERSHIP_CONFIG[tier]) return { key: tier, ...MEMBERSHIP_CONFIG[tier] };
        const name = (sub?.plan?.name || '').toLowerCase();
        if (name.includes('premium')) return { key: 'premium', ...MEMBERSHIP_CONFIG.premium };
        if (name.includes('care plus') || name.includes('care_plus')) return { key: 'care_plus', ...MEMBERSHIP_CONFIG.care_plus };
        if (name.includes('basic')) return { key: 'basic', ...MEMBERSHIP_CONFIG.basic };
        return { key: 'basic', ...MEMBERSHIP_CONFIG.basic };
    };

    // Profile completion %
    const completionFields = [
        profile?.name, profile?.phone, profile?.email, profile?.gender,
        profile?.dateOfBirth, profile?.profileImageUrl,
        profile?.addresses?.length, profile?.emergencyContacts?.length,
        profile?.medicalCards?.length,
    ];
    const completionPct = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

    const handleAvatarUpload = () => {
        setAvatarPickerVisible(true);
    };

    const pickFromCamera = async () => {
        setAvatarPickerVisible(false);
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { triggerAlert(t('account.permission_required'), t('account.camera_access_needed')); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
        if (!result.canceled && result.assets[0]) uploadImage(result.assets[0]);
    };

    const pickFromGallery = async () => {
        setAvatarPickerVisible(false);
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { triggerAlert(t('account.permission_required'), t('account.gallery_access_needed')); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
        if (!result.canceled && result.assets[0]) uploadImage(result.assets[0]);
    };

    const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
        setUploadingAvatar(true);
        try {
            const file = { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `avatar_${Date.now()}.jpg` };
            const res = await userService.uploadProfileAvatar(file);
            if (res.success && res.data) {
                setProfile(res.data);
            } else {
                triggerAlert(t('common.error'), res.message || t('account.upload_failed'));
            }
        } catch (err: any) {
            const handled = await handleApiError(err);
            if (!handled) {
                triggerAlert(t('common.error'), err.message || t('account.upload_failed'));
            }
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleLogout = () => {
        setConfirmDialog({
            visible: true,
            title: t('account.log_out'),
            message: t('account.logout_confirm'),
            iconName: 'log-out-outline',
            confirmText: t('account.log_out'),
            cancelText: t('common.cancel'),
            destructive: true,
            onConfirm: async () => {
                closeConfirmDialog();
                try { await logout(); } catch { }
                router.replace('/(auth)/login' as any);
            },
        });
    };

    const handleDeleteAccount = () => {
        setConfirmDialog({
            visible: true,
            title: t('account.delete_account'),
            message: t('account.delete_account_confirm'),
            iconName: 'trash-outline',
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
            destructive: true,
            onConfirm: async () => {
                closeConfirmDialog();
                try {
                    const res = await userService.deleteAccount();
                    if (res.success) {
                        await logout();
                        router.replace('/(auth)/login' as any);
                    } else {
                        triggerAlert(t('common.error'), res.message || t('account.delete_failed'));
                    }
                } catch (err: any) {
                    const handled = await handleApiError(err);
                    if (!handled) {
                        triggerAlert(t('common.error'), err.message || t('account.delete_failed'));
                    }
                }
            },
        });
    };

    // ─── Render ───
    return (
        <View style={styles.screen}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* ─── Green Header Bar ─── */}
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>{t('account.header_title')}</Text>
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
                                            ? { uri: (() => {
                                                const resolvedUrl = getAssetUrl(profile.profileImageUrl);
                                                const separator = resolvedUrl.includes('?') ? '&' : '?';
                                                return `${resolvedUrl}${separator}_=${Math.random()}`;
                                            })() }
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
                            {activeSubs.length > 0 ? (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                                    {activeSubs.map(sub => {
                                        const config = getMembershipConfig(sub);
                                        return (
                                            <TouchableOpacity
                                                key={sub.id}
                                                style={[styles.memberBadge, { backgroundColor: config.bg, borderColor: config.border }]}
                                                onPress={() => router.push('/plans/membership-dashboard' as any)}
                                                activeOpacity={0.75}
                                            >
                                                <Ionicons name={config.icon as any} size={13} color={config.color} />
                                                <Text style={[styles.memberBadgeText, { color: config.color }]}>
                                                    {sub.plan?.name || t(`account.membership_${config.key}`)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.memberBadge, { backgroundColor: MEMBERSHIP_CONFIG.free.bg, borderColor: MEMBERSHIP_CONFIG.free.border }]}
                                    onPress={() => router.push('/plans/membership-dashboard' as any)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name={MEMBERSHIP_CONFIG.free.icon as any} size={13} color={MEMBERSHIP_CONFIG.free.color} />
                                    <Text style={[styles.memberBadgeText, { color: MEMBERSHIP_CONFIG.free.color }]}>
                                        {t('account.membership_free')}
                                    </Text>
                                    <Text style={[styles.memberBadgeUpgrade, { color: MEMBERSHIP_CONFIG.free.color }]}>· {t('account.upgrade')}</Text>
                                </TouchableOpacity>
                            )}

                            {/* AYUXA ID */}
                            <View style={styles.idPill}>
                                <Text style={styles.idPillText}>{t('account.id', { id: profile?.uniqueUserId || t('account.pending') })}</Text>
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
                            <Text style={styles.contactText} numberOfLines={1}>{profile?.email || t('account.not_provided')}</Text>
                        </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.profileActions}>
                        <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => router.push('/edit-profile' as any)}>
                            <Ionicons name="create-outline" size={15} color="#fff" />
                            <Text style={styles.actionBtnPrimaryText}>{t('account.edit_profile')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnOutline} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={15} color={colors.textMuted} />
                            <Text style={styles.actionBtnOutlineText}>{t('account.log_out')}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={13} color="#EF4444" />
                        <Text style={styles.deleteAccountText}>{t('account.delete_account')}</Text>
                    </TouchableOpacity>

                    {/* Profile completion */}
                    <View style={styles.completionRow}>
                        <Text style={styles.completionLabel}>{t('account.profile_completion')}</Text>
                        <Text style={styles.completionPct}>{completionPct}%</Text>
                    </View>
                    <View style={styles.completionTrack}>
                        <View style={[styles.completionFill, { width: `${completionPct}%` as any }]} />
                    </View>
                </View>

                {/* ═══════════════════════════════════════
                    SECTION 1 — Activity Center (Live Updates)
                   ═══════════════════════════════════════ */}
                <SectionHeading title={t('account.section_activity')} colors={colors} />
                <MenuRow
                    icon="pulse-outline"
                    iconBg="#FFF0E0"
                    iconColor="#F59E0B"
                    title={t('account.live_updates_title')}
                    subtitle={t('account.live_updates_sub')}
                    onPress={() => router.push('/profile/activity-center' as any)}
                    colors={colors}
                />

                {/* ═══════════════════════════════════════
                    SECTION 2 — Bookings & Addresses & Family
                   ═══════════════════════════════════════ */}
                <SectionHeading title={t('account.section_bookings')} colors={colors} />
                <MenuRow
                    icon="calendar-outline"
                    iconBg="#E8F5E9"
                    iconColor="#048357"
                    title={t('account.my_bookings_title')}
                    subtitle={t('account.my_bookings_sub')}
                    onPress={() => router.push('/my-bookings' as any)}
                    colors={colors}
                />

                <MenuRow
                    icon="people-outline"
                    iconBg="#D1FAE5"
                    iconColor="#02743F"
                    title={t('account.local_meetups_title')}
                    subtitle={t('account.local_meetups_sub')}
                    onPress={() => router.push('/meetup' as any)}
                    colors={colors}
                />

                <SectionHeading title={t('account.section_addresses')} colors={colors} />
                <MenuRow
                    icon="location-outline"
                    iconBg="#E3F2FD"
                    iconColor="#1E88E5"
                    title={t('account.manage_addresses_title')}
                    subtitle={t('account.manage_addresses_sub')}
                    onPress={() => router.push('/manage-addresses' as any)}
                    colors={colors}
                />
                <MenuRow
                    icon="person-add-outline"
                    iconBg="#EDE9FE"
                    iconColor="#7C3AED"
                    title={t('account.family_members_title')}
                    subtitle={t('account.family_members_sub')}
                    onPress={() => router.push('/family-members' as any)}
                    colors={colors}
                />
                <MenuRow
                    icon="people-outline"
                    iconBg="#FFE6E6"
                    iconColor="#FF3B30"
                    title={t('account.emergency_contacts_title')}
                    subtitle={profile?.emergencyContacts?.length
                        ? t('account.emergency_contacts_saved', { count: profile.emergencyContacts.length })
                        : t('account.add_emergency_contacts')}
                    onPress={() => router.push('/emergency-contacts' as any)}
                    colors={colors}
                />
                <MenuRow
                    icon="alert-circle-outline"
                    iconBg="#FFEBEB"
                    iconColor="#EF4444"
                    title={t('account.my_sos_alerts_title')}
                    subtitle={t('account.my_sos_alerts_sub')}
                    onPress={() => router.push('/my-sos-alerts' as any)}
                    colors={colors}
                />

                {/* ═══════════════════════════════════════
                    SECTION 3 — Medical & Health
                   ═══════════════════════════════════════ */}
                <SectionHeading title={t('account.section_health')} green colors={colors} />
                <MenuRow
                    icon="medical-outline"
                    iconBg="#FFF0E0"
                    iconColor="#F5A623"
                    title={t('account.medical_card_title')}
                    subtitle={t('account.medical_card_sub', { bloodGroup, allergies })}
                    onPress={() => router.push('/profile/medical-card' as any)}
                    colors={colors}
                />
                <MenuRow
                    icon="documents-outline"
                    iconBg="#E8F5E9"
                    iconColor="#048357"
                    title={t('account.medical_logs_title')}
                    subtitle={t('account.medical_logs_sub')}
                    onPress={() => router.push('/profile/medical-logs' as any)}
                    colors={colors}
                />

                {/* ═══════════════════════════════════════
                    SECTION 4 — Payments & Subscription
                   ═══════════════════════════════════════ */}
                <SectionHeading title={t('account.section_payments')} colors={colors} />
                <MenuRow
                    icon="wallet-outline"
                    iconBg="#F3E5F5"
                    iconColor="#8E24AA"
                    title={t('account.payment_methods_title')}
                    subtitle={t('account.payment_methods_sub')}
                    onPress={() => router.push('/payments-wallet' as any)}
                    colors={colors}
                />
                <MenuRow
                    icon="ribbon-outline"
                    iconBg="#FEF3C7"
                    iconColor="#B45309"
                    title={t('account.subscription_membership_title')}
                    subtitle={activeSubs.length > 0 ? t('account.active_plan_renew', { name: activeSubs.map(s => s.plan?.name || t('account.active_plan')).join(', ') }) : t('account.upgrade_to_plan')}
                    onPress={() => router.push('/plans/membership-dashboard' as any)}
                    colors={colors}
                />

                {/* ═══════════════════════════════════════
                    SECTION 5 — Preferences & Notifications
                   ═══════════════════════════════════════ */}
                <SectionHeading title={t('account.section_preferences')} colors={colors} />
                <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => setLangModalVisible(true)}>
                    <View style={styles.menuLeft}>
                        <View style={[styles.menuIcon, { backgroundColor: isDarkMode ? '#3F51B515' : '#E8EAF6' }]}>
                            <Ionicons name="language-outline" size={20} color={isDarkMode ? '#7986CB' : '#3F51B5'} />
                        </View>
                        <Text style={styles.menuTitle}>{t('account.language')}</Text>
                    </View>
                    <View style={styles.menuRight}>
                        <Text style={styles.menuValue}>{currentLangLabel}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                    </View>
                </TouchableOpacity>
                <ToggleRow icon="moon-outline" iconBg="#1E1B4B15" iconColor="#4338CA" title={t('account.dark_mode')} value={isDarkMode} onToggle={toggleDarkMode} colors={colors} />

                <SectionHeading title={t('account.section_notifications')} colors={colors} />
                <ToggleRow icon="notifications-outline" iconBg="#E1F5FE" iconColor="#0288D1" title={t('account.push_notifications')} value={!!profile?.pushEnabled} onToggle={v => handleToggle('pushEnabled', v)} colors={colors} />
                <ToggleRow icon="chatbubble-outline" iconBg="#FFF3E0" iconColor="#EF6C00" title={t('account.sms_alerts')} value={!!profile?.smsEnabled} onToggle={v => handleToggle('smsEnabled', v)} colors={colors} />
                <ToggleRow icon="logo-whatsapp" iconBg="#E8F5E9" iconColor="#25D366" title={t('account.whatsapp_updates')} value={!!profile?.whatsappEnabled} onToggle={v => handleToggle('whatsappEnabled', v)} colors={colors} />
                <ToggleRow icon="mail-outline" iconBg="#EDE9FE" iconColor="#7C3AED" title={t('account.email_notifications')} value={!!profile?.emailMarketingEnabled} onToggle={v => handleToggle('emailMarketingEnabled', v)} colors={colors} />
                <ToggleRow icon="megaphone-outline" iconBg="#FFF8E1" iconColor="#FFA000" title={t('account.promotional_offers')} value={!!profile?.emailMarketingEnabled} onToggle={v => handleToggle('emailMarketingEnabled', v)} colors={colors} />

                {/* ═══════════════════════════════════════
                    SECTION 6 — Help & Support (dropdown)
                   ═══════════════════════════════════════ */}
                <SectionHeading title={t('account.section_support')} colors={colors} />
                <DropdownSection
                    icon="headset-outline"
                    iconBg={isDarkMode ? '#0C3547' : '#E0F4FF'}
                    iconColor="#0284C7"
                    title={t('account.support_title')}
                    subtitle={t('account.support_sub')}
                    expanded={supportExpanded}
                    onToggle={() => setSupportExpanded(v => !v)}
                    colors={colors}
                    isDarkMode={isDarkMode}
                >
                    <MenuRow icon="call-outline" iconBg={isDarkMode ? '#0C3547' : '#DCF3FF'} iconColor="#0284C7"
                        title={t('account.call_support_title')} subtitle={t('account.call_support_sub')}
                        onPress={() => Linking.openURL('tel:08047280789')} colors={colors} />
                    <MenuRow icon="mail-outline" iconBg={isDarkMode ? '#2D1F0A' : '#FFF3E0'} iconColor="#F57C00"
                        title={t('account.email_support_title')} subtitle={t('account.email_support_sub')}
                        onPress={() => Linking.openURL('mailto:support@ayuxacare.com')} colors={colors} />
                    <MenuRow icon="chatbubble-ellipses-outline" iconBg={isDarkMode ? '#1E1340' : '#F3E5F5'} iconColor="#7C3AED"
                        title={t('account.live_chat_title')} subtitle={t('account.live_chat_sub')}
                        onPress={() => router.push('/help-support/chat' as any)} colors={colors} />
                    <MenuRow icon="ticket-outline" iconBg={isDarkMode ? '#2D0A1A' : '#FCE4EC'} iconColor="#EC4899"
                        title={t('account.raise_ticket_title')} subtitle={t('account.raise_ticket_sub')}
                        onPress={() => router.push('/help-support/raise-ticket' as any)} colors={colors} />
                    <MenuRow icon="help-circle-outline" iconBg={isDarkMode ? '#0A2010' : '#E8F5E9'} iconColor="#2E7D32"
                        title={t('account.faq_title')} subtitle={t('account.faq_sub')}
                        onPress={() => router.push('/help-support/faq' as any)} colors={colors} />

                    {/* Emergency Assistance — full-width red CTA */}
                    <TouchableOpacity
                        style={[styles.emergencyBtn, {
                            borderColor: isDarkMode ? '#7F1D1D' : '#FEE2E2',
                            backgroundColor: isDarkMode ? '#450A0A' : '#FEF2F2',
                        }]}
                        onPress={() => setConfirmDialog({
                            visible: true,
                            title: t('account.emergency_assistance'),
                            message: t('account.emergency_alert_msg'),
                            iconName: 'alert-circle-outline',
                            confirmText: t('account.call_now'),
                            cancelText: t('common.cancel'),
                            destructive: true,
                            onConfirm: () => {
                                closeConfirmDialog();
                                Linking.openURL('tel:+919480198108');
                            },
                        })}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.emergencyIcon, { backgroundColor: isDarkMode ? '#7F1D1D' : '#FFE4E6' }]}>
                            <Ionicons name="alert-circle" size={20} color={isDarkMode ? '#FCA5A5' : '#DC2626'} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.emergencyTitle, { color: isDarkMode ? '#FCA5A5' : '#DC2626' }]}>{t('account.emergency_assistance')}</Text>
                            <Text style={[styles.emergencySub, { color: isDarkMode ? '#FECACA' : '#991B1B' }]}>{t('account.emergency_assistance_sub')}</Text>
                        </View>
                        <View style={[styles.emergencyPulse, { backgroundColor: isDarkMode ? '#7F1D1D' : '#FCA5A5' }]}>
                            <View style={[styles.emergencyDot, { backgroundColor: isDarkMode ? '#FCA5A5' : '#DC2626' }]} />
                        </View>
                    </TouchableOpacity>
                </DropdownSection>

                {/* ═══════════════════════════════════════
                    SECTION 7 — Terms, Conditions & Documents (dropdown)
                   ═══════════════════════════════════════ */}
                <SectionHeading title={t('account.section_terms')} colors={colors} />
                <DropdownSection
                    icon="documents-outline"
                    iconBg={isDarkMode ? '#1A1000' : '#FFF8E1'}
                    iconColor="#F57C00"
                    title={t('account.docs_title')}
                    subtitle={t('account.docs_sub')}
                    expanded={docsExpanded}
                    onToggle={() => setDocsExpanded(v => !v)}
                    colors={colors}
                    isDarkMode={isDarkMode}
                >
                    {loadingDocs ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: Spacing.md }} />
                    ) : (
                        publishedDocs.map(doc => {
                            const style = getDocStyle(doc.type, isDarkMode);
                            let displayTitle = doc.title;
                            if (doc.type === 'TERMS_AND_CONDITIONS') displayTitle = t('account.terms_conditions');
                            else if (doc.type === 'PRIVACY_POLICY') displayTitle = t('account.privacy_policy');
                            else if (doc.type === 'REFUND_POLICY') displayTitle = t('account.refund_policy');
                            else if (doc.type === 'DISCLAIMER') displayTitle = t('legal.disclaimer');
                            else if (doc.type === 'SERVICE_POLICY') displayTitle = t('legal.service_policy');
                            else if (doc.type === 'STATUTORY_DISCLOSURES') displayTitle = t('legal.statutory_disclosures');
                            else if (doc.type === 'COOKIE_POLICY') displayTitle = t('legal.cookie_policy');

                            return (
                                <MenuRow
                                    key={doc.id}
                                    icon={style.icon}
                                    iconBg={style.bg}
                                    iconColor={style.color}
                                    title={displayTitle}
                                    onPress={() => router.push({
                                        pathname: '/profile/legal-detail',
                                        params: { type: doc.type, title: displayTitle }
                                    } as any)}
                                    colors={colors}
                                />
                            );
                        })
                    )}
                    <MenuRow icon="checkmark-done-circle-outline" iconBg={isDarkMode ? '#1E1340' : '#F3E5F5'} iconColor="#6A1B9A"
                        title={t('account.consent_forms')} onPress={() => router.push('/profile/consent-forms' as any)} colors={colors} />
                    <MenuRow icon="clipboard-outline" iconBg={isDarkMode ? '#001A18' : '#E0F2F1'} iconColor="#00796B"
                        title={t('account.service_agreements')} onPress={() => router.push('/profile/service-agreements' as any)} colors={colors} />
                    <MenuRow icon="eye-outline" iconBg={isDarkMode ? '#001A18' : '#EFF7F6'} iconColor="#004D40"
                        title={t('account.view_documents')} onPress={() => router.push('/profile/view-documents' as any)} colors={colors} />
                    <MenuRow icon="download-outline" iconBg={isDarkMode ? '#0A1A00' : '#F1F8E9'} iconColor="#558B2F"
                        title={t('account.download_documents')} onPress={() => router.push('/profile/download-documents' as any)} colors={colors} />
                </DropdownSection>

                {/* ═══════════════════════════════════════
                    SECTION 8 — Social Media (dropdown)
                   ═══════════════════════════════════════ */}
                <SectionHeading title={t('account.section_social')} colors={colors} />
                <DropdownSection
                    icon="share-social-outline"
                    iconBg={isDarkMode ? '#0C1A2E' : '#E8F4FF'}
                    iconColor="#0284C7"
                    title={t('account.social_title')}
                    subtitle={t('account.social_sub')}
                    expanded={socialExpanded}
                    onToggle={() => setSocialExpanded(v => !v)}
                    colors={colors}
                    isDarkMode={isDarkMode}
                >
                    {SOCIAL_LINKS.map((s) => (
                        <TouchableOpacity
                            key={s.key}
                            style={[styles.socialMenuRow, { backgroundColor: isDarkMode ? '#1F2937' : '#FAF7ED' }]}
                            onPress={() => Linking.openURL(s.url)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.socialIconWrap, { backgroundColor: `${s.color}18` }]}>
                                <Ionicons name={s.icon as any} size={20} color={s.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.socialLabel, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>{t(`account.social_label_${s.key}`)}</Text>
                                <Text style={[styles.socialHandle, { color: isDarkMode ? '#6B7280' : '#9CA3AF' }]}>
                                    {s.key === 'whatsapp' ? t('account.social_handle_whatsapp') : s.handle}
                                </Text>
                            </View>
                            <Ionicons name="open-outline" size={15} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
                        </TouchableOpacity>
                    ))}
                </DropdownSection>

                <View style={{ height: 100 }} />
            </KeyboardAwareScrollView>

            {/* ─── Language Modal ─── */}
            <Modal visible={langModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>{t('account.select_language')}</Text>
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
                            <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ─── Avatar Picker Action Sheet ─── */}
            <Modal visible={avatarPickerVisible} transparent animationType="fade" onRequestClose={() => setAvatarPickerVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAvatarPickerVisible(false)}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>{t('account.update_photo')}</Text>
                        <Text style={[styles.langNative, { textAlign: 'center', marginBottom: Spacing.md }]}>{t('account.choose_option')}</Text>
                        <TouchableOpacity style={styles.langOption} onPress={pickFromCamera}>
                            <Text style={styles.langText}>{t('account.camera')}</Text>
                            <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.langOption} onPress={pickFromGallery}>
                            <Text style={styles.langText}>{t('account.gallery')}</Text>
                            <Ionicons name="images-outline" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setAvatarPickerVisible(false)}>
                            <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                iconName={alertConfig.iconName as any}
                buttonText={t('common.ok')}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />

            <CustomAlertModal
                visible={!!confirmDialog?.visible}
                title={confirmDialog?.title || ''}
                message={confirmDialog?.message || ''}
                iconName={(confirmDialog?.iconName as any) || 'warning-outline'}
                buttonText={confirmDialog?.cancelText || t('common.cancel')}
                onClose={closeConfirmDialog}
                secondaryButtonText={confirmDialog?.confirmText}
                onSecondaryPress={confirmDialog?.onConfirm}
                secondaryDestructive={confirmDialog?.destructive}
            />
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

function DropdownSection({
    icon, iconBg, iconColor, title, subtitle, expanded, onToggle, colors, isDarkMode, children,
}: {
    icon: string; iconBg: string; iconColor: string;
    title: string; subtitle?: string;
    expanded: boolean; onToggle: () => void;
    colors: ThemeColors; isDarkMode: boolean;
    children: React.ReactNode;
}) {
    const s = makeStyles(colors);
    return (
        <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
                style={[s.docDropdownHeader, { borderColor: colors.borderLight }]}
                onPress={onToggle}
                activeOpacity={0.75}
            >
                <View style={s.docDropdownLeft}>
                    <View style={[s.docDropdownIcon, { backgroundColor: iconBg }]}>
                        <Ionicons name={icon as any} size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.docDropdownTitle}>{title}</Text>
                        {subtitle ? <Text style={s.docDropdownSub}>{subtitle}</Text> : null}
                    </View>
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textLight}
                />
            </TouchableOpacity>
            {expanded && (
                <View style={[s.docDropdownContent, { borderColor: colors.borderLight, backgroundColor: colors.bgCard }]}>
                    {children}
                </View>
            )}
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
        actionBtnPrimaryText: { fontFamily: Fonts.medium, fontSize: 13, color: '#FAF7ED' },
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

        emergencyBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 2,
            borderRadius: Radius.md,
            padding: Spacing.md,
            marginHorizontal: Spacing.md,
            marginBottom: Spacing.md,
            gap: Spacing.md,
        },
        emergencyIcon: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emergencyTitle: {
            fontFamily: Fonts.semiBold,
            fontSize: FontSize.body,
        },
        emergencySub: {
            fontFamily: Fonts.regular,
            fontSize: FontSize.caption,
            marginTop: 2,
        },
        emergencyPulse: {
            width: 24,
            height: 24,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emergencyDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
        },

        socialMenuRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.borderLight,
        },
        socialIconWrap: {
            width: 40,
            height: 40,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
        },
        socialLabel: {
            fontFamily: Fonts.medium,
            fontSize: FontSize.body,
        },
        socialHandle: {
            fontFamily: Fonts.regular,
            fontSize: FontSize.caption,
            marginTop: 1,
        },
    });
}

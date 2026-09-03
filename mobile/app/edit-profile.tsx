import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, Modal, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Fonts, FontSize } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { userService } from '@/services/api/userService';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';

const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER'];

const formatLocalDateToYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDOBDisplay = (dobStr?: string) => {
    if (!dobStr) return '';
    const clean = dobStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dobStr;
};

export default function EditProfileScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { profile, setProfile, setPreferredLanguage: setGlobalLanguage } = useUser();
    const { languages } = useAppConfig();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const [saving, setSaving] = useState(false);
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [alertConfig, setAlertConfig] = React.useState<{ visible: boolean; title: string; message: string; iconName: string }>({
        visible: false, title: '', message: '', iconName: 'warning-outline',
    });
    const triggerAlert = (title: string, message: string, iconName = 'warning-outline') => {
        setAlertConfig({ visible: true, title, message, iconName });
    };

    const [name, setName] = useState(profile?.name || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [gender, setGender] = useState(profile?.gender || '');
    const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth?.split('T')[0] || '');
    const [dobDate, setDobDate] = useState<Date>(() => {
        if (profile?.dateOfBirth) {
            const clean = profile.dateOfBirth.split('T')[0];
            const parts = clean.split('-').map(Number);
            if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                return new Date(parts[0], parts[1] - 1, parts[2]);
            }
        }
        return new Date(2000, 0, 1);
    });
    const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferredLanguage || 'en');

    const handleDobChange = (_: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDobDate(selectedDate);
            setDateOfBirth(formatLocalDateToYYYYMMDD(selectedDate));
        }
    };

    const currentLang = languages.find(l => l.code === preferredLanguage) || languages.find(l => l.code === 'en');

    const handleSave = async () => {
        if (!name.trim()) {
            triggerAlert(t('account.required'), t('edit_profile.name_empty'));
            return;
        }
        setSaving(true);
        try {
            const res = await userService.updateProfile({
                name: name.trim(),
                gender: gender || undefined,
                dateOfBirth: dateOfBirth || undefined,
                preferredLanguage,
            } as any);

            if (res.success) {
                setGlobalLanguage(preferredLanguage);
                // Refetch full profile to update context
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setProfile(profileRes.data);
                }
                triggerAlert(t('common.success'), t('edit_profile.success_msg'), 'checkmark-circle-outline');
                setTimeout(() => router.back(), 500);
            } else {
                triggerAlert(t('common.error'), res.message || t('edit_profile.failed_update'));
            }
        } catch (err: any) {
            triggerAlert(t('common.error'), err.message || t('common.generic_error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('account.edit_profile')}</Text>
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">

                <Text style={styles.label}>{t('edit_profile.full_name')} *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('edit_profile.placeholder_name')} placeholderTextColor={colors.textMuted} />

                <Text style={styles.label}>{t('edit_profile.email')}</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />

                <Text style={styles.label}>{t('edit_profile.phone_read_only')}</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} value={profile?.phone || ''} editable={false} />

                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, marginBottom: 12, fontStyle: 'italic' }}>
                    * Registered mobile number & email address can only be updated by Super Admin.
                </Text>

                <Text style={styles.label}>{t('edit_profile.gender')}</Text>
                <View style={styles.genderRow}>
                    {GENDER_OPTIONS.map(g => (
                        <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderBtnActive]} onPress={() => setGender(g)}>
                            <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{t('edit_profile.gender_' + g.toLowerCase())}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>{t('edit_profile.dob')}</Text>
                <TouchableOpacity
                    style={styles.langSelector}
                    activeOpacity={0.7}
                    onPress={() => {
                        Keyboard.dismiss();
                        setShowDatePicker(true);
                    }}
                >
                    <View style={styles.langSelectorLeft}>
                        <View style={styles.langIconWrap}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.langSelectorText, !dateOfBirth && { color: colors.textMuted }]}>
                            {dateOfBirth ? formatDOBDisplay(dateOfBirth) : t('edit_profile.placeholder_dob')}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={colors.textLight} />
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={dobDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        maximumDate={new Date()}
                        minimumDate={new Date(1920, 0, 1)}
                        onChange={handleDobChange}
                    />
                )}

                <Text style={styles.label}>{t('edit_profile.preferred_language')}</Text>
                <TouchableOpacity
                    style={styles.langSelector}
                    activeOpacity={0.7}
                    onPress={() => setLangModalVisible(true)}
                >
                    <View style={styles.langSelectorLeft}>
                        <View style={styles.langIconWrap}>
                            <Ionicons name="language-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.langSelectorText}>
                                {currentLang?.label || preferredLanguage}
                            </Text>
                            {currentLang?.native_label && currentLang.native_label !== currentLang.label && (
                                <Text style={styles.langSelectorSubText}>
                                    {currentLang.native_label}
                                </Text>
                            )}
                        </View>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={colors.textLight} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.7}>
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{t('edit_profile.save_changes')}</Text>}
                </TouchableOpacity>
            </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

            {/* ─── Language Modal ─── */}
            <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLangModalVisible(false)}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>{t('account.select_language')}</Text>
                        {languages.map(lang => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[styles.langOption, preferredLanguage === lang.code && styles.langOptionActive]}
                                onPress={() => {
                                    setPreferredLanguage(lang.code);
                                    setLangModalVisible(false);
                                }}
                            >
                                <View style={styles.langOptionLeft}>
                                    <View style={[styles.langOptionIconWrap, preferredLanguage === lang.code && styles.langOptionIconWrapActive]}>
                                        <Ionicons name="language-outline" size={18} color={preferredLanguage === lang.code ? colors.primary : colors.textMuted} />
                                    </View>
                                    <View>
                                        <Text style={[styles.langText, preferredLanguage === lang.code && styles.langTextActive]}>
                                            {lang.label}
                                        </Text>
                                        <Text style={styles.langNative}>{lang.native_label}</Text>
                                    </View>
                                </View>
                                {preferredLanguage === lang.code && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setLangModalVisible(false)}>
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
                buttonText="OK"
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.primary },
    headerSafe: { backgroundColor: colors.primary },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: '#FAF7ED', flex: 1 },
    scrollView: { flex: 1, backgroundColor: colors.bgScreen, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    scrollContent: { padding: 20, paddingBottom: 60 },
    label: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textDark, marginBottom: 6, marginTop: 16 },
    input: {
        backgroundColor: colors.bgCard, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
        fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textDark,
        borderWidth: 1, borderColor: colors.borderLight,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    inputDisabled: { color: colors.textMuted },
    genderRow: { flexDirection: 'row', gap: 10 },
    genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bgCard, alignItems: 'center' },
    genderBtnActive: { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.08)' },
    genderText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textMuted },
    genderTextActive: { color: colors.primary },
    langSelector: {
        backgroundColor: colors.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1, borderColor: colors.borderLight,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    langSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    langIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.12)' : 'rgba(4, 131, 87, 0.08)',
        justifyContent: 'center', alignItems: 'center',
    },
    langSelectorText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textDark },
    langSelectorSubText: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted, marginTop: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContainer: {
        backgroundColor: colors.bgCard, borderRadius: 16, padding: 20, maxHeight: '80%',
        shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
    },
    modalTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: colors.textDark, marginBottom: 16, textAlign: 'center' },
    langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    langOptionActive: { backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.08)', borderRadius: 10, borderBottomWidth: 0 },
    langOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    langOptionIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.bgCardMuted, justifyContent: 'center', alignItems: 'center' },
    langOptionIconWrapActive: { backgroundColor: isDarkMode ? 'rgba(52,199,89,0.2)' : 'rgba(4, 131, 87, 0.15)' },
    langText: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textDark },
    langTextActive: { fontFamily: Fonts.semiBold, color: colors.primary },
    langNative: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted, marginTop: 1 },
    modalCancel: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
    modalCancelText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textMuted },
    saveBtn: { marginTop: 30, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: '#FAF7ED' },
});


import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts, FontSize } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { userService } from '@/services/api/userService';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER'];

export default function EditProfileScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState(profile?.name || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [gender, setGender] = useState(profile?.gender || '');
    const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth?.split('T')[0] || '');
    const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferredLanguage || 'en');

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert(t('account.required'), t('edit_profile.name_empty'));
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
                // Refetch full profile to update context
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setProfile(profileRes.data);
                }
                Alert.alert(t('common.success'), t('edit_profile.success_msg'), [
                    { text: t('common.ok'), onPress: () => router.back() },
                ]);
            } else {
                Alert.alert(t('common.error'), res.message || t('edit_profile.failed_update'));
            }
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || t('common.something_wrong'));
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
                <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder={t('edit_profile.placeholder_dob')} placeholderTextColor={colors.textMuted} />

                <Text style={styles.label}>{t('edit_profile.preferred_language')}</Text>
                <TextInput style={styles.input} value={preferredLanguage} onChangeText={setPreferredLanguage} placeholder={t('edit_profile.placeholder_lang')} placeholderTextColor={colors.textMuted} />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.7}>
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{t('edit_profile.save_changes')}</Text>}
                </TouchableOpacity>
            </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.primary },
    headerSafe: { backgroundColor: colors.primary },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: '#FFFFFF', flex: 1 },
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
    inputDisabled: { backgroundColor: colors.bgCardMuted, color: colors.textMuted },
    genderRow: { flexDirection: 'row', gap: 10 },
    genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bgCard, alignItems: 'center' },
    genderBtnActive: { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.08)' },
    genderText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textMuted },
    genderTextActive: { color: colors.primary },
    saveBtn: { marginTop: 30, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: '#FFFFFF' },
});

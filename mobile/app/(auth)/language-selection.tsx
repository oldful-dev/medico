// Language Selection Screen — Server-Driven UI
// Language list comes from AppConfigContext.
// Admin can add new language options without an app release.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { userService } from '@/services/api/userService';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';

export default function LanguageSelectionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { preferredLanguage, setPreferredLanguage } = useUser();
    const { languages } = useAppConfig();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(isDarkMode);

    const { t } = useTranslation();
    const [selected, setSelected] = useState(preferredLanguage || 'en');
    const [saving, setSaving] = useState(false);

    const handleContinue = async () => {
        if (selected === preferredLanguage) { router.back(); return; }
        setSaving(true);
        try {
            await userService.updateProfile({ preferredLanguage: selected });
            setPreferredLanguage(selected);
        } catch {
            setPreferredLanguage(selected); // save locally even if API fails
        } finally {
            setSaving(false);
            router.back();
        }
    };

    return (
        <View style={[styles.screen, { backgroundColor: '#048357' }]}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('language_selection.header')}</Text>
            </View>

            <View style={[styles.contentCard, { backgroundColor: isDarkMode ? '#252525' : '#FDFDE8' }]}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.illustrationCard}>
                        <Ionicons name="language" size={40} color="#048357" style={styles.illustrationIcon} />
                        <Text style={[styles.illustrationTitle, { color: isDarkMode ? '#E0E0E0' : '#2F2F2F' }]}>{t('language_selection.title')}</Text>
                        <Text style={[styles.illustrationSubtitle, { color: isDarkMode ? '#A0A0A0' : '#777777' }]}>{t('language_selection.subtitle')}</Text>
                    </View>

                    {/* Language list — SDUI driven */}
                    <View style={styles.languageList}>
                        {languages.map(lang => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[styles.languageCard, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FFFFFF' }, selected === lang.code && styles.languageCardSelected]}
                                onPress={() => setSelected(lang.code)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.languageTextGroup}>
                                    <Text style={[styles.languageLabel, { color: isDarkMode ? '#E0E0E0' : '#2F2F2F' }, selected === lang.code && styles.languageLabelSelected]}>
                                        {lang.label}
                                    </Text>
                                    <Text style={[styles.languageNative, { color: isDarkMode ? '#A0A0A0' : '#AAAEAC' }, selected === lang.code && styles.languageNativeSelected]}>
                                        {lang.native_label}
                                    </Text>
                                </View>
                                <Ionicons
                                    name={selected === lang.code ? 'radio-button-on' : 'radio-button-off'}
                                    size={22}
                                    color={selected === lang.code ? '#048357' : '#AAAEAC'}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                <View style={[styles.bottomBar, { backgroundColor: isDarkMode ? '#252525' : '#FDFDE8' }]}>
                    <TouchableOpacity
                        style={[styles.continueButton, saving && { opacity: 0.6 }]}
                        activeOpacity={0.8}
                        onPress={handleContinue}
                        disabled={saving}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.continueButtonText}>{t('language_selection.save')}</Text>
                        }
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#048357' },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#048357', paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10 },
    backButton: { padding: 5 },
    headerTitle: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 20, color: '#FFFFFF', textAlign: "left", marginLeft: 12 },
    contentCard: { flex: 1, borderTopLeftRadius: 45, borderTopRightRadius: 45, overflow: 'hidden' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 120 },
    illustrationCard: { alignItems: 'center', marginBottom: 28, paddingHorizontal: 10 },
    illustrationIcon: { marginBottom: 12 },
    illustrationTitle: { fontFamily: Fonts.semiBold, fontSize: 18, textAlign: 'center', marginBottom: 6 },
    illustrationSubtitle: { fontFamily: Fonts.regular, fontSize: 12, textAlign: 'center', lineHeight: 18 },
    languageList: { gap: 10 },
    languageCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 12, paddingHorizontal: 18, paddingVertical: 16,
        borderWidth: 1.5, borderColor: 'transparent',
        shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    languageCardSelected: { borderColor: '#048357', backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.04)' },
    languageTextGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    languageLabel: { fontFamily: Fonts.medium, fontSize: 15 },
    languageLabelSelected: { color: '#02743F' },
    languageNative: { fontFamily: Fonts.regular, fontSize: 13 },
    languageNativeSelected: { color: 'rgba(2, 116, 63, 0.6)' },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36, alignItems: 'center',
    },
    continueButton: { width: '85%', maxWidth: 320, height: 48, backgroundColor: '#02743F', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    continueButtonText: { fontFamily: Fonts.medium, fontSize: 15, color: '#FFFFFF' },
});

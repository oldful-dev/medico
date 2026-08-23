import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAppConfig } from '@/context/AppConfigContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getText } from '@/i18n/utils/getText';
import { faqService, FAQItem } from '@/services/api/faqService';

export default function FAQScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { helpSupportConfig } = useAppConfig();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const { t } = useTranslation();

    // Fallback keeps the screen usable instantly / offline; admin-managed FAQs replace it once fetched.
    const fallbackFaqs: FAQItem[] = [...helpSupportConfig.faqs]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(f => ({ id: f.id, question: getText(f.q), answer: getText(f.a), category: 'GENERAL', order: f.sort_order, isActive: true }));

    const [faqs, setFaqs] = React.useState<FAQItem[]>(fallbackFaqs);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    React.useEffect(() => {
        faqService.getPublished().then(res => {
            if (res.success && res.data && res.data.length > 0) {
                setFaqs(res.data);
            }
        }).catch(() => {
            // Keep fallback FAQs on network failure
        });
    }, []);

    const filteredFAQs = faqs.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ backgroundColor: colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('help_support.faqs')}</Text>
            </View>

            <View style={styles.contentCard}>
                {/* Search Bar */}
                <View style={styles.searchWrapper}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('help_support.search_faqs')}
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>
                        {searchQuery.length > 0 ? t('help_support.search_results') : t('help_support.faqs')}
                    </Text>

                    {filteredFAQs.map(item => {
                        const isOpen = expandedId === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.faqCard}
                                activeOpacity={0.7}
                                onPress={() => setExpandedId(isOpen ? null : item.id)}
                            >
                                <View style={styles.faqQuestionRow}>
                                    <Text style={styles.faqQuestion}>{item.question}</Text>
                                    <Ionicons
                                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                                        size={18}
                                        color={colors.textMuted}
                                    />
                                </View>
                                {isOpen && (
                                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {filteredFAQs.length === 0 && (
                        <Text style={styles.noResults}>{t('help_support.no_results')}</Text>
                    )}

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.primary },
    header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, paddingTop: Spacing.sm,
    },
    backButton:  { padding: Spacing.xs },
    headerTitle: {
        flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSize.heading2,
        color: colors.textWhite, textAlign: "left", marginLeft: 12, letterSpacing: -0.24,
    },
    contentCard: {
        flex: 1, backgroundColor: colors.bgScreen,
        borderTopLeftRadius: Radius.xl * 2, borderTopRightRadius: Radius.xl * 2, overflow: 'hidden',
    },
    searchWrapper:   { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: colors.primary, paddingBottom: Spacing.lg },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? colors.bgCardMuted : '#FAF7ED', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 44 },
    searchInput:     { flex: 1, marginLeft: Spacing.xs, fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textDark },
    scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
    sectionTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: colors.textDark,
        marginBottom: Spacing.md, marginTop: Spacing.sm,
    },
    faqCard: {
        backgroundColor: colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    faqQuestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    faqQuestion:{ flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark },
    faqAnswer:  { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textBody, lineHeight: 20, marginTop: Spacing.sm },
    noResults:  { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
    bottomSpacer: { height: 60 },
});

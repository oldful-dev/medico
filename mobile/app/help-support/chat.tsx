import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
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

export default function LiveChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { helpSupportConfig } = useAppConfig();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const { t } = useTranslation();

    const handleWhatsApp = () => Linking.openURL(helpSupportConfig.whatsapp_url);

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('account.live_chat')}</Text>
            </View>

            <View style={styles.contentCard}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.illustrationContainer}>
                        <View style={styles.chatIconBackground}>
                            <Ionicons name="chatbubble-ellipses" size={64} color="#25D366" />
                        </View>
                        <Text style={styles.title}>{t('account.live_chat')}</Text>
                        <Text style={styles.subtitle}>
                            {t('account.live_chat_subtitle', 'Connect with our support executives instantly on WhatsApp')}
                        </Text>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            Our support buddies are available to help you with service bookings, payment issues, doctor slots, and more.
                        </Text>
                        <View style={styles.statusRow}>
                            <View style={styles.greenDot} />
                            <Text style={styles.statusText}>Support Active Online</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.whatsappBtn} activeOpacity={0.8} onPress={handleWhatsApp}>
                        <Ionicons name="logo-whatsapp" size={24} color="#FFF" style={{ marginRight: 10 }} />
                        <Text style={styles.whatsappBtnText}>{t('help_support.whatsapp_us')}</Text>
                    </TouchableOpacity>

                    {/* Support Promise */}
                    <Text style={styles.sectionTitle}>{t('help_support.support_promise_title')}</Text>
                    <View style={styles.promiseCard}>
                        {helpSupportConfig.support_promise.map(item => (
                            <View key={item.id} style={styles.listItem}>
                                <Ionicons name={item.ionicon as any} size={18} color={colors.primary} />
                                <Text style={styles.listText}>{getText(item.text)}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </View>
        </View>
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
    scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
    illustrationContainer: {
        alignItems: 'center',
        marginVertical: Spacing.xl,
    },
    chatIconBackground: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.1)' : 'rgba(37, 211, 102, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: colors.textDark,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textMuted,
        textAlign: 'center',
        paddingHorizontal: Spacing.md,
    },
    infoBox: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    infoText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: colors.textBody,
        lineHeight: 20,
        marginBottom: Spacing.md,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greenDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#25D366',
        marginRight: Spacing.xs,
    },
    statusText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: colors.textMuted,
    },
    whatsappBtn: {
        backgroundColor: '#25D366',
        borderRadius: Radius.md,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    whatsappBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#FFF',
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: colors.textDark,
        marginBottom: Spacing.md,
    },
    promiseCard: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
    listText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textBody, lineHeight: 20 },
    bottomSpacer: { height: 60 },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { legalService, LegalDocument } from '@/services/api/legalService';
import { userService } from '@/services/api/userService';
import { apiClient } from '@/services/api/apiClient';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import RenderHtml from 'react-native-render-html';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function LegalDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const { t } = useTranslation();
    const { type, title } = useLocalSearchParams<{ type: string; title: string }>();

    const [document, setDocument] = useState<LegalDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloadingData, setDownloadingData] = useState(false);

    useEffect(() => {
        if (type) {
            fetchDocument();
        }
    }, [type]);

    const handleDownloadMyData = async () => {
        if (downloadingData) return;
        setDownloadingData(true);
        try {
            const fileUri = FileSystem.cacheDirectory + `ayuxa-my-data-${Date.now()}.pdf`;
            const result = await FileSystem.downloadAsync(
                `${apiClient.getBaseUrl()}/users/profile/export-data-pdf`,
                fileUri,
                { headers: { Authorization: `Bearer ${apiClient.getAuthToken()}` } }
            );

            if (result.status !== 200) {
                Alert.alert(t('common.error'), t('legal.failed_load'));
                return;
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'My Ayuxa Data' });
            } else {
                Alert.alert(t('legal.download_title') || 'Download Ready', `Saved to: ${fileUri}`);
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('legal.failed_load'));
        } finally {
            setDownloadingData(false);
        }
    };

    const fetchDocument = async () => {
        setLoading(true);
        try {
            const res = await legalService.getPublishedDocument(type);
            if (res.success && res.data) {
                setDocument(res.data);
            } else {
                Alert.alert(t('common.error'), res.message || t('legal.failed_load'));
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('legal.failed_load'));
        } finally {
            setLoading(false);
        }
    };

    const styles = makeStyles(isDarkMode, colors);
    const displayTitle = document?.title || title || t('account.docs_title');

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{displayTitle}</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>{t('legal.loading')}</Text>
                </View>
            ) : !document ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.errorText}>{t('legal.failed_load')}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchDocument}>
                        <Text style={styles.retryButtonText}>{t('legal.try_again')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.contentCard}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {document.publishedAt && (
                            <Text style={styles.lastUpdated}>
                                {t('legal.last_updated', { date: new Date(document.publishedAt).toLocaleDateString('en-IN') })}
                            </Text>
                        )}

                        <RenderHtml
                            contentWidth={Dimensions.get('window').width - Spacing.lg * 2}
                            source={{ html: document.content }}
                            baseStyle={styles.contentText}
                            tagsStyles={{
                                h2: { ...styles.h2, marginTop: Spacing.lg, marginBottom: Spacing.md },
                                h3: { ...styles.h3, marginTop: Spacing.md, marginBottom: Spacing.sm },
                                p: { ...styles.paragraph, marginBottom: Spacing.md },
                                li: { ...styles.listItem, marginBottom: Spacing.sm },
                                ul: { marginBottom: Spacing.md, paddingLeft: Spacing.lg },
                                strong: styles.strong,
                                div: { marginBottom: Spacing.md },
                            }}
                            classesStyles={{
                                'styled-box': styles.styledBox,
                            }}
                        />

                        {type === 'RIGHTS_TO_ACCESS_DATA' && (
                            <TouchableOpacity
                                style={[styles.downloadButton, downloadingData && { opacity: 0.6 }]}
                                onPress={handleDownloadMyData}
                                activeOpacity={0.8}
                                disabled={downloadingData}
                            >
                                {downloadingData ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                                ) : (
                                    <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                )}
                                <Text style={styles.downloadButtonText}>
                                    {downloadingData ? (t('legal.generating_pdf') || 'Preparing...') : 'Download My Data'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    backButton: {
        padding: Spacing.sm,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
    },
    contentCard: {
        flex: 1,
        backgroundColor: isDarkMode ? '#252525' : '#FAF7ED',
        borderTopLeftRadius: Radius.lg,
        borderTopRightRadius: Radius.lg,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    lastUpdated: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: isDarkMode ? '#999999' : Colors.textMuted,
        marginBottom: Spacing.lg,
    },
    contentText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: isDarkMode ? '#E0E0E0' : Colors.textBody,
        lineHeight: 22,
    },
    h2: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: isDarkMode ? '#FFFFFF' : Colors.textDark,
        fontWeight: '600',
    },
    h3: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: isDarkMode ? '#E0E0E0' : Colors.textBody,
        fontWeight: '600',
    },
    paragraph: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: isDarkMode ? '#E0E0E0' : Colors.textBody,
        lineHeight: 22,
    },
    listItem: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: isDarkMode ? '#E0E0E0' : Colors.textBody,
        lineHeight: 22,
    },
    strong: {
        fontWeight: '600',
        color: isDarkMode ? '#FFFFFF' : Colors.textDark,
    },
    styledBox: {
        backgroundColor: isDarkMode ? '#2D2D2D' : '#FFF0F5',
        borderWidth: 1,
        borderColor: isDarkMode ? '#404040' : '#FFD1DC',
        padding: Spacing.lg,
        borderRadius: Radius.md,
        marginVertical: Spacing.lg,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    loadingText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: isDarkMode ? '#999999' : Colors.textMuted,
    },
    errorText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: isDarkMode ? '#FFFFFF' : Colors.textDark,
        marginTop: Spacing.md,
    },
    retryButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: Radius.md,
        marginTop: Spacing.lg,
    },
    retryButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#FAF7ED',
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        borderRadius: Radius.md,
        marginTop: Spacing.lg,
    },
    downloadButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: '#FAF7ED',
    },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { legalService, LegalDocument } from '@/services/api/legalService';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import RenderHtml from 'react-native-render-html';

export default function PrivacyPolicyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const [document, setDocument] = useState<LegalDocument | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPrivacyPolicy();
    }, []);

    const fetchPrivacyPolicy = async () => {
        setLoading(true);
        try {
            const res = await legalService.getPrivacyPolicy();
            if (res.success && res.data) {
                setDocument(res.data);
            } else {
                Alert.alert('Error', res.message || 'Failed to load document');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load document');
        } finally {
            setLoading(false);
        }
    };

    const styles = makeStyles(isDarkMode, colors);

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : !document ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.errorText}>Failed to load document</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchPrivacyPolicy}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.contentCard}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {document.publishedAt && (
                            <Text style={styles.lastUpdated}>
                                Last Updated: {new Date(document.publishedAt).toLocaleDateString('en-IN')}
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
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
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
        backgroundColor: isDarkMode ? '#252525' : '#FFFFFF',
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
    title: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: isDarkMode ? '#FFFFFF' : Colors.textDark,
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
        color: '#FFFFFF',
    },
});

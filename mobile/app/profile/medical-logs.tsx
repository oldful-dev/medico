// Medical Logs — Document vault
// Prescriptions, blood work reports, scans, discharge summaries, etc.
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking, TextInput, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { userService } from '@/services/api/userService';
import { useUser } from '@/context/UserContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────
interface HealthReport {
    id: string;
    title: string;
    fileUrl: string;
    mimeType?: string;
    category?: string;
    createdAt: string;
}

// ─── Category config ──────────────────────────────────────
const CATEGORIES = [
    { key: 'All', label: 'All', icon: 'grid-outline', color: '#6B7280' },
    { key: 'Prescription', label: 'Prescriptions', icon: 'document-text-outline', color: '#2563EB' },
    { key: 'Blood Work', label: 'Blood Work', icon: 'pulse-outline', color: '#DC2626' },
    { key: 'Scan', label: 'Scans', icon: 'scan-outline', color: '#7C3AED' },
    { key: 'Discharge', label: 'Discharge', icon: 'exit-outline', color: '#D97706' },
    { key: 'Vaccination', label: 'Vaccination', icon: 'shield-checkmark-outline', color: '#059669' },
    { key: 'Insurance', label: 'Insurance', icon: 'card-outline', color: '#0EA5E9' },
    { key: 'Other', label: 'Other', icon: 'folder-outline', color: '#6B7280' },
];

function getCategoryConfig(key: string) {
    return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
}

// ─── Report Card ──────────────────────────────────────────
function ReportCard({ item, onOpen, onDownload, onDelete }: {
    item: HealthReport;
    onOpen: (url: string) => void;
    onDownload: (url: string) => void;
    onDelete: (id: string) => void;
}) {
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const { t } = useTranslation();
    const styles = makeStyles(colors, isDarkMode);
    const cat = getCategoryConfig(item.category || 'Other');

    const getTranslatedCategory = (key: string) => {
        const tKey = `medical_logs.categories.${key.toLowerCase().replace(/\s+/g, '_')}`;
        return t(tKey, { defaultValue: key });
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: `${cat.color}15` }]}>
                    <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.cardMeta}>
                        <View style={[styles.catBadge, { backgroundColor: `${cat.color}15` }]}>
                            <Text style={[styles.catBadgeText, { color: cat.color }]}>{getTranslatedCategory(item.category || 'Other')}</Text>
                        </View>
                        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onOpen(item.fileUrl)} activeOpacity={0.7}>
                    <Ionicons name="eye-outline" size={15} color={colors.primary} />
                    <Text style={styles.actionBtnText}>{t('common.view')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onDownload(item.fileUrl)} activeOpacity={0.7}>
                    <Ionicons name="download-outline" size={15} color="#7C3AED" />
                    <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>{t('common.download')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: isDarkMode ? '#7F1D1D' : '#FEE2E2' }]} onPress={() => onDelete(item.id)} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                    <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>{t('common.delete')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────
export default function MedicalLogsScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const { t } = useTranslation();
    const styles = makeStyles(colors, isDarkMode);

    const [reports, setReports] = useState<HealthReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadCategory, setUploadCategory] = useState('Other');

    const getTranslatedCategory = (key: string) => {
        const tKey = `medical_logs.categories.${key.toLowerCase().replace(/\s+/g, '_')}`;
        return t(tKey, { defaultValue: key });
    };

    const fetchReports = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await userService.getMyHealthReports();
            if (res.success && res.data) setReports(res.data);
        } catch {
            // keep existing
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchReports(); }, [fetchReports]));

    const filteredReports = reports.filter(r => {
        let matchesCategory = false;
        if (activeCategory === 'All') {
            matchesCategory = true;
        } else if (activeCategory === 'Other') {
            // Show documents without category or explicitly marked as Other
            matchesCategory = !r.category || r.category === 'Other';
        } else {
            matchesCategory = r.category === activeCategory;
        }
        const matchesSearch = !searchText || r.title.toLowerCase().includes(searchText.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleOpenFile = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_open')));
    };

    const handleDownload = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_download')));
    };

    const handleDelete = (id: string) => {
        Alert.alert(t('medical_logs.alerts.delete_confirm_title'), t('medical_logs.alerts.delete_confirm_msg'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('medical_logs.alerts.delete_btn'), style: 'destructive', onPress: async () => {
                    try {
                        await userService.deleteHealthReport(id);
                        setReports(prev => prev.filter(r => r.id !== id));
                    } catch {
                        Alert.alert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_delete'));
                    }
                }
            },
        ]);
    };

    const handleUpload = () => {
        setUploadTitle('');
        setUploadCategory('Other');
        setUploadModalVisible(true);
    };

    const doUpload = async (file: any) => {
        if (!profile?.id) return;
        if (!uploadTitle.trim()) { Alert.alert(t('medical_logs.alerts.title_required_title'), t('medical_logs.alerts.title_required_msg')); return; }
        setUploading(true);
        setUploadModalVisible(false);
        try {
            const res = await userService.uploadHealthReport(profile.id, file, uploadTitle.trim(), uploadCategory);
            if (res.success) {
                Alert.alert(t('medical_logs.alerts.uploaded_title'), t('medical_logs.alerts.uploaded_msg'));
                fetchReports(true);
            } else {
                Alert.alert(t('medical_logs.alerts.error_title'), res.message || t('medical_logs.alerts.failed_upload'));
            }
        } catch {
            Alert.alert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_upload_retry'));
        } finally {
            setUploading(false);
        }
    };

    const pickFromCamera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert(t('medical_logs.alerts.permission_required_title'), t('medical_logs.alerts.camera_access_needed')); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            doUpload({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `report_${Date.now()}.jpg` });
        }
    };

    const pickFromGallery = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert(t('medical_logs.alerts.permission_required_title'), t('medical_logs.alerts.gallery_access_needed')); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            doUpload({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `report_${Date.now()}.jpg` });
        }
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('medical_logs.header_title')}</Text>
                <TouchableOpacity
                    style={styles.uploadHeaderBtn}
                    onPress={handleUpload}
                    disabled={uploading}
                >
                    {uploading
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Ionicons name="add" size={22} color={colors.primary} />
                    }
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('medical_logs.search_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    value={searchText}
                    onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Category tabs */}
            <View style={styles.tabsContainer}>
                <FlatList
                    horizontal
                    data={CATEGORIES}
                    keyExtractor={c => c.key}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContent}
                    style={styles.tabsScroll}
                    renderItem={({ item: cat }) => (
                        <TouchableOpacity
                            style={[styles.tab, activeCategory === cat.key && { backgroundColor: cat.color }]}
                            onPress={() => setActiveCategory(cat.key)}
                        >
                            <Ionicons
                                name={cat.icon as any}
                                size={14}
                                color={activeCategory === cat.key ? '#fff' : cat.color}
                            />
                            <Text style={[styles.tabText, activeCategory === cat.key && { color: '#fff' }]}>
                                {getTranslatedCategory(cat.key)}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Reports list */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>{t('medical_logs.loading_documents')}</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredReports}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <ReportCard item={item} onOpen={handleOpenFile} onDownload={handleDownload} onDelete={handleDelete} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchReports(true)}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="documents-outline" size={64} color={isDarkMode ? '#374151' : '#E5E7EB'} />
                            <Text style={styles.emptyTitle}>{t('medical_logs.no_documents_title')}</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchText ? t('medical_logs.no_documents_search') : t('medical_logs.no_documents_subtitle')}
                            </Text>
                            {!searchText && (
                                <TouchableOpacity style={styles.emptyUploadBtn} onPress={handleUpload}>
                                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                                    <Text style={styles.emptyUploadText}>{t('medical_logs.upload_document_btn')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}

            {/* Upload modal */}
            {uploadModalVisible && (
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <Text style={styles.modalTitle}>{t('medical_logs.modal_title')}</Text>

                        <Text style={styles.fieldLabel}>{t('medical_logs.field_title_label')}</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder={t('medical_logs.title_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={uploadTitle}
                            onChangeText={setUploadTitle}
                        />

                        <Text style={styles.fieldLabel}>{t('medical_logs.field_category_label')}</Text>
                        <FlatList
                            horizontal
                            data={CATEGORIES.slice(1)}
                            keyExtractor={c => c.key}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, marginBottom: 16 }}
                            renderItem={({ item: cat }) => (
                                <TouchableOpacity
                                    style={[styles.catChip, uploadCategory === cat.key && { backgroundColor: cat.color }]}
                                    onPress={() => setUploadCategory(cat.key)}
                                >
                                    <Text style={[styles.catChipText, uploadCategory === cat.key && { color: '#fff' }]}>
                                        {getTranslatedCategory(cat.key)}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />

                        <View style={styles.uploadOptions}>
                            <TouchableOpacity style={styles.uploadOptionBtn} onPress={pickFromCamera}>
                                <Ionicons name="camera-outline" size={22} color={colors.primary} />
                                <Text style={styles.uploadOptionText}>{t('medical_logs.camera_btn')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.uploadOptionBtn} onPress={pickFromGallery}>
                                <Ionicons name="image-outline" size={22} color={colors.primary} />
                                <Text style={styles.uploadOptionText}>{t('medical_logs.gallery_btn')}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUploadModalVisible(false)}>
                            <Text style={styles.modalCancelText}>{t('medical_logs.cancel')}</Text>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </View>
            )}
        </SafeAreaView>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: colors.textDark },
    uploadHeaderBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : '#F0FDF4', justifyContent: 'center', alignItems: 'center' },

    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 16, marginVertical: 10,
        backgroundColor: colors.bgCard, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight,
        paddingHorizontal: 12, paddingVertical: 9,
    },
    searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: colors.textDark, padding: 0 },

    tabsContainer: { backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    tabsScroll: { maxHeight: 44 },
    tabsContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.bgCardMuted },
    tabText: { fontFamily: Fonts.medium, fontSize: 12, color: colors.textMuted },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontFamily: Fonts.regular, fontSize: 14, color: colors.textMuted },
    listContent: { padding: 16, paddingBottom: 40, flexGrow: 1 },

    card: {
        backgroundColor: colors.bgCard, borderRadius: 12,
        marginBottom: 10, padding: 14,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
    cardBody: { flex: 1 },
    cardTitle: { fontFamily: Fonts.medium, fontSize: 14, color: colors.textDark, marginBottom: 6 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    catBadgeText: { fontFamily: Fonts.medium, fontSize: 10 },
    cardDate: { fontFamily: Fonts.regular, fontSize: 11, color: colors.textMuted },
    cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
    actionBtnText: { fontFamily: Fonts.medium, fontSize: 12, color: colors.primary },

    emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: colors.textDark, marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontFamily: Fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    emptyUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    emptyUploadText: { fontFamily: Fonts.medium, fontSize: 14, color: '#fff' },

    // Modal
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
    modalTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: colors.textDark, marginBottom: 16 },
    fieldLabel: { fontFamily: Fonts.medium, fontSize: 13, color: colors.textDark, marginBottom: 6 },
    fieldInput: {
        borderWidth: 1, borderColor: colors.borderLight, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        fontFamily: Fonts.regular, fontSize: 14, color: colors.textDark,
        backgroundColor: colors.bgCardMuted,
        marginBottom: 14,
    },
    catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgCardMuted },
    catChipText: { fontFamily: Fonts.medium, fontSize: 12, color: colors.textMuted },
    uploadOptions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    uploadOptionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12, paddingVertical: 14,
        backgroundColor: colors.bgCard,
    },
    uploadOptionText: { fontFamily: Fonts.medium, fontSize: 14, color: colors.primary },
    modalCancelBtn: { alignItems: 'center', paddingVertical: 12 },
    modalCancelText: { fontFamily: Fonts.medium, fontSize: 14, color: colors.textMuted },
});

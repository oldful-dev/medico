// Medical Logs — Document vault
// Prescriptions, blood work reports, scans, discharge summaries, etc.
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Linking, TextInput, RefreshControl, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { userService } from '@/services/api/userService';
import { useUser } from '@/context/UserContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { usePreventScreenCapture } from 'expo-screen-capture';

// Same key medical-card.tsx uses — the user picks a save folder once and it's
// reused across every "download to device" action in the app.
const DOWNLOAD_DIR_KEY = 'ayuxa_download_dir_uri';

// ─── Types ────────────────────────────────────────────────
interface HealthReport {
    id: string;
    title: string;
    fileUrl: string;
    mimeType?: string;
    category?: string;
    createdAt: string;
    flagSeverity?: string;
    flagNote?: string;
    suggestedAllergen?: string;
}

// Backend stores flagSeverity as 'CRITICAL' | 'HIGH' | 'NORMAL'.
function getSeverityColor(severity?: string) {
    if (severity === 'CRITICAL') return '#DC2626';
    if (severity === 'HIGH') return '#D97706';
    return '#059669';
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
function ReportCard({ item, onOpen, onDownload, onDelete, downloadingId }: {
    item: HealthReport;
    onOpen: (url: string) => void;
    onDownload: (item: HealthReport) => void;
    onDelete: (id: string) => void;
    downloadingId: string | null;
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
                    {(item.flagSeverity === 'HIGH' || item.flagSeverity === 'CRITICAL') && (
                        <View style={[styles.catBadge, { backgroundColor: `${getSeverityColor(item.flagSeverity)}15`, marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }]}>
                            <Ionicons name="alert-circle" size={12} color={getSeverityColor(item.flagSeverity)} />
                            <Text style={[styles.catBadgeText, { color: getSeverityColor(item.flagSeverity), marginLeft: 4 }]}>
                                {item.flagSeverity === 'CRITICAL' ? t('medical_logs.severity.critical', { defaultValue: 'Critical' }) : t('medical_logs.severity.high', { defaultValue: 'Needs review' })}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onOpen(item.fileUrl)} activeOpacity={0.7}>
                    <Ionicons name="eye-outline" size={15} color={colors.primary} />
                    <Text style={styles.actionBtnText}>{t('common.view')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onDownload(item)} activeOpacity={0.7} disabled={downloadingId === item.id}>
                    {downloadingId === item.id
                        ? <ActivityIndicator size="small" color="#7C3AED" />
                        : <Ionicons name="download-outline" size={15} color="#7C3AED" />}
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
    usePreventScreenCapture('medical-logs'); // vault of prescriptions/lab reports/scans — no screenshots/recordings
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

    // Delete confirmation (needs 2 real actions, so it's separate from alertConfig)
    const [deleteConfirm, setDeleteConfirm] = useState<{ visible: boolean; id: string | null }>({ visible: false, id: null });

    // OCR-suggested allergen — never auto-saved. Shown once per report per
    // session; the user must explicitly confirm before it's added to their
    // medical card (a field shown to medical professionals in emergencies).
    const [allergenPrompt, setAllergenPrompt] = useState<{ visible: boolean; reportId: string | null; allergen: string | null }>({ visible: false, reportId: null, allergen: null });
    const [dismissedAllergenReportIds, setDismissedAllergenReportIds] = useState<Set<string>>(new Set());

    // Android "choose a save folder" prompt — same pattern as medical-card.tsx.
    // Folder is picked once (via StorageAccessFramework) and reused for every
    // download in the app; downloadingId disables the button mid-download.
    const [folderPromptResolver, setFolderPromptResolver] = useState<(() => void) | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

    // After each fetch, surface at most one pending allergen suggestion —
    // a report whose OCR flagged an allergen not already on the medical
    // card and that the user hasn't dismissed this session.
    useEffect(() => {
        if (allergenPrompt.visible) return;
        const existingAllergies = (profile?.medicalCards?.[0]?.allergies || []).map(a => a.toLowerCase().trim());
        const pending = reports.find(r =>
            r.suggestedAllergen &&
            !dismissedAllergenReportIds.has(r.id) &&
            !existingAllergies.includes(r.suggestedAllergen.toLowerCase().trim())
        );
        if (pending) {
            setAllergenPrompt({ visible: true, reportId: pending.id, allergen: pending.suggestedAllergen! });
        }
    }, [reports, profile, dismissedAllergenReportIds, allergenPrompt.visible]);

    const dismissAllergenPrompt = () => {
        if (allergenPrompt.reportId) {
            setDismissedAllergenReportIds(prev => new Set(prev).add(allergenPrompt.reportId!));
        }
        setAllergenPrompt({ visible: false, reportId: null, allergen: null });
    };

    const confirmAddAllergen = async () => {
        const { allergen, reportId } = allergenPrompt;
        setAllergenPrompt({ visible: false, reportId: null, allergen: null });
        if (!allergen || !profile?.id) return;
        if (reportId) setDismissedAllergenReportIds(prev => new Set(prev).add(reportId));
        try {
            const card = profile.medicalCards?.[0];
            const res = await userService.upsertMedicalCard(profile.id, {
                bloodGroup: card?.bloodGroup,
                allergies: [...(card?.allergies || []), allergen],
                chronicConditions: card?.chronicConditions || [],
                currentMedications: card?.currentMedications || [],
            });
            if (res.success) {
                triggerAlert(t('medical_logs.alerts.allergen_added_title'), t('medical_logs.alerts.allergen_added_msg', { allergen }), 'checkmark-circle-outline');
            } else {
                triggerAlert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_allergen_add'));
            }
        } catch {
            triggerAlert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_allergen_add'));
        }
    };

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
        Linking.openURL(url).catch(() => triggerAlert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_open')));
    };

    // Extension from the mimeType if the API sent one, else from the signed
    // URL's own file extension (present before the ?signature query string),
    // else PDF — the most common report format — as a last resort.
    const inferExtension = (item: HealthReport): string => {
        if (item.mimeType?.includes('/')) return item.mimeType.split('/')[1].toLowerCase();
        const clean = item.fileUrl.split('?')[0];
        const match = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
        return match ? match[1].toLowerCase() : 'pdf';
    };

    const buildDownloadFilename = (item: HealthReport): { name: string; mime: string } => {
        const ext = inferExtension(item);
        const mime = ext === 'pdf' ? 'application/pdf'
            : ['jpg', 'jpeg'].includes(ext) ? 'image/jpeg'
            : ext === 'png' ? 'image/png'
            : 'application/octet-stream';
        const cleanTitle = (item.title || 'Report').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Report';
        return { name: `${cleanTitle}_${formatDate(item.createdAt).replace(/\s/g, '-')}`, mime };
    };

    const saveToAndroidDir = async (dirUri: string, item: HealthReport) => {
        const { name, mime } = buildDownloadFilename(item);
        try {
            // Pull the remote file into cache first, then copy its bytes into
            // the user-chosen folder — StorageAccessFramework can only write
            // from a local base64 payload, not stream a remote URL directly.
            const tmpUri = FileSystem.cacheDirectory + `${name}_${Date.now()}`;
            const dl = await FileSystem.downloadAsync(item.fileUrl, tmpUri);
            if (dl.status !== 200) throw new Error(`Download failed: ${dl.status}`);

            const base64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
            const destUri = await FileSystem.StorageAccessFramework.createFileAsync(dirUri, name, mime);
            await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            await FileSystem.deleteAsync(dl.uri, { idempotent: true });

            triggerAlert(t('medical_logs.alerts.downloaded_title'), t('medical_logs.alerts.downloaded_msg'), 'checkmark-circle-outline');
        } catch (err) {
            console.error('Medical log SAF download error:', err);
            await AsyncStorage.removeItem(DOWNLOAD_DIR_KEY);
            triggerAlert(t('medical_card.alerts.save_failed_title'), t('medical_card.alerts.save_failed_msg'));
        }
    };

    const handleDownload = async (item: HealthReport) => {
        if (downloadingId) return;
        setDownloadingId(item.id);
        try {
            if (Platform.OS === 'android') {
                const storedUri = await AsyncStorage.getItem(DOWNLOAD_DIR_KEY);
                if (storedUri) {
                    await saveToAndroidDir(storedUri, item);
                } else {
                    // Ask once; the actual download runs after the user picks a folder.
                    setFolderPromptResolver(() => async () => {
                        try {
                            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                            if (permissions.granted) {
                                await AsyncStorage.setItem(DOWNLOAD_DIR_KEY, permissions.directoryUri);
                                await saveToAndroidDir(permissions.directoryUri, item);
                            } else {
                                triggerAlert(t('medical_card.alerts.permission_denied_title'), t('medical_card.alerts.permission_denied_msg'));
                            }
                        } catch {
                            triggerAlert(t('medical_logs.alerts.error_title'), t('medical_card.alerts.failed_folder_select'));
                        } finally {
                            setDownloadingId(null);
                        }
                    });
                    return; // downloadingId cleared by the resolver above once it runs
                }
            } else {
                // iOS has no folder-write API — hand the file to the share
                // sheet, where "Save to Files" lets the user pick a real folder.
                const { name, mime } = buildDownloadFilename(item);
                const ext = inferExtension(item);
                const tmpUri = `${FileSystem.cacheDirectory}${name}.${ext}`;
                const dl = await FileSystem.downloadAsync(item.fileUrl, tmpUri);
                if (dl.status !== 200) throw new Error(`Download failed: ${dl.status}`);
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(dl.uri, { mimeType: mime, dialogTitle: item.title });
                } else {
                    triggerAlert(t('medical_card.alerts.sharing_not_available_title'), t('medical_card.alerts.sharing_not_available_msg'));
                }
            }
        } catch (err) {
            console.error('Medical log download error:', err);
            triggerAlert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_download'));
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteConfirm({ visible: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteConfirm.id;
        setDeleteConfirm({ visible: false, id: null });
        if (!id) return;
        try {
            await userService.deleteHealthReport(id);
            setReports(prev => prev.filter(r => r.id !== id));
        } catch {
            triggerAlert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_delete'));
        }
    };

    const handleUpload = () => {
        setUploadTitle('');
        setUploadCategory('Other');
        setUploadModalVisible(true);
    };

    const doUpload = async (file: any) => {
        if (!profile?.id) return;
        if (!uploadTitle.trim()) { triggerAlert(t('medical_logs.alerts.title_required_title'), t('medical_logs.alerts.title_required_msg')); return; }
        setUploading(true);
        setUploadModalVisible(false);
        try {
            const res = await userService.uploadHealthReport(profile.id, file, uploadTitle.trim(), uploadCategory);
            if (res.success) {
                triggerAlert(t('medical_logs.alerts.uploaded_title'), t('medical_logs.alerts.uploaded_msg'), 'checkmark-circle-outline');
                fetchReports(true);
            } else {
                triggerAlert(t('medical_logs.alerts.error_title'), res.message || t('medical_logs.alerts.failed_upload'));
            }
        } catch {
            triggerAlert(t('medical_logs.alerts.error_title'), t('medical_logs.alerts.failed_upload_retry'));
        } finally {
            setUploading(false);
        }
    };

    const pickFromCamera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { triggerAlert(t('medical_logs.alerts.permission_required_title'), t('medical_logs.alerts.camera_access_needed')); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            doUpload({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `report_${Date.now()}.jpg` });
        }
    };

    const pickFromGallery = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { triggerAlert(t('medical_logs.alerts.permission_required_title'), t('medical_logs.alerts.gallery_access_needed')); return; }
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
                            <Text style={[styles.tabText, activeCategory === cat.key && { color: '#FAF7ED' }]}>
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
                    renderItem={({ item }) => <ReportCard item={item} onOpen={handleOpenFile} onDownload={handleDownload} onDelete={handleDelete} downloadingId={downloadingId} />}
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
            <Modal
                visible={uploadModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setUploadModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setUploadModalVisible(false)}
                    />
                    <View style={styles.modal}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>{t('medical_logs.modal_title')}</Text>
                            <TouchableOpacity onPress={() => setUploadModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close" size={22} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.fieldLabel}>{t('medical_logs.field_title_label')}</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder={t('medical_logs.title_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={uploadTitle}
                            onChangeText={setUploadTitle}
                            selectionColor={colors.primary}
                            cursorColor={colors.primary}
                            autoFocus={true}
                        />

                        <Text style={styles.fieldLabel}>{t('medical_logs.field_category_label')}</Text>
                        <FlatList
                            horizontal
                            data={CATEGORIES.slice(1)}
                            keyExtractor={c => c.key}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, marginBottom: 18 }}
                            renderItem={({ item: cat }) => (
                                <TouchableOpacity
                                    style={[styles.catChip, uploadCategory === cat.key && { backgroundColor: cat.color }]}
                                    onPress={() => setUploadCategory(cat.key)}
                                >
                                    <Text style={[styles.catChipText, uploadCategory === cat.key && { color: '#FAF7ED' }]}>
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
                    </View>
                </KeyboardAvoidingView>
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
                visible={deleteConfirm.visible}
                title={t('medical_logs.alerts.delete_confirm_title')}
                message={t('medical_logs.alerts.delete_confirm_msg')}
                iconName="trash-outline"
                buttonText={t('common.cancel')}
                onClose={() => setDeleteConfirm({ visible: false, id: null })}
                secondaryButtonText={t('medical_logs.alerts.delete_btn')}
                onSecondaryPress={confirmDelete}
                secondaryDestructive={true}
            />

            <CustomAlertModal
                visible={allergenPrompt.visible}
                title={t('medical_logs.alerts.allergen_prompt_title')}
                message={t('medical_logs.alerts.allergen_prompt_msg', { allergen: allergenPrompt.allergen })}
                iconName="alert-circle-outline"
                buttonText={t('common.cancel')}
                onClose={dismissAllergenPrompt}
                secondaryButtonText={t('medical_logs.alerts.allergen_add_btn')}
                onSecondaryPress={confirmAddAllergen}
            />

            <CustomAlertModal
                visible={!!folderPromptResolver}
                title={t('medical_card.alerts.select_folder_title')}
                message={t('medical_card.alerts.select_folder_msg')}
                iconName="folder-open-outline"
                buttonText={t('common.cancel')}
                onClose={() => { setFolderPromptResolver(null); setDownloadingId(null); }}
                secondaryButtonText={t('medical_card.alerts.select_folder_title')}
                onSecondaryPress={() => {
                    const resolver = folderPromptResolver;
                    setFolderPromptResolver(null);
                    if (resolver) resolver();
                }}
            />
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
    emptyUploadText: { fontFamily: Fonts.medium, fontSize: 14, color: '#FAF7ED' },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        flex: 1,
    },
    modal: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    modalTitle: { fontFamily: Fonts.semiBold, fontSize: 18, color: colors.textDark },
    fieldLabel: { fontFamily: Fonts.medium, fontSize: 13, color: colors.textDark, marginBottom: 8 },
    fieldInput: {
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: Fonts.medium,
        fontSize: 15,
        color: colors.textDark,
        backgroundColor: colors.bgCard,
        marginBottom: 18,
    },
    catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bgCardMuted, borderWidth: 1, borderColor: colors.borderLight },
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

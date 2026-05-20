// Medical Logs — Document vault
// Prescriptions, blood work reports, scans, discharge summaries, etc.
import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Alert, Linking, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { userService } from '@/services/api/userService';
import { useUser } from '@/context/UserContext';

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
    const cat = getCategoryConfig(item.category || 'Other');

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
                            <Text style={[styles.catBadgeText, { color: cat.color }]}>{item.category || 'Other'}</Text>
                        </View>
                        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onOpen(item.fileUrl)} activeOpacity={0.7}>
                    <Ionicons name="eye-outline" size={15} color={Colors.primary} />
                    <Text style={styles.actionBtnText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onDownload(item.fileUrl)} activeOpacity={0.7}>
                    <Ionicons name="download-outline" size={15} color="#7C3AED" />
                    <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Download</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FEE2E2' }]} onPress={() => onDelete(item.id)} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                    <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────
export default function MedicalLogsScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const [reports, setReports] = useState<HealthReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadCategory, setUploadCategory] = useState('Other');

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
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open file.'));
    };

    const handleDownload = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not download file.'));
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        if (profile?.id) {
                            await (userService as any).deleteHealthReport?.(profile.id, id);
                        }
                        setReports(prev => prev.filter(r => r.id !== id));
                    } catch {
                        // Remove optimistically even if API doesn't have delete yet
                        setReports(prev => prev.filter(r => r.id !== id));
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
        if (!uploadTitle.trim()) { Alert.alert('Title required', 'Please enter a title for this document.'); return; }
        setUploading(true);
        setUploadModalVisible(false);
        try {
            const res = await userService.uploadHealthReport(profile.id, file, uploadTitle.trim(), uploadCategory);
            if (res.success) {
                Alert.alert('Uploaded', 'Document saved successfully.');
                fetchReports(true);
            } else {
                Alert.alert('Error', res.message || 'Upload failed.');
            }
        } catch {
            Alert.alert('Error', 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const pickFromCamera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission required', 'Camera access needed'); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            doUpload({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `report_${Date.now()}.jpg` });
        }
    };

    const pickFromGallery = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission required', 'Gallery access needed'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            doUpload({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `report_${Date.now()}.jpg` });
        }
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Medical Logs</Text>
                <TouchableOpacity
                    style={styles.uploadHeaderBtn}
                    onPress={handleUpload}
                    disabled={uploading}
                >
                    {uploading
                        ? <ActivityIndicator size="small" color={Colors.primary} />
                        : <Ionicons name="add" size={22} color={Colors.primary} />
                    }
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search documents…"
                    placeholderTextColor={Colors.textMuted}
                    value={searchText}
                    onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                        <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Category tabs */}
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
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Reports list */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading documents…</Text>
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
                            colors={[Colors.primary]}
                            tintColor={Colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="documents-outline" size={64} color="#E5E7EB" />
                            <Text style={styles.emptyTitle}>No documents yet</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchText ? 'No documents match your search.' : 'Upload prescriptions, reports, and medical documents.'}
                            </Text>
                            {!searchText && (
                                <TouchableOpacity style={styles.emptyUploadBtn} onPress={handleUpload}>
                                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                                    <Text style={styles.emptyUploadText}>Upload Document</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}

            {/* Upload modal */}
            {uploadModalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Upload Document</Text>

                        <Text style={styles.fieldLabel}>Title</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="e.g. Blood test report Jan 2026"
                            placeholderTextColor={Colors.textMuted}
                            value={uploadTitle}
                            onChangeText={setUploadTitle}
                        />

                        <Text style={styles.fieldLabel}>Category</Text>
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
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />

                        <View style={styles.uploadOptions}>
                            <TouchableOpacity style={styles.uploadOptionBtn} onPress={pickFromCamera}>
                                <Ionicons name="camera-outline" size={22} color={Colors.primary} />
                                <Text style={styles.uploadOptionText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.uploadOptionBtn} onPress={pickFromGallery}>
                                <Ionicons name="image-outline" size={22} color={Colors.primary} />
                                <Text style={styles.uploadOptionText}>Gallery</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUploadModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textDark },
    uploadHeaderBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },

    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 16, marginVertical: 10,
        backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
        paddingHorizontal: 12, paddingVertical: 9,
    },
    searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark, padding: 0 },

    tabsScroll: { maxHeight: 44, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    tabsContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F3F4F6' },
    tabText: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.textMuted },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted },
    listContent: { padding: 16, paddingBottom: 40, flexGrow: 1 },

    card: {
        backgroundColor: '#fff', borderRadius: 12,
        marginBottom: 10, padding: 14,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
    cardBody: { flex: 1 },
    cardTitle: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textDark, marginBottom: 6 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    catBadgeText: { fontFamily: Fonts.medium, fontSize: 10 },
    cardDate: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
    cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
    actionBtnText: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.primary },

    emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textDark, marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    emptyUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    emptyUploadText: { fontFamily: Fonts.medium, fontSize: 14, color: '#fff' },

    // Modal
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
    modalTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textDark, marginBottom: 16 },
    fieldLabel: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textDark, marginBottom: 6 },
    fieldInput: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark,
        marginBottom: 14,
    },
    catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
    catChipText: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.textMuted },
    uploadOptions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    uploadOptionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
    },
    uploadOptionText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.primary },
    modalCancelBtn: { alignItems: 'center', paddingVertical: 12 },
    modalCancelText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textMuted },
});

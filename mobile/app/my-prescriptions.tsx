import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, ActivityIndicator, RefreshControl, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import { userService } from '@/services/api/userService';
import { useUser } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import * as ImagePicker from 'expo-image-picker';


interface HealthReport {
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
    uploadedBy: string;
    flagSeverity?: string;
    flagNote?: string;
    reportDate: string;
    createdAt: string;
}

export default function MyPrescriptionsScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const [reports, setReports] = useState<HealthReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchReports = async () => {
        try {
            const res = await userService.getMyHealthReports();
            if (res.success && res.data) {
                setReports(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch health reports:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchReports(); }, []));

    const onRefresh = () => { setRefreshing(true); fetchReports(); };

    const handleUpload = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission required', 'Gallery access is needed to upload prescriptions.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });
        if (result.canceled || !result.assets[0] || !profile?.id) return;

        setUploading(true);
        try {
            const asset = result.assets[0];
            const file = {
                uri: asset.uri,
                type: asset.mimeType || 'image/jpeg',
                name: asset.fileName || 'prescription.jpg',
            };
            const res = await userService.uploadHealthReport(profile.id, file, 'Prescription', 'Prescription');
            if (res.success) {
                Alert.alert('Success', 'Prescription uploaded.');
                fetchReports();
            } else {
                Alert.alert('Error', res.message || 'Upload failed.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const openReport = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open this file.'));
    };

    const getSeverityColor = (severity?: string) => {
        if (severity === 'CRITICAL') return '#FF3B30';
        if (severity === 'HIGH') return '#F5A623';
        return '#048357';
    };

    const renderItem = ({ item }: { item: HealthReport }) => (
        <TouchableOpacity style={styles.card} onPress={() => openReport(item.fileUrl)} activeOpacity={0.7}>
            <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: item.fileType === 'pdf' ? '#FFF0E0' : '#E8F5E9' }]}>
                    <Ionicons
                        name={item.fileType === 'pdf' ? 'document-text-outline' : 'image-outline'}
                        size={22} color={item.fileType === 'pdf' ? '#F5A623' : '#048357'}
                    />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardDate}>
                        {new Date(item.reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                    {item.flagNote && (
                        <Text style={[styles.flagNote, { color: getSeverityColor(item.flagSeverity) }]} numberOfLines={1}>
                            {item.flagSeverity}: {item.flagNote}
                        </Text>
                    )}
                </View>
            </View>
            <Ionicons name="open-outline" size={18} color="#AAAEAC" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Prescriptions</Text>
                </View>
            </SafeAreaView>

            <View style={styles.body}>
                {loading ? (
                    <View style={styles.center}><ActivityIndicator size="large" color="#048357" /></View>
                ) : (
                    <FlatList
                        data={reports}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#048357']} />}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="document-text-outline" size={56} color="#AAAEAC" />
                                <Text style={styles.emptyTitle}>No Prescriptions</Text>
                                <Text style={styles.emptyDesc}>Upload your prescriptions and discharge summaries here.</Text>
                            </View>
                        }
                        ListFooterComponent={
                            <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} disabled={uploading} activeOpacity={0.7}>
                                {uploading ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                                        <Text style={styles.uploadBtnText}>Upload Prescription</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#048357' },
    headerSafe: { backgroundColor: '#048357' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20, color: '#FAF7ED',
        flex: 1,
    },
    body: { flex: 1, backgroundColor: '#FFFFE3', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 40 },
    card: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FAF7ED', borderRadius: 14, padding: 14, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1 },
    cardTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14, color: '#2F2F2F',
    },
    cardDate: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: '#898989', marginTop: 2,
    },
    flagNote: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11, marginTop: 3,
    },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18, color: '#2F2F2F', marginTop: 14,
    },
    emptyDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: '#898989', marginTop: 4, textAlign: 'center', paddingHorizontal: 30,
    },
    uploadBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#048357', paddingVertical: 16, borderRadius: 12, marginTop: 16,
    },
    uploadBtnText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15, color: '#FAF7ED',
    },
});

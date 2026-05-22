import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function DownloadDocumentsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

    const documents = [
        {
            id: '1',
            name: 'Medical Report - January 2026',
            category: 'medical',
            type: 'PDF',
            size: '2.4 MB',
            date: '15 Jan 2026',
        },
        {
            id: '2',
            name: 'Lab Test Results',
            category: 'lab',
            type: 'PDF',
            size: '1.8 MB',
            date: '12 Jan 2026',
        },
        {
            id: '3',
            name: 'Prescription - Jan 2026',
            category: 'prescription',
            type: 'PDF',
            size: '0.9 MB',
            date: '10 Jan 2026',
        },
        {
            id: '4',
            name: 'Health Insurance Card',
            category: 'insurance',
            type: 'Image',
            size: '3.1 MB',
            date: '01 Jan 2026',
        },
        {
            id: '5',
            name: 'Discharge Summary',
            category: 'medical',
            type: 'PDF',
            size: '1.2 MB',
            date: '25 Dec 2025',
        },
    ];

    const toggleDocument = (docId: string) => {
        setSelectedDocs(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    const handleSelectAll = () => {
        if (selectedDocs.length === documents.length) {
            setSelectedDocs([]);
        } else {
            setSelectedDocs(documents.map(doc => doc.id));
        }
    };

    const handleDownload = () => {
        if (selectedDocs.length === 0) {
            Alert.alert('Select Documents', 'Please select at least one document to download');
            return;
        }

        const selectedNames = documents
            .filter(doc => selectedDocs.includes(doc.id))
            .map(doc => doc.name)
            .join('\n');

        Alert.alert(
            'Download Documents',
            `Starting download of ${selectedDocs.length} document(s):\n\n${selectedNames}`,
            [{ text: 'OK' }]
        );
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            medical: '#2563EB',
            lab: '#7C3AED',
            prescription: '#EA580C',
            insurance: '#0284C7',
        };
        return colors[category] || Colors.primary;
    };

    const totalSize = selectedDocs.reduce((sum, id) => {
        const doc = documents.find(d => d.id === id);
        const sizeMatch = doc?.size.match(/[\d.]+/);
        return sum + (sizeMatch ? parseFloat(sizeMatch[0]) : 0);
    }, 0);

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Download Documents</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                    Select documents to download. You can download multiple files at once.
                </Text>

                {/* Select All */}
                <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={handleSelectAll}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, selectedDocs.length === documents.length && styles.checkboxActive]}>
                        {selectedDocs.length === documents.length && (
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                    </View>
                    <Text style={styles.selectAllText}>
                        {selectedDocs.length === documents.length ? 'Deselect All' : 'Select All'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* Documents List */}
                {documents.map((doc) => {
                    const isSelected = selectedDocs.includes(doc.id);
                    return (
                        <TouchableOpacity
                            key={doc.id}
                            style={[styles.documentItem, isSelected && styles.documentItemActive]}
                            onPress={() => toggleDocument(doc.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.checkbox}>
                                {isSelected && (
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                )}
                            </View>

                            <View style={[styles.categoryIcon, { backgroundColor: `${getCategoryColor(doc.category)}15` }]}>
                                <Ionicons name="document-text-outline" size={18} color={getCategoryColor(doc.category)} />
                            </View>

                            <View style={styles.documentMeta}>
                                <Text style={styles.documentName}>{doc.name}</Text>
                                <Text style={styles.documentDetails}>
                                    {doc.type} • {doc.size} • {doc.date}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                <View style={styles.divider} />

                {/* Summary */}
                {selectedDocs.length > 0 && (
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Documents Selected</Text>
                            <Text style={styles.summaryValue}>{selectedDocs.length}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Size</Text>
                            <Text style={styles.summaryValue}>{totalSize.toFixed(1)} MB</Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.downloadButton, selectedDocs.length === 0 && styles.downloadButtonDisabled]}
                    onPress={handleDownload}
                    disabled={selectedDocs.length === 0}
                    activeOpacity={0.8}
                >
                    <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>
                        Download {selectedDocs.length > 0 ? `(${selectedDocs.length})` : ''}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
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
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    description: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
        lineHeight: 20,
    },
    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    selectAllText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: Spacing.md,
    },
    documentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.sm,
        marginBottom: Spacing.sm,
    },
    documentItemActive: {
        backgroundColor: `${Colors.primary}10`,
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: Radius.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    documentMeta: {
        flex: 1,
    },
    documentName: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 2,
    },
    documentDetails: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
    },
    summaryBox: {
        flexDirection: 'row',
        gap: Spacing.md,
        backgroundColor: `${Colors.primary}10`,
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    summaryItem: {
        flex: 1,
    },
    summaryLabel: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
        marginBottom: 4,
    },
    summaryValue: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.primary,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.lg,
        borderRadius: Radius.md,
        marginBottom: Spacing.md,
    },
    downloadButtonDisabled: {
        backgroundColor: Colors.textMuted,
        opacity: 0.5,
    },
    downloadButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textWhite,
    },
});

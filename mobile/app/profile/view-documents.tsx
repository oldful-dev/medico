import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function ViewDocumentsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedCategory, setSelectedCategory] = useState('all');

    const documents = [
        {
            id: '1',
            name: 'Medical Report - January 2026',
            category: 'medical',
            type: 'PDF',
            size: '2.4 MB',
            date: '15 Jan 2026',
            icon: 'document-text-outline',
            color: '#2563EB',
        },
        {
            id: '2',
            name: 'Lab Test Results',
            category: 'lab',
            type: 'PDF',
            size: '1.8 MB',
            date: '12 Jan 2026',
            icon: 'flask-outline',
            color: '#7C3AED',
        },
        {
            id: '3',
            name: 'Prescription - Jan 2026',
            category: 'prescription',
            type: 'PDF',
            size: '0.9 MB',
            date: '10 Jan 2026',
            icon: 'receipt-outline',
            color: '#EA580C',
        },
        {
            id: '4',
            name: 'Health Insurance Card',
            category: 'insurance',
            type: 'Image',
            size: '3.1 MB',
            date: '01 Jan 2026',
            icon: 'card-outline',
            color: '#0284C7',
        },
        {
            id: '5',
            name: 'Discharge Summary',
            category: 'medical',
            type: 'PDF',
            size: '1.2 MB',
            date: '25 Dec 2025',
            icon: 'document-text-outline',
            color: '#2563EB',
        },
    ];

    const categories = [
        { id: 'all', label: 'All Documents', icon: 'grid-outline' },
        { id: 'medical', label: 'Medical', icon: 'medical-outline' },
        { id: 'lab', label: 'Lab Reports', icon: 'flask-outline' },
        { id: 'prescription', label: 'Prescriptions', icon: 'receipt-outline' },
        { id: 'insurance', label: 'Insurance', icon: 'card-outline' },
    ];

    const filteredDocuments = selectedCategory === 'all'
        ? documents
        : documents.filter(doc => doc.category === selectedCategory);

    const handleViewDocument = (docName: string) => {
        Alert.alert(
            'View Document',
            `Opening: ${docName}`,
            [{ text: 'OK' }]
        );
    };

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>View Documents</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Categories Filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat.id && styles.categoryChipActive,
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={cat.icon as any}
                                size={16}
                                color={selectedCategory === cat.id ? Colors.textWhite : Colors.textMuted}
                            />
                            <Text
                                style={[
                                    styles.categoryLabel,
                                    selectedCategory === cat.id && styles.categoryLabelActive,
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Documents List */}
                <View style={styles.contentContainer}>
                    {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((doc) => (
                            <View key={doc.id} style={styles.documentCard}>
                                <View style={[styles.iconCircle, { backgroundColor: `${doc.color}15` }]}>
                                    <Ionicons name={doc.icon as any} size={24} color={doc.color} />
                                </View>

                                <View style={styles.documentInfo}>
                                    <Text style={styles.documentName} numberOfLines={2}>{doc.name}</Text>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaText}>{doc.type}</Text>
                                        <Text style={styles.metaDot}>•</Text>
                                        <Text style={styles.metaText}>{doc.size}</Text>
                                        <Text style={styles.metaDot}>•</Text>
                                        <Text style={styles.metaText}>{doc.date}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.viewButton}
                                    onPress={() => handleViewDocument(doc.name)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="open-outline" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>No documents found</Text>
                            <Text style={styles.emptySubtext}>Documents will appear here once uploaded</Text>
                        </View>
                    )}
                </View>

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
    categoriesContainer: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    categoryLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },
    categoryLabelActive: {
        color: Colors.textWhite,
    },
    contentContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    documentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        gap: Spacing.md,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    documentInfo: {
        flex: 1,
    },
    documentName: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
    },
    metaDot: {
        color: Colors.borderLight,
    },
    viewButton: {
        width: 40,
        height: 40,
        borderRadius: Radius.sm,
        backgroundColor: `${Colors.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginTop: Spacing.md,
    },
    emptySubtext: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        marginTop: Spacing.sm,
    },
});

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

interface PickedFile {
    uri: string;
    name: string;
}

interface DocumentUploadBoxProps {
    title?: string;
    subtitle?: string;
    onFilesChange?: (files: string[]) => void;
    maxFiles?: number;
}

export default function DocumentUploadBox({
    title,
    subtitle,
    onFilesChange,
    maxFiles = 1,
}: DocumentUploadBoxProps) {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t('image_upload.upload_photos');
    const resolvedSubtitle = subtitle ?? t('service_detail.document_upload_subtitle', 'PDF up to 10MB');
    const [files, setFiles] = useState<PickedFile[]>([]);

    const handlePick = useCallback(async () => {
        if (files.length >= maxFiles) {
            Alert.alert(t('image_upload.limit_reached'), t('image_upload.limit_message', { max: maxFiles }));
            return;
        }

        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            multiple: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setFiles(prev => [...prev, { uri: asset.uri, name: asset.name || 'document.pdf' }].slice(0, maxFiles));
        }
    }, [files.length, maxFiles, t]);

    React.useEffect(() => {
        if (onFilesChange) {
            onFilesChange(files.map(f => f.uri));
        }
    }, [files, onFilesChange]);

    const removeFile = (index: number) => {
        setFiles(prev => {
            const updated = [...prev];
            updated.splice(index, 1);
            return updated;
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.uploadDashedBox}>
                <Ionicons name="document-attach-outline" size={40} color={Colors.primary} style={styles.uploadCloudIcon} />
                <Text style={styles.uploadTitle}>{resolvedTitle}</Text>
                <Text style={styles.uploadSubtitle}>{resolvedSubtitle}</Text>

                <TouchableOpacity style={styles.uploadButton} onPress={handlePick} activeOpacity={0.8}>
                    <Text style={styles.uploadButtonText}>{t('image_upload.select_image').toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            {files.length > 0 && (
                <View style={styles.fileListContainer}>
                    {files.map((file, index) => (
                        <View key={index} style={styles.fileRow}>
                            <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                            <TouchableOpacity onPress={() => removeFile(index)}>
                                <Ionicons name="close-circle" size={20} color={Colors.sosRed} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: Spacing.xl,
    },
    uploadDashedBox: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#495057',
        borderRadius: Radius.xl,
        width: '100%',
        paddingVertical: 20,
        alignItems: 'center',
        backgroundColor: Colors.bgCard,
    },
    uploadCloudIcon: {
        marginBottom: Spacing.sm,
    },
    uploadTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.textDark,
        marginBottom: Spacing.xs,
        textAlign: 'center',
        paddingHorizontal: Spacing.md,
    },
    uploadSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
        marginBottom: Spacing.md,
        textAlign: 'center',
        paddingHorizontal: Spacing.md,
    },
    uploadButton: {
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: Radius.md,
        paddingVertical: 8,
        paddingHorizontal: Spacing.xl,
        backgroundColor: Colors.bgCard,
    },
    uploadButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.caption,
        color: Colors.primaryDark,
        textTransform: 'uppercase',
    },
    fileListContainer: {
        marginTop: Spacing.md,
        width: '100%',
        gap: Spacing.sm,
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        borderRadius: Radius.sm,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: Colors.bgCard,
    },
    fileName: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textDark,
    },
});

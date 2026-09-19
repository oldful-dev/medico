import React, { useCallback, useState, useRef, useEffect } from 'react';
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
    // Defaults to PDF-only — every existing caller wants that. Pass a wider
    // list (e.g. scans/photos of prescriptions) when the use case genuinely
    // needs images too, like Medical Tourism's report upload.
    allowedTypes?: string | string[];
}

export default function DocumentUploadBox({
    title,
    subtitle,
    onFilesChange,
    maxFiles = 1,
    allowedTypes = 'application/pdf',
}: DocumentUploadBoxProps) {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t('image_upload.upload_photos', 'Upload Document');
    const resolvedSubtitle = subtitle ?? t('service_detail.document_upload_subtitle', 'PDF up to 10MB');
    const [files, setFiles] = useState<PickedFile[]>([]);

    const onFilesChangeRef = useRef(onFilesChange);
    useEffect(() => {
        onFilesChangeRef.current = onFilesChange;
    }, [onFilesChange]);

    const notifyParent = useCallback((newFiles: PickedFile[]) => {
        onFilesChangeRef.current?.(newFiles.map(f => f.uri));
    }, []);

    const handlePick = useCallback(async () => {
        if (files.length >= maxFiles) {
            Alert.alert(
                t('image_upload.limit_reached', 'Limit Reached'),
                t('image_upload.limit_message', { max: maxFiles, defaultValue: `You can only upload up to ${maxFiles} documents.` })
            );
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: allowedTypes,
                multiple: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setFiles(prev => {
                    const next = [...prev, { uri: asset.uri, name: asset.name || 'document.pdf' }].slice(0, maxFiles);
                    notifyParent(next);
                    return next;
                });
            }
        } catch (error) {
            console.error('[DocumentUploadBox] Error picking document:', error);
            Alert.alert(t('common.error', 'Error'), 'Could not open document picker. Please try again.');
        }
    }, [files.length, maxFiles, notifyParent, t, allowedTypes]);

    const removeFile = (index: number) => {
        setFiles(prev => {
            const updated = [...prev];
            updated.splice(index, 1);
            notifyParent(updated);
            return updated;
        });
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.uploadDashedBox} 
                onPress={handlePick} 
                activeOpacity={0.7}
            >
                <Ionicons name="document-attach-outline" size={40} color={Colors.primary} style={styles.uploadCloudIcon} />
                <Text style={styles.uploadTitle}>{resolvedTitle}</Text>
                <Text style={styles.uploadSubtitle}>{resolvedSubtitle}</Text>

                <View style={styles.uploadButton}>
                    <Text style={styles.uploadButtonText}>{t('image_upload.select_image', 'SELECT DOCUMENT').toUpperCase()}</Text>
                </View>
            </TouchableOpacity>

            {files.length > 0 && (
                <View style={styles.fileListContainer}>
                    {files.map((file, index) => (
                        <View key={index} style={styles.fileRow}>
                            <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                            <TouchableOpacity 
                                onPress={() => removeFile(index)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
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
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#9CA3AF',
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

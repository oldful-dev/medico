import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

interface ImageUploadBoxProps {
    title?: string;
    subtitle?: string;
    onImagesChange?: (images: string[]) => void;
    maxImages?: number;
}

export default function ImageUploadBox({
    title,
    subtitle,
    onImagesChange,
    maxImages = 5,
}: ImageUploadBoxProps) {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t('image_upload.upload_photos');
    const resolvedSubtitle = subtitle ?? t('image_upload.file_hint');
    const [images, setImages] = useState<string[]>([]);

    const handleAddImage = () => {
        if (images.length >= maxImages) {
            Alert.alert(t('image_upload.limit_reached'), t('image_upload.limit_message', { max: maxImages }));
            return;
        }

        Alert.alert(
            t('image_upload.upload_photo'),
            '',
            [
                { text: t('image_upload.take_photo'), onPress: () => { setTimeout(openCamera, 300); } },
                { text: t('image_upload.choose_gallery'), onPress: () => { setTimeout(openGallery, 300); } },
                { text: t('common.cancel'), style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    const openCamera = useCallback(async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert(t('common.permission_required'), t('image_upload.camera_permission'));
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            addImage(result.assets[0].uri);
        }
    }, [images]);

    const openGallery = useCallback(async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert(t('common.permission_required'), t('image_upload.gallery_permission'));
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsMultipleSelection: true,
            selectionLimit: maxImages - images.length,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const newUris = result.assets.map((asset: ImagePicker.ImagePickerAsset) => asset.uri);
            const combined = [...images, ...newUris].slice(0, maxImages);
            setImages(combined);
            if (onImagesChange) onImagesChange(combined);
        }
    }, [images, maxImages, onImagesChange]);

    const addImage = (uri: string) => {
        const newImages = [...images, uri];
        setImages(newImages);
        if (onImagesChange) onImagesChange(newImages);
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
        if (onImagesChange) onImagesChange(newImages);
    };

    return (
        <View style={styles.container}>
            <View style={styles.uploadDashedBox}>
                <Ionicons name="cloud-upload-outline" size={40} color={Colors.primary} style={styles.uploadCloudIcon} />
                <Text style={styles.uploadTitle}>{resolvedTitle}</Text>
                <Text style={styles.uploadSubtitle}>{resolvedSubtitle}</Text>

                <TouchableOpacity style={styles.uploadButton} onPress={handleAddImage} activeOpacity={0.8}>
                    <Text style={styles.uploadButtonText}>{t('image_upload.select_image').toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            {images.length > 0 && (
                <View style={styles.imagePreviewContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {images.map((uri, index) => (
                            <View key={index} style={styles.imageThumbnailWrapper}>
                                <Image source={{ uri }} style={styles.imageThumbnail} blurRadius={0} />
                                <TouchableOpacity
                                    style={styles.removeIconBtn}
                                    onPress={() => removeImage(index)}
                                >
                                    <Ionicons name="close-circle" size={24} color={Colors.sosRed} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
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
    imagePreviewContainer: {
        marginTop: Spacing.md,
        width: '100%',
    },
    scrollContent: {
        gap: Spacing.sm,
    },
    imageThumbnailWrapper: {
        position: 'relative',
        width: 70,
        height: 70,
        borderRadius: Radius.sm,
        marginTop: Spacing.xs,
        marginRight: Spacing.md,
    },
    imageThumbnail: {
        width: '100%',
        height: '100%',
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    removeIconBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.full,
    },
});

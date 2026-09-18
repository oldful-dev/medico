import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ScrollView,
    Modal,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, FontSize, Radius, Spacing, Shadow } from '@/constants/theme';
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
    const resolvedTitle = title ?? t('image_upload.upload_photos', 'Upload Photos');
    const resolvedSubtitle = subtitle ?? t('image_upload.file_hint', 'JPG, PNG up to 10MB');
    const [images, setImages] = useState<string[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    const onImagesChangeRef = useRef(onImagesChange);
    useEffect(() => {
        onImagesChangeRef.current = onImagesChange;
    }, [onImagesChange]);

    const notifyParent = useCallback((newImages: string[]) => {
        onImagesChangeRef.current?.(newImages);
    }, []);

    const openCamera = useCallback(async () => {
        setModalVisible(false);
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert(
                    t('common.permission_required', 'Permission Required'),
                    t('image_upload.camera_permission', 'Camera permission is required to take photos.')
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                setImages(prev => {
                    const next = [...prev, uri].slice(0, maxImages);
                    notifyParent(next);
                    return next;
                });
            }
        } catch (error) {
            console.error('[ImageUploadBox] Error launching camera:', error);
            Alert.alert(t('common.error', 'Error'), t('image_upload.camera_error', 'Could not open camera. Please try again.'));
        }
    }, [maxImages, notifyParent, t]);

    const openGallery = useCallback(async () => {
        setModalVisible(false);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: maxImages > 1,
                selectionLimit: Math.max(1, maxImages - images.length),
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newUris = result.assets.map((asset: ImagePicker.ImagePickerAsset) => asset.uri);
                setImages(prev => {
                    const next = [...prev, ...newUris].slice(0, maxImages);
                    notifyParent(next);
                    return next;
                });
            }
        } catch (error) {
            console.error('[ImageUploadBox] Error launching gallery:', error);
            Alert.alert(t('common.error', 'Error'), t('image_upload.gallery_error', 'Could not open photo gallery. Please try again.'));
        }
    }, [images.length, maxImages, notifyParent, t]);

    const handleAddImage = () => {
        if (images.length >= maxImages) {
            Alert.alert(
                t('image_upload.limit_reached', 'Limit Reached'),
                t('image_upload.limit_message', { max: maxImages, defaultValue: `You can only upload up to ${maxImages} images.` })
            );
            return;
        }

        setModalVisible(true);
    };

    const removeImage = (index: number) => {
        setImages(prev => {
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
                onPress={handleAddImage} 
                activeOpacity={0.7}
            >
                <Ionicons name="cloud-upload-outline" size={40} color={Colors.primary} style={styles.uploadCloudIcon} />
                <Text style={styles.uploadTitle}>{resolvedTitle}</Text>
                <Text style={styles.uploadSubtitle}>{resolvedSubtitle}</Text>

                <View style={styles.uploadButton}>
                    <Text style={styles.uploadButtonText}>{t('image_upload.select_image', 'SELECT IMAGE').toUpperCase()}</Text>
                </View>
            </TouchableOpacity>

            {images.length > 0 && (
                <View style={styles.imagePreviewContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {images.map((uri, index) => (
                            <View key={index} style={styles.imageThumbnailWrapper}>
                                <Image source={{ uri }} style={styles.imageThumbnail} blurRadius={0} />
                                <TouchableOpacity
                                    style={styles.removeIconBtn}
                                    onPress={() => removeImage(index)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close-circle" size={24} color={Colors.sosRed} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Selection Modal Sheet */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>{t('image_upload.upload_photo', 'Upload Photo')}</Text>

                        <TouchableOpacity style={styles.modalOption} onPress={openCamera} activeOpacity={0.7}>
                            <View style={[styles.modalOptionIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="camera-outline" size={22} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalOptionText}>{t('image_upload.take_photo', 'Take Photo')}</Text>
                                <Text style={styles.modalOptionSub}>{t('image_upload.take_photo_sub', 'Use camera to capture image')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={openGallery} activeOpacity={0.7}>
                            <View style={[styles.modalOptionIcon, { backgroundColor: '#E0F2FE' }]}>
                                <Ionicons name="images-outline" size={22} color="#0284C7" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalOptionText}>{t('image_upload.choose_gallery', 'Choose from Gallery')}</Text>
                                <Text style={styles.modalOptionSub}>{t('image_upload.choose_gallery_sub', 'Select from photo library')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCancelBtn}
                            onPress={() => setModalVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 34,
        gap: 12,
        ...Shadow.card,
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: Radius.lg,
        backgroundColor: '#F9FAFB',
        gap: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    modalOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOptionText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    modalOptionSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
        marginTop: 2,
    },
    modalCancelBtn: {
        marginTop: 8,
        paddingVertical: 14,
        borderRadius: Radius.lg,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    modalCancelText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
});

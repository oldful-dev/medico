import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import * as ImagePicker from 'expo-image-picker';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { useTranslation } from 'react-i18next';

const cameraIcon = require('@/assets/images/288b8d22e862e8e7e85fb51ab6158d4b0fd84dcc.png');
const galleryIcon = require('@/assets/images/82b1e49607f9f5b0817c6d51de25f6b752ac4908.png');

export default function ScanEcgScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [pickupDropAddon, setPickupDropAddon] = useState(false);
    const [assistanceAddon, setAssistanceAddon] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [comments, setComments] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);

    const { isReady, cityId, serviceId, serviceName, servicePrice, address, setAddress, isLoading: isLoadingInit } = useServiceInitialization('scan-ecg');

    // Sync selectedAddress with initial fetched address
    React.useEffect(() => {
        if (address && address !== 'Fetching address...' && !selectedAddress) {
            setSelectedAddress({
                line1: address,
                cityName: '',
                pincode: '',
                latitude: 28.7041,
                longitude: 77.1025,
            });
        }
    }, [address]);

    const openCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to upload a prescription.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedImages([...selectedImages, result.assets[0].uri]);
        }
    };

    const openGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery permission is required to upload a prescription.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const newUris = result.assets.map(asset => asset.uri);
            setSelectedImages([...selectedImages, ...newUris]);
        }
    };

    const removeImage = (index: number) => {
        const updated = [...selectedImages];
        updated.splice(index, 1);
        setSelectedImages(updated);
    };

    const handleCapture = async (source: 'camera' | 'gallery') => {
        if (source === 'camera') await openCamera();
        else await openGallery();
    };

    const handleBookService = async () => {
        if (!selectedDate) {
            Alert.alert(t('scan_ecg.alert_datetime_required'), t('scan_ecg.alert_datetime_required_msg'));
            return;
        }
        if (!address || address.trim().length < 5 || address === 'Fetching address...') {
            Alert.alert(t('scan_ecg.alert_address_required'), t('scan_ecg.alert_address_required_msg'));
            return;
        }
        if (!isReady) {
            Alert.alert(t('common.error'), t('booking.init_incomplete'));
            return;
        }
        try {
            setIsBooking(true);

            // Upload images first if any
            let uploadedImageUrls: string[] = [];
            if (selectedImages.length > 0) {
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'prescriptions');
            }

            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: selectedDate!.toISOString(),
                addressLine: address || undefined,
                formDataJson: {
                    serviceName: 'Scan & ECG',
                    attachments: uploadedImageUrls,
                    pickupDrop: pickupDropAddon,
                    assistanceRequired: assistanceAddon,
                    comments: comments || undefined,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: String(servicePrice),
                    label: 'Scan & ECG',
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId })
                },
            });
        } catch (error) {
            console.error('Scan & ECG booking error:', error);
            Alert.alert(t('common.error'), t('booking.something_wrong'));
        } finally {
            setIsBooking(false);
        }
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={dynamicStyles.screen}>
            <SafeAreaView style={dynamicStyles.headerBackground} edges={['top']}>
                <StatusBar style="light" backgroundColor="#048357" />
                <View style={dynamicStyles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={dynamicStyles.headerTextCol}>
                        <Text style={dynamicStyles.headerTitle}>{t('scan_ecg.header')}</Text>
                        <Text style={dynamicStyles.headerSubtitle}>{t('scan_ecg.header_subtitle')}</Text>
                    </View>
                </View>
            </SafeAreaView>

            <View style={dynamicStyles.contentContainer}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <KeyboardAwareScrollView
                        style={dynamicStyles.scrollView}
                        contentContainerStyle={dynamicStyles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid
                        extraScrollHeight={20}
                    >
                        {/* Prescription Upload Title */}
                        <Text style={dynamicStyles.sectionTitle}>{t('scan_ecg.document_upload')}</Text>

                        {/* Camera Option */}
                        <TouchableOpacity
                            style={[dynamicStyles.uploadOptionCard, selectedImages.length > 0 && dynamicStyles.uploadOptionCardActive]}
                            activeOpacity={0.7}
                            onPress={() => handleCapture('camera')}
                        >
                            <Image source={cameraIcon} style={dynamicStyles.uploadIcon} resizeMode="contain" />
                            <View style={dynamicStyles.uploadTextContainer}>
                                <Text style={dynamicStyles.uploadMainText}>{t('scan_ecg.camera_option')}</Text>
                                <Text style={dynamicStyles.uploadSubText}>{t('scan_ecg.camera_sub')}</Text>
                            </View>
                            <Ionicons name={selectedImages.length > 0 ? "checkmark-circle" : "chevron-forward"} size={20} color={selectedImages.length > 0 ? "#048357" : "#898989"} />
                        </TouchableOpacity>

                        {/* Gallery Option */}
                        <TouchableOpacity
                            style={[dynamicStyles.uploadOptionCard, selectedImages.length > 0 && dynamicStyles.uploadOptionCardActive]}
                            activeOpacity={0.7}
                            onPress={() => handleCapture('gallery')}
                        >
                            <Image source={galleryIcon} style={dynamicStyles.uploadIcon} resizeMode="contain" />
                            <View style={dynamicStyles.uploadTextContainer}>
                                <Text style={dynamicStyles.uploadMainText}>{t('scan_ecg.gallery_option')}</Text>
                                <Text style={dynamicStyles.uploadSubText}>{t('scan_ecg.gallery_sub')}</Text>
                            </View>
                            <Ionicons name={selectedImages.length > 0 ? "checkmark-circle" : "chevron-forward"} size={20} color={selectedImages.length > 0 ? "#048357" : "#898989"} />
                        </TouchableOpacity>

                        {/* Image Preview Scroll */}
                        {selectedImages.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dynamicStyles.previewScroll} contentContainerStyle={dynamicStyles.previewContent}>
                                {selectedImages.map((uri, index) => (
                                    <View key={index} style={dynamicStyles.previewThumbWrapper}>
                                        <Image source={{ uri }} style={dynamicStyles.previewThumb} />
                                        <TouchableOpacity style={dynamicStyles.removePreviewBtn} onPress={() => removeImage(index)}>
                                            <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        <View style={dynamicStyles.divider} />

                        {/* Custom Date Time Picker */}
                        <CustomDateTimePicker
                            label={t('scan_ecg.schedule_service')}
                            value={selectedDate}
                            onDateChange={setSelectedDate}
                            timeSlots={['8 AM - 11 AM', '12 PM - 3 PM', '4 PM - 7 PM']}
                        />

                        <View style={dynamicStyles.divider} />

                        {/* Service Addons */}
                        <View style={dynamicStyles.addonsContainer}>
                            <Text style={dynamicStyles.addonSectionTitle}>{t('scan_ecg.service_addons')}</Text>

                            {/* Addon: Pickup-Drop */}
                            <TouchableOpacity
                                style={dynamicStyles.addonRow}
                                activeOpacity={0.75}
                                onPress={() => setPickupDropAddon(!pickupDropAddon)}
                            >
                                {pickupDropAddon ? (
                                    <View style={dynamicStyles.checkedBoxBig}>
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    </View>
                                ) : (
                                    <View style={dynamicStyles.uncheckedCircle} />
                                )}
                                <Text style={dynamicStyles.addonText}>
                                    {t('scan_ecg.pickup_drop')}
                                </Text>
                            </TouchableOpacity>

                            {/* Addon: Assistance Required */}
                            <TouchableOpacity
                                style={dynamicStyles.addonRow}
                                activeOpacity={0.75}
                                onPress={() => setAssistanceAddon(!assistanceAddon)}
                            >
                                {assistanceAddon ? (
                                    <View style={dynamicStyles.checkedBoxBig}>
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    </View>
                                ) : (
                                    <View style={dynamicStyles.uncheckedCircle} />
                                )}
                                <Text style={dynamicStyles.addonText}>
                                    {t('scan_ecg.assistance_required')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Address Picker Section */}
                        <AddressPickerSection
                            selectedAddress={selectedAddress}
                            onAddressChange={(addr) => {
                                setSelectedAddress(addr);
                                setAddress(`${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}`);
                            }}
                            title={t('scan_ecg.appointment_location')}
                            showPhoneField={false}
                            showLandmarkField={false}
                            allowManualEntry={true}
                        />

                        {/* Comments Input */}
                        <Text style={dynamicStyles.commentsLabel}>{t('scan_ecg.comments')}</Text>
                        <View style={dynamicStyles.commentsContainer}>
                            <TextInput
                                style={dynamicStyles.commentsInput}
                                placeholder={t('scan_ecg.comments_placeholder')}
                                placeholderTextColor="#898989"
                                multiline
                                numberOfLines={4}
                                value={comments}
                                onChangeText={setComments}
                            />
                        </View>

                        {/* Confirm Button */}
                        <TouchableOpacity
                            style={[dynamicStyles.submitButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                            activeOpacity={0.8}
                            disabled={isBooking || isLoadingInit}
                            onPress={handleBookService}
                        >
                            {isBooking ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={dynamicStyles.submitButtonText}>
                                    {isLoadingInit ? t('common.initializing') : t('scan_ecg.confirm')}
                                </Text>
                            )}
                        </TouchableOpacity>

                    </KeyboardAwareScrollView>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357',
    },
    headerBackground: {
        backgroundColor: '#048357',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 40,
    },
    backButton: {
        padding: 4,
    },
    headerTextCol: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        letterSpacing: -0.24,
    },
    headerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#FFFFFF',
        letterSpacing: -0.24,
        zIndex: 10,
        opacity: 0.9,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: isDarkMode ? '#0F172A' : '#FDFDE8',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingTop: 30,
        paddingBottom: 50,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 20,
    },
    uploadOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 59,
        marginBottom: 10,
        shadowColor: '#02743F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 3,
    },
    uploadIcon: {
        width: 30,
        height: 27,
        marginRight: 15,
    },
    uploadTextContainer: {
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'center',
    },
    uploadMainText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },
    uploadSubText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#CCCCCC' : '#555555',
        marginTop: 2,
    },
    uploadOptionCardActive: {
        borderColor: '#048357',
        borderWidth: 1.5,
        backgroundColor: isDarkMode ? 'rgba(4,131,87,0.15)' : '#F0FFF4',
    },
    previewScroll: {
        marginBottom: 15,
        marginTop: 5,
    },
    previewContent: {
        paddingVertical: 5,
    },
    previewThumbWrapper: {
        marginRight: 12,
        position: 'relative',
    },
    previewThumb: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#048357',
    },
    removePreviewBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        borderRadius: 10,
    },
    divider: {
        height: 1,
        backgroundColor: isDarkMode ? '#334155' : '#D9D9D9',
        marginVertical: 20,
    },
    addonsContainer: {
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        borderRadius: 11,
        padding: 20,
        paddingBottom: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    addonSectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 15,
    },
    addonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    checkedBoxBig: {
        width: 24,
        height: 24,
        backgroundColor: '#6FCF45',
        borderRadius: 6,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uncheckedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#A0A0A0',
        marginRight: 10,
    },
    addonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#E2E8F0' : '#555555',
        flex: 1,
    },
    commentsLabel: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 8,
        marginTop: 10,
    },
    commentsContainer: {
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#D3DFDD',
    },
    commentsInput: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#02743F',
        height: 48,
        borderRadius: 24,
        width: 230,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 15,
    },
});

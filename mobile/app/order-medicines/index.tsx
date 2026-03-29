// Order Medicines Screen - Fully Responsive with ScrollView
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { locationService } from '@/services/device/locationService';
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { mediaService } from '@/services/api/mediaService';

// ─── Figma Assets ───
const imgBell = require('@/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png');
const cameraIcon = require('@/assets/images/288b8d22e862e8e7e85fb51ab6158d4b0fd84dcc.png');
const galleryIcon = require('@/assets/images/82b1e49607f9f5b0817c6d51de25f6b752ac4908.png');

export default function OrderMedicinesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [duration, setDuration] = useState('1 Month');
    const [address, setAddress] = useState('Fetching location...');
    const [isManualAddress, setIsManualAddress] = useState(false);
    const [autoRefill, setAutoRefill] = useState(true);
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [manualText, setManualText] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    
    // API & Init state
    const [cityId, setCityId] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [isLoadingInit, setIsLoadingInit] = useState(true);
    const [isBooking, setIsBooking] = useState(false);

    const openCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedImages([...selectedImages, result.assets[0].uri]);
        }
    };

    const openGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery access is required to choose photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

    React.useEffect(() => {
        (async () => {
            try {
                setIsLoadingInit(true);
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                } else {
                    setIsManualAddress(true);
                    setAddress('');
                }
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setCityId(profileRes.data.cityId);
                }
                const serviceRes = await apiClient.get<any[]>('/services');
                if (serviceRes.success && serviceRes.data) {
                    const svc = serviceRes.data.find((s: any) => s.slug === 'medicines');
                    if (svc) setServiceId(svc.id);
                }
            } catch (error) {
                console.log('Medicines init failed:', error);
                setIsManualAddress(true);
                setAddress('');
            } finally {
                setIsLoadingInit(false);
            }
        })();
    }, []);


    const handleBookService = async () => {
        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        try {
            setIsBooking(true);

            // Upload images first
            let uploadedImageUrls: string[] = [];
            if (selectedImages.length > 0) {
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'prescriptions');
            }

            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: new Date().toISOString(),
                addressLine: address || undefined,
                formDataJson: {
                    entryType: isManualEntry ? 'Manual Entry' : 'Prescription Upload',
                    manualText: isManualEntry ? manualText : undefined,
                    duration,
                    autoRefill,
                    attachments: uploadedImageUrls,
                    imageCount: uploadedImageUrls.length,
                },
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert('Order Failed', res.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Medicines booking error:', error);
            Alert.alert('Error', 'Failed to place order. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <View style={styles.screen}>
            {/* Dark green background covers top half */}
            <View style={[styles.headerBackground, { paddingTop: insets.top }]}>
                <StatusBar style="light" backgroundColor="#048357" />
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Order Medicines</Text>
                    <Text style={styles.headerSubtitle}>Upload prescription, we deliver to your door.</Text>
                </View>
            </View>

            {/* Back Button Overlay */}
            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { top: insets.top + 10 }]}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Main Content Area (Rounded Cream Box) */}
            <View style={styles.contentContainer}>
                {/* ─── ScrollView Added for Small Screens ─── */}
                <KeyboardAwareScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid
                    extraScrollHeight={20}
                >
                    <Text style={styles.sectionTitle}>Upload Prescription</Text>

                    {/* ─── Options Card 1: Camera ─── */}
                    <TouchableOpacity
                        style={[styles.uploadOptionCard, selectedImages.length > 0 && styles.uploadOptionCardActive]}
                        activeOpacity={0.7}
                        onPress={() => handleCapture('camera')}
                    >
                        <Image source={cameraIcon} style={styles.uploadIcon} resizeMode="contain" />
                        <View style={styles.uploadTextContainer}>
                            <Text style={styles.uploadMainText}>Camera</Text>
                            <Text style={styles.uploadSubText}>Take Photo</Text>
                        </View>
                        <Ionicons name={selectedImages.length > 0 ? "checkmark-circle" : "chevron-forward"} size={20} color={selectedImages.length > 0 ? "#048357" : "#898989"} />
                    </TouchableOpacity>

                    {/* ─── Options Card 2: Gallery ─── */}
                    <TouchableOpacity
                        style={[styles.uploadOptionCard, selectedImages.length > 0 && styles.uploadOptionCardActive]}
                        activeOpacity={0.7}
                        onPress={() => handleCapture('gallery')}
                    >
                        <Image source={galleryIcon} style={styles.uploadIcon} resizeMode="contain" />
                        <View style={styles.uploadTextContainer}>
                            <Text style={styles.uploadMainText}>Gallery</Text>
                            <Text style={styles.uploadSubText}>Choose Image</Text>
                        </View>
                        <Ionicons name={selectedImages.length > 0 ? "checkmark-circle" : "chevron-forward"} size={20} color={selectedImages.length > 0 ? "#048357" : "#898989"} />
                    </TouchableOpacity>

                    {/* ─── Selected Images Preview ─── */}
                    {selectedImages.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll} contentContainerStyle={styles.previewContent}>
                            {selectedImages.map((uri, index) => (
                                <View key={index} style={styles.previewThumbWrapper}>
                                    <Image source={{ uri }} style={styles.previewThumb} />
                                    <TouchableOpacity style={styles.removePreviewBtn} onPress={() => removeImage(index)}>
                                        <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* ─── Options Card 3: Manual Entry ─── */}
                    <TouchableOpacity
                        style={[styles.uploadOptionCard, isManualEntry && styles.uploadOptionCardActive]}
                        activeOpacity={0.7}
                        onPress={() => setIsManualEntry(!isManualEntry)}
                    >
                        {/* Simulated "Type" Icon (lines) */}
                        <View style={styles.typeIconBox}>
                            <View style={styles.typeIconLine} />
                            <View style={styles.typeIconLine} />
                        </View>
                        <View style={styles.uploadTextContainer}>
                            <Text style={styles.uploadMainText}>Type</Text>
                            <Text style={styles.uploadSubText}>Manual Entry</Text>
                        </View>
                        <Ionicons name={isManualEntry ? "close-circle" : "chevron-forward"} size={20} color={isManualEntry ? "#048357" : "#898989"} />
                    </TouchableOpacity>

                    {isManualEntry && (
                        <View style={styles.manualEntryContainer}>
                            <TextInput
                                style={styles.manualInput}
                                placeholder="Enter medicine names and quantities..."
                                placeholderTextColor="#898989"
                                multiline
                                value={manualText}
                                onChangeText={setManualText}
                            />
                        </View>
                    )}

                    {/* ─── Address Section ─── */}
                    <Text style={styles.addressLabel}>
                        <Text style={styles.addressLabelBold}>Address : </Text>
                        Update profile address
                    </Text>

                    <View style={[styles.uploadOptionCard, { marginBottom: 15 }]}>
                        <Ionicons name="location" size={24} color="#85C3A8" style={{ marginLeft: 2, marginRight: 15 }} />
                        <View style={styles.uploadTextContainer}>
                            {isManualAddress ? (
                                <TextInput
                                    style={[styles.addressText, { flex: 1 }]}
                                    placeholder="Enter your address manually"
                                    placeholderTextColor="#898989"
                                    value={address}
                                    onChangeText={setAddress}
                                />
                            ) : (
                                <Text style={styles.addressText} numberOfLines={1}>{address}</Text>
                            )}
                        </View>
                        <TouchableOpacity style={styles.editAddressButton} onPress={() => setIsManualAddress(true)}>
                            <Ionicons name="pencil-outline" size={14} color="#2F2F2F" />
                        </TouchableOpacity>
                    </View>

                    {/* ─── Auto-Refill Card ─── */}
                    <TouchableOpacity
                        style={[styles.autoRefillCard, !autoRefill && { opacity: 0.6, borderColor: '#AAAEAC' }]}
                        activeOpacity={0.7}
                        onPress={() => setAutoRefill(!autoRefill)}
                    >
                        <Ionicons name="notifications" size={30} color={autoRefill ? "#048357" : "#555555"} style={{ marginRight: 15 }} />
                        <View style={styles.uploadTextContainer}>
                            <View>
                                <Text style={styles.autoRefillTitle}>Auto - Refill</Text>
                                <Text style={styles.autoRefillDesc}>{autoRefill ? 'Remind me to re-order in 25 days.' : 'Click to enable reminders'}</Text>
                            </View>
                        </View>
                        <Ionicons name={autoRefill ? "checkbox" : "square-outline"} size={20} color={autoRefill ? "#048357" : "#898989"} />
                    </TouchableOpacity>

                    {/* ─── Duration Selection ─── */}
                    <Text style={styles.addressLabel}>
                        <Text style={styles.addressLabelBold}>Duration : </Text>
                        Select refill duration
                    </Text>
                    <View style={styles.durationContainer}>
                        <TouchableOpacity
                            style={[styles.durationButton, duration === '1 Month' && styles.durationButtonActive]}
                            onPress={() => setDuration('1 Month')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.durationText, duration === '1 Month' && styles.durationTextActive]}>1 Month</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.durationButton, duration === '3 Months' && styles.durationButtonActive]}
                            onPress={() => setDuration('3 Months')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.durationText, duration === '3 Months' && styles.durationTextActive]}>3 Months</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─── Place Order Button ─── */}
                    <TouchableOpacity
                        style={[styles.submitButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                        activeOpacity={0.8}
                        disabled={isBooking || isLoadingInit}
                        onPress={handleBookService}
                    >
                        {isBooking ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isLoadingInit ? 'Initializing...' : 'Place Order'}
                            </Text>
                        )}
                    </TouchableOpacity>

                </KeyboardAwareScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357', // Solid dark green from Figma behind
    },
    headerBackground: {
        backgroundColor: '#048357',
        alignItems: 'center',
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 24,
        color: '#FFFFFF',
        letterSpacing: -0.24,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#FFFFFF',
        letterSpacing: -0.24,
        textAlign: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 16,
        padding: 5,
        zIndex: 10,
    },

    /* ─── Main Content Container (Cream Box) ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Cream color
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden', // Clips the scrollview inside the rounded corners
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingTop: 30,
        paddingBottom: 50, // Extra padding so the bottom button doesn't hug the screen edge
    },

    /* ─── Section Header ─── */
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#2F2F2F',
        marginBottom: 20,
    },

    /* ─── Upload Option Cards ─── */
    uploadOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
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
    typeIconBox: {
        width: 31,
        height: 24,
        borderWidth: 1,
        borderColor: '#D3DFDD',
        borderRadius: 4,
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3,
    },
    typeIconLine: {
        width: 18,
        height: 2,
        backgroundColor: '#555555',
        borderRadius: 1,
    },
    uploadTextContainer: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
    },
    uploadMainText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
        minWidth: 65,
        marginRight: 8,
    },
    uploadSubText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#555555',
        flex: 1, // Ensures it takes remaining space properly
        flexShrink: 1, // Prevents overflow
    },

    /* ─── Address Section ─── */
    addressLabel: {
        marginTop: 15,
        marginBottom: 10,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
    },
    addressLabelBold: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
    },
    addressText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#898989',
        flex: 1,
    },
    editAddressButton: {
        width: 27,
        height: 27,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#AAAEAC',
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* ─── Auto Refill Card ─── */
    autoRefillCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#02743F',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 18,
        marginTop: 5,
        marginBottom: 25,
        shadowColor: '#02743F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 3,
    },
    autoRefillTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        flexShrink: 1,
    },
    autoRefillDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#898989',
        marginTop: 2,
        flexShrink: 1,
    },

    /* ─── Duration Selection ─── */
    durationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        gap: 10, // Uses standard flex gap for perfect spacing
    },
    durationButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D3DFDD',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    durationButtonActive: {
        borderColor: '#048357',
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
    },
    durationText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#555555',
    },
    durationTextActive: {
        color: '#048357',
    },

    /* ─── Place Order Button ─── */
    submitButton: {
        backgroundColor: '#02743F',
        height: 48, // Slightly taller for better touch area
        borderRadius: 24,
        width: '100%', // Makes button perfectly responsive on all widths
        maxWidth: 340, // Stops it from getting awkwardly wide on tablets
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 15,
    },
    /* ─── New Interactive Styles ─── */
    uploadOptionCardActive: {
        borderColor: '#048357',
        borderWidth: 1.5,
        backgroundColor: '#F0FFF4',
    },
    manualEntryContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#048357',
    },
    manualInput: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    /* ─── Preview Styles ─── */
    previewScroll: {
        marginBottom: 15,
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
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
    },
});
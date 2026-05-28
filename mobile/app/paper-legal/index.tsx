import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, TextInput, Alert, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';

// ─── Figma Assets ───
const imllustration = require('@/assets/images/49fa5256c84b3ee062131d88f5ae26383f5d5257.png'); // The lawyer/assistant illustration

export default function PaperLegalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const [selectedService, setSelectedService] = useState('Digital Life Certificate');
    const [details, setDetails] = useState('');
    
    const { cityId, serviceId, serviceName, servicePrice, address, isLoading: isLoadingInit } = useServiceInitialization('paper-legal');
    
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [isBooking, setIsBooking] = React.useState(false);

    const handleBookService = async () => {
        if (!selectedService || !details || !selectedDate || !address) {
            Alert.alert('Missing Info', 'Please select a service, describe details, and select a timing.');
            return;
        }

        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }

        try {
            setIsBooking(true);

            // Upload documents before navigating to checkout
            const uploadedImageUrls = selectedImages.length > 0
                ? await mediaService.uploadMultipleMedia(selectedImages, 'paper-legal')
                : [];

            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: selectedDate.toISOString(),
                addressLine: address,
                formDataJson: {
                    selectedService,
                    details,
                    attachments: uploadedImageUrls,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: { bookingPayload, amount: String(servicePrice), label: serviceName || 'Paperwork & Legal', ...(params.subscriptionId && { subscriptionId: params.subscriptionId }) },
            });
        } catch (error) {
            console.error('Paper-legal error:', error);
            Alert.alert('Error', 'Something went wrong. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    const styles = makeStyles(isDarkMode);

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Paper and Legal</Text>
                </View>
                <Text style={styles.headerSubtitle}>Pension, Life Certificates, and{'\n'}Property work.</Text>
            </View>

            {/* Main Content Area (Rounded Cream Box) */}
            <View style={styles.contentContainer}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                    {/* ─── Select Service ─── */}
                    <Text style={styles.sectionTitle}>Select Service</Text>

                    <View style={styles.serviceCard}>

                        {/* Option 1: Digital Life Certificate */}
                        <TouchableOpacity style={styles.optionRow} onPress={() => setSelectedService('Digital Life Certificate')}>
                            <View style={selectedService === 'Digital Life Certificate' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedService === 'Digital Life Certificate' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.optionMainText}>Digital life Certificate <Text style={styles.optionSubText}>(Jeevan Pramaan - Home visit)</Text></Text>
                        </TouchableOpacity>

                        {/* Option 2: Bank KYC */}
                        <TouchableOpacity style={styles.optionRow} onPress={() => setSelectedService('Bank KYC Update')}>
                            <View style={selectedService === 'Bank KYC Update' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedService === 'Bank KYC Update' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.optionMainText}>Bank KYC Update <Text style={styles.optionSubText}>(Assistance)</Text></Text>
                        </TouchableOpacity>

                        {/* Option 3: Will Registration */}
                        <TouchableOpacity style={styles.optionRow} onPress={() => setSelectedService('Will Registration')}>
                            <View style={selectedService === 'Will Registration' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedService === 'Will Registration' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.optionMainText}>Will Registration <Text style={styles.optionSubText}>(Lawyer Connect)</Text></Text>
                        </TouchableOpacity>

                        {/* Option 4: Govt ID Update */}
                        <TouchableOpacity style={styles.optionRow} onPress={() => setSelectedService('Govt ID Update')}>
                            <View style={selectedService === 'Govt ID Update' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedService === 'Govt ID Update' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.optionMainText}>Govt ID Update <Text style={styles.optionSubText}>(adhar/Pan fix)</Text></Text>
                        </TouchableOpacity>

                    </View>

                    {/* ─── Details Text Area ─── */}
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.textAreaContainer}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Describe your requirement or what needs signatures..."
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            placeholderTextColor="#898989"
                            value={details}
                            onChangeText={setDetails}
                        />
                    </View>

                    {/* ─── Upload Documents ─── */}
                    <ImageUploadBox
                        title="Upload Relevant Documents"
                        subtitle="Upload IDs, previous certificates, or legal paperwork (JPG, PNG or PDF)"
                        onImagesChange={setSelectedImages}
                        maxImages={5}
                    />

                    {/* ─── Schedule Visit ─── */}
                    <CustomDateTimePicker
                        label="When?"
                        value={selectedDate}
                        onDateChange={setSelectedDate}
                    />

                    {/* ─── Book Assistant Button ─── */}
                    <TouchableOpacity
                        style={[styles.submitButton, (isBooking || isLoadingInit) && { opacity: 0.7 }]}
                        activeOpacity={0.8}
                        disabled={isBooking || isLoadingInit}
                        onPress={handleBookService}
                    >
                        <Text style={styles.submitButtonText}>{isLoadingInit ? 'Initializing...' : isBooking ? 'Processing...' : 'Book Assistant'}</Text>
                    </TouchableOpacity>

                    {/* ─── Ayuxa Care Illustration Bottom ─── */}
                    <View style={styles.illustrationContainer}>
                        <Image source={imllustration} style={styles.illustration} resizeMode="contain" />
                    </View>

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

    /* ─── Header ─── */
    headerContainer: {
        backgroundColor: '#048357',
        alignItems: 'center',
        paddingVertical: 15,
        paddingBottom: 45,
        paddingHorizontal: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 8,
    },
    backButton: {
        padding: 5,
        marginRight: 12,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 24,
        color: '#FFFFFF',
        letterSpacing: -0.24,
        flex: 1,
    },
    headerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: '#D9D9D9',
        textAlign: 'center',
        letterSpacing: -0.24,
        lineHeight: 22,
    },

    /* ─── Main Content Container (Cream Box) ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: isDarkMode ? '#0F172A' : '#FDFDE8',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        paddingTop: 30, // Space from top inside cream box
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    /* ─── Section Header ─── */
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 15,
        marginLeft: 5,
    },

    /* ─── Options Card ─── */
    serviceCard: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: 25,
        paddingVertical: 25,
        paddingHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkIcon: {
        width: 18,
        height: 18,
        marginRight: 10,
    },
    optionMainText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        flex: 1,
        flexWrap: 'wrap',
        lineHeight: 18,
    },
    optionSubText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: 'normal',
        fontSize: 11.5,
    },
    radioSelected: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#048357',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    radioUnselected: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#D9D9D9',
        marginRight: 10,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#048357',
    },

    /* ─── Inputs & UI Components ─── */
    textAreaContainer: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#E5E5E5',
        marginBottom: 20,
        padding: 12,
        minHeight: 100,
    },
    textArea: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },

    /* ─── Upload Card ─── */
    uploadCard: {
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    uploadDashedBox: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#048357',
        borderRadius: 12,
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.03)',
    },
    uploadCloudIcon: {
        marginBottom: 8,
    },
    uploadTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
        marginBottom: 4,
    },
    uploadSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#898989',
        marginBottom: 12,
    },
    uploadButton: {
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    uploadButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#02743F',
        textTransform: 'uppercase',
    },

    /* ─── Schedule Container ─── */
    scheduleContainer: {
        marginBottom: 35,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        paddingHorizontal: 15,
        paddingVertical: 14,
    },
    datePickerText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#555555',
    },

    /* ─── Submit Button ─── */
    submitButton: {
        backgroundColor: '#02743F',
        height: 45,
        borderRadius: 22.5,
        width: 281,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 14,
    },

    /* ─── Illustration ─── */
    illustrationContainer: {
        alignItems: 'center',
        marginTop: 10,
        borderRadius: 50,
        overflow: 'hidden',
        alignSelf: 'center',
    },
    illustration: {
        width: 331,
        height: 221,
        borderRadius: 50,
    },
});

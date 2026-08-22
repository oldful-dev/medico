import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ActivityIndicator, KeyboardAvoidingView, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { useTranslation } from 'react-i18next';
import { useAddress } from '@/context/AddressContext';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';


// ─── Figma Assets ───
const imgWheelchair = require('@/assets/images/be69e88a2a74b15eb189dce875fc4395704fc6bb.png');
const imgHospitalBed = require('@/assets/images/a0ea0f0ea3ae64a73040f3c67ee409ba7a77d4d1.png');
const imgOxygen = require('@/assets/images/d05fd81c3840f7904feae65b06c33bf8b18f55b6.png');
const imgWalker = require('@/assets/images/00863cfbd96593a21fa1f5b136210f8574404c11.png');



export default function MedicalEquipmentScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const { activeAddress } = useAddress();
    const [selectedEquipment, setSelectedEquipment] = useState('wheelchair');
    const [otherType, setOtherType] = useState('');
    const [selectedDuration, setSelectedDuration] = useState('Monthly');
    const [customDuration, setCustomDuration] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [isBooking, setIsBooking] = useState(false);
    // selectedAddress now seeds from — and stays in sync with — the
    // centralized Active Service Location.
    const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(
        activeAddress ? {
            id: activeAddress.id,
            line1: activeAddress.line1,
            line2: activeAddress.line2,
            cityName: activeAddress.cityName,
            pincode: activeAddress.pincode,
            landmark: activeAddress.landmark,
            latitude: activeAddress.latitude,
            longitude: activeAddress.longitude,
            state: activeAddress.state,
        } : null
    );
    const [landmark, setLandmark] = useState('');
    const [landmarkInitialized, setLandmarkInitialized] = useState(false);

    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; iconName: string }>({
        visible: false, title: '', message: '', iconName: 'warning-outline',
    });
    const triggerAlert = (title: string, message: string, iconName = 'warning-outline') => {
        setAlertConfig({ visible: true, title, message, iconName });
    };

    const { cityId, serviceId, serviceName, servicePrice, isLoading: isLoadingInit } = useServiceInitialization('medical-equipment');

    // Follow the centralized active address whenever it changes elsewhere
    // in the app, unless the user has already made their own pick here.
    React.useEffect(() => {
        if (!activeAddress) return;
        setSelectedAddress(prev => {
            if (prev && prev.id === activeAddress.id && prev.line1 === activeAddress.line1) return prev;
            return {
                id: activeAddress.id,
                line1: activeAddress.line1,
                line2: activeAddress.line2,
                cityName: activeAddress.cityName,
                pincode: activeAddress.pincode,
                landmark: activeAddress.landmark,
                latitude: activeAddress.latitude,
                longitude: activeAddress.longitude,
                state: activeAddress.state,
            };
        });
        if (!landmarkInitialized && activeAddress.landmark) {
            setLandmark(activeAddress.landmark);
            setLandmarkInitialized(true);
        }
    }, [activeAddress, landmarkInitialized]);

    const handleAddressChange = (addr: AddressData) => {
        setSelectedAddress(addr);
        if (addr.landmark) setLandmark(addr.landmark);
        setLandmarkInitialized(true);
        // AddressPickerSection already calls selectActiveAddress internally.
    };

    const isFormValid = React.useMemo(() => {
        return !!(
            selectedEquipment &&
            (selectedEquipment !== 'other' || otherType.trim()) &&
            selectedDuration &&
            (selectedDuration !== 'Custom' || customDuration.trim()) &&
            selectedDate &&
            selectedAddress?.line1 && selectedAddress.line1.trim().length >= 5
        );
    }, [selectedEquipment, otherType, selectedDuration, customDuration, selectedDate, selectedAddress]);

    const handleBookService = async () => {
        if (!selectedEquipment) {
            triggerAlert(t('common.required') || 'Required', t('medical_equipment.select_equipment', 'Please select equipment type.'));
            return;
        }
        if (selectedEquipment === 'other' && !otherType.trim()) {
            triggerAlert(t('common.required') || 'Required', t('medical_equipment.alert_other_required', 'Please specify the equipment required.'));
            return;
        }
        if (!selectedDuration) {
            triggerAlert(t('common.required') || 'Required', t('medical_equipment.select_duration', 'Please select duration.'));
            return;
        }
        if (selectedDuration === 'Custom' && !customDuration.trim()) {
            triggerAlert(t('common.required') || 'Required', t('medical_equipment.alert_custom_duration_required', 'Please enter custom duration.'));
            return;
        }
        if (!selectedDate) {
            triggerAlert(t('common.required') || 'Required', t('medical_equipment.select_date', 'Please select date and time.'));
            return;
        }
        if (!selectedAddress?.line1 || selectedAddress.line1.trim().length < 5) {
            triggerAlert(t('common.required') || 'Required', t('service_detail.address_required', 'Please provide a valid address.'));
            return;
        }
        if (!cityId || !serviceId) {
            triggerAlert(t('common.error') || 'Error', t('booking.init_incomplete') || 'Service initialization failed.');
            return;
        }
        try {
            setIsBooking(true);

            // Booking location comes from the address the user actually
            // confirmed on screen — never a fresh device GPS read.
            const addressLine = [selectedAddress.line1, selectedAddress.line2].filter(Boolean).join(', ');

            // Navigate to checkout — booking created inside checkout after payment succeeds
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
                addressLine: addressLine || undefined,
                landmark: landmark.trim() || undefined,
                latitude: selectedAddress?.latitude,
                longitude: selectedAddress?.longitude,
                formDataJson: {
                    equipment: selectedEquipment === 'other' ? `Other: ${otherType}` : selectedEquipment,
                    rentalDuration: selectedDuration === 'Custom' ? customDuration : selectedDuration,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: { bookingPayload, amount: String(servicePrice), label: serviceName, ...(params.subscriptionId && { subscriptionId: params.subscriptionId }) },
            });
        } catch (error) {
            console.error('Equipment error:', error);
            triggerAlert(t('common.error') || 'Error', t('booking.something_wrong') || 'Something went wrong. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={dynamicStyles.screen}>
            <View style={{ height: insets.top, backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED' }} />
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            <View style={dynamicStyles.container}>
                <View style={dynamicStyles.headerContainer}>
                    <View style={dynamicStyles.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F1F5F9' : '#02743F'} />
                        </TouchableOpacity>
                        <View style={dynamicStyles.headerTextCol}>
                            <Text style={dynamicStyles.headerTitle}>{t('medical_equipment.header')}</Text>
                            <Text style={dynamicStyles.headerSubtitle}>{t('medical_equipment.subtitle')}</Text>
                        </View>
                    </View>
                </View>

                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                    {/* ─── Select Equipment Section ─── */}
                    <View style={dynamicStyles.sectionCardTintedDark}>
                        <Text style={dynamicStyles.sectionTitle}>{t('medical_equipment.equipment_section')}</Text>

                        <View style={dynamicStyles.equipmentGrid}>
                            {/* Wheelchair */}
                            <TouchableOpacity
                                style={[dynamicStyles.equipmentCard, selectedEquipment === 'wheelchair' && dynamicStyles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('wheelchair')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgWheelchair} style={dynamicStyles.equipmentImage} resizeMode="contain" />
                                <Text style={dynamicStyles.equipmentName}>{t('medical_equipment.wheelchair')}</Text>
                                <Text style={dynamicStyles.equipmentDesc}>{t('medical_equipment.wheelchair_desc')}</Text>
                            </TouchableOpacity>

                            {/* Hospital Bed */}
                            <TouchableOpacity
                                style={[dynamicStyles.equipmentCard, selectedEquipment === 'bed' && dynamicStyles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('bed')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgHospitalBed} style={[dynamicStyles.equipmentImage, dynamicStyles.bedImage]} resizeMode="contain" />
                                <Text style={dynamicStyles.equipmentName}>{t('medical_equipment.hospital_bed')}</Text>
                                <Text style={dynamicStyles.equipmentDesc}>{t('medical_equipment.hospital_bed_desc')}</Text>
                            </TouchableOpacity>

                            {/* Oxygen Concentrator */}
                            <TouchableOpacity
                                style={[dynamicStyles.equipmentCard, selectedEquipment === 'oxygen' && dynamicStyles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('oxygen')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgOxygen} style={[dynamicStyles.equipmentImage, dynamicStyles.oxygenImage]} resizeMode="contain" />
                                <Text style={[dynamicStyles.equipmentName, dynamicStyles.oxygenText]}>{t('medical_equipment.oxygen')}</Text>
                            </TouchableOpacity>

                            {/* Walker/stick */}
                            <TouchableOpacity
                                style={[dynamicStyles.equipmentCard, selectedEquipment === 'walker' && dynamicStyles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('walker')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgWalker} style={[dynamicStyles.equipmentImage, dynamicStyles.walkerImage]} resizeMode="contain" />
                                <Text style={dynamicStyles.equipmentName}>{t('medical_equipment.walker')}</Text>
                            </TouchableOpacity>

                            {/* Other */}
                            <TouchableOpacity
                                style={[dynamicStyles.equipmentCard, selectedEquipment === 'other' && dynamicStyles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('other')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="help-circle-outline" size={32} color={colors.primary} style={{ marginTop: 8, marginBottom: 2 }} />
                                <Text style={dynamicStyles.equipmentName}>{t('medical_equipment.other')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Conditional input for Other Type */}
                    {selectedEquipment === 'other' && (
                        <View style={dynamicStyles.sectionCardTintedLight}>
                            <Text style={dynamicStyles.sectionTitle}>{t('medical_equipment.other_type')}</Text>
                            <View style={dynamicStyles.inputCard}>
                                <TextInput
                                    style={dynamicStyles.textInput}
                                    placeholder={t('medical_equipment.other_placeholder')}
                                    placeholderTextColor={isDarkMode ? '#94A3B8' : '#888888'}
                                    value={otherType}
                                    onChangeText={setOtherType}
                                />
                            </View>
                        </View>
                    )}

                    {/* ─── Set Rental Duration Section ─── */}
                    <View style={dynamicStyles.sectionCardTintedLight}>
                        <Text style={dynamicStyles.sectionTitle}>{t('medical_equipment.duration')}</Text>

                        <TouchableOpacity style={dynamicStyles.radioRow} onPress={() => setSelectedDuration('Weekly')} activeOpacity={0.7}>
                            <Ionicons name={selectedDuration === 'Weekly' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedDuration === 'Weekly' ? colors.primary : (isDarkMode ? '#64748B' : '#AAAEAC')} />
                            <Text style={dynamicStyles.radioLabel}>{t('medical_equipment.weekly')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.radioRow} onPress={() => setSelectedDuration('Monthly')} activeOpacity={0.7}>
                            <Ionicons name={selectedDuration === 'Monthly' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedDuration === 'Monthly' ? colors.primary : (isDarkMode ? '#64748B' : '#AAAEAC')} />
                            <Text style={dynamicStyles.radioLabel}>{t('medical_equipment.monthly')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.radioRow} onPress={() => setSelectedDuration('Custom')} activeOpacity={0.7}>
                            <Ionicons name={selectedDuration === 'Custom' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedDuration === 'Custom' ? colors.primary : (isDarkMode ? '#64748B' : '#AAAEAC')} />
                            <Text style={dynamicStyles.radioLabel}>{t('medical_equipment.custom')}</Text>
                        </TouchableOpacity>

                        {/* Conditional Custom Duration text input field */}
                        {selectedDuration === 'Custom' && (
                            <View style={[dynamicStyles.inputCard, { marginTop: 10 }]}>
                                <TextInput
                                    style={dynamicStyles.textInput}
                                    placeholder={t('medical_equipment.custom_duration_placeholder')}
                                    placeholderTextColor={isDarkMode ? '#94A3B8' : '#888888'}
                                    value={customDuration}
                                    onChangeText={setCustomDuration}
                                />
                            </View>
                        )}
                    </View>

                    {/* ─── Schedule Pick-up Section ─── */}
                    <View style={dynamicStyles.sectionCardTransparent}>
                        <CustomDateTimePicker
                            label={t('medical_equipment.when')}
                            value={selectedDate}
                            onDateChange={setSelectedDate}
                        />
                    </View>

                    {/* ─── Confirm Address Card ─── */}
                    <View>
                        <AddressPickerSection
                            selectedAddress={selectedAddress}
                            onAddressChange={handleAddressChange}
                            title={t('booking.confirm_address')}
                            showPhoneField={false}
                            showLandmarkField={true}
                            landmark={landmark}
                            onLandmarkChange={setLandmark}
                            allowManualEntry={true}
                        />
                    </View>

                    {/* ─── Confirm Rental Button ─── */}
                    <View style={dynamicStyles.buttonContainer}>
                        <TouchableOpacity
                            style={[dynamicStyles.confirmButton, (!isFormValid || isBooking || isLoadingInit) && { opacity: 0.6 }]}
                            activeOpacity={isFormValid && !isBooking && !isLoadingInit ? 0.8 : 0.5}
                            disabled={!isFormValid || isBooking || isLoadingInit}
                            onPress={handleBookService}
                        >
                            {isLoadingInit ? (
                                <Text style={dynamicStyles.confirmButtonText}>{t('common.initializing')}</Text>
                            ) : isBooking ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={dynamicStyles.confirmButtonText}>{t('medical_equipment.confirm_rental')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
            </View>

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                iconName={alertConfig.iconName as any}
                buttonText="OK"
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: isDarkMode ? '#0F172A' : '#FAF7ED',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 30,
        paddingBottom: 40,
    },

    headerContainer: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFE3',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
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
        color: isDarkMode ? '#F1F5F9' : '#02743F',
        letterSpacing: -0.24,
    },
    headerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#94A3B8' : '#2F2F2F',
        letterSpacing: -0.24,
    },

    /* ─── Section Boxes ─── */
    sectionCardTintedDark: {
        backgroundColor: 'rgba(222, 222, 222, 0.24)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
    },
    sectionCardTintedLight: {
        backgroundColor: 'rgba(217, 217, 217, 0.15)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    sectionCardTransparent: {
        // No background here, just padding for layout
        marginBottom: 35,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 12,
    },

    /* ─── Equipment Grid ─── */
    equipmentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
        marginTop: 10,
    },
    equipmentCard: {
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        borderRadius: 8,
        width: '48%', // Allow wrapping nicely on narrow screens
        minWidth: 70,
        height: 85,
        alignItems: 'center',
        paddingTop: 4,
        paddingHorizontal: 2,
    },
    equipmentCardActive: {
        borderWidth: 1,
        borderColor: '#02743F',
    },
    equipmentImage: {
        width: 48,
        height: 48,
        marginBottom: 2,
    },
    bedImage: {
        width: 55,
        height: 40,
        marginTop: 8,
        marginBottom: 2,
    },
    oxygenImage: {
        width: 38,
        height: 38,
        marginTop: 12,
        marginBottom: 4,
    },
    walkerImage: {
        width: 25,
        height: 43,
        marginTop: 8,
        marginBottom: -1,
    },
    equipmentName: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 10,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        textAlign: 'center',
    },
    oxygenText: {
        fontSize: 9,
        lineHeight: 10,
    },
    equipmentDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 8,
        color: isDarkMode ? '#AAAAAA' : '#777777',
        textAlign: 'center',
    },

    /* ─── Radio Buttons ─── */
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    radioLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginLeft: 12,
    },

    /* ─── Schedule Area ─── */
    scheduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    scheduleBox: {
        flex: 1,
        backgroundColor: isDarkMode ? '#1E293B' : 'rgba(255, 253, 253, 0.26)',
        borderWidth: 2,
        borderColor: isDarkMode ? '#475569' : '#898989',
        borderRadius: 10,
        height: 75,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8, // Gap between boxes
    },
    scheduleBoxActive: {
        borderColor: isDarkMode ? '#34D399' : '#02743F', // Green border for selected
    },
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    scheduleIcon: {
        width: 18,
        height: 18,
        marginRight: 6,
    },
    scheduleIconClock: {
        width: 24,
        height: 24,
        marginRight: 6,
    },
    schedulePrimaryText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#555555',
    },
    schedulePrimaryTextClock: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 18, // Time is larger
        color: isDarkMode ? '#F1F5F9' : '#555555',
        lineHeight: 22,
    },
    scheduleAmPm: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#94A3B8' : '#777777',
    },
    scheduleSecondaryText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#CBD5E1' : '#555555',
    },

    /* ─── Main Button ─── */
    buttonContainer: {
        alignItems: 'center',
        marginBottom: 35,
    },
    confirmButton: {
        backgroundColor: '#02743F',
        width: 230,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FAF7ED',
    },
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 53,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#D3DFDD',
    },
    textInput: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },
});

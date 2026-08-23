import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, TextInput, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { useAddress } from '@/context/AddressContext';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';
import { useTranslation } from 'react-i18next';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';


// ─── Figma Assets ───
const imgThali = require('@/assets/images/6fdd60a0eb22e90770fb958a6ddcf54c1c9dc6b6.png'); // Meal image
const imgCheckmark = require('@/assets/images/019640d27de157c119b045c46aae6a6559dd3a79.png'); // Green Check Circle

export default function MealServiceScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    const { activeAddress } = useAddress();

    const [mealType, setMealType] = useState('Home Style');
    const [subMode, setSubMode] = useState('Monthly Subscription');
    const [noOnionGarlic, setNoOnionGarlic] = useState(false);
    const [spicy, setSpicy] = useState(false);
    const [otherReq, setOtherReq] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [landmark, setLandmark] = useState('');
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
    const [landmarkInitialized, setLandmarkInitialized] = useState(false);

    // Global Initialization
    const { cityId, serviceId, serviceName, servicePrice, dbService, isLoading: isLoadingInit } = useServiceInitialization('meal-service');
    const [isBooking, setIsBooking] = useState(false);

    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; iconName: string }>({
        visible: false, title: '', message: '', iconName: 'warning-outline',
    });
    const triggerAlert = (title: string, message: string, iconName = 'warning-outline') => {
        setAlertConfig({ visible: true, title, message, iconName });
    };

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

    const isFormValid = React.useMemo(() => {
        return !!(
            mealType &&
            subMode &&
            selectedDate &&
            selectedAddress?.line1 && selectedAddress.line1.trim().length >= 5
        );
    }, [mealType, subMode, selectedDate, selectedAddress]);

    const handleBookService = async () => {
        if (!mealType) {
            triggerAlert(t('common.required') || 'Required', t('meal_service.meal_type_required', 'Please select a meal type.'));
            return;
        }
        if (!subMode) {
            triggerAlert(t('common.required') || 'Required', t('meal_service.mode_required', 'Please select subscription mode.'));
            return;
        }
        if (!selectedDate) {
            triggerAlert(t('common.required') || 'Required', t('medical_equipment.select_date', 'Please select date and time.'));
            return;
        }
        if (!selectedAddress?.line1 || selectedAddress.line1.trim().length < 5) {
            triggerAlert(t('common.required') || 'Required', t('errors.address_required', 'Please confirm your delivery address.'));
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
                landmark: landmark || undefined,
                latitude: selectedAddress.latitude,
                longitude: selectedAddress.longitude,
                formDataJson: {
                    mealType,
                    subscriptionMode: subMode,
                    noOnionGarlic,
                    spicy,
                    otherReq: otherReq || undefined,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: String(servicePrice),
                    label: serviceName || 'Meal Service',
                    checkoutGroup: dbService?.checkoutGroup || 'D',
                    paymentMode: dbService?.paymentMode || 'INQUIRY',
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
                },
            });
        } catch (error) {
            console.error('Meal service error:', error);
            triggerAlert(t('common.error') || 'Error', t('booking.something_wrong') || 'Something went wrong. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };
    const dynamicStyles = makeStyles(isDarkMode);

    const CheckedRadio = () => (
        <View style={dynamicStyles.radioContainer}>
            <Image source={imgCheckmark} style={dynamicStyles.checkedRadioIcon} />
        </View>
    );

    const UncheckedRadio = () => (
        <View style={dynamicStyles.radioContainer}>
            <View style={dynamicStyles.uncheckedRadioCircle} />
        </View>
    );

    const CheckedSolidRadio = () => (
        <View style={dynamicStyles.radioContainer}>
            <View style={dynamicStyles.solidCheckedRadio} />
        </View>
    );

    return (
        <View style={dynamicStyles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={dynamicStyles.header}>
                <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={dynamicStyles.headerTitle}>{t('meal_service.header')}</Text>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                {/* ─── Top Meal Selection Card ─── */}
                <View style={dynamicStyles.mealSelectionCard}>
                    <View style={dynamicStyles.mealOptionsContainer}>

                        <TouchableOpacity style={dynamicStyles.mealOptionItem} onPress={() => setMealType('Diabetic Friendly')} activeOpacity={0.7}>
                            {mealType === 'Diabetic Friendly' ? <CheckedRadio /> : <UncheckedRadio />}
                            <View>
                                <Text style={dynamicStyles.mealOptionTitle}>{t('meal_service.diabetic_title')}</Text>
                                <Text style={dynamicStyles.mealOptionDesc}>{t('meal_service.diabetic_desc')}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.mealOptionItem} onPress={() => setMealType('Home Style')} activeOpacity={0.7}>
                            {mealType === 'Home Style' ? <CheckedRadio /> : <UncheckedRadio />}
                            <View>
                                <Text style={dynamicStyles.mealOptionTitle}>{t('meal_service.home_style_title')}</Text>
                                <Text style={dynamicStyles.mealOptionDesc}>{t('meal_service.home_style_desc')}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.mealOptionItem} onPress={() => setMealType('Soft Food')} activeOpacity={0.7}>
                            {mealType === 'Soft Food' ? <CheckedRadio /> : <UncheckedRadio />}
                            <View>
                                <Text style={dynamicStyles.mealOptionTitle}>{t('meal_service.soft_food_title')}</Text>
                                <Text style={dynamicStyles.mealOptionDesc}>{t('meal_service.soft_food_desc')}</Text>
                            </View>
                        </TouchableOpacity>

                    </View>

                    {/* Right side Image & Decoration */}
                    <View style={dynamicStyles.mealImageContainer}>
                        <Image source={imgThali} style={dynamicStyles.mealImage} resizeMode="contain" />
                    </View>

                    {/* Dots indicator at bottom */}
                    <View style={dynamicStyles.paginationDots}>
                        <View style={[dynamicStyles.dot, mealType === 'Diabetic Friendly' ? dynamicStyles.dotActive : dynamicStyles.dotInactive]} />
                        <View style={[dynamicStyles.dot, mealType === 'Home Style' ? dynamicStyles.dotActive : dynamicStyles.dotInactive]} />
                        <View style={[dynamicStyles.dot, mealType === 'Soft Food' ? dynamicStyles.dotActive : dynamicStyles.dotInactive]} />
                    </View>
                </View>

                {/* ─── Subscription Mode ─── */}
                <View>
                    <Text style={dynamicStyles.sectionTitle}>{t('meal_service.subscription_mode')}</Text>
                    <View style={dynamicStyles.sectionCard}>
                        <TouchableOpacity style={dynamicStyles.optionRow} onPress={() => setSubMode('Trial')} activeOpacity={0.7}>
                            {subMode === 'Trial' ? <CheckedSolidRadio /> : <UncheckedRadio />}
                            <Text style={dynamicStyles.optionMainText}>{t('meal_service.trial')}<Text style={dynamicStyles.optionSubText}> {t('meal_service.trial_days')}</Text></Text>
                        </TouchableOpacity>
                        <View style={{ height: 18 }} />
                        <TouchableOpacity style={dynamicStyles.optionRow} onPress={() => setSubMode('Monthly Subscription')} activeOpacity={0.7}>
                            {subMode === 'Monthly Subscription' ? <CheckedSolidRadio /> : <UncheckedRadio />}
                            <Text style={dynamicStyles.optionMainText}>{t('meal_service.monthly')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── Dietary Preferences ─── */}
                <Text style={dynamicStyles.sectionTitle}>{t('meal_service.dietary')}</Text>
                <View style={dynamicStyles.sectionCard}>

                    <TouchableOpacity style={dynamicStyles.preferenceRow} onPress={() => setNoOnionGarlic(!noOnionGarlic)} activeOpacity={0.7}>
                        <View style={dynamicStyles.switchBox}>
                            {noOnionGarlic ? <Image source={imgCheckmark} style={dynamicStyles.checkedSwitchIcon} /> : <View style={dynamicStyles.uncheckedRadioCircle} />}
                        </View>
                        <Text style={dynamicStyles.preferenceText}>{t('meal_service.no_onion_garlic')}</Text>
                    </TouchableOpacity>

                    <View style={{ height: 16 }} />

                    <TouchableOpacity style={dynamicStyles.preferenceRow} onPress={() => setSpicy(!spicy)} activeOpacity={0.7}>
                        <View style={dynamicStyles.switchBox}>
                            {spicy ? <Image source={imgCheckmark} style={dynamicStyles.checkedSwitchIcon} /> : <View style={dynamicStyles.uncheckedRadioCircle} />}
                        </View>
                        <Text style={dynamicStyles.preferenceText}>{t('meal_service.spicy')}</Text>
                    </TouchableOpacity>

                </View>

                {/* ─── Scheduling ─── */}
                <View style={dynamicStyles.sectionCardTransparent}>
                    <CustomDateTimePicker
                        label={t('medical_equipment.when')}
                        value={selectedDate}
                        onDateChange={setSelectedDate}
                    />
                </View>

                {/* ─── Something Else? ─── */}
                <Text style={dynamicStyles.sectionTitle}>{t('meal_service.other')}</Text>
                <View style={[dynamicStyles.textAreaContainer, { paddingHorizontal: 0 }]}>
                    <TextInput
                        style={[dynamicStyles.textAreaPlaceholder, { flex: 1, paddingHorizontal: 15 }]}
                        placeholder={t('meal_service.other_placeholder')}
                        placeholderTextColor="#898989"
                        value={otherReq}
                        onChangeText={setOtherReq}
                    />
                </View>

                {/* ─── Location UI Section ─── */}
                <View>
                    <AddressPickerSection
                        selectedAddress={selectedAddress}
                        onAddressChange={(addr) => {
                            setSelectedAddress(addr);
                            if (addr.landmark) setLandmark(addr.landmark);
                            setLandmarkInitialized(true);
                            // AddressPickerSection already calls selectActiveAddress internally.
                        }}
                        title={t('order_medicines.address_label')}
                        showPhoneField={false}
                        showLandmarkField={true}
                        landmark={landmark}
                        onLandmarkChange={setLandmark}
                        allowManualEntry={true}
                    />
                </View>

                {/* ─── Action Button ─── */}
                <TouchableOpacity
                    style={[dynamicStyles.submitButton, (!isFormValid || isBooking || isLoadingInit) && { opacity: 0.6 }]}
                    activeOpacity={isFormValid && !isBooking && !isLoadingInit ? 0.8 : 0.5}
                    disabled={!isFormValid || isBooking || isLoadingInit}
                    onPress={handleBookService}
                >
                    {isLoadingInit ? (
                        <Text style={dynamicStyles.submitButtonText}>{t('common.initializing')}</Text>
                    ) : isBooking ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={dynamicStyles.submitButtonText}>{t('meal_service.request_tiffin')}</Text>
                    )}
                </TouchableOpacity>

            </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 15,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FAF7ED',
        textAlign: 'left', marginLeft: 12,
        letterSpacing: -0.24,
    },
    scrollContent: {
        paddingHorizontal: 15,
        paddingTop: 20,
        paddingBottom: 40,
    },

    /* ─── Top Meal Selection Card ─── */
    mealSelectionCard: {
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        borderRadius: 10,
        padding: 18,
        paddingTop: 20,
        marginBottom: 25,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 5,
        minHeight: 182,
        position: 'relative',
    },
    mealOptionsContainer: {
        flex: 1,
        zIndex: 2,
    },
    mealOptionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    mealOptionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        lineHeight: 20,
    },
    mealOptionDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#CCCCCC' : '#777777',
        marginTop: 2,
    },
    mealImageContainer: {
        position: 'absolute',
        right: -10, // Let it bleed out slightly to match design
        top: 25,
        width: 170,
        height: 115,
        zIndex: 1,
    },
    mealImage: {
        width: '100%',
        height: '100%',
        // Slight rotation matches screenshot
        transform: [{ rotate: '-8.37deg' }],
    },
    paginationDots: {
        position: 'absolute',
        bottom: 15,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 3,
    },
    dotInactive: {
        backgroundColor: 'rgba(4, 131, 87, 0.4)', // Faded green
    },
    dotActive: {
        backgroundColor: '#048357', // Solid green
    },

    /* ─── Section Header ─── */
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginLeft: 5,
        marginBottom: 12,
    },

    /* ─── Outlined Cards ─── */
    sectionCard: {
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 10,
        padding: 20,
        paddingVertical: 22,
        marginBottom: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionMainText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },
    optionSubText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        color: isDarkMode ? '#CCCCCC' : '#555555',
        fontWeight: 'normal',
    },

    /* ─── Dietary Preferences ─── */
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    preferenceText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: isDarkMode ? '#CCCCCC' : '#898989',
    },
    checkedSwitchIcon: {
        width: 20,
        height: 20,
        marginRight: 6,
    },

    /* ─── Text Area ─── */
    textAreaContainer: {
        height: 53,
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 10,
        paddingHorizontal: 15,
        justifyContent: 'center',
        marginBottom: 35,
        backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED',
    },
    textAreaPlaceholder: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: isDarkMode ? '#CBD5E1' : '#555555',
    },

    /* ─── Reusable Components ─── */
    radioContainer: {
        width: 24,
        marginRight: 8,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginTop: 2,
    },
    checkedRadioIcon: {
        width: 16,
        height: 16,
    },
    uncheckedRadioCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDarkMode ? '#888' : '#777777', // subtle gray
    },
    solidCheckedRadio: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#048357',
    },
    locationHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 10,
    },
    gpsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 15,
    },
    gpsButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11,
        color: '#048357',
        marginLeft: 4,
    },
    multilineAddressInput: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        minHeight: 60,
        textAlignVertical: 'top',
        width: '100%',
    },
    addressTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        gap: 8,
    },
    addressTypeChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#D3DFDD',
        borderRadius: 20,
        paddingVertical: 8,
    },
    addressTypeChipActive: {
        backgroundColor: '#048357',
        borderColor: '#048357',
    },
    addressTypeChipText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#CCCCCC' : '#555555',
    },
    addressTypeChipTextActive: {
        color: '#FAF7ED',
    },
    addressLabelBold: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
    },
    addressText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#CCCCCC' : '#898989',
        flex: 1,
    },
    manualEntryContainer: {
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        borderRadius: 12,
        padding: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#048357',
    },
    sectionCardTransparent: {
        marginBottom: 20,
    },

    /* ─── Submit Button ─── */
    submitButton: {
        backgroundColor: '#02743F',
        borderRadius: 22,
        height: 44,
        width: 230,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FAF7ED',
        fontSize: 14,
    },
});

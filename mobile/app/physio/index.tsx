import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, TextInput, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { useAddress } from '@/context/AddressContext';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';
import { useTranslation } from 'react-i18next';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';

// Pain relief illustration
const imgPainRelief = require('@/assets/images/19384cdb0d3b6490a3d5bfa98457389b6d565416.png');

const BODY_PARTS = ['Back', 'Knee', 'Neck', 'Shoulder', 'Leg', 'Other Parts'];

const translateBodyPart = (part: string, t: any) => {
    const keys: Record<string, string> = {
        'back': 'physio_fitness.back',
        'knee': 'physio_fitness.knee',
        'neck': 'physio_fitness.neck',
        'shoulder': 'physio_fitness.shoulder',
        'leg': 'physio_fitness.leg',
        'other parts': 'Other Parts',
    };
    const key = keys[part.toLowerCase()];
    return key && t(key) !== key ? t(key) : part;
};

export default function PhysioScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    const { activeAddress } = useAddress();

    // State
    const [selectedBodyPart, setSelectedBodyPart] = useState<string>('Back');
    const [otherIssue, setOtherIssue] = useState<string>('');
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

    const { cityId, serviceId, serviceName, servicePrice, isLoading: isLoadingInit } = useServiceInitialization('physio-fitness');
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
            selectedDate &&
            (selectedBodyPart !== 'Other Parts' || otherIssue.trim()) &&
            selectedAddress?.line1 && selectedAddress.line1.trim().length >= 5
        );
    }, [selectedDate, selectedBodyPart, otherIssue, selectedAddress]);

    const handleBookService = async () => {
        if (!selectedDate) {
            triggerAlert(t('common.required') || 'Required', t('physio_fitness.date_required') || 'Please select an appointment date and time.');
            return;
        }
        if (selectedBodyPart === 'Other Parts' && !otherIssue.trim()) {
            triggerAlert(t('common.required') || 'Required', 'Please describe your affected body parts.');
            return;
        }
        if (!selectedAddress?.line1 || selectedAddress.line1.trim().length < 5) {
            triggerAlert(t('common.required') || 'Required', t('errors.address_required') || 'Please confirm your service address.');
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

            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
                addressLine: addressLine || undefined,
                landmark: landmark || undefined,
                latitude: selectedAddress.latitude,
                longitude: selectedAddress.longitude,
                formDataJson: {
                    module: 'Physio',
                    bodyPart: selectedBodyPart,
                    comments: selectedBodyPart === 'Other Parts' ? otherIssue : undefined,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: String(servicePrice),
                    label: 'Physio',
                    serviceSlug: 'physio-fitness',
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
                },
            });
        } catch (error) {
            console.error('Physio error:', error);
            triggerAlert(t('common.error') || 'Error', t('booking.something_wrong') || 'Something went wrong. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={dynamicStyles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={dynamicStyles.headerRow}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/all-ayuxa-services')} style={dynamicStyles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={dynamicStyles.headerTextCol}>
                    <Text style={dynamicStyles.headerTitle}>{t('physio.header')}</Text>
                    <Text style={dynamicStyles.headerSubtitle}>{t('physio.header_subtitle')}</Text>
                </View>
            </View>

            {/* Main Content Area (Rounded Cream Box) */}
            <View style={dynamicStyles.contentContainer}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <KeyboardAwareScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                        {/* Top Illustration Card */}
                        <View style={dynamicStyles.illustrationCard}>
                            <View style={dynamicStyles.discountBadgeTopRight}>
                                <Text style={dynamicStyles.discountText}>{t('physio_fitness.discount') || '+10% OFF'}</Text>
                            </View>
                            <Image source={imgPainRelief} style={dynamicStyles.painIllustration} resizeMode="contain" />
                            <Text style={dynamicStyles.illustrationTitle}>{t('physio.header')}</Text>
                            <Text style={dynamicStyles.illustrationDesc}>{t('physio.header_subtitle')}</Text>
                        </View>

                        {/* Body part selection */}
                        <Text style={dynamicStyles.sectionTitle}>{t('physio.affected_body_parts')}</Text>
                        <View style={dynamicStyles.bodyPartGrid}>
                            {BODY_PARTS.map((part) => {
                                const isSelected = selectedBodyPart === part;
                                return (
                                    <TouchableOpacity
                                        key={part}
                                        style={[dynamicStyles.bodyPartPill, isSelected && dynamicStyles.bodyPartPillSelected]}
                                        onPress={() => setSelectedBodyPart(part)}
                                    >
                                        <Text style={[dynamicStyles.bodyPartText, isSelected && dynamicStyles.bodyPartTextSelected]}>
                                            {part === 'Other Parts' ? t('physio.other_parts') : translateBodyPart(part, t)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Conditional Comments/Other Issue input */}
                        {selectedBodyPart === 'Other Parts' && (
                            <View style={{ marginBottom: 15 }}>
                                <Text style={dynamicStyles.sectionTitle}>{t('physio.comments')}</Text>
                                <View style={dynamicStyles.inputCard}>
                                    <View style={dynamicStyles.issueIconBox}>
                                        <View style={dynamicStyles.issueIconLine} />
                                        <View style={dynamicStyles.issueIconLine} />
                                    </View>
                                    <TextInput
                                        placeholder={t('physio.comments_placeholder')}
                                        style={dynamicStyles.textInput}
                                        placeholderTextColor={isDarkMode ? '#94A3B8' : '#555'}
                                        multiline
                                        value={otherIssue}
                                        onChangeText={setOtherIssue}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Scheduling */}
                        <View style={{ marginBottom: 15 }}>
                            <CustomDateTimePicker
                                label={t('physio.schedule_appointment')}
                                value={selectedDate}
                                onDateChange={setSelectedDate}
                            />
                        </View>

                        {/* Location Selection UI */}
                        <View>
                            <AddressPickerSection
                                selectedAddress={selectedAddress}
                                onAddressChange={(addr) => {
                                    setSelectedAddress(addr);
                                    if (addr.landmark) setLandmark(addr.landmark);
                                    setLandmarkInitialized(true);
                                    // AddressPickerSection already calls selectActiveAddress internally.
                                }}
                                title={t('order_medicines.address_label') || 'Address'}
                                showPhoneField={false}
                                showLandmarkField={true}
                                landmark={landmark}
                                onLandmarkChange={setLandmark}
                                allowManualEntry={true}
                            />
                        </View>

                        {/* Book Appointment Button */}
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
                                <Text style={dynamicStyles.submitButtonText}>{t('physio.book_appointment')}</Text>
                            )}
                        </TouchableOpacity>

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
        backgroundColor: '#048357',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 25,
        backgroundColor: '#048357',
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
        color: '#FAF7ED',
        letterSpacing: -0.24,
    },
    headerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#D9D9D9',
        letterSpacing: -0.24,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: isDarkMode ? '#0F172A' : '#FAF7ED',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        paddingTop: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 12,
        marginTop: 15,
    },
    illustrationCard: {
        backgroundColor: isDarkMode ? 'rgba(255, 136, 0, 0.12)' : '#FFEBDF',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(255, 136, 0, 0.4)' : '#FF8800',
        position: 'relative',
    },
    painIllustration: {
        width: 100,
        height: 100,
        marginBottom: 10,
    },
    illustrationTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },
    illustrationDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#94A3B8' : '#777777',
        marginTop: 4,
        textAlign: 'center',
    },
    discountBadgeTopRight: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 185, 46, 0.7)',
        borderColor: isDarkMode ? '#34D399' : '#048357',
        borderWidth: 1,
        borderRadius: 23,
        paddingHorizontal: 15,
        height: 37,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    discountText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        color: isDarkMode ? '#34D399' : '#FAF7ED',
        fontSize: 11,
    },
    bodyPartGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    bodyPartPill: {
        height: 35,
        flex: 1,
        minWidth: '28%',
        borderRadius: 23,
        borderWidth: 1,
        borderColor: isDarkMode ? '#475569' : '#AAAEAC',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED',
    },
    bodyPartPillSelected: {
        backgroundColor: 'rgba(4, 131, 87, 0.74)',
        borderColor: '#02743F',
    },
    bodyPartText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#94A3B8' : '#555555',
    },
    bodyPartTextSelected: {
        color: '#FAF7ED',
    },
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED',
        borderRadius: 12,
        paddingHorizontal: 15,
        minHeight: 59,
        paddingVertical: 10,
        marginBottom: 15,
        shadowColor: '#02743F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 3,
    },
    issueIconBox: {
        width: 43,
        height: 33,
        backgroundColor: isDarkMode ? 'rgba(167, 255, 242, 0.15)' : '#A7FFF2',
        borderColor: isDarkMode ? 'rgba(196, 243, 236, 0.4)' : '#C4F3EC',
        borderWidth: 1,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        gap: 3,
    },
    issueIconLine: {
        width: 21,
        height: 3,
        backgroundColor: isDarkMode ? '#34D399' : '#FFFAFA',
        borderRadius: 2,
    },
    textInput: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },
    submitButton: {
        backgroundColor: '#02743F',
        height: 48,
        borderRadius: 24,
        width: 230,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FAF7ED',
        fontSize: 14,
    },
});

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
} from 'react-native';
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
import { Fonts, FontSize, Radius, Spacing, Shadow } from '@/constants/theme';

// Illustrations
const imgSeniorFitnessRight = require('@/assets/images/a6d4ed0a2bd9de082ab0ad9c67504e0708c7343f.png');
const imgSeniorFitnessLeft = require('@/assets/images/3abc2815df401d4b6b19fda9a2f8c9fd80b8f9e3.png');

// Online Yoga Class Time Slots
interface TimeSlot {
    id: string;
    label: string;
    period: 'Morning' | 'Evening';
    icon: keyof typeof Ionicons.glyphMap;
}

const ONLINE_YOGA_SLOTS: TimeSlot[] = [
    { id: '06:00-07:00', label: '6:00 AM – 7:00 AM', period: 'Morning', icon: 'sunny-outline' },
    { id: '07:15-08:15', label: '7:15 AM – 8:15 AM', period: 'Morning', icon: 'sunny-outline' },
    { id: '08:30-09:30', label: '8:30 AM – 9:30 AM', period: 'Morning', icon: 'sunny-outline' },
    { id: '10:00-11:00', label: '10:00 AM – 11:00 AM', period: 'Morning', icon: 'sunny-outline' },
    { id: '16:00-17:00', label: '4:00 PM – 5:00 PM', period: 'Evening', icon: 'partly-sunny-outline' },
    { id: '17:15-18:15', label: '5:15 PM – 6:15 PM', period: 'Evening', icon: 'partly-sunny-outline' },
    { id: '18:30-19:30', label: '6:30 PM – 7:30 PM', period: 'Evening', icon: 'moon-outline' },
    { id: '19:45-20:45', label: '7:45 PM – 8:45 PM', period: 'Evening', icon: 'moon-outline' },
];

export default function FitnessScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    const { activeAddress } = useAddress();

    // Option state: 'HOME' = Yoga at Home (Service Request + Consultation Fee) | 'ONLINE' = Online Yoga Class (Paid Slot Booking)
    const [serviceType, setServiceType] = useState<'HOME' | 'ONLINE'>('HOME');

    // Shared / Home state
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<string>('06:00-07:00');
    const [notes, setNotes] = useState<string>('');
    const [landmark, setLandmark] = useState('');
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

    // Dynamic service initialization with fallback slugs
    const { cityId, serviceId, serviceName, servicePrice, isLoading: isLoadingInit, dbService } = 
        useServiceInitialization('fitness-diag', ['fitness', 'fitness-wellness', 'physio-fitness']);
    
    const [isBooking, setIsBooking] = useState(false);

    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; iconName: string }>({
        visible: false, title: '', message: '', iconName: 'warning-outline',
    });
    const triggerAlert = (title: string, message: string, iconName = 'warning-outline') => {
        setAlertConfig({ visible: true, title, message, iconName });
    };

    // Prices (Configurable from Admin Panel under Core Services / Diagnostics & Fitness)
    const onlineClassFee = (dbService?.basePrice && dbService.basePrice > 0) ? dbService.basePrice : 299;

    // Follow active address
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

    const isFormValid = useMemo(() => {
        if (!selectedDate) return false;
        if (serviceType === 'HOME') {
            return !!(selectedAddress?.line1 && selectedAddress.line1.trim().length >= 5);
        }
        if (serviceType === 'ONLINE') {
            return !!selectedSlot;
        }
        return true;
    }, [selectedDate, serviceType, selectedAddress, selectedSlot]);

    const handleBookService = async () => {
        if (!selectedDate) {
            triggerAlert(t('common.required', 'Required'), t('fitness.alert_select_date', 'Please select a date for your yoga session.'));
            return;
        }

        if (serviceType === 'HOME') {
            const hasValidAddress = !!(selectedAddress?.line1 && selectedAddress.line1.trim().length >= 5);
            if (!hasValidAddress) {
                triggerAlert(t('common.required', 'Required'), t('fitness.alert_address_req', 'Please confirm your service address.'));
                return;
            }
        }

        if (serviceType === 'ONLINE' && !selectedSlot) {
            triggerAlert(t('common.required', 'Required'), t('fitness.alert_select_slot', 'Please select an online class time slot.'));
            return;
        }

        if (!cityId || !serviceId) {
            triggerAlert(t('common.error', 'Error'), t('booking.init_incomplete', 'Service initialization failed.'));
            return;
        }

        try {
            setIsBooking(true);

            const addressLine = selectedAddress?.line1
                ? [selectedAddress.line1, selectedAddress.line2].filter(Boolean).join(', ')
                : undefined;

            const selectedSlotObj = ONLINE_YOGA_SLOTS.find(s => s.id === selectedSlot);

            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: selectedDate.toISOString(),
                addressLine: serviceType === 'HOME' ? addressLine : 'Online Yoga Class (Live Video Session)',
                landmark: serviceType === 'HOME' ? (landmark || undefined) : undefined,
                latitude: serviceType === 'HOME' ? selectedAddress?.latitude : undefined,
                longitude: serviceType === 'HOME' ? selectedAddress?.longitude : undefined,
                formDataJson: {
                    module: 'Fitness',
                    serviceType: serviceType === 'HOME' ? 'Yoga at Home' : 'Online Yoga Class',
                    category: serviceType === 'HOME' ? 'Home Consultation' : 'Live Group Class',
                    timeSlot: serviceType === 'ONLINE' ? (selectedSlotObj?.label || selectedSlot) : undefined,
                    notes: notes.trim() || undefined,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: serviceType === 'HOME' ? '0' : String(onlineClassFee),
                    label: serviceType === 'HOME' ? 'Yoga at Home' : 'Online Yoga Class',
                    serviceSlug: dbService?.slug || 'fitness-diag',
                    paymentMode: serviceType === 'HOME' ? 'INQUIRY' : 'PAID',
                    checkoutGroup: serviceType === 'HOME' ? 'D' : 'A',
                    hideLocation: serviceType === 'ONLINE' ? 'true' : 'false',
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
                },
            });
        } catch (error) {
            console.error('Fitness booking error:', error);
            triggerAlert(t('common.error', 'Error'), t('booking.something_wrong', 'Something went wrong. Please try again.'));
        } finally {
            setIsBooking(false);
        }
    };

    const dynamicStyles = makeStyles(isDarkMode);

    const morningSlots = ONLINE_YOGA_SLOTS.filter(s => s.period === 'Morning');
    const eveningSlots = ONLINE_YOGA_SLOTS.filter(s => s.period === 'Evening');

    return (
        <View style={dynamicStyles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={dynamicStyles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={dynamicStyles.headerTextCol}>
                    <Text style={dynamicStyles.headerTitle}>{t('fitness.header', 'Yoga & Fitness')}</Text>
                    <Text style={dynamicStyles.headerSubtitle}>{t('fitness.header_subtitle', 'Professional Yoga Trainers & Live Sessions')}</Text>
                </View>
            </View>

            {/* Main Content Area */}
            <View style={dynamicStyles.contentContainer}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <KeyboardAwareScrollView
                        contentContainerStyle={dynamicStyles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid
                        extraScrollHeight={20}
                    >

                        {/* Top Illustration Card */}
                        <View style={dynamicStyles.illustrationCard}>
                            <View style={dynamicStyles.fitnessIllustrationRow}>
                                <Image source={imgSeniorFitnessLeft} style={dynamicStyles.fitnessIllustrationLeft} resizeMode="contain" />
                                <Image source={imgSeniorFitnessRight} style={dynamicStyles.fitnessIllustrationRight} resizeMode="contain" />
                            </View>
                            <Text style={dynamicStyles.illustrationTitle}>{t('fitness.illustration_title', 'Yoga for Health & Mobility')}</Text>
                            <Text style={dynamicStyles.illustrationDesc}>
                                {t('fitness.illustration_desc', 'Tailored wellness sessions designed for flexibility, balance, and peaceful living.')}
                            </Text>
                        </View>

                        {/* ─── Service Type Selector ─── */}
                        <Text style={dynamicStyles.sectionTitle}>{t('fitness.select_service', 'Select Yoga Service')}</Text>
                        <View style={dynamicStyles.choicesContainer}>
                            
                            {/* Option A: Yoga at Home */}
                            <TouchableOpacity
                                style={[
                                    dynamicStyles.choiceCard,
                                    serviceType === 'HOME' && dynamicStyles.selectedChoiceCard,
                                    { borderColor: serviceType === 'HOME' ? '#048357' : isDarkMode ? '#334155' : '#E2E8F0' }
                                ]}
                                onPress={() => setServiceType('HOME')}
                                activeOpacity={0.8}
                            >
                                <View style={[dynamicStyles.choiceIconWrapper, serviceType === 'HOME' && dynamicStyles.selectedChoiceIconWrapper]}>
                                    <Ionicons name="home" size={22} color={serviceType === 'HOME' ? '#048357' : '#6B7280'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={dynamicStyles.choiceHeaderRow}>
                                        <Text style={[dynamicStyles.choiceTitle, serviceType === 'HOME' && dynamicStyles.selectedChoiceTitle]}>
                                            {t('fitness.option_a_title', 'A. Yoga at Home')}
                                        </Text>
                                        <View style={dynamicStyles.priceTag}>
                                            <Text style={dynamicStyles.priceTagText}>{t('fitness.option_a_tag', 'Service Request')}</Text>
                                        </View>
                                    </View>
                                    <Text style={dynamicStyles.choiceDesc}>
                                        {t('fitness.option_a_desc', 'Submit a service request for 1-on-1 home visit consultation. No advance payment required.')}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {/* Option B: Online Yoga Class */}
                            <TouchableOpacity
                                style={[
                                    dynamicStyles.choiceCard,
                                    serviceType === 'ONLINE' && dynamicStyles.selectedChoiceCard,
                                    { borderColor: serviceType === 'ONLINE' ? '#048357' : isDarkMode ? '#334155' : '#E2E8F0' }
                                ]}
                                onPress={() => setServiceType('ONLINE')}
                                activeOpacity={0.8}
                            >
                                <View style={[dynamicStyles.choiceIconWrapper, serviceType === 'ONLINE' && dynamicStyles.selectedChoiceIconWrapper]}>
                                    <Ionicons name="videocam" size={22} color={serviceType === 'ONLINE' ? '#048357' : '#6B7280'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={dynamicStyles.choiceHeaderRow}>
                                        <Text style={[dynamicStyles.choiceTitle, serviceType === 'ONLINE' && dynamicStyles.selectedChoiceTitle]}>
                                            {t('fitness.option_b_title', 'B. Online Yoga Class')}
                                        </Text>
                                        <View style={[dynamicStyles.priceTag, { backgroundColor: '#E0F2FE' }]}>
                                            <Text style={[dynamicStyles.priceTagText, { color: '#0284C7' }]}>₹{onlineClassFee}</Text>
                                        </View>
                                    </View>
                                    <Text style={dynamicStyles.choiceDesc}>
                                        {t('fitness.option_b_desc', 'Live interactive group session with certified yoga masters via video.')}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                        </View>

                        {/* ─── CONDITIONAL SECTION: Yoga at Home ─── */}
                        {serviceType === 'HOME' && (
                            <View style={dynamicStyles.formSection}>
                                
                                <Text style={dynamicStyles.sectionTitle}>{t('fitness.appointment_datetime', 'Appointment Date & Time')}</Text>
                                <View style={{ marginBottom: 15 }}>
                                    <CustomDateTimePicker
                                        label={t('fitness.preferred_datetime', 'Preferred Date & Time')}
                                        value={selectedDate}
                                        onDateChange={setSelectedDate}
                                    />
                                </View>

                                <Text style={dynamicStyles.sectionTitle}>{t('fitness.home_address', 'Home Address')}</Text>
                                <AddressPickerSection
                                    selectedAddress={selectedAddress}
                                    onAddressChange={(addr) => {
                                        setSelectedAddress(addr);
                                        if (addr.landmark) setLandmark(addr.landmark);
                                        setLandmarkInitialized(true);
                                    }}
                                    title={t('fitness.service_location', 'Service Location')}
                                    showPhoneField={false}
                                    showLandmarkField={true}
                                    landmark={landmark}
                                    onLandmarkChange={setLandmark}
                                    allowManualEntry={true}
                                />

                                <Text style={dynamicStyles.sectionTitle}>{t('fitness.special_notes_home', 'Special Notes or Health Goals (Optional)')}</Text>
                                <TextInput
                                    style={dynamicStyles.notesInput}
                                    placeholder={t('fitness.notes_placeholder_home', 'E.g., joint pain, back stiffness, beginner friendly...')}
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={3}
                                    value={notes}
                                    onChangeText={setNotes}
                                />

                                {/* Service Request Notice Card */}
                                <View style={dynamicStyles.summaryCard}>
                                    <View style={dynamicStyles.summaryRow}>
                                        <Text style={dynamicStyles.summaryLabel}>{t('fitness.home_consultation_req', 'Home Consultation Request')}</Text>
                                        <Text style={[dynamicStyles.summaryValue, { color: '#048357' }]}>{t('fitness.free_to_submit', 'Free to Submit')}</Text>
                                    </View>
                                    <Text style={dynamicStyles.summaryHint}>
                                        {t('fitness.no_advance_payment', 'No advance payment required now. Our team will contact you to confirm the appointment details.')}
                                    </Text>
                                </View>

                            </View>
                        )}

                        {/* ─── CONDITIONAL SECTION: Online Yoga Class ─── */}
                        {serviceType === 'ONLINE' && (
                            <View style={dynamicStyles.formSection}>

                                <Text style={dynamicStyles.sectionTitle}>{t('fitness.select_class_date', 'Select Class Date')}</Text>
                                <View style={{ marginBottom: 15 }}>
                                    <CustomDateTimePicker
                                        label={t('fitness.class_date_label', 'Class Date')}
                                        value={selectedDate}
                                        onDateChange={setSelectedDate}
                                        showTimeSlots={false}
                                    />
                                </View>

                                {/* Time Slot Selection */}
                                <View style={dynamicStyles.slotHeaderRow}>
                                    <Text style={dynamicStyles.sectionTitle}>{t('fitness.select_time_slot', 'Select Class Time Slot')}</Text>
                                    <Text style={dynamicStyles.slotCountBadge}>{t('fitness.slots_available', '8 Slots Available')}</Text>
                                </View>

                                {/* Morning Slots */}
                                <Text style={dynamicStyles.periodSubtitle}>{t('fitness.morning_sessions', '🌅 Morning Sessions')}</Text>
                                <View style={dynamicStyles.slotGrid}>
                                    {morningSlots.map((slot) => {
                                        const isSelected = selectedSlot === slot.id;
                                        return (
                                            <TouchableOpacity
                                                key={slot.id}
                                                style={[
                                                    dynamicStyles.slotCard,
                                                    isSelected && dynamicStyles.selectedSlotCard,
                                                ]}
                                                onPress={() => setSelectedSlot(slot.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={slot.icon}
                                                    size={16}
                                                    color={isSelected ? '#048357' : '#6B7280'}
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text style={[
                                                    dynamicStyles.slotText,
                                                    isSelected && dynamicStyles.selectedSlotText,
                                                ]}>
                                                    {slot.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Evening Slots */}
                                <Text style={[dynamicStyles.periodSubtitle, { marginTop: 14 }]}>{t('fitness.evening_sessions', '🌇 Evening Sessions')}</Text>
                                <View style={dynamicStyles.slotGrid}>
                                    {eveningSlots.map((slot) => {
                                        const isSelected = selectedSlot === slot.id;
                                        return (
                                            <TouchableOpacity
                                                key={slot.id}
                                                style={[
                                                    dynamicStyles.slotCard,
                                                    isSelected && dynamicStyles.selectedSlotCard,
                                                ]}
                                                onPress={() => setSelectedSlot(slot.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={slot.icon}
                                                    size={16}
                                                    color={isSelected ? '#048357' : '#6B7280'}
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text style={[
                                                    dynamicStyles.slotText,
                                                    isSelected && dynamicStyles.selectedSlotText,
                                                ]}>
                                                    {slot.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Online Live Class Notice */}
                                <View style={dynamicStyles.onlineNoticeCard}>
                                    <Ionicons name="information-circle" size={20} color="#0284C7" />
                                    <Text style={dynamicStyles.onlineNoticeText}>
                                        {t('fitness.online_notice', 'Meeting link & preparation guide will be sent to your registered phone number prior to the class.')}
                                    </Text>
                                </View>

                                <Text style={dynamicStyles.sectionTitle}>{t('fitness.special_notes_optional', 'Special Notes (Optional)')}</Text>
                                <TextInput
                                    style={dynamicStyles.notesInput}
                                    placeholder={t('fitness.notes_placeholder_online', 'Any specific postures or requirements...')}
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={2}
                                    value={notes}
                                    onChangeText={setNotes}
                                />

                                {/* Fee Summary Card */}
                                <View style={dynamicStyles.summaryCard}>
                                    <View style={dynamicStyles.summaryRow}>
                                        <Text style={dynamicStyles.summaryLabel}>{t('fitness.online_booking_fee', 'Online Class Booking Fee')}</Text>
                                        <Text style={[dynamicStyles.summaryValue, { color: '#0284C7' }]}>₹{onlineClassFee}</Text>
                                    </View>
                                    <Text style={dynamicStyles.summaryHint}>
                                        {t('fitness.online_fee_desc', 'Full 60-minute live interactive session with certified yoga master.')}
                                    </Text>
                                </View>

                            </View>
                        )}

                        {/* ─── Submit / Payment Button ─── */}
                        <TouchableOpacity
                            style={[
                                dynamicStyles.submitButton,
                                (!isFormValid || isBooking || isLoadingInit) && { opacity: 0.6 },
                            ]}
                            activeOpacity={isFormValid && !isBooking && !isLoadingInit ? 0.8 : 0.5}
                            disabled={!isFormValid || isBooking || isLoadingInit}
                            onPress={handleBookService}
                        >
                            {isLoadingInit ? (
                                <Text style={dynamicStyles.submitButtonText}>{t('common.initializing', 'Initializing...')}</Text>
                            ) : isBooking ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={dynamicStyles.submitButtonText}>
                                    {serviceType === 'HOME'
                                        ? t('fitness.submit_request_btn', 'Submit Consultation Request')
                                        : t('fitness.book_online_btn', 'Book Online Class & Pay (₹{{fee}})', { fee: onlineClassFee })}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={{ height: 30 }} />

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
        padding: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
        marginTop: 2,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: isDarkMode ? '#0F172A' : '#FAF7ED',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingTop: 20,
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
    illustrationCard: {
        backgroundColor: isDarkMode ? '#1E293B' : '#E6F4EA',
        borderRadius: 20,
        padding: 18,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#C4E1D0',
    },
    fitnessIllustrationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 10,
    },
    fitnessIllustrationLeft: {
        width: 50,
        height: 50,
    },
    fitnessIllustrationRight: {
        width: 73,
        height: 80,
    },
    illustrationTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 17,
        color: isDarkMode ? '#F1F5F9' : '#1F2937',
    },
    illustrationDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#94A3B8' : '#4B5563',
        marginTop: 4,
        textAlign: 'center',
        lineHeight: 17,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: isDarkMode ? '#F1F5F9' : '#1F2937',
        marginBottom: 10,
        marginTop: 14,
    },
    choicesContainer: {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 10,
    },
    choiceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        gap: 14,
        borderWidth: 1.5,
        borderColor: isDarkMode ? '#334155' : '#E5E7EB',
        ...Shadow.card,
    },
    selectedChoiceCard: {
        borderColor: '#048357',
        backgroundColor: isDarkMode ? 'rgba(4,131,87,0.12)' : '#F0FFF4',
    },
    choiceIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: isDarkMode ? '#334155' : '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedChoiceIconWrapper: {
        backgroundColor: '#E8F5E9',
    },
    choiceHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    choiceTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: isDarkMode ? '#F1F5F9' : '#1F2937',
    },
    selectedChoiceTitle: {
        color: '#048357',
    },
    choiceDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#94A3B8' : '#6B7280',
        lineHeight: 16,
    },
    priceTag: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    priceTagText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: '#048357',
    },
    formSection: {
        marginTop: 6,
    },
    notesInput: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#E5E7EB',
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#1F2937',
        textAlignVertical: 'top',
        minHeight: 65,
        marginBottom: 10,
    },
    slotHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    slotCountBadge: {
        fontFamily: Fonts.medium,
        fontSize: 11,
        color: '#048357',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    periodSubtitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
        color: isDarkMode ? '#94A3B8' : '#4B5563',
        marginBottom: 8,
    },
    slotGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    slotCard: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderWidth: 1.5,
        borderColor: isDarkMode ? '#334155' : '#E5E7EB',
    },
    selectedSlotCard: {
        borderColor: '#048357',
        backgroundColor: isDarkMode ? 'rgba(4,131,87,0.18)' : '#F0FFF4',
    },
    slotText: {
        fontFamily: Fonts.medium,
        fontSize: 11.5,
        color: isDarkMode ? '#E2E8F0' : '#374151',
    },
    selectedSlotText: {
        color: '#048357',
        fontFamily: Fonts.bold,
    },
    onlineNoticeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: isDarkMode ? 'rgba(2,132,199,0.15)' : '#F0F9FF',
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(2,132,199,0.3)' : '#BAE6FD',
        borderRadius: 12,
        padding: 12,
        marginTop: 14,
        marginBottom: 8,
    },
    onlineNoticeText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: isDarkMode ? '#BAE6FD' : '#0369A1',
        lineHeight: 16,
    },
    summaryCard: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#E5E7EB',
        marginTop: 12,
        marginBottom: 16,
        ...Shadow.card,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    summaryLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#1F2937',
    },
    summaryValue: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: '#048357',
    },
    summaryHint: {
        fontFamily: Fonts.regular,
        fontSize: 11.5,
        color: isDarkMode ? '#94A3B8' : '#6B7280',
        lineHeight: 15,
    },
    submitButton: {
        backgroundColor: '#02743F',
        minHeight: 50,
        borderRadius: 25,
        paddingHorizontal: 20,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        ...Shadow.card,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FAF7ED',
        fontSize: 14.5,
        textAlign: 'center',
    },
});

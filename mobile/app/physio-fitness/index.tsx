import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';
import { useTranslation } from 'react-i18next';

// ─── Figma Assets ───
const imgPainRelief = require('@/assets/images/19384cdb0d3b6490a3d5bfa98457389b6d565416.png'); // Pain relief illustration
const imgSeniorFitnessRight = require('@/assets/images/a6d4ed0a2bd9de082ab0ad9c67504e0708c7343f.png'); // Senior fitness right illustration
const imgSeniorFitnessLeft = require('@/assets/images/3abc2815df401d4b6b19fda9a2f8c9fd80b8f9e3.png'); // Senior fitness left illustration

// Constants
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

export default function PhysioFitnessScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    // State
    const [selectedService, setSelectedService] = useState<'pain' | 'fitness'>('pain');
    const [selectedBodyPart, setSelectedBodyPart] = useState<string>('Back');
    const [otherIssue, setOtherIssue] = useState<string>('');
    const [fitnessType, setFitnessType] = useState<'HOME' | 'CLASS'>('HOME');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [landmark, setLandmark] = useState('');
    const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    const { cityId, serviceId, serviceName, servicePrice, address, setAddress, isLoading: isLoadingInit } = useServiceInitialization('physio-fitness');

    // Sync selectedAddress with initial fetched address on mount or when fetched
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

    const handleBookService = async () => {
        if (!selectedDate) {
            Alert.alert(t('common.required'), t('physio_fitness.date_required') || 'Please select date and time');
            return;
        }

        if (selectedService === 'pain') {
            if (selectedBodyPart === 'Other Parts' && !otherIssue.trim()) {
                Alert.alert(t('common.required'), 'Please describe your affected body parts in comments.');
                return;
            }
            if (!address || address.trim().length < 5 || address === 'Fetching address...') {
                Alert.alert(t('common.required'), t('errors.address_required'));
                return;
            }
        } else {
            // fitness
            if (fitnessType === 'HOME') {
                if (!address || address.trim().length < 5 || address === 'Fetching address...') {
                    Alert.alert(t('common.required'), t('errors.address_required'));
                    return;
                }
            }
        }

        if (!cityId || !serviceId) {
            Alert.alert(t('common.error'), t('booking.init_incomplete'));
            return;
        }

        try {
            setIsBooking(true);

            // Construct payload based on service type
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
                addressLine: selectedService === 'pain' ? address : (fitnessType === 'HOME' ? address : 'Join the Class (No Location)'),
                landmark: (selectedService === 'pain' || fitnessType === 'HOME') ? (landmark || undefined) : undefined,
                formDataJson: {
                    service: selectedService === 'pain' ? 'Pain Relief' : 'Senior Fitness',
                    fitnessType: selectedService === 'fitness' ? (fitnessType === 'HOME' ? 'Yoga Teacher at Home' : 'Join the Class') : undefined,
                    bodyPart: selectedService === 'pain' ? selectedBodyPart : undefined,
                    otherIssue: selectedService === 'pain' && selectedBodyPart === 'Other Parts' ? otherIssue : undefined,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: selectedService === 'pain' ? '0' : String(servicePrice),
                    label: selectedService === 'pain' ? 'Physio' : 'Fitness',
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
                },
            });
        } catch (error) {
            console.error('Booking error:', error);
            Alert.alert(t('common.error'), t('booking.something_wrong'));
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
                <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={dynamicStyles.headerTextCol}>
                    <Text style={dynamicStyles.headerTitle}>{t('physio_fitness.header')}</Text>
                    <Text style={dynamicStyles.headerSubtitle}>{t('physio_fitness.subtitle')}</Text>
                </View>
            </View>

            {/* Main Content Area (Rounded Cream Box) */}
            <View style={dynamicStyles.contentContainer}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <KeyboardAwareScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                        {/* ─── Select Service ─── */}
                        <Text style={dynamicStyles.sectionTitle}>{t('physio_fitness.select_service')}</Text>

                        <View style={dynamicStyles.tabsRow}>
                            {/* Option: Pain Relief */}
                            <TouchableOpacity
                                style={[
                                    dynamicStyles.tabCard,
                                    selectedService === 'pain' && dynamicStyles.selectedTabCard
                                ]}
                                activeOpacity={0.8}
                                onPress={() => setSelectedService('pain')}
                            >
                                <Image source={imgPainRelief} style={dynamicStyles.tabIllustration} resizeMode="contain" />
                                <Text style={dynamicStyles.tabTitle}>{t('physio_fitness.pain_relief_title')}</Text>
                                <Text style={dynamicStyles.tabSubtitle}>{t('physio_fitness.pain_relief_subtitle')}</Text>
                            </TouchableOpacity>

                            {/* Option: Senior Fitness */}
                            <TouchableOpacity
                                style={[
                                    dynamicStyles.tabCard,
                                    selectedService === 'fitness' && dynamicStyles.selectedTabCard
                                ]}
                                activeOpacity={0.8}
                                onPress={() => setSelectedService('fitness')}
                            >
                                <View style={dynamicStyles.fitnessIllustrationRow}>
                                    <Image source={imgSeniorFitnessLeft} style={dynamicStyles.fitnessIllustrationLeft} resizeMode="contain" />
                                    <Image source={imgSeniorFitnessRight} style={dynamicStyles.fitnessIllustrationRight} resizeMode="contain" />
                                </View>
                                <Text style={dynamicStyles.tabTitle}>{t('physio_fitness.senior_fitness_title')}</Text>
                                <Text style={dynamicStyles.tabSubtitle}>{t('physio_fitness.senior_fitness_subtitle')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ─── Module A: Fitness Customization ─── */}
                        {selectedService === 'fitness' && (
                            <View style={{ marginTop: 15 }}>
                                <Text style={dynamicStyles.sectionTitle}>Fitness Class Type</Text>
                                <View style={dynamicStyles.choicesContainer}>
                                    <TouchableOpacity
                                        style={[dynamicStyles.choiceCard, fitnessType === 'HOME' && dynamicStyles.selectedChoiceCard]}
                                        onPress={() => setFitnessType('HOME')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="home-outline" size={20} color={fitnessType === 'HOME' ? '#048357' : '#555'} />
                                        <Text style={[dynamicStyles.choiceText, fitnessType === 'HOME' && dynamicStyles.selectedChoiceText]}>
                                            Yoga Teacher at Home
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[dynamicStyles.choiceCard, fitnessType === 'CLASS' && dynamicStyles.selectedChoiceCard]}
                                        onPress={() => setFitnessType('CLASS')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="people-outline" size={20} color={fitnessType === 'CLASS' ? '#048357' : '#555'} />
                                        <Text style={[dynamicStyles.choiceText, fitnessType === 'CLASS' && dynamicStyles.selectedChoiceText]}>
                                            Join the Class
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* ─── Module B: Physio Customization ─── */}
                        {selectedService === 'pain' && (
                            <View style={{ marginTop: 15 }}>
                                {/* Select Body Part */}
                                <Text style={dynamicStyles.sectionTitle}>{t('physio_fitness.body_part')}</Text>
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
                                                    {translateBodyPart(part, t)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Other issue multiline entry comments */}
                                {selectedBodyPart === 'Other Parts' && (
                                    <View style={{ marginBottom: 15 }}>
                                        <Text style={dynamicStyles.sectionTitle}>Comments / Affected Parts</Text>
                                        <View style={dynamicStyles.inputCard}>
                                            <View style={dynamicStyles.issueIconBox}>
                                                <View style={dynamicStyles.issueIconLine} />
                                                <View style={dynamicStyles.issueIconLine} />
                                            </View>
                                            <TextInput
                                                placeholder="Describe the affected body parts or comments here..."
                                                style={dynamicStyles.textInput}
                                                placeholderTextColor={isDarkMode ? '#94A3B8' : '#555'}
                                                multiline
                                                value={otherIssue}
                                                onChangeText={setOtherIssue}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ─── Scheduling (Always Required) ─── */}
                        <View style={{ marginVertical: 10 }}>
                            <CustomDateTimePicker
                                label={t('physio_fitness.when')}
                                value={selectedDate}
                                onDateChange={setSelectedDate}
                            />
                        </View>

                        {/* ─── Location UI (Conditional for Fitness, Always for Physio) ─── */}
                        {(selectedService === 'pain' || (selectedService === 'fitness' && fitnessType === 'HOME')) && (
                            <AddressPickerSection
                                selectedAddress={selectedAddress}
                                onAddressChange={(addr) => {
                                    setSelectedAddress(addr);
                                    setAddress(`${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}`);
                                    if (addr.landmark) setLandmark(addr.landmark);
                                }}
                                title={t('order_medicines.address_label') || 'Address'}
                                showPhoneField={false}
                                showLandmarkField={true}
                                landmark={landmark}
                                onLandmarkChange={setLandmark}
                                allowManualEntry={true}
                            />
                        )}

                        {/* ─── Action Button ─── */}
                        <TouchableOpacity
                            style={[dynamicStyles.submitButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                            activeOpacity={0.8}
                            disabled={isBooking || isLoadingInit}
                            onPress={handleBookService}
                        >
                            {isLoadingInit ? (
                                <Text style={dynamicStyles.submitButtonText}>{t('common.initializing')}</Text>
                            ) : isBooking ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={dynamicStyles.submitButtonText}>
                                    {selectedService === 'pain' ? 'Book Appointment' : 'Continue to Checkout'}
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
    tabsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 15,
    },
    tabCard: {
        flex: 1,
        backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#D3DFDD',
        paddingVertical: 18,
        paddingHorizontal: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    selectedTabCard: {
        borderColor: '#02743F',
        borderWidth: 2.5,
        backgroundColor: isDarkMode ? 'rgba(4,131,87,0.15)' : '#F0FFF4',
        transform: [{ scale: 1.02 }],
    },
    tabIllustration: {
        width: 55,
        height: 55,
        marginBottom: 10,
    },
    fitnessIllustrationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 10,
        height: 55,
    },
    fitnessIllustrationLeft: {
        width: 25,
        height: 25,
    },
    fitnessIllustrationRight: {
        width: 36,
        height: 45,
    },
    tabTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        textAlign: 'center',
    },
    tabSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: isDarkMode ? '#94A3B8' : '#777777',
        marginTop: 2,
        textAlign: 'center',
    },
    choicesContainer: {
        flexDirection: 'column',
        gap: 10,
        marginBottom: 15,
    },
    choiceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED',
        borderRadius: 12,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#D3DFDD',
    },
    selectedChoiceCard: {
        borderColor: '#048357',
        borderWidth: 2,
        backgroundColor: isDarkMode ? 'rgba(4,131,87,0.15)' : '#F0FFF4',
    },
    choiceText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },
    selectedChoiceText: {
        color: '#048357',
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
    },
    bodyPartGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 15,
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

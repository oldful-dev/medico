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

// Illustrations
const imgSeniorFitnessRight = require('@/assets/images/a6d4ed0a2bd9de082ab0ad9c67504e0708c7343f.png');
const imgSeniorFitnessLeft = require('@/assets/images/3abc2815df401d4b6b19fda9a2f8c9fd80b8f9e3.png');

export default function FitnessScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    // State
    const [serviceType, setServiceType] = useState<'HOME' | 'CLASS'>('HOME');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [landmark, setLandmark] = useState('');
    const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);

    const { cityId, serviceId, serviceName, servicePrice, address, setAddress, isLoading: isLoadingInit } = useServiceInitialization('physio-fitness');
    const [isBooking, setIsBooking] = useState(false);

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
            Alert.alert(t('common.required'), t('physio_fitness.date_required') || 'Please select an appointment date and time.');
            return;
        }
        if (serviceType === 'HOME') {
            if (!address || address.trim().length < 5 || address === 'Fetching address...') {
                Alert.alert(t('common.required'), t('errors.address_required'));
                return;
            }
        }
        if (!cityId || !serviceId) {
            Alert.alert(t('common.error'), t('booking.init_incomplete'));
            return;
        }
        try {
            setIsBooking(true);

            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
                addressLine: serviceType === 'HOME' ? address : 'Join the Class (No Location)',
                landmark: serviceType === 'HOME' ? (landmark || undefined) : undefined,
                formDataJson: {
                    module: 'Fitness',
                    serviceType: serviceType === 'HOME' ? 'Yoga Teacher at Home' : 'Join the Class',
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: String(servicePrice),
                    label: 'Fitness',
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
                },
            });
        } catch (error) {
            console.error('Fitness error:', error);
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
                    <Text style={dynamicStyles.headerTitle}>{t('fitness.header')}</Text>
                    <Text style={dynamicStyles.headerSubtitle}>{t('fitness.header_subtitle')}</Text>
                </View>
            </View>

            {/* Main Content Area (Rounded Cream Box) */}
            <View style={dynamicStyles.contentContainer}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <KeyboardAwareScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                        {/* Illustration section */}
                        <View style={dynamicStyles.illustrationCard}>
                            <View style={dynamicStyles.fitnessIllustrationRow}>
                                <Image source={imgSeniorFitnessLeft} style={dynamicStyles.fitnessIllustrationLeft} resizeMode="contain" />
                                <Image source={imgSeniorFitnessRight} style={dynamicStyles.fitnessIllustrationRight} resizeMode="contain" />
                            </View>
                            <Text style={dynamicStyles.illustrationTitle}>{t('fitness.header')}</Text>
                            <Text style={dynamicStyles.illustrationDesc}>{t('fitness.header_subtitle')}</Text>
                        </View>

                        {/* Choice Row: Yoga Teacher at Home vs Join the Class */}
                        <Text style={dynamicStyles.sectionTitle}>{t('fitness.service_type')}</Text>
                        <View style={dynamicStyles.choicesContainer}>
                            <TouchableOpacity
                                style={[dynamicStyles.choiceCard, serviceType === 'HOME' && dynamicStyles.selectedChoiceCard]}
                                onPress={() => setServiceType('HOME')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="home-outline" size={20} color={serviceType === 'HOME' ? '#048357' : '#555'} />
                                <Text style={[dynamicStyles.choiceText, serviceType === 'HOME' && dynamicStyles.selectedChoiceText]}>
                                    {t('fitness.yoga_teacher_home')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[dynamicStyles.choiceCard, serviceType === 'CLASS' && dynamicStyles.selectedChoiceCard]}
                                onPress={() => setServiceType('CLASS')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="people-outline" size={20} color={serviceType === 'CLASS' ? '#048357' : '#555'} />
                                <Text style={[dynamicStyles.choiceText, serviceType === 'CLASS' && dynamicStyles.selectedChoiceText]}>
                                    {t('fitness.join_class')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Scheduling */}
                        <View style={{ marginBottom: 15 }}>
                            <CustomDateTimePicker
                                label={t('physio_fitness.when') || 'When?'}
                                value={selectedDate}
                                onDateChange={setSelectedDate}
                            />
                        </View>

                        {/* Conditional Location UI */}
                        {serviceType === 'HOME' && (
                            <AddressPickerSection
                                selectedAddress={selectedAddress}
                                onAddressChange={(addr) => {
                                    setSelectedAddress(addr);
                                    setAddress(`${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}`);
                                    if (addr.landmark) setLandmark(addr.landmark);
                                }}
                                title={t('fitness.standard_location')}
                                showPhoneField={false}
                                showLandmarkField={true}
                                landmark={landmark}
                                onLandmarkChange={setLandmark}
                                allowManualEntry={true}
                            />
                        )}

                        {/* Book Button */}
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
                                <Text style={dynamicStyles.submitButtonText}>{t('fitness.book_appointment')}</Text>
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
        color: '#FFFFFF',
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
        backgroundColor: isDarkMode ? '#0F172A' : '#FDFDE8',
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
        backgroundColor: isDarkMode ? '#1E293B' : '#D3FBFF',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#313A51',
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
        height: 90,
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
    choicesContainer: {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 20,
    },
    choiceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#D3DFDD',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    selectedChoiceCard: {
        borderColor: '#048357',
        borderWidth: 2,
        backgroundColor: isDarkMode ? 'rgba(4,131,87,0.15)' : '#F0FFF4',
    },
    choiceText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },
    selectedChoiceText: {
        color: '#048357',
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
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
        color: '#FFFFFF',
        fontSize: 14,
    },
});

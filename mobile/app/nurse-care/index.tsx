import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator, Linking, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import FormInput from '@/components/common/FormInput';

// ─── Figma Assets ───
const familyIcon = require('@/assets/images/cb86876504871abc5e6db19e5612175dae2b0479.png');
const nurseIcon = require('@/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png');
const helpIcon = require('@/assets/images/idea_bulb_3d.png');

export default function BookNursingCareScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    // Local UI state for radio buttons/selections
    const [selectedWho, setSelectedWho] = useState('Self');
    const [selectedStaff, setSelectedStaff] = useState('Qualified Nurse');
    const [selectedDuration, setSelectedDuration] = useState('12 Hours (Night Shift)');
    const [selectedCondition, setSelectedCondition] = useState('');
    const [selectedGender, setSelectedGender] = useState('');
    const [landmark, setLandmark] = useState('');
    const [selectedImages] = useState<string[]>([]);

    const {
        cityId,
        serviceId,
        serviceName,
        servicePrice,
        address,
        setAddress,
        locationDenied,
        isLoading: isLoadingInit,
        isReady
    } = useServiceInitialization('home-nurse');

    const [isBooking, setIsBooking] = useState(false);

    const handleBookService = async () => {
        if (!selectedWho) {
            Alert.alert('Required', 'Please select who the nurse is for.');
            return;
        }
        if (!selectedStaff) {
            Alert.alert('Required', 'Please select a staff type.');
            return;
        }
        if (!selectedDuration) {
            Alert.alert('Required', 'Please select a shift duration.');
            return;
        }
        if (!address || address.trim().length < 5) {
            Alert.alert('Address Required', locationDenied
                ? 'Please type your full address manually since location access is denied.'
                : 'Could not fetch your address. Please try again or enter it manually.');
            return;
        }
        if (!isReady) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        // Map duration to ShiftDuration enum
        let shiftDuration: 'SHORT_VISIT' | 'TWELVE_HOUR' | 'TWENTY_FOUR_HOUR' | undefined;
        if (selectedDuration.includes('Short')) shiftDuration = 'SHORT_VISIT';
        else if (selectedDuration.includes('12')) shiftDuration = 'TWELVE_HOUR';
        else if (selectedDuration.includes('24')) shiftDuration = 'TWENTY_FOUR_HOUR';

        try {
            setIsBooking(true);

            // Upload images first (safe before payment — no booking created yet)
            let uploadedImageUrls: string[] = [];
            if (selectedImages.length > 0) {
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'nurse-care');
            }

            // Navigate to checkout — booking created inside checkout after payment succeeds
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: new Date().toISOString(),
                addressLine: address || undefined,
                landmark: landmark || undefined,
                staffType: selectedStaff === 'Qualified Nurse' ? 'qualified-nurse' : 'bedside-attendant',
                shiftDuration,
                formDataJson: {
                    recipient: selectedWho,
                    condition: selectedCondition || 'Not specified',
                    gender: selectedGender || 'Any',
                    duration: selectedDuration,
                    attachments: uploadedImageUrls,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: String(servicePrice),
                    label: serviceName,
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
                },
            });
        } catch (error) {
            console.error('Nurse care error:', error);
            Alert.alert('Error', 'Failed to upload documents. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={dynamicStyles.screen}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" />

            <View style={dynamicStyles.container}>
                <View style={dynamicStyles.headerRow}>
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(tabs)' as any);
                            }
                        }}
                        style={dynamicStyles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={dynamicStyles.headerTitle}>{t('nurse_care.header')}</Text>
                </View>

                {/* ─── Main Content Card (Cream Background with Top Radius) ─── */}
                <View style={[dynamicStyles.contentCard, { backgroundColor: isDarkMode ? '#252525' : '#FDFDE8' }]}>
                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView
                        style={dynamicStyles.scrollView}
                        contentContainerStyle={dynamicStyles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid
                        extraScrollHeight={20}
                    >
                        {/* Description Text */}
                        <Text style={dynamicStyles.descText}>
                            {t('nurse_care.description')}
                        </Text>

                        {/* ─── Who is it for? ─── */}
                        <View style={dynamicStyles.sectionContainerBase}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.who_for')}</Text>
                            <View style={dynamicStyles.whoRow}>
                                <TouchableOpacity
                                    style={[dynamicStyles.whoButton, selectedWho === 'Self' && dynamicStyles.whoButtonActive]}
                                    onPress={() => setSelectedWho('Self')}
                                >
                                    {selectedWho === 'Self' && <Ionicons name="checkbox" size={16} color="#02743F" style={dynamicStyles.whoIconCheck} />}
                                    <Text style={dynamicStyles.whoButtonText}>Self</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[dynamicStyles.whoButton, selectedWho === 'Spouse' && dynamicStyles.whoButtonActive]}
                                    onPress={() => setSelectedWho('Spouse')}
                                >
                                    <Image source={familyIcon} style={dynamicStyles.whoIcon} resizeMode="contain" />
                                    <Text style={dynamicStyles.whoButtonText}>Spouse</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[dynamicStyles.whoButton, selectedWho === 'Parent' && dynamicStyles.whoButtonActive]}
                                    onPress={() => setSelectedWho('Parent')}
                                >
                                    <Image source={familyIcon} style={dynamicStyles.whoIcon} resizeMode="contain" />
                                    <Text style={dynamicStyles.whoButtonText}>Parent</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ─── Type of Staff Needed ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.staff_type')}</Text>

                            <TouchableOpacity
                                style={[dynamicStyles.staffCard, selectedStaff === 'Qualified Nurse' && dynamicStyles.staffCardActive]}
                                onPress={() => setSelectedStaff('Qualified Nurse')}
                                activeOpacity={0.8}
                            >
                                <View style={dynamicStyles.staffAvatarContainer}>
                                    <Image source={nurseIcon} style={dynamicStyles.staffAvatar} resizeMode="contain" />
                                </View>
                                <View style={dynamicStyles.staffInfo}>
                                    <Text style={[dynamicStyles.staffTitle, selectedStaff === 'Qualified Nurse' && dynamicStyles.staffTitleActive]}>
                                        {t('nurse_care.option_a_title')}
                                    </Text>
                                    <Text style={[dynamicStyles.staffSubtitle, selectedStaff === 'Qualified Nurse' && dynamicStyles.staffSubtitleActive]}>
                                        {t('nurse_care.option_a_subtitle')}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[dynamicStyles.staffCard, selectedStaff === 'Bedside Attendant' && dynamicStyles.staffCardActive]}
                                onPress={() => setSelectedStaff('Bedside Attendant')}
                                activeOpacity={0.8}
                            >
                                <View style={dynamicStyles.staffAvatarContainer}>
                                    <Image source={nurseIcon} style={dynamicStyles.staffAvatar} resizeMode="contain" />
                                </View>
                                <View style={dynamicStyles.staffInfo}>
                                    <Text style={[dynamicStyles.staffTitle, selectedStaff === 'Bedside Attendant' && dynamicStyles.staffTitleActive]}>
                                        {t('nurse_care.option_b_title')}
                                    </Text>
                                    <Text style={[dynamicStyles.staffSubtitle, selectedStaff === 'Bedside Attendant' && dynamicStyles.staffSubtitleActive]}>
                                        {t('nurse_care.option_b_subtitle')}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* ─── Preferred Duration ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.duration')}</Text>

                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={dynamicStyles.durationCard} onPress={() => setSelectedDuration('Short Visit')}>
                                    <Ionicons name={selectedDuration === 'Short Visit' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedDuration === 'Short Visit' ? "#02743F" : "#AAAEAC"} />
                                    <View style={dynamicStyles.durationTextCol}>
                                        <Text style={dynamicStyles.durationTitle}>{t('nurse_care.short_visit')}</Text>
                                        <Text style={dynamicStyles.durationSubtitle}>{t('nurse_care.short_visit_detail')}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={dynamicStyles.durationCard} onPress={() => setSelectedDuration('12 Hours (Night Shift)')}>
                                    <Ionicons name={selectedDuration === '12 Hours (Night Shift)' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedDuration === '12 Hours (Night Shift)' ? "#02743F" : "#AAAEAC"} />
                                    <View style={dynamicStyles.durationTextCol}>
                                        <Text style={dynamicStyles.durationTitle}>{t('nurse_care.twelve_hr_night')}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={dynamicStyles.durationCard} onPress={() => setSelectedDuration('12 Hours (Day Shift)')}>
                                    <Ionicons name={selectedDuration === '12 Hours (Day Shift)' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedDuration === '12 Hours (Day Shift)' ? "#02743F" : "#AAAEAC"} />
                                    <View style={dynamicStyles.durationTextCol}>
                                        <Text style={dynamicStyles.durationTitle}>{t('nurse_care.twelve_hr_day')}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={dynamicStyles.durationCard} onPress={() => setSelectedDuration('24 Hours (Live-in)')}>
                                    <Ionicons name={selectedDuration === '24 Hours (Live-in)' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedDuration === '24 Hours (Live-in)' ? "#02743F" : "#AAAEAC"} />
                                    <View style={dynamicStyles.durationTextCol}>
                                        <Text style={dynamicStyles.durationTitle}>{t('nurse_care.twenty_four_hr')}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ─── Patient Condition ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.condition')}</Text>

                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={dynamicStyles.radioCard} onPress={() => setSelectedCondition('Walking/ Mobile')}>
                                    <Ionicons name={selectedCondition === 'Walking/ Mobile' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCondition === 'Walking/ Mobile' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('nurse_care.walking')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={dynamicStyles.radioCard} onPress={() => setSelectedCondition('Bedridden')}>
                                    <Ionicons name={selectedCondition === 'Bedridden' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCondition === 'Bedridden' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('nurse_care.bedridden')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={dynamicStyles.radioCard} onPress={() => setSelectedCondition('Post-Surgery')}>
                                    <Ionicons name={selectedCondition === 'Post-Surgery' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCondition === 'Post-Surgery' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('nurse_care.post_surgery')}</Text>
                                </TouchableOpacity>
                                <View style={{ flex: 1, marginHorizontal: 4 }} />
                            </View>
                        </View>

                        {/* ─── Gender preferences ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.gender_pref')}</Text>

                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={dynamicStyles.radioCardSmall} onPress={() => setSelectedGender('Male')}>
                                    <Ionicons name={selectedGender === 'Male' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedGender === 'Male' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>Male</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={dynamicStyles.radioCardSmall} onPress={() => setSelectedGender('Female')}>
                                    <Ionicons name={selectedGender === 'Female' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedGender === 'Female' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>Female</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={dynamicStyles.radioCardSmall} onPress={() => setSelectedGender('Any')}>
                                    <Ionicons name={selectedGender === 'Any' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedGender === 'Any' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>Any</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ─── Not Sure Banner ─── */}
                        <TouchableOpacity style={dynamicStyles.notSureBanner} onPress={() => Linking.openURL('tel:+918062180429')} activeOpacity={0.75}>
                            <Image source={helpIcon} style={dynamicStyles.ideaIcon} resizeMode="contain" />
                            <View style={dynamicStyles.notSureTextGroup}>
                                <Text style={dynamicStyles.notSureTitle}>Not sure about your options?</Text>
                                <Text style={dynamicStyles.notSureSubtitle}>I’m not sure, let an Expert call me decide</Text>
                            </View>
                        </TouchableOpacity>
                        {/* ─── Confirm Address ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <Text style={dynamicStyles.sectionTitle}>Confirm Address</Text>
                            {locationDenied ? (
                                <FormInput
                                    placeholder="Type your full address"
                                    value={address}
                                    onChangeText={setAddress}
                                    multiline
                                    style={{ elevation: 0, backgroundColor: '#FFF' }}
                                />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(217,217,217,0.3)', padding: 12, borderRadius: 8 }}>
                                    <Ionicons name="location-outline" size={16} color="#2F2F2F" style={{ marginRight: 8 }} />
                                    <Text style={{ flex: 1, fontFamily: 'LexendDeca_400Regular', color: '#2F2F2F' }} numberOfLines={1}>{address}</Text>
                                    <TouchableOpacity onPress={() => router.push('/(auth)/city-selection')}>
                                        <Text style={{ color: '#02743F', fontFamily: 'LexendDeca_500Medium', marginLeft: 8 }}>Edit</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            <FormInput
                                placeholder="Landmark (optional, e.g. Near Apollo Hospital)"
                                value={landmark}
                                onChangeText={setLandmark}
                                style={{ marginTop: 12, elevation: 0 }}
                            />
                        </View>
                    </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

                    {/* ─── Fixed Normal Bottom Bar ─── */}
                    <View style={[dynamicStyles.bottomBarContainer, { paddingBottom: insets.bottom || 20, backgroundColor: isDarkMode ? '#252525' : '#FDFDE8' }]}>
                        <TouchableOpacity
                            style={[dynamicStyles.confirmButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                            activeOpacity={0.8}
                            disabled={isBooking || isLoadingInit}
                            onPress={handleBookService}
                        >
                            {isBooking ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={dynamicStyles.confirmButtonText}>
                                    {isLoadingInit ? t('common.initializing') : t('booking.request_staff')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    /* ─── Screen Base ─── */
    screen: {
        flex: 1,
        backgroundColor: '#048357', // Hero green background
    },
    container: {
        flex: 1,
    },

    /* ─── Header ─── */
    headerSafe: {
        backgroundColor: '#048357',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 20,
        color: '#FFFFFF',
        letterSpacing: -0.24,
        marginLeft: 12,
    },
    headerRight: {
        width: 32, // to balance back button width
    },

    /* ─── Main Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: isDarkMode ? '#252525' : '#FDFDE8', // Off-white cream / Dark
        borderTopLeftRadius: 51,
        borderTopRightRadius: 51,
        shadowColor: isDarkMode ? '#000000' : '#FFFFFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 42.8,
        elevation: 10,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 20, // Reduced padding since the button is no longer overlapping
    },

    /* ─── Text / Desc ─── */
    descText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        lineHeight: 20,
        color: isDarkMode ? '#CCCCCC' : '#555555',
        textAlign: 'center',
        paddingHorizontal: 12,
        marginBottom: 24,
        letterSpacing: -0.24,
    },

    sectionContainerBase: {
        backgroundColor: isDarkMode ? '#3A3A3A' : 'rgba(237,237,237,0.57)',
        borderRadius: 9,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 15,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: -0.24,
    },

    /* ─── Who Row ─── */
    whoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    whoButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        height: 33,
        borderRadius: 7,
        marginHorizontal: 4,
    },
    whoButtonActive: {
        backgroundColor: 'rgba(115,219,171,0.29)',
        borderWidth: 1,
        borderColor: '#02743F',
    },
    whoIconCheck: {
        marginRight: 4,
    },
    whoIcon: {
        width: 14,
        height: 14,
        marginRight: 4,
    },
    whoButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        letterSpacing: -0.24,
    },

    /* ─── Staff Card ─── */
    staffCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 9,
        height: 90,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    staffCardActive: {
        backgroundColor: 'rgba(4,131,87,0.43)',
        borderWidth: 1.5,
        borderColor: '#0E9757',
    },
    staffAvatarContainer: {
        marginRight: 12,
    },
    staffAvatar: {
        width: 60,
        height: 80,
    },
    staffInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    staffTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 15,
        color: isDarkMode ? '#CCCCCC' : '#555555',
        marginBottom: 4,
        letterSpacing: -0.24,
        flexShrink: 1,
    },
    staffTitleActive: {
        color: '#FFFFFF',
    },
    staffSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: isDarkMode ? '#AAAAAA' : '#555555',
        lineHeight: 12,
        letterSpacing: -0.24,
        flexShrink: 1,
    },
    staffSubtitleActive: {
        color: '#FFFFFF',
    },

    /* ─── Stacked Variants (New Row Setup) ─── */
    verticalStack: {
        flexDirection: 'column',
        gap: 12,
    },
    durationCardStacked: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    },
    radioCardStacked: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    },
    radioLabelStacked: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        marginLeft: 12,
    },

    /* ─── Legacy Grid Rows ─── */
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    durationCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        marginHorizontal: 4,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    },
    durationTextCol: {
        marginLeft: 8,
        flexShrink: 1,
        flex: 1,
    },
    durationTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 10,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
    },
    durationSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 8,
        color: isDarkMode ? '#CCCCCC' : '#2F2F2F',
    },

    radioCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        marginHorizontal: 4,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    },
    radioCardSmall: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 40,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        marginHorizontal: 3,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    },
    radioLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        marginLeft: 8,
    },

    /* ─── Not Sure Banner ─── */
    notSureBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#3A3A3A' : 'rgba(243,223,255,0.41)',
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
        marginBottom: 20,
    },
    ideaIcon: {
        width: 32,
        height: 38,
        marginRight: 10,
    },
    notSureTextGroup: {
        flex: 1,
    },
    notSureTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#CCCCCC' : '#555555',
        marginBottom: 2,
    },
    notSureSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#AAAAAA' : 'rgba(98,15,126,0.75)',
    },

    /* ─── Fixed Bottom Bar (New Setup) ─── */
    bottomBarContainer: {
        backgroundColor: isDarkMode ? '#252525' : '#FDFDE8', // Matches the cream card color perfectly
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', // Adds a tiny visual separation line from the scroll view
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: Platform.OS === 'android' ? 20 : 10, // Adjusts for Android without home indicator
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#02743F',
        width: 230,
        height: 48, // Slightly taller for a nice thumb target
        borderRadius: 24, // Matches half of height
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    confirmButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#FFFFFF',
    },
});
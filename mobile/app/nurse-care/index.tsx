// Book Home Nursing Care - Full Form
import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { locationService } from '@/services/device/locationService';
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { mediaService } from '@/services/api/mediaService';
import ImageUploadBox from '@/components/common/ImageUploadBox';

// ─── Figma Assets ───
const familyIcon = require('@/assets/images/cb86876504871abc5e6db19e5612175dae2b0479.png');
const nurseIcon = require('@/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png');
const ideaIcon = require('@/assets/images/c1c9dfda80d0a21cae62694d5d1f8d7ea182b581.png');

export default function BookNursingCareScreen() {
    const { t } = useTranslation();
    const router = useRouter();

    // Local UI state for radio buttons/selections
    const [selectedWho, setSelectedWho] = useState('Self');
    const [selectedStaff, setSelectedStaff] = useState('Option A');
    const [selectedDuration, setSelectedDuration] = useState('12 Hours (Night Shift)');
    const [selectedCondition, setSelectedCondition] = useState('');
    const [selectedGender, setSelectedGender] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    // API & Init state
    const [cityId, setCityId] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [serviceName, setServiceName] = useState('Nurse Care');
    const [servicePrice, setServicePrice] = useState(0);
    const [isLoadingInit, setIsLoadingInit] = useState(true);
    const [address, setAddress] = useState('Fetching address...');
    const [isBooking, setIsBooking] = useState(false);

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
                    setAddress('');
                }
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setCityId(profileRes.data.cityId);
                }
                const serviceRes = await apiClient.get<any[]>('/services');
                if (serviceRes.success && serviceRes.data) {
                    const svc = serviceRes.data.find((s: any) => s.slug === 'home-nurse');
                    if (svc) {
                        setServiceId(svc.id);
                        setServiceName(svc.name || 'Nurse Care');
                        setServicePrice(svc.basePrice ?? 0);
                    }
                }
            } catch (err) {
                console.log('Nurse Care init failed', err);
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
                staffType: selectedStaff === 'Option A' ? 'qualified-nurse' : 'bedside-attendant',
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
                pathname: '/payment/checkout',
                params: { bookingPayload, amount: String(servicePrice), label: serviceName },
            });
        } catch (error) {
            console.error('Nurse care error:', error);
            Alert.alert('Error', 'Failed to upload documents. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />

            {/* ─── Header Section (Green Background) ─── */}
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(tabs)' as any);
                            }
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('nurse_care.header')}</Text>
                    <View style={styles.headerRight} />
                </View>
            </SafeAreaView>

            {/* ─── Main Content Card (Cream Background with Top Radius) ─── */}
            <View style={styles.contentCard}>
                <KeyboardAwareScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid
                    extraScrollHeight={20}
                >
                    {/* Description Text */}
                    <Text style={styles.descText}>
                        {t('nurse_care.description')}
                    </Text>

                    {/* ─── Who is it for? ─── */}
                    <View style={styles.sectionContainerBase}>
                        <Text style={styles.sectionTitle}>{t('nurse_care.who_for')}</Text>
                        <View style={styles.whoRow}>
                            <TouchableOpacity
                                style={[styles.whoButton, selectedWho === 'Self' && styles.whoButtonActive]}
                                onPress={() => setSelectedWho('Self')}
                            >
                                {selectedWho === 'Self' && <Ionicons name="checkbox" size={16} color="#02743F" style={styles.whoIconCheck} />}
                                <Text style={styles.whoButtonText}>Self</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.whoButton, selectedWho === 'Spouse' && styles.whoButtonActive]}
                                onPress={() => setSelectedWho('Spouse')}
                            >
                                <Image source={familyIcon} style={styles.whoIcon} resizeMode="contain" />
                                <Text style={styles.whoButtonText}>Spouse</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.whoButton, selectedWho === 'Parent' && styles.whoButtonActive]}
                                onPress={() => setSelectedWho('Parent')}
                            >
                                <Image source={familyIcon} style={styles.whoIcon} resizeMode="contain" />
                                <Text style={styles.whoButtonText}>Parent</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── Type of Staff Needed ─── */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{t('nurse_care.staff_type')}</Text>

                        {/* Option A: Qualified Nurse */}
                        <TouchableOpacity
                            style={[styles.staffCard, selectedStaff === 'Option A' && styles.staffCardActive]}
                            onPress={() => setSelectedStaff('Option A')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.staffAvatarContainer}>
                                <Image source={nurseIcon} style={styles.staffAvatar} resizeMode="contain" />
                            </View>
                            <View style={styles.staffInfo}>
                                <Text style={[styles.staffTitle, selectedStaff === 'Option A' && styles.staffTitleActive]}>
                                    {t('nurse_care.option_a_title')}
                                </Text>
                                <Text style={[styles.staffSubtitle, selectedStaff === 'Option A' && styles.staffSubtitleActive]}>
                                    {t('nurse_care.option_a_subtitle')}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Option B: Bedside Attendant */}
                        <TouchableOpacity
                            style={[styles.staffCard, selectedStaff === 'Option B' && styles.staffCardActive]}
                            onPress={() => setSelectedStaff('Option B')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.staffAvatarContainer}>
                                <Image source={nurseIcon} style={styles.staffAvatar} resizeMode="contain" />
                            </View>
                            <View style={styles.staffInfo}>
                                <Text style={[styles.staffTitle, selectedStaff === 'Option B' && styles.staffTitleActive]}>
                                    {t('nurse_care.option_b_title')}
                                </Text>
                                <Text style={[styles.staffSubtitle, selectedStaff === 'Option B' && styles.staffSubtitleActive]}>
                                    {t('nurse_care.option_b_subtitle')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ─── Preferred Duration ─── */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{t('nurse_care.duration')}</Text>

                        <View style={styles.verticalStack}>
                            <TouchableOpacity style={styles.durationCardStacked} onPress={() => setSelectedDuration('Short Visit')}>
                                <Ionicons name={selectedDuration === 'Short Visit' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedDuration === 'Short Visit' ? "#02743F" : "#AAAEAC"} />
                                <View style={styles.durationTextCol}>
                                    <Text style={styles.durationTitle}>{t('nurse_care.short_visit')}</Text>
                                    <Text style={styles.durationSubtitle}>{t('nurse_care.short_visit_detail')}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.durationCardStacked} onPress={() => setSelectedDuration('12 Hours (Night Shift)')}>
                                <Ionicons name={selectedDuration === '12 Hours (Night Shift)' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedDuration === '12 Hours (Night Shift)' ? "#02743F" : "#AAAEAC"} />
                                <View style={styles.durationTextCol}>
                                    <Text style={styles.durationTitle}>{t('nurse_care.twelve_hr_night')}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.durationCardStacked} onPress={() => setSelectedDuration('12 Hours (Day Shift)')}>
                                <Ionicons name={selectedDuration === '12 Hours (Day Shift)' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedDuration === '12 Hours (Day Shift)' ? "#02743F" : "#AAAEAC"} />
                                <View style={styles.durationTextCol}>
                                    <Text style={styles.durationTitle}>{t('nurse_care.twelve_hr_day')}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.durationCardStacked} onPress={() => setSelectedDuration('24 Hours (Live-in)')}>
                                <Ionicons name={selectedDuration === '24 Hours (Live-in)' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedDuration === '24 Hours (Live-in)' ? "#02743F" : "#AAAEAC"} />
                                <View style={styles.durationTextCol}>
                                    <Text style={styles.durationTitle}>{t('nurse_care.twenty_four_hr')}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── Patient Condition ─── */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{t('nurse_care.condition')}</Text>

                        <View style={styles.verticalStack}>
                            <TouchableOpacity style={styles.radioCardStacked} onPress={() => setSelectedCondition('Walking/ Mobile')}>
                                <Ionicons name={selectedCondition === 'Walking/ Mobile' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedCondition === 'Walking/ Mobile' ? "#02743F" : "#AAAEAC"} />
                                <Text style={styles.radioLabelStacked}>{t('nurse_care.walking')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.radioCardStacked} onPress={() => setSelectedCondition('Bedridden')}>
                                <Ionicons name={selectedCondition === 'Bedridden' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedCondition === 'Bedridden' ? "#02743F" : "#AAAEAC"} />
                                <Text style={styles.radioLabelStacked}>{t('nurse_care.bedridden')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.radioCardStacked} onPress={() => setSelectedCondition('Post-Surgery')}>
                                <Ionicons name={selectedCondition === 'Post-Surgery' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedCondition === 'Post-Surgery' ? "#02743F" : "#AAAEAC"} />
                                <Text style={styles.radioLabelStacked}>{t('nurse_care.post_surgery')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── Gender preferences ─── */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{t('nurse_care.gender_pref')}</Text>

                        <View style={styles.verticalStack}>
                            <TouchableOpacity style={styles.radioCardStacked} onPress={() => setSelectedGender('Male')}>
                                <Ionicons name={selectedGender === 'Male' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedGender === 'Male' ? "#02743F" : "#AAAEAC"} />
                                <Text style={styles.radioLabelStacked}>Male</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.radioCardStacked} onPress={() => setSelectedGender('Female')}>
                                <Ionicons name={selectedGender === 'Female' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedGender === 'Female' ? "#02743F" : "#AAAEAC"} />
                                <Text style={styles.radioLabelStacked}>Female</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.radioCardStacked} onPress={() => setSelectedGender('Any')}>
                                <Ionicons name={selectedGender === 'Any' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedGender === 'Any' ? "#02743F" : "#AAAEAC"} />
                                <Text style={styles.radioLabelStacked}>Any</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── Not Sure Banner ─── */}
                    <View style={styles.notSureBanner}>
                        <Image source={ideaIcon} style={styles.ideaIcon} resizeMode="contain" />
                        <View style={styles.notSureTextGroup}>
                            <Text style={styles.notSureTitle}>{t('nurse_care.not_sure_title')}</Text>
                            <Text style={styles.notSureSubtitle}>{t('nurse_care.not_sure_subtitle')}</Text>
                        </View>
                    </View>

                </KeyboardAwareScrollView>

                {/* ─── Fixed Normal Bottom Bar ─── */}
                <SafeAreaView edges={['bottom']} style={styles.bottomBarContainer}>
                    <TouchableOpacity
                        style={[styles.confirmButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                        activeOpacity={0.8}
                        disabled={isBooking || isLoadingInit}
                        onPress={handleBookService}
                    >
                        {isBooking ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.confirmButtonText}>
                                {isLoadingInit ? t('common.initializing') : t('booking.request_staff')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </SafeAreaView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    /* ─── Screen Base ─── */
    screen: {
        flex: 1,
        backgroundColor: '#048357', // Hero green background
    },

    /* ─── Header ─── */
    headerSafe: {
        backgroundColor: '#048357',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    },
    headerRight: {
        width: 32, // to balance back button width
    },

    /* ─── Main Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Off-white cream
        borderTopLeftRadius: 51,
        borderTopRightRadius: 51,
        shadowColor: '#FFFFFF',
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
        color: '#555555',
        textAlign: 'center',
        paddingHorizontal: 12,
        marginBottom: 24,
        letterSpacing: -0.24,
    },

    sectionContainerBase: {
        backgroundColor: 'rgba(237,237,237,0.57)',
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
        color: '#2F2F2F',
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
        backgroundColor: '#FFFFFF',
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
        color: '#2F2F2F',
        letterSpacing: -0.24,
    },

    /* ─── Staff Card ─── */
    staffCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#AAAEAC',
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
        color: '#555555',
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
        color: '#555555',
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
        borderColor: '#AAAEAC',
        borderRadius: 11,
        backgroundColor: '#FFFFFF',
    },
    radioCardStacked: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#AAAEAC',
        borderRadius: 11,
        backgroundColor: '#FFFFFF',
    },
    radioLabelStacked: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
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
        borderColor: '#AAAEAC',
        borderRadius: 11,
        marginHorizontal: 4,
    },
    durationTextCol: {
        marginLeft: 8,
        flexShrink: 1,
        flex: 1,
    },
    durationTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 10,
        color: '#2F2F2F',
    },
    durationSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 8,
        color: '#2F2F2F',
    },

    radioCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 1,
        borderColor: '#AAAEAC',
        borderRadius: 11,
        marginHorizontal: 4,
    },
    radioCardSmall: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 40,
        borderWidth: 1,
        borderColor: '#AAAEAC',
        borderRadius: 11,
        marginHorizontal: 3,
    },
    radioLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
        marginLeft: 8,
    },

    /* ─── Not Sure Banner ─── */
    notSureBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(243,223,255,0.41)',
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
        color: '#555555',
        marginBottom: 2,
    },
    notSureSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: 'rgba(98,15,126,0.75)',
    },

    /* ─── Fixed Bottom Bar (New Setup) ─── */
    bottomBarContainer: {
        backgroundColor: '#FDFDE8', // Matches the cream card color perfectly
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)', // Adds a tiny visual separation line from the scroll view
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: Platform.OS === 'android' ? 20 : 10, // Adjusts for Android without home indicator
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#02743F',
        width: '100%',
        maxWidth: 281, // Keeps it from looking too wide on big screens
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
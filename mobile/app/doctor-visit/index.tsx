// Doctor Home Visit - Booking Screen
// PRD: Grid of symptoms, smart routing to GP or Physio, Time selection, Address confirmation
import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Platform,
    useWindowDimensions,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { locationService } from '@/services/device/locationService';
import FormInput from '@/components/common/FormInput';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { bookingService, Booking } from '@/services/api/bookingService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// Problems that auto-trigger Physiotherapist selection
const PHYSIO_PROBLEMS = new Set(['Poster-surgery Rehab', 'Frozen shoulder', 'Stroke Recovery']);

// ─── Figma-exported Assets ───
// Problem Icons (images from disk)
const feverIcon = require('@/assets/images/85703338762dce300aaacb9a05f302adc3d527f4.png');
const bpSugarIcon = require('@/assets/images/a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png');
const generalWeaknessIcon = require('@/assets/images/a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png');
const bodyPainIcon = require('@/assets/images/3a3fbbfc074010919d54378e2349e7a3ecdea262.png');
const postSurgeryIcon = require('@/assets/images/cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png');
const strokeIcon = require('@/assets/images/9c25016906e38b6b999adf0f9fb6cb2adb589322.png');
const frozenShoulderIcon = require('@/assets/images/05879295a9b69201cfab443f22bf9218402f1522.png');
const otherIcon = require('@/assets/images/34a78d011624199a5541b871a68bb218b41e5aba.png');

// Doctor Type Icons
const gpDoctorIcon = require('@/assets/images/9bbd0539ddfd504d8362c951cb07d107b0df9fdf.png');
const physioIcon = require('@/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png');

// ─── Constants ───
const PROBLEMS: { label: string; icon?: any; empty?: boolean }[] = [
    { label: 'Fever/Flu', icon: feverIcon },
    { label: 'BP/Sugar check', icon: bpSugarIcon },
    { label: 'General Weakness', icon: generalWeaknessIcon },
    { label: 'Body pain/joint pain', icon: bodyPainIcon },
    { label: 'Poster-surgery Rehab', icon: postSurgeryIcon },
    { label: 'Stroke Recovery', icon: strokeIcon },
    { label: 'Frozen shoulder', icon: frozenShoulderIcon },
    { label: 'Other', icon: otherIcon },
];

export default function DoctorVisitScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { width } = useWindowDimensions();

    // ─── Global State ───
    const { isReady, cityId, serviceId, serviceName, servicePrice, address, setAddress, locationDenied, isLoading: isLoadingInit } = useServiceInitialization('doctor-home-visit');

    // ─── State ───
    const [selectedProblem, setSelectedProblem] = React.useState<string | null>(null);
    const [otherProblemText, setOtherProblemText] = React.useState('');
    const [selectedDoctorType, setSelectedDoctorType] = React.useState<'GP' | 'Physio'>('GP');
    const [selectedWhen, setSelectedWhen] = React.useState<'ASAP' | 'Later'>('ASAP');
    const [scheduledDate, setScheduledDate] = React.useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = React.useState(false);
    const [pickerMode, setPickerMode] = React.useState<'date' | 'time'>('date');
    const [visitType, setVisitType] = React.useState<'Home' | 'Clinic'>('Home');

    // ─── Repeat Order State ───
    const [lastPhysioBooking, setLastPhysioBooking] = React.useState<Booking | null>(null);

    // ─── API State ───
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [isBooking, setIsBooking] = React.useState(false);

    // ─── Smart Logic: Auto-select doctor type based on problem ───
    const handleProblemSelect = (label: string) => {
        setSelectedProblem(label);
        if (PHYSIO_PROBLEMS.has(label)) {
            setSelectedDoctorType('Physio');
        } else if (label !== 'Other') {
            setSelectedDoctorType('GP');
        }
    };

    // ─── Repeat Order: Load last physio booking on mount ───
    React.useEffect(() => {
        (async () => {
            try {
                // Check cache first for instant display, but don't return so we fetch fresh data!
                const cached = await AsyncStorage.getItem('lastPhysioBooking');
                if (cached) {
                    try {
                        setLastPhysioBooking(JSON.parse(cached));
                    } catch {}
                }
                
                // Fetch history — look for any doctor visit with physiotherapist
                const res = await bookingService.getMyBookings();
                if (res.success && res.data && res.data.length > 0) {
                    // Prefer physio, fall back to any doctor visit booking
                    const physio = res.data.find(b => b.doctorType === 'physiotherapist') ||
                                   res.data.find(b => b.service?.slug?.includes('doctor'));
                    if (physio) {
                        setLastPhysioBooking(physio);
                        await AsyncStorage.setItem('lastPhysioBooking', JSON.stringify(physio));
                    }
                }
            } catch {
                // silently ignore — repeat order is a convenience feature
            }
        })();
    }, []);

    // ─── Repeat Order: Apply last booking settings ───
    const applyRepeatOrder = () => {
        if (!lastPhysioBooking) return;
        
        let symptomStr = '';
        
        // 1. Try root level symptoms array
        if (Array.isArray(lastPhysioBooking.symptoms) && lastPhysioBooking.symptoms.length > 0) {
            symptomStr = lastPhysioBooking.symptoms[0];
        } else if (typeof lastPhysioBooking.symptoms === 'string') {
            try {
                const parsed = JSON.parse(lastPhysioBooking.symptoms);
                if (Array.isArray(parsed) && parsed.length > 0) symptomStr = parsed[0];
            } catch {
                symptomStr = lastPhysioBooking.symptoms;
            }
        }

        // 2. Try nested formDataJson
        if (!symptomStr && lastPhysioBooking.formDataJson) {
            const fd = lastPhysioBooking.formDataJson;
            if (Array.isArray(fd.symptoms) && fd.symptoms.length > 0) symptomStr = fd.symptoms[0];
            else if (typeof fd.symptoms === 'string') symptomStr = fd.symptoms;
            else if (fd.reason) symptomStr = fd.reason;
        }

        if (symptomStr) {
            const normalizedSymptom = symptomStr.trim().toLowerCase();
            const matchedProblem = PROBLEMS.find(p => p.label.toLowerCase() === normalizedSymptom);
            
            if (matchedProblem) {
                setSelectedProblem(matchedProblem.label);
                setOtherProblemText('');
            } else {
                setSelectedProblem('Other');
                setOtherProblemText(symptomStr);
            }
        } else {
            // Fallback if backend returned no symptoms, so the UI still visibly changes
            setSelectedProblem(PROBLEMS[0].label);
        }

        const isPhysio = lastPhysioBooking.doctorType === 'physiotherapist';
        setSelectedDoctorType(isPhysio ? 'Physio' : 'GP');
        setVisitType(lastPhysioBooking.formDataJson?.visitType || 'Home');
        setSelectedWhen('ASAP');
        
        Alert.alert('Applied', 'Your previous booking details have been auto-selected.');
    };

    // ─── Date formatting helper ───
    const formatScheduledDate = (d: Date) =>
        d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) +
        ' at ' +
        d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const handleBookService = async () => {
        if (!selectedProblem) {
            Alert.alert('Select Problem', 'Please select a health problem first.');
            return;
        }
        if (selectedProblem === 'Other' && !otherProblemText.trim()) {
            Alert.alert('Describe Problem', 'Please describe your health problem in the text field.');
            return;
        }
        if (selectedWhen === 'Later' && scheduledDate <= new Date()) {
            Alert.alert('Invalid Time', 'Please select a future date and time for the visit.');
            return;
        }
        if (!address || address.trim().length < 5 || address === 'Fetching address...') {
            Alert.alert('Address Required', locationDenied
                ? 'Please type your full address manually so the doctor can reach you.'
                : 'Could not fetch your address. Please wait or try again.');
            return;
        }
        if (!isReady) {
            Alert.alert('Error', 'Service initialization incomplete. Please check your internet connection or try logging out and back in.');
            return;
        }
        try {
            setIsBooking(true);

            // Upload media first (safe to do before payment — no booking created yet)
            let uploadedImageUrls: string[] = [];
            if (selectedImages.length > 0) {
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'doctor-visits');
            }

            const symptomLabel = selectedProblem === 'Other' ? otherProblemText.trim() : selectedProblem;

            // Navigate to checkout — booking is created INSIDE checkout after payment succeeds
            const gps = await locationService.getCurrentLocation().catch(() => null);
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: (selectedWhen === 'Later' ? scheduledDate : new Date()).toISOString(),
                addressLine: address || undefined,
                latitude: gps?.latitude,
                longitude: gps?.longitude,
                symptoms: [symptomLabel],
                doctorType: selectedDoctorType === 'GP' ? 'general-physician' : 'physiotherapist',
                formDataJson: {
                    visitType,
                    urgency: selectedWhen,
                    attachments: uploadedImageUrls,
                },
            });

            router.push({
                pathname: '/payment/checkout',
                params: {
                    bookingPayload,
                    amount: String(servicePrice),
                    label: serviceName || 'Doctor Home Visit',
                },
            });
        } catch (error) {
            console.error('Doctor visit error:', error);
            Alert.alert('Error', 'Failed to upload attachments. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };

    // ─── BULLETPROOF GRID MATH FOR SMALL SCREENS (< 370px) ───
    // 1. Calculate the exact workable width inside the card
    const scrollPadding = 50; // 25px paddingHorizontal on ScrollView * 2
    const cardPadding = 36; // 18px padding inside sectionCard * 2
    const availableWidth = width - scrollPadding - cardPadding;

    // 2. Exact Item Width: 31.5% ensures 3 items fit perfectly with room for space-between
    const exactProblemWidth = Math.floor(availableWidth * 0.315);
    // 3. Scale the image height dynamically so it doesn't stretch weirdly on small screens
    const exactIconHeight = exactProblemWidth * 0.85;

    // 4. Pad the array to ensure the last row strictly left-aligns
    const paddedProblems = [...PROBLEMS];
    while (paddedProblems.length % 3 !== 0) {
        paddedProblems.push({ label: '', empty: true });
    }

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />

            {/* ─── Header Section (Green Background) ─── */}
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('doctor_visit.header')}</Text>
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
                    {/* ─── Repeat Order Banner (only shown if last physio booking exists) ─── */}
                    {lastPhysioBooking && (
                        <TouchableOpacity style={styles.repeatBanner} onPress={applyRepeatOrder} activeOpacity={0.85}>
                            <Ionicons name="refresh-circle-outline" size={22} color={Colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.repeatBannerTitle}>Book Same as Last Time</Text>
                                <Text style={styles.repeatBannerSub}>
                                    {(Array.isArray(lastPhysioBooking.symptoms) ? lastPhysioBooking.symptoms[0] : 
                                      (lastPhysioBooking.formDataJson?.symptoms?.[0] || lastPhysioBooking.formDataJson?.reason || lastPhysioBooking.symptoms)) || 'Last visit'} · {lastPhysioBooking.doctorType === 'physiotherapist' ? 'Physiotherapist' : 'General Physician'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                    )}

                    {/* Description Card */}
                    <View style={styles.descCard}>
                        <Text style={styles.descText}>
                            <Text style={styles.descTextBold}>Booking a doctor or </Text>
                            <Text style={styles.descTextGreen}>physiotherapist </Text>
                            <Text style={styles.descTextNormal}>to visit your home for non-emergency issues.</Text>
                        </Text>
                    </View>

                    {/* ─── Select Problem Card ─── */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>{t('booking.select_problem')}</Text>

                        <View style={styles.problemsGrid}>
                            {paddedProblems.map((item, index) => {
                                // Render invisible spacer if it's a padding item
                                if (item.empty) {
                                    return <View key={`empty-${index}`} style={{ width: exactProblemWidth }} />;
                                }

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.problemItem,
                                            { width: exactProblemWidth },
                                            selectedProblem === item.label && styles.problemItemActive
                                        ]}
                                        onPress={() => handleProblemSelect(item.label)}
                                    >
                                        <View style={[styles.problemIconContainer, { height: exactIconHeight }]}>
                                            <Image source={item.icon} style={styles.problemIcon} resizeMode="cover" />
                                        </View>
                                        <Text style={[styles.problemLabel, selectedProblem === item.label && styles.problemLabelActive]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* "Other" free-text input — only shown when Other is selected */}
                        {selectedProblem === 'Other' && (
                            <TextInput
                                style={styles.otherInput}
                                placeholder="Describe your health problem..."
                                placeholderTextColor={Colors.textMuted}
                                value={otherProblemText}
                                onChangeText={setOtherProblemText}
                                multiline
                                maxLength={200}
                            />
                        )}

                        {/* Smart Banner */}
                        <View style={styles.smartBanner}>
                            <View style={styles.smartTag}>
                                <Text style={styles.smartTagText}>Smart :</Text>
                            </View>
                            <Text style={styles.smartBannerText}>
                                Post-surgery, frozen shoulder & stroke visits will auto-select physiotherapist
                            </Text>
                        </View>
                    </View>

                    {/* ─── Select Doctor Type Card ─── */}
                    <View style={styles.sectionCardSmall}>
                        <Text style={styles.sectionTitle}>{t('booking.select_doctor_type')}</Text>
                        <View style={styles.doctorTypeRow}>
                            {/* Selected State (General Physician) */}
                            <TouchableOpacity
                                style={[styles.doctorTypeButton, selectedDoctorType === 'GP' && styles.doctorTypeActive]}
                                onPress={() => setSelectedDoctorType('GP')}
                            >
                                <Image source={gpDoctorIcon} style={styles.doctorTypeIconGP} resizeMode="contain" />
                                <Text style={selectedDoctorType === 'GP' ? styles.doctorTypeActiveText : styles.doctorTypeInactiveText} numberOfLines={2}>{t('doctor_visit.general_physician')}</Text>
                            </TouchableOpacity>

                            {/* Unselected State (Physiotherapist) */}
                            <TouchableOpacity
                                style={[styles.doctorTypeButton, selectedDoctorType === 'Physio' && styles.doctorTypeActive]}
                                onPress={() => setSelectedDoctorType('Physio')}
                            >
                                <Image source={physioIcon} style={styles.doctorTypeIconPhysio} resizeMode="contain" />
                                <Text style={selectedDoctorType === 'Physio' ? styles.doctorTypeActiveText : styles.doctorTypeInactiveText} numberOfLines={2}>{t('doctor_visit.physiotherapist')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── Select Visit Type Card ─── */}
                    <View style={styles.sectionCardSmall}>
                        <Text style={styles.sectionTitle}>{t('booking.select_visit_type')}</Text>
                        <View style={styles.visitTypeRow}>
                            <TouchableOpacity
                                style={[styles.visitTypeOption, visitType === 'Home' && styles.visitTypeOptionActive]}
                                onPress={() => setVisitType('Home')}
                            >
                                <Ionicons name="home-outline" size={20} color={visitType === 'Home' ? Colors.primary : Colors.textLight} />
                                <Text style={[styles.visitTypeText, visitType === 'Home' && styles.visitTypeTextActive]}>{t('doctor_visit.home_session')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.visitTypeOption, visitType === 'Clinic' && styles.visitTypeOptionActive]}
                                onPress={() => setVisitType('Clinic')}
                            >
                                <Ionicons name="business-outline" size={20} color={visitType === 'Clinic' ? Colors.primary : Colors.textLight} />
                                <Text style={[styles.visitTypeText, visitType === 'Clinic' && styles.visitTypeTextActive]}>{t('doctor_visit.clinic_visit')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── When? Card ─── */}
                    <View style={styles.sectionCardSmall}>
                        <Text style={styles.sectionTitle}>{t('booking.when')}</Text>

                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => setSelectedWhen('ASAP')}
                        >
                            <Ionicons name={selectedWhen === 'ASAP' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedWhen === 'ASAP' ? Colors.primary : Colors.textLight} />
                            <Text style={styles.radioLabelMain}>{t('booking.come_asap')} <Text style={styles.radioLabelSub}>{t('booking.urgent')}</Text></Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => { setSelectedWhen('Later'); setPickerMode('date'); setShowDatePicker(true); }}
                        >
                            <Ionicons name={selectedWhen === 'Later' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedWhen === 'Later' ? Colors.primary : Colors.textLight} />
                            <Text style={styles.radioLabelMainGreen}>{t('booking.schedule_later')} <Text style={styles.radioLabelSub}>{t('booking.date_time_picker')}</Text></Text>
                        </TouchableOpacity>

                        {/* Selected date display — tap to reopen picker */}
                        {selectedWhen === 'Later' && (
                            <TouchableOpacity style={styles.datePickerBox} onPress={() => { setPickerMode('date'); setShowDatePicker(true); }} activeOpacity={0.8}>
                                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                                <Text style={styles.datePickerText}>{formatScheduledDate(scheduledDate)}</Text>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}

                        {showDatePicker && (
                            <DateTimePicker
                                value={scheduledDate}
                                mode={pickerMode}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                                onChange={(_event: any, picked?: Date) => {
                                    if (!picked) {
                                        // User cancelled — close picker, keep previous value
                                        setShowDatePicker(false);
                                        return;
                                    }
                                    if (pickerMode === 'date') {
                                        // Merge picked date with existing time
                                        const merged = new Date(scheduledDate);
                                        merged.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
                                        setScheduledDate(merged);
                                        if (Platform.OS === 'android') {
                                            // On Android: close date picker, open time picker next
                                            setPickerMode('time');
                                        }
                                    } else {
                                        // Merge picked time with existing date
                                        const merged = new Date(scheduledDate);
                                        merged.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
                                        setScheduledDate(merged);
                                        setShowDatePicker(false);
                                    }
                                }}
                            />
                        )}
                    </View>

                    {/* ─── Upload Documents ─── */}
                    <View style={{ paddingHorizontal: 2 }}>
                        <ImageUploadBox
                            title={t('booking.upload_reports')}
                            subtitle={t('booking.upload_reports_hint')}
                            onImagesChange={setSelectedImages}
                            maxImages={5}
                        />
                    </View>

                    {/* ─── Confirm Address Card ─── */}
                    <View style={styles.sectionCardSmall}>
                        <Text style={styles.sectionTitle}>{t('booking.confirm_address')}</Text>

                        {locationDenied ? (
                            <FormInput
                                placeholder="Type your full address manually"
                                value={address}
                                onChangeText={setAddress}
                                multiline
                                style={{ elevation: 0 }} // Remove shadow to match card style
                            />
                        ) : (
                            <View style={styles.addressBox}>
                                <Ionicons name="location-outline" size={16} color="#2F2F2F" style={styles.addressIcon} />
                                <Text style={styles.addressText} numberOfLines={1}>{address}</Text>
                                <TouchableOpacity onPress={() => router.push('/(auth)/city-selection')}>
                                    <Text style={styles.addressEdit}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={styles.addressHelper}>
                            {locationDenied
                                ? "GPS Access Denied. Please provide exact location."
                                : "Auto-fitted from user profile(Google maps location)."}
                        </Text>
                    </View>

                    {/* Bottom Padding for Fixed App Bar */}
                    <View style={styles.bottomSpacer} />
                </KeyboardAwareScrollView>
            </View>

            {/* ─── Fixed Bottom Bar ─── */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.bookButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                    activeOpacity={0.8}
                    disabled={isBooking || isLoadingInit}
                    onPress={handleBookService}
                >
                    {isBooking ? (
                        <ActivityIndicator color={Colors.textWhite} />
                    ) : (
                        <Text style={styles.bookButtonText}>
                            {isLoadingInit ? t('common.initializing') : t('booking.book_now')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    /* ─── Screen Base ─── */
    screen: {
        flex: 1,
        backgroundColor: Colors.primary, // Hero green background
    },

    /* ─── Header ─── */
    headerSafe: {
        backgroundColor: Colors.primary,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        paddingBottom: 25,
        paddingTop: 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        letterSpacing: -0.24,
        marginLeft: 12,
    },
    headerRight: {
        width: 32, // to balance back button width
    },

    /* ─── Main Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: Colors.bgScreen, // Off-white cream
        borderTopLeftRadius: Radius.xl * 2,
        borderTopRightRadius: Radius.xl * 2,
        ...Shadow.card,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
    },

    /* ─── Description Card ─── */
    descCard: {
        backgroundColor: 'rgba(255,255,255,0.43)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        // elevation: 2,
    },
    descText: {
        textAlign: 'center',
        lineHeight: 20,
    },
    descTextBold: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    descTextGreen: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.primary,
    },
    descTextNormal: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 14,
        color: '#777777',
    },

    /* ─── Repeat Order Banner ─── */
    repeatBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F9F2',
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        gap: 12,
    },
    repeatBannerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 2,
    },
    repeatBannerSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textBody,
    },

    /* ─── Generic Section Styling ─── */
    sectionCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadow.card,
    },
    sectionCardSmall: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadow.card,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.primary,
        marginBottom: Spacing.lg,
        letterSpacing: -0.24,
    },

    /* ─── Problems Grid (FIXED FOR SMALL SCREENS) ─── */
    problemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between', // CRITICAL: Ensures perfect spacing instead of breaking rows
    },
    problemItem: {
        // Width is handled dynamically inline
        backgroundColor: Colors.bgScreen,
        borderRadius: Radius.md,
        ...Shadow.card,
        marginBottom: 10, // Replaces gap: 10 for wrapping rows securely
    },
    problemItemActive: {
        borderColor: Colors.primary,
        borderWidth: 2,
        // backgroundColor: 'rgba(4, 131, 87, 0.05)',
    },
    problemIconContainer: {
        // Height is handled dynamically inline
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    problemIcon: {
        width: '100%',
        height: '100%',
    },
    problemLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: Colors.textDark,
        textAlign: 'center',
        paddingVertical: 8,
        paddingHorizontal: 2,
        lineHeight: 12,
        letterSpacing: -0.24,
    },
    problemLabelActive: {
        color: Colors.primary,
        fontFamily: Fonts.semiBold,
    },

    /* ─── Smart Banner ─── */
    smartBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    smartTag: {
        backgroundColor: 'rgba(97,172,102,0.6)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 6,
    },
    smartTagText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: Colors.textDark,
    },
    smartBannerText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.primary,
        lineHeight: 14,
    },

    /* ─── Select Doctor Type ─── */
    doctorTypeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    doctorTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 42, // Increased slightly to comfortably hold wrapped text on 320px screens
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(143,143,143,0.54)',
        paddingHorizontal: 6,
    },
    doctorTypeActive: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(2,116,63,0.05)',
    },
    doctorTypeIconGP: {
        width: 23,
        height: 23,
        marginRight: 4,
    },
    doctorTypeIconPhysio: {
        width: 24,
        height: 24,
        marginRight: 4,
    },
    doctorTypeActiveText: {
        flexShrink: 1, // Stops text pushing out of the button on extremely small devices
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: Colors.primary,
    },
    doctorTypeInactiveText: {
        flexShrink: 1, // Stops text pushing out of the button on extremely small devices
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
    },

    /* ─── Visit Type Selection ─── */
    visitTypeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    visitTypeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(143,143,143,0.3)',
        gap: 8,
    },
    visitTypeOptionActive: {
        borderColor: '#048357',
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
    },
    visitTypeText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },
    visitTypeTextActive: {
        color: Colors.primary,
        fontFamily: Fonts.semiBold,
    },

    /* ─── When? ─── */
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    radioLabelMain: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.primaryDark,
    },
    radioLabelMainGreen: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.primaryDark,
    },
    radioLabelSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
    },

    /* ─── Confirm Address ─── */
    addressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(217,217,217,0.29)',
        borderWidth: 1,
        borderColor: 'rgba(143,143,143,0.15)',
        borderRadius: 7,
        height: 37,
        paddingHorizontal: 12,
        marginBottom: 6,
    },
    addressIcon: {
        marginRight: 8,
    },
    addressText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textDark,
    },
    addressEdit: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.primary,
        marginLeft: 8,
    },
    addressHelper: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.primary,
        marginLeft: 4,
    },

    /* ─── Fixed Bottom Bar ─── */
    bottomSpacer: {
        height: 100,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.bgHeader,
        height: 111,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        alignItems: 'center',
        paddingTop: 18,
    },
    bookButton: {
        width: 230,
        height: 48,
        backgroundColor: Colors.primary,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.button,
        color: Colors.textWhite,
    },

    /* ─── Repeat Order Banner ─── */
    repeatBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(4,131,87,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(4,131,87,0.25)',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        marginBottom: Spacing.md,
    },
    repeatBannerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.primary,
    },
    repeatBannerSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
        marginTop: 1,
    },

    /* ─── Other Problem Input ─── */
    otherInput: {
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textBody,
        backgroundColor: '#fff',
        marginBottom: Spacing.sm,
        minHeight: 72,
        textAlignVertical: 'top',
    },

    /* ─── Date Picker Box ─── */
    datePickerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        backgroundColor: 'rgba(4,131,87,0.04)',
        marginTop: 4,
    },
    datePickerText: {
        flex: 1,
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.primary,
    },

});
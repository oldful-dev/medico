// Doctor Home Visit - Booking Screen
// PRD: Grid of symptoms, smart routing to GP or Physio, Time selection, Address confirmation
import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Platform, useWindowDimensions, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { locationService } from '@/services/device/locationService';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { useUser } from '@/context/UserContext';
import { mediaService } from '@/services/api/mediaService';
import { bookingService, Booking } from '@/services/api/bookingService';
import { userService } from '@/services/api/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const translateSymptomLabel = (label: string, t: any) => {
  const keyMap: Record<string, string> = {
    'fever/flu': 'doctor_visit.fever_flu',
    'bp/sugar check': 'doctor_visit.bp_sugar',
    'general weakness': 'doctor_visit.general_weakness',
    'body pain/joint pain': 'doctor_visit.body_pain',
    'poster-surgery rehab': 'doctor_visit.post_surgery',
    'post-surgery rehab': 'doctor_visit.post_surgery',
    'stroke recovery': 'doctor_visit.stroke_recovery',
    'frozen shoulder': 'doctor_visit.frozen_shoulder',
    'other': 'doctor_visit.other',
  };
  const key = keyMap[label.toLowerCase()];
  return key ? t(key) : label;
};

export default function DoctorVisitScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(colors, isDarkMode);

    // ─── Global State ───
    const { isReady, cityId, serviceId, serviceName, servicePrice, address, setAddress, locationDenied, isLoading: isLoadingInit } = useServiceInitialization('doctor-home-visit');
    const { profile } = useUser();

    // ─── State ───
    const [selectedProblem, setSelectedProblem] = React.useState<string | null>(null);
    const [otherProblemText, setOtherProblemText] = React.useState('');
    const [selectedDoctorType, setSelectedDoctorType] = React.useState<'GP' | 'Physio'>('GP');
    const [selectedWhen, setSelectedWhen] = React.useState<'ASAP' | 'Later'>('ASAP');
    const [scheduledDate, setScheduledDate] = React.useState<Date>(new Date());
    const [selectedDateIdx, setSelectedDateIdx] = React.useState(0);
    const [selectedTimeSlot, setSelectedTimeSlot] = React.useState('09:00 AM');
    const [landmark, setLandmark] = React.useState('');
    const [visitType] = React.useState<'Home'>('Home');

    // ─── Auto-fill profile address only on mount when GPS address is not available ───
    const [addressInitialized, setAddressInitialized] = React.useState(false);
    React.useEffect(() => {
        if (addressInitialized) return; // Only run once
        const addressEmpty = !address || address === 'Fetching address...' || address === '';
        if (addressEmpty && profile?.addresses?.length) {
            const defaultAddr = profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0];
            if (defaultAddr) {
                const parts = [defaultAddr.line1, defaultAddr.line2, defaultAddr.cityName].filter(Boolean);
                setAddress(parts.join(', '));
                if (defaultAddr.landmark) setLandmark(defaultAddr.landmark);
                setAddressInitialized(true);
            }
        }
        if (!addressEmpty) {
            setAddressInitialized(true);
        }
    }, [profile]);

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
        setSelectedWhen('ASAP');
        
        Alert.alert(t('doctor_visit.applied_title'), t('doctor_visit.applied_msg'));
    };

    // ─── Date/Time helpers for inline picker ───
    const LATER_DATES = React.useMemo(() => {
        const days: Date[] = [];
        const start = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'];

    const applyDateTimeSelection = (dateIdx: number, timeSlot: string) => {
        const base = LATER_DATES[dateIdx];
        const [timePart, meridiem] = timeSlot.split(' ');
        const [h, m] = timePart.split(':').map(Number);
        const hours = meridiem === 'PM' && h !== 12 ? h + 12 : meridiem === 'AM' && h === 12 ? 0 : h;
        const merged = new Date(base);
        merged.setHours(hours, m, 0, 0);
        setScheduledDate(merged);
    };


    // Silently upsert the address back to profile when user books
    const syncAddressToProfile = async (addressText: string, landmarkText: string) => {
        if (!profile?.id || !addressText.trim()) return;
        try {
            const existing = profile.addresses?.find((a: any) => a.isDefault) || profile.addresses?.[0];
            const payload = {
                label: existing?.label || 'Home',
                line1: addressText.trim(),
                cityName: existing?.cityName || '',
                state: existing?.state || '',
                pincode: existing?.pincode || '',
                landmark: landmarkText.trim() || undefined,
                isDefault: true,
            };
            if (existing?.id) {
                await userService.updateAddress(profile.id, existing.id, payload);
            } else {
                await userService.addAddress(profile.id, payload);
            }
        } catch {
            // non-fatal — booking still proceeds
        }
    };

    const handleBookService = async () => {
        if (!selectedProblem) {
            Alert.alert(t('common.required'), t('doctor_visit.please_select_problem'));
            return;
        }
        if (selectedProblem === 'Other' && !otherProblemText.trim()) {
            Alert.alert(t('common.required'), t('doctor_visit.describe_problem_alert'));
            return;
        }
        if (selectedWhen === 'Later' && scheduledDate <= new Date()) {
            Alert.alert(t('common.error'), t('doctor_visit.invalid_time_alert'));
            return;
        }
        if (!address || address.trim().length < 5 || address === 'Fetching address...') {
            Alert.alert(t('common.required'), locationDenied
                ? t('doctor_visit.address_required_gps_denied')
                : t('doctor_visit.address_required_failed'));
            return;
        }
        if (!isReady) {
            Alert.alert(t('common.error'), t('booking.init_incomplete'));
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

            // Sync address back to profile (non-blocking, non-fatal)
            syncAddressToProfile(address, landmark);

            // Navigate to checkout — booking is created INSIDE checkout after payment succeeds
            const gps = await locationService.getCurrentLocation().catch(() => null);
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: (selectedWhen === 'Later' ? scheduledDate : new Date()).toISOString(),
                addressLine: address || undefined,
                landmark: landmark.trim() || undefined,
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
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: String(servicePrice),
                    label: serviceName || 'Doctor Home Visit',
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
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
        <View style={[styles.screen, { backgroundColor: colors.primary }]}>
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* ─── Header Section (Green Background) ─── */}
            <SafeAreaView style={[styles.headerSafe, { backgroundColor: colors.primary }]} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('doctor_visit.header')}</Text>
                </View>
            </SafeAreaView>

            {/* ─── Main Content Card (Cream Background with Top Radius) ─── */}
            <View style={[styles.contentCard, { backgroundColor: colors.bgScreen }]}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                        <TouchableOpacity style={[styles.repeatBanner, { backgroundColor: colors.bgCardMuted, borderColor: colors.primary }]} onPress={applyRepeatOrder} activeOpacity={0.85}>
                            <Ionicons name="refresh-circle-outline" size={22} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.repeatBannerTitle, { color: colors.textDark }]}>{t('doctor_visit.book_same_last_time')}</Text>
                                <Text style={[styles.repeatBannerSub, { color: colors.textMuted }]}>
                                    {translateSymptomLabel(
                                      ((Array.isArray(lastPhysioBooking.symptoms) ? lastPhysioBooking.symptoms[0] :
                                        (lastPhysioBooking.formDataJson?.symptoms?.[0] || lastPhysioBooking.formDataJson?.reason || lastPhysioBooking.symptoms)) || 'Last visit'), t
                                    )} · {lastPhysioBooking.doctorType === 'physiotherapist' ? t('doctor_visit.physiotherapist') : t('doctor_visit.general_physician')}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                        </TouchableOpacity>
                    )}

                    {/* Description Card */}
                    <View style={[styles.descCard, { backgroundColor: colors.bgCardMuted }]}>
                        <Text style={styles.descText}>
                            <Text style={[styles.descTextBold, { color: colors.textDark }]}>{t('doctor_visit.description_bold')}</Text>
                            <Text style={[styles.descTextGreen, { color: colors.primary }]}>{t('doctor_visit.description_green')}</Text>
                            <Text style={[styles.descTextNormal, { color: colors.textMuted }]}>{t('doctor_visit.description_normal')}</Text>
                        </Text>
                    </View>

                    {/* ─── Select Problem Card ─── */}
                    <View style={[styles.sectionCard, { backgroundColor: colors.bgCard }]}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('booking.select_problem')}</Text>

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
                                            { width: exactProblemWidth, backgroundColor: colors.bgScreen },
                                            selectedProblem === item.label && [styles.problemItemActive, { borderColor: colors.primary }]
                                        ]}
                                        onPress={() => handleProblemSelect(item.label)}
                                    >
                                        <View style={[styles.problemIconContainer, { height: exactIconHeight }]}>
                                            <Image source={item.icon} style={styles.problemIcon} resizeMode="cover" />
                                        </View>
                                        <Text style={[styles.problemLabel, { color: colors.textDark }, selectedProblem === item.label && [styles.problemLabelActive, { color: colors.primary }]]}>{translateSymptomLabel(item.label, t)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* "Other" free-text input — only shown when Other is selected */}
                        {selectedProblem === 'Other' && (
                            <TextInput
                                style={[styles.otherInput, { backgroundColor: colors.bgScreen, color: colors.textDark, borderColor: colors.borderLight }]}
                                placeholder={t('doctor_visit.describe_problem_placeholder')}
                                placeholderTextColor={colors.textMuted}
                                value={otherProblemText}
                                onChangeText={setOtherProblemText}
                                multiline
                                maxLength={200}
                            />
                        )}

                        {/* Smart Banner */}
                        <View style={styles.smartBanner}>
                            <View style={styles.smartTag}>
                                <Text style={[styles.smartTagText, { color: colors.textDark }]}>{t('doctor_visit.smart_label')}</Text>
                            </View>
                            <Text style={[styles.smartBannerText, { color: colors.primary }]}>
                                {t('doctor_visit.smart_banner')}
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

                    {/* ─── When? Card ─── */}
                    <View style={styles.sectionCardSmall}>
                        <Text style={styles.sectionTitle}>{t('booking.when')}</Text>

                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => setSelectedWhen('ASAP')}
                        >
                            <Ionicons name={selectedWhen === 'ASAP' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedWhen === 'ASAP' ? colors.primary : colors.textLight} />
                            <Text style={styles.radioLabelMain}>{t('booking.come_asap')} <Text style={styles.radioLabelSub}>{t('booking.urgent')}</Text></Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => {
                                setSelectedWhen('Later');
                                applyDateTimeSelection(selectedDateIdx, selectedTimeSlot);
                            }}
                        >
                            <Ionicons name={selectedWhen === 'Later' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedWhen === 'Later' ? colors.primary : colors.textLight} />
                            <Text style={styles.radioLabelMainGreen}>{t('booking.schedule_later')} <Text style={styles.radioLabelSub}>{t('booking.date_time_picker')}</Text></Text>
                        </TouchableOpacity>

                        {/* Inline date + time chips — shown when Later is selected */}
                        {selectedWhen === 'Later' && (
                            <>
                                <Text style={styles.slotSectionLabel}>{t('doctor_visit.select_date')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                                    {LATER_DATES.map((d, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[styles.chip, selectedDateIdx === idx && styles.chipActive]}
                                            onPress={() => {
                                                setSelectedDateIdx(idx);
                                                applyDateTimeSelection(idx, selectedTimeSlot);
                                            }}
                                        >
                                            <Text style={[styles.chipLabel, selectedDateIdx === idx && styles.chipLabelActive]}>
                                                {d.toLocaleDateString(i18n.language, { weekday: 'short' })}
                                            </Text>
                                            <Text style={[styles.chipSub, selectedDateIdx === idx && styles.chipLabelActive]}>
                                                {d.getDate()} {d.toLocaleDateString(i18n.language, { month: 'short' })}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.slotSectionLabel}>{t('doctor_visit.select_time')}</Text>
                                <View style={styles.timeSlotsGrid}>
                                    {TIME_SLOTS.map((slot) => (
                                        <TouchableOpacity
                                            key={slot}
                                            style={[styles.timeSlot, selectedTimeSlot === slot && styles.timeSlotActive]}
                                            onPress={() => {
                                                setSelectedTimeSlot(slot);
                                                applyDateTimeSelection(selectedDateIdx, slot);
                                            }}
                                        >
                                            <Text style={[styles.timeSlotText, selectedTimeSlot === slot && styles.timeSlotTextActive]}>
                                                {slot}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
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

                        <View style={styles.addressBox}>
                            <Ionicons name="location-outline" size={16} color={colors.textDark} style={styles.addressIcon} />
                            <TextInput
                                value={address}
                                onChangeText={setAddress}
                                placeholder={t('nurse_care.address_placeholder')}
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={2}
                                style={styles.addressText}
                            />
                        </View>

                        {/* Landmark field */}
                        <TextInput
                            placeholder={t('nurse_care.landmark_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={landmark}
                            onChangeText={setLandmark}
                            style={styles.landmarkInput}
                        />

                        <Text style={styles.addressHelper}>
                            {locationDenied
                                ? t('doctor_visit.gps_denied_using_saved')
                                : t('doctor_visit.gps_auto_fetched')}
                        </Text>
                    </View>

                    {/* Bottom Padding for Fixed App Bar */}
                    <View style={styles.bottomSpacer} />
                </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
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
                        <ActivityIndicator color={colors.textWhite} />
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

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    /* ─── Screen Base ─── */
    screen: {
        flex: 1,
        backgroundColor: colors.primary, // Hero green background
    },

    /* ─── Header ─── */
    headerSafe: {
        backgroundColor: colors.primary,
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
        color: colors.textWhite,
        letterSpacing: -0.24,
        marginLeft: 12,
    },
    headerRight: {
        width: 32, // to balance back button width
    },

    /* ─── Main Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: colors.bgScreen, // Off-white cream or dark background
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
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.43)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    descText: {
        textAlign: 'center',
        lineHeight: 20,
    },
    descTextBold: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: colors.textDark,
    },
    descTextGreen: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: colors.primary,
    },
    descTextNormal: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 14,
        color: colors.textMuted,
    },

    /* ─── Repeat Banner ─── */
    repeatBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4,131,87,0.07)',
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(52,199,89,0.25)' : 'rgba(4,131,87,0.25)',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        marginBottom: Spacing.md,
    },
    repeatBannerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: colors.primary,
    },
    repeatBannerSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: colors.textMuted,
        marginTop: 1,
    },

    /* ─── Generic Section Styling ─── */
    sectionCard: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadow.card,
    },
    sectionCardSmall: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadow.card,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: colors.primary,
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
        backgroundColor: colors.bgScreen,
        borderRadius: Radius.md,
        ...Shadow.card,
        marginBottom: 10, // Replaces gap: 10 for wrapping rows securely
    },
    problemItemActive: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    problemIconContainer: {
        // Height is handled dynamically inline
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    },
    problemIcon: {
        width: '100%',
        height: '100%',
    },
    problemLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: colors.textDark,
        textAlign: 'center',
        paddingVertical: 8,
        paddingHorizontal: 2,
        lineHeight: 12,
        letterSpacing: -0.24,
    },
    problemLabelActive: {
        color: colors.primary,
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
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.2)' : 'rgba(97,172,102,0.6)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 6,
    },
    smartTagText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: colors.textDark,
    },
    smartBannerText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: colors.primary,
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
        borderColor: isDarkMode ? colors.borderLight : 'rgba(143,143,143,0.54)',
        paddingHorizontal: 6,
    },
    doctorTypeActive: {
        borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(2,116,63,0.05)',
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
        color: colors.primary,
    },
    doctorTypeInactiveText: {
        flexShrink: 1, // Stops text pushing out of the button on extremely small devices
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: colors.textMuted,
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
        borderColor: colors.borderLight,
        gap: 8,
    },
    visitTypeOptionActive: {
        borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.05)',
    },
    visitTypeText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: colors.textMuted,
    },
    visitTypeTextActive: {
        color: colors.primary,
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
        color: colors.textDark,
    },
    radioLabelMainGreen: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: colors.textDark,
    },
    radioLabelSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: colors.textMuted,
    },

    /* ─── Confirm Address ─── */
    addressBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(217,217,217,0.29)',
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 7,
        minHeight: 42,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 6,
    },
    addressIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    addressText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: colors.textDark,
        padding: 0,
        textAlignVertical: 'top',
    },
    addressEdit: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: colors.primary,
        marginLeft: 8,
    },
    addressHelper: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: colors.primary,
        marginLeft: 4,
    },
    landmarkInput: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: colors.textDark,
        backgroundColor: colors.bgCard,
        marginTop: 6,
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
        backgroundColor: colors.bgHeader,
        height: 111,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        shadowRadius: 20,
        elevation: 10,
        alignItems: 'center',
        paddingTop: 18,
    },
    bookButton: {
        width: 230,
        height: 48,
        backgroundColor: colors.primary,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.button,
        color: colors.textWhite,
    },

    /* ─── Other Problem Input ─── */
    otherInput: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: colors.textDark,
        backgroundColor: colors.bgCard,
        marginBottom: Spacing.sm,
        minHeight: 72,
        textAlignVertical: 'top',
    },

    /* ─── Inline Date/Time Picker ─── */
    slotSectionLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: colors.textMuted,
        marginTop: 12,
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    chipsScroll: {
        marginHorizontal: -4,
        marginBottom: 4,
    },
    chip: {
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: Radius.md,
        marginHorizontal: 4,
        backgroundColor: colors.bgCard,
        minWidth: 56,
    },
    chipActive: {
        borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(2,116,63,0.06)',
    },
    chipLabel: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: colors.textMuted,
    },
    chipSub: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
    },
    chipLabelActive: {
        color: colors.primary,
    },
    timeSlotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    timeSlot: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: Radius.md,
        backgroundColor: colors.bgCard,
    },
    timeSlotActive: {
        borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(2,116,63,0.06)',
    },
    timeSlotText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: colors.textMuted,
    },
    timeSlotTextActive: {
        color: colors.primary,
        fontFamily: Fonts.semiBold,
    },
});
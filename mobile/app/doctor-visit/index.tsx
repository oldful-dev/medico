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
import { userService } from '@/services/api/userService';
import { useUser } from '@/context/UserContext';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { mediaService } from '@/services/api/mediaService';

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
    const { isReady, cityId, serviceId, address, setAddress, isLoading: isLoadingInit } = useServiceInitialization('doctor-home-visit');

    // ─── State ───
    const [selectedProblem, setSelectedProblem] = React.useState<string | null>(null);
    const [selectedDoctorType, setSelectedDoctorType] = React.useState<'GP' | 'Physio'>('GP');
    const [selectedWhen, setSelectedWhen] = React.useState<'ASAP' | 'Later'>('ASAP');
    const [visitType, setVisitType] = React.useState<'Home' | 'Clinic'>('Home');

    // ─── API State ───
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [isBooking, setIsBooking] = React.useState(false);

    const handleBookService = async () => {
        if (!selectedProblem) {
            Alert.alert('Select Problem', 'Please select a health problem first.');
            return;
        }
        if (!isReady) {
            Alert.alert('Error', 'Service initialization incomplete. Please check your internet connection or try logging out and back in.');
            return;
        }
        try {
            setIsBooking(true);

            // Upload images first
            let uploadedImageUrls: string[] = [];
            if (selectedImages.length > 0) {
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'doctor-visits');
            }

            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: new Date().toISOString(),
                addressLine: address || undefined,
                symptoms: [selectedProblem],
                doctorType: selectedDoctorType === 'GP' ? 'general-physician' : 'physiotherapist',
                formDataJson: { 
                    visitType, 
                    urgency: selectedWhen,
                    attachments: uploadedImageUrls 
                },
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert('Booking Failed', res.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Doctor visit booking error:', error);
            Alert.alert('Error', 'Failed to create booking. Please try again.');
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
                    {/* Placeholder for flex layout balance */}
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
                                        onPress={() => setSelectedProblem(item.label)}
                                    >
                                        <View style={[styles.problemIconContainer, { height: exactIconHeight }]}>
                                            <Image source={item.icon} style={styles.problemIcon} resizeMode="cover" />
                                        </View>
                                        <Text style={[styles.problemLabel, selectedProblem === item.label && styles.problemLabelActive]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

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
                            onPress={() => setSelectedWhen('Later')}
                        >
                            <Ionicons name={selectedWhen === 'Later' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedWhen === 'Later' ? Colors.primary : Colors.textLight} />
                            <Text style={styles.radioLabelMainGreen}>{t('booking.schedule_later')} <Text style={styles.radioLabelSub}>{t('booking.date_time_picker')}</Text></Text>
                        </TouchableOpacity>
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
                            <Ionicons name="location-outline" size={16} color="#2F2F2F" style={styles.addressIcon} />
                            <Text style={styles.addressText} numberOfLines={1}>{address}</Text>
                            <TouchableOpacity>
                                <Text style={styles.addressEdit}>Edit</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.addressHelper}>Auto-fitted from user profile(Google maps location).</Text>
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
        justifyContent: 'space-between',
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
        width: '85%',
        maxWidth: 340,
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
});
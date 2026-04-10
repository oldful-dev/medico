import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { locationService } from '@/services/device/locationService';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import DateTimePickerInput from '@/components/common/DateTimePickerInput';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { mediaService } from '@/services/api/mediaService';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
const imgHero = require('@/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png');
const imgCheckmark = require('@/assets/images/bd57304cc6eaf62cb9cca48825822022a152326a.png');
const imgMap = require('@/assets/images/0377518a275775aa53396ca4863e21dce08ad3b6.png');

export default function ApplianceRepairScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [appliance, setAppliance] = React.useState('');
    const [issue, setIssue] = React.useState('');
    const { userId } = useAuth();
    const { isReady, cityId, serviceId, serviceName, servicePrice, address, setAddress, isManualAddress, setIsManualAddress, isLoading: isLoadingInit } = useServiceInitialization('appliance-repair');
    
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [isBooking, setIsBooking] = React.useState(false);

    const handleBookService = async () => {
        if (!appliance || !issue || !selectedDate || !address) {
            Alert.alert('Missing Info', 'Please fill in all details and select a date.');
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
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'appliance-repair');
            }

            const payload = {
                serviceId,
                cityId,
                scheduledDate: selectedDate.toISOString(),
                addressLine: address,
                formDataJson: {
                    appliance,
                    issue,
                    attachments: uploadedImageUrls
                }
            };

            const res = await bookingService.createBooking({ ...payload, amount: servicePrice });
            if (res.success && res.data) {
                router.push({
                    pathname: '/payment/checkout',
                    params: {
                        bookingId: res.data.id,
                        amount: String(servicePrice),
                        label: serviceName || 'Appliance Repair',
                    }
                });
            } else {
                Alert.alert('Booking Failed', res.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Booking error:', error);
            Alert.alert('Error', 'Failed to create booking. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <View style={styles.screen}>
            {/* White/light content status bar text over dark green header */}
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Custom Dark Green Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AC & Appliance Repair</Text>
                <View style={{ width: 40 }} /> {/* spacer for center alignment */}
            </View>

            <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                {/* ─── Hero Section ─── */}
                <View style={styles.heroSection}>
                    <Image source={imgHero} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>AC & Appliance Repair</Text>
                        <Text style={styles.heroSubtitle}>Concierge Services</Text>
                    </View>
                </View>

                <Text style={styles.heroDescription}>
                    Book a reliabl technician for AC, refrigerator, washing machine, and other household appliance repairs.
                </Text>

                {/* ─── Appliance Details ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Appliance <Text style={{ fontWeight: 'normal', color: '#898989', fontSize: 13 }}>e.g. AC, Fridge...</Text></Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Appliance Model / Name"
                            placeholderTextColor="#898989"
                            value={appliance}
                            onChangeText={setAppliance}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Issue Description</Text>
                    <View style={styles.textAreaContainer}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Describe the problem you are facing..."
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            placeholderTextColor="#898989"
                            value={issue}
                            onChangeText={setIssue}
                        />
                    </View>
                </View>

                {/* ─── Upload Photos ─── */}
                <ImageUploadBox
                    title="Upload Photos of the Issue"
                    subtitle="Help our technician understand the problem better"
                    onImagesChange={setSelectedImages}
                    maxImages={5}
                />

                {/* ─── Schedule Appointment ─── */}
                <DateTimePickerInput
                    label="Schedule Appointment"
                    value={selectedDate}
                    onDateChange={setSelectedDate}
                />

                {/* ─── Location Card ─── */}
                <View style={styles.locationCard}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.locationContainer}>
                        <View style={styles.locationInputBox}>
                            <Ionicons name="location-outline" size={18} color="#048357" style={styles.locationIcon} />
                            {isManualAddress ? (
                                <TextInput
                                    style={[styles.locationTextPrimary, { flex: 1 }]}
                                    placeholder="Enter your address manually"
                                    placeholderTextColor="#898989"
                                    value={address}
                                    onChangeText={setAddress}
                                />
                            ) : (
                                <Text style={styles.locationTextPrimary} numberOfLines={1}>
                                    {address}
                                </Text>
                            )}
                        </View>
                        <Image source={imgMap} style={styles.mapImage} />
                    </View>
                </View>


                {/* ─── Book Service Button ─── */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.bookButton, (isBooking || isLoadingInit) && { opacity: 0.7 }]}
                        activeOpacity={0.8}
                        disabled={isBooking || isLoadingInit}
                        onPress={handleBookService}
                    >
                        <Text style={styles.bookButtonText}>
                            {isBooking ? 'Processing...' : (isLoadingInit ? 'Initializing...' : 'Book Service')}
                        </Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgScreen, // Light cream color matching Figma
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 15,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        textAlign: 'center',
        letterSpacing: -0.24,
    },

    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: 30,
        paddingBottom: 40,
    },

    /* ─── Hero Section ─── */
    heroSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
        justifyContent: 'center',
    },
    heroImage: {
        width: 109,
        height: 109,
        marginRight: 10,
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textDark,
        marginBottom: 2,
        letterSpacing: -0.24,
    },
    heroSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        letterSpacing: -0.24,
    },
    heroDescription: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 25,
        letterSpacing: -0.24,
        paddingHorizontal: 10,
    },

    /* ─── Cards Shared ─── */
    card: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: 18,
        paddingVertical: 20,
        marginBottom: 15,
        ...Shadow.card,
    },
    locationCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: 18,
        marginBottom: 20,
        ...Shadow.card,
    },
    sectionTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 14,
        letterSpacing: -0.24,
    },

    /* ─── Inputs ─── */
    textAreaContainer: {
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        padding: 10,
        minHeight: 100,
    },
    textArea: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    inputContainer: {
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        paddingHorizontal: 10,
        height: 40,
        justifyContent: 'center',
    },
    input: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        paddingHorizontal: 10,
        height: 40,
    },
    datePickerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
    },

    /* ─── Location Section Details ─── */
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    locationInputBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0.8,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        height: 38,
        paddingHorizontal: 10,
        marginRight: 10,
    },
    locationIcon: {
        marginRight: 6,
    },
    locationTextPrimary: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textDark,
    },
    locationTextBold: {
        fontFamily: Fonts.medium,
    },
    mapImage: {
        width: 69,
        height: 69,
        borderRadius: 15,
    },


    /* ─── Main Action Button ─── */
    buttonContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    bookButton: {
        backgroundColor: Colors.primary,
        width: 281,
        height: 48,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.card,
    },
    bookButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.button,
        color: Colors.textWhite,
    },
});

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
    TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { locationService } from '@/services/device/locationService';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import DateTimePickerInput from '@/components/common/DateTimePickerInput';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { mediaService } from '@/services/api/mediaService';
import { Alert } from 'react-native';
const imgHero = require('@/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png'); // Clamp/pliers icon
const imgCheckmark = require('@/assets/images/bd57304cc6eaf62cb9cca48825822022a152326a.png');
const imgMap = require('@/assets/images/0377518a275775aa53396ca4863e21dce08ad3b6.png');

export default function PlumbingElectricalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [address, setAddress] = React.useState('');
    const [isFetchingLocation, setIsFetchingLocation] = React.useState(true);
    const [serviceType, setServiceType] = React.useState('');
    const [issue, setIssue] = React.useState('');
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const { userId } = useAuth();
    const [cityId, setCityId] = React.useState('');
    const [serviceId, setServiceId] = React.useState('');
    const [isLoadingInit, setIsLoadingInit] = React.useState(true);
    const [isBooking, setIsBooking] = React.useState(false);

    React.useEffect(() => {
        (async () => {
            try {
                setIsLoadingInit(true);
                // Fetch location
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                }

                // Fetch User Profile for City ID
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setCityId(profileRes.data.cityId);
                }

                // Fetch Service ID for Plumbing & Electrical
                const serviceRes = await apiClient.get<any[]>('/services');
                if (serviceRes.success && serviceRes.data) {
                    const svc = serviceRes.data.find((s: any) => s.slug === 'plumbing-electrical');
                    if (svc) setServiceId(svc.id);
                }

            } catch (err) {
                console.log("Initialization failed", err);
            } finally {
                setIsFetchingLocation(false);
                setIsLoadingInit(false);
            }
        })();
    }, []);

    const handleBookService = async () => {
        if (!serviceType || !issue || !selectedDate || !address) {
            Alert.alert('Missing Info', 'Please fill in all details and select a date.');
            return;
        }

        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }

        try {
            setIsBooking(true);

            // Upload images first
            let uploadedImageUrls: string[] = [];
            if (selectedImages.length > 0) {
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'plumbing-electrical');
            }

            const payload = {
                serviceId,
                cityId,
                scheduledDate: selectedDate.toISOString(),
                addressLine: address,
                formDataJson: {
                    serviceType,
                    issue,
                    attachments: uploadedImageUrls
                }
            };

            const res = await bookingService.createBooking(payload);
            if (res.success && res.data) {
                router.push({
                    pathname: '/service-confirmation',
                    params: {
                        bookingId: res.data.id
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
                <Text style={styles.headerTitle}>Plumbing & Electrical</Text>
                <View style={{ width: 40 }} /> {/* spacer for center alignment */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Hero Section ─── */}
                <View style={styles.heroSection}>
                    <Image source={imgHero} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>Plumbing & Electrical</Text>
                        <Text style={styles.heroSubtitle}>Concierge Services</Text>
                    </View>
                </View>

                <Text style={styles.heroDescription}>
                    Book a certified plumber or electrian for repairs and installations in your home
                </Text>

                {/* ─── Issue Details ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Issue Details</Text>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 5 }]}>Service Type</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="construct-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Plumbing, Electrical..."
                            placeholderTextColor="#898989"
                            value={serviceType}
                            onChangeText={setServiceType}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 15 }]}>Issue Description</Text>
                    <View style={[styles.inputContainer, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                        <Ionicons name="information-circle-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                            placeholder="Describe the issue you are facing..."
                            placeholderTextColor="#898989"
                            multiline
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

                {/* ─── Location Details ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="location-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={isFetchingLocation ? "Fetching location..." : "Enter your full address"}
                            placeholderTextColor="#898989"
                            value={address}
                            onChangeText={setAddress}
                        />
                    </View>
                </View>

                {/* ─── Schedule ─── */}
                <DateTimePickerInput
                    label="Preferred Date & Time"
                    value={selectedDate}
                    onDateChange={setSelectedDate}
                />

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

            </ScrollView>
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
        paddingHorizontal: 15,
        marginVertical: 10,
        marginBottom: 20,
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
    sectionTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 14,
        letterSpacing: -0.24,
    },

    /* ─── Inputs ─── */
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        paddingHorizontal: 12,
        height: 45,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
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
        height: 45,
    },
    datePickerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
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

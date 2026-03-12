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
import DateTimePickerInput from '@/components/common/DateTimePickerInput';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { mediaService } from '@/services/api/mediaService';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { Alert } from 'react-native';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

// ─── Figma Assets ───
const imgHero = require('@/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png'); // Lightbulb & Question mark icon
const imgCheckmark = require('@/assets/images/bd57304cc6eaf62cb9cca48825822022a152326a.png');
const imgMap = require('@/assets/images/0377518a275775aa53396ca4863e21dce08ad3b6.png');

export default function AnythingElseScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [address, setAddress] = React.useState('');
    const [isFetchingLocation, setIsFetchingLocation] = React.useState(true);
    const [reqTitle, setReqTitle] = React.useState('');
    const [reqDesc, setReqDesc] = React.useState('');
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

                // Fetch Service ID for Anything Else
                const serviceRes = await apiClient.get<any[]>('/services');
                if (serviceRes.success && serviceRes.data) {
                    const svc = serviceRes.data.find((s: any) => s.slug === 'anything-else');
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
        if (!reqTitle || !reqDesc || !selectedDate || !address) {
            Alert.alert('Missing Info', 'Please provide request details and select a timing.');
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
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'anything-else');
            }

            const payload = {
                serviceId,
                cityId,
                scheduledDate: selectedDate.toISOString(),
                addressLine: address,
                formDataJson: {
                    reqTitle,
                    reqDesc,
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
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Custom Dark Green Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Anything Else?</Text>
                <View style={{ width: 40 }} /> {/* spacer for center alignment */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Hero Section ─── */}
                <View style={styles.heroSection}>
                    <Image source={imgHero} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>Anything Else?</Text>
                        <Text style={styles.heroSubtitle}>Concierge Services</Text>
                    </View>
                </View>

                <Text style={styles.heroDescription}>
                    Book a certified Anything Else? and installations in your home
                </Text>

                {/* ─── Request Details ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>What do you need help with?</Text>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 5 }]}>Request Title</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="clipboard-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Need help packing boxes..."
                            placeholderTextColor="#898989"
                            value={reqTitle}
                            onChangeText={setReqTitle}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 15 }]}>Task Description</Text>
                    <View style={[styles.inputContainer, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                        <Ionicons name="information-circle-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                            placeholder="Please explain in detail what you need us to do..."
                            placeholderTextColor="#898989"
                            multiline
                            value={reqDesc}
                            onChangeText={setReqDesc}
                        />
                    </View>
                </View>

                {/* ─── Upload Photos ─── */}
                <ImageUploadBox
                    title="Upload Refrence Photos (Optional)"
                    subtitle="Help our team understand your request better"
                    onImagesChange={setSelectedImages}
                    maxImages={3}
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
        backgroundColor: '#FDFDE8', // Light cream color matching Figma
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 15,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: -0.24,
    },

    scrollContent: {
        paddingHorizontal: 17,
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
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#555555',
        marginBottom: 2,
        letterSpacing: -0.24,
    },
    heroSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: '#777777',
        letterSpacing: -0.24,
    },
    heroDescription: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#848484',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 25,
        letterSpacing: -0.24,
        paddingHorizontal: 10,
    },

    /* ─── Cards Shared ─── */
    card: {
        backgroundColor: '#FFFDFD',
        borderRadius: 13,
        padding: 18,
        paddingVertical: 20,
        marginBottom: 15,
        elevation: 1, // Subtle drop shadow as implied by the white box on cream bg
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        marginBottom: 14,
        letterSpacing: -0.24,
    },

    /* ─── Inputs ─── */
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 45,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 45,
    },
    datePickerText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#555555',
    },

    /* ─── Main Action Button ─── */
    buttonContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    bookButton: {
        backgroundColor: '#02743F',
        width: 281,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FFFFFF',
    },
});

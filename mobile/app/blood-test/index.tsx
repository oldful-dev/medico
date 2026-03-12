// Book a Home Blood Test
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePickerInput from '@/components/common/DateTimePickerInput';
import { locationService } from '@/services/device/locationService';
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { mediaService } from '@/services/api/mediaService';
import ImageUploadBox from '@/components/common/ImageUploadBox';

// ─── Figma Assets ───
const cautionIcon = require('@/assets/images/c4f7fda686169deb23b4565362e0a544adc4d7c4.png');
const clockIcon = require('@/assets/images/b0c2041dcbc9f27873dbb95bd36571aded3422d2.png');
const calendarIcon = require('@/assets/images/9db46350ce94677b709648f4aadad3189870cab5.png');

export default function BloodTestScreen() {
    const router = useRouter();
    const [selectedTest, setSelectedTest] = useState('Full Body Package');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    // API & Init state
    const [cityId, setCityId] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [address, setAddress] = useState('Fetching address...');
    const [isLoadingInit, setIsLoadingInit] = useState(true);
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
                } else { setAddress(''); }
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setCityId(profileRes.data.cityId);
                }
                const serviceRes = await apiClient.get<any[]>('/services');
                if (serviceRes.success && serviceRes.data) {
                    const svc = serviceRes.data.find((s: any) => s.slug === 'blood-test');
                    if (svc) setServiceId(svc.id);
                }
            } catch (err) { 
                console.log('Blood Test init failed', err); 
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
        try {
            setIsBooking(true);

            // Upload images first
            let uploadedImageUrls: string[] = [];
            if (selectedImages.length > 0) {
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'blood-tests');
            }

            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
                addressLine: address || undefined,
                formDataJson: { 
                    testType: selectedTest,
                    attachments: uploadedImageUrls 
                },
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert('Booking Failed', res.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Blood test booking error:', error);
            Alert.alert('Error', 'Failed to create booking. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };
    const handleTestSelection = () => {
        // Simple cycle for demo purposes
        const options = ['Full Body Package', 'Sugar (Fasting)', 'Lipid Profile'];
        const currentIndex = options.indexOf(selectedTest);
        const nextTest = options[(currentIndex + 1) % options.length];

        setSelectedTest(nextTest);

        // Smart Alert Logic
        if (nextTest === 'Sugar (Fasting)' || nextTest === 'Lipid Profile') {
            Alert.alert(
                "Fasting Required",
                "Please do not eat 10-12 hours before this test.",
                [{ text: "Understood", onPress: () => console.log("Alert dismissed") }]
            );
        }
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="dark" />

            <SafeAreaView style={styles.container} edges={['top']}>
                {/* ─── Header ─── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#02743F" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ─── Titles ─── */}
                    <Text style={styles.title}>Book a Home Blood Test</Text>
                    <Text style={styles.subtitle}>Lab tests & checkup at your doorstep</Text>

                    {/* ─── Select Your Test Box ─── */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Select Your Test</Text>
                        <View style={styles.dropdownContainer}>
                            <Text style={styles.dropdownLabel}>Choose Test</Text>
                            <TouchableOpacity style={styles.dropdownInput} activeOpacity={0.7} onPress={handleTestSelection}>
                                <Text style={styles.dropdownValue}>{selectedTest}</Text>
                                <Ionicons name="chevron-down" size={16} color="#AAAEAC" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.sectionCardTinted}>
                        <DateTimePickerInput
                            label="Schedule Your Appointment"
                            onDateChange={(d) => setSelectedDate(d)}
                        />
                    </View>

                    {/* ─── Upload Prescription ─── */}
                    <View style={{ marginBottom: 20 }}>
                        <ImageUploadBox
                            title="Upload Prescription (Optional)"
                            subtitle="Help us understand which tests you need"
                            onImagesChange={setSelectedImages}
                            maxImages={3}
                        />
                    </View>

                    <View style={styles.buttonContainer}>
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
                                    {isLoadingInit ? 'Initializing...' : 'Confirm Booking'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Inline warning removed in favor of React Native Alert as per PRD "Popup Alert" requirement */}

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Light cream color matching header image
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 27,
        paddingBottom: 40,
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
    },

    /* ─── Typography ─── */
    title: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#02743F', // Dark green matching Figma
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.24,
    },
    subtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
        textAlign: 'center',
        marginBottom: 30,
        letterSpacing: -0.24,
    },

    /* ─── Section Boxes ─── */
    sectionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.51)',
        borderWidth: 1,
        borderColor: '#AAAEAC',
        borderRadius: 9,
        padding: 16,
        marginBottom: 20,
    },
    sectionCardTinted: {
        backgroundColor: 'rgba(255, 253, 253, 0.26)',
        borderWidth: 1,
        borderColor: '#EDEDED',
        borderRadius: 9,
        padding: 16,
        marginBottom: 35,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
        marginBottom: 16,
    },

    /* ─── Dropdown ─── */
    dropdownContainer: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 7,
        padding: 12,
        paddingBottom: 16, // Extra bottom padding for the inner input offset
    },
    dropdownLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#AAAEAC',
        marginBottom: 8,
    },
    dropdownInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 0.8,
        borderColor: '#AAAEAC',
        borderRadius: 5,
        height: 32,
        paddingHorizontal: 10,
    },
    dropdownValue: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#2F2F2F',
    },

    /* ─── Schedule Area ─── */
    scheduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    scheduleBox: {
        flex: 1,
        borderWidth: 2,
        borderColor: '#898989',
        borderRadius: 10,
        height: 75,
        padding: 10,
        marginHorizontal: 5, // Gap between boxes
        justifyContent: 'center',
        alignItems: 'center',
    },
    scheduleBoxActive: {
        borderColor: '#02743F', // Green border for selected
    },
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    scheduleIcon: {
        width: 18,
        height: 18,
        marginRight: 6,
    },
    scheduleIconClock: {
        width: 24,
        height: 24,
        marginRight: 6,
    },
    schedulePrimaryText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#555555',
    },
    schedulePrimaryTextClock: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 18, // Time is larger
        color: '#555555',
        lineHeight: 22,
    },
    scheduleAmPm: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
    },
    scheduleSecondaryText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#555555',
    },

    /* ─── Main Button ─── */
    buttonContainer: {
        alignItems: 'center',
        marginBottom: 35,
    },
    confirmButton: {
        backgroundColor: '#02743F',
        width: 281,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FFFFFF',
    },

    /* ─── Warning Banner ─── */
    warningBanner: {
        borderWidth: 1,
        borderColor: '#FFFCA8', // Yellow border
        backgroundColor: '#FFFFFF', // Fallback
        borderRadius: 11,
        padding: 16,
        paddingTop: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    warningHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    warningIcon: {
        width: 24,
        height: 24,
        marginRight: 8,
    },
    warningTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
    },
    warningText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#313A51',
        marginBottom: 16,
    },
    warningButtonRow: {
        alignItems: 'flex-end', // Align OK button to right
    },
    okButton: {
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 6,
        paddingHorizontal: 20,
        paddingVertical: 4,
    },
    okButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#085B34',
    },
});

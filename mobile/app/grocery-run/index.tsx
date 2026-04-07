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
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
const imgHero = require('@/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png'); // Grocery bag icon
const imgCheckmark = require('@/assets/images/bd57304cc6eaf62cb9cca48825822022a152326a.png');
const imgMap = require('@/assets/images/0377518a275775aa53396ca4863e21dce08ad3b6.png');

export default function GroceryRunScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [address, setAddress] = React.useState('Fetching address...');
    const [isManualAddress, setIsManualAddress] = React.useState(false);
    const [items, setItems] = React.useState('');
    const [store, setStore] = React.useState('');
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
    const { userId } = useAuth();
    const [cityId, setCityId] = React.useState('');
    const [serviceId, setServiceId] = React.useState('');
    const [serviceName, setServiceName] = React.useState('Grocery Run');
    const [servicePrice, setServicePrice] = React.useState(0);
    const [isBooking, setIsBooking] = React.useState(false);
    const [isLoadingInit, setIsLoadingInit] = React.useState(true);

    React.useEffect(() => {
        (async () => {
            try {
                // Fetch location
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                } else {
                    setIsManualAddress(true);
                    setAddress('');
                }

                // Fetch User Profile for City ID
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setCityId(profileRes.data.cityId);
                }

                // Fetch Service ID for Grocery Run
                const serviceRes = await apiClient.get<any[]>('/services');
                if (serviceRes.success && serviceRes.data) {
                    const svc = serviceRes.data.find((s: any) => s.slug === 'grocery-run');
                    if (svc) { setServiceId(svc.id); setServiceName(svc.name || 'Grocery Run'); setServicePrice(svc.basePrice ?? 0); }
                }

            } catch (err) {
                console.log("Initialization failed", err);
                setIsManualAddress(true);
                setAddress('');
            } finally {
                setIsLoadingInit(false);
            }
        })();
    }, []);

    const handleBookService = async () => {
        if (!items || !selectedDate || !address) {
            Alert.alert('Missing Info', 'Please list items, select a delivery time, and ensure address is present.');
            return;
        }

        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }

        try {
            setIsBooking(true);
            const payload = {
                serviceId,
                cityId,
                scheduledDate: selectedDate.toISOString(),
                addressLine: address,
                formDataJson: {
                    items,
                    store
                }
            };

            const res = await bookingService.createBooking({ ...payload, amount: servicePrice });
            if (res.success && res.data) {
                router.push({
                    pathname: '/payment/checkout',
                    params: { bookingId: res.data.id, amount: String(servicePrice), label: serviceName }
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
                <Text style={styles.headerTitle}>Grocery Run</Text>
                <View style={{ width: 40 }} /> {/* spacer for center alignment */}
            </View>

            <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                {/* ─── Hero Section ─── */}
                <View style={styles.heroSection}>
                    <Image source={imgHero} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>Grocery Run</Text>
                        <Text style={styles.heroSubtitle}>Concierge{"\n"}Services</Text>
                    </View>
                </View>

                <Text style={styles.heroDescription}>
                    Book a certified Grocery run and installations in your home
                </Text>

                {/* ─── Order Details ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>What do you need?</Text>
                    <View style={styles.textAreaContainer}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="e.g. 1L Milk, 2 Dozen Eggs, Bread..."
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            placeholderTextColor="#898989"
                            value={items}
                            onChangeText={setItems}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Preferred Store (Optional)</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. DMart, Reliance Fresh or 'Any nearby'"
                            placeholderTextColor="#898989"
                            value={store}
                            onChangeText={setStore}
                        />
                    </View>
                </View>

                {/* ─── Delivery Schedule ─── */}
                <DateTimePickerInput
                    label="Delivery Time"
                    onDateChange={() => { }}
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

                {/* ─── Upload Card ─── */}
                <ImageUploadBox
                    title="Upload Handwritten List"
                    subtitle="JPG, PNG or PDF, file size no more than 10MB"
                />

                {/* ─── Book Service Button ─── */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.bookButton, (isBooking || isLoadingInit) && { opacity: 0.7 }]}
                        activeOpacity={0.8}
                        disabled={isBooking || isLoadingInit}
                        onPress={handleBookService}
                    >
                        <Text style={styles.bookButtonText}>{isLoadingInit ? 'Initializing...' : isBooking ? 'Processing...' : 'Book Service'}</Text>
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
        alignItems: 'center',
    },
    heroTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textDark,
        marginBottom: 2,
        letterSpacing: -0.24,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        letterSpacing: -0.24,
        textAlign: 'center',
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

    /* ─── Upload (Scrap) Card ─── */
    uploadCard: {
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    uploadDashedBox: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#1E1E1E',
        borderRadius: 20,
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
    },
    uploadCloudIcon: {
        marginBottom: 8,
    },
    uploadTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#2F2F2F',
        marginBottom: 4,
    },
    uploadSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 8,
        color: '#555555',
        marginBottom: 12,
    },
    uploadButton: {
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    uploadButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 8,
        color: '#02743F',
        textTransform: 'uppercase',
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

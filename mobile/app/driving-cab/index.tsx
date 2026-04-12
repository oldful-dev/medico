import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    TextInput,
    Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePickerInput from '@/components/common/DateTimePickerInput';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';

// ─── Figma Assets ───
const imgHero = require('@/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png'); // Yellow Car Icon

export default function DrivingCabScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [pickupLocation, setPickupLocation] = React.useState('');
    const [dropLocation, setDropLocation] = React.useState('');
    const [vehiclePref, setVehiclePref] = React.useState('');
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
    const [isBooking, setIsBooking] = React.useState(false);

    const { cityId, serviceId, serviceName, servicePrice, address, isLoading: isLoadingInit } = useServiceInitialization('driving-cab');

    React.useEffect(() => {
        if (address) setPickupLocation(address);
    }, [address]);



    const handleBookService = async () => {
        if (!pickupLocation || !dropLocation || !selectedDate) {
            Alert.alert('Missing Info', 'Please provide pickup, drop locations and select a timing.');
            return;
        }

        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }

        try {
            setIsBooking(true);

            // Navigate to checkout — booking created inside checkout after payment succeeds
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: selectedDate!.toISOString(),
                addressLine: pickupLocation,
                pickupAddress: pickupLocation,
                dropAddress: dropLocation,
                vehicleType: vehiclePref,
                formDataJson: { pickupLocation, dropLocation, vehiclePref },
            });

            router.push({
                pathname: '/payment/checkout',
                params: { bookingPayload, amount: String(servicePrice), label: serviceName },
            });
        } catch (error) {
            console.error('Driving-cab error:', error);
            Alert.alert('Error', 'Something went wrong. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <View style={styles.screen}>
            {/* White/light content status bar text over dark green header */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Driving / Cab Booking</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                {/* ─── Hero Section ─── */}
                <View style={styles.heroSection}>
                    <Image source={imgHero} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>Driver / Cab Booking</Text>
                        <Text style={styles.heroSubtitle}>Concierge{"\n"}Services</Text>
                    </View>
                </View>

                <Text style={styles.heroDescription}>
                    Book a certified Driver and Cab booking
                </Text>

                {/* ─── Trip Details ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Trip Details</Text>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 5 }]}>Pickup Location</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="location-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={isLoadingInit ? "Fetching location..." : "Pick-up Address"}
                            placeholderTextColor="#898989"
                            value={pickupLocation}
                            onChangeText={setPickupLocation}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 15 }]}>Drop Location</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="navigate-outline" size={18} color="#E03A3A" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Drop Location"
                            placeholderTextColor="#898989"
                            value={dropLocation}
                            onChangeText={setDropLocation}
                        />
                    </View>
                </View>

                {/* ─── Vehicle Preference ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Vehicle Preference</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="car-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Sedan, SUV, Mini..."
                            placeholderTextColor="#898989"
                            value={vehiclePref}
                            onChangeText={setVehiclePref}
                        />
                    </View>
                </View>

                {/* ─── Timings ─── */}
                <DateTimePickerInput
                    label="Pickup Timings"
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
        alignItems: 'center',
    },
    heroTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#555555',
        marginBottom: 2,
        letterSpacing: -0.24,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: '#777777',
        letterSpacing: -0.24,
        textAlign: 'center',
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

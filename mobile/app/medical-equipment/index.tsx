import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';


// ─── Figma Assets ───
const imgWheelchair = require('@/assets/images/be69e88a2a74b15eb189dce875fc4395704fc6bb.png');
const imgHospitalBed = require('@/assets/images/a0ea0f0ea3ae64a73040f3c67ee409ba7a77d4d1.png');
const imgOxygen = require('@/assets/images/d05fd81c3840f7904feae65b06c33bf8b18f55b6.png');
const imgWalker = require('@/assets/images/00863cfbd96593a21fa1f5b136210f8574404c11.png');



export default function MedicalEquipmentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const [selectedEquipment, setSelectedEquipment] = useState('wheelchair');
    const [selectedDuration, setSelectedDuration] = useState('Monthly');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [isBooking, setIsBooking] = useState(false);

    const { cityId, serviceId, serviceName, servicePrice, address, isLoading: isLoadingInit } = useServiceInitialization('equipment-rental');

    const handleBookService = async () => {
        if (!selectedEquipment) {
            Alert.alert('Required', 'Please select the equipment you need.');
            return;
        }
        if (!selectedDuration) {
            Alert.alert('Required', 'Please select a rental duration.');
            return;
        }
        if (!selectedDate) {
            Alert.alert('Date Required', 'Please select a pickup/delivery date.');
            return;
        }
        if (!address || address.trim().length < 5 || address === 'Fetching address...') {
            Alert.alert('Address Required', 'Could not fetch your address. Please wait or try again.');
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
                scheduledDate: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
                addressLine: address || undefined,
                formDataJson: {
                    equipment: selectedEquipment,
                    rentalDuration: selectedDuration,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: { bookingPayload, amount: String(servicePrice), label: serviceName, ...(params.subscriptionId && { subscriptionId: params.subscriptionId }) },
            });
        } catch (error) {
            console.error('Equipment error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={dynamicStyles.screen}>
            <View style={{ height: insets.top, backgroundColor: isDarkMode ? '#1E293B' : '#FDFDE8' }} />
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            <View style={dynamicStyles.container}>
                <View style={dynamicStyles.headerContainer}>
                    <View style={dynamicStyles.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F1F5F9' : '#02743F'} />
                        </TouchableOpacity>
                        <View style={dynamicStyles.headerTextCol}>
                            <Text style={dynamicStyles.headerTitle}>Rent Medical Equipment</Text>
                            <Text style={dynamicStyles.headerSubtitle}>Wheelchairs, Beds, and Oxygen on rent.</Text>
                        </View>
                    </View>
                </View>

                <KeyboardAwareScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                    {/* ─── Select Equipment Section ─── */}
                    <View style={dynamicStyles.sectionCardTintedDark}>
                        <Text style={dynamicStyles.sectionTitle}>Select equipment set rental dyration</Text>

                        <View style={dynamicStyles.equipmentGrid}>
                            {/* Wheelchair */}
                            <TouchableOpacity
                                style={[dynamicStyles.equipmentCard, selectedEquipment === 'wheelchair' && dynamicStyles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('wheelchair')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgWheelchair} style={dynamicStyles.equipmentImage} resizeMode="contain" />
                                <Text style={dynamicStyles.equipmentName}>Wheelchair</Text>
                                <Text style={dynamicStyles.equipmentDesc}>Manual/Electric</Text>
                            </TouchableOpacity>

                            {/* Hospital Bed */}
                            <TouchableOpacity
                                style={[dynamicStyles.equipmentCard, selectedEquipment === 'bed' && dynamicStyles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('bed')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgHospitalBed} style={[dynamicStyles.equipmentImage, dynamicStyles.bedImage]} resizeMode="contain" />
                                <Text style={dynamicStyles.equipmentName}>Hospital Bed</Text>
                                <Text style={dynamicStyles.equipmentDesc}>Manual/Electric</Text>
                            </TouchableOpacity>

                            {/* Oxygen Concentrator */}
                            <TouchableOpacity
                                style={[dynamicStyles.equipmentCard, selectedEquipment === 'oxygen' && dynamicStyles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('oxygen')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgOxygen} style={[dynamicStyles.equipmentImage, dynamicStyles.oxygenImage]} resizeMode="contain" />
                                <Text style={[dynamicStyles.equipmentName, dynamicStyles.oxygenText]}>Oxygen Concentrator</Text>
                            </TouchableOpacity>

                            {/* Walker/stick */}
                            <TouchableOpacity
                                style={[dynamicStyles.equipmentCard, selectedEquipment === 'walker' && dynamicStyles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('walker')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgWalker} style={[dynamicStyles.equipmentImage, dynamicStyles.walkerImage]} resizeMode="contain" />
                                <Text style={dynamicStyles.equipmentName}>Walker/stick</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── Set Rental Duration Section ─── */}
                    <View style={dynamicStyles.sectionCardTintedLight}>
                        <Text style={dynamicStyles.sectionTitle}>Set Rental Duration</Text>

                        <TouchableOpacity style={dynamicStyles.radioRow} onPress={() => setSelectedDuration('Weekly')} activeOpacity={0.7}>
                            <Ionicons name={selectedDuration === 'Weekly' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedDuration === 'Weekly' ? "#02743F" : "#02743F"} />
                            <Text style={dynamicStyles.radioLabel}>Weekly</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.radioRow} onPress={() => setSelectedDuration('Monthly')} activeOpacity={0.7}>
                            <Ionicons name={selectedDuration === 'Monthly' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedDuration === 'Monthly' ? "#02743F" : "#02743F"} />
                            <Text style={dynamicStyles.radioLabel}>Monthly</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.radioRow} onPress={() => setSelectedDuration('Custom')} activeOpacity={0.7}>
                            <Ionicons name={selectedDuration === 'Custom' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedDuration === 'Custom' ? "#02743F" : "#02743F"} />
                            <Text style={dynamicStyles.radioLabel}>Custom</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─── Schedule Pick-up Section ─── */}
                    <View style={dynamicStyles.sectionCardTransparent}>
                        <CustomDateTimePicker
                            label="When?"
                            value={selectedDate}
                            onDateChange={setSelectedDate}
                        />
                    </View>

                    {/* ─── Confirm Rental Button ─── */}
                    <View style={dynamicStyles.buttonContainer}>
                        <TouchableOpacity
                            style={[dynamicStyles.confirmButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                            activeOpacity={0.8}
                            disabled={isBooking || isLoadingInit}
                            onPress={handleBookService}
                        >
                            {isLoadingInit ? (
                                <Text style={dynamicStyles.confirmButtonText}>Initializing...</Text>
                            ) : isBooking ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={dynamicStyles.confirmButtonText}>Confirm Rental</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                </KeyboardAwareScrollView>
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: isDarkMode ? '#0F172A' : '#FDFDE8',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 30,
        paddingBottom: 40,
    },

    headerContainer: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFE3',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        padding: 4,
    },
    headerTextCol: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: isDarkMode ? '#F1F5F9' : '#02743F',
        letterSpacing: -0.24,
    },
    headerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#94A3B8' : '#2F2F2F',
        letterSpacing: -0.24,
    },

    /* ─── Section Boxes ─── */
    sectionCardTintedDark: {
        backgroundColor: 'rgba(222, 222, 222, 0.24)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
    },
    sectionCardTintedLight: {
        backgroundColor: 'rgba(217, 217, 217, 0.15)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    sectionCardTransparent: {
        // No background here, just padding for layout
        marginBottom: 35,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 12,
    },

    /* ─── Equipment Grid ─── */
    equipmentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
        marginTop: 10,
    },
    equipmentCard: {
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        borderRadius: 8,
        width: '48%', // Allow wrapping nicely on narrow screens
        minWidth: 70,
        height: 85,
        alignItems: 'center',
        paddingTop: 4,
        paddingHorizontal: 2,
    },
    equipmentCardActive: {
        borderWidth: 1,
        borderColor: '#02743F',
    },
    equipmentImage: {
        width: 48,
        height: 48,
        marginBottom: 2,
    },
    bedImage: {
        width: 55,
        height: 40,
        marginTop: 8,
        marginBottom: 2,
    },
    oxygenImage: {
        width: 38,
        height: 38,
        marginTop: 12,
        marginBottom: 4,
    },
    walkerImage: {
        width: 25,
        height: 43,
        marginTop: 8,
        marginBottom: -1,
    },
    equipmentName: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 10,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        textAlign: 'center',
    },
    oxygenText: {
        fontSize: 9,
        lineHeight: 10,
    },
    equipmentDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 8,
        color: '#777777',
        textAlign: 'center',
    },

    /* ─── Radio Buttons ─── */
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    radioLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginLeft: 12,
    },

    /* ─── Schedule Area ─── */
    scheduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    scheduleBox: {
        flex: 1,
        backgroundColor: 'rgba(255, 253, 253, 0.26)',
        borderWidth: 2,
        borderColor: '#898989',
        borderRadius: 10,
        height: 75,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8, // Gap between boxes
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
        width: 230,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FFFFFF',
    },
});

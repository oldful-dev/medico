// Rent Medical Equipment
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePickerInput from '@/components/common/DateTimePickerInput';

// ─── Figma Assets ───
const imgWheelchair = require('@/assets/images/be69e88a2a74b15eb189dce875fc4395704fc6bb.png');
const imgHospitalBed = require('@/assets/images/a0ea0f0ea3ae64a73040f3c67ee409ba7a77d4d1.png');
const imgOxygen = require('@/assets/images/d05fd81c3840f7904feae65b06c33bf8b18f55b6.png');
const imgWalker = require('@/assets/images/00863cfbd96593a21fa1f5b136210f8574404c11.png');

const calendarIcon = require('@/assets/images/9db46350ce94677b709648f4aadad3189870cab5.png');
const clockIcon = require('@/assets/images/b0c2041dcbc9f27873dbb95bd36571aded3422d2.png');

export default function MedicalEquipmentScreen() {
    const router = useRouter();
    const [selectedEquipment, setSelectedEquipment] = useState('wheelchair');
    const [selectedDuration, setSelectedDuration] = useState('Monthly');
    const [address, setAddress] = useState('Fetching address...');
    const [isManualAddress, setIsManualAddress] = useState(false);

    React.useEffect(() => {
        (async () => {
            const { locationService } = await import('@/services/device/locationService');
            try {
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                } else {
                    setIsManualAddress(true);
                    setAddress('');
                }
            } catch (err) {
                console.log("Failed to fetch address", err);
                setIsManualAddress(true);
                setAddress('');
            }
        })();
    }, []);

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
                    <Text style={styles.title}>Rent Medical Equipment</Text>
                    <Text style={styles.subtitle}>Wheelchairs, Hospital Beds, and Oxygen on rent.</Text>

                    {/* ─── Select Equipment Section ─── */}
                    <View style={styles.sectionCardTintedDark}>
                        <Text style={styles.sectionTitle}>Select equipment set rental dyration</Text>

                        <View style={styles.equipmentGrid}>
                            {/* Wheelchair */}
                            <TouchableOpacity
                                style={[styles.equipmentCard, selectedEquipment === 'wheelchair' && styles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('wheelchair')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgWheelchair} style={styles.equipmentImage} resizeMode="contain" />
                                <Text style={styles.equipmentName}>Wheelchair</Text>
                                <Text style={styles.equipmentDesc}>Manual/Electric</Text>
                            </TouchableOpacity>

                            {/* Hospital Bed */}
                            <TouchableOpacity
                                style={[styles.equipmentCard, selectedEquipment === 'bed' && styles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('bed')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgHospitalBed} style={[styles.equipmentImage, styles.bedImage]} resizeMode="contain" />
                                <Text style={styles.equipmentName}>Hospital Bed</Text>
                                <Text style={styles.equipmentDesc}>Manual/Electric</Text>
                            </TouchableOpacity>

                            {/* Oxygen Concentrator */}
                            <TouchableOpacity
                                style={[styles.equipmentCard, selectedEquipment === 'oxygen' && styles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('oxygen')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgOxygen} style={[styles.equipmentImage, styles.oxygenImage]} resizeMode="contain" />
                                <Text style={[styles.equipmentName, styles.oxygenText]}>Oxygen Concentrator</Text>
                            </TouchableOpacity>

                            {/* Walker/stick */}
                            <TouchableOpacity
                                style={[styles.equipmentCard, selectedEquipment === 'walker' && styles.equipmentCardActive]}
                                onPress={() => setSelectedEquipment('walker')}
                                activeOpacity={0.7}
                            >
                                <Image source={imgWalker} style={[styles.equipmentImage, styles.walkerImage]} resizeMode="contain" />
                                <Text style={styles.equipmentName}>Walker/stick</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── Set Rental Duration Section ─── */}
                    <View style={styles.sectionCardTintedLight}>
                        <Text style={styles.sectionTitle}>Set Rental Duration</Text>

                        <TouchableOpacity style={styles.radioRow} onPress={() => setSelectedDuration('Weekly')} activeOpacity={0.7}>
                            <Ionicons name={selectedDuration === 'Weekly' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedDuration === 'Weekly' ? "#02743F" : "#02743F"} />
                            <Text style={styles.radioLabel}>Weekly</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.radioRow} onPress={() => setSelectedDuration('Monthly')} activeOpacity={0.7}>
                            <Ionicons name={selectedDuration === 'Monthly' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedDuration === 'Monthly' ? "#02743F" : "#02743F"} />
                            <Text style={styles.radioLabel}>Monthly</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.radioRow} onPress={() => setSelectedDuration('Custom')} activeOpacity={0.7}>
                            <Ionicons name={selectedDuration === 'Custom' ? "radio-button-on" : "radio-button-off"} size={20} color={selectedDuration === 'Custom' ? "#02743F" : "#02743F"} />
                            <Text style={styles.radioLabel}>Custom</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─── Schedule Pick-up Section ─── */}
                    <View style={styles.sectionCardTransparent}>
                        <DateTimePickerInput
                            label="Schedule Pick-up"
                            onDateChange={() => { }}
                        />
                    </View>

                    {/* ─── Confirm Rental Button ─── */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            activeOpacity={0.8}
                            onPress={() => {
                                router.push({
                                    pathname: '/service-confirmation',
                                    params: {
                                        serviceName: 'Medical Equipment',
                                        description: `Item: ${selectedEquipment}\nDuration: ${selectedDuration}`,
                                        address: address, // Derived from device location
                                        fee: '₹500/week (Est)'
                                    }
                                });
                            }}
                        >
                            <Text style={styles.confirmButtonText}>Confirm Rental</Text>
                        </TouchableOpacity>
                    </View>

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
        paddingHorizontal: 30,
        paddingBottom: 40,
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        marginBottom: 10,
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
        marginBottom: 20,
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
        color: '#2F2F2F',
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
        backgroundColor: '#FFFFFF',
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
        color: '#2F2F2F',
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
        color: '#2F2F2F',
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
        width: '100%',
        maxWidth: 320,
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

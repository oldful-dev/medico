import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePickerInput from '@/components/common/DateTimePickerInput';
import { FormInput } from '@/components/common';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';


// ─── Figma Assets ───
const imgEye = require('@/assets/images/e9d68d0206e443ceceadd7907cd94f1c86fcacd4.png');
const imgBrain = require('@/assets/images/2e6febd890c9753178f23a84a8293d0b79e606b6.png');
const imgKidney = require('@/assets/images/bc2188e6d87da62a1af90ead7f0bf3503c62395c.png');
const imgLungs = require('@/assets/images/2e704f53861f02d36dae70114611506893870ca5.png');
const imgCancer = require('@/assets/images/12a939ac9402eccf1948ba9378dc7ffb078381cb.png');
const imgDental = require('@/assets/images/fde7739eae440fa8bbeccc49dfe81d9417584cdb.png');
const imgHospitalIcon = require('@/assets/images/31bbfde9d06049efbd9fd2f7dfc3a946806d9b19.png');
const imgRadioIcon = require('@/assets/images/9e6f2fbe6164dacc5707082a5ca833130f9cddd9.png');
// If no explicit image for the add-ons row, we will use ionicons.
// If no explicit image for the add-ons row, we will use ionicons. Check screen cap:
// Add-ons list: Transport (unchecked circle by default, I'll use ionicons), Support (green check), Car/Money ($500)

const SPECIALISTS = [
    { id: 'eye', label: 'Eye\nSpecialist', icon: imgEye },
    { id: 'brain', label: 'Brain &\nNerves', icon: imgBrain },
    { id: 'kidney', label: 'Kidney &\nUrinary', icon: imgKidney },
    { id: 'lungs', label: 'Lungs &\nBreathing', icon: imgLungs },
    { id: 'dental', label: 'Dental Care', icon: imgDental },
    { id: 'cancer', label: 'Cancer\nSpecialist', icon: imgCancer },
];

export default function HospitalTripScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [selectedSpecialist, setSelectedSpecialist] = useState<string | null>(null);
    const [hospitalPreference, setHospitalPreference] = useState<'preferred' | 'recommend' | null>(null);
    const [hospitalQuery, setHospitalQuery] = useState('');
    const [selectedDoctorType, setSelectedDoctorType] = useState<'preferred' | 'recommend'>('preferred');
    const [preferredDoctor, setPreferredDoctor] = useState('');
    const [landmark, setLandmark] = useState('');
    const [transportAddon, setTransportAddon] = useState(false);
    const [supportAddon, setSupportAddon] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    // API state (Refactored to Hook)
    const {
        cityId,
        serviceId,
        serviceName,
        servicePrice,
        address,
        setAddress,
        locationDenied,
        isLoading: isLoadingInit,
        isReady
    } = useServiceInitialization('hospital-trip');

    const [isBooking, setIsBooking] = useState(false);

    const handleBookService = async () => {
        if (!selectedSpecialist) {
            Alert.alert('Select Specialist', 'Please select a specialist category first.');
            return;
        }
        if (!hospitalPreference) {
            Alert.alert('Select Hospital', 'Please select a hospital preference.');
            return;
        }
        if (hospitalPreference === 'preferred' && !hospitalQuery.trim()) {
            Alert.alert('Hospital Required', 'Please enter your preferred hospital name.');
            return;
        }
        if (selectedDoctorType === 'preferred' && !preferredDoctor.trim()) {
            Alert.alert('Doctor Name Required', "Please enter your preferred doctor's name.");
            return;
        }
        if (!selectedDate) {
            Alert.alert('Date Required', 'Please select an appointment date.');
            return;
        }
        if (!address || address.trim().length < 5 || address === 'Fetching address...') {
            Alert.alert('Address Required', locationDenied
                ? 'Please type your pickup address manually since location access is denied.'
                : 'Could not fetch your address. Please wait or try again.');
            return;
        }
        if (!isReady) {
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
                addressLine: address || undefined,
                landmark: landmark || undefined,
                formDataJson: {
                    specialist: selectedSpecialist || 'General',
                    hospitalPreference,
                    hospital: hospitalPreference === 'preferred' ? hospitalQuery : undefined,
                    doctorPreference: selectedDoctorType,
                    preferredDoctor: selectedDoctorType === 'preferred' ? preferredDoctor : undefined,
                    transport: transportAddon,
                    support: supportAddon,
                },
            });

            router.push({
                pathname: '/payment/checkout',
                params: { bookingPayload, amount: String(servicePrice), label: serviceName },
            });
        } catch (error) {
            console.error('Hospital trip error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };
    return (
        <View style={styles.screen}>
            {/* Dark green background covers top half */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{t('hospital_trip.header')}</Text>
            </View>

            {/* Main Content Area (Rounded Cream Box) */}
            <View style={styles.contentContainer}>
                <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                    {/* ─── Hero / Titles ─── */}
                    <Text style={styles.mainTitle}>Hospital Trip</Text>
                    <Text style={styles.subTitle}>Select a specialist. You can only select one.</Text>
                    <View style={styles.divider} />

                    {/* ─── Specialists Grid ─── */}
                    <View style={styles.specialistGrid}>
                        {SPECIALISTS.map((item) => {
                            const isSelected = selectedSpecialist === item.id;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.specialistCard, isSelected && styles.specialistCardSelected]}
                                    activeOpacity={0.7}
                                    onPress={() => setSelectedSpecialist(item.id)}
                                >
                                    <Image source={item.icon} style={styles.specialistIcon} resizeMode="contain" />
                                    <Text style={[styles.specialistLabel, isSelected && styles.specialistLabelSelected]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    <View style={styles.divider} />

                    {/* ─── Destination Details ─── */}
                    <View style={styles.sectionHeaderRow}>
                        <Image source={imgRadioIcon} style={styles.sectionHeaderIcon} resizeMode="contain" />
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Destination Details</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.doctorOptionRow}
                        activeOpacity={0.7}
                        onPress={() => setHospitalPreference('preferred')}
                    >
                        <View style={[styles.radioCircle, hospitalPreference === 'preferred' && styles.radioCircleSelected]} />
                        <Text style={styles.doctorOptionText}>I have a preferred Hospital</Text>
                    </TouchableOpacity>

                    {hospitalPreference === 'preferred' && (
                        <View style={styles.doctorNameInput}>
                            <TextInput
                                style={styles.doctorTextInput}
                                placeholder="Enter hospital name"
                                placeholderTextColor="#2F2F2F"
                                value={hospitalQuery}
                                onChangeText={setHospitalQuery}
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.doctorOptionRow}
                        activeOpacity={0.7}
                        onPress={() => setHospitalPreference('recommend')}
                    >
                        <View style={[styles.radioCircle, hospitalPreference === 'recommend' && styles.radioCircleSelected]} />
                        <Text style={styles.doctorOptionText}>Recommend a hospital for me</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    {/* ─── Select Doctor ─── */}
                    <Text style={[styles.sectionTitle, { marginLeft: 0 }]}>Select Doctor</Text>

                    <TouchableOpacity
                        style={styles.doctorOptionRow}
                        activeOpacity={0.7}
                        onPress={() => setSelectedDoctorType('preferred')}
                    >
                        <View style={[styles.radioCircle, selectedDoctorType === 'preferred' && styles.radioCircleSelected]} />
                        <Text style={styles.doctorOptionText}>I have a preferred Doctor</Text>
                    </TouchableOpacity>

                    {selectedDoctorType === 'preferred' && (
                        <View style={styles.doctorNameInput}>
                            <TextInput
                                style={styles.doctorTextInput}
                                placeholder="Enter doctor name"
                                placeholderTextColor="#2F2F2F"
                                value={preferredDoctor}
                                onChangeText={setPreferredDoctor}
                            />
                        </View>
                    )}


                    <TouchableOpacity
                        style={styles.doctorOptionRow}
                        activeOpacity={0.7}
                        onPress={() => setSelectedDoctorType('recommend')}
                    >
                        <View style={[styles.radioCircle, selectedDoctorType === 'recommend' && styles.radioCircleSelected]} />
                        <Text style={styles.doctorOptionText}>Recommend a doctor for me</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    {/* ─── Schedule ─── */}
                    <DateTimePickerInput
                        label="Schedule"
                        onDateChange={(date) => setSelectedDate(date)}
                    />

                    {/* ─── Service Add-ons ─── */}
                    <View style={styles.addonsContainer}>
                        <Text style={styles.sectionTitle}>Service Add-ons</Text>

                        {/* Addon: Transport */}
                        <TouchableOpacity
                            style={styles.addonRow}
                            activeOpacity={0.7}
                            onPress={() => setTransportAddon(!transportAddon)}
                        >
                            {transportAddon ? (
                                <View style={styles.checkedBoxBig}>
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                </View>
                            ) : (
                                <View style={styles.uncheckedCircle} />
                            )}
                            <Text style={styles.addonText}>
                                <Text style={styles.addonBold}>Transport: </Text>Arrange Cab for me?
                            </Text>
                            <Ionicons name="chevron-forward" size={18} color="#555" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>

                        {/* Addon: Support */}
                        <TouchableOpacity
                            style={styles.addonRow}
                            activeOpacity={0.7}
                            onPress={() => setSupportAddon(!supportAddon)}
                        >
                            {supportAddon ? (
                                <View style={styles.checkedBoxBig}>
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                </View>
                            ) : (
                                <View style={styles.uncheckedCircle} />
                            )}
                            <Text style={styles.addonText}>
                                <Text style={styles.addonBold}>Support: </Text>Send an Ayuxa Care Buddy to{'\n'}assist me at the hospital?
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.addonDivider} />

                        {/* Cost Summary */}
                        <View style={styles.costRow}>
                            {/* In Figma, there's a small car icon here, using car icon from Ionicons for now */}
                            <Ionicons name="car" size={20} color="#C42A2A" style={{ marginRight: 6 }} />
                            <Text style={styles.costText}>
                                <Text style={styles.costAmount}>$500</Text>
                                <Text style={styles.costLabel}> Booking </Text>
                                <Text style={styles.costActuals}>Fee + Actuals</Text>
                            </Text>
                        </View>
                    </View>

                    {/* ─── Confirm Pickup Address ─── */}
                    <View style={styles.addonsContainer}>
                        <Text style={styles.sectionTitle}>Confirm Pickup Address</Text>

                        {locationDenied ? (
                            <FormInput
                                placeholder="Type your full pickup address"
                                value={address}
                                onChangeText={setAddress}
                                multiline
                                style={{ elevation: 0, borderWidth: 1, borderColor: '#D9D9D9' }}
                            />
                        ) : (
                            <View style={[styles.inputCard, { marginBottom: 5, backgroundColor: 'rgba(217, 217, 217, 0.2)' }]}>
                                <Ionicons name="location-outline" size={18} color="#2F2F2F" style={{ marginRight: 10 }} />
                                <Text style={{ flex: 1, fontFamily: 'LexendDeca_400Regular', color: '#2F2F2F' }} numberOfLines={1}>
                                    {address}
                                </Text>
                                <TouchableOpacity onPress={() => router.push('/(auth)/city-selection')}>
                                    <Text style={{ color: '#02743F', fontFamily: 'LexendDeca_500Medium' }}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 4, marginLeft: 2 }}>
                            {locationDenied ? "GPS Access Denied. Please provide exact location." : "Auto-filled from Google Maps location."}
                        </Text>
                        <FormInput
                            placeholder="Landmark (optional, e.g. Near Apollo Hospital)"
                            value={landmark}
                            onChangeText={setLandmark}
                            style={{ marginTop: 12, elevation: 0 }}
                        />
                    </View>

                    {/* ─── Confirm Button ─── */}
                    <TouchableOpacity
                        style={[styles.submitButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                        activeOpacity={0.8}
                        disabled={isBooking || isLoadingInit}
                        onPress={handleBookService}
                    >
                        {isLoadingInit ? (
                            <Text style={styles.submitButtonText}>Initializing...</Text>
                        ) : isBooking ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>Confirm & Request Trip</Text>
                        )}
                    </TouchableOpacity>

                </KeyboardAwareScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357',
    },

    /* ─── Header ─── */
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 25,
        backgroundColor: '#048357',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        marginLeft: 12,
        letterSpacing: -0.24,
    },

    /* ─── Main Content Container (Cream Box) ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: '#FDFDE8',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    scrollContent: {
        paddingTop: 25,
        paddingHorizontal: 25,
        paddingBottom: 40,
    },

    /* ─── Hero ─── */
    mainTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: '#2F2F2F',
        marginBottom: 5,
        textAlign: 'left',
    },
    subTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#898989',
        textAlign: 'left',
        marginBottom: 15,
    },
    divider: {
        height: 1,
        backgroundColor: '#D9D9D9',
        marginVertical: 15,
    },

    /* ─── Specialists Grid ─── */
    specialistGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 15,
    },
    specialistCard: {
        width: '31%',
        aspectRatio: 1, // slightly taller in design? Let's use specific height
        height: 110,
        backgroundColor: 'rgba(217, 217, 217, 0.48)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    specialistCardSelected: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#02743F',
    },
    specialistIcon: {
        width: 60,
        height: 60,
        marginBottom: 5,
    },
    specialistLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11,
        color: '#848484',
        textAlign: 'center',
        lineHeight: 14,
    },
    specialistLabelSelected: {
        color: '#02743F',
    },

    /* ─── Destination Details ─── */
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionHeaderIcon: {
        width: 20,
        height: 19,
        marginRight: 8,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: '#2F2F2F',
        marginBottom: 15,
    },

    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 15,
        height: 57,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#777',
    },
    hospitalIcon: {
        width: 34,
        height: 34,
        marginRight: 10,
    },
    inputStack: {
        flex: 1,
        justifyContent: 'center',
    },
    hospitalInput: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
        padding: 0,
        marginBottom: 2,
    },
    hospitalInputHint: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 8,
        color: '#555555',
    },
    checkedBox: {
        width: 16,
        height: 16,
        backgroundColor: '#6FCF45', // Green matching checkbox
        borderRadius: 4,
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedHospitalText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
    },

    /* ─── Select Doctor ─── */
    doctorOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    radioCircle: {
        width: 19,
        height: 19,
        borderRadius: 9.5,
        borderWidth: 1,
        borderColor: '#A0A0A0',
        marginRight: 10,
        marginLeft: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: '#02743F',
        borderWidth: 5, // Dot look
    },
    doctorOptionText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
    },
    doctorNameInput: {
        height: 53,
        borderWidth: 1,
        borderColor: '#777',
        borderRadius: 10,
        justifyContent: 'center',
        paddingHorizontal: 15,
        marginLeft: 20,
        marginRight: 10,
        marginBottom: 15,
    },
    doctorTextInput: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
    },

    /* ─── Schedule ─── */
    scheduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    scheduleCard: {
        width: '48%',
        height: 83,
        borderWidth: 2,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scheduleIcon: {
        width: 25,
        height: 25,
        marginBottom: 3,
        position: 'absolute',
        top: 10,
        left: 10,
    },
    scheduleValue: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#555',
        marginTop: 15,
    },
    scheduleLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: '#555',
        marginTop: 5,
    },
    scheduleIconTime: {
        width: 35,
        height: 35,
        position: 'absolute',
        top: 5,
        left: 5,
    },
    scheduleValueTime: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 20,
        color: '#555',
        marginTop: 10,
    },
    scheduleValueTimePeriod: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
    },

    /* ─── Add-ons Container ─── */
    addonsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 11,
        padding: 20,
        paddingBottom: 15,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    addonRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    checkedBoxBig: {
        width: 24,
        height: 24,
        backgroundColor: '#6FCF45', // Green
        borderRadius: 6,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    uncheckedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#A0A0A0',
        marginRight: 10,
        marginTop: 2, // align with text
    },
    addonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#555555',
        flex: 1,
        lineHeight: 18,
    },
    addonBold: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#555555',
    },
    addonDivider: {
        height: 1,
        backgroundColor: '#D9D9D9',
        marginVertical: 10,
    },
    costRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
    },
    costText: {
    },
    costAmount: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
    },
    costLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
    },
    costActuals: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
    },

    /* ─── Submit Button ─── */
    submitButton: {
        backgroundColor: '#02743F',
        height: 45,
        borderRadius: 22.5,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        width: 230,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 14,
    },
});

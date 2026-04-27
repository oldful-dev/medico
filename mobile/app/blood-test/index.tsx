import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
    Image,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { useUser } from '@/context/UserContext';
import { labService } from '@/services/api/labService';
import { locationService } from '@/services/device/locationService';
import { ApiError } from '@/services/api/apiClient';
import type { LabPackage, LabSlot } from '@/services/api/labService';

// ─── Local Assets (downloaded from Figma) ──────────────────────────────────
const calendarIcon = require('@/assets/images/9db46350ce94677b709648f4aadad3189870cab5.png');
const clockIcon    = require('@/assets/images/b0c2041dcbc9f27873dbb95bd36571aded3422d2.png');
const cautionIcon  = require('@/assets/images/c4f7fda686169deb23b4565362e0a544adc4d7c4.png');

// ─── Figma Design Tokens ────────────────────────────────────────────────────
const PRIMARY_GREEN = '#02743F';
const CREAM_BG = '#FDFDE8';
const CARD_BORDER = '#E5E7EB';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';

// ─── Static test options matching Figma "Full Body Package" dropdown ────────
const STATIC_TESTS = [
    'Full Body Package',
    'Complete Blood Count (CBC)',
    'Diabetes Panel',
    'Thyroid Function (T3/T4/TSH)',
    'Lipid Profile',
    'Liver Function Test',
    'Kidney Function Test',
];

// ─── Static time slots matching Figma "2:00 PM" ────────────────────────────
const STATIC_SLOTS = [
    '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM',
    '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM',
    '3:00 PM', '4:00 PM', '5:00 PM',
];

export default function BloodTestScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();

    const { cityId, serviceId, address, isLoading: isLoadingInit, servicePrice, serviceName } = useServiceInitialization('blood-test');

    // GPS coords for slot fetching and holdBooking payload
    const coords = useRef({ lat: '12.9716', long: '77.5946' });
    useEffect(() => {
        (async () => {
            try {
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const loc = await locationService.getCurrentLocation();
                    coords.current = { lat: String(loc.latitude), long: String(loc.longitude) };
                }
            } catch { /* use defaults */ }
        })();
    }, []);

    // ─── Helpers (Defined at top to avoid hoisting issues in hooks) ─────────
    const generateNextDays = () => {
        const daysArr: Date[] = [];
        const today = new Date();
        const startDay = today.getHours() >= 16 ? 1 : 0;
        for (let i = startDay; i <= 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            daysArr.push(d);
        }
        return daysArr;
    };

    const isSlotPast = (slot: string, dateToCheck: Date | null) => {
        if (!dateToCheck) return false;
        const today = new Date();
        if (dateToCheck.toDateString() !== today.toDateString()) return false;

        const [time, period] = slot.split(' ');
        let [hours] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        const slotTime = new Date(today);
        slotTime.setHours(hours, 0, 0, 0);
        return slotTime.getTime() <= today.getTime() + (2 * 60 * 60 * 1000);
    };

    // ─── Data state ─────────────────────────────────────────────────────────
    const [packages, setPackages] = useState<LabPackage[]>([]);
    const [slots, setSlots] = useState<LabSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);

    // ─── Selection state ─────────────────────────────────────────────────────
    const [selectedTest, setSelectedTest] = useState('Full Body Package');
    const [showTestPicker, setShowTestPicker] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<LabPackage | null>(null);

    // ─── Schedule state (matching Figma: date tile + time tile) ──────────────
    const days = generateNextDays();
    const [selectedDate, setSelectedDate] = useState<Date | null>(days[0] || null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<LabSlot | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // ─── Fasting banner + acknowledgment ─────────────────────────────────────
    const [fastingVisible, setFastingVisible] = useState(true);
    const [showFastingModal, setShowFastingModal] = useState(false);
    const [fastingAcknowledged, setFastingAcknowledged] = useState(false);

    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const pkgs = await labService.getPackages();
            setPackages(pkgs || []);
            if (pkgs?.length > 0) setSelectedPackage(pkgs[0]);
        } catch (error) {
            console.error('Fetch packages failed:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch real time slots from API when date changes (mirrors web logic)
    useEffect(() => {
        if (!selectedDate) return;
        const dateStr = selectedDate.toISOString().split('T')[0];
        setSlotsLoading(true);
        setSelectedTime(null);
        setSelectedSlot(null);
        labService.getTimeSlots(dateStr, coords.current.lat, coords.current.long)
            .then((apiSlots) => {
                if (apiSlots && apiSlots.length > 0) {
                    setSlots(apiSlots);
                    // Auto-select first available slot
                    const first = apiSlots.find(s => !isSlotPast(s.slot || s.slot_time || '', selectedDate));
                    if (first) {
                        setSelectedTime(first.slot || first.slot_time || '');
                        setSelectedSlot(first);
                    }
                } else {
                    // Fall back to static slots if API returns empty
                    setSlots([]);
                    const firstStatic = STATIC_SLOTS.find(s => !isSlotPast(s, selectedDate));
                    if (firstStatic) setSelectedTime(firstStatic);
                }
            })
            .catch(() => {
                setSlots([]);
                const firstStatic = STATIC_SLOTS.find(s => !isSlotPast(s, selectedDate));
                if (firstStatic) setSelectedTime(firstStatic);
            })
            .finally(() => setSlotsLoading(false));
    }, [selectedDate]);

    // Format date to display like Figma: "April 30, 2024"
    const formatDisplayDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const proceedToBooking = async () => {
        if (!selectedPackage || !selectedDate || !selectedTime) return;
        try {
            setIsBooking(true);

            const dateStr = selectedDate.toISOString().split('T')[0];
            const amount = selectedPackage.discounted_cost || selectedPackage.cost || servicePrice || 799;

            let redcliffeBookingId: string | undefined;
            let clientRefId: string | undefined;

            // Only call holdBooking when we have a real slot_id from the API
            if (selectedSlot && selectedSlot.slot_id) {
                const pincodeMatch = address.match(/\b\d{6}\b/);
                const pincode = pincodeMatch ? pincodeMatch[0] : '';

                const holdPayload = {
                    bookingType: 'HOME' as const,
                    patient: {
                        name: profile?.name || 'User',
                        age: 30,
                        gender: profile?.gender || 'Male',
                        phone: profile?.phone || '',
                    },
                    address: {
                        lat: coords.current.lat,
                        long: coords.current.long,
                        pincode,
                        line1: address,
                    },
                    packages: [{
                        code: selectedPackage.code,
                        name: selectedPackage.name,
                        cost: selectedPackage.discounted_cost || selectedPackage.cost,
                    }],
                    slot: {
                        date: dateStr,
                        time: selectedTime,
                        slotId: selectedSlot.slot_id,
                    },
                };

                const holdResult = await labService.holdBooking(holdPayload);
                redcliffeBookingId = holdResult?.order?.redcliffeBookingId;
                clientRefId = holdResult?.order?.clientRefId;
            }

            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: selectedDate.toISOString(),
                addressLine: address,
                formDataJson: {
                    packageName: selectedPackage.name,
                    packageCode: selectedPackage.code,
                    slotTime: selectedTime,
                    slotId: selectedSlot?.slot_id,
                    fasting: selectedPackage.fasting,
                    redcliffeBookingId,
                    clientRefId,
                },
            });

            router.push({
                pathname: '/payment/checkout',
                params: {
                    bookingPayload,
                    amount: String(amount),
                    label: selectedPackage.name || serviceName || 'Home Blood Test',
                },
            });
        } catch (error) {
            console.error('Blood test booking error:', error);
            const msg = error instanceof ApiError ? error.message.toLowerCase() : '';

            if (msg.includes('collection_date') && msg.includes('four days')) {
                Alert.alert(
                    'Date Too Far',
                    'Home collection can only be booked up to 4 days in advance. Please select a closer date.',
                    [{ text: 'Change Date', onPress: () => setShowDatePicker(true) }]
                );
            } else if (msg.includes('collection_date') || msg.includes('date')) {
                Alert.alert(
                    'Invalid Date',
                    'The selected date is not available for collection. Please pick a different date.',
                    [{ text: 'Change Date', onPress: () => setShowDatePicker(true) }]
                );
            } else if (msg.includes('slot') || msg.includes('time')) {
                Alert.alert(
                    'Slot Unavailable',
                    'This time slot is no longer available. Please choose a different time.',
                    [{ text: 'Change Time', onPress: () => setShowTimePicker(true) }]
                );
            } else if (msg.includes('pincode') || msg.includes('serviceable') || msg.includes('location') || msg.includes('area')) {
                Alert.alert(
                    'Area Not Serviceable',
                    'Home blood collection is not available at your location. Please try a different address.'
                );
            } else if (msg.includes('package') || msg.includes('test') || msg.includes('code')) {
                Alert.alert(
                    'Package Unavailable',
                    'This test package is currently unavailable. Please select a different test.',
                    [{ text: 'Change Test', onPress: () => setShowTestPicker(true) }]
                );
            } else if (msg.includes('patient') || msg.includes('phone') || msg.includes('name')) {
                Alert.alert(
                    'Patient Details Invalid',
                    'There was an issue with your profile details. Please ensure your name and phone number are complete in your profile.'
                );
            } else if (error instanceof ApiError && error.statusCode === 408) {
                Alert.alert(
                    'Request Timed Out',
                    'The booking request took too long. Please check your internet connection and try again.'
                );
            } else if (error instanceof ApiError && error.statusCode === 0) {
                Alert.alert(
                    'No Connection',
                    'Could not reach the server. Please check your internet connection and try again.'
                );
            } else {
                Alert.alert(
                    'Booking Failed',
                    'Could not reserve your slot. Please try again or contact support if the issue persists.'
                );
            }
        } finally {
            setIsBooking(false);
        }
    };

    const handleConfirmBooking = async () => {
        if (!selectedPackage && !selectedTest) {
            Alert.alert('Required', 'Please select a test or package.');
            return;
        }
        if (!selectedDate) {
            Alert.alert('Date Required', 'Please select a collection date.');
            return;
        }
        if (!selectedTime) {
            Alert.alert('Time Required', 'Please select a time slot.');
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

        // Fasting gate — matches web: show modal, user must acknowledge before proceeding
        if (selectedPackage?.fasting && !fastingAcknowledged) {
            setShowFastingModal(true);
            return;
        }

        await proceedToBooking();
    };

    // ─── Date picker modal (simple inline calendar) ───────────────────────────


    const renderContent = () => (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* ─── Select Your Test Card ─────────────────────────────────────── */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Select Your Test</Text>
                <Text style={styles.chooseTestLabel}>Choose Test</Text>

                {/* Dropdown button — matches Figma "Full Body Package" + chevron */}
                <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowTestPicker(true)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.dropdownText}>{selectedTest}</Text>
                    <Ionicons name="chevron-down" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
            </View>

            {/* ─── Schedule Your Appointment Card ───────────────────────────── */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Schedule Your Appointment</Text>

                <View style={styles.scheduleTiles}>
                    {/* Date Tile — left, matches Figma calendar 3D icon */}
                    <TouchableOpacity
                        style={[styles.scheduleTile, selectedDate ? styles.scheduleTilePlain : styles.scheduleTilePlain]}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.8}
                    >
                        <Image source={calendarIcon} style={[styles.scheduleIcon, { width: 25, height: 25 }]} resizeMode="contain" />
                        <Text style={styles.scheduleTileMain}>
                            {selectedDate ? formatDisplayDate(selectedDate) : 'Select Date'}
                        </Text>
                        <Text style={styles.scheduleTileSub}>Pick-up</Text>
                    </TouchableOpacity>

                    {/* Time Tile — right, active green border, matches Figma clock icon */}
                    <TouchableOpacity
                        style={[styles.scheduleTile, styles.scheduleTileActive]}
                        onPress={() => setShowTimePicker(true)}
                        activeOpacity={0.8}
                    >
                        <Image source={clockIcon} style={[styles.scheduleIcon, { width: 35, height: 35 }]} resizeMode="contain" />
                        <Text style={[styles.scheduleTileMain, styles.scheduleTileMainActive]}>
                            {selectedTime || 'Select Time'}
                        </Text>
                        <Text style={styles.scheduleTileSub}>Pick-up</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── Confirm Booking Button ─────────────────────────────────────── */}
            <TouchableOpacity
                style={[styles.confirmButton, isBooking && { opacity: 0.6 }]}
                onPress={handleConfirmBooking}
                disabled={isBooking}
                activeOpacity={0.85}
            >
                {isBooking ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                )}
            </TouchableOpacity>

            {/* ─── Fasting Required Banner ────────────────────────────────────── */}
            {fastingVisible && (
                <View style={styles.fastingBanner}>
                    <Image source={cautionIcon} style={styles.cautionIcon} resizeMode="contain" />
                    <View style={styles.fastingContent}>
                        <Text style={styles.fastingTitle}>Fasting Required</Text>
                        <Text style={styles.fastingMessage}>
                            Please do not eat 10-12 hours before this test
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.fastingOkBtn}
                        onPress={() => setFastingVisible(false)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.fastingOkText}>Ok</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* ─── Header — Back arrow + title on cream background ─────────── */}
            <View style={styles.headerRow}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color={PRIMARY_GREEN} />
                </TouchableOpacity>
            </View>

            {/* Title block below arrow — matches Figma layout */}
            <View style={styles.titleBlock}>
                <Text style={styles.pageTitle}>Book a Home Blood Test</Text>
                <Text style={styles.pageSubtitle}>Lab tests &amp; checkup at your doorstep</Text>
            </View>

            {renderContent()}

            {/* ─── Date Picker Modal ────────────────────────────────────────── */}
            <Modal visible={showDatePicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                <Ionicons name="close" size={22} color={TEXT_DARK} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {generateNextDays().map((day, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.pickerRow,
                                        selectedDate?.toDateString() === day.toDateString() && styles.pickerRowActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedDate(day);
                                        setShowDatePicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.pickerRowText,
                                        selectedDate?.toDateString() === day.toDateString() && styles.pickerRowTextActive,
                                    ]}>
                                        {formatDisplayDate(day)}
                                    </Text>
                                    {selectedDate?.toDateString() === day.toDateString() && (
                                        <Ionicons name="checkmark" size={18} color={PRIMARY_GREEN} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ─── Time Picker Modal ────────────────────────────────────────── */}
            <Modal visible={showTimePicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Time</Text>
                            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                                <Ionicons name="close" size={22} color={TEXT_DARK} />
                            </TouchableOpacity>
                        </View>
                        {slotsLoading ? (
                            <ActivityIndicator color={PRIMARY_GREEN} style={{ marginVertical: 30 }} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {(slots.length > 0 ? slots.map(s => s.slot || s.slot_time || '') : STATIC_SLOTS).map((slot, i) => {
                                    const past = isSlotPast(slot, selectedDate);
                                    const apiSlot = slots.length > 0 ? slots[i] : null;
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[
                                                styles.pickerRow,
                                                selectedTime === slot && styles.pickerRowActive,
                                                past && { opacity: 0.4 }
                                            ]}
                                            disabled={past}
                                            onPress={() => {
                                                setSelectedTime(slot);
                                                setSelectedSlot(apiSlot);
                                                setShowTimePicker(false);
                                            }}
                                        >
                                            <Text style={[
                                                styles.pickerRowText,
                                                selectedTime === slot && styles.pickerRowTextActive,
                                                past && { textDecorationLine: 'line-through' }
                                            ]}>
                                                {slot}
                                            </Text>
                                            {selectedTime === slot && (
                                                <Ionicons name="checkmark" size={18} color={PRIMARY_GREEN} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ─── Fasting Acknowledgment Modal ────────────────────────────── */}
            <Modal visible={showFastingModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { borderRadius: 20, paddingHorizontal: 24, paddingVertical: 28 }]}>
                        <Image source={cautionIcon} style={[styles.cautionIcon, { alignSelf: 'center', width: 48, height: 48, marginBottom: 12 }]} resizeMode="contain" />
                        <Text style={[styles.fastingTitle, { fontSize: 16, textAlign: 'center', marginBottom: 8 }]}>Fasting Required</Text>
                        <Text style={[styles.fastingMessage, { textAlign: 'center', marginBottom: 24 }]}>
                            This test requires fasting for 10–12 hours before sample collection. Please do not eat or drink (except water) before your appointment.
                        </Text>
                        <TouchableOpacity
                            style={[styles.confirmButton, { width: '100%', borderRadius: 12 }]}
                            activeOpacity={0.85}
                            onPress={() => {
                                setFastingAcknowledged(true);
                                setShowFastingModal(false);
                                proceedToBooking();
                            }}
                        >
                            <Text style={styles.confirmButtonText}>I Understand, Proceed</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ marginTop: 14, alignSelf: 'center' }} onPress={() => setShowFastingModal(false)}>
                            <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ─── Test Picker Modal ────────────────────────────────────────── */}
            <Modal visible={showTestPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choose Test</Text>
                            <TouchableOpacity onPress={() => setShowTestPicker(false)}>
                                <Ionicons name="close" size={22} color={TEXT_DARK} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Dynamic packages from API (if loaded) */}
                            {packages.length > 0 ? packages.map((pkg) => (
                                <TouchableOpacity
                                    key={pkg.code}
                                    style={[
                                        styles.pickerRow,
                                        selectedTest === pkg.name && styles.pickerRowActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedTest(pkg.name);
                                        setSelectedPackage(pkg);
                                        setShowTestPicker(false);
                                    }}
                                >
                                    <View>
                                        <Text style={[
                                            styles.pickerRowText,
                                            selectedTest === pkg.name && styles.pickerRowTextActive,
                                        ]}>
                                            {pkg.name}
                                        </Text>
                                        <Text style={styles.pickerRowSub}>
                                            ₹{pkg.discounted_cost || pkg.cost}
                                            {pkg.fasting ? '  · Fasting required' : ''}
                                        </Text>
                                    </View>
                                    {selectedTest === pkg.name && (
                                        <Ionicons name="checkmark" size={18} color={PRIMARY_GREEN} />
                                    )}
                                </TouchableOpacity>
                            )) : STATIC_TESTS.map((test, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.pickerRow,
                                        selectedTest === test && styles.pickerRowActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedTest(test);
                                        setShowTestPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.pickerRowText,
                                        selectedTest === test && styles.pickerRowTextActive,
                                    ]}>
                                        {test}
                                    </Text>
                                    {selectedTest === test && (
                                        <Ionicons name="checkmark" size={18} color={PRIMARY_GREEN} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: CREAM_BG,
    },

    /* ─── Header row with back arrow ─────────────────────────────────────── */
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
    },
    backButton: {
        padding: 4,
    },

    /* ─── Title block — matching Figma position below arrow ─────────────── */
    titleBlock: {
        paddingHorizontal: 28,
        paddingTop: 10,
        paddingBottom: 20,
    },
    pageTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 22,
        fontWeight: '700',
        color: PRIMARY_GREEN,
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    pageSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: TEXT_MUTED,
        letterSpacing: -0.2,
    },

    /* ─── Scroll ─────────────────────────────────────────────────────────── */
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 27,
        paddingBottom: 60,
        gap: 16,
    },

    /* ─── White cards ────────────────────────────────────────────────────── */
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: CARD_BORDER,
    },
    cardTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 12,
        letterSpacing: -0.2,
    },

    /* ─── Select Your Test — dropdown matching Figma ─────────────────────── */
    chooseTestLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#AAAAAA',
        marginBottom: 8,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#FAFAFA',
    },
    dropdownText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: TEXT_DARK,
        flex: 1,
    },

    /* ─── Schedule tiles — matching Figma two-tile layout ───────────────── */
    scheduleTiles: {
        flexDirection: 'row',
        gap: 12,
    },
    scheduleTile: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'flex-start',
        backgroundColor: '#FAFAFA',
    },
    scheduleTilePlain: {
        borderColor: CARD_BORDER,
        backgroundColor: '#FAFAFA',
    },
    scheduleTileActive: {
        borderColor: PRIMARY_GREEN,
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
    },
    scheduleIcon: {
        width: 28,
        height: 28,
        marginBottom: 6,
    },
    scheduleTileMain: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_DARK,
        letterSpacing: -0.2,
    },
    scheduleTileMainActive: {
        color: TEXT_DARK,
    },
    scheduleTileSub: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: TEXT_MUTED,
        marginTop: 2,
    },

    /* ─── Confirm Booking button — full width green pill matching Figma ──── */
    confirmButton: {
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 50,
        height: 45,
        width: 230,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    confirmButtonText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: -0.2,
    },

    /* ─── Fasting Required banner — matching Figma yellow card ──────────── */
    fastingBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FEFDE8',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E6D840',
        padding: 14,
        marginTop: 4,
        gap: 12,
    },
    cautionIcon: {
        width: 30,
        height: 30,
        marginTop: 0,
        flexShrink: 0,
    },
    fastingContent: {
        flex: 1,
    },
    fastingTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 4,
    },
    fastingMessage: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#555555',
        lineHeight: 17,
    },
    fastingOkBtn: {
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
        borderRadius: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
        alignSelf: 'flex-end',
        marginTop: 'auto' as any,
    },
    fastingOkText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 13,
        color: PRIMARY_GREEN,
    },

    /* ─── Modal bottom sheets ────────────────────────────────────────────── */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
        paddingBottom: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
    },
    pickerRowActive: {
        backgroundColor: '#F0FFF7',
    },
    pickerRowText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: TEXT_DARK,
    },
    pickerRowTextActive: {
        color: PRIMARY_GREEN,
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
    },
    pickerRowSub: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: TEXT_MUTED,
        marginTop: 2,
    },
});

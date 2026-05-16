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
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
const clockIcon = require('@/assets/images/b0c2041dcbc9f27873dbb95bd36571aded3422d2.png');
const cautionIcon = require('@/assets/images/c4f7fda686169deb23b4565362e0a544adc4d7c4.png');

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

const getTestIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("urine")) return { family: 'MaterialCommunityIcons', name: 'test-tube', color: '#8B5CF6' };
    if (lowerName.includes("iron")) return { family: 'MaterialCommunityIcons', name: 'flask', color: '#14B8A6' };
    if (lowerName.includes("full body") || lowerName.includes("checkup")) return { family: 'Ionicons', name: 'fitness', color: '#F43F5E' };
    if (lowerName.includes("screening") || lowerName.includes("advanced")) return { family: 'Ionicons', name: 'scan', color: '#0EA5E9' };
    if (lowerName.includes("package")) return { family: 'MaterialCommunityIcons', name: 'package', color: '#3B82F6' };
    if (lowerName.includes("hba1c") || lowerName.includes("glycosylated") || lowerName.includes("hemoglobin")) return { family: 'Ionicons', name: 'pulse', color: '#EF4444' };
    if (lowerName.includes("test")) return { family: 'MaterialCommunityIcons', name: 'stethoscope', color: '#10B981' };
    return { family: 'Ionicons', name: 'shield-checkmark', color: '#6366F1' };
};

export default function BloodTestScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();

    const { cityId, serviceId, address, isLoading: isLoadingInit, servicePrice, serviceName } = useServiceInitialization('blood-test');

    // GPS coords for slot fetching and holdBooking payload
    const [coords, setCoords] = useState({ lat: '12.9716', long: '77.5946' });
    const [serviceability, setServiceability] = useState<'unchecked' | 'checking' | 'serviceable' | 'non-serviceable'>('unchecked');

    // Don't auto-detect location on page load — let user choose
    useEffect(() => {
        // Initialize with default coords only, user will choose address source
        setCoords({ lat: '12.9716', long: '77.5946' });
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

    // Address & location state
    const [selectedAddress, setSelectedAddress] = useState<string>('');
    const [pincode, setPincode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
    const [showAddressModal, setShowAddressModal] = useState(true); // Show on page load

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

    // Check serviceability when coords change
    useEffect(() => {
        if (!coords.lat || !coords.long) return;
        const checkServiceabilityAsync = async () => {
            setServiceability('checking');
            try {
                const result = await labService.checkServiceability(coords.lat, coords.long);
                if (result?.status === 'success') {
                    setServiceability('serviceable');
                } else {
                    setServiceability('non-serviceable');
                }
            } catch (error) {
                console.error('Serviceability check failed:', error);
                // Default to serviceable on timeout/error to allow user to proceed
                setServiceability('serviceable');
            }
        };
        checkServiceabilityAsync();
    }, [coords]);

    // Check serviceability when pincode changes (debounced)
    useEffect(() => {
        if (pincode.length !== 6) return;
        const timer = setTimeout(async () => {
            try {
                // For now, trigger a re-check with current coords if pincode is valid
                // In a real app, you'd reverse-geocode the pincode to get lat/lng
                setServiceability('checking');
                const result = await labService.checkServiceability(coords.lat, coords.long);
                if (result?.status === 'success') {
                    setServiceability('serviceable');
                } else {
                    setServiceability('non-serviceable');
                }
            } catch (error) {
                console.error('Serviceability check failed:', error);
                // Default to serviceable on timeout/error to allow user to proceed
                setServiceability('serviceable');
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [pincode, coords]);

    // Fetch real time slots from API when date changes (mirrors web logic)
    useEffect(() => {
        if (!selectedDate) return;
        const dateStr = selectedDate.toISOString().split('T')[0];
        setSlotsLoading(true);
        setSelectedTime(null);
        setSelectedSlot(null);
        labService.getTimeSlots(dateStr, coords.lat, coords.long)
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
    }, [selectedDate, coords]);

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
                const finalPincode = pincode || (address?.match(/\b\d{6}\b/) || [])[0] || '';

                const holdPayload = {
                    bookingType: 'HOME' as const,
                    patient: {
                        name: profile?.name || 'User',
                        age: 30,
                        gender: profile?.gender || 'Male',
                        phone: phoneNumber || profile?.phone || '',
                    },
                    address: {
                        lat: coords.lat,
                        long: coords.long,
                        pincode: finalPincode,
                        line1: selectedAddress || address,
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
                addressLine: selectedAddress || address,
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
        const finalAddr = selectedAddress || address;
        if (!finalAddr || finalAddr.trim().length < 5 || finalAddr === 'Fetching address...') {
            Alert.alert('Address Required', 'Please enter a collection address.');
            return;
        }
        if (serviceability === 'non-serviceable') {
            Alert.alert('Location Not Serviceable', 'Home collection is not available at your location. Please try a different address.');
            return;
        }
        if (serviceability === 'unchecked' || serviceability === 'checking') {
            Alert.alert('Location Check Required', 'Please wait for location verification to complete.');
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
            {/* ─── Select Your Test Grid ─────────────────────────────────────── */}
            <Text style={styles.sectionHeaderTitle}>What test or package do you need?</Text>

            <View style={styles.horizontalScrollWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.gridContainer}
                    decelerationRate="fast"
                    snapToInterval={296} // 280 width + 16 gap
                >
                    {packages.length > 0 ? packages.map((pkg) => {
                        const iconConfig = getTestIcon(pkg.name);
                        const discountPercent = pkg.cost && pkg.discounted_cost && pkg.cost > pkg.discounted_cost
                            ? Math.round(((pkg.cost - pkg.discounted_cost) / pkg.cost) * 100)
                            : 0;

                        const isSelected = selectedPackage?.code === pkg.code;

                        return (
                            <TouchableOpacity
                                key={pkg.code}
                                style={[styles.testCard, isSelected && styles.testCardSelected]}
                                onPress={() => {
                                    setSelectedTest(pkg.name);
                                    setSelectedPackage(pkg);
                                }}
                                activeOpacity={0.8}
                            >
                                {/* Save Badge */}
                                {discountPercent > 0 && (
                                    <View style={styles.saveBadge}>
                                        <Text style={styles.saveBadgeText}>SAVE {discountPercent}%</Text>
                                    </View>
                                )}

                                {/* Header: Icon & Type */}
                                <View style={styles.testCardHeader}>
                                    <View style={[styles.testIconContainer, isSelected && styles.testIconContainerSelected]}>
                                        {iconConfig.family === 'Ionicons' ? (
                                            <Ionicons name={iconConfig.name as any} size={24} color={isSelected ? PRIMARY_GREEN : iconConfig.color} />
                                        ) : (
                                            <MaterialCommunityIcons name={iconConfig.name as any} size={24} color={isSelected ? PRIMARY_GREEN : iconConfig.color} />
                                        )}
                                    </View>
                                    <View style={styles.testTagsContainer}>
                                        <View style={[styles.typeBadge, pkg.type === 'package' ? styles.typeBadgePackage : styles.typeBadgeTest]}>
                                            <Text style={[styles.typeBadgeText, pkg.type === 'package' ? styles.typeBadgeTextPackage : styles.typeBadgeTextTest]}>
                                                {pkg.type || 'TEST'}
                                            </Text>
                                        </View>
                                        {pkg.fasting && (
                                            <View style={styles.fastingBadge}>
                                                <Ionicons name="time" size={10} color="#D97706" />
                                                <Text style={styles.fastingBadgeText}>FASTING REQUIRED</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Title */}
                                <View style={styles.testTitleContainer}>
                                    <Text style={[styles.testTitle, isSelected && styles.testTitleSelected]} numberOfLines={2}>
                                        {pkg.name}
                                    </Text>
                                    {pkg.tests_count !== undefined && pkg.tests_count > 0 && (
                                        <Text style={styles.testIncludes}>
                                            Includes {pkg.tests_count} test{pkg.tests_count !== 1 ? 's' : ''}
                                        </Text>
                                    )}
                                </View>

                                {/* Pricing Footer */}
                                <View style={styles.testFooter}>
                                    <View>
                                        <Text style={styles.priceLabel}>PRICE</Text>
                                        <View style={styles.priceRow}>
                                            <Text style={styles.currentPrice}>₹{pkg.discounted_cost || pkg.cost}</Text>
                                            {(pkg.discounted_cost ?? 0) < (pkg.cost ?? 0) && (
                                                <Text style={styles.originalPrice}>₹{pkg.cost}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                        {isSelected && <View style={styles.radioInner} />}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }) : (
                        <ActivityIndicator color={PRIMARY_GREEN} style={{ marginTop: 20, marginLeft: 20 }} />
                    )}
                </ScrollView>

                {/* Edge fade gradients */}
                <LinearGradient
                    colors={[CREAM_BG, '#FDFDE800']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fadeLeft}
                    pointerEvents="none"
                />
                <LinearGradient
                    colors={['#FDFDE800', CREAM_BG]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fadeRight}
                    pointerEvents="none"
                />
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
                        <Image source={calendarIcon} style={styles.scheduleIcon} resizeMode="contain" />
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
                        <Image source={clockIcon} style={styles.scheduleIcon} resizeMode="contain" />
                        <Text style={[styles.scheduleTileMain, styles.scheduleTileMainActive]}>
                            {selectedTime || 'Select Time'}
                        </Text>
                        <Text style={styles.scheduleTileSub}>Pick-up</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── Collection Address Card ────────────────────────────────── */}
            <View style={styles.card}>
                <View style={styles.cardHeaderWithButtons}>
                    <Text style={styles.cardTitle}>Collection Address</Text>
                    <TouchableOpacity
                        style={styles.detectButton}
                        onPress={async () => {
                            try {
                                const loc = await locationService.getCurrentLocation();
                                const newCoords = { lat: String(loc.latitude), long: String(loc.longitude) };
                                setCoords(newCoords);

                                // Get readable address
                                const addressText = await locationService.getAddressFromCoordinates(loc);
                                setSelectedAddress(addressText);

                                // Get pincode from address or native geocoding
                                const extractedPincode = await locationService.getPincodeFromAddress(loc, addressText);
                                if (extractedPincode) {
                                    setPincode(extractedPincode);
                                }
                            } catch (error) {
                                Alert.alert('Location Error', 'Could not detect your location. Please enter manually.');
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="locate" size={14} color={PRIMARY_GREEN} />
                        <Text style={styles.detectButtonText}>Detect</Text>
                    </TouchableOpacity>
                </View>

                {/* Address Input */}
                <View style={styles.addressInputContainer}>
                    <Ionicons name="location" size={20} color={PRIMARY_GREEN} style={styles.addressInputIcon} />
                    <TextInput
                        style={styles.addressInput}
                        placeholder="Enter full address for sample collection..."
                        value={selectedAddress}
                        onChangeText={setSelectedAddress}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Pincode & Phone Row */}
                <View style={styles.addressRow}>
                    <TextInput
                        style={[styles.addressInputSmall, { flex: 1 }]}
                        placeholder="Pincode"
                        value={pincode}
                        onChangeText={setPincode}
                        maxLength={6}
                        keyboardType="numeric"
                    />
                    <TextInput
                        style={[styles.addressInputSmall, { flex: 1.2, marginLeft: 12 }]}
                        placeholder="Phone"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                    />
                </View>

                {/* Serviceability Status */}
                {serviceability === 'checking' && (
                    <View style={[styles.statusBanner, styles.statusChecking]}>
                        <ActivityIndicator color={TEXT_MUTED} size="small" />
                        <Text style={styles.statusText}>Checking serviceability...</Text>
                    </View>
                )}
                {serviceability === 'serviceable' && (
                    <View style={[styles.statusBanner, styles.statusServiceable]}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.statusText}>Location is serviceable</Text>
                    </View>
                )}
                {serviceability === 'non-serviceable' && (
                    <View style={[styles.statusBanner, styles.statusNonServiceable]}>
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.statusText}>Home collection unavailable at this location</Text>
                    </View>
                )}
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

            {/* ─── Address Selection Modal (shown on page load) ─────────────────────────── */}
            <Modal visible={showAddressModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { maxHeight: '80%', borderRadius: 20, marginHorizontal: 20, marginBottom: 40 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Delivery Address</Text>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ paddingBottom: 20 }}>
                            {/* Saved Addresses */}
                            {profile?.addresses && profile.addresses.length > 0 && (
                                <>
                                    <Text style={styles.addressSectionTitle}>Your Saved Addresses</Text>
                                    {profile.addresses.map((addr: any, idx: number) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.addressOption}
                                            onPress={async () => {
                                                const addrLine = addr.line1 || '';
                                                setSelectedAddress(addrLine);
                                                setPincode(addr.pincode || '');
                                                setPhoneNumber(addr.phone || profile.phone || '');
                                                setCoords({
                                                    lat: String(addr.lat || '12.9716'),
                                                    long: String(addr.long || '77.5946'),
                                                });
                                                setShowAddressModal(false);
                                            }}
                                        >
                                            <View style={styles.addressOptionContent}>
                                                <Ionicons name="location" size={18} color={PRIMARY_GREEN} />
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={styles.addressOptionLabel}>{addr.label || 'Saved Address'}</Text>
                                                    <Text style={styles.addressOptionText} numberOfLines={2}>
                                                        {addr.line1}
                                                    </Text>
                                                    {addr.pincode && (
                                                        <Text style={styles.addressOptionPincode}>{addr.pincode}</Text>
                                                    )}
                                                </View>
                                                {addr.isDefault && (
                                                    <View style={styles.defaultBadge}>
                                                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}

                            {/* Divider */}
                            {profile?.addresses && profile.addresses.length > 0 && (
                                <View style={styles.addressDivider} />
                            )}

                            {/* Detect Current Location */}
                            <Text style={styles.addressSectionTitle}>Or detect your location</Text>
                            <TouchableOpacity
                                style={styles.addressOption}
                                onPress={async () => {
                                    try {
                                        const loc = await locationService.getCurrentLocation();
                                        const newCoords = { lat: String(loc.latitude), long: String(loc.longitude) };
                                        setCoords(newCoords);

                                        // Get readable address
                                        const addressText = await locationService.getAddressFromCoordinates(loc);
                                        setSelectedAddress(addressText);

                                        // Get pincode from address or native geocoding
                                        const extractedPincode = await locationService.getPincodeFromAddress(loc, addressText);
                                        if (extractedPincode) {
                                            setPincode(extractedPincode);
                                        }

                                        setShowAddressModal(false);
                                    } catch (error) {
                                        Alert.alert('Location Error', 'Could not detect your location. Please try again or select a saved address.');
                                    }
                                }}
                            >
                                <View style={styles.addressOptionContent}>
                                    <Ionicons name="locate" size={18} color={PRIMARY_GREEN} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.addressOptionLabel}>Detect Current Location</Text>
                                        <Text style={styles.addressOptionText}>Use your GPS to find the nearest blood collection center</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
                                </View>
                            </TouchableOpacity>
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

    /* ─── Grid Styles (Web Parity) ───────────────────────────────────────── */
    sectionHeaderTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_DARK,
        marginBottom: 12,
        letterSpacing: -0.2,
    },
    horizontalScrollWrapper: {
        marginHorizontal: -27, // Pulls the container out to the screen edges
        position: 'relative',
    },
    gridContainer: {
        gap: 16,
        paddingHorizontal: 27, // Restores the padding inside the scroll
        paddingBottom: 10,
    },
    fadeLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 50,
    },
    fadeRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 50,
    },
    testCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: CARD_BORDER,
        position: 'relative',
        overflow: 'hidden',
        width: 280,
    },
    testCardSelected: {
        borderColor: PRIMARY_GREEN,
        backgroundColor: '#F0FDF4',
    },
    saveBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#F43F5E',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 12,
        zIndex: 10,
    },
    saveBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    testCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        marginTop: 4,
    },
    testIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    testIconContainerSelected: {
        backgroundColor: '#D1FAE5',
    },
    testTagsContainer: {
        alignItems: 'flex-end',
        gap: 6,
        marginTop: 4,
        marginRight: 4,
    },
    typeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    typeBadgePackage: {
        backgroundColor: '#EFF6FF',
    },
    typeBadgeTest: {
        backgroundColor: '#FAF5FF',
    },
    typeBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    typeBadgeTextPackage: {
        color: '#2563EB',
    },
    typeBadgeTextTest: {
        color: '#9333EA',
    },
    fastingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    fastingBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#D97706',
    },
    testTitleContainer: {
        marginBottom: 16,
    },
    testTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 6,
    },
    testTitleSelected: {
        color: '#064E3B',
    },
    testIncludes: {
        fontSize: 11,
        color: TEXT_MUTED,
        fontWeight: '500',
    },
    testFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
    },
    priceLabel: {
        fontSize: 10,
        color: TEXT_MUTED,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    currentPrice: {
        fontSize: 20,
        fontWeight: '900',
        color: TEXT_DARK,
    },
    originalPrice: {
        fontSize: 12,
        color: TEXT_MUTED,
        textDecorationLine: 'line-through',
        fontWeight: '500',
    },
    radioCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    radioCircleSelected: {
        borderColor: PRIMARY_GREEN,
        backgroundColor: PRIMARY_GREEN,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFFFFF',
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
        width: 44,
        height: 44,
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

    /* ─── Address Card Styles ─────────────────────────────────────────── */
    cardHeaderWithButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
        gap: 4,
    },
    detectButtonText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 12,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    addressInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#FAFAFA',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: CARD_BORDER,
    },
    addressInputIcon: {
        marginRight: 10,
        marginTop: 8,
    },
    addressInput: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: TEXT_DARK,
        minHeight: 80,
    },
    addressRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    addressInputSmall: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#FAFAFA',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        fontSize: 14,
        color: TEXT_DARK,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    statusChecking: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statusServiceable: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    statusNonServiceable: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    statusText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '500',
    },

    /* ─── Address Selection Modal Styles ───────────────────────────────── */
    addressSectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        letterSpacing: -0.2,
    },
    addressOption: {
        marginHorizontal: 12,
        marginVertical: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: CARD_BORDER,
    },
    addressOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    addressOptionLabel: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 4,
    },
    addressOptionText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: TEXT_MUTED,
        lineHeight: 16,
    },
    addressOptionPincode: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 11,
        color: PRIMARY_GREEN,
        fontWeight: '600',
        marginTop: 4,
    },
    defaultBadge: {
        backgroundColor: PRIMARY_GREEN,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    defaultBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    addressDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 12,
        marginVertical: 12,
    },
});

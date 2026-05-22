import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput,
    ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { labService, type LabPackage, type LabSlot } from '@/services/api/labService';
import { locationService } from '@/services/device/locationService';
import { useUser } from '@/context/UserContext';
import { userService } from '@/services/api/userService';
import { LocationPickerModal } from '@/components/LocationPickerModal';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';
const LIGHT_GREEN_BG = '#F0FDF4';

export default function BloodTestScheduleScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile, setProfile } = useUser();
    const params = useLocalSearchParams<{ packagePayload?: string }>();

    const [pkg, setPkg] = useState<LabPackage | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1); // 3-step flow: Date/Time, Address, Confirm
    const [coords, setCoords] = useState({ lat: '12.9716', long: '77.5946' });

    // Step 1: Date & Time
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [slots, setSlots] = useState<LabSlot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    // Step 2: Collection type + Address
    const [collectionType, setCollectionType] = useState<'HOME' | 'LAB'>('HOME');
    const [selectedAddress, setSelectedAddress] = useState('');
    const [pincode, setPincode] = useState('');
    const [landmark, setLandmark] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
    const [serviceabilityStatus, setServiceabilityStatus] = useState<'unchecked' | 'checking' | 'serviceable' | 'non-serviceable'>('unchecked');
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [locationPickerVisible, setLocationPickerVisible] = useState(false);

    // Add new address inline
    const [addingNewAddr, setAddingNewAddr] = useState(false);
    const [newAddrLabel, setNewAddrLabel] = useState('Home');
    const [newAddrText, setNewAddrText] = useState('');
    const [newAddrPincode, setNewAddrPincode] = useState('');
    const [newAddrLandmark, setNewAddrLandmark] = useState('');
    const [newAddrCoords, setNewAddrCoords] = useState({ lat: '', long: '' });
    const [newAddrPickerVisible, setNewAddrPickerVisible] = useState(false);
    const [savingNewAddr, setSavingNewAddr] = useState(false);

    // Step 3: Confirm
    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        if (params.packagePayload) {
            try {
                const p = JSON.parse(params.packagePayload);
                setPkg(p);
            } catch (e) {
                console.error('Failed to parse package:', e);
            }
        }
        const today = new Date();
        if (today.getHours() >= 16) today.setDate(today.getDate() + 1);
        setSelectedDate(today);
    }, [params.packagePayload]);

    // Auto-fill profile default address when entering step 2 and no address is set
    useEffect(() => {
        if (step === 2 && !selectedAddress && profile?.addresses?.length) {
            const defaultAddr = profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0];
            if (defaultAddr) {
                const parts = [defaultAddr.line1, defaultAddr.line2, defaultAddr.cityName].filter(Boolean);
                setSelectedAddress(parts.join(', '));
                if (defaultAddr.pincode) setPincode(defaultAddr.pincode);
                if (defaultAddr.landmark) setLandmark(defaultAddr.landmark);
            }
        }
    }, [step]);

    // Fetch slots when date changes
    useEffect(() => {
        if (!selectedDate || !pkg) return;
        setSlotsLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        labService.getTimeSlots(dateStr, coords.lat, coords.long)
            .then(data => {
                const slots = Array.isArray(data) ? data : [];
                setSlots(slots);
                if (slots.length > 0) {
                    setSelectedTime(slots[0].slot || slots[0].slot_time || '');
                }
            })
            .catch(() => setSlots([]))
            .finally(() => setSlotsLoading(false));
    }, [selectedDate, pkg]);

    const formatDate = (d: Date) => {
        return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
    };

    const generateDays = () => {
        const arr = [];
        const start = selectedDate || new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            arr.push(d);
        }
        return arr;
    };


    const handleLocationConfirmed = (location: any) => {
        const address = location.address || location.description || '';
        setSelectedAddress(address);
        setCoords({
            lat: String(location.latitude),
            long: String(location.longitude),
        });
        const pincodeMatch = address.match(/\b\d{6}\b/);
        if (pincodeMatch) setPincode(pincodeMatch[0]);
        checkServiceability(String(location.latitude), String(location.longitude));
        setLocationPickerVisible(false);
    };

    const handleDetectLocation = async () => {
        setDetectingLocation(true);
        try {
            const coords = await locationService.getCurrentLocation();
            const address = await locationService.getAddressFromCoordinates(coords);
            const pincode = await locationService.getPincodeFromAddress(coords, address);

            setCoords({ lat: String(coords.latitude), long: String(coords.longitude) });
            setSelectedAddress(address);
            if (pincode) {
                setPincode(pincode);
            }
            checkServiceability(String(coords.latitude), String(coords.longitude));
        } catch (error) {
            Alert.alert('Location Error', 'Unable to detect your location. Please search manually.');
            console.error('Location detection failed:', error);
        } finally {
            setDetectingLocation(false);
        }
    };

    const checkServiceability = async (lat: string, lng: string) => {
        setServiceabilityStatus('checking');
        try {
            const result: any = await labService.checkServiceability(lat, lng);
            const isServiceable = result?.status === 'success' || result?.data?.status === 'success' || result?.serviceable === true;
            if (isServiceable) {
                setServiceabilityStatus('serviceable');
            } else {
                setServiceabilityStatus('non-serviceable');
            }
        } catch {
            setServiceabilityStatus('unchecked');
        }
    };

    const handleSaveNewAddress = async () => {
        if (!newAddrText.trim()) {
            Alert.alert('Required', 'Please select or enter an address');
            return;
        }
        if (newAddrPincode.length !== 6) {
            Alert.alert('Required', 'Please enter a valid 6-digit pincode');
            return;
        }
        if (!profile?.id) return;
        setSavingNewAddr(true);
        try {
            const payload = {
                label: newAddrLabel,
                line1: newAddrText.trim(),
                cityName: '',
                state: '',
                pincode: newAddrPincode,
                ...(newAddrLandmark.trim() ? { landmark: newAddrLandmark.trim() } : {}),
                isDefault: (profile.addresses?.length ?? 0) === 0,
            };
            const res = await userService.addAddress(profile.id, payload);
            const savedAddr = res.success && res.data ? res.data : { ...payload, id: String(Date.now()) };
            setProfile({ ...profile, addresses: [...(profile.addresses || []), savedAddr] });
            // Auto-select the newly added address
            setSelectedAddress(newAddrText.trim());
            setPincode(newAddrPincode);
            setLandmark(newAddrLandmark.trim());
            if (newAddrCoords.lat) {
                setCoords(newAddrCoords);
                checkServiceability(newAddrCoords.lat, newAddrCoords.long);
            }
            // Reset and close
            setNewAddrText('');
            setNewAddrPincode('');
            setNewAddrLandmark('');
            setNewAddrCoords({ lat: '', long: '' });
            setNewAddrLabel('Home');
            setAddingNewAddr(false);
        } catch {
            Alert.alert('Error', 'Could not save address. Please try again.');
        } finally {
            setSavingNewAddr(false);
        }
    };

    const handleContinue = async () => {
        if (step === 1) {
            if (!selectedDate || !selectedTime) {
                Alert.alert('Required', 'Please select date and time');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (collectionType === 'HOME') {
                if (!selectedAddress.trim()) {
                    Alert.alert('Required', 'Please enter collection address');
                    return;
                }
                if (pincode.length !== 6) {
                    Alert.alert('Required', 'Please enter valid 6-digit pincode');
                    return;
                }
                if (serviceabilityStatus === 'non-serviceable') {
                    Alert.alert('Not Serviceable', 'This location is not serviceable. Please select another address.');
                    return;
                }
            }
            setStep(3);
        } else if (step === 3) {
            await handleConfirmBooking();
        }
    };

    const handleConfirmBooking = async () => {
        if (!pkg || !selectedDate || !selectedTime) return;

        if (!phoneNumber.trim()) {
            Alert.alert('Required', 'Please enter a valid phone number');
            return;
        }

        setIsBooking(true);
        try {
            const selectedSlot = slots.find(s => (s.slot || s.slot_time) === selectedTime);
            const bookingPayload = {
                bookingType: collectionType,
                patient: {
                    name: profile?.name || '',
                    age: 30,
                    gender: profile?.gender || 'M',
                    phone: phoneNumber,
                },
                address: {
                    lat: coords.lat,
                    long: coords.long,
                    pincode,
                    line1: selectedAddress,
                    ...(landmark.trim() ? { landmark: landmark.trim() } : {}),
                },
                packages: [{
                    code: pkg.code,
                    name: pkg.name,
                    cost: pkg.discounted_cost || pkg.cost,
                }],
                slot: {
                    date: selectedDate.toISOString().split('T')[0],
                    time: selectedTime,
                    slotId: selectedSlot?.slot_id || 0,
                },
            };

            // Sync address back to profile (non-blocking, non-fatal)
            if (profile?.id && selectedAddress.trim()) {
                const existing = profile.addresses?.find((a: any) => a.isDefault) || profile.addresses?.[0];
                const addrPayload = {
                    label: existing?.label || 'Home',
                    line1: selectedAddress.trim(),
                    cityName: existing?.cityName || '',
                    state: existing?.state || '',
                    pincode: pincode || existing?.pincode || '',
                    ...(landmark.trim() ? { landmark: landmark.trim() } : {}),
                    isDefault: true,
                };
                if (existing?.id) {
                    userService.updateAddress(profile.id, existing.id, addrPayload).catch(() => {});
                } else {
                    userService.addAddress(profile.id, addrPayload).catch(() => {});
                }
            }

            const amount = pkg.discounted_cost || pkg.cost;
            router.push({
                pathname: '/blood-test/order-summary',
                params: {
                    bookingPayload: JSON.stringify(bookingPayload),
                    amount: String(amount),
                    label: pkg.name,
                    testsCount: String(pkg.tests_count || 0),
                    collectionType,
                },
            } as any);
        } catch (error) {
            Alert.alert('Error', 'Failed to proceed with booking');
        } finally {
            setIsBooking(false);
        }
    };

    const renderStep1 = () => (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepContent}>
            {/* Date Selection */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
                    {generateDays().map((day, idx) => (
                        <TouchableOpacity
                            key={idx}
                            onPress={() => setSelectedDate(day)}
                            style={[
                                styles.dateChip,
                                selectedDate?.toDateString() === day.toDateString() && styles.dateChipActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.dateChipText,
                                    selectedDate?.toDateString() === day.toDateString() && styles.dateChipTextActive,
                                ]}
                            >
                                {formatDate(day)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Time Slots */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Time Slot</Text>
                {slotsLoading ? (
                    <View style={{ paddingVertical: 20 }}>
                        <ActivityIndicator size="small" color={PRIMARY_GREEN} />
                    </View>
                ) : (
                    <View style={styles.slotsGrid}>
                        {slots.map((slot, idx) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => setSelectedTime(slot.slot || slot.slot_time || '')}
                                style={[
                                    styles.slotButton,
                                    selectedTime === (slot.slot || slot.slot_time) && styles.slotButtonActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.slotButtonText,
                                        selectedTime === (slot.slot || slot.slot_time) && styles.slotButtonTextActive,
                                    ]}
                                >
                                    {slot.slot || slot.slot_time}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );

    const renderStep2 = () => (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Collection Type</Text>
                <TouchableOpacity
                    style={[styles.collectionOption, collectionType === 'HOME' && styles.collectionOptionActive]}
                    onPress={() => setCollectionType('HOME')}
                    activeOpacity={0.75}
                >
                    <Ionicons name="home" size={20} color={collectionType === 'HOME' ? PRIMARY_GREEN : TEXT_MUTED} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>Home Collection</Text>
                        <Text style={styles.optionDesc}>We'll collect sample from your home</Text>
                    </View>
                    <Ionicons
                        name={collectionType === 'HOME' ? 'checkmark-circle' : 'radio-button-off'}
                        size={24}
                        color={collectionType === 'HOME' ? PRIMARY_GREEN : '#D1D5DB'}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.collectionOption, collectionType === 'LAB' && styles.collectionOptionActive]}
                    onPress={() => setCollectionType('LAB')}
                    activeOpacity={0.75}
                >
                    <Ionicons name="business" size={20} color={collectionType === 'LAB' ? PRIMARY_GREEN : TEXT_MUTED} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>Lab Visit</Text>
                        <Text style={styles.optionDesc}>Drop your sample at the nearest lab</Text>
                    </View>
                    <Ionicons
                        name={collectionType === 'LAB' ? 'checkmark-circle' : 'radio-button-off'}
                        size={24}
                        color={collectionType === 'LAB' ? PRIMARY_GREEN : '#D1D5DB'}
                    />
                </TouchableOpacity>
            </View>

            {collectionType === 'HOME' && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Collection Address</Text>

                {/* Saved Addresses + Add New chip */}
                <View style={{ marginBottom: 12 }}>
                    {(profile?.addresses?.length > 0 || true) && (
                        <Text style={styles.subLabel}>Saved Addresses</Text>
                    )}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        {(profile?.addresses || []).map((addr: any, idx: number) => {
                            const addrText = [addr.line1, addr.line2, addr.cityName].filter(Boolean).join(', ');
                            const isSelected = selectedAddress === addrText;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.savedAddrChip, isSelected && styles.savedAddrChipActive]}
                                    onPress={() => {
                                        setSelectedAddress(addrText);
                                        if (addr.pincode) setPincode(addr.pincode);
                                        if (addr.landmark) setLandmark(addr.landmark);
                                        checkServiceability(coords.lat, coords.long);
                                        setAddingNewAddr(false);
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="location" size={13} color={isSelected ? '#FFFFFF' : PRIMARY_GREEN} style={{ marginRight: 4 }} />
                                    <Text style={[styles.savedAddrChipText, isSelected && styles.savedAddrChipTextActive]} numberOfLines={1}>
                                        {addr.label || `Address ${idx + 1}`}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            style={[styles.savedAddrChip, addingNewAddr && styles.savedAddrChipActive, { borderStyle: 'dashed' }]}
                            onPress={() => { setAddingNewAddr(v => !v); setSelectedAddress(''); }}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="add" size={13} color={addingNewAddr ? '#FFFFFF' : PRIMARY_GREEN} style={{ marginRight: 4 }} />
                            <Text style={[styles.savedAddrChipText, addingNewAddr && styles.savedAddrChipTextActive]}>Add New</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Inline Add New Address form */}
                {addingNewAddr && (
                    <View style={styles.newAddrBox}>
                        <Text style={styles.newAddrTitle}>New Address</Text>

                        {/* Label picker */}
                        <View style={styles.labelRow}>
                            {['Home', 'Office', 'Other'].map(lbl => (
                                <TouchableOpacity
                                    key={lbl}
                                    style={[styles.labelChip, newAddrLabel === lbl && styles.labelChipActive]}
                                    onPress={() => setNewAddrLabel(lbl)}
                                >
                                    <Text style={[styles.labelChipText, newAddrLabel === lbl && styles.labelChipTextActive]}>{lbl}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Pick via location picker */}
                        <TouchableOpacity
                            style={styles.pickLocationBtn}
                            onPress={() => setNewAddrPickerVisible(true)}
                        >
                            <Ionicons name="search" size={16} color={PRIMARY_GREEN} style={{ marginRight: 8 }} />
                            <Text style={styles.pickLocationBtnText} numberOfLines={1}>
                                {newAddrText || 'Search & pick location'}
                            </Text>
                        </TouchableOpacity>

                        {/* Manual address override */}
                        <TextInput
                            placeholder="Full address"
                            placeholderTextColor={TEXT_MUTED}
                            value={newAddrText}
                            onChangeText={setNewAddrText}
                            multiline
                            style={[styles.addressInput, { marginBottom: 8 }]}
                        />

                        <View style={styles.row}>
                            <TextInput
                                placeholder="Pincode *"
                                placeholderTextColor={TEXT_MUTED}
                                value={newAddrPincode}
                                onChangeText={setNewAddrPincode}
                                maxLength={6}
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                            />
                            <TextInput
                                placeholder="Landmark (optional)"
                                placeholderTextColor={TEXT_MUTED}
                                value={newAddrLandmark}
                                onChangeText={setNewAddrLandmark}
                                style={[styles.input, { flex: 1 }]}
                            />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                            <TouchableOpacity
                                style={[styles.backButton, { flex: 1 }]}
                                onPress={() => setAddingNewAddr(false)}
                            >
                                <Text style={styles.backButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.continueButton, { flex: 1 }, savingNewAddr && styles.continueButtonDisabled]}
                                onPress={handleSaveNewAddress}
                                disabled={savingNewAddr}
                            >
                                {savingNewAddr
                                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                                    : <Text style={styles.continueButtonText}>Save & Use</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Location Selection Options - Show only when no address selected */}
                {!selectedAddress && (
                    <View style={styles.locationOptionsContainer}>
                        <TouchableOpacity
                            style={[styles.locationOptionBtn, { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }]}
                            onPress={handleDetectLocation}
                            disabled={detectingLocation}
                        >
                            {detectingLocation ? (
                                <ActivityIndicator size="small" color={PRIMARY_GREEN} />
                            ) : (
                                <>
                                    <Ionicons name="locate" size={28} color={PRIMARY_GREEN} style={{ marginBottom: 8 }} />
                                    <Text style={styles.locationOptionTitle}>Auto Detect</Text>
                                    <Text style={styles.locationOptionDesc}>Current location</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.locationOptionBtn, { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }]}
                            onPress={() => setLocationPickerVisible(true)}
                        >
                            <Ionicons name="search" size={28} color={PRIMARY_GREEN} style={{ marginBottom: 8 }} />
                            <Text style={styles.locationOptionTitle}>Manual</Text>
                            <Text style={styles.locationOptionDesc}>Search & select</Text>
                        </TouchableOpacity>
                    </View>
                )}



                {/* Serviceability Status */}
                {serviceabilityStatus === 'checking' && (
                    <View style={[styles.serviceabilityBanner, { backgroundColor: '#FEF3C7' }]}>
                        <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 10 }} />
                        <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '500' }}>
                            Checking serviceability...
                        </Text>
                    </View>
                )}
                {serviceabilityStatus === 'serviceable' && (
                    <View style={[styles.serviceabilityBanner, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="checkmark-circle" size={16} color={PRIMARY_GREEN} style={{ marginRight: 10 }} />
                        <Text style={{ fontSize: 12, color: PRIMARY_GREEN, fontWeight: '600' }}>
                            Location is serviceable
                        </Text>
                    </View>
                )}
                {serviceabilityStatus === 'non-serviceable' && (
                    <View style={[styles.serviceabilityBanner, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 10 }} />
                        <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>
                            Location not serviceable
                        </Text>
                    </View>
                )}

                {/* Address Input */}
                <TextInput
                    placeholder="Enter full address"
                    placeholderTextColor={TEXT_MUTED}
                    value={selectedAddress}
                    onChangeText={setSelectedAddress}
                    multiline
                    style={styles.addressInput}
                />

                {/* Pincode & Landmark Row */}
                <View style={styles.row}>
                    <TextInput
                        placeholder="Pincode"
                        placeholderTextColor={TEXT_MUTED}
                        value={pincode}
                        onChangeText={setPincode}
                        maxLength={6}
                        keyboardType="numeric"
                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                    />
                    <TextInput
                        placeholder="Landmark (optional)"
                        placeholderTextColor={TEXT_MUTED}
                        value={landmark}
                        onChangeText={setLandmark}
                        style={[styles.input, { flex: 1 }]}
                    />
                </View>

                {/* Phone */}
                <TextInput
                    placeholder="Phone Number"
                    placeholderTextColor={TEXT_MUTED}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    style={styles.input}
                />
            </View>
            )}
        </ScrollView>
    );

    const renderStep3 = () => (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.stepContent}>
            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Test</Text>
                    <Text style={styles.summaryValue}>{pkg?.name}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowDivider]}>
                    <Text style={styles.summaryLabel}>Parameters</Text>
                    <Text style={styles.summaryValue}>{pkg?.tests_count || 0}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowDivider]}>
                    <Text style={styles.summaryLabel}>Date & Time</Text>
                    <Text style={styles.summaryValue}>
                        {selectedDate?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}, {selectedTime}
                    </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowDivider]}>
                    <Text style={styles.summaryLabel}>Collection Type</Text>
                    <Text style={styles.summaryValue}>{collectionType === 'HOME' ? 'Home Collection' : 'Lab Visit'}</Text>
                </View>
                {collectionType === 'HOME' && !!selectedAddress && (
                    <View style={[styles.summaryRow, styles.summaryRowDivider]}>
                        <Text style={styles.summaryLabel}>Address</Text>
                        <Text style={[styles.summaryValue, { maxWidth: '60%' }]} numberOfLines={2}>{selectedAddress}</Text>
                    </View>
                )}
                <View style={[styles.summaryRow, styles.summaryRowDivider]}>
                    <Text style={styles.summaryLabel}>Convenience Fee</Text>
                    <Text style={styles.summaryValue}>₹0 (Free)</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Payable Amount</Text>
                    <Text style={styles.summaryAmount}>₹{pkg?.discounted_cost || pkg?.cost}</Text>
                </View>
            </View>
        </ScrollView>
    );

    const getStepContent = () => {
        switch (step) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            default: return null;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Schedule Your Blood Test</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
                {[1, 2, 3].map((s) => (
                    <View key={s} style={{ alignItems: 'center', flex: 1 }}>
                        <View
                            style={[
                                styles.stepDot,
                                step >= s && styles.stepDotActive,
                            ]}
                        >
                            <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>
                                {s}
                            </Text>
                        </View>
                        {s < 3 && (
                            <View
                                style={[
                                    styles.stepLine,
                                    step > s && styles.stepLineActive,
                                ]}
                            />
                        )}
                    </View>
                ))}
            </View>

            {/* Step Labels */}
            <View style={styles.stepLabels}>
                <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Date & Time</Text>
                <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Address</Text>
                <Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive]}>Confirm</Text>
            </View>

            {/* Content */}
            {getStepContent()}

            {/* Footer Button */}
            <View style={styles.footer}>
                {step > 1 && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        (isBooking || (step === 2 && serviceabilityStatus === 'non-serviceable')) && styles.continueButtonDisabled
                    ]}
                    onPress={handleContinue}
                    disabled={isBooking || (step === 2 && serviceabilityStatus === 'non-serviceable')}
                >
                    {isBooking ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.continueButtonText}>
                            {step === 3 ? 'Continue to Payment' : 'Continue'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Location Picker Modal — existing address */}
            <LocationPickerModal
                visible={locationPickerVisible}
                onClose={() => setLocationPickerVisible(false)}
                onLocationConfirmed={handleLocationConfirmed}
                initialLat={parseFloat(coords.lat)}
                initialLng={parseFloat(coords.long)}
            />

            {/* Location Picker Modal — new address */}
            <LocationPickerModal
                visible={newAddrPickerVisible}
                onClose={() => setNewAddrPickerVisible(false)}
                onLocationConfirmed={(location: any) => {
                    const address = location.address || location.description || '';
                    setNewAddrText(address);
                    setNewAddrCoords({ lat: String(location.latitude), long: String(location.longitude) });
                    const pincodeMatch = address.match(/\b\d{6}\b/);
                    if (pincodeMatch) setNewAddrPincode(pincodeMatch[0]);
                    setNewAddrPickerVisible(false);
                }}
                initialLat={parseFloat(coords.lat)}
                initialLng={parseFloat(coords.long)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_DARK,
        flex: 1,
        textAlign: 'center',
    },
    stepIndicator: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    stepDot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    stepDotActive: {
        backgroundColor: PRIMARY_GREEN,
        borderColor: PRIMARY_GREEN,
    },
    stepDotText: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_MUTED,
    },
    stepDotTextActive: {
        color: '#FFFFFF',
    },
    stepLine: {
        width: 2,
        height: 16,
        backgroundColor: '#E5E7EB',
        marginTop: 4,
    },
    stepLineActive: {
        backgroundColor: PRIMARY_GREEN,
    },
    stepLabels: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    stepLabel: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '500',
        textAlign: 'center',
        flex: 1,
    },
    stepLabelActive: {
        color: PRIMARY_GREEN,
        fontWeight: '600',
    },
    stepContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 12,
    },
    datesScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    dateChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: '#FFFFFF',
    },
    dateChipActive: {
        backgroundColor: PRIMARY_GREEN,
        borderColor: PRIMARY_GREEN,
    },
    dateChipText: {
        fontSize: 12,
        color: TEXT_DARK,
        fontWeight: '500',
    },
    dateChipTextActive: {
        color: '#FFFFFF',
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    slotButton: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    slotButtonActive: {
        backgroundColor: PRIMARY_GREEN,
        borderColor: PRIMARY_GREEN,
    },
    slotButtonText: {
        fontSize: 13,
        color: TEXT_DARK,
        fontWeight: '500',
    },
    slotButtonTextActive: {
        color: '#FFFFFF',
    },
    collectionOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
    },
    collectionOptionActive: {
        borderColor: PRIMARY_GREEN,
        backgroundColor: LIGHT_GREEN_BG,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    optionDesc: {
        fontSize: 12,
        color: TEXT_MUTED,
        marginTop: 2,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: '#FFFFFF',
        minHeight: 44,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: TEXT_DARK,
        padding: 0,
        minHeight: 40,
    },
    searchResultsContainer: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        marginBottom: 12,
        maxHeight: 220,
        minHeight: 60,
        overflow: 'hidden',
    },
    searchResults: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        maxHeight: 200,
        minHeight: 60,
    },
    loadingResult: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        backgroundColor: '#F3F4F6',
    },
    loadingText: {
        fontSize: 12,
        color: TEXT_MUTED,
        marginLeft: 10,
    },
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 12,
        backgroundColor: '#F3F4F6',
    },
    noResultsText: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 4,
    },
    noResultsSubtext: {
        fontSize: 12,
        color: TEXT_MUTED,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
        backgroundColor: '#FFFFFF',
    },
    resultName: {
        fontSize: 13,
        fontWeight: '500',
        color: TEXT_DARK,
    },
    resultAddr: {
        fontSize: 11,
        color: TEXT_MUTED,
        marginTop: 2,
    },
    addressInput: {
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: TEXT_DARK,
        height: 80,
        marginBottom: 10,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: TEXT_DARK,
    },
    summaryCard: {
        backgroundColor: LIGHT_GREEN_BG,
        borderWidth: 1,
        borderColor: '#D1FAE5',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    summaryRowDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#D1FAE5',
    },
    summaryLabel: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
        maxWidth: '60%',
        textAlign: 'right',
    },
    summaryAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_GREEN,
    },
    footer: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
        borderRadius: 10,
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    continueButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButtonDisabled: {
        opacity: 0.6,
    },
    continueButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    locationOptionsContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    locationOptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 10,
        padding: 14,
        justifyContent: 'center',
    },
    locationOptionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    locationOptionDesc: {
        fontSize: 11,
        color: TEXT_MUTED,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: CARD_BORDER,
    },
    subLabel: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 8,
    },
    savedAddrChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
        backgroundColor: '#FFFFFF',
        marginRight: 8,
        maxWidth: 160,
    },
    savedAddrChipActive: {
        backgroundColor: PRIMARY_GREEN,
        borderColor: PRIMARY_GREEN,
    },
    savedAddrChipText: {
        fontSize: 12,
        color: PRIMARY_GREEN,
        fontWeight: '600',
    },
    savedAddrChipTextActive: {
        color: '#FFFFFF',
    },
    serviceabilityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    backToOptionsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginBottom: 12,
        borderTopWidth: 1,
        borderTopColor: CARD_BORDER,
        paddingTop: 12,
    },
    backToOptionsBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    newAddrBox: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    newAddrTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 10,
    },
    labelRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    labelChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        backgroundColor: '#FFFFFF',
    },
    labelChipActive: {
        backgroundColor: PRIMARY_GREEN,
        borderColor: PRIMARY_GREEN,
    },
    labelChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_MUTED,
    },
    labelChipTextActive: {
        color: '#FFFFFF',
    },
    pickLocationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
    },
    pickLocationBtnText: {
        fontSize: 13,
        color: PRIMARY_GREEN,
        fontWeight: '500',
        flex: 1,
    },
});

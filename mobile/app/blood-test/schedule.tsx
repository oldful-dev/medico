import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { labService, type LabPackage, type LabSlot } from '@/services/api/labService';
import { useUser } from '@/context/UserContext';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';
const LIGHT_GREEN_BG = '#F0FDF4';

export default function BloodTestScheduleScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();
    const params = useLocalSearchParams<{ packagePayload?: string }>();

    const [pkg, setPkg] = useState<LabPackage | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1); // 3-step flow: Date/Time, Address, Confirm
    const [coords, setCoords] = useState({ lat: '12.9716', long: '77.5946' });

    // Step 1: Date & Time
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [slots, setSlots] = useState<LabSlot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    // Step 2: Address (Home Collection default)
    const [selectedAddress, setSelectedAddress] = useState('');
    const [pincode, setPincode] = useState('');
    const [landmark, setLandmark] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
    const [locationSearch, setLocationSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

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

    // Fetch slots when date changes
    useEffect(() => {
        if (!selectedDate || !pkg) return;
        setSlotsLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        labService.getTimeSlots(dateStr, coords.lat, coords.long)
            .then(data => {
                setSlots(data || []);
                if (data?.length > 0) {
                    setSelectedTime(data[0].slot || data[0].slot_time || '');
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

    const searchLocations = async (query: string) => {
        if (!query.trim() || query.length < 3) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const result: any = await labService.searchLocationByArea(query);
            if (result?.data) {
                setSearchResults(result.data);
            } else if (Array.isArray(result)) {
                setSearchResults(result);
            }
        } catch (error) {
            console.error('Location search failed:', error);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const selectSearchResult = async (location: any) => {
        setSelectedAddress(location.placeAddress || location.placeName);
        setLocationSearch('');
        setSearchResults([]);

        if (location.eloc) {
            try {
                const coordResult: any = await labService.getCoordinatesByEloc(location.eloc);
                if (coordResult?.latitude && coordResult?.longitude) {
                    setCoords({ lat: String(coordResult.latitude), long: String(coordResult.longitude) });
                    setPincode(coordResult.pincode || '');
                }
            } catch (error) {
                console.error('Failed to get coordinates:', error);
            }
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
            if (!selectedAddress.trim()) {
                Alert.alert('Required', 'Please enter collection address');
                return;
            }
            if (pincode.length !== 6) {
                Alert.alert('Required', 'Please enter valid 6-digit pincode');
                return;
            }
            setStep(3);
        } else if (step === 3) {
            await handleConfirmBooking();
        }
    };

    const handleConfirmBooking = async () => {
        if (!pkg || !selectedDate || !selectedTime) return;

        setIsBooking(true);
        try {
            const selectedSlot = slots.find(s => (s.slot || s.slot_time) === selectedTime);
            const bookingPayload = {
                bookingType: 'HOME',
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

            const amount = pkg.discounted_cost || pkg.cost;
            router.push({
                pathname: '/blood-test/order-summary',
                params: {
                    bookingPayload: JSON.stringify(bookingPayload),
                    amount: String(amount),
                    label: pkg.name,
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
                <View style={[styles.collectionOption, styles.collectionOptionActive]}>
                    <Ionicons name="home" size={20} color={PRIMARY_GREEN} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>Home Collection</Text>
                        <Text style={styles.optionDesc}>We'll collect sample from your home</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color={PRIMARY_GREEN} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Collection Address</Text>

                {/* Location Search */}
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={16} color={TEXT_MUTED} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search area or location..."
                        placeholderTextColor={TEXT_MUTED}
                        value={locationSearch}
                        onChangeText={(text) => {
                            setLocationSearch(text);
                            searchLocations(text);
                        }}
                        style={styles.searchInput}
                    />
                </View>

                {/* Search Results */}
                {searchLoading && (
                    <ActivityIndicator size="small" color={PRIMARY_GREEN} style={{ marginVertical: 10 }} />
                )}
                {searchResults.length > 0 && (
                    <View style={styles.searchResults}>
                        {searchResults.map((result, idx) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => selectSearchResult(result)}
                                style={styles.searchResultItem}
                            >
                                <Ionicons name="location" size={16} color={PRIMARY_GREEN} />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.resultName}>{result.placeName}</Text>
                                    <Text style={styles.resultAddr}>{result.placeAddress}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
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
                    <Text style={styles.summaryValue}>Home Collection</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowDivider]}>
                    <Text style={styles.summaryLabel}>Address</Text>
                    <Text style={styles.summaryValue}>{selectedAddress}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount</Text>
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
                    style={[styles.continueButton, isBooking && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    disabled={isBooking}
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
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: TEXT_DARK,
        padding: 0,
    },
    searchResults: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        marginBottom: 12,
        maxHeight: 150,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
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
});

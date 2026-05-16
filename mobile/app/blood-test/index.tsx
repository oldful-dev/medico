import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    RefreshControl,
    FlatList,
    Modal,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { labService } from '@/services/api/labService';
import * as Location from 'expo-location';

interface LabPackage {
    code: string;
    name: string;
    cost: number;
    discounted_cost: number;
    tests_count: number;
    fasting: boolean;
    type: string;
}

interface TimeSlot {
    slot_id: number;
    slot_time: string;
}

const CATEGORY_COLORS = [
    { bg: '#047857', light: '#F0FDF4' },
    { bg: '#1E40AF', light: '#EFF6FF' },
    { bg: '#6D28D9', light: '#F3F0FF' },
    { bg: '#B45309', light: '#FFFBEB' },
    { bg: '#991B1B', light: '#FEF2F2' },
];

export default function BloodTestScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { profile, refreshData } = useUser();

    // ─── State ─────────────────────────────────────────
    const [packages, setPackages] = useState<LabPackage[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<LabPackage | null>(null);
    const [search, setSearch] = useState('');
    const [packagesLoading, setPackagesLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ─── Location & Serviceability ─────────────────────
    const [selectedAddress, setSelectedAddress] = useState<any>(null);
    const [latitude, setLatitude] = useState<string | null>(null);
    const [longitude, setLongitude] = useState<string | null>(null);
    const [pincode, setPincode] = useState('');
    const [serviceability, setServiceability] = useState<'unchecked' | 'checking' | 'serviceable' | 'non-serviceable'>('unchecked');
    const [showAddressModal, setShowAddressModal] = useState(false);

    // ─── Date & Slot Selection ─────────────────────────
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

    // ─── Initialize packages on mount ───────────────────
    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        setPackagesLoading(true);
        try {
            const res = await labService.getPackages();
            const packagesArray = Array.isArray(res) ? res : res?.data || [];
            if (packagesArray.length > 0) {
                setPackages(packagesArray);
                setSelectedPackage(packagesArray[0]);
            }
        } catch (error) {
            console.error('Fetch packages error:', error);
            Alert.alert('Error', 'Could not load test packages');
        } finally {
            setPackagesLoading(false);
        }
    };

    // ─── Auto-detect location or use saved address ───────
    useEffect(() => {
        (async () => {
            try {
                // Use saved address from profile first
                if (profile?.addresses && profile.addresses.length > 0) {
                    const defaultAddr = profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0];
                    setSelectedAddress(defaultAddr);
                    setLatitude(String(defaultAddr.latitude || 12.9716));
                    setLongitude(String(defaultAddr.longitude || 77.5946));
                    setPincode(defaultAddr.pincode || '');
                    return;
                }

                // Fallback: auto-detect via GPS
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    setLatitude(String(location.coords.latitude));
                    setLongitude(String(location.coords.longitude));
                }
            } catch (error) {
                console.log('Location detection skipped:', error);
                // Use defaults
                setLatitude('12.9716');
                setLongitude('77.5946');
            }
        })();
    }, [profile?.addresses]);

    // ─── Check serviceability when location changes ─────
    useEffect(() => {
        if (latitude && longitude) {
            checkServiceability();
        }
    }, [latitude, longitude]);

    const checkServiceability = async () => {
        setServiceability('checking');
        try {
            const res = await labService.checkServiceability(latitude!, longitude!);
            if (res?.status === 'success') {
                setServiceability('serviceable');
            } else {
                setServiceability('non-serviceable');
            }
        } catch (error) {
            console.error('Serviceability check error:', error);
            setServiceability('non-serviceable');
        }
    };

    // ─── Fetch time slots when date changes ─────────────
    useEffect(() => {
        if (selectedDate && latitude && longitude && serviceability === 'serviceable') {
            fetchTimeSlots();
        }
    }, [selectedDate, latitude, longitude, serviceability]);

    const fetchTimeSlots = async () => {
        setSlotsLoading(true);
        try {
            const res = await labService.getTimeSlots(selectedDate, latitude!, longitude!);
            if (Array.isArray(res)) {
                setSlots(res);
                setSelectedSlot(null);
            }
        } catch (error) {
            console.error('Fetch time slots error:', error);
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    };

    // ─── Filter packages ───────────────────────────────
    const filteredPackages = useMemo(() => {
        return packages.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.code.toLowerCase().includes(search.toLowerCase())
        );
    }, [packages, search]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchPackages(), refreshData?.()]);
        setRefreshing(false);
    }, [refreshData]);

    const getColorByIndex = (index: number) => {
        return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    };

    const handleSelectAddress = (address: any) => {
        setSelectedAddress(address);
        setLatitude(String(address.latitude || 12.9716));
        setLongitude(String(address.longitude || 77.5946));
        setPincode(address.pincode || '');
        setShowAddressModal(false);
    };

    const handleBooking = () => {
        if (!selectedPackage || !selectedDate || !selectedSlot || !latitude || !longitude) {
            Alert.alert('Missing Details', 'Please select a test, date, and time slot');
            return;
        }

        if (serviceability !== 'serviceable') {
            Alert.alert('Location Not Serviceable', 'Home collection is not available at your location');
            return;
        }

        // Navigate to checkout with booking payload
        const bookingPayload = {
            serviceType: 'lab-test',
            package: selectedPackage,
            slot: {
                date: selectedDate,
                time: selectedSlot.slot_time,
                slotId: selectedSlot.slot_id,
            },
            address: {
                lat: latitude,
                long: longitude,
                pincode,
                line1: selectedAddress?.line1 || 'Location not specified',
            },
            patient: {
                name: profile?.name || 'User',
                phone: profile?.phone || '',
                age: 30,
                gender: 'Male',
            },
        };

        router.push({
            pathname: '/payment/checkout',
            params: {
                bookingPayload: JSON.stringify(bookingPayload),
                amount: String(selectedPackage.discounted_cost || selectedPackage.cost),
                label: selectedPackage.name,
                email: profile?.email || '',
                phone: profile?.phone || '',
                userName: profile?.name || '',
            },
        });
    };

    // ─── Generate next 7 days ──────────────────────────
    const generateNextDays = () => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            days.push(date.toISOString().split('T')[0]);
        }
        return days;
    };

    const nextDays = generateNextDays();

    // ─── LOADING ────────────────────────────────────────
    if (packagesLoading) {
        return (
            <View style={styles.screen}>
                <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
                <StatusBar style="light" backgroundColor={Colors.primary} />
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Diagnostic Labs</Text>
                </View>
                <View style={[styles.contentContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </View>
        );
    }

    // ─── MAIN VIEW ──────────────────────────────────────
    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Diagnostic Labs</Text>
                <Text style={styles.headerSubtitle}>Hospital-grade tests at home</Text>
            </View>

            <ScrollView
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            >
                {/* ─── STEP 1: Test Selection ────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Select Test</Text>
                    <View style={styles.searchRow}>
                        <Ionicons name="search" size={18} color={Colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search tests..."
                            placeholderTextColor={Colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={filteredPackages}
                        keyExtractor={p => p.code}
                        scrollEnabled={false}
                        renderItem={({ item, index }) => {
                            const color = getColorByIndex(index);
                            const isSelected = selectedPackage?.code === item.code;

                            return (
                                <TouchableOpacity
                                    onPress={() => setSelectedPackage(item)}
                                    style={[
                                        styles.packageCard,
                                        isSelected && styles.packageCardSelected,
                                        { borderColor: isSelected ? color.bg : '#E5E7EB' },
                                    ]}
                                >
                                    <View style={[styles.packageIcon, { backgroundColor: color.light }]}>
                                        <Ionicons name="beaker-outline" size={24} color={color.bg} />
                                    </View>
                                    <View style={styles.packageInfo}>
                                        <Text style={styles.packageName} numberOfLines={2}>{item.name}</Text>
                                        <Text style={styles.packageType}>{item.tests_count} tests</Text>
                                        {item.fasting && (
                                            <View style={styles.fastingBadge}>
                                                <Ionicons name="time" size={12} color="#EA580C" />
                                                <Text style={styles.fastingText}>Fasting Required</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.packagePrice}>
                                        <Text style={styles.discountedPrice}>₹{item.discounted_cost}</Text>
                                        {item.discounted_cost < item.cost && (
                                            <Text style={styles.originalPrice}>₹{item.cost}</Text>
                                        )}
                                    </View>
                                    {isSelected && (
                                        <View style={[styles.checkmark, { backgroundColor: color.bg }]}>
                                            <Ionicons name="checkmark" size={16} color="white" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>

                {/* ─── STEP 2: Location & Serviceability ────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📍 Collection Location</Text>

                    <TouchableOpacity
                        style={[styles.addressButton, serviceability === 'serviceable' && styles.addressButtonGreen]}
                        onPress={() => setShowAddressModal(true)}
                    >
                        <Ionicons name="location" size={18} color={serviceability === 'serviceable' ? Colors.primary : '#999'} />
                        <View style={styles.addressButtonText}>
                            <Text style={styles.addressButtonLabel}>
                                {selectedAddress ? selectedAddress.label || 'Saved Address' : 'Select Address'}
                            </Text>
                            <Text style={styles.addressButtonSubtitle} numberOfLines={1}>
                                {selectedAddress ? selectedAddress.line1 : 'No address selected'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#999" />
                    </TouchableOpacity>

                    {/* Serviceability Status */}
                    {serviceability === 'checking' && (
                        <View style={[styles.statusBadge, { backgroundColor: '#FEF3E2' }]}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={{ color: '#B45309', fontFamily: Fonts.medium, marginLeft: 8 }}>Checking serviceability...</Text>
                        </View>
                    )}
                    {serviceability === 'serviceable' && (
                        <View style={[styles.statusBadge, { backgroundColor: '#F0FDF4' }]}>
                            <Ionicons name="checkmark-circle" size={18} color="#047857" />
                            <Text style={{ color: '#047857', fontFamily: Fonts.medium, marginLeft: 8 }}>Location is serviceable</Text>
                        </View>
                    )}
                    {serviceability === 'non-serviceable' && (
                        <View style={[styles.statusBadge, { backgroundColor: '#FEF2F2' }]}>
                            <Ionicons name="alert-circle" size={18} color="#991B1B" />
                            <Text style={{ color: '#991B1B', fontFamily: Fonts.medium, marginLeft: 8 }}>Location not serviceable</Text>
                        </View>
                    )}
                </View>

                {/* ─── STEP 3: Date Selection ────────────────────────────── */}
                {serviceability === 'serviceable' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📅 Select Date</Text>
                        <FlatList
                            data={nextDays}
                            keyExtractor={d => d}
                            scrollEnabled={true}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.dateScroll}
                            renderItem={({ item }) => {
                                const date = new Date(item);
                                const isSelected = selectedDate === item;
                                return (
                                    <TouchableOpacity
                                        onPress={() => setSelectedDate(item)}
                                        style={[
                                            styles.dateButton,
                                            isSelected && styles.dateButtonSelected,
                                        ]}
                                    >
                                        <Text style={[styles.dateDay, isSelected && { color: 'white' }]}>
                                            {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                                        </Text>
                                        <Text style={[styles.dateNumber, isSelected && { color: 'white' }]}>
                                            {date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                )}

                {/* ─── STEP 4: Time Slot Selection ──────────────────────── */}
                {selectedDate && serviceability === 'serviceable' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>⏰ Select Time Slot</Text>
                        {slotsLoading ? (
                            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
                        ) : slots.length === 0 ? (
                            <Text style={styles.noSlotsText}>No slots available for this date</Text>
                        ) : (
                            <View style={styles.slotsGrid}>
                                {slots.map(slot => {
                                    const isSelected = selectedSlot?.slot_id === slot.slot_id;
                                    return (
                                        <TouchableOpacity
                                            key={slot.slot_id}
                                            onPress={() => setSelectedSlot(slot)}
                                            style={[
                                                styles.slotButton,
                                                isSelected && styles.slotButtonSelected,
                                            ]}
                                        >
                                            <Text style={[styles.slotTime, isSelected && { color: 'white' }]}>
                                                {slot.slot_time}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ─── Address Selection Modal ───────────────────────── */}
            <Modal visible={showAddressModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Delivery Address</Text>
                            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.textDark} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={profile?.addresses || []}
                            keyExtractor={(a, i) => String(i)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleSelectAddress(item)}
                                    style={[
                                        styles.addressOption,
                                        selectedAddress?.id === item.id && styles.addressOptionSelected,
                                    ]}
                                >
                                    <Ionicons name="location" size={20} color={Colors.primary} />
                                    <View style={styles.addressOptionText}>
                                        <Text style={styles.addressOptionLabel}>{item.label || 'Address'}</Text>
                                        <Text style={styles.addressOptionSub} numberOfLines={1}>
                                            {item.line1}, {item.cityName}
                                        </Text>
                                    </View>
                                    {selectedAddress?.id === item.id && (
                                        <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* ─── Sticky Booking Footer ─────────────────────────── */}
            {selectedPackage && selectedDate && selectedSlot && (
                <View style={styles.footerContainer}>
                    <View style={styles.footerContent}>
                        <View>
                            <Text style={styles.footerLabel}>Selected</Text>
                            <Text style={styles.footerPackage} numberOfLines={1}>{selectedPackage.name}</Text>
                            <Text style={styles.footerDateTime}>{selectedDate} • {selectedSlot.slot_time}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleBooking}
                            style={[
                                styles.bookButton,
                                serviceability !== 'serviceable' && styles.bookButtonDisabled,
                            ]}
                            disabled={serviceability !== 'serviceable'}
                        >
                            <Text style={styles.bookButtonText}>Book Now</Text>
                            <Ionicons name="arrow-forward" size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FFFCF6' },
    headerContainer: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    headerTitle: { fontSize: FontSize.xl, fontFamily: Fonts.bold, color: 'white' },
    headerSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    contentContainer: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

    section: { marginBottom: Spacing.xl, gap: Spacing.md },
    sectionTitle: { fontSize: FontSize.base, fontFamily: Fonts.bold, color: Colors.textDark },

    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: Spacing.md,
        height: 44,
        gap: Spacing.sm,
    },
    searchInput: { flex: 1, fontSize: FontSize.sm, fontFamily: Fonts.regular, color: Colors.textDark },

    packageCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: Radius.lg,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        alignItems: 'center',
        gap: Spacing.md,
    },
    packageCardSelected: { backgroundColor: '#F0FDF4', borderColor: Colors.primary },
    packageIcon: {
        width: 50,
        height: 50,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    packageInfo: { flex: 1 },
    packageName: { fontSize: FontSize.sm, fontFamily: Fonts.bold, color: Colors.textDark, marginBottom: 4 },
    packageType: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 6 },
    fastingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3E2',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        gap: 4,
        alignSelf: 'flex-start',
    },
    fastingText: { fontSize: FontSize.xs, color: '#EA580C', fontFamily: Fonts.semiBold },
    packagePrice: { alignItems: 'flex-end' },
    discountedPrice: { fontSize: FontSize.base, fontFamily: Fonts.bold, color: Colors.primary },
    originalPrice: { fontSize: FontSize.xs, color: Colors.textMuted, textDecorationLine: 'line-through' },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    addressButton: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: Radius.lg,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        padding: Spacing.md,
        alignItems: 'center',
        gap: Spacing.md,
    },
    addressButtonGreen: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
    addressButtonText: { flex: 1 },
    addressButtonLabel: { fontSize: FontSize.sm, fontFamily: Fonts.semiBold, color: Colors.textDark },
    addressButtonSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
    statusBadge: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Radius.md,
        alignItems: 'center',
    },

    dateScroll: { gap: Spacing.sm },
    dateButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.lg,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: 'white',
        alignItems: 'center',
        gap: 4,
    },
    dateButtonSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    dateDay: { fontSize: FontSize.xs, fontFamily: Fonts.semiBold, color: Colors.textMuted },
    dateNumber: { fontSize: FontSize.sm, fontFamily: Fonts.bold, color: Colors.textDark },

    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    slotButton: {
        flex: 0.48,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    slotButtonSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    slotTime: { fontSize: FontSize.xs, fontFamily: Fonts.semiBold, color: Colors.textDark },
    noSlotsText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.lg },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: 'white', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '80%' },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle: { fontSize: FontSize.base, fontFamily: Fonts.bold, color: Colors.textDark },

    addressOption: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        gap: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    addressOptionSelected: { backgroundColor: '#F0FDF4' },
    addressOptionText: { flex: 1 },
    addressOptionLabel: { fontSize: FontSize.sm, fontFamily: Fonts.bold, color: Colors.textDark },
    addressOptionSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    footerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    footerLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: Fonts.regular },
    footerPackage: { fontSize: FontSize.sm, fontFamily: Fonts.bold, color: Colors.textDark, marginBottom: 2, maxWidth: 200 },
    footerDateTime: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: Fonts.regular },
    bookButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.lg,
        alignItems: 'center',
        gap: Spacing.xs,
    },
    bookButtonDisabled: { opacity: 0.5 },
    bookButtonText: { color: 'white', fontSize: FontSize.sm, fontFamily: Fonts.bold },
});

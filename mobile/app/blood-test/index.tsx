import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePickerInput from '@/components/common/DateTimePickerInput';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { labService } from '@/services/api/labService';
import type { LabPackage, LabSlot } from '@/services/api/labService';

export default function BloodTestScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // Services
    const { cityId, serviceId, address, isLoading: isLoadingInit } = useServiceInitialization('blood-test');
    
    // Data State
    const [packages, setPackages] = useState<LabPackage[]>([]);
    const [slots, setSlots] = useState<LabSlot[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Selection State
    const [selectedPackage, setSelectedPackage] = useState<LabPackage | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedSlot, setSelectedSlot] = useState<LabSlot | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchSlots(selectedDate.toISOString().split('T')[0]);
        }
    }, [selectedDate]);

    const fetchInitialData = async () => {
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

    const fetchSlots = async (date: string) => {
        try {
            const res = await labService.getTimeSlots(date);
            setSlots(res || []);
        } catch (error) {
            console.error('Fetch slots failed:', error);
        }
    };

    const handleConfirmBooking = async () => {
        if (!selectedPackage || !selectedSlot || !selectedDate) {
            Alert.alert('Incomplete', 'Please select a test and time slot.');
            return;
        }

        // Fasting Check
        if (selectedPackage.fasting) {
            Alert.alert(
                t('blood_test.fasting_required') || 'Fasting Required',
                t('blood_test.fasting_message') || 'This test requires 10-12 hours of fasting. Do not consume anything but water.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'I Understand', onPress: () => proceedToCheckout() }
                ]
            );
        } else {
            proceedToCheckout();
        }
    };

    const proceedToCheckout = () => {
        const subtotal = selectedPackage?.discounted_cost || selectedPackage?.cost || 0;
        const total = (subtotal * 1.18) + 50;
        
        const bookingPayload = JSON.stringify({
            serviceId,
            cityId,
            scheduledDate: selectedDate?.toISOString(),
            addressLine: address || 'Current Location',
            formDataJson: {
                package_code: selectedPackage?.code,
                packageName: selectedPackage?.name,
                slotId: selectedSlot?.slot_id,
                slotTime: selectedSlot?.slot,
                fasting: selectedPackage?.fasting,
                priceBreakdown: {
                    package: subtotal,
                    taxes: subtotal * 0.18,
                    serviceFee: 50
                }
            },
        });

        router.push({
            pathname: '/payment/checkout',
            params: { 
                bookingPayload, 
                amount: String(total), 
                label: selectedPackage?.name || 'Lab Test' 
            },
        });
    };

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: '#024D28', height: insets.top }} />
            <StatusBar style="light" />

            <View style={styles.container}>
                {/* ─── Header ─── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Diagnostic Labs</Text>
                        <Text style={styles.headerSubtitle}>Hospital-grade tests at home</Text>
                    </View>
                </View>

                <KeyboardAwareScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    enableOnAndroid 
                    extraScrollHeight={80}
                >
                    {/* ─── Test Selection Ribbons ─── */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>Select Test Package</Text>
                            {selectedPackage?.fasting && (
                                <View style={styles.fastingBadge}>
                                    <Ionicons name="time-outline" size={10} color="#B45309" />
                                    <Text style={styles.fastingText}>FASTING</Text>
                                </View>
                            )}
                        </View>
                        
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ribbon}>
                            {loading ? (
                                <ActivityIndicator color="#02743F" style={{ marginLeft: 20 }} />
                            ) : packages.map(pkg => (
                                <TouchableOpacity 
                                    key={pkg.code}
                                    style={[
                                        styles.packageCard, 
                                        selectedPackage?.code === pkg.code && styles.packageCardSelected
                                    ]}
                                    onPress={() => setSelectedPackage(pkg)}
                                >
                                    <Text style={[styles.packageName, selectedPackage?.code === pkg.code && styles.textWhite]}>
                                        {pkg.name}
                                    </Text>
                                    <View style={styles.priceRow}>
                                        <Text style={[styles.packagePrice, selectedPackage?.code === pkg.code && styles.textWhite]}>
                                            ₹{pkg.discounted_cost || pkg.cost}
                                        </Text>
                                        {(pkg.discounted_cost ?? 0) < (pkg.cost ?? 0) && (
                                            <Text style={styles.oldPrice}>₹{pkg.cost}</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* ─── Schedule ─── */}
                    <View style={styles.card}>
                        <DateTimePickerInput
                            label="Collection Date"
                            onDateChange={(d) => setSelectedDate(d)}
                        />
                        
                        {selectedDate && (
                            <View style={styles.slotWrapper}>
                                <Text style={styles.miniLabel}>Available Slots</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotRibbon}>
                                    {slots.length === 0 ? (
                                        <Text style={styles.emptySlots}>No slots for this date</Text>
                                    ) : slots.map(s => (
                                        <TouchableOpacity 
                                            key={s.slot_id}
                                            style={[
                                                styles.slotCard, 
                                                selectedSlot?.slot_id === s.slot_id && styles.slotCardSelected
                                            ]}
                                            onPress={() => setSelectedSlot(s)}
                                        >
                                            <Text style={[styles.slotText, selectedSlot?.slot_id === s.slot_id && styles.textWhite]}>
                                                {s.slot.split(' - ')[0]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* ─── Logistics ─── */}
                    <View style={styles.card}>
                        <Text style={styles.miniLabel}>Collection Address</Text>
                        <View style={styles.addressBox}>
                            <Ionicons name="location-sharp" size={18} color="#02743F" />
                            <Text style={styles.addressText} numberOfLines={2}>{address || 'Select address in profile'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Ionicons name="shield-checkmark" size={20} color="#02743F" />
                        <Text style={styles.infoText}>Partnered with NABL Certified Redcliffe Labs</Text>
                    </View>

                </KeyboardAwareScrollView>

                {/* ─── Footer Action ─── */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    <View>
                        <Text style={styles.totalLabel}>Total Payable</Text>
                        <Text style={styles.totalAmount}>
                            ₹{Math.round((selectedPackage?.discounted_cost || selectedPackage?.cost || 0) * 1.18 + 50)}
                        </Text>
                        <Text style={styles.infoText}>Incl. GST & Fees</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.payButton, (isBooking || !selectedSlot) && { opacity: 0.5 }]}
                        onPress={handleConfirmBooking}
                        disabled={isBooking || !selectedSlot}
                    >
                        <Text style={styles.payButtonText}>Confirm & Pay</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FDFDE8', 
    },
    container: {
        flex: 1,
    },
    /* ─── Header ─── */
    header: {
        backgroundColor: '#024D28',
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontSize: 24,
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
    },
    scrollContent: {
        paddingTop: 24,
        paddingBottom: 120,
    },
    /* ─── Sections ─── */
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: Platform.select({ ios: 'LexendDeca-Bold', android: 'LexendDeca_700Bold', default: 'System' }),
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 24,
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    /* ─── Packages ─── */
    ribbon: {
        paddingLeft: 24,
    },
    packageCard: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 20,
        marginRight: 12,
        minWidth: 160,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    packageCardSelected: {
        backgroundColor: '#02743F',
        borderColor: '#02743F',
    },
    packageName: {
        fontSize: 14,
        fontFamily: Platform.select({ ios: 'LexendDeca-Bold', android: 'LexendDeca_700Bold', default: 'System' }),
        color: '#374151',
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    packagePrice: {
        fontSize: 16,
        fontFamily: Platform.select({ ios: 'LexendDeca-Bold', android: 'LexendDeca_700Bold', default: 'System' }),
        color: '#02743F',
    },
    oldPrice: {
        fontSize: 11,
        color: '#9CA3AF',
        textDecorationLine: 'underline',
    },
    textWhite: {
        color: '#FFFFFF',
    },
    /* ─── Slots ─── */
    slotWrapper: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    miniLabel: {
        fontSize: 10,
        fontFamily: Platform.select({ ios: 'LexendDeca-Bold', android: 'LexendDeca_700Bold', default: 'System' }),
        color: '#9CA3AF',
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    slotRibbon: {
        marginHorizontal: -5,
    },
    slotCard: {
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    slotCardSelected: {
        backgroundColor: '#02743F',
        borderColor: '#02743F',
    },
    slotText: {
        fontSize: 12,
        fontFamily: Platform.select({ ios: 'LexendDeca-Bold', android: 'LexendDeca_700Bold', default: 'System' }),
        color: '#6B7280',
    },
    /* ─── Address ─── */
    addressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 14,
    },
    addressText: {
        fontSize: 13,
        color: '#4B5563',
        flex: 1,
        lineHeight: 18,
    },
    /* ─── Badge ─── */
    fastingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    fastingText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#B45309',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    infoText: {
        fontSize: 11,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    emptySlots: {
        fontSize: 12,
        color: '#9CA3AF',
        paddingVertical: 10,
    },
    /* ─── Footer ─── */
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingTop: 20,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    totalLabel: {
        fontSize: 10,
        fontFamily: Platform.select({ ios: 'LexendDeca-Bold', android: 'LexendDeca_700Bold', default: 'System' }),
        color: '#9CA3AF',
        textTransform: 'uppercase',
    },
    totalAmount: {
        fontSize: 22,
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        color: '#111827',
    },
    payButton: {
        backgroundColor: '#024D28',
        paddingHorizontal: 24,
        height: 54,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#024D28',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    payButtonText: {
        fontSize: 15,
        fontFamily: Platform.select({ ios: 'LexendDeca-Bold', android: 'LexendDeca_700Bold', default: 'System' }),
        color: '#FFFFFF',
    },
});

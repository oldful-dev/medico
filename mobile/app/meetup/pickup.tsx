import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing } from '@/constants/theme';
import { AddressPickerSection, AddressData } from '@/components/AddressPickerSection';

const PRIMARY = '#02743F';

const TIME_OPTIONS = [
    '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
    '08:00 AM', '08:30 AM', '09:00 AM',
];

export default function MeetupPickupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<any>();

    const [pickupEnabled, setPickupEnabled] = useState(true);
    const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
    const [alternateContact, setAlternateContact] = useState('');
    const [preferredTime, setPreferredTime] = useState('');
    const [showTimePicker, setShowTimePicker] = useState(false);

    const handleSave = () => {
        if (pickupEnabled) {
            if (!selectedAddress) { Alert.alert('Required', 'Please select pickup address'); return; }
            if (!preferredTime) { Alert.alert('Required', 'Please select preferred pickup time'); return; }
        }

        const serviceCharge = params.meetupServiceCharge ? parseFloat(params.meetupServiceCharge) : 299;

        let assistanceJson: Record<string, boolean> | undefined;
        try {
            assistanceJson = params.assistanceJson ? JSON.parse(params.assistanceJson) : undefined;
        } catch {
            assistanceJson = undefined;
        }

        const registrationPayload = {
            fullName: params.fullName,
            mobile: params.mobile,
            age: params.age,
            gender: params.gender,
            assistanceJson,
            specialNotes: params.specialNotes,
            pickupEnabled: pickupEnabled ? 'true' : 'false',
            pickupAddress: selectedAddress ? `${selectedAddress.line1}${selectedAddress.line2 ? ', ' + selectedAddress.line2 : ''}` : '',
            pickupLandmark: selectedAddress?.landmark || '',
            pickupContact: alternateContact,
            preferredPickupTime: preferredTime,
        };

        router.push({
            pathname: '/service-checkout',
            params: {
                bookingPayload: JSON.stringify(registrationPayload),
                amount: String(serviceCharge),
                label: 'Local Meetup',
                meetupId: params.id,
                meetupParams: JSON.stringify(params),
                pickupAddress: selectedAddress ? `${selectedAddress.line1}${selectedAddress.line2 ? ', ' + selectedAddress.line2 : ''}` : '',
            },
        } as any);
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={PRIMARY} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pickup Support Details</Text>
                <View style={{ width: 30 }} />
            </View>

            {/* Step indicator */}
            <View style={styles.stepBar}>
                {['Registration', 'Pickup', 'Checkout'].map((step, i) => (
                    <React.Fragment key={step}>
                        <View style={styles.stepItem}>
                            <View style={[styles.stepDot, i <= 1 && styles.stepDotActive]}>
                                {i < 1
                                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                                    : i === 1
                                        ? <Ionicons name="car-outline" size={11} color="#fff" />
                                        : <Ionicons name="card-outline" size={11} color={i <= 1 ? '#fff' : 'rgba(255,255,255,0.6)'} />
                                }
                            </View>
                            <Text style={[styles.stepLabel, i <= 1 && styles.stepLabelActive]}>{step}</Text>
                        </View>
                        {i < 2 && <View style={[styles.stepLine, i < 1 && styles.stepLineActive]} />}
                    </React.Fragment>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                {/* Toggle */}
                <View style={styles.section}>
                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleTitle}>Pickup Support Required</Text>
                            <Text style={styles.toggleSub}>Enable to provide pickup details</Text>
                        </View>
                        <Switch
                            value={pickupEnabled}
                            onValueChange={setPickupEnabled}
                            trackColor={{ false: Colors.borderLight, true: '#86EFAC' }}
                            thumbColor={pickupEnabled ? PRIMARY : '#fff'}
                        />
                    </View>
                </View>

                {pickupEnabled && (
                    <>
                        <AddressPickerSection
                            selectedAddress={selectedAddress}
                            onAddressChange={setSelectedAddress}
                            title="Pickup Address"
                            showPhoneField={false}
                            showLandmarkField={true}
                            landmark={selectedAddress?.landmark || ''}
                            onLandmarkChange={(newLandmark) => {
                                if (selectedAddress) {
                                    setSelectedAddress({ ...selectedAddress, landmark: newLandmark });
                                }
                            }}
                            allowManualEntry={true}
                        />

                        <View style={styles.section}>
                            <Text style={styles.fieldLabel}>Landmark (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter landmark"
                                placeholderTextColor={Colors.textLight}
                                value={selectedAddress?.landmark || ''}
                                onChangeText={(newLandmark) => {
                                    if (selectedAddress) {
                                        setSelectedAddress({ ...selectedAddress, landmark: newLandmark });
                                    }
                                }}
                            />

                            {selectedAddress?.pincode && (
                                <>
                                    <Text style={styles.fieldLabel}>PIN Code</Text>
                                    <View style={[styles.input, styles.readOnlyInput]}>
                                        <Text style={styles.readOnlyText}>{selectedAddress.pincode}</Text>
                                    </View>
                                </>
                            )}

                            <Text style={styles.fieldLabel}>Alternate Contact Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter alternate number"
                                placeholderTextColor={Colors.textLight}
                                value={alternateContact}
                                onChangeText={setAlternateContact}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                            <Text style={styles.fieldLabel}>Preferred Pickup Time <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={[styles.input, styles.selectInput]}
                                onPress={() => setShowTimePicker(!showTimePicker)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.selectText, !preferredTime && styles.placeholderText]}>
                                    {preferredTime || 'Select time'}
                                </Text>
                                <Ionicons name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                            </TouchableOpacity>

                            {showTimePicker && (
                                <View style={styles.timePicker}>
                                    {TIME_OPTIONS.map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[styles.timeOption, preferredTime === t && styles.timeOptionActive]}
                                            onPress={() => { setPreferredTime(t); setShowTimePicker(false); }}
                                        >
                                            <Ionicons name="time-outline" size={14} color={preferredTime === t ? '#fff' : Colors.textMuted} />
                                            <Text style={[styles.timeText, preferredTime === t && styles.timeTextActive]}>{t}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={16} color={PRIMARY} />
                            <Text style={styles.infoText}>
                                Our team will arrange pickup from the given address. Additional transportation charges may apply.
                            </Text>
                        </View>
                    </>
                )}

                {!pickupEnabled && (
                    <View style={styles.skippedBox}>
                        <Ionicons name="walk-outline" size={32} color={Colors.textMuted} />
                        <Text style={styles.skippedTitle}>No Pickup Required</Text>
                        <Text style={styles.skippedSub}>You'll arrange your own transportation to the venue.</Text>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                    <Text style={styles.saveBtnText}>Save & Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F5FAF7' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: PRIMARY, paddingHorizontal: Spacing.lg, paddingVertical: 14,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: '#fff' },
    stepBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: PRIMARY, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 4,
    },
    stepItem: { alignItems: 'center', gap: 4 },
    stepDot: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center',
    },
    stepDotActive: { backgroundColor: Colors.accent },
    stepNum: { fontFamily: Fonts.semiBold, fontSize: 10, color: 'rgba(255,255,255,0.6)' },
    stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
    stepLineActive: { backgroundColor: Colors.accent },
    stepLabel: { fontFamily: Fonts.regular, fontSize: 9, color: 'rgba(255,255,255,0.5)' },
    stepLabelActive: { color: '#fff', fontFamily: Fonts.semiBold },
    scrollContent: { padding: Spacing.lg },
    section: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark },
    toggleSub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    fieldLabel: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textBody, marginBottom: 8, marginTop: 16 },
    required: { color: '#DC2626' },
    input: {
        backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: Colors.borderLight,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark,
    },
    textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
    readOnlyInput: { backgroundColor: '#F0FDF4', borderColor: PRIMARY },
    readOnlyText: { fontFamily: Fonts.semiBold, fontSize: 14, color: PRIMARY },
    selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark },
    placeholderText: { color: Colors.textLight },
    timePicker: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.borderLight,
        borderRadius: 10, marginTop: 4, overflow: 'hidden',
    },
    timeOption: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    timeOptionActive: { backgroundColor: PRIMARY },
    timeText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBody },
    timeTextActive: { fontFamily: Fonts.semiBold, color: '#fff' },
    infoBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: '#EDF7F1', borderRadius: 12, padding: 14, marginBottom: 8,
        borderLeftWidth: 3, borderLeftColor: PRIMARY,
    },
    infoText: { fontFamily: Fonts.regular, fontSize: 12, color: PRIMARY, flex: 1, lineHeight: 18 },
    skippedBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    skippedTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark },
    skippedSub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
    footer: {
        backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: Colors.borderLight,
    },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15,
    },
    saveBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' },
});

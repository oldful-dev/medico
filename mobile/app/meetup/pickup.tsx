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
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { AddressPickerSection, AddressData } from '@/components/AddressPickerSection';

const PRIMARY = '#02743F';

const TIME_OPTIONS = [
    '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
    '08:00 AM', '08:30 AM', '09:00 AM',
];

export default function MeetupPickupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const params = useLocalSearchParams<any>();

    React.useEffect(() => {
        console.log('🚗 [MEETUP PICKUP] Screen loaded with params:', params);
    }, []);

    const [pickupEnabled, setPickupEnabled] = useState(true);
    const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
    const [alternateContact, setAlternateContact] = useState('');
    const [preferredTime, setPreferredTime] = useState('');
    const [showTimePicker, setShowTimePicker] = useState(false);

    const handleSave = () => {
        console.log('🚗 [MEETUP PICKUP] handleSave called, pickupEnabled:', pickupEnabled);
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

        console.log('💳 [MEETUP PICKUP] Navigating to /service-checkout with payload:', registrationPayload);
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
        console.log('💳 [MEETUP PICKUP] Router.push called for /service-checkout');
    };

    return (
        <View style={[makeStyles(isDarkMode, colors).screen, { paddingTop: insets.top }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={PRIMARY} />

            {/* Header */}
            <View style={makeStyles(isDarkMode, colors).header}>
                <TouchableOpacity onPress={() => router.back()} style={makeStyles(isDarkMode, colors).backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={makeStyles(isDarkMode, colors).headerTitle}>Pickup Support Details</Text>
                <View style={{ width: 30 }} />
            </View>

            {/* Step indicator */}
            <View style={makeStyles(isDarkMode, colors).stepBar}>
                {['Registration', 'Pickup', 'Checkout'].map((step, i) => (
                    <React.Fragment key={step}>
                        <View style={makeStyles(isDarkMode, colors).stepItem}>
                            <View style={[makeStyles(isDarkMode, colors).stepDot, i <= 1 && styles.stepDotActive]}>
                                {i < 1
                                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                                    : i === 1
                                        ? <Ionicons name="car-outline" size={11} color="#fff" />
                                        : <Ionicons name="card-outline" size={11} color={i <= 1 ? '#fff' : 'rgba(255,255,255,0.6)'} />
                                }
                            </View>
                            <Text style={[makeStyles(isDarkMode, colors).stepLabel, i <= 1 && styles.stepLabelActive]}>{step}</Text>
                        </View>
                        {i < 2 && <View style={[makeStyles(isDarkMode, colors).stepLine, i < 1 && styles.stepLineActive]} />}
                    </React.Fragment>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                {/* Toggle */}
                <View style={makeStyles(isDarkMode, colors).section}>
                    <View style={makeStyles(isDarkMode, colors).toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={makeStyles(isDarkMode, colors).toggleTitle}>Pickup Support Required</Text>
                            <Text style={makeStyles(isDarkMode, colors).toggleSub}>Enable to provide pickup details</Text>
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

                        <View style={makeStyles(isDarkMode, colors).section}>
                            <Text style={makeStyles(isDarkMode, colors).fieldLabel}>Landmark (Optional)</Text>
                            <TextInput
                                style={makeStyles(isDarkMode, colors).input}
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
                                    <Text style={makeStyles(isDarkMode, colors).fieldLabel}>PIN Code</Text>
                                    <View style={[makeStyles(isDarkMode, colors).input, styles.readOnlyInput]}>
                                        <Text style={makeStyles(isDarkMode, colors).readOnlyText}>{selectedAddress.pincode}</Text>
                                    </View>
                                </>
                            )}

                            <Text style={makeStyles(isDarkMode, colors).fieldLabel}>Alternate Contact Number</Text>
                            <TextInput
                                style={makeStyles(isDarkMode, colors).input}
                                placeholder="Enter alternate number"
                                placeholderTextColor={Colors.textLight}
                                value={alternateContact}
                                onChangeText={setAlternateContact}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                            <Text style={makeStyles(isDarkMode, colors).fieldLabel}>Preferred Pickup Time <Text style={makeStyles(isDarkMode, colors).required}>*</Text></Text>
                            <TouchableOpacity
                                style={[makeStyles(isDarkMode, colors).input, styles.selectInput]}
                                onPress={() => setShowTimePicker(!showTimePicker)}
                                activeOpacity={0.7}
                            >
                                <Text style={[makeStyles(isDarkMode, colors).selectText, !preferredTime && styles.placeholderText]}>
                                    {preferredTime || 'Select time'}
                                </Text>
                                <Ionicons name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                            </TouchableOpacity>

                            {showTimePicker && (
                                <View style={makeStyles(isDarkMode, colors).timePicker}>
                                    {TIME_OPTIONS.map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[makeStyles(isDarkMode, colors).timeOption, preferredTime === t && styles.timeOptionActive]}
                                            onPress={() => { setPreferredTime(t); setShowTimePicker(false); }}
                                        >
                                            <Ionicons name="time-outline" size={14} color={preferredTime === t ? '#fff' : Colors.textMuted} />
                                            <Text style={[makeStyles(isDarkMode, colors).timeText, preferredTime === t && styles.timeTextActive]}>{t}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={makeStyles(isDarkMode, colors).infoBox}>
                            <Ionicons name="information-circle-outline" size={16} color={PRIMARY} />
                            <Text style={makeStyles(isDarkMode, colors).infoText}>
                                Our team will arrange pickup from the given address. Additional transportation charges may apply.
                            </Text>
                        </View>
                    </>
                )}

                {!pickupEnabled && (
                    <View style={makeStyles(isDarkMode, colors).skippedBox}>
                        <Ionicons name="walk-outline" size={32} color={Colors.textMuted} />
                        <Text style={makeStyles(isDarkMode, colors).skippedTitle}>No Pickup Required</Text>
                        <Text style={makeStyles(isDarkMode, colors).skippedSub}>You&apos;ll arrange your own transportation to the venue.</Text>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[makeStyles(isDarkMode, colors).footer, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity style={makeStyles(isDarkMode, colors).saveBtn} onPress={handleSave} activeOpacity={0.85}>
                    <Text style={makeStyles(isDarkMode, colors).saveBtnText}>Save & Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stepDotActive: { backgroundColor: Colors.accent },
    stepLabelActive: { color: '#fff', fontFamily: Fonts.semiBold },
    stepLineActive: { backgroundColor: Colors.accent },
    scrollContent: { padding: Spacing.lg },
    readOnlyInput: { backgroundColor: '#F0FDF4', borderColor: PRIMARY },
    selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    placeholderText: { color: Colors.textLight },
    timeOptionActive: { backgroundColor: PRIMARY },
    timeTextActive: { fontFamily: Fonts.semiBold, color: '#fff' },
});

const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F5FAF7' },
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
        backgroundColor: isDarkMode ? '#252525' : '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: isDarkMode ? '#FFFFFF' : Colors.textDark },
    toggleSub: { fontFamily: Fonts.regular, fontSize: 12, color: isDarkMode ? '#999999' : Colors.textMuted, marginTop: 2 },
    fieldLabel: { fontFamily: Fonts.semiBold, fontSize: 13, color: isDarkMode ? '#CCCCCC' : Colors.textBody, marginBottom: 8, marginTop: 16 },
    required: { color: '#DC2626' },
    input: {
        backgroundColor: isDarkMode ? '#3A3A3A' : '#F9FAFB', borderWidth: 1.5, borderColor: isDarkMode ? '#4A4A4A' : Colors.borderLight,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: Fonts.regular, fontSize: 14, color: isDarkMode ? '#FFFFFF' : Colors.textDark,
    },
    textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
    readOnlyInput: { backgroundColor: isDarkMode ? '#2A3A2A' : '#F0FDF4', borderColor: PRIMARY },
    readOnlyText: { fontFamily: Fonts.semiBold, fontSize: 14, color: PRIMARY },
    selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectText: { fontFamily: Fonts.regular, fontSize: 14, color: isDarkMode ? '#FFFFFF' : Colors.textDark },
    placeholderText: { color: isDarkMode ? '#666666' : Colors.textLight },
    timePicker: {
        backgroundColor: isDarkMode ? '#252525' : '#fff', borderWidth: 1, borderColor: isDarkMode ? '#3A3A3A' : Colors.borderLight,
        borderRadius: 10, marginTop: 4, overflow: 'hidden',
    },
    timeOption: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#3A3A3A' : '#F3F4F6',
    },
    timeOptionActive: { backgroundColor: PRIMARY },
    timeText: { fontFamily: Fonts.regular, fontSize: 14, color: isDarkMode ? '#CCCCCC' : Colors.textBody },
    timeTextActive: { fontFamily: Fonts.semiBold, color: '#fff' },
    infoBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: '#EDF7F1', borderRadius: 12, padding: 14, marginBottom: 8,
        borderLeftWidth: 3, borderLeftColor: PRIMARY,
    },
    infoText: { fontFamily: Fonts.regular, fontSize: 12, color: PRIMARY, flex: 1, lineHeight: 18 },
    skippedBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    skippedTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: isDarkMode ? '#FFFFFF' : Colors.textDark },
    skippedSub: { fontFamily: Fonts.regular, fontSize: 13, color: isDarkMode ? '#999999' : Colors.textMuted, textAlign: 'center' },
    footer: {
        backgroundColor: isDarkMode ? '#252525' : '#fff', paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: isDarkMode ? '#3A3A3A' : Colors.borderLight,
    },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15,
    },
    saveBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' },
});

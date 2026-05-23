import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useUser } from '@/context/UserContext';

const PRIMARY = '#02743F';

const ASSISTANCE_OPTIONS = [
    { key: 'walkingDifficulty',      label: 'Walking Difficulty' },
    { key: 'wheelchairRequired',     label: 'Wheelchair Required' },
    { key: 'hearingAssistance',      label: 'Hearing Assistance' },
    { key: 'visionAssistance',       label: 'Vision Assistance' },
    { key: 'requiresPickupSupport',  label: 'Requires Pickup Support' },
    { key: 'otherMedicalConcern',    label: 'Other Medical / Mobility Concern' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export default function MeetupRegisterScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        id,
        meetupEventDate,
        meetupStartTime,
        meetupEndTime,
        meetupVenue,
        meetupPinCode,
        meetupServiceCharge,
        includedItems: includedItemsStr,
        extraCharges: extraChargesStr,
    } = useLocalSearchParams<{
        id: string;
        meetupEventDate: string;
        meetupStartTime: string;
        meetupEndTime: string;
        meetupVenue: string;
        meetupPinCode: string;
        meetupServiceCharge: string;
        includedItems?: string;
        extraCharges?: string;
    }>();
    const { profile } = useUser();

    const [fullName, setFullName] = useState(profile?.name || '');
    const [mobile, setMobile] = useState(profile?.phone || '');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [assistance, setAssistance] = useState<Record<string, boolean>>({});
    const [specialNotes, setSpecialNotes] = useState('');

    const toggleAssistance = (key: string) =>
        setAssistance(prev => ({ ...prev, [key]: !prev[key] }));

    const handleContinue = () => {
        if (!fullName.trim()) { Alert.alert('Required', 'Please enter your full name'); return; }
        if (!mobile.trim() || mobile.length < 10) { Alert.alert('Required', 'Please enter a valid mobile number'); return; }
        if (!age.trim()) { Alert.alert('Required', 'Please enter your age'); return; }
        if (!gender) { Alert.alert('Required', 'Please select your gender'); return; }

        const params: any = {
            id,
            fullName,
            mobile,
            age,
            gender,
            assistanceJson: JSON.stringify(assistance),
            specialNotes,
            meetupEventDate,
            meetupStartTime,
            meetupEndTime,
            meetupVenue,
            meetupPinCode,
            meetupServiceCharge,
            includedItems: includedItemsStr,
            extraCharges: extraChargesStr,
        };

        if (assistance['requiresPickupSupport']) {
            router.push({ pathname: '/meetup/pickup', params } as any);
        } else {
            router.push({ pathname: '/service-checkout', params: {
                bookingPayload: JSON.stringify({
                    fullName,
                    mobile,
                    age,
                    gender,
                    assistanceJson: JSON.stringify(assistance),
                    specialNotes,
                    pickupEnabled: false,
                    pickupAddress: '',
                    pickupLandmark: '',
                    pickupContact: '',
                    preferredPickupTime: '',
                }),
                amount: meetupServiceCharge,
                label: 'Local Meetup',
                meetupId: id,
                meetupParams: JSON.stringify(params),
            } } as any);
        }
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={PRIMARY} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Join Local Meet Up</Text>
                <View style={{ width: 30 }} />
            </View>

            {/* Step indicator */}
            <View style={styles.stepBar}>
                {['Registration', 'Pickup', 'Checkout'].map((step, i) => (
                    <React.Fragment key={step}>
                        <View style={styles.stepItem}>
                            <View style={[styles.stepDot, i === 0 && styles.stepDotActive]}>
                                {i === 0
                                    ? <Ionicons name="create-outline" size={11} color="#fff" />
                                    : <Text style={styles.stepNum}>{i + 1}</Text>
                                }
                            </View>
                            <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>{step}</Text>
                        </View>
                        {i < 2 && <View style={styles.stepLine} />}
                    </React.Fragment>
                ))}
            </View>

            <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                {/* Personal Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Details</Text>

                    <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        placeholderTextColor={Colors.textLight}
                        value={fullName}
                        onChangeText={setFullName}
                    />

                    <Text style={styles.label}>Mobile Number <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter mobile number"
                        placeholderTextColor={Colors.textLight}
                        value={mobile}
                        onChangeText={setMobile}
                        keyboardType="phone-pad"
                        maxLength={10}
                    />

                    <Text style={styles.label}>Age <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your age"
                        placeholderTextColor={Colors.textLight}
                        value={age}
                        onChangeText={setAge}
                        keyboardType="numeric"
                        maxLength={3}
                    />

                    <Text style={styles.label}>Gender <Text style={styles.required}>*</Text></Text>
                    <View style={styles.genderRow}>
                        {GENDER_OPTIONS.map(g => (
                            <TouchableOpacity
                                key={g}
                                style={[styles.genderOption, gender === g && styles.genderOptionActive]}
                                onPress={() => setGender(g)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.radio, gender === g && styles.radioActive]}>
                                    {gender === g && <View style={styles.radioDot} />}
                                </View>
                                <Text style={[styles.genderLabel, gender === g && styles.genderLabelActive]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Health / Assistance */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Health / Assistance Information</Text>
                    <Text style={styles.sectionSub}>Select if applicable</Text>

                    {ASSISTANCE_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.key}
                            style={styles.checkRow}
                            onPress={() => toggleAssistance(opt.key)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, assistance[opt.key] && styles.checkboxActive]}>
                                {assistance[opt.key] && <Ionicons name="checkmark" size={13} color="#fff" />}
                            </View>
                            <Text style={[styles.checkLabel, assistance[opt.key] && styles.checkLabelActive]}>
                                {opt.label}
                            </Text>
                            {opt.key === 'requiresPickupSupport' && (
                                <View style={styles.pickupTag}>
                                    <Ionicons name="car-outline" size={11} color={PRIMARY} />
                                    <Text style={styles.pickupTagText}>Extra step</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Special Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Special Notes</Text>
                    <Text style={styles.sectionSub}>Any other information</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Write here..."
                        placeholderTextColor={Colors.textLight}
                        value={specialNotes}
                        onChangeText={setSpecialNotes}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {assistance['requiresPickupSupport'] && (
                    <View style={styles.pickupNotice}>
                        <Ionicons name="car-outline" size={18} color={PRIMARY} />
                        <Text style={styles.pickupNoticeText}>
                            You'll be asked for pickup details in the next step.
                        </Text>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </KeyboardAwareScrollView>

            {/* Continue button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
                    <Text style={styles.continueBtnText}>Continue</Text>
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
        backgroundColor: PRIMARY,
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
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
    stepLabel: { fontFamily: Fonts.regular, fontSize: 9, color: 'rgba(255,255,255,0.5)' },
    stepLabelActive: { color: '#fff', fontFamily: Fonts.semiBold },
    scrollContent: { padding: Spacing.lg, paddingBottom: 20 },
    section: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        marginBottom: 16, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textDark, marginBottom: 4 },
    sectionSub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, marginBottom: 14 },
    label: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textBody, marginBottom: 6, marginTop: 12 },
    required: { color: '#DC2626' },
    input: {
        backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: Colors.borderLight,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: Fonts.regular, fontSize: 14, color: Colors.textDark,
    },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
    genderRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    genderOption: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1.5, borderColor: Colors.borderLight, borderRadius: 10,
        padding: 10,
    },
    genderOptionActive: { borderColor: PRIMARY, backgroundColor: '#EDF7F1' },
    radio: {
        width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.borderLight,
        justifyContent: 'center', alignItems: 'center',
    },
    radioActive: { borderColor: PRIMARY },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
    genderLabel: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted },
    genderLabelActive: { fontFamily: Fonts.semiBold, color: PRIMARY },
    checkRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        borderColor: Colors.borderLight, justifyContent: 'center', alignItems: 'center',
    },
    checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
    checkLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: 13, color: Colors.textBody },
    checkLabelActive: { fontFamily: Fonts.semiBold, color: Colors.textDark },
    pickupTag: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#EDF7F1', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    },
    pickupTagText: { fontFamily: Fonts.semiBold, fontSize: 9, color: PRIMARY },
    pickupNotice: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#EDF7F1', borderRadius: 12, padding: 14, marginBottom: 8,
        borderLeftWidth: 3, borderLeftColor: PRIMARY,
    },
    pickupNoticeText: { fontFamily: Fonts.medium, fontSize: 13, color: PRIMARY, flex: 1 },
    footer: {
        backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: Colors.borderLight,
    },
    continueBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15,
    },
    continueBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' },
});

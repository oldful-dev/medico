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
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
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
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
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
        console.log('📋 [MEETUP REGISTER] handleContinue called');
        if (!fullName.trim()) { Alert.alert('Required', 'Please enter your full name'); return; }
        const phoneDigits = mobile.replace(/\D/g, '');
        if (!mobile.trim() || phoneDigits.length < 10) { Alert.alert('Required', 'Please enter a valid 10-digit mobile number'); return; }
        if (!age.trim()) { Alert.alert('Required', 'Please enter your age'); return; }
        if (!gender) { Alert.alert('Required', 'Please select your gender'); return; }

        const cleanMobile = phoneDigits.slice(-10);
        console.log('✅ [MEETUP REGISTER] Form validation passed');
        console.log('📦 [MEETUP REGISTER] requiresPickupSupport:', assistance['requiresPickupSupport']);

        const params: any = {
            id,
            fullName,
            mobile: cleanMobile,
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
            console.log('🚗 [MEETUP REGISTER] Navigating to /meetup/pickup with params:', params);
            router.push({
                pathname: '/meetup/pickup',
                params: {
                    id: id || '',
                    fullName,
                    mobile: cleanMobile,
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
                } as any,
            } as any);
            console.log('🚗 [MEETUP REGISTER] Router.push called for /meetup/pickup');
        } else {
            console.log('💳 [MEETUP REGISTER] Navigating to /service-checkout (no pickup)');
            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload: JSON.stringify({
                        fullName,
                        mobile: cleanMobile,
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
                } as any,
            } as any);
            console.log('💳 [MEETUP REGISTER] Router.push called for /service-checkout');
        }
    };

    return (
        <View style={[makeStyles(isDarkMode, colors).screen, { paddingTop: insets.top }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={PRIMARY} />

            {/* Header */}
            <View style={makeStyles(isDarkMode, colors).header}>
                <TouchableOpacity onPress={() => router.back()} style={makeStyles(isDarkMode, colors).backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={makeStyles(isDarkMode, colors).headerTitle}>Join Local Meet Up</Text>
                <View style={{ width: 30 }} />
            </View>

            {/* Step indicator */}
            <View style={makeStyles(isDarkMode, colors).stepBar}>
                {['Registration', 'Pickup', 'Checkout'].map((step, i) => (
                    <React.Fragment key={step}>
                        <View style={makeStyles(isDarkMode, colors).stepItem}>
                            <View style={[makeStyles(isDarkMode, colors).stepDot, i === 0 && styles.stepDotActive]}>
                                {i === 0
                                    ? <Ionicons name="create-outline" size={11} color="#fff" />
                                    : <Text style={makeStyles(isDarkMode, colors).stepNum}>{i + 1}</Text>
                                }
                            </View>
                            <Text style={[makeStyles(isDarkMode, colors).stepLabel, i === 0 && styles.stepLabelActive]}>{step}</Text>
                        </View>
                        {i < 2 && <View style={makeStyles(isDarkMode, colors).stepLine} />}
                    </React.Fragment>
                ))}
            </View>

            <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                {/* Personal Details */}
                <View style={makeStyles(isDarkMode, colors).section}>
                    <Text style={makeStyles(isDarkMode, colors).sectionTitle}>Personal Details</Text>

                    <Text style={makeStyles(isDarkMode, colors).label}>Full Name <Text style={makeStyles(isDarkMode, colors).required}>*</Text></Text>
                    <TextInput
                        style={makeStyles(isDarkMode, colors).input}
                        placeholder="Enter your full name"
                        placeholderTextColor={Colors.textLight}
                        value={fullName}
                        onChangeText={setFullName}
                    />

                    <Text style={makeStyles(isDarkMode, colors).label}>Mobile Number <Text style={makeStyles(isDarkMode, colors).required}>*</Text></Text>
                    <TextInput
                        style={makeStyles(isDarkMode, colors).input}
                        placeholder="Enter mobile number"
                        placeholderTextColor={Colors.textLight}
                        value={mobile}
                        onChangeText={setMobile}
                        keyboardType="phone-pad"
                        maxLength={13}
                    />

                    <Text style={makeStyles(isDarkMode, colors).label}>Age <Text style={makeStyles(isDarkMode, colors).required}>*</Text></Text>
                    <TextInput
                        style={makeStyles(isDarkMode, colors).input}
                        placeholder="Enter your age"
                        placeholderTextColor={Colors.textLight}
                        value={age}
                        onChangeText={setAge}
                        keyboardType="numeric"
                        maxLength={3}
                    />

                    <Text style={makeStyles(isDarkMode, colors).label}>Gender <Text style={makeStyles(isDarkMode, colors).required}>*</Text></Text>
                    <View style={makeStyles(isDarkMode, colors).genderRow}>
                        {GENDER_OPTIONS.map(g => (
                            <TouchableOpacity
                                key={g}
                                style={[makeStyles(isDarkMode, colors).genderOption, gender === g && styles.genderOptionActive]}
                                onPress={() => setGender(g)}
                                activeOpacity={0.8}
                            >
                                <View style={[makeStyles(isDarkMode, colors).radio, gender === g && styles.radioActive]}>
                                    {gender === g && <View style={makeStyles(isDarkMode, colors).radioDot} />}
                                </View>
                                <Text style={[makeStyles(isDarkMode, colors).genderLabel, gender === g && styles.genderLabelActive]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Health / Assistance */}
                <View style={makeStyles(isDarkMode, colors).section}>
                    <Text style={makeStyles(isDarkMode, colors).sectionTitle}>Health / Assistance Information</Text>
                    <Text style={makeStyles(isDarkMode, colors).sectionSub}>Select if applicable</Text>

                    {ASSISTANCE_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.key}
                            style={makeStyles(isDarkMode, colors).checkRow}
                            onPress={() => toggleAssistance(opt.key)}
                            activeOpacity={0.7}
                        >
                            <View style={[makeStyles(isDarkMode, colors).checkbox, assistance[opt.key] && styles.checkboxActive]}>
                                {assistance[opt.key] && <Ionicons name="checkmark" size={13} color="#fff" />}
                            </View>
                            <Text style={[makeStyles(isDarkMode, colors).checkLabel, assistance[opt.key] && styles.checkLabelActive]}>
                                {opt.label}
                            </Text>
                            {opt.key === 'requiresPickupSupport' && (
                                <View style={makeStyles(isDarkMode, colors).pickupTag}>
                                    <Ionicons name="car-outline" size={11} color={PRIMARY} />
                                    <Text style={makeStyles(isDarkMode, colors).pickupTagText}>Extra step</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Special Notes */}
                <View style={makeStyles(isDarkMode, colors).section}>
                    <Text style={makeStyles(isDarkMode, colors).sectionTitle}>Special Notes</Text>
                    <Text style={makeStyles(isDarkMode, colors).sectionSub}>Any other information</Text>
                    <TextInput
                        style={[makeStyles(isDarkMode, colors).input, styles.textArea]}
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
                    <View style={makeStyles(isDarkMode, colors).pickupNotice}>
                        <Ionicons name="car-outline" size={18} color={PRIMARY} />
                        <Text style={makeStyles(isDarkMode, colors).pickupNoticeText}>
                            You&apos;ll be asked for pickup details in the next step.
                        </Text>
                    </View>
                )}

                <View style={{ height: 20 }} />
            </KeyboardAwareScrollView>

            {/* Continue button */}
            <View style={[makeStyles(isDarkMode, colors).footer, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity style={makeStyles(isDarkMode, colors).continueBtn} onPress={handleContinue} activeOpacity={0.85}>
                    <Text style={makeStyles(isDarkMode, colors).continueBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stepDotActive: { backgroundColor: Colors.accent },
    stepLabelActive: { color: '#fff', fontFamily: Fonts.semiBold },
    scrollContent: { padding: Spacing.lg, paddingBottom: 20 },
    genderOptionActive: { borderColor: PRIMARY, backgroundColor: '#EDF7F1' },
    radioActive: { borderColor: PRIMARY },
    genderLabelActive: { fontFamily: Fonts.semiBold, color: PRIMARY },
    checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
    checkLabelActive: { fontFamily: Fonts.semiBold, color: '#2F2F2F' },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
});

const makeStyles = (isDarkMode: boolean, colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F5FAF7' },
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
        backgroundColor: isDarkMode ? '#252525' : '#fff', borderRadius: 16, padding: 16,
        marginBottom: 16, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 15, color: isDarkMode ? '#FFFFFF' : Colors.textDark, marginBottom: 4 },
    sectionSub: { fontFamily: Fonts.regular, fontSize: 12, color: isDarkMode ? '#999999' : Colors.textMuted, marginBottom: 14 },
    label: { fontFamily: Fonts.semiBold, fontSize: 13, color: isDarkMode ? '#CCCCCC' : Colors.textBody, marginBottom: 6, marginTop: 12 },
    required: { color: '#DC2626' },
    input: {
        backgroundColor: isDarkMode ? '#3A3A3A' : '#F9FAFB', borderWidth: 1.5, borderColor: isDarkMode ? '#4A4A4A' : Colors.borderLight,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: Fonts.regular, fontSize: 14, color: isDarkMode ? '#FFFFFF' : Colors.textDark,
    },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
    genderRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    genderOption: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1.5, borderColor: isDarkMode ? '#4A4A4A' : Colors.borderLight, borderRadius: 10,
        padding: 10,
    },
    genderOptionActive: { borderColor: PRIMARY, backgroundColor: '#EDF7F1' },
    radio: {
        width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: isDarkMode ? '#4A4A4A' : Colors.borderLight,
        justifyContent: 'center', alignItems: 'center',
    },
    radioActive: { borderColor: PRIMARY },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
    genderLabel: { fontFamily: Fonts.regular, fontSize: 13, color: isDarkMode ? '#999999' : Colors.textMuted },
    genderLabelActive: { fontFamily: Fonts.semiBold, color: PRIMARY },
    checkRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#3A3A3A' : '#F3F4F6',
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        borderColor: isDarkMode ? '#4A4A4A' : Colors.borderLight, justifyContent: 'center', alignItems: 'center',
    },
    checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
    checkLabel: { flex: 1, fontFamily: Fonts.regular, fontSize: 13, color: isDarkMode ? '#CCCCCC' : Colors.textBody },
    checkLabelActive: { fontFamily: Fonts.semiBold, color: isDarkMode ? '#FFFFFF' : Colors.textDark },
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
        backgroundColor: isDarkMode ? '#252525' : '#fff', paddingHorizontal: 20, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: isDarkMode ? '#3A3A3A' : Colors.borderLight,
    },
    continueBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15,
    },
    continueBtnText: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#fff' },
});

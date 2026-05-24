import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    FlatList,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { useThemeColors } from '@/hooks/use-theme-colors';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { bookingService } from '@/services/api/bookingService';

const PRIMARY = '#02743F';
const PRIMARY_LIGHT = '#E8F5E9';
const PRIMARY_MID = '#03924F';
const TEXT_DARK = '#1A1A1A';
const TEXT_MUTED = '#9CA3AF';
const TEXT_LABEL = '#374151';
const BG = '#F8FAF9';
const RED = '#EF4444';

const purposes = [
    { id: '1', label: 'Leisure / Vacation',  icon: 'sunny-outline' },
    { id: '2', label: 'Business Travel',      icon: 'briefcase-outline' },
    { id: '3', label: 'Family Getaway',       icon: 'people-outline' },
    { id: '4', label: 'Adventure Trip',       icon: 'bicycle-outline' },
    { id: '5', label: 'Wellness Retreat',     icon: 'flower-outline' },
    { id: '6', label: 'Cultural Tour',        icon: 'earth-outline' },
    { id: '7', label: 'Other',                icon: 'ellipsis-horizontal-circle-outline' },
];

const travellerCounts = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

export default function TripTravelsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { dark: isDarkMode } = useTheme();
    const colors = useThemeColors();

    const BORDER = isDarkMode ? '#3A3A3A' : '#E5E7EB';
    const WHITE = isDarkMode ? '#1A1A1A' : '#FFFFFF';

    const [destination, setDestination]             = useState('');
    const [travelDates, setTravelDates]             = useState<Date | undefined>(undefined);
    const [numTravellers, setNumTravellers]         = useState('');
    const [purposeOfTravel, setPurposeOfTravel]     = useState('');
    const [specialRequirements, setSpecialRequirements] = useState('');
    const [additionalDetails, setAdditionalDetails] = useState('');
    const [isBooking, setIsBooking]                 = useState(false);

    const [showDatePicker, setShowDatePicker]         = useState(false);
    const [showTravellerPicker, setShowTravellerPicker] = useState(false);
    const [showPurposePicker, setShowPurposePicker]   = useState(false);

    const { cityId, serviceId, isLoading: isLoadingInit } = useServiceInitialization('trip-travels');

    const formattedDate = travelDates
        ? travelDates.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    const selectedPurpose = purposes.find(p => p.label === purposeOfTravel);

    const handleSubmit = async () => {
        if (!destination.trim())  { Alert.alert('Required', 'Please enter your destination'); return; }
        if (!travelDates)         { Alert.alert('Required', 'Please select travel dates'); return; }
        if (!numTravellers)       { Alert.alert('Required', 'Please select number of travellers'); return; }
        if (!purposeOfTravel)     { Alert.alert('Required', 'Please select purpose of travel'); return; }
        if (!cityId || !serviceId) { Alert.alert('Error', 'Service initialization incomplete.'); return; }

        try {
            setIsBooking(true);
            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: travelDates.toISOString(),
                addressLine: destination,
                formDataJson: {
                    type: 'TRIP',
                    destination,
                    travelDates: formattedDate,
                    numTravellers: parseInt(numTravellers),
                    purposeOfTravel,
                    specialRequirements: specialRequirements.trim() || null,
                    additionalDetails: additionalDetails.trim() || null,
                },
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert('Booking Failed', res.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Trip booking error:', error);
            Alert.alert('Error', 'Failed to submit inquiry. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={[dynamicStyles.container, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor={PRIMARY} />

            {/* ── Green Header ── */}
            <View style={dynamicStyles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={dynamicStyles.backBtn}
                >
                    <Ionicons name="arrow-back" size={22} color={WHITE} />
                </TouchableOpacity>
                <Text style={dynamicStyles.headerTitle}>Trip & Travel</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* ── Hero Banner (still part of green area) ── */}
            <View style={dynamicStyles.heroBanner}>
                <View style={dynamicStyles.heroIconCircle}>
                    <Ionicons name="airplane" size={32} color={PRIMARY} />
                </View>
                <Text style={dynamicStyles.heroTitle}>Where do you want to go?</Text>
                <Text style={dynamicStyles.heroSubtitle}>
                    Share your travel plan and we&apos;ll assist you better.
                </Text>
            </View>

            {/* ── Scrollable Form Card ── */}
            <KeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={dynamicStyles.scrollContent}
                enableOnAndroid
                extraScrollHeight={24}
                keyboardShouldPersistTaps="handled"
            >
                <View style={dynamicStyles.formCard}>

                    {/* Destination */}
                    <FormField label="Destination (Preferred)" required>
                        <View style={dynamicStyles.inputRow}>
                            <Ionicons name="location-outline" size={18} color={PRIMARY} style={dynamicStyles.inputIcon} />
                            <TextInput
                                style={dynamicStyles.inputText}
                                placeholder="Enter destination"
                                placeholderTextColor={TEXT_MUTED}
                                value={destination}
                                onChangeText={setDestination}
                                editable={!isLoadingInit}
                                returnKeyType="next"
                            />
                        </View>
                    </FormField>

                    {/* Travel Dates */}
                    <FormField label="Travel Dates" required>
                        <TouchableOpacity
                            style={dynamicStyles.inputRow}
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar-outline" size={18} color={PRIMARY} style={dynamicStyles.inputIcon} />
                            <Text style={[dynamicStyles.inputText, !formattedDate && dynamicStyles.placeholder]}>
                                {formattedDate || 'Select travel dates'}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
                        </TouchableOpacity>
                    </FormField>

                    {/* Two-column row: Travellers + Purpose */}
                    <View style={dynamicStyles.rowTwo}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <FormField label="Travellers" required compact>
                                <TouchableOpacity
                                    style={dynamicStyles.inputRow}
                                    onPress={() => setShowTravellerPicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="people-outline" size={18} color={PRIMARY} style={dynamicStyles.inputIcon} />
                                    <Text style={[dynamicStyles.inputText, !numTravellers && dynamicStyles.placeholder]} numberOfLines={1}>
                                        {numTravellers ? `${numTravellers} ${numTravellers === '1' ? 'person' : 'people'}` : 'Select'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={14} color={TEXT_MUTED} />
                                </TouchableOpacity>
                            </FormField>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <FormField label="Purpose" required compact>
                                <TouchableOpacity
                                    style={dynamicStyles.inputRow}
                                    onPress={() => setShowPurposePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={(selectedPurpose?.icon as any) || 'compass-outline'}
                                        size={18}
                                        color={PRIMARY}
                                        style={dynamicStyles.inputIcon}
                                    />
                                    <Text style={[dynamicStyles.inputText, !purposeOfTravel && dynamicStyles.placeholder]} numberOfLines={1}>
                                        {purposeOfTravel ? purposeOfTravel.split(' ')[0] : 'Select'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={14} color={TEXT_MUTED} />
                                </TouchableOpacity>
                            </FormField>
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={dynamicStyles.divider} />

                    {/* Special Requirements */}
                    <FormField label="Special Requirements / Assistance">
                        <View style={[dynamicStyles.inputRow, dynamicStyles.textareaRow]}>
                            <Ionicons name="list-outline" size={18} color={PRIMARY} style={[dynamicStyles.inputIcon, { alignSelf: 'flex-start', marginTop: 2 }]} />
                            <TextInput
                                style={[dynamicStyles.inputText, dynamicStyles.textareaText]}
                                placeholder="Wheelchair access, dietary needs, medical equipment…"
                                placeholderTextColor={TEXT_MUTED}
                                value={specialRequirements}
                                onChangeText={setSpecialRequirements}
                                multiline
                                numberOfLines={3}
                                editable={!isLoadingInit}
                                textAlignVertical="top"
                            />
                        </View>
                    </FormField>

                    {/* Additional Details */}
                    <FormField label="Additional Details" optional>
                        <View style={[dynamicStyles.inputRow, dynamicStyles.textareaRow]}>
                            <Ionicons name="create-outline" size={18} color={PRIMARY} style={[dynamicStyles.inputIcon, { alignSelf: 'flex-start', marginTop: 2 }]} />
                            <TextInput
                                style={[dynamicStyles.inputText, dynamicStyles.textareaText]}
                                placeholder="Preferred airlines, seat preferences, hotel tier…"
                                placeholderTextColor={TEXT_MUTED}
                                value={additionalDetails}
                                onChangeText={setAdditionalDetails}
                                multiline
                                numberOfLines={3}
                                editable={!isLoadingInit}
                                textAlignVertical="top"
                            />
                        </View>
                    </FormField>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[dynamicStyles.submitBtn, (isBooking || isLoadingInit) && dynamicStyles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={isBooking || isLoadingInit}
                        activeOpacity={0.85}
                    >
                        {isBooking ? (
                            <ActivityIndicator size="small" color={WHITE} />
                        ) : (
                            <>
                                <Ionicons name="paper-plane-outline" size={18} color={WHITE} style={{ marginRight: 8 }} />
                                <Text style={dynamicStyles.submitBtnText}>Submit Enquiry</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={dynamicStyles.footerNote}>
                        Our team will contact you within 24 hours to confirm your travel plan.
                    </Text>
                </View>
            </KeyboardAwareScrollView>

            {/* ── Date Picker Modal ── */}
            {showDatePicker && (
                <Modal transparent visible={showDatePicker} animationType="slide">
                    <View style={dynamicStyles.modalOverlay}>
                        <View style={[dynamicStyles.modal, dynamicStyles.datePickerModal]}>
                            <ModalHeader title="Select Travel Date" onClose={() => setShowDatePicker(false)} />
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 16 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                <CustomDateTimePicker
                                    value={travelDates}
                                    onChange={(date) => {
                                        setTravelDates(date);
                                        setShowDatePicker(false);
                                    }}
                                    daysToShow={21}
                                />
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}

            {/* ── Travellers Picker Modal ── */}
            <Modal transparent visible={showTravellerPicker} animationType="slide">
                <View style={dynamicStyles.modalOverlay}>
                    <View style={dynamicStyles.modal}>
                        <ModalHeader title="Number of Travellers" onClose={() => setShowTravellerPicker(false)} />
                        <FlatList
                            data={travellerCounts}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => {
                                const active = numTravellers === item;
    const dynamicStyles = makeStyles(isDarkMode);

                                return (
                                    <TouchableOpacity
                                        style={[dynamicStyles.optionItem, active && dynamicStyles.optionItemActive]}
                                        onPress={() => { setNumTravellers(item); setShowTravellerPicker(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={dynamicStyles.optionLeft}>
                                            <View style={[dynamicStyles.optionDot, active && dynamicStyles.optionDotActive]}>
                                                <Text style={[dynamicStyles.optionDotText, active && { color: WHITE }]}>{item}</Text>
                                            </View>
                                            <Text style={[dynamicStyles.optionLabel, active && dynamicStyles.optionLabelActive]}>
                                                {item === '1' ? '1 person' : `${item} people`}
                                            </Text>
                                        </View>
                                        {active && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>

            {/* ── Purpose Picker Modal ── */}
            <Modal transparent visible={showPurposePicker} animationType="slide">
                <View style={dynamicStyles.modalOverlay}>
                    <View style={dynamicStyles.modal}>
                        <ModalHeader title="Purpose of Travel" onClose={() => setShowPurposePicker(false)} />
                        <FlatList
                            data={purposes}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const active = purposeOfTravel === item.label;
    const dynamicStyles = makeStyles(isDarkMode);

                                return (
                                    <TouchableOpacity
                                        style={[dynamicStyles.optionItem, active && dynamicStyles.optionItemActive]}
                                        onPress={() => { setPurposeOfTravel(item.label); setShowPurposePicker(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={dynamicStyles.optionLeft}>
                                            <View style={[dynamicStyles.purposeIconBox, active && dynamicStyles.purposeIconBoxActive]}>
                                                <Ionicons name={item.icon as any} size={16} color={active ? WHITE : PRIMARY} />
                                            </View>
                                            <Text style={[dynamicStyles.optionLabel, active && dynamicStyles.optionLabelActive]}>
                                                {item.label}
                                            </Text>
                                        </View>
                                        {active && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function FormField({
    label, required, optional, compact, children,
}: {
    label: string; required?: boolean; optional?: boolean; compact?: boolean; children: React.ReactNode;
}) {
    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={{ marginBottom: compact ? 0 : 20 }}>
            <View style={dynamicStyles.labelRow}>
                <Text style={dynamicStyles.label}>{label}</Text>
                {required && <Text style={dynamicStyles.requiredDot}> *</Text>}
                {optional && <Text style={dynamicStyles.optionalTag}> Optional</Text>}
            </View>
            {children}
        </View>
    );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={dynamicStyles.closeBtn}>
                    <Ionicons name="close" size={16} color={TEXT_DARK} />
                </View>
            </TouchableOpacity>
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PRIMARY,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 4,
        backgroundColor: PRIMARY,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: WHITE,
        textAlign: 'center',
        letterSpacing: 0.3,
    },

    // Hero Banner
    heroBanner: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 32,
        backgroundColor: PRIMARY,
    },
    heroIconCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: WHITE,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    heroSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.82)',
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '400',
    },

    // Scroll + Card
    scrollContent: {
        flexGrow: 1,
    },
    formCard: {
        backgroundColor: BG,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 40,
        minHeight: '100%',
        // shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },

    // Row of two fields
    rowTwo: {
        flexDirection: 'row',
        marginBottom: 20,
    },

    // Form Fields
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_LABEL,
    },
    requiredDot: {
        fontSize: 13,
        fontWeight: '700',
        color: RED,
    },
    optionalTag: {
        fontSize: 11,
        fontWeight: '500',
        color: TEXT_MUTED,
    },

    // Input rows
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        minHeight: 50,
        // subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    textareaRow: {
        alignItems: 'flex-start',
        paddingTop: 12,
        minHeight: 100,
    },
    inputIcon: {
        marginRight: 10,
    },
    inputText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: TEXT_DARK,
        padding: 0,
    },
    textareaText: {
        height: 80,
        lineHeight: 20,
    },
    placeholder: {
        color: TEXT_MUTED,
        fontWeight: '400',
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: BORDER,
        marginVertical: 8,
        marginBottom: 20,
    },

    // Submit button
    submitBtn: {
        backgroundColor: PRIMARY,
        borderRadius: 14,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: WHITE,
        letterSpacing: 0.3,
    },
    footerNote: {
        textAlign: 'center',
        fontSize: 12,
        color: TEXT_MUTED,
        marginTop: 16,
        lineHeight: 18,
        fontStyle: 'italic',
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '75%',
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    datePickerModal: {
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 13,
        borderRadius: 10,
        marginHorizontal: 8,
        marginVertical: 2,
    },
    optionItemActive: {
        backgroundColor: PRIMARY_LIGHT,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    optionDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionDotActive: {
        backgroundColor: PRIMARY,
    },
    optionDotText: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: TEXT_DARK,
    },
    optionLabelActive: {
        color: PRIMARY,
        fontWeight: '600',
    },
    purposeIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: PRIMARY_LIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    purposeIconBoxActive: {
        backgroundColor: PRIMARY,
    },
});

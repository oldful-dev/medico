import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { bookingService } from '@/services/api/bookingService';
import { useTranslation } from 'react-i18next';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';

const PRIMARY = '#02743F';
const PRIMARY_LIGHT = '#E8F5E9';
const PRIMARY_MID = '#03924F';
const TEXT_DARK = '#1A1A1A';
const TEXT_MUTED = '#9CA3AF';
const TEXT_LABEL = '#374151';
const BG = '#F8FAF9';
const RED = '#EF4444';

const purposeOptions = [
    { id: '1', labelKey: 'leisure', icon: 'sunny-outline' },
    { id: '2', labelKey: 'business', icon: 'briefcase-outline' },
    { id: '3', labelKey: 'family', icon: 'people-outline' },
    { id: '4', labelKey: 'adventure', icon: 'bicycle-outline' },
    { id: '5', labelKey: 'wellness', icon: 'flower-outline' },
    { id: '6', labelKey: 'cultural', icon: 'earth-outline' },
    { id: '7', labelKey: 'other', icon: 'ellipsis-horizontal-circle-outline' },
];

const travellerCounts = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

export default function TripTravelsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();

    const WHITE = isDarkMode ? '#1A1A1A' : '#FAF7ED';

    const [destination, setDestination]             = useState('');
    const [travelDates, setTravelDates]             = useState<Date | undefined>(undefined);
    const [numTravellers, setNumTravellers]         = useState('');
    const [purposeOfTravel, setPurposeOfTravel]     = useState('');
    const [specialRequirements, setSpecialRequirements] = useState('');
    const [additionalDetails, setAdditionalDetails] = useState('');
    const [isBooking, setIsBooking]                 = useState(false);
    const [showTravellerPicker, setShowTravellerPicker] = useState(false);
    const [showPurposePicker, setShowPurposePicker]   = useState(false);

    // Native Alert.alert is globally muted app-wide (see app/_layout.tsx) — all
    // single-button notices go through CustomAlertModal via triggerAlert.
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; iconName: string }>({
        visible: false,
        title: '',
        message: '',
        iconName: 'warning-outline',
    });
    const triggerAlert = (title: string, message: string, iconName = 'warning-outline') => {
        setAlertConfig({ visible: true, title, message, iconName });
    };
    const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

    const { cityId, serviceId, isLoading: isLoadingInit } = useServiceInitialization('trip-travels');

    const formattedDate = travelDates
        ? travelDates.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    const selectedPurpose = purposeOptions.find(p => t(`trip_travels.${p.labelKey}`) === purposeOfTravel);

    const handleSubmit = async () => {
        if (!destination.trim())  { triggerAlert(t('common.required'), t('trip_travels.destination_required')); return; }
        if (!travelDates)         { triggerAlert(t('common.required'), t('trip_travels.dates_required')); return; }
        if (!numTravellers)       { triggerAlert(t('common.required'), t('trip_travels.travellers_required')); return; }
        if (!purposeOfTravel)     { triggerAlert(t('common.required'), t('trip_travels.purpose_required')); return; }
        if (!cityId || !serviceId) { triggerAlert(t('common.error'), t('booking.init_incomplete')); return; }

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
                triggerAlert(t('booking.booking_failed'), res.message || t('booking.something_wrong'));
            }
        } catch (error) {
            console.error('Trip booking error:', error);
            triggerAlert(t('common.error'), t('common.generic_error'));
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
                <Text style={dynamicStyles.headerTitle}>{t('trip_travels.header')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* ── Hero Banner (still part of green area) ── */}
            <View style={dynamicStyles.heroBanner}>
                <View style={dynamicStyles.heroIconCircle}>
                    <Ionicons name="airplane" size={32} color={PRIMARY} />
                </View>
                <Text style={dynamicStyles.heroTitle}>{t('trip_travels.hero_title')}</Text>
                <Text style={dynamicStyles.heroSubtitle}>
                    {t('trip_travels.hero_subtitle')}
                </Text>
            </View>

            {/* ── Scrollable Form Card ── */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={dynamicStyles.scrollContent}
                enableOnAndroid
                extraScrollHeight={24}
                keyboardShouldPersistTaps="handled"
            >
                <View style={dynamicStyles.formCard}>

                    {/* Destination */}
                    <FormField label={t('trip_travels.destination')} required>
                        <View style={dynamicStyles.inputRow}>
                            <Ionicons name="location-outline" size={18} color={PRIMARY} style={dynamicStyles.inputIcon} />
                            <TextInput
                                style={dynamicStyles.inputText}
                                placeholder={t('trip_travels.destination_placeholder')}
                                placeholderTextColor={TEXT_MUTED}
                                value={destination}
                                onChangeText={setDestination}
                                returnKeyType="next"
                            />
                        </View>
                    </FormField>
                    <CustomDateTimePicker
                        label={`${t('trip_travels.travel_dates')} *`}
                        value={travelDates}
                        onChange={setTravelDates}
                        daysToShow={21}
                    />

                    {/* Two-column row: Travellers + Purpose */}
                    <View style={dynamicStyles.rowTwo}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <FormField label={t('trip_travels.travellers')} required compact>
                                <TouchableOpacity
                                    style={dynamicStyles.inputRow}
                                    onPress={() => setShowTravellerPicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="people-outline" size={18} color={PRIMARY} style={dynamicStyles.inputIcon} />
                                    <Text style={[dynamicStyles.inputText, !numTravellers && dynamicStyles.placeholder]} numberOfLines={1}>
                                        {numTravellers ? `${numTravellers} ${numTravellers === '1' ? 'person' : 'people'}` : t('trip_travels.select')}
                                    </Text>
                                    <Ionicons name="chevron-down" size={14} color={TEXT_MUTED} />
                                </TouchableOpacity>
                            </FormField>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <FormField label={t('trip_travels.purpose')} required compact>
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
                                        {purposeOfTravel ? purposeOfTravel.split(' ')[0] : t('trip_travels.select')}
                                    </Text>
                                    <Ionicons name="chevron-down" size={14} color={TEXT_MUTED} />
                                </TouchableOpacity>
                            </FormField>
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={dynamicStyles.divider} />

                    {/* Special Requirements */}
                    <FormField label={t('trip_travels.special_requirements')}>
                        <View style={[dynamicStyles.inputRow, dynamicStyles.textareaRow]}>
                            <Ionicons name="list-outline" size={18} color={PRIMARY} style={[dynamicStyles.inputIcon, { alignSelf: 'flex-start', marginTop: 2 }]} />
                            <TextInput
                                style={[dynamicStyles.inputText, dynamicStyles.textareaText]}
                                placeholder={t('trip_travels.requirements_placeholder')}
                                placeholderTextColor={TEXT_MUTED}
                                value={specialRequirements}
                                onChangeText={setSpecialRequirements}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </FormField>

                    {/* Additional Details */}
                    <FormField label={t('trip_travels.additional')} optional>
                        <View style={[dynamicStyles.inputRow, dynamicStyles.textareaRow]}>
                            <Ionicons name="create-outline" size={18} color={PRIMARY} style={[dynamicStyles.inputIcon, { alignSelf: 'flex-start', marginTop: 2 }]} />
                            <TextInput
                                style={[dynamicStyles.inputText, dynamicStyles.textareaText]}
                                placeholder={t('trip_travels.additional_placeholder')}
                                placeholderTextColor={TEXT_MUTED}
                                value={additionalDetails}
                                onChangeText={setAdditionalDetails}
                                multiline
                                numberOfLines={3}
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
                                <Text style={dynamicStyles.submitBtnText}>{t('trip_travels.submit')}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={dynamicStyles.footerNote}>
                        {t('trip_travels.footer_note')}
                    </Text>
                </View>
            </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

            {/* Travellers Picker Modal */}
            <Modal transparent visible={showTravellerPicker} animationType="slide">
                <View style={dynamicStyles.modalOverlay}>
                    <View style={dynamicStyles.modal}>
                        <ModalHeader title={t('trip_travels.travellers')} onClose={() => setShowTravellerPicker(false)} />
                        <FlatList
                            data={travellerCounts}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => {
                                const active = numTravellers === item;

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
                        <ModalHeader title={t('trip_travels.purpose')} onClose={() => setShowPurposePicker(false)} />
                        <FlatList
                            data={purposeOptions}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const label = t(`trip_travels.${item.labelKey}`);
                                const active = purposeOfTravel === label;

                                return (
                                    <TouchableOpacity
                                        style={[dynamicStyles.optionItem, active && dynamicStyles.optionItemActive]}
                                        onPress={() => { setPurposeOfTravel(label); setShowPurposePicker(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={dynamicStyles.optionLeft}>
                                            <View style={[dynamicStyles.purposeIconBox, active && dynamicStyles.purposeIconBoxActive]}>
                                                <Ionicons name={item.icon as any} size={16} color={active ? WHITE : PRIMARY} />
                                            </View>
                                            <Text style={[dynamicStyles.optionLabel, active && dynamicStyles.optionLabelActive]}>
                                                {label}
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

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                iconName={alertConfig.iconName as any}
                buttonText="OK"
                onClose={closeAlert}
            />
        </View>
    );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function FormField({
    label, required, optional, compact, children,
}: {
    label: string; required?: boolean; optional?: boolean; compact?: boolean; children: React.ReactNode;
}) {
    const { isDarkMode } = useTheme();
    const { t } = useTranslation();
    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={{ marginBottom: compact ? 0 : 20 }}>
            <View style={dynamicStyles.labelRow}>
                <Text style={dynamicStyles.label}>{label}</Text>
                {required && <Text style={dynamicStyles.requiredDot}> *</Text>}
                {optional && <Text style={dynamicStyles.optionalTag}> {t('trip_travels.optional')}</Text>}
            </View>
            {children}
        </View>
    );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
    const { isDarkMode } = useTheme();
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

const makeStyles = (isDarkMode: boolean) => {
    const BORDER = isDarkMode ? '#3A3A3A' : '#E5E7EB';
    const WHITE = isDarkMode ? '#1A1A1A' : '#FAF7ED';

    return StyleSheet.create({
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
            backgroundColor: isDarkMode ? '#111827' : BG,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 40,
            minHeight: '100%',
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
            color: isDarkMode ? '#E5E7EB' : TEXT_LABEL,
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
            color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
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
            color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        },
        closeBtn: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
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
            backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
        },
        optionDotActive: {
            backgroundColor: PRIMARY,
        },
        optionDotText: {
            fontSize: 13,
            fontWeight: '700',
            color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        },
        optionLabel: {
            fontSize: 14,
            fontWeight: '500',
            color: isDarkMode ? '#E5E7EB' : TEXT_DARK,
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
};

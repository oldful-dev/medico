import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Linking, KeyboardAvoidingView, ScrollView, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import FormInput from '@/components/common/FormInput';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { familyMemberService, FamilyMember } from '@/services/api/familyMemberService';
import { useUser } from '@/context/UserContext';
import { useAddress } from '@/context/AddressContext';
import { Spacing } from '@/constants/theme';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';

// ─── Figma Assets ───
const familyIcon = require('@/assets/images/cb86876504871abc5e6db19e5612175dae2b0479.png');
const nurseIcon = require('@/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png');
const helpIcon = require('@/assets/images/idea_bulb_3d.png');

export default function BookNursingCareScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    const { profile } = useUser();
    const { activeAddress } = useAddress();

    // Local UI state for radio buttons/selections
    const [selectedWho, setSelectedWho] = useState('Self');
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
    const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRelation, setNewMemberRelation] = useState('Parent');

    const [selectedStaff, setSelectedStaff] = useState('Qualified Nurse');
    const [selectedDuration, setSelectedDuration] = useState('Short Visit (2 Hours)');
    const [selectedCondition, setSelectedCondition] = useState('');
    const [selectedGender, setSelectedGender] = useState('');
    const [landmark, setLandmark] = useState('');
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
    const [comments, setComments] = useState('');

    const fetchFamilyMembers = async () => {
        if (!profile?.id) return;
        try {
            const res = await familyMemberService.getFamilyMembers(profile.id);
            if (res.success && res.data) {
                setFamilyMembers(res.data);
                if (res.data.length > 0) {
                    setSelectedFamilyMemberId(res.data[0].id);
                }
            }
        } catch (error) {
            console.error('Fetch family members error:', error);
        }
    };

    React.useEffect(() => {
        fetchFamilyMembers();
    }, [profile?.id]);

    const handleAddFamilyMember = async () => {
        if (!profile?.id) return;
        if (!newMemberName.trim()) {
            triggerAlert('Required', 'Please enter a name.');
            return;
        }
        try {
            const res = await familyMemberService.addFamilyMember(profile.id, {
                name: newMemberName.trim(),
                relation: newMemberRelation,
            });
            if (res.success && res.data) {
                triggerAlert('Success', 'Family member added!', 'checkmark-circle-outline');
                const newMember = res.data;
                setFamilyMembers(prev => [...prev, newMember]);
                setSelectedFamilyMemberId(newMember.id);
                setNewMemberName('');
                setShowAddFamilyModal(false);
            } else {
                triggerAlert('Error', res.message || 'Failed to add family member.');
            }
        } catch (error) {
            console.error('Add family member error:', error);
            triggerAlert('Error', 'Failed to add family member.');
        }
    };

    const {
        cityId,
        serviceId,
        serviceName,
        servicePrice,
        isLoading: isLoadingInit,
        isReady,
        dbService
    } = useServiceInitialization('nurse-care');

    // Parse duration prices dynamically from admin formFieldsJson / dbService or fall back to defaults
    const durationPrices = React.useMemo(() => {
        let short = 499;
        let full = 1299;
        let addon = 200;

        if (dbService?.formFieldsJson?.sections) {
            dbService.formFieldsJson.sections.forEach((sec: any) => {
                if (sec.fields) {
                    sec.fields.forEach((f: any) => {
                        if (f.options && Array.isArray(f.options)) {
                            const shortOpt = f.options.find((o: any) => o.id === 'short_visit' || o.label?.includes('Short') || o.label?.includes('2'));
                            if (shortOpt?.price && Number(shortOpt.price) > 0) short = Number(shortOpt.price);

                            const fullOpt = f.options.find((o: any) => o.id === '12hr_night' || o.id === 'full_shift' || o.label?.includes('Shift') || o.label?.includes('8') || o.label?.includes('12'));
                            if (fullOpt?.price && Number(fullOpt.price) > 0) full = Number(fullOpt.price);
                        }
                    });
                }
            });
        } else {
            if (dbService?.basePrice && dbService.basePrice > 0) {
                if (dbService.basePrice <= 800) {
                    short = Number(dbService.basePrice);
                } else {
                    full = Number(dbService.basePrice);
                }
            }
            if (dbService?.pricingText) {
                const matches = dbService.pricingText.match(/\d+/g);
                if (matches && matches.length >= 2) {
                    short = Number(matches[0]);
                    full = Number(matches[1]);
                }
            }
        }

        return { short, full, addon };
    }, [dbService]);

    // selectedAddress now seeds from — and stays in sync with — the
    // centralized Active Service Location instead of an independent
    // GPS-only string plus a local default-address lookup.
    const [selectedAddress, setSelectedAddress] = React.useState<AddressData | null>(
        activeAddress ? {
            id: activeAddress.id,
            line1: activeAddress.line1,
            line2: activeAddress.line2,
            cityName: activeAddress.cityName,
            pincode: activeAddress.pincode,
            landmark: activeAddress.landmark,
            latitude: activeAddress.latitude,
            longitude: activeAddress.longitude,
            state: activeAddress.state,
        } : null
    );
    const [landmarkInitialized, setLandmarkInitialized] = React.useState(false);

    const [alertConfig, setAlertConfig] = React.useState<{ visible: boolean; title: string; message: string; iconName: string }>({
        visible: false,
        title: '',
        message: '',
        iconName: 'warning-outline'
    });

    const triggerAlert = (title: string, message: string, iconName = 'warning-outline') => {
        setAlertConfig({ visible: true, title, message, iconName });
    };

    // Follow the centralized active address whenever it changes elsewhere
    // in the app, unless the user has already made their own pick on this
    // screen (tracked by comparing against the current selectedAddress).
    React.useEffect(() => {
        if (!activeAddress) return;
        setSelectedAddress(prev => {
            if (prev && prev.id === activeAddress.id && prev.line1 === activeAddress.line1) return prev;
            return {
                id: activeAddress.id,
                line1: activeAddress.line1,
                line2: activeAddress.line2,
                cityName: activeAddress.cityName,
                pincode: activeAddress.pincode,
                landmark: activeAddress.landmark,
                latitude: activeAddress.latitude,
                longitude: activeAddress.longitude,
                state: activeAddress.state,
            };
        });
        if (!landmarkInitialized && activeAddress.landmark) {
            setLandmark(activeAddress.landmark);
            setLandmarkInitialized(true);
        }
    }, [activeAddress, landmarkInitialized]);

    const handleAddressChange = (addr: AddressData) => {
        setSelectedAddress(addr);
        if (addr.landmark) setLandmark(addr.landmark);
        setLandmarkInitialized(true);
        // AddressPickerSection already calls selectActiveAddress internally.
    };

    const [isBooking, setIsBooking] = useState(false);

    const isFormValid = React.useMemo(() => {
        return !!(
            selectedWho &&
            (selectedWho !== 'Family' || selectedFamilyMemberId) &&
            selectedStaff &&
            selectedDuration &&
            scheduledDate &&
            selectedAddress?.line1 && selectedAddress.line1.trim().length >= 5
        );
    }, [selectedWho, selectedFamilyMemberId, selectedStaff, selectedDuration, scheduledDate, selectedAddress]);

    const handleBookService = async () => {
        if (!selectedWho) {
            triggerAlert(t('common.required'), t('nurse_care.alert_select_who'));
            return;
        }
        if (selectedWho === 'Family' && !selectedFamilyMemberId) {
            triggerAlert(t('common.required'), 'Please select a family member.');
            return;
        }
        if (!selectedStaff) {
            triggerAlert(t('common.required'), t('nurse_care.alert_select_staff'));
            return;
        }
        if (!selectedDuration) {
            triggerAlert(t('common.required'), t('nurse_care.alert_select_duration'));
            return;
        }
        if (!scheduledDate) {
            triggerAlert(t('common.required'), 'Please select a date and time slot.');
            return;
        }
        if (!selectedAddress?.line1 || selectedAddress.line1.trim().length < 5) {
            triggerAlert(t('nurse_care.alert_address_required'), t('nurse_care.alert_address_failed'));
            return;
        }
        if (!isReady) {
            triggerAlert(t('common.error'), t('booking.init_incomplete'));
            return;
        }
        // Map duration to ShiftDuration enum
        let shiftDuration: 'SHORT_VISIT' | 'TWELVE_HOUR' | 'TWENTY_FOUR_HOUR' | undefined;
        if (selectedDuration.includes('Short')) shiftDuration = 'SHORT_VISIT';
        else if (selectedDuration.includes('8') || selectedDuration.includes('Full')) shiftDuration = 'TWELVE_HOUR';
        else if (selectedDuration.includes('12')) shiftDuration = 'TWELVE_HOUR';
        else if (selectedDuration.includes('24')) shiftDuration = 'TWENTY_FOUR_HOUR';

        const selectedFamilyMember = familyMembers.find(m => m.id === selectedFamilyMemberId);
        const resolvedAddressType = 'Home';

        try {
            setIsBooking(true);

            // Booking location comes from the address the user actually
            // confirmed on screen — never a fresh device GPS read.
            const addressLine = [selectedAddress.line1, selectedAddress.line2].filter(Boolean).join(', ');

            // Navigate to checkout — booking created inside checkout after payment succeeds
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: scheduledDate.toISOString(),
                addressLine: addressLine || undefined,
                latitude: selectedAddress.latitude,
                longitude: selectedAddress.longitude,
                landmark: landmark || undefined,
                staffType: selectedStaff === 'Qualified Nurse' ? 'qualified-nurse' : 'bedside-attendant',
                shiftDuration,
                formDataJson: {
                    recipient: selectedWho === 'Self' ? 'Self' : selectedFamilyMember?.name || 'Family',
                    recipientRelation: selectedWho === 'Self' ? 'Self' : selectedFamilyMember?.relation || '',
                    condition: selectedCondition || 'Not specified',
                    gender: selectedGender || 'Any',
                    duration: selectedDuration,
                    comments: comments || undefined,
                    addressType: resolvedAddressType,
                    landmark: landmark || undefined,
                },
            });

            const calculatedPrice = (() => {
                let base = durationPrices.short;
                if (selectedDuration.includes('Short')) base = durationPrices.short;
                else if (selectedDuration.includes('Full') || selectedDuration.includes('8') || selectedDuration.includes('12')) base = durationPrices.full;
                else if (selectedDuration.includes('24')) base = 2499;
                return base;
            })();

            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: String(calculatedPrice),
                    label: `${serviceName} (${selectedDuration})`,
                    serviceSlug: 'nurse-care',
                    selectedOption: selectedDuration,
                    // Nurse Care never forwarded the admin-configured paymentMode/
                    // checkoutGroup before, so checkout always fell back to
                    // isZeroPayment (the "Booking Request — no payment now" inquiry
                    // card) regardless of admin setting this service to PAID.
                    ...(dbService?.paymentMode && { paymentMode: dbService.paymentMode }),
                    ...(dbService?.checkoutGroup && { checkoutGroup: dbService.checkoutGroup }),
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
                },
            });
        } catch (error) {
            console.error('Nurse care error:', error);
            triggerAlert(t('common.error'), t('nurse_care.alert_upload_failed'));
        } finally {
            setIsBooking(false);
        }
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={dynamicStyles.screen}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" />

            <View style={dynamicStyles.container}>
                <View style={dynamicStyles.headerRow}>
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/all-ayuxa-services' as any);
                            }
                        }}
                        style={dynamicStyles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={dynamicStyles.headerTitle}>{t('nurse_care.header')}</Text>
                </View>

                {/* ─── Main Content Card (Cream Background with Top Radius) ─── */}
                <View style={[dynamicStyles.contentCard, { backgroundColor: isDarkMode ? '#252525' : '#FAF7ED' }]}>
                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView
                        style={dynamicStyles.scrollView}
                        contentContainerStyle={dynamicStyles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid
                        extraScrollHeight={20}
                    >
                        {/* Hero / Titles */}
                        <Text style={dynamicStyles.mainTitle}>{t('nurse_care.header')}</Text>
                        <Text style={dynamicStyles.subTitle}>{t('nurse_care.description')}</Text>
                        <View style={dynamicStyles.divider} />

                        {/* ─── Who is it for? ─── */}
                        <View style={dynamicStyles.sectionContainerBase}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.who_for')}</Text>
                            <View style={dynamicStyles.whoRow}>
                                <TouchableOpacity
                                    style={[dynamicStyles.whoButton, selectedWho === 'Self' && dynamicStyles.whoButtonActive]}
                                    onPress={() => setSelectedWho('Self')}
                                >
                                    {selectedWho === 'Self' && <Ionicons name="checkbox" size={16} color="#02743F" style={dynamicStyles.whoIconCheck} />}
                                    <Text style={dynamicStyles.whoButtonText}>{t('common.self')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[dynamicStyles.whoButton, selectedWho === 'Family' && dynamicStyles.whoButtonActive]}
                                    onPress={() => setSelectedWho('Family')}
                                >
                                    <Image source={familyIcon} style={dynamicStyles.whoIcon} resizeMode="contain" />
                                    <Text style={dynamicStyles.whoButtonText}>Family</Text>
                                </TouchableOpacity>
                            </View>

                            {selectedWho === 'Family' && (
                                <View style={{ marginTop: 12 }}>
                                    <Text style={dynamicStyles.subSectionTitle}>Select Family Member</Text>
                                    {familyMembers.length > 0 ? (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                            {familyMembers.map((member) => (
                                                <TouchableOpacity
                                                    key={member.id}
                                                    style={[
                                                        dynamicStyles.familyChip,
                                                        selectedFamilyMemberId === member.id && dynamicStyles.familyChipActive
                                                    ]}
                                                    onPress={() => setSelectedFamilyMemberId(member.id)}
                                                >
                                                    <Text style={[
                                                        dynamicStyles.familyChipText,
                                                        selectedFamilyMemberId === member.id && dynamicStyles.familyChipTextActive
                                                    ]}>
                                                        {member.name} ({member.relation})
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    ) : (
                                        <Text style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>No saved family members.</Text>
                                    )}

                                    <TouchableOpacity
                                        style={dynamicStyles.addFamilyBtn}
                                        onPress={() => setShowAddFamilyModal(true)}
                                    >
                                        <Ionicons name="add" size={14} color="#02743F" />
                                        <Text style={dynamicStyles.addFamilyBtnText}>Add Family Member</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {selectedWho === 'Family' && showAddFamilyModal && (
                                <View style={dynamicStyles.addFamilyForm}>
                                    <Text style={dynamicStyles.formLabel}>Full Name</Text>
                                    <TextInput
                                        style={dynamicStyles.formInputInline}
                                        placeholder="Enter name"
                                        value={newMemberName}
                                        onChangeText={setNewMemberName}
                                    />

                                    <Text style={dynamicStyles.formLabel}>Relation</Text>
                                    <View style={dynamicStyles.relationRow}>
                                        {['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Sibling', 'Other'].map((rel) => (
                                            <TouchableOpacity
                                                key={rel}
                                                style={[
                                                    dynamicStyles.relationChip,
                                                    newMemberRelation === rel && dynamicStyles.relationChipActive
                                                ]}
                                                onPress={() => setNewMemberRelation(rel)}
                                            >
                                                <Text style={[
                                                    dynamicStyles.relationChipText,
                                                    newMemberRelation === rel && dynamicStyles.relationChipTextActive
                                                ]}>
                                                    {rel}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <View style={dynamicStyles.formActionRow}>
                                        <TouchableOpacity
                                            style={dynamicStyles.cancelFormBtn}
                                            onPress={() => {
                                                setShowAddFamilyModal(false);
                                                setNewMemberName('');
                                            }}
                                        >
                                            <Text style={dynamicStyles.cancelFormBtnText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={dynamicStyles.saveFormBtn}
                                            onPress={handleAddFamilyMember}
                                        >
                                            <Text style={dynamicStyles.saveFormBtnText}>Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* ─── Type of Staff Needed ─── */}


                        {/* ─── Preferred Duration ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.duration')}</Text>

                            <View style={dynamicStyles.verticalStack}>
                                <TouchableOpacity
                                    style={[dynamicStyles.durationCardStacked, selectedDuration === 'Short Visit (2 Hours)' && dynamicStyles.cardActive]}
                                    onPress={() => setSelectedDuration('Short Visit (2 Hours)')}
                                >
                                    <Ionicons
                                        name={selectedDuration === 'Short Visit (2 Hours)' ? "radio-button-on" : "radio-button-off"}
                                        size={18}
                                        color={selectedDuration === 'Short Visit (2 Hours)' ? "#02743F" : "#AAAEAC"}
                                    />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1, alignItems: 'center', marginLeft: 8 }}>
                                        <Text style={dynamicStyles.radioLabelStacked}>Short Visit (2 Hours)</Text>
                                        <View style={{ backgroundColor: selectedDuration === 'Short Visit (2 Hours)' ? '#E8F5E9' : 'rgba(0,0,0,0.04)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: selectedDuration === 'Short Visit (2 Hours)' ? '#C8E6C9' : 'transparent' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: selectedDuration === 'Short Visit (2 Hours)' ? '#02743F' : '#555' }}>₹{durationPrices.short}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[dynamicStyles.durationCardStacked, selectedDuration === 'Full Shift (8 Hours)' && dynamicStyles.cardActive]}
                                    onPress={() => setSelectedDuration('Full Shift (8 Hours)')}
                                >
                                    <Ionicons
                                        name={selectedDuration === 'Full Shift (8 Hours)' ? "radio-button-on" : "radio-button-off"}
                                        size={18}
                                        color={selectedDuration === 'Full Shift (8 Hours)' ? "#02743F" : "#AAAEAC"}
                                    />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1, alignItems: 'center', marginLeft: 8 }}>
                                        <Text style={dynamicStyles.radioLabelStacked}>Full Shift (8 Hours)</Text>
                                        <View style={{ backgroundColor: selectedDuration === 'Full Shift (8 Hours)' ? '#E8F5E9' : 'rgba(0,0,0,0.04)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: selectedDuration === 'Full Shift (8 Hours)' ? '#C8E6C9' : 'transparent' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: selectedDuration === 'Full Shift (8 Hours)' ? '#02743F' : '#555' }}>₹{durationPrices.full}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <Text style={{ fontSize: 12, color: '#02743F', marginTop: 8, fontStyle: 'italic' }}>
                                (Note: Rates vary based on selection)
                            </Text>
                        </View>

                        {/* ─── Patient Condition ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.condition')}</Text>

                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={[dynamicStyles.radioCard, selectedCondition === 'Walking/ Mobile' && dynamicStyles.cardActive]} onPress={() => setSelectedCondition('Walking/ Mobile')}>
                                    <Ionicons name={selectedCondition === 'Walking/ Mobile' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCondition === 'Walking/ Mobile' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('nurse_care.walking')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[dynamicStyles.radioCard, selectedCondition === 'Bedridden' && dynamicStyles.cardActive]} onPress={() => setSelectedCondition('Bedridden')}>
                                    <Ionicons name={selectedCondition === 'Bedridden' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCondition === 'Bedridden' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('nurse_care.bedridden')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={[dynamicStyles.radioCard, selectedCondition === 'Post-Surgery' && dynamicStyles.cardActive]} onPress={() => setSelectedCondition('Post-Surgery')}>
                                    <Ionicons name={selectedCondition === 'Post-Surgery' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCondition === 'Post-Surgery' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('nurse_care.post_surgery')}</Text>
                                </TouchableOpacity>
                                <View style={{ flex: 1, marginHorizontal: 4 }} />
                            </View>
                        </View>

                        {/* ─── Gender preferences ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.gender_pref')}</Text>

                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={[dynamicStyles.radioCardSmall, selectedGender === 'Male' && dynamicStyles.cardActive]} onPress={() => setSelectedGender('Male')}>
                                    <Ionicons name={selectedGender === 'Male' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedGender === 'Male' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('common.male')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[dynamicStyles.radioCardSmall, selectedGender === 'Female' && dynamicStyles.cardActive]} onPress={() => setSelectedGender('Female')}>
                                    <Ionicons name={selectedGender === 'Female' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedGender === 'Female' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('common.female')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[dynamicStyles.radioCardSmall, selectedGender === 'Any' && dynamicStyles.cardActive]} onPress={() => setSelectedGender('Any')}>
                                    <Ionicons name={selectedGender === 'Any' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedGender === 'Any' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('common.any')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ─── Not Sure Banner ─── */}
                        <TouchableOpacity style={dynamicStyles.notSureBanner} onPress={() => Linking.openURL('tel:08047280789')} activeOpacity={0.75}>
                            <Image source={helpIcon} style={dynamicStyles.ideaIcon} resizeMode="contain" />
                            <View style={dynamicStyles.notSureTextGroup}>
                                <Text style={dynamicStyles.notSureTitle}>{t('nurse_care.not_sure_title')}</Text>
                                <Text style={dynamicStyles.notSureSubtitle}>{t('nurse_care.not_sure_subtitle')}</Text>
                            </View>
                        </TouchableOpacity>

                        {/* ─── Date & Time Picker ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <CustomDateTimePicker
                                label={t('booking.schedule_appointment', 'Schedule Appointment')}
                                value={scheduledDate}
                                onDateChange={setScheduledDate}
                            />
                        </View>

                        {/* ─── Comments input ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <Text style={dynamicStyles.sectionTitle}>Comments</Text>
                            <TextInput
                                style={dynamicStyles.commentsInput}
                                placeholder="Enter any additional requirements, special requests or comments..."
                                placeholderTextColor={isDarkMode ? '#64748B' : '#888888'}
                                value={comments}
                                onChangeText={setComments}
                                multiline
                                numberOfLines={3}
                                maxLength={300}
                            />
                        </View>

                        {/* ─── Confirm Address Card ─── */}
                        <AddressPickerSection
                            selectedAddress={selectedAddress}
                            onAddressChange={handleAddressChange}
                            title={t('booking.confirm_address')}
                            showPhoneField={false}
                            showLandmarkField={true}
                            landmark={landmark}
                            onLandmarkChange={setLandmark}
                            allowManualEntry={true}
                        />
                    </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

                    {/* ─── Fixed Normal Bottom Bar ─── */}
                    <View style={[dynamicStyles.bottomBarContainer, { paddingBottom: insets.bottom || 20, backgroundColor: isDarkMode ? '#252525' : '#FAF7ED' }]}>
                        <TouchableOpacity
                            style={[dynamicStyles.confirmButton, (!isFormValid || isBooking || isLoadingInit) && { opacity: 0.6 }]}
                            activeOpacity={isFormValid && !isBooking && !isLoadingInit ? 0.8 : 0.5}
                            disabled={!isFormValid || isBooking || isLoadingInit}
                            onPress={handleBookService}
                        >
                            {isBooking ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={dynamicStyles.confirmButtonText}>
                                    {isLoadingInit ? t('common.initializing') : t('booking.request_staff')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                iconName={alertConfig.iconName as any}
                buttonText="OK"
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    /* ─── Screen Base ─── */
    screen: {
        flex: 1,
        backgroundColor: '#048357', // Hero green background
    },
    container: {
        flex: 1,
    },

    /* ─── Header ─── */
    headerSafe: {
        backgroundColor: '#048357',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 8,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 20,
        color: '#FAF7ED',
        letterSpacing: -0.24,
        marginLeft: 12,
    },
    headerRight: {
        width: 32, // to balance back button width
    },

    /* ─── Main Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: isDarkMode ? '#252525' : '#FAF7ED', // Off-white cream / Dark
        borderTopLeftRadius: 51,
        borderTopRightRadius: 51,
        shadowColor: isDarkMode ? '#000000' : '#FAF7ED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 42.8,
        elevation: 10,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 30,
    },

    /* ─── Hero ─── */
    mainTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 5,
        textAlign: 'left',
    },
    subTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#94A3B8' : '#898989',
        textAlign: 'left',
        marginBottom: 15,
    },
    divider: {
        height: 1,
        backgroundColor: isDarkMode ? '#334155' : '#D9D9D9',
        marginVertical: 15,
    },

    /* ─── Text / Desc ─── */
    descText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        lineHeight: 20,
        color: isDarkMode ? '#CCCCCC' : '#555555',
        textAlign: 'center',
        paddingHorizontal: 12,
        marginBottom: 24,
        letterSpacing: -0.24,
    },

    sectionContainerBase: {
        backgroundColor: isDarkMode ? '#3A3A3A' : 'rgba(237,237,237,0.57)',
        borderRadius: 9,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 32,
    },
    sectionContainer: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 15,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: -0.24,
    },

    /* ─── Who Row ─── */
    whoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    whoButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        height: 33,
        borderRadius: 7,
        marginHorizontal: 4,
    },
    whoButtonActive: {
        borderWidth: 1,
        borderColor: '#02743F',
    },
    whoIconCheck: {
        marginRight: 4,
    },
    whoIcon: {
        width: 14,
        height: 14,
        marginRight: 4,
    },
    whoButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        letterSpacing: -0.24,
    },

    /* ─── Staff Card ─── */
    staffCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 9,
        height: 90,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    staffCardActive: {
        borderWidth: 1.5,
        borderColor: '#0E9757',
        backgroundColor: isDarkMode ? '#0E9757' : '#E6F4EA',
    },
    staffAvatarContainer: {
        marginRight: 12,
    },
    staffAvatar: {
        width: 60,
        height: 80,
    },
    staffInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    staffTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 15,
        color: isDarkMode ? '#CCCCCC' : '#555555',
        marginBottom: 4,
        letterSpacing: -0.24,
        flexShrink: 1,
    },
    staffTitleActive: {
        color: isDarkMode ? '#FFFFFF' : '#02743F',
    },
    staffSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: isDarkMode ? '#AAAAAA' : '#555555',
        lineHeight: 12,
        letterSpacing: -0.24,
        flexShrink: 1,
    },
    staffSubtitleActive: {
        color: isDarkMode ? '#E2E8F0' : '#0B6623',
    },

    /* ─── Stacked Variants (New Row Setup) ─── */
    verticalStack: {
        flexDirection: 'column',
        gap: 12,
    },
    durationCardStacked: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    radioCardStacked: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    radioLabelStacked: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        marginLeft: 12,
    },

    /* ─── Active Card style for selections ─── */
    cardActive: {
        borderColor: '#0E9757',
        borderWidth: 1.5,
        backgroundColor: isDarkMode ? 'rgba(14,151,87,0.15)' : '#E6F4EA',
    },

    /* ─── Legacy Grid Rows ─── */
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    durationCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        marginHorizontal: 4,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    durationTextCol: {
        marginLeft: 8,
        flexShrink: 1,
        flex: 1,
    },
    durationTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 10,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
    },
    durationSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 8,
        color: isDarkMode ? '#CCCCCC' : '#2F2F2F',
    },

    radioCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        marginHorizontal: 4,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    radioCardSmall: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 40,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 11,
        marginHorizontal: 3,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    radioLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        marginLeft: 8,
    },

    /* ─── Not Sure Banner ─── */
    notSureBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#3A3A3A' : 'rgba(243,223,255,0.41)',
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
        marginBottom: 20,
    },
    ideaIcon: {
        width: 32,
        height: 38,
        marginRight: 10,
    },
    notSureTextGroup: {
        flex: 1,
    },
    notSureTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#CCCCCC' : '#555555',
        marginBottom: 2,
    },
    notSureSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#AAAAAA' : 'rgba(98,15,126,0.75)',
    },

    /* ─── Fixed Bottom Bar (New Setup) ─── */
    bottomBarContainer: {
        backgroundColor: isDarkMode ? '#252525' : '#FAF7ED', // Matches the cream card color perfectly
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', // Adds a tiny visual separation line from the scroll view
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: Platform.OS === 'android' ? 20 : 10, // Adjusts for Android without home indicator
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#02743F',
        width: 230,
        height: 48, // Slightly taller for a nice thumb target
        borderRadius: 24, // Matches half of height
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    confirmButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#FAF7ED',
    },
    subSectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#CCCCCC' : '#666',
        marginBottom: 8,
    },
    familyChip: {
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#AAAEAC',
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    familyChipActive: {
        borderColor: '#02743F',
        borderWidth: 1.5,
        backgroundColor: isDarkMode ? 'rgba(2,116,63,0.15)' : 'rgba(2,116,63,0.06)',
    },
    familyChipText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#CCCCCC' : '#555',
    },
    familyChipTextActive: {
        color: '#02743F',
        fontWeight: 'bold',
    },
    addFamilyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        alignSelf: 'flex-start',
        gap: 4,
    },
    addFamilyBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: '#02743F',
    },
    addFamilyForm: {
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#DDD',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    formLabel: {
        fontSize: 11,
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: isDarkMode ? '#AAAAAA' : '#777',
        marginBottom: 4,
    },
    formInputInline: {
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#CCC',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 13,
        marginBottom: 8,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        backgroundColor: isDarkMode ? '#222222' : '#FAF7ED',
    },
    relationRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    relationChip: {
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#CCC',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    relationChipActive: {
        borderColor: '#02743F',
        backgroundColor: isDarkMode ? 'rgba(2,116,63,0.15)' : 'rgba(2,116,63,0.06)',
    },
    relationChipText: {
        fontSize: 11,
        color: isDarkMode ? '#CCCCCC' : '#555',
    },
    relationChipTextActive: {
        color: '#02743F',
        fontWeight: 'bold',
    },
    formActionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    cancelFormBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    cancelFormBtnText: {
        color: isDarkMode ? '#AAAAAA' : '#777',
        fontSize: 12,
    },
    saveFormBtn: {
        backgroundColor: '#02743F',
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    saveFormBtnText: {
        color: '#FAF7ED',
        fontSize: 12,
        fontWeight: 'bold',
    },
    commentsInput: {
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#CCC',
        borderRadius: 9,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        minHeight: 72,
        textAlignVertical: 'top',
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    autoFetchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#02743F',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 4,
    },
    autoFetchText: {
        fontSize: 11,
        color: '#02743F',
        fontWeight: 'bold',
    },
    addressBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#CCC',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        marginBottom: 8,
    },
    addressIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    addressText: {
        flex: 1,
        fontSize: 13,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        padding: 0,
        textAlignVertical: 'top',
    },
    landmarkInput: {
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#CCC',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        fontSize: 13,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        marginBottom: 8,
    },
    addressTypeLabel: {
        fontSize: 12,
        color: isDarkMode ? '#F1F5F9' : '#555555',
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 6,
    },
    addressTypeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    addressTypeChip: {
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#CCC',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    addressTypeChipActive: {
        borderColor: '#02743F',
        borderWidth: 1.5,
        backgroundColor: isDarkMode ? 'rgba(2,116,63,0.15)' : 'rgba(2,116,63,0.06)',
    },
    addressTypeChipText: {
        fontSize: 11,
        color: isDarkMode ? '#CCCCCC' : '#666',
    },
    addressTypeChipTextActive: {
        color: '#02743F',
        fontWeight: 'bold',
    },
    customAddressTypeInput: {
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : '#CCC',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 8,
        fontSize: 13,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        marginTop: 4,
        marginBottom: 8,
    },
});
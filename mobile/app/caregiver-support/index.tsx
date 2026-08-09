import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator, Linking, KeyboardAvoidingView, ScrollView, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { locationService } from '@/services/device/locationService';
import FormInput from '@/components/common/FormInput';
import * as ImagePicker from 'expo-image-picker';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { safeScrollToPosition } from '@/utils/scrollUtils';
import { familyMemberService, FamilyMember } from '@/services/api/familyMemberService';
import { useUser } from '@/context/UserContext';
import { Spacing } from '@/constants/theme';
import { userService } from '@/services/api/userService';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';

// ─── Figma Assets ───
const familyIcon = require('@/assets/images/cb86876504871abc5e6db19e5612175dae2b0479.png');
const nurseIcon = require('@/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png');
const helpIcon = require('@/assets/images/idea_bulb_3d.png');

export default function BookCaregiverSupportScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    const { profile, refreshData } = useUser();

    // Local UI state for radio buttons/selections
    const [selectedWho, setSelectedWho] = useState('Self');
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
    const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRelation, setNewMemberRelation] = useState('Parent');

    const [selectedStaff, setSelectedStaff] = useState('Bedside Attendant');
    const [selectedDuration, setSelectedDuration] = useState('12 Hours (Night Shift)');
    const [selectedCondition, setSelectedCondition] = useState('');
    const [selectedGender, setSelectedGender] = useState('');
    const [landmark, setLandmark] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
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
            Alert.alert('Required', 'Please enter a name.');
            return;
        }
        try {
            const res = await familyMemberService.addFamilyMember(profile.id, {
                name: newMemberName.trim(),
                relation: newMemberRelation,
            });
            if (res.success && res.data) {
                Alert.alert('Success', 'Family member added!');
                const newMember = res.data;
                setFamilyMembers(prev => [...prev, newMember]);
                setSelectedFamilyMemberId(newMember.id);
                setNewMemberName('');
                setShowAddFamilyModal(false);
            } else {
                Alert.alert('Error', res.message || 'Failed to add family member.');
            }
        } catch (error) {
            console.error('Add family member error:', error);
            Alert.alert('Error', 'Failed to add family member.');
        }
    };

    const handlePickReport = async () => {
        if (selectedImages.length >= 5) {
            Alert.alert('Limit Reached', 'You can upload up to 5 files.');
            return;
        }
        Alert.alert(
            'Upload report (Optional)',
            '',
            [
                { text: 'Take Photo', onPress: async () => {
                    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                    if (permissionResult.granted === false) {
                        Alert.alert('Permission Required', 'Camera permission is required.');
                        return;
                    }
                    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
                    if (!result.canceled && result.assets && result.assets.length > 0) {
                        setSelectedImages(prev => [...prev, result.assets[0].uri]);
                    }
                }},
                { text: 'Choose from Gallery', onPress: async () => {
                    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (permissionResult.granted === false) {
                        Alert.alert('Permission Required', 'Gallery permission is required.');
                        return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsMultipleSelection: true,
                        selectionLimit: 5 - selectedImages.length,
                        quality: 0.8,
                    });
                    if (!result.canceled && result.assets && result.assets.length > 0) {
                        const newUris = result.assets.map(asset => asset.uri);
                        setSelectedImages(prev => [...prev, ...newUris]);
                    }
                }},
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const {
        cityId,
        serviceId,
        serviceName,
        servicePrice,
        address,
        setAddress,
        locationDenied,
        isLoading: isLoadingInit,
        isReady
    } = useServiceInitialization('caregiver-support');

    const [formErrors, setFormErrors] = React.useState<Record<string, string | undefined>>({});
    const scrollViewRef = React.useRef<any>(null);
    const sectionPositions = React.useRef<Record<string, number>>({});
    const [selectedAddress, setSelectedAddress] = React.useState<AddressData | null>(null);
    const [addressInitialized, setAddressInitialized] = React.useState(false);

    // Sync selectedAddress with initial fetched address on mount or when fetched
    React.useEffect(() => {
        if (address && address !== 'Fetching address...' && !selectedAddress) {
            setSelectedAddress({
                line1: address,
                pincode: '',
                addressType: 'Home'
            });
        }
    }, [address]);

    // Auto-fill profile address only on mount when GPS address is not available
    React.useEffect(() => {
        if (addressInitialized) return; // Only run once
        const addressEmpty = !address || address === 'Fetching address...' || address === '';
        if (addressEmpty && profile?.addresses?.length) {
            const defaultAddr = profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0];
            const parts = [defaultAddr.line1, defaultAddr.line2, defaultAddr.city, defaultAddr.state].filter(Boolean);
            if (parts.length) {
                setAddress(parts.join(', '));
                setAddressInitialized(true);
            }
        }
        if (!addressEmpty) {
            setAddressInitialized(true);
        }
    }, [address]);

    const handleAddressChange = (addr: AddressData) => {
        setSelectedAddress(addr);
        setAddress(`${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}`);
    };

    // Silently upsert the address back to profile when user books
    const syncAddressToProfile = async (addressText: string, landmarkText: string) => {
        if (!profile?.id || !addressText.trim()) return;
        try {
            const existing = profile.addresses?.find((a: any) => a.isDefault) || profile.addresses?.[0];
            const payload = {
                line1: addressText.trim(),
                landmark: landmarkText.trim() || undefined,
                addressType: selectedAddress?.addressType || 'Home',
                isDefault: true,
                pincode: selectedAddress?.pincode || '',
            };
            if (existing) {
                await userService.updateAddress(profile.id, existing.id, payload);
            } else {
                await userService.addAddress(profile.id, payload);
            }
            await refreshData(true);
        } catch (e) {
            console.warn('Sync address to profile failed:', e);
        }
    };

    const [isBooking, setIsBooking] = useState(false);

    const handleBookService = async () => {
        const errs: Record<string, string> = {};
        if (!selectedAddress?.line1 && (!address || address.trim().length < 5)) {
            errs.address = 'Please select or confirm your service address.';
        }
        if (!selectedDuration) {
            errs.duration = 'Please select preferred duration.';
        }
        if (!selectedCondition) {
            errs.condition = 'Please select patient condition.';
        }
        if (!selectedGender) {
            errs.gender = 'Please select preferred staff gender.';
        }
        if (!scheduledDate) {
            errs.date = 'Please select date & time slot.';
        }

        if (Object.keys(errs).length > 0) {
            setFormErrors(errs);
            const firstErrorField = ['address', 'duration', 'condition', 'gender', 'date'].find(f => errs[f]);
            if (firstErrorField && sectionPositions.current[firstErrorField] !== undefined) {
                const targetY = sectionPositions.current[firstErrorField] - 20;
                safeScrollToPosition(scrollViewRef, targetY);
            }
            return;
        }
        // Map duration to ShiftDuration enum
        let shiftDuration: 'SHORT_VISIT' | 'TWELVE_HOUR' | 'TWENTY_FOUR_HOUR' | undefined;
        if (selectedDuration.includes('Short')) shiftDuration = 'SHORT_VISIT';
        else if (selectedDuration.includes('12')) shiftDuration = 'TWELVE_HOUR';
        else if (selectedDuration.includes('24')) shiftDuration = 'TWENTY_FOUR_HOUR';

        const selectedFamilyMember = familyMembers.find(m => m.id === selectedFamilyMemberId);
        const resolvedAddressType = selectedAddress?.addressType || 'Home';

        try {
            setIsBooking(true);

            // Sync address back to profile (non-blocking, non-fatal)
            syncAddressToProfile(address, landmark);

            // Upload images first (safe before payment — no booking created yet)
            let uploadedImageUrls: string[] = [];
            if (selectedImages.length > 0) {
                uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, 'nurse-care');
            }

            // Navigate to checkout — booking created inside checkout after payment succeeds
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: scheduledDate.toISOString(),
                addressLine: address || undefined,
                landmark: landmark || undefined,
                staffType: selectedStaff === 'Qualified Nurse' ? 'qualified-nurse' : 'bedside-attendant',
                shiftDuration,
                formDataJson: {
                    recipient: selectedWho === 'Self' ? 'Self' : selectedFamilyMember?.name || 'Family',
                    recipientRelation: selectedWho === 'Self' ? 'Self' : selectedFamilyMember?.relation || '',
                    condition: selectedCondition || 'Not specified',
                    gender: selectedGender || 'Any',
                    duration: selectedDuration,
                    attachments: uploadedImageUrls,
                    comments: comments || undefined,
                    addressType: resolvedAddressType,
                    landmark: landmark || undefined,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: {
                    bookingPayload,
                    amount: String(servicePrice),
                    label: 'Caregiver Support',
                    serviceSlug: 'caregiver-support',
                    ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
                },
            });
        } catch (error) {
            console.error('Caregiver support error:', error);
            Alert.alert(t('common.error'), t('nurse_care.alert_upload_failed'));
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
                    <Text style={dynamicStyles.headerTitle}>Caregiver Support</Text>
                </View>

                {/* ─── Main Content Card (Cream Background with Top Radius) ─── */}
                <View style={[dynamicStyles.contentCard, { backgroundColor: isDarkMode ? '#252525' : '#FAF7ED' }]}>
                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView
                        ref={scrollViewRef}
                        style={dynamicStyles.scrollView}
                        contentContainerStyle={dynamicStyles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid
                        extraScrollHeight={20}
                    >
                        {/* Hero / Titles */}
                        <Text style={dynamicStyles.mainTitle}>Caregiver Support</Text>
                        <Text style={dynamicStyles.subTitle}>Professional bedside attendant and daily care assistance at home.</Text>
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
                        <View style={dynamicStyles.sectionContainer} onLayout={(e) => { sectionPositions.current['duration'] = e.nativeEvent.layout.y; }}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.duration')}</Text>

                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={[dynamicStyles.durationCard, selectedDuration === 'Short Visit' && dynamicStyles.cardActive]} onPress={() => { setSelectedDuration('Short Visit'); setFormErrors(prev => ({ ...prev, duration: undefined })); }}>
                                    <Ionicons name={selectedDuration === 'Short Visit' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedDuration === 'Short Visit' ? "#02743F" : "#AAAEAC"} />
                                    <View style={dynamicStyles.durationTextCol}>
                                        <Text style={dynamicStyles.durationTitle}>{t('nurse_care.short_visit')}</Text>
                                        <Text style={dynamicStyles.durationSubtitle}>{t('nurse_care.short_visit_detail')}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={[dynamicStyles.durationCard, selectedDuration === '12 Hours (Night Shift)' && dynamicStyles.cardActive]} onPress={() => { setSelectedDuration('12 Hours (Night Shift)'); setFormErrors(prev => ({ ...prev, duration: undefined })); }}>
                                    <Ionicons name={selectedDuration === '12 Hours (Night Shift)' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedDuration === '12 Hours (Night Shift)' ? "#02743F" : "#AAAEAC"} />
                                    <View style={dynamicStyles.durationTextCol}>
                                        <Text style={dynamicStyles.durationTitle}>{t('nurse_care.twelve_hr_night')}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={[dynamicStyles.durationCard, selectedDuration === '12 Hours (Day Shift)' && dynamicStyles.cardActive]} onPress={() => { setSelectedDuration('12 Hours (Day Shift)'); setFormErrors(prev => ({ ...prev, duration: undefined })); }}>
                                    <Ionicons name={selectedDuration === '12 Hours (Day Shift)' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedDuration === '12 Hours (Day Shift)' ? "#02743F" : "#AAAEAC"} />
                                    <View style={dynamicStyles.durationTextCol}>
                                        <Text style={dynamicStyles.durationTitle}>{t('nurse_care.twelve_hr_day')}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={[dynamicStyles.durationCard, selectedDuration === '24 Hours (Live-in)' && dynamicStyles.cardActive]} onPress={() => { setSelectedDuration('24 Hours (Live-in)'); setFormErrors(prev => ({ ...prev, duration: undefined })); }}>
                                    <Ionicons name={selectedDuration === '24 Hours (Live-in)' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedDuration === '24 Hours (Live-in)' ? "#02743F" : "#AAAEAC"} />
                                    <View style={dynamicStyles.durationTextCol}>
                                        <Text style={dynamicStyles.durationTitle}>{t('nurse_care.twenty_four_hr')}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                            {formErrors.duration && (
                                <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 6, fontWeight: '600' }}>⚠️ {formErrors.duration}</Text>
                            )}
                        </View>

                        {/* ─── Patient Condition ─── */}
                        <View style={dynamicStyles.sectionContainer} onLayout={(e) => { sectionPositions.current['condition'] = e.nativeEvent.layout.y; }}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.condition')}</Text>

                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={[dynamicStyles.radioCard, selectedCondition === 'Walking/ Mobile' && dynamicStyles.cardActive]} onPress={() => { setSelectedCondition('Walking/ Mobile'); setFormErrors(prev => ({ ...prev, condition: undefined })); }}>
                                    <Ionicons name={selectedCondition === 'Walking/ Mobile' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCondition === 'Walking/ Mobile' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('nurse_care.walking')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[dynamicStyles.radioCard, selectedCondition === 'Bedridden' && dynamicStyles.cardActive]} onPress={() => { setSelectedCondition('Bedridden'); setFormErrors(prev => ({ ...prev, condition: undefined })); }}>
                                    <Ionicons name={selectedCondition === 'Bedridden' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCondition === 'Bedridden' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('nurse_care.bedridden')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={[dynamicStyles.radioCard, selectedCondition === 'Post-Surgery' && dynamicStyles.cardActive]} onPress={() => { setSelectedCondition('Post-Surgery'); setFormErrors(prev => ({ ...prev, condition: undefined })); }}>
                                    <Ionicons name={selectedCondition === 'Post-Surgery' ? "radio-button-on" : "radio-button-off"} size={18} color={selectedCondition === 'Post-Surgery' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('nurse_care.post_surgery')}</Text>
                                </TouchableOpacity>
                                <View style={{ flex: 1, marginHorizontal: 4 }} />
                            </View>
                            {formErrors.condition && (
                                <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 6, fontWeight: '600' }}>⚠️ {formErrors.condition}</Text>
                            )}
                        </View>

                        {/* ─── Gender preferences ─── */}
                        <View style={dynamicStyles.sectionContainer} onLayout={(e) => { sectionPositions.current['gender'] = e.nativeEvent.layout.y; }}>
                            <Text style={dynamicStyles.sectionTitle}>{t('nurse_care.gender_pref')}</Text>

                            <View style={dynamicStyles.gridRow}>
                                <TouchableOpacity style={[dynamicStyles.radioCardSmall, selectedGender === 'Male' && dynamicStyles.cardActive]} onPress={() => { setSelectedGender('Male'); setFormErrors(prev => ({ ...prev, gender: undefined })); }}>
                                    <Ionicons name={selectedGender === 'Male' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedGender === 'Male' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('common.male')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[dynamicStyles.radioCardSmall, selectedGender === 'Female' && dynamicStyles.cardActive]} onPress={() => { setSelectedGender('Female'); setFormErrors(prev => ({ ...prev, gender: undefined })); }}>
                                    <Ionicons name={selectedGender === 'Female' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedGender === 'Female' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('common.female')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[dynamicStyles.radioCardSmall, selectedGender === 'Any' && dynamicStyles.cardActive]} onPress={() => { setSelectedGender('Any'); setFormErrors(prev => ({ ...prev, gender: undefined })); }}>
                                    <Ionicons name={selectedGender === 'Any' ? "radio-button-on" : "radio-button-off"} size={16} color={selectedGender === 'Any' ? "#02743F" : "#AAAEAC"} />
                                    <Text style={dynamicStyles.radioLabel}>{t('common.any')}</Text>
                                </TouchableOpacity>
                            </View>
                            {formErrors.gender && (
                                <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 6, fontWeight: '600' }}>⚠️ {formErrors.gender}</Text>
                            )}
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
                        <View style={dynamicStyles.sectionContainer} onLayout={(e) => { sectionPositions.current['date'] = e.nativeEvent.layout.y; }}>
                            <CustomDateTimePicker
                                label={t('booking.schedule_appointment', 'Schedule Appointment')}
                                value={scheduledDate}
                                onDateChange={(dt) => { setScheduledDate(dt); setFormErrors(prev => ({ ...prev, date: undefined })); }}
                            />
                            {formErrors.date && (
                                <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 6, fontWeight: '600' }}>⚠️ {formErrors.date}</Text>
                            )}
                        </View>

                        {/* ─── Compact Document Upload UI ─── */}
                        <View style={dynamicStyles.sectionContainer}>
                            <View style={dynamicStyles.compactUploadContainer}>
                                <TouchableOpacity
                                    style={dynamicStyles.compactUploadButton}
                                    onPress={handlePickReport}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="document-attach-outline" size={16} color="#02743F" />
                                    <Text style={dynamicStyles.compactUploadText}>Upload report (Optional)</Text>
                                </TouchableOpacity>
                                {selectedImages.length > 0 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dynamicStyles.compactThumbScroll}>
                                        {selectedImages.map((uri, idx) => (
                                            <View key={idx} style={dynamicStyles.compactThumbWrapper}>
                                                <Image source={{ uri }} style={dynamicStyles.compactThumb} />
                                                <TouchableOpacity
                                                    style={dynamicStyles.compactRemoveBtn}
                                                    onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                                >
                                                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
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
                        <View onLayout={(e) => { sectionPositions.current['address'] = e.nativeEvent.layout.y; }}>
                            <AddressPickerSection
                                selectedAddress={selectedAddress}
                                onAddressChange={(addr) => { handleAddressChange(addr); setFormErrors(prev => ({ ...prev, address: undefined })); }}
                                title={t('booking.confirm_address')}
                                showPhoneField={false}
                                showLandmarkField={true}
                                landmark={landmark}
                                onLandmarkChange={setLandmark}
                                allowManualEntry={true}
                            />
                            {formErrors.address && (
                                <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: -8, marginBottom: 12, fontWeight: '600' }}>⚠️ {formErrors.address}</Text>
                            )}
                        </View>
                    </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

                    {/* ─── Fixed Normal Bottom Bar ─── */}
                    <View style={[dynamicStyles.bottomBarContainer, { paddingBottom: insets.bottom || 20, backgroundColor: isDarkMode ? '#252525' : '#FAF7ED' }]}>
                        <TouchableOpacity
                            style={[dynamicStyles.confirmButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                            activeOpacity={0.8}
                            disabled={isBooking || isLoadingInit}
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
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 10,
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
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 20, // Reduced padding since the button is no longer overlapping
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
        marginBottom: 24,
    },
    sectionContainer: {
        marginBottom: 24,
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
    compactUploadContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    compactUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#02743F',
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
    },
    compactUploadText: {
        fontSize: 13,
        color: '#02743F',
        fontWeight: 'bold',
    },
    compactThumbScroll: {
        flexDirection: 'row',
    },
    compactThumbWrapper: {
        position: 'relative',
        marginRight: 8,
    },
    compactThumb: {
        width: 36,
        height: 36,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#DDD',
    },
    compactRemoveBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
    },
});
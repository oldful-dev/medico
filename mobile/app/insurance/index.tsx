import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, Alert, ActivityIndicator, Image, KeyboardAvoidingView, ScrollView } from 'react-native';

// ─── Figma Assets ───
const familyIcon = require('../../assets/images/cb86876504871abc5e6db19e5612175dae2b0479.png');
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { locationService } from '@/services/device/locationService';
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { mediaService } from '@/services/api/mediaService';
import { familyMemberService, FamilyMember } from '@/services/api/familyMemberService';
import { useUser } from '@/context/UserContext';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';

// ─── Initial State Constants ───
const INITIAL_CONDITIONS = [
    { label: 'Diabetes', selected: true },
    { label: 'Hypertension (BP)', selected: true },
    { label: 'Heart Condition', selected: false },
    { label: 'None', selected: false, isNone: true },
];

export default function InsuranceScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const { profile, refreshData } = useUser();

    // UI State
    const [whoFor, setWhoFor] = React.useState('Self'); // 'Self' or 'Family'

    // Family member state (matches Nurse & Aide module logic)
    const [familyMembers, setFamilyMembers] = React.useState<FamilyMember[]>([]);
    const [selectedFamilyMemberId, setSelectedFamilyMemberId] = React.useState<string | null>(null);
    const [showAddFamilyForm, setShowAddFamilyForm] = React.useState(false);
    const [newMemberName, setNewMemberName] = React.useState('');
    const [newMemberRelation, setNewMemberRelation] = React.useState('Spouse');
    const [isAddingMember, setIsAddingMember] = React.useState(false);

    const [conditions, setConditions] = React.useState(INITIAL_CONDITIONS);
    const [requirements, setRequirements] = React.useState('');
    const [aadhaarUri, setAadhaarUri] = React.useState<string | null>(null);
    const [panUri, setPanUri] = React.useState<string | null>(null);

    // API state
    const [cityId, setCityId] = React.useState('');
    const [serviceId, setServiceId] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);
    const [isLoadingInit, setIsLoadingInit] = React.useState(true);
    const [selectedAddress, setSelectedAddress] = React.useState<AddressData | null>(null);
    const [landmark, setLandmark] = React.useState('');

    // Fetch family members when profile is loaded
    const fetchFamilyMembers = React.useCallback(async () => {
        if (!profile?.id) return;
        try {
            const res = await familyMemberService.getFamilyMembers(profile.id);
            if (res.success && res.data) {
                setFamilyMembers(res.data);
                if (res.data.length > 0 && !selectedFamilyMemberId) {
                    setSelectedFamilyMemberId(res.data[0].id);
                }
            }
        } catch (error) {
            console.error('Fetch family members error:', error);
        }
    }, [profile?.id]);

    React.useEffect(() => {
        fetchFamilyMembers();
    }, [profile?.id]);

    const handleAddFamilyMember = async () => {
        if (!profile?.id) return;
        if (!newMemberName.trim()) {
            Alert.alert(t('common.required'), t('nurse_care.add_member_name_required', 'Please enter a name.'));
            return;
        }
        try {
            setIsAddingMember(true);
            const res = await familyMemberService.addFamilyMember(profile.id, {
                name: newMemberName.trim(),
                relation: newMemberRelation,
            });
            if (res.success && res.data) {
                const newMember = res.data;
                setFamilyMembers(prev => [...prev, newMember]);
                setSelectedFamilyMemberId(newMember.id);
                setNewMemberName('');
                setShowAddFamilyForm(false);
            } else {
                Alert.alert(t('common.error'), res.message || t('nurse_care.add_member_failed', 'Failed to add family member.'));
            }
        } catch (error) {
            console.error('Add family member error:', error);
            Alert.alert(t('common.error'), t('nurse_care.add_member_failed', 'Failed to add family member.'));
        } finally {
            setIsAddingMember(false);
        }
    };

    React.useEffect(() => {
        (async () => {
            try {
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                }
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) setCityId(profileRes.data.cityId);
                const serviceRes = await apiClient.get<any[]>('/services');
                if (serviceRes.success && serviceRes.data) {
                    const svc = serviceRes.data.find((s: any) => s.slug === 'insurance');
                    if (svc) setServiceId(svc.id);
                }
            } catch (err) { console.log('Insurance init failed', err); }
            finally { setIsLoadingInit(false); }
        })();
    }, []);

    // Sync selectedAddress with initial fetched address on mount or when fetched
    React.useEffect(() => {
        if (address && address !== 'Fetching address...' && !selectedAddress) {
            setSelectedAddress({
                line1: address,
                cityName: '',
                pincode: '',
                latitude: 28.7041,
                longitude: 77.1025,
            });
        }
    }, [address]);

    const handleAddressChange = (addr: AddressData) => {
        setSelectedAddress(addr);
        setAddress(`${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}`);
        if (addr.landmark) setLandmark(addr.landmark);
    };

    // Auto-fill profile address only on mount when GPS address is not available
    const [addressInitialized, setAddressInitialized] = React.useState(false);
    React.useEffect(() => {
        if (addressInitialized) return;
        const addressEmpty = !address || address === 'Fetching address...' || address === '';
        if (addressEmpty && profile?.addresses?.length) {
            const defaultAddr = profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0];
            if (defaultAddr) {
                const parts = [defaultAddr.line1, defaultAddr.line2, defaultAddr.cityName].filter(Boolean);
                setAddress(parts.join(', '));
                if (defaultAddr.landmark) setLandmark(defaultAddr.landmark);
                setAddressInitialized(true);
            }
        }
        if (!addressEmpty) {
            setAddressInitialized(true);
        }
    }, [profile]);

    const syncAddressToProfile = async (addressText: string, landmarkText: string) => {
        if (!profile?.id || !addressText.trim()) return;
        try {
            const existing = profile.addresses?.find((a: any) => a.isDefault) || profile.addresses?.[0];
            const payload = {
                label: existing?.label || 'Home',
                line1: addressText.trim(),
                cityName: existing?.cityName || '',
                state: existing?.state || '',
                pincode: existing?.pincode || '',
                landmark: landmarkText.trim() || undefined,
                isDefault: true,
            };
            if (existing?.id) {
                await userService.updateAddress(profile.id, existing.id, payload);
            } else {
                await userService.addAddress(profile.id, payload);
            }
            await refreshData(true);
        } catch {
            // non-fatal
        }
    };

    const handleUploadDocument = async (docType: 'aadhaar' | 'pan') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('common.permission_required'), 'Gallery permission is required to upload documents.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            if (docType === 'aadhaar') {
                setAadhaarUri(result.assets[0].uri);
            } else {
                setPanUri(result.assets[0].uri);
            }
        }
    };

    const handleBookService = async () => {
        if (!whoFor) {
            Alert.alert(t('common.required'), t('insurance.alert_recipient_required'));
            return;
        }
        if (whoFor === 'Family' && !selectedFamilyMemberId) {
            Alert.alert(t('common.required'), t('nurse_care.alert_select_who', 'Please select a family member.'));
            return;
        }
        if (!aadhaarUri) {
            Alert.alert(t('common.required'), t('insurance.aadhaar_required'));
            return;
        }
        if (!panUri) {
            Alert.alert(t('common.required'), t('insurance.pan_required'));
            return;
        }
        if (!cityId || !serviceId) {
            Alert.alert(t('common.error'), t('insurance.alert_init_failed'));
            return;
        }

        const activeConditions = conditions.filter(c => c.selected).map(c => c.label).join(', ') || 'None';
        const selectedFamilyMember = familyMembers.find(m => m.id === selectedFamilyMemberId);
        try {
            setIsBooking(true);

            // Sync address to profile (non-blocking, non-fatal)
            syncAddressToProfile(address, landmark);

            // Upload Aadhaar & PAN Card to GCS
            let aadhaarUrl = '';
            let panUrl = '';
            const toUpload: string[] = [];
            if (aadhaarUri) toUpload.push(aadhaarUri);
            if (panUri) toUpload.push(panUri);

            if (toUpload.length > 0) {
                const urls = await mediaService.uploadMultipleMedia(toUpload, 'insurance');
                let urlIdx = 0;
                if (aadhaarUri) {
                    aadhaarUrl = urls[urlIdx];
                    urlIdx++;
                }
                if (panUri) {
                    panUrl = urls[urlIdx];
                }
            }

            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: new Date().toISOString(),
                addressLine: address || 'Online Consultation',
                latitude: selectedAddress?.latitude,
                longitude: selectedAddress?.longitude,
                formDataJson: {
                    recipient: whoFor === 'Self' ? 'Self' : (selectedFamilyMember?.name || 'Family'),
                    recipientRelation: whoFor === 'Self' ? 'Self' : (selectedFamilyMember?.relation || ''),
                    preExistingConditions: activeConditions,
                    requirements: requirements || undefined,
                    aadhaarUrl: aadhaarUrl || undefined,
                    panUrl: panUrl || undefined,
                },
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert(t('common.error'), res.message || t('insurance.alert_submission_failed'));
            }
        } catch (error) {
            console.error('Insurance booking error:', error);
            Alert.alert(t('common.error'), t('insurance.alert_request_failed'));
        } finally {
            setIsBooking(false);
        }
    };

    const toggleCondition = (index: number) => {
        const newConditions = [...conditions];

        // If "None" is selected, clear everything else
        if (newConditions[index].isNone) {
            newConditions.forEach((c, i) => {
                c.selected = i === index ? !c.selected : false;
            });
        } else {
            // Turn off "None" if a specific disease is selected
            newConditions[index].selected = !newConditions[index].selected;
            const noneIndex = newConditions.findIndex(c => c.isNone);
            if (noneIndex !== -1 && newConditions[index].selected) {
                newConditions[noneIndex].selected = false;
            }
        }

        setConditions(newConditions);
    };

    const translateConditionLabel = (label: string) => {
        const keyMap: Record<string, string> = {
            'diabetes': 'insurance.diabetes',
            'hypertension (bp)': 'insurance.hypertension',
            'heart condition': 'insurance.heart_condition',
            'none': 'common.none',
        };
        const key = keyMap[label.toLowerCase()];
        return key ? t(key) : label;
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={dynamicStyles.screen}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={dynamicStyles.header}>
                <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={dynamicStyles.headerTitle}>{t('insurance.header')}</Text>
            </View>

            {/* ─── Content Card ─── */}
            <View style={dynamicStyles.contentCard}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <KeyboardAwareScrollView
                        style={dynamicStyles.scrollView}
                        contentContainerStyle={dynamicStyles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid
                        extraScrollHeight={20}
                    >
                        {/* ─── Main Form Card (matches Figma Rectangle 157) ─── */}
                        <View style={dynamicStyles.formWrapper}>
                            {/* Title */}
                            <Text style={dynamicStyles.pageTitle}>{t('insurance.page_title')}</Text>
                            <Text style={dynamicStyles.pageSubtitle}>
                                {t('insurance.page_subtitle')}
                            </Text>

                            {/* ─── Who Is It For? ─── */}
                            <View style={dynamicStyles.sectionCard}>
                                <Text style={dynamicStyles.sectionTitle}>{t('insurance.who_is_it_for')}</Text>
                                <View style={dynamicStyles.recipientRow}>
                                    {/* Option 1: Self */}
                                    <TouchableOpacity
                                        style={[
                                            dynamicStyles.recipientButton,
                                            whoFor === 'Self' && dynamicStyles.recipientButtonSelected,
                                        ]}
                                        onPress={() => setWhoFor('Self')}
                                    >
                                        <Ionicons
                                            name={whoFor === 'Self' ? 'radio-button-on' : 'radio-button-off'}
                                            size={15}
                                            color={whoFor === 'Self' ? '#048357' : '#AAAEAC'}
                                        />
                                        <Text style={[
                                            dynamicStyles.recipientText,
                                            whoFor === 'Self' && dynamicStyles.recipientTextSelected,
                                        ]}>
                                            {t('insurance.self')}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Option 2: Family */}
                                    <TouchableOpacity
                                        style={[
                                            dynamicStyles.recipientButton,
                                            whoFor === 'Family' && dynamicStyles.recipientButtonSelected,
                                        ]}
                                        onPress={() => setWhoFor('Family')}
                                    >
                                        <Ionicons
                                            name={whoFor === 'Family' ? 'radio-button-on' : 'radio-button-off'}
                                            size={15}
                                            color={whoFor === 'Family' ? '#048357' : '#AAAEAC'}
                                        />
                                        <Image
                                            source={familyIcon}
                                            style={dynamicStyles.familyIcon}
                                            resizeMode="contain"
                                        />
                                        <Text style={[
                                            dynamicStyles.recipientText,
                                            whoFor === 'Family' && dynamicStyles.recipientTextSelected,
                                        ]}>
                                            {t('insurance.family')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Standard family member selection (Nurse & Aide module logic) */}
                                {whoFor === 'Family' && (
                                    <View style={{ marginTop: 12 }}>
                                        {/* Existing family members */}
                                        {familyMembers.length > 0 ? (
                                            <View style={dynamicStyles.familySelectionRow}>
                                                {familyMembers.map(member => (
                                                    <TouchableOpacity
                                                        key={member.id}
                                                        style={[
                                                            dynamicStyles.whoButton,
                                                            selectedFamilyMemberId === member.id && dynamicStyles.whoButtonActive,
                                                        ]}
                                                        onPress={() => setSelectedFamilyMemberId(member.id)}
                                                    >
                                                        <Ionicons
                                                            name="person-outline"
                                                            size={13}
                                                            color={selectedFamilyMemberId === member.id ? '#048357' : (isDarkMode ? '#94A3B8' : '#555555')}
                                                        />
                                                        <Text style={[
                                                            dynamicStyles.whoButtonText,
                                                            selectedFamilyMemberId === member.id && { color: '#048357' },
                                                        ]}>
                                                            {member.name}{'\n'}
                                                            <Text style={{ fontSize: 9, opacity: 0.7 }}>{member.relation}</Text>
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        ) : (
                                            <Text style={{ fontSize: 11, color: isDarkMode ? '#94A3B8' : '#888', marginBottom: 10, fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }) }}>
                                                {t('nurse_care.no_family_members', 'No family members added yet. Add one below.')}
                                            </Text>
                                        )}

                                        {/* Add Family Member button / inline form */}
                                        {!showAddFamilyForm ? (
                                            <TouchableOpacity
                                                style={dynamicStyles.addMemberBtn}
                                                onPress={() => setShowAddFamilyForm(true)}
                                            >
                                                <Ionicons name="add-circle-outline" size={16} color="#048357" />
                                                <Text style={dynamicStyles.addMemberText}>{t('nurse_care.add_family_member', 'Add Family Member')}</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={dynamicStyles.addMemberForm}>
                                                <TextInput
                                                    style={dynamicStyles.addMemberInput}
                                                    placeholder={t('nurse_care.member_name_placeholder', 'Member Name')}
                                                    placeholderTextColor={isDarkMode ? '#475569' : '#AAAAAA'}
                                                    value={newMemberName}
                                                    onChangeText={setNewMemberName}
                                                />
                                                {/* Relation chips */}
                                                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10, flexWrap: 'wrap' }}>
                                                    {['Spouse', 'Parent', 'Child', 'Sibling'].map(rel => (
                                                        <TouchableOpacity
                                                            key={rel}
                                                            style={[dynamicStyles.whoButton, newMemberRelation === rel && dynamicStyles.whoButtonActive, { flex: 0, paddingHorizontal: 14 }]}
                                                            onPress={() => setNewMemberRelation(rel)}
                                                        >
                                                            <Text style={[dynamicStyles.whoButtonText, newMemberRelation === rel && { color: '#048357' }]}>
                                                                {t(`nurse_care.relation_${rel.toLowerCase()}`, rel)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <TouchableOpacity
                                                        style={[dynamicStyles.addMemberBtn, { flex: 1, justifyContent: 'center', backgroundColor: isDarkMode ? '#334155' : '#F1F5F9', borderRadius: 8 }]}
                                                        onPress={() => { setShowAddFamilyForm(false); setNewMemberName(''); }}
                                                    >
                                                        <Text style={[dynamicStyles.addMemberText, { color: isDarkMode ? '#94A3B8' : '#555' }]}>{t('common.cancel')}</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[dynamicStyles.addMemberBtn, { flex: 1, justifyContent: 'center', backgroundColor: '#048357', borderRadius: 8, borderColor: 'transparent' }]}
                                                        onPress={handleAddFamilyMember}
                                                        disabled={isAddingMember}
                                                    >
                                                        {isAddingMember
                                                            ? <ActivityIndicator size="small" color="#FFF" />
                                                            : <Text style={[dynamicStyles.addMemberText, { color: '#FAF7ED' }]}>{t('common.save')}</Text>}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* ─── Pre-existing Conditions ─── */}
                            <Text style={dynamicStyles.conditionHeader}>
                                {t('insurance.condition_header')}{'\n'}
                                <Text style={dynamicStyles.conditionSubHeader}>{t('insurance.condition_sub_header')}</Text>
                            </Text>

                            {conditions.map((cond, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={dynamicStyles.conditionItem}
                                    onPress={() => toggleCondition(index)}
                                >
                                    <View style={[
                                        dynamicStyles.conditionCheckbox,
                                        cond.selected && dynamicStyles.conditionCheckboxSelected,
                                    ]}>
                                        {cond.selected && (
                                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                        )}
                                    </View>
                                    <Text style={[
                                        dynamicStyles.conditionLabel,
                                        cond.selected && dynamicStyles.conditionLabelSelected,
                                    ]}>
                                        {translateConditionLabel(cond.label)}
                                    </Text>
                                </TouchableOpacity>
                            ))}

                            {/* ─── Document Uploads ─── */}
                            <View style={dynamicStyles.sectionCard}>
                                <Text style={dynamicStyles.sectionTitle}>{t('insurance.document_preview')}</Text>

                                <Text style={dynamicStyles.docSubTitle}>Aadhaar Card</Text>
                                <TouchableOpacity
                                    style={[dynamicStyles.uploadCard, aadhaarUri && dynamicStyles.uploadCardActive]}
                                    activeOpacity={0.7}
                                    onPress={() => handleUploadDocument('aadhaar')}
                                >
                                    {aadhaarUri ? (
                                        <View style={dynamicStyles.uploadedPreview}>
                                            <Image source={{ uri: aadhaarUri }} style={dynamicStyles.docThumb} />
                                            <View style={dynamicStyles.uploadedInfo}>
                                                <Text style={dynamicStyles.docSelectedText}>Aadhaar Selected</Text>
                                                <TouchableOpacity onPress={() => setAadhaarUri(null)}>
                                                    <Text style={dynamicStyles.removeText}>Change</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <Ionicons name="checkmark-circle" size={24} color="#048357" />
                                        </View>
                                    ) : (
                                        <View style={dynamicStyles.uploadPlaceholder}>
                                            <Ionicons name="cloud-upload-outline" size={24} color="#048357" />
                                            <Text style={dynamicStyles.uploadPlaceholderText}>{t('insurance.upload_aadhaar')}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <Text style={[dynamicStyles.docSubTitle, { marginTop: 14 }]}>PAN Card</Text>
                                <TouchableOpacity
                                    style={[dynamicStyles.uploadCard, panUri && dynamicStyles.uploadCardActive]}
                                    activeOpacity={0.7}
                                    onPress={() => handleUploadDocument('pan')}
                                >
                                    {panUri ? (
                                        <View style={dynamicStyles.uploadedPreview}>
                                            <Image source={{ uri: panUri }} style={dynamicStyles.docThumb} />
                                            <View style={dynamicStyles.uploadedInfo}>
                                                <Text style={dynamicStyles.docSelectedText}>PAN Card Selected</Text>
                                                <TouchableOpacity onPress={() => setPanUri(null)}>
                                                    <Text style={dynamicStyles.removeText}>Change</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <Ionicons name="checkmark-circle" size={24} color="#048357" />
                                        </View>
                                    ) : (
                                        <View style={dynamicStyles.uploadPlaceholder}>
                                            <Ionicons name="cloud-upload-outline" size={24} color="#048357" />
                                            <Text style={dynamicStyles.uploadPlaceholderText}>{t('insurance.upload_pan')}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
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

                             {/* ─── Requirements Text Area ─── */}
                            <Text style={dynamicStyles.requirementsLabel}>{t('insurance.requirements_label')}</Text>
                            <View style={dynamicStyles.textAreaCard}>
                                <TextInput
                                    style={dynamicStyles.textArea}
                                    placeholder={t('insurance.requirements_placeholder')}
                                    placeholderTextColor="#AAAEAC"
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    value={requirements}
                                    onChangeText={setRequirements}
                                />
                            </View>

                            {/* ─── Submit Button ─── */}
                            <View style={dynamicStyles.submitContainer}>
                                <TouchableOpacity
                                    style={[dynamicStyles.submitButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                                    activeOpacity={0.8}
                                    disabled={isBooking || isLoadingInit}
                                    onPress={handleBookService}
                                >
                                    {isLoadingInit ? (
                                        <Text style={dynamicStyles.submitButtonText}>{t('common.initializing')}</Text>
                                    ) : isBooking ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={dynamicStyles.submitButtonText}>{t('insurance.submit_request')}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAwareScrollView>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357',
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FAF7ED',
        textAlign: 'left', marginLeft: 12,
        letterSpacing: -0.24,
    },

    /* ─── Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: isDarkMode ? '#0F172A' : '#FAF7ED',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 17,
        paddingTop: 28,
        paddingBottom: 40,
    },

    /* ─── Form Wrapper (Figma Rectangle 157) ─── */
    formWrapper: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED',
        borderRadius: 14,
        padding: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },

    /* ─── Page Title ─── */
    pageTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: isDarkMode ? '#F1F5F9' : '#555555',
        textAlign: 'left',
        marginBottom: 6,
        letterSpacing: -0.24,
    },
    pageSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: isDarkMode ? '#94A3B8' : '#777777',
        textAlign: 'left',
        lineHeight: 16,
        marginBottom: 20,
    },

    /* ─── Who is it for? Section ─── */
    sectionCard: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFDFD',
        borderRadius: 12,
        padding: 14,
        marginBottom: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 10,
        letterSpacing: -0.24,
    },
    recipientRow: {
        flexDirection: 'row',
        gap: 10,
    },
    recipientButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDarkMode ? '#475569' : 'rgba(143,143,143,0.3)',
        gap: 4,
    },
    familyIcon: {
        width: 18,
        height: 18,
    },
    recipientButtonSelected: {
        borderColor: '#048357',
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
    },
    recipientText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: isDarkMode ? '#94A3B8' : '#555555',
    },
    recipientTextSelected: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: isDarkMode ? '#34D399' : '#02743F',
    },

    /* ─── Pre-existing Conditions ─── */
    conditionHeader: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 14,
        lineHeight: 20,
    },
    conditionSubHeader: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: isDarkMode ? '#94A3B8' : '#777777',
    },
    conditionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    conditionCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: isDarkMode ? '#475569' : '#DADADA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    conditionCheckboxSelected: {
        backgroundColor: '#048357',
        borderColor: '#048357',
    },
    conditionLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#CBD5E1' : '#555555',
    },
    conditionLabelSelected: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },

    /* ─── Requirements Text Area ─── */
    requirementsLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginTop: 12,
        marginBottom: 8,
    },
    textAreaCard: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFDFD',
        borderRadius: 10,
        borderWidth: 0.8,
        borderColor: isDarkMode ? '#334155' : 'rgba(143,143,143,0.2)',
        marginBottom: 20,
    },
    textArea: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        padding: 14,
        height: 102,
    },

    /* ─── Submit Button ─── */
    submitContainer: {
        alignItems: 'center',
    },
    submitButton: {
        width: 230,
        height: 45,
        backgroundColor: '#02743F',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FAF7ED',
    },
    familySelectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        gap: 8,
    },
    whoButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FAF7ED',
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDarkMode ? '#3A3A3A' : 'rgba(143,143,143,0.3)',
    },
    whoButtonActive: {
        borderWidth: 1.5,
        borderColor: '#02743F',
        backgroundColor: isDarkMode ? 'rgba(4, 131, 87, 0.15)' : 'rgba(4, 131, 87, 0.05)',
    },
    whoButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11,
        color: isDarkMode ? '#FFFFFF' : '#2F2F2F',
        marginLeft: 6,
    },
    whoIcon: {
        width: 14,
        height: 14,
    },
    addMemberBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : 'rgba(4, 131, 87, 0.3)',
        borderRadius: 8,
        marginTop: 8,
        gap: 6,
    },
    addMemberText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11,
        color: '#048357',
    },
    addMemberForm: {
        marginTop: 10,
        padding: 12,
        backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
        borderRadius: 10,
        borderWidth: 0.8,
        borderColor: isDarkMode ? '#334155' : '#E2E8F0',
    },
    addMemberInput: {
        height: 38,
        borderWidth: 0.8,
        borderColor: isDarkMode ? '#334155' : '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        backgroundColor: isDarkMode ? '#0F172A' : '#FAF7ED',
    },
    uploadCard: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: isDarkMode ? '#475569' : '#AAAEAC',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED',
        minHeight: 56,
        marginTop: 6,
    },
    uploadCardActive: {
        borderColor: '#048357',
        backgroundColor: isDarkMode ? 'rgba(4, 131, 87, 0.1)' : '#F0FFF4',
        borderStyle: 'solid',
    },
    uploadPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    uploadPlaceholderText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#94A3B8' : '#555555',
    },
    uploadedPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    docThumb: {
        width: 40,
        height: 40,
        borderRadius: 4,
        marginRight: 10,
    },
    uploadedInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    docSelectedText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },
    removeText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#FF6B6B',
        marginTop: 2,
    },
    docSubTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#94A3B8' : '#555555',
        marginTop: 10,
        marginLeft: 2,
    },
});

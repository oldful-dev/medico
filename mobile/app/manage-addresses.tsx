import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator, ScrollView, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { userService, Address } from '@/services/api/userService';
import { locationService } from '@/services/device/locationService';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';

const LABEL_OPTIONS = ['Home', 'Office', 'Parents Home', 'Other'];

// Parse address components from full address string (from Google Maps)
const parseAddressComponents = async (address: string, coords?: { lat: number; lng: number }) => {
    const parts: { city?: string; state?: string; pincode?: string } = {};

    // Try native geocoding first for more structured data
    if (coords) {
        try {
            const results = await Location.reverseGeocodeAsync({
                latitude: coords.lat,
                longitude: coords.lng,
            });

            if (results.length > 0) {
                const addr = results[0];
                if (addr.city) parts.city = addr.city;
                if (addr.region) parts.state = addr.region;
                if (addr.postalCode) parts.pincode = addr.postalCode;
            }
        } catch (error) {
            console.warn('Native geocoding failed:', error);
        }
    }

    // Extract pincode from address string (6-digit pattern)
    if (!parts.pincode) {
        const pincodeMatch = address.match(/\b(\d{6})\b/);
        if (pincodeMatch) parts.pincode = pincodeMatch[1];
    }

    // Parse address string to extract city and state (works for Google formatted addresses)
    // Format: "Street, Area, City, State Pincode, Country"
    const addressParts = address.split(',').map(s => s.trim());

    // If we don't have city, try to extract from address parts
    if (!parts.city && addressParts.length > 1) {
        // Usually city is 2-3 parts from the end (before state/pincode/country)
        parts.city = addressParts[Math.max(0, addressParts.length - 3)];
    }

    // If we don't have state, try to extract
    if (!parts.state && addressParts.length > 1) {
        // State is often before pincode
        const stateIndex = addressParts.length - 2;
        if (stateIndex > 0) {
            const stateCandidate = addressParts[stateIndex];
            // Remove pincode if it's in this part
            parts.state = stateCandidate.replace(/\d{6}/, '').trim();
        }
    }

    return parts;
};

export default function ManageAddressesScreen() {
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const colors = useThemeColors();
    const { t } = useTranslation();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Location detection
    const [detectedAddress, setDetectedAddress] = useState<string>('');
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [locationDetectionAttempted, setLocationDetectionAttempted] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);

    // Form state
    const [newLabel, setNewLabel] = useState('');
    const [newLine1, setNewLine1] = useState('');
    const [newLine2, setNewLine2] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newState, setNewState] = useState('');
    const [newPincode, setNewPincode] = useState('');
    const [newLandmark, setNewLandmark] = useState('');
    const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);

    const addresses: Address[] = profile?.addresses || [];

    // Helper to translate address label
    const getTranslatedLabel = (label: string) => {
        if (!label) return '';
        const key = `manage_addresses.labels.${label.toLowerCase().replace(/\s+/g, '_')}`;
        return t(key, { defaultValue: label });
    };

    // Auto-detect location on first load
    React.useEffect(() => {
        if (!locationDetectionAttempted) {
            detectLocation();
        }
    }, []);

    // Refetch profile on focus to pick up changes
    useFocusEffect(
        useCallback(() => {
            const refetch = async () => {
                try {
                    const res = await userService.getProfile();
                    if (res.success && res.data) setProfile(res.data);
                } catch { }
            };
            refetch();
        }, [setProfile])
    );

    // Auto-detect current location (Swiggy/Zomato style)
    const detectLocation = async () => {
        setDetectingLocation(true);
        setLocationDetectionAttempted(true);
        try {
            const hasPermission = await locationService.requestPermission();
            if (hasPermission) {
                const coords = await locationService.getCurrentLocation();
                const address = await locationService.getAddressFromCoordinates(coords);
                setDetectedAddress(address);
                setDetectedCoords({ lat: coords.latitude, lng: coords.longitude });
            }
        } catch (err) {
            console.warn('Location detection failed:', err);
        } finally {
            setDetectingLocation(false);
        }
    };

    // Handle location picker confirmation
    const handleLocationConfirmed = async (location: {
        placeId: string;
        description: string;
        latitude: number;
        longitude: number;
        address: string;
    }) => {
        const fullAddress = location.address || location.description;
        setDetectedAddress(fullAddress);
        setDetectedCoords({ lat: location.latitude, lng: location.longitude });
        setShowLocationPicker(false);

        // Auto-fill form with picked location and extract components
        setNewLine1(location.description);
        setNewLine2('');

        const components = await parseAddressComponents(fullAddress, {
            lat: location.latitude,
            lng: location.longitude,
        });
        setNewCity(components.city || '');
        setNewState(components.state || '');
        setNewPincode(components.pincode || '');
    };

    const resetForm = () => {
        setNewLabel('');
        setNewLine1('');
        setNewLine2('');
        setNewCity('');
        setNewState('');
        setNewPincode('');
        setNewLandmark('');
        setShowAddForm(false);
        setEditingId(null);
    };

    const startEdit = (address: Address) => {
        setEditingId(address.id || null);
        setNewLabel(address.label || '');
        setNewLine1(address.line1);
        setNewLine2(address.line2 || '');
        setNewCity(address.cityName);
        setNewState(address.state);
        setNewPincode(address.pincode);
        setNewLandmark(address.landmark || '');
        setDetectedAddress(''); // Clear detected address when editing
        setShowAddForm(true);
    };

    const startAddFromDetected = async () => {
        setEditingId(null);
        setNewLabel('Home');
        setNewLine1(detectedAddress);
        setNewLine2('');

        // Auto-populate city, state, pincode from detected address
        const components = await parseAddressComponents(detectedAddress, detectedCoords || undefined);
        setNewCity(components.city || '');
        setNewState(components.state || '');
        setNewPincode(components.pincode || '');
        setNewLandmark('');
        setShowAddForm(true);
    };

    const saveAddress = async () => {
        if (!newLabel.trim() || !newLine1.trim() || !newCity.trim() || !newState.trim() || !newPincode.trim()) {
            Alert.alert(t('manage_addresses.alerts.missing_info_title'), t('manage_addresses.alerts.missing_info_msg'));
            return;
        }
        if (!profile?.id) return;
        setSaving(true);
        try {
            const addressData = {
                label: newLabel.trim(),
                line1: newLine1.trim(),
                line2: newLine2.trim() || undefined,
                cityName: newCity.trim(),
                state: newState.trim(),
                pincode: newPincode.trim(),
                landmark: newLandmark.trim() || undefined,
                isDefault: addresses.length === 0,
            };

            let res;
            if (editingId) {
                res = await userService.updateAddress(profile.id, editingId, addressData);
            } else {
                res = await userService.addAddress(profile.id, addressData);
            }

            if (res.success) {
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) setProfile(profileRes.data);
                resetForm();
                Alert.alert(t('manage_addresses.alerts.success_title'), editingId ? t('manage_addresses.alerts.address_updated') : t('manage_addresses.alerts.address_added'));
            } else {
                Alert.alert(t('manage_addresses.alerts.error_title'), res.message || t('manage_addresses.alerts.failed_save'));
            }
        } catch (err: any) {
            Alert.alert(t('manage_addresses.alerts.error_title'), err.message || t('manage_addresses.alerts.something_went_wrong'));
        } finally {
            setSaving(false);
        }
    };

    const deleteAddress = async (address: Address) => {
        if (!profile?.id || !address.id) return;
        Alert.alert(
            t('manage_addresses.alerts.delete_confirm_title'),
            t('manage_addresses.alerts.delete_confirm_msg'),
            [
                { text: t('manage_addresses.cancel'), style: 'cancel' },
                {
                    text: t('manage_addresses.alerts.delete_btn'),
                    style: 'destructive',
                    onPress: async () => {
                        if (!profile?.id || !address.id) return;
                        try {
                            await userService.deleteAddress(profile.id, address.id);
                            const profileRes = await userService.getProfile();
                            if (profileRes.success && profileRes.data) setProfile(profileRes.data);
                            Alert.alert(t('manage_addresses.alerts.success_title'), t('manage_addresses.alerts.address_deleted'));
                        } catch (err: any) {
                            Alert.alert(t('manage_addresses.alerts.error_title'), err.message || t('manage_addresses.alerts.failed_delete'));
                        }
                    },
                },
            ]
        );
    };

    const setDefault = async (address: Address) => {
        if (!profile?.id || !address.id) return;
        try {
            await userService.updateAddress(profile.id, address.id, { isDefault: true });
            const profileRes = await userService.getProfile();
            if (profileRes.success && profileRes.data) setProfile(profileRes.data);
        } catch (err: any) {
            Alert.alert(t('manage_addresses.alerts.error_title'), err.message || t('manage_addresses.alerts.failed_update'));
        }
    };

    const dynamicStyles = useMemo(() => StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.primary },
        headerSafe: { backgroundColor: colors.primary },
        scrollView: { flex: 1, backgroundColor: colors.bgScreen, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
        detectCard: {
            backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, overflow: 'hidden',
            shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
        },
        detectIconContainer: {
            width: 48, height: 48, borderRadius: 24, backgroundColor: `${colors.primary}15`,
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        },
        detectTitle: {
            fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
            fontSize: 15, color: colors.textDark, marginBottom: 2,
        },
        detectSubtitle: {
            fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
            fontSize: 13, color: colors.primary, fontWeight: '500',
        },
        detectAddBtn: {
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12,
        },
        detectSearchBtn: {
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, paddingVertical: 12,
        },
        detectSearchBtnText: {
            fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
            fontSize: 14, color: colors.primary,
        },
        emptyTitle: {
            fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
            fontSize: 18, color: colors.textDark, marginTop: 14,
        },
        emptyDesc: {
            fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
            fontSize: 14, color: colors.textMuted, marginTop: 4,
        },
        savedAddressesTitle: {
            fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
            fontSize: 15, color: colors.textDark, marginBottom: 12, marginTop: 8,
        },
        card: {
            backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 12,
            shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
        },
        cardDefault: { borderWidth: 1.5, borderColor: colors.primary },
        labelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
        addressText: {
            fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
            fontSize: 14, color: colors.textBody, lineHeight: 20, marginBottom: 4,
        },
        phoneText: {
            fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
            fontSize: 13, color: colors.textMuted, marginBottom: 10,
        },
        actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
        actionBtnText: {
            fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
            fontSize: 12, color: colors.primary,
        },
        addForm: {
            backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 14,
            shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
        },
        formTitle: {
            fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
            fontSize: 18, color: colors.textDark, marginBottom: 16,
        },
        fieldLabel: {
            fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
            fontSize: 13, color: colors.textDark, marginBottom: 8, marginTop: 12,
        },
        labelChip: {
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight,
            backgroundColor: colors.bgCard, marginHorizontal: 2,
        },
        labelChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        labelChipText: {
            fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
            fontSize: 13, color: colors.textMuted,
        },
        input: {
            backgroundColor: colors.bgCardMuted, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
            fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
            fontSize: 14, color: colors.textDark, borderWidth: 1, borderColor: colors.borderLight,
        },
        mapBtn: {
            width: 44, height: 44, borderRadius: 10, backgroundColor: `${colors.primary}15`,
            alignItems: 'center', justifyContent: 'center', marginTop: 2,
        },
        cancelFormBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
        cancelFormText: {
            fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
            fontSize: 14, color: colors.textMuted,
        },
        saveFormBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.primary },
        addButton: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
            backgroundColor: `${colors.primary}15`, marginTop: 16,
        },
        addButtonText: {
            fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
            fontSize: 15, color: colors.primary,
        },
    }), [colors]);

    return (
        <View style={dynamicStyles.screen}>
            <StatusBar style="light" />
            <SafeAreaView style={dynamicStyles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.textWhite }]}>{t('manage_addresses.header_title')}</Text>
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView style={dynamicStyles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">

                {/* ═════════════════════════════════════════
                    AUTO-DETECT LOCATION SECTION (Like Swiggy/Zomato)
                   ═════════════════════════════════════════ */}
                {!showAddForm && (
                    <View style={styles.detectSection}>
                        <View style={dynamicStyles.detectCard}>
                            <View style={styles.detectHeader}>
                                <View style={dynamicStyles.detectIconContainer}>
                                    {detectingLocation ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <Ionicons name="location" size={22} color={colors.primary} />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={dynamicStyles.detectTitle}>{t('manage_addresses.detect_current_location')}</Text>
                                    {detectedAddress ? (
                                        <Text style={dynamicStyles.detectSubtitle} numberOfLines={1}>{detectedAddress}</Text>
                                    ) : (
                                        <Text style={styles.detectSubtitleEmpty}>
                                            {detectingLocation ? t('manage_addresses.finding_location') : t('manage_addresses.tap_to_detect')}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={detectLocation}
                                    disabled={detectingLocation}
                                    style={styles.detectRefreshBtn}
                                >
                                    <Ionicons name="refresh" size={18} color={colors.primary} />
                                </TouchableOpacity>
                            </View>

                            {detectedAddress && !showAddForm && (
                                <View style={styles.detectActions}>
                                    <TouchableOpacity
                                        style={dynamicStyles.detectAddBtn}
                                        onPress={startAddFromDetected}
                                    >
                                        <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                                        <Text style={styles.detectAddBtnText}>{t('manage_addresses.save_this_address')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={dynamicStyles.detectSearchBtn}
                                        onPress={() => setShowLocationPicker(true)}
                                    >
                                        <Ionicons name="search" size={18} color={colors.primary} />
                                        <Text style={dynamicStyles.detectSearchBtnText}>{t('manage_addresses.search_location')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {!detectedAddress && locationDetectionAttempted && !showAddForm && (
                                <TouchableOpacity
                                    style={dynamicStyles.detectSearchBtn}
                                    onPress={() => setShowLocationPicker(true)}
                                >
                                    <Ionicons name="search" size={18} color={colors.primary} />
                                    <Text style={dynamicStyles.detectSearchBtnText}>{t('manage_addresses.search_pick_location')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* ═════════════════════════════════════════
                    SAVED ADDRESSES
                   ═════════════════════════════════════════ */}
                {addresses.length === 0 && !showAddForm && (
                    <View style={styles.emptyState}>
                        <Ionicons name="bookmark-outline" size={56} color="#AAAEAC" />
                        <Text style={dynamicStyles.emptyTitle}>{t('manage_addresses.no_saved_addresses')}</Text>
                        <Text style={dynamicStyles.emptyDesc}>{t('manage_addresses.start_by_detecting')}</Text>
                    </View>
                )}

                {addresses.length > 0 && <Text style={dynamicStyles.savedAddressesTitle}>{t('manage_addresses.saved_addresses')}</Text>}

                {addresses.map((item) => (
                    <View key={item.id} style={[dynamicStyles.card, item.isDefault && dynamicStyles.cardDefault]}>
                        <View style={styles.cardHeader}>
                            <View style={dynamicStyles.labelBadge}>
                                <Ionicons
                                    name={
                                        item.label === 'Home' ? 'home' :
                                        item.label === 'Office' ? 'briefcase' :
                                        item.label === 'Parents Home' ? 'people' :
                                        'location'
                                    }
                                    size={16} color="#FFFFFF"
                                />
                                <Text style={styles.labelText}>{getTranslatedLabel(item.label)}</Text>
                            </View>
                            {item.isDefault && (
                                <View style={styles.defaultBadge}>
                                    <Text style={styles.defaultBadgeText}>{t('manage_addresses.default_badge')}</Text>
                                </View>
                            )}
                        </View>

                        <Text style={dynamicStyles.addressText}>
                            {[item.line1, item.line2, item.landmark].filter(Boolean).join(', ')}
                        </Text>
                        <Text style={dynamicStyles.phoneText}>{item.cityName}, {item.state} — {item.pincode}</Text>

                        <View style={styles.cardActions}>
                            {!item.isDefault && (
                                <TouchableOpacity style={dynamicStyles.actionBtn} onPress={() => setDefault(item)}>
                                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                                    <Text style={dynamicStyles.actionBtnText}>{t('manage_addresses.set_default')}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={dynamicStyles.actionBtn} onPress={() => startEdit(item)}>
                                <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                                    <Text style={dynamicStyles.actionBtnText}>{t('manage_addresses.edit')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[dynamicStyles.actionBtn, styles.deleteBtn]} onPress={() => deleteAddress(item)}>
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                <Text style={[dynamicStyles.actionBtnText, { color: '#EF4444' }]}>{t('manage_addresses.delete')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {showAddForm && (
                    <View style={dynamicStyles.addForm}>
                        <Text style={dynamicStyles.formTitle}>{editingId ? t('manage_addresses.edit_address') : t('manage_addresses.save_address_title')}</Text>

                        {/* Label Selection */}
                        <Text style={dynamicStyles.fieldLabel}>{t('manage_addresses.address_label')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.labelChips}>
                            {LABEL_OPTIONS.map((label) => (
                                <TouchableOpacity
                                    key={label}
                                    style={[dynamicStyles.labelChip, newLabel === label && dynamicStyles.labelChipActive]}
                                    onPress={() => setNewLabel(label)}
                                >
                                    <Text style={[dynamicStyles.labelChipText, newLabel === label && styles.labelChipTextActive]}>
                                        {getTranslatedLabel(label)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Address Fields */}
                        <Text style={dynamicStyles.fieldLabel}>{t('manage_addresses.address_line1')}</Text>
                        <View style={styles.inputWithButton}>
                            <TextInput
                                style={[dynamicStyles.input, { flex: 1 }]}
                                placeholder={t('manage_addresses.street_address_placeholder')}
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={2}
                                value={newLine1}
                                onChangeText={setNewLine1}
                            />
                            <TouchableOpacity
                                style={dynamicStyles.mapBtn}
                                onPress={() => setShowLocationPicker(true)}
                            >
                                <Ionicons name="map" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={dynamicStyles.fieldLabel}>{t('manage_addresses.address_line2')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            placeholder={t('manage_addresses.apartment_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={newLine2}
                            onChangeText={setNewLine2}
                        />

                        <View style={styles.twoColRow}>
                            <View style={styles.twoColField}>
                                <Text style={dynamicStyles.fieldLabel}>{t('manage_addresses.city_label')}</Text>
                                <TextInput
                                    style={dynamicStyles.input}
                                    placeholder={t('manage_addresses.city_placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                    value={newCity}
                                    onChangeText={setNewCity}
                                />
                            </View>
                            <View style={styles.twoColField}>
                                <Text style={dynamicStyles.fieldLabel}>{t('manage_addresses.state_label')}</Text>
                                <TextInput
                                    style={dynamicStyles.input}
                                    placeholder={t('manage_addresses.state_placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                    value={newState}
                                    onChangeText={setNewState}
                                />
                            </View>
                        </View>

                        <Text style={dynamicStyles.fieldLabel}>{t('manage_addresses.pincode_label')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            placeholder={t('manage_addresses.pincode_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            maxLength={6}
                            value={newPincode}
                            onChangeText={setNewPincode}
                        />

                        <Text style={dynamicStyles.fieldLabel}>{t('manage_addresses.landmark_label')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            placeholder={t('manage_addresses.landmark_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={newLandmark}
                            onChangeText={setNewLandmark}
                        />

                        <View style={styles.formActions}>
                            <TouchableOpacity style={dynamicStyles.cancelFormBtn} onPress={resetForm}>
                                <Text style={dynamicStyles.cancelFormText}>{t('manage_addresses.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[dynamicStyles.saveFormBtn, saving && { opacity: 0.6 }]}
                                onPress={saveAddress}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.saveFormText}>{editingId ? t('manage_addresses.update') : t('manage_addresses.save')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {!showAddForm && (
                    <TouchableOpacity
                        style={dynamicStyles.addButton}
                        onPress={() => {
                            setEditingId(null);
                            setNewLabel('Home');
                            setNewLine1('');
                            setNewLine2('');
                            setNewCity('');
                            setNewState('');
                            setNewPincode('');
                            setNewLandmark('');
                            setShowAddForm(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                        <Text style={dynamicStyles.addButtonText}>{t('manage_addresses.add_new_address')}</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 30 }} />
            </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

            {/* Location Picker Modal */}
            <LocationPickerModal
                visible={showLocationPicker}
                onClose={() => setShowLocationPicker(false)}
                onLocationConfirmed={handleLocationConfirmed}
                initialLat={detectedCoords?.lat}
                initialLng={detectedCoords?.lng}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#048357' },
    headerSafe: { backgroundColor: '#048357' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20, color: '#FFFFFF', flex: 1,
    },
    scrollView: { flex: 1, backgroundColor: '#FFFFE3', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    scrollContent: { padding: 16, paddingBottom: 50 },

    // ─── Auto-Detect Section (Swiggy/Zomato Style) ───
    detectSection: { marginBottom: 24 },
    detectCard: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    detectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    detectIconContainer: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    detectTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15, color: '#2F2F2F', marginBottom: 2,
    },
    detectSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13, color: '#048357', fontWeight: '500',
    },
    detectSubtitleEmpty: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: '#898989',
    },
    detectRefreshBtn: { padding: 6 },
    detectActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    detectAddBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#048357', borderRadius: 10, paddingVertical: 12,
    },
    detectAddBtnText: {
        fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
        fontSize: 14, color: '#FFFFFF',
    },
    detectSearchBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1.5, borderColor: '#048357', borderRadius: 10, paddingVertical: 12,
    },
    detectSearchBtnText: {
        fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
        fontSize: 14, color: '#048357',
    },

    // ─── Empty State ───
    emptyState: { alignItems: 'center', marginTop: 40, marginBottom: 30 },
    emptyTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18, color: '#2F2F2F', marginTop: 14,
    },
    emptyDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: '#898989', marginTop: 4,
    },

    // ─── Saved Addresses Section ───
    savedAddressesTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15, color: '#2F2F2F', marginBottom: 12, marginTop: 8,
    },

    // ─── Address Cards ───
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    cardDefault: { borderWidth: 1.5, borderColor: '#048357' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    labelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#048357', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
    labelText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 13, color: '#FFFFFF',
    },
    defaultBadge: { backgroundColor: '#048357', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    defaultBadgeText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11, color: '#FFFFFF',
    },
    addressText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: '#555555', lineHeight: 20, marginBottom: 4,
    },
    phoneText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13, color: '#898989', marginBottom: 10,
    },
    cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
    deleteBtn: { borderColor: '#FFE0E0' },
    actionBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12, color: '#048357',
    },

    // ─── Form ───
    addForm: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    formTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18, color: '#2F2F2F', marginBottom: 16,
    },
    fieldLabel: {
        fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
        fontSize: 13, color: '#2F2F2F', marginBottom: 8, marginTop: 12,
    },
    labelChips: { marginBottom: 12, marginHorizontal: -2 },
    labelChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5E5',
        backgroundColor: '#FFFFFF', marginHorizontal: 2,
    },
    labelChipActive: { backgroundColor: '#048357', borderColor: '#048357' },
    labelChipText: {
        fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
        fontSize: 13, color: '#555555',
    },
    labelChipTextActive: { color: '#FFFFFF' },
    inputWithButton: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    input: {
        backgroundColor: '#F9F9F9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: '#2F2F2F', borderWidth: 1, borderColor: '#E5E5E5',
    },
    mapBtn: {
        width: 44, height: 44, borderRadius: 10, backgroundColor: '#E8F5E9',
        alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    twoColRow: { flexDirection: 'row', gap: 10 },
    twoColField: { flex: 1 },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    cancelFormBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
    cancelFormText: {
        fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
        fontSize: 14, color: '#555555',
    },
    saveFormBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#048357' },
    saveFormText: {
        fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
        fontSize: 14, color: '#FFFFFF',
    },

    // ─── Add Button ───
    addButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#048357',
        backgroundColor: '#F0FFF4', marginTop: 16,
    },
    addButtonText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15, color: '#048357',
    },
});

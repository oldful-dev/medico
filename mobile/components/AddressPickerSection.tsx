import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
    TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAddress } from '@/context/AddressContext';
import { LocationPickerModal } from './LocationPickerModal';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from 'react-i18next';

export interface AddressData {
    line1: string;
    line2?: string;
    cityName: string;
    pincode: string;
    landmark?: string;
    latitude: number;
    longitude: number;
    placeId?: string;
    id?: string;
    fullName?: string;
    phone?: string;
    state?: string;
    country?: string;
}

export interface AddressPickerSectionProps {
    // Address state
    selectedAddress: AddressData | null;
    onAddressChange: (address: AddressData) => void;

    // Serviceability check (optional)
    showServiceabilityCheck?: boolean;
    serviceabilityStatus?: 'unchecked' | 'checking' | 'serviceable' | 'non-serviceable';
    onServiceabilityChange?: (status: 'unchecked' | 'checking' | 'serviceable' | 'non-serviceable') => void;
    checkServiceabilityFn?: (lat: string, lng: string) => Promise<boolean>;

    // Additional fields (phone, landmark)
    phoneNumber?: string;
    onPhoneChange?: (phone: string) => void;
    landmark?: string;
    onLandmarkChange?: (landmark: string) => void;

    // Customization
    title?: string;
    showPhoneField?: boolean;
    showLandmarkField?: boolean;
    allowManualEntry?: boolean;
    initialLat?: number;
    initialLng?: number;

    // When true (default), a selection made here also updates the
    // centralized AddressContext (selectActiveAddress), so it's remembered
    // as the app's active location beyond just this screen's local state.
    // Set false for genuinely one-off, non-persisted address entry.
    syncToContext?: boolean;
}

export const AddressPickerSection = ({
    selectedAddress,
    onAddressChange,
    showServiceabilityCheck = false,
    serviceabilityStatus = 'unchecked',
    onServiceabilityChange,
    checkServiceabilityFn,
    phoneNumber = '',
    onPhoneChange,
    landmark = '',
    onLandmarkChange,
    title,
    showPhoneField = true,
    showLandmarkField = true,
    allowManualEntry = true,
    initialLat = 28.7041,
    initialLng = 77.1025,
    syncToContext = true,
}: AddressPickerSectionProps) => {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t('location_picker.delivery_address');
    const { defaultAddress, savedAddresses, selectActiveAddress, detectCurrentLocationSnapshot } = useAddress();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [locationPickerVisible, setLocationPickerVisible] = useState(false);
    const [manualPincodeInput, setManualPincodeInput] = useState(selectedAddress?.pincode || '');

    // Dynamic color tokens
    const primaryGreen = colors.primaryDark;
    const textDark = colors.textDark;
    const textMuted = colors.textMuted;
    const cardBorder = colors.borderLight;
    const lightGreenBg = isDarkMode ? 'rgba(4, 131, 87, 0.15)' : '#F0FDF4';

    const styles = makeStyles(isDarkMode, colors, primaryGreen, textDark, textMuted, cardBorder, lightGreenBg);

    // Auto-fill from the centralized default address (primary option) —
    // reads from AddressContext instead of independently re-deriving
    // "default" from profile.addresses here, which was previously
    // duplicated in 14+ places across the app.
    const handleAutoFillAddress = useCallback(() => {
        if (!savedAddresses.length) {
            Alert.alert(t('location_picker.no_saved_addresses_title'), t('location_picker.no_saved_addresses_message'));
            return;
        }

        const defaultAddr = defaultAddress || savedAddresses[0];
        if (defaultAddr) {
            const addressData: AddressData = {
                id: defaultAddr.id,
                line1: defaultAddr.line1 || '',
                line2: defaultAddr.line2,
                cityName: defaultAddr.cityName || '',
                pincode: defaultAddr.pincode || '',
                landmark: defaultAddr.landmark,
                latitude: defaultAddr.latitude || initialLat,
                longitude: defaultAddr.longitude || initialLng,
                state: defaultAddr.state,
            };
            onAddressChange(addressData);
            setManualPincodeInput(defaultAddr.pincode || '');
            if (syncToContext) {
                selectActiveAddress(defaultAddr);
            }

            // Check serviceability if enabled
            if (showServiceabilityCheck && onServiceabilityChange && checkServiceabilityFn) {
                onServiceabilityChange('checking');
                checkServiceabilityFn(String(addressData.latitude), String(addressData.longitude));
            }
        }
    }, [savedAddresses, defaultAddress, onAddressChange, syncToContext, selectActiveAddress, showServiceabilityCheck, onServiceabilityChange, checkServiceabilityFn, initialLat, initialLng, t]);

    // GPS location detection (secondary option) — routed through
    // AddressContext.detectCurrentLocationSnapshot so this uses the same
    // GPS + reverse-geocode funnel as every other GPS trigger in the app,
    // instead of its own independent copy of that sequence.
    const handleDetectLocation = useCallback(async () => {
        setDetectingLocation(true);
        try {
            const snapshot = await detectCurrentLocationSnapshot();
            if (!snapshot) {
                throw new Error(t('location_picker.unable_to_detect'));
            }

            const addressData: AddressData = {
                line1: snapshot.line1,
                cityName: snapshot.cityName,
                pincode: snapshot.pincode || '',
                landmark: '',
                latitude: snapshot.latitude,
                longitude: snapshot.longitude,
                state: snapshot.state,
            };

            onAddressChange(addressData);
            setManualPincodeInput(snapshot.pincode || '');
            if (syncToContext) {
                selectActiveAddress({ ...snapshot, isTemporary: true });
            }

            // Check serviceability if enabled
            if (showServiceabilityCheck && onServiceabilityChange && checkServiceabilityFn) {
                onServiceabilityChange('checking');
                await checkServiceabilityFn(String(snapshot.latitude), String(snapshot.longitude));
            }

            Alert.alert(t('location_picker.success_title'), t('location_picker.location_detected'));
        } catch (error: any) {
            Alert.alert(t('location_picker.location_error_title'), error.message || t('location_picker.unable_to_detect'));
            console.error('Location detection failed:', error);
        } finally {
            setDetectingLocation(false);
        }
    }, [detectCurrentLocationSnapshot, onAddressChange, syncToContext, selectActiveAddress, showServiceabilityCheck, onServiceabilityChange, checkServiceabilityFn, t]);

    // Google Maps location picker (tertiary option)
    const handleLocationConfirmed = useCallback((location: any) => {
        const address = location.address || location.description || '';

        // Parse address to extract components
        const parts = address.split(',').map((p: string) => p.trim());
        const pincode = address.match(/\b\d{6}\b/)?.[0] || '';
        const cityName = parts[parts.length - 2] || '';
        const line1 = parts.slice(0, -2).join(', ') || address;

        const addressData: AddressData = {
            line1,
            cityName,
            pincode: pincode,
            landmark: '',
            latitude: location.latitude,
            longitude: location.longitude,
            placeId: location.placeId,
        };

        onAddressChange(addressData);
        setManualPincodeInput(pincode);
        if (syncToContext) {
            selectActiveAddress({ ...addressData, isTemporary: true, state: addressData.state || '' });
        }

        // Check serviceability if enabled
        if (showServiceabilityCheck && onServiceabilityChange && checkServiceabilityFn) {
            onServiceabilityChange('checking');
            checkServiceabilityFn(String(location.latitude), String(location.longitude));
        }

        setLocationPickerVisible(false);
    }, [onAddressChange, syncToContext, selectActiveAddress, showServiceabilityCheck, onServiceabilityChange, checkServiceabilityFn]);

    // Handle manual pincode change
    const handlePincodeChange = useCallback((pincode: string) => {
        setManualPincodeInput(pincode);
        if (selectedAddress) {
            onAddressChange({
                ...selectedAddress,
                pincode,
            });
        }
    }, [selectedAddress, onAddressChange]);

    const getServiceabilityColor = () => {
        switch (serviceabilityStatus) {
            case 'serviceable':
                return '#10B981';
            case 'non-serviceable':
                return '#EF4444';
            case 'checking':
                return '#F59E0B';
            default:
                return textMuted;
        }
    };

    const getServiceabilityLabel = () => {
        switch (serviceabilityStatus) {
            case 'serviceable':
                return t('location_picker.available_location');
            case 'non-serviceable':
                return t('location_picker.not_available_location');
            case 'checking':
                return t('location_picker.checking_availability');
            default:
                return t('location_picker.location_not_verified');
        }
    };

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{resolvedTitle}</Text>

            {/* Option Buttons Row */}
            <View style={styles.optionsRow}>
                {savedAddresses.length > 0 && (
                    <TouchableOpacity
                        style={styles.optionBtn}
                        onPress={handleAutoFillAddress}
                    >
                        <Ionicons name="home-outline" size={16} color={isDarkMode ? '#34D399' : primaryGreen} />
                        <Text style={styles.optionBtnText}>{t('location_picker.my_address')}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.optionBtn}
                    onPress={handleDetectLocation}
                    disabled={detectingLocation}
                >
                    {detectingLocation ? (
                        <ActivityIndicator size={16} color={isDarkMode ? '#34D399' : primaryGreen} />
                    ) : (
                        <Ionicons name="locate-outline" size={16} color={isDarkMode ? '#34D399' : primaryGreen} />
                    )}
                    <Text style={styles.optionBtnText}>
                        {detectingLocation ? t('location_picker.detecting') : t('location_picker.my_location')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionBtn}
                    onPress={() => setLocationPickerVisible(true)}
                >
                    <Ionicons name="search-outline" size={16} color={isDarkMode ? '#34D399' : primaryGreen} />
                    <Text style={styles.optionBtnText}>{t('location_picker.search')}</Text>
                </TouchableOpacity>
            </View>

            {/* Selected Address Display */}
            {selectedAddress && (
                <View style={styles.addressDisplay}>
                    <Ionicons name="location" size={18} color={isDarkMode ? '#34D399' : primaryGreen} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.addressLine1}>{selectedAddress.line1}</Text>
                        <Text style={styles.addressSecondary}>
                            {selectedAddress.cityName}
                            {selectedAddress.pincode && ` • ${selectedAddress.pincode}`}
                        </Text>
                    </View>
                </View>
            )}

            {/* Serviceability Banner */}
            {showServiceabilityCheck && serviceabilityStatus !== 'unchecked' && (
                <View style={[styles.serviceabilityBanner, { borderLeftColor: getServiceabilityColor() }]}>
                    <Ionicons
                        name={
                            serviceabilityStatus === 'serviceable'
                                ? 'checkmark-circle'
                                : serviceabilityStatus === 'non-serviceable'
                                ? 'close-circle'
                                : 'time-outline'
                        }
                        size={16}
                        color={getServiceabilityColor()}
                    />
                    <Text style={[styles.serviceabilityText, { color: getServiceabilityColor() }]}>
                        {getServiceabilityLabel()}
                    </Text>
                </View>
            )}

            {/* Manual Fields */}
            {allowManualEntry && (
                <View style={styles.fieldsSection}>
                    {/* Pincode Field */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>{t('location_picker.pincode_label')}</Text>
                        <TextInput
                             style={styles.fieldInput}
                             placeholder={t('location_picker.pincode_placeholder')}
                             placeholderTextColor={textMuted}
                             maxLength={6}
                             keyboardType="numeric"
                             value={manualPincodeInput}
                             onChangeText={handlePincodeChange}
                        />
                    </View>

                    {/* Phone Number Field */}
                    {showPhoneField && onPhoneChange && (
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>{t('location_picker.contact_number_label')}</Text>
                            <View style={styles.phoneInputContainer}>
                                <Text style={styles.phonePrefix}>+91</Text>
                                <View style={styles.phoneDivider} />
                                <TextInput
                                    style={styles.phoneInput}
                                    placeholder={t('location_picker.contact_number_placeholder')}
                                    placeholderTextColor={textMuted}
                                    maxLength={10}
                                    keyboardType="phone-pad"
                                    value={phoneNumber.startsWith('+91') ? phoneNumber.slice(3) : phoneNumber}
                                    onChangeText={(val) => {
                                        const cleanVal = val.replace(/\D/g, '').slice(0, 10);
                                        onPhoneChange(cleanVal);
                                    }}
                                />
                            </View>
                        </View>
                    )}

                    {/* Landmark Field */}
                    {showLandmarkField && onLandmarkChange && (
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>{t('location_picker.landmark_label')}</Text>
                            <TextInput
                                style={styles.fieldInput}
                                placeholder={t('location_picker.landmark_placeholder')}
                                placeholderTextColor={textMuted}
                                value={landmark}
                                onChangeText={onLandmarkChange}
                            />
                        </View>
                    )}
                </View>
            )}

            {/* Location Picker Modal */}
            <LocationPickerModal
                visible={locationPickerVisible}
                onClose={() => setLocationPickerVisible(false)}
                onLocationConfirmed={handleLocationConfirmed}
                initialLat={selectedAddress?.latitude || initialLat}
                initialLng={selectedAddress?.longitude || initialLng}
            />
        </View>
    );
};

const makeStyles = (
    isDarkMode: boolean,
    colors: any,
    primaryGreen: string,
    textDark: string,
    textMuted: string,
    cardBorder: string,
    lightGreenBg: string
) => StyleSheet.create({
    card: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: 16,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: textDark,
        marginBottom: 12,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    optionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: lightGreenBg,
    },
    optionBtnText: {
        fontSize: 12,
        fontWeight: '500',
        color: isDarkMode ? '#34D399' : primaryGreen,
    },
    addressDisplay: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: lightGreenBg,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    addressLine1: {
        fontSize: 13,
        fontWeight: '500',
        color: textDark,
    },
    addressSecondary: {
        fontSize: 12,
        color: textMuted,
        marginTop: 2,
    },
    serviceabilityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB',
        borderLeftWidth: 3,
        marginBottom: 12,
    },
    serviceabilityText: {
        fontSize: 12,
        fontWeight: '500',
    },
    fieldsSection: {
        gap: 12,
    },
    field: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: textDark,
    },
    fieldInput: {
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: textDark,
        backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: cardBorder,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF',
    },
    phonePrefix: {
        fontSize: 13,
        fontWeight: '500',
        color: textDark,
        paddingRight: 8,
    },
    phoneDivider: {
        width: 1,
        height: 16,
        backgroundColor: cardBorder,
        marginRight: 8,
    },
    phoneInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 13,
        color: textDark,
        backgroundColor: 'transparent',
    },
});

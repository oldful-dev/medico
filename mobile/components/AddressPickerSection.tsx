import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
    TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/context/UserContext';
import { locationService } from '@/services/device/locationService';
import { LocationPickerModal } from './LocationPickerModal';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';
const LIGHT_GREEN_BG = '#F0FDF4';

export interface AddressData {
    line1: string;
    line2?: string;
    cityName: string;
    pincode: string;
    landmark?: string;
    latitude: number;
    longitude: number;
    placeId?: string;
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
    title = 'Delivery Address',
    showPhoneField = true,
    showLandmarkField = true,
    allowManualEntry = true,
    initialLat = 28.7041,
    initialLng = 77.1025,
}: AddressPickerSectionProps) => {
    const { profile } = useUser();
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [locationPickerVisible, setLocationPickerVisible] = useState(false);
    const [manualPincodeInput, setManualPincodeInput] = useState(selectedAddress?.pincode || '');

    // Auto-fill from profile address (primary option)
    const handleAutoFillAddress = useCallback(() => {
        if (!profile?.addresses?.length) {
            Alert.alert('No Saved Addresses', 'Please add an address in your profile first.');
            return;
        }

        const defaultAddr = profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0];
        if (defaultAddr) {
            const addressData: AddressData = {
                line1: defaultAddr.line1 || '',
                line2: defaultAddr.line2,
                cityName: defaultAddr.cityName || '',
                pincode: defaultAddr.pincode || '',
                landmark: defaultAddr.landmark,
                latitude: defaultAddr.latitude || initialLat,
                longitude: defaultAddr.longitude || initialLng,
            };
            onAddressChange(addressData);
            setManualPincodeInput(defaultAddr.pincode || '');

            // Check serviceability if enabled
            if (showServiceabilityCheck && onServiceabilityChange && checkServiceabilityFn) {
                onServiceabilityChange('checking');
                checkServiceabilityFn(String(addressData.latitude), String(addressData.longitude));
            }
        }
    }, [profile, onAddressChange, showServiceabilityCheck, onServiceabilityChange, checkServiceabilityFn, initialLat, initialLng]);

    // GPS location detection (secondary option)
    const handleDetectLocation = useCallback(async () => {
        setDetectingLocation(true);
        try {
            const coords = await locationService.getCurrentLocation();
            const address = await locationService.getAddressFromCoordinates(coords);
            const pincode = await locationService.getPincodeFromAddress(coords, address);

            // Parse address to extract components
            const parts = address.split(',').map(p => p.trim());
            const cityName = parts[parts.length - 2] || '';
            const line1 = parts.slice(0, -2).join(', ') || address;

            const addressData: AddressData = {
                line1,
                cityName,
                pincode: pincode || '',
                landmark: '',
                latitude: coords.latitude,
                longitude: coords.longitude,
            };

            onAddressChange(addressData);
            setManualPincodeInput(pincode || '');

            // Check serviceability if enabled
            if (showServiceabilityCheck && onServiceabilityChange && checkServiceabilityFn) {
                onServiceabilityChange('checking');
                await checkServiceabilityFn(String(coords.latitude), String(coords.longitude));
            }

            Alert.alert('Success', 'Your location has been detected.');
        } catch (error: any) {
            Alert.alert('Location Error', error.message || 'Unable to detect your location. Please search manually.');
            console.error('Location detection failed:', error);
        } finally {
            setDetectingLocation(false);
        }
    }, [onAddressChange, showServiceabilityCheck, onServiceabilityChange, checkServiceabilityFn]);

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

        // Check serviceability if enabled
        if (showServiceabilityCheck && onServiceabilityChange && checkServiceabilityFn) {
            onServiceabilityChange('checking');
            checkServiceabilityFn(String(location.latitude), String(location.longitude));
        }

        setLocationPickerVisible(false);
    }, [onAddressChange, showServiceabilityCheck, onServiceabilityChange, checkServiceabilityFn]);

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

    const savedAddressOptions = useMemo(() => {
        return profile?.addresses?.map((addr: any) => ({
            id: addr.id,
            label: `${addr.line1}, ${addr.cityName}`,
            data: addr,
        })) || [];
    }, [profile]);

    const getServiceabilityColor = () => {
        switch (serviceabilityStatus) {
            case 'serviceable':
                return '#10B981';
            case 'non-serviceable':
                return '#EF4444';
            case 'checking':
                return '#F59E0B';
            default:
                return TEXT_MUTED;
        }
    };

    const getServiceabilityLabel = () => {
        switch (serviceabilityStatus) {
            case 'serviceable':
                return 'Available at this location';
            case 'non-serviceable':
                return 'Not available at this location';
            case 'checking':
                return 'Checking availability...';
            default:
                return 'Location not verified';
        }
    };

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>

            {/* Option Buttons Row */}
            <View style={styles.optionsRow}>
                {savedAddressOptions.length > 0 && (
                    <TouchableOpacity
                        style={styles.optionBtn}
                        onPress={handleAutoFillAddress}
                    >
                        <Ionicons name="home-outline" size={16} color={PRIMARY_GREEN} />
                        <Text style={styles.optionBtnText}>My Address</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.optionBtn}
                    onPress={handleDetectLocation}
                    disabled={detectingLocation}
                >
                    {detectingLocation ? (
                        <ActivityIndicator size={16} color={PRIMARY_GREEN} />
                    ) : (
                        <Ionicons name="locate-outline" size={16} color={PRIMARY_GREEN} />
                    )}
                    <Text style={styles.optionBtnText}>
                        {detectingLocation ? 'Detecting...' : 'My Location'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionBtn}
                    onPress={() => setLocationPickerVisible(true)}
                >
                    <Ionicons name="search-outline" size={16} color={PRIMARY_GREEN} />
                    <Text style={styles.optionBtnText}>Search</Text>
                </TouchableOpacity>
            </View>

            {/* Selected Address Display */}
            {selectedAddress && (
                <View style={styles.addressDisplay}>
                    <Ionicons name="location" size={18} color={PRIMARY_GREEN} />
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
                        <Text style={styles.fieldLabel}>Pincode *</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="Enter 6-digit pincode"
                            placeholderTextColor={TEXT_MUTED}
                            maxLength={6}
                            keyboardType="numeric"
                            value={manualPincodeInput}
                            onChangeText={handlePincodeChange}
                        />
                    </View>

                    {/* Phone Number Field */}
                    {showPhoneField && onPhoneChange && (
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Contact Number *</Text>
                            <View style={styles.phoneInputContainer}>
                                <Text style={styles.phonePrefix}>+91</Text>
                                <View style={styles.phoneDivider} />
                                <TextInput
                                    style={styles.phoneInput}
                                    placeholder="Enter phone number"
                                    placeholderTextColor={TEXT_MUTED}
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
                            <Text style={styles.fieldLabel}>Landmark (Optional)</Text>
                            <TextInput
                                style={styles.fieldInput}
                                placeholder="e.g., Near hospital, opposite park"
                                placeholderTextColor={TEXT_MUTED}
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

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        padding: 16,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_DARK,
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
        backgroundColor: LIGHT_GREEN_BG,
    },
    optionBtnText: {
        fontSize: 12,
        fontWeight: '500',
        color: PRIMARY_GREEN,
    },
    addressDisplay: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: LIGHT_GREEN_BG,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    addressLine1: {
        fontSize: 13,
        fontWeight: '500',
        color: TEXT_DARK,
    },
    addressSecondary: {
        fontSize: 12,
        color: TEXT_MUTED,
        marginTop: 2,
    },
    serviceabilityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
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
        color: TEXT_DARK,
    },
    fieldInput: {
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: TEXT_DARK,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
    },
    phonePrefix: {
        fontSize: 13,
        fontWeight: '500',
        color: TEXT_DARK,
        paddingRight: 8,
    },
    phoneDivider: {
        width: 1,
        height: 16,
        backgroundColor: CARD_BORDER,
        marginRight: 8,
    },
    phoneInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 13,
        color: TEXT_DARK,
    },
});

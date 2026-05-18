import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationSearch } from './LocationSearch';
import { LocationMapConfirm } from './LocationMapConfirm';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const CARD_BORDER = '#E5E7EB';

type LocationPickerStep = 'search' | 'map' | 'confirm';

interface LocationPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onLocationConfirmed: (location: {
        placeId: string;
        description: string;
        latitude: number;
        longitude: number;
        address: string;
    }) => void;
    initialLat?: number;
    initialLng?: number;
}

export const LocationPickerModal = ({
    visible,
    onClose,
    onLocationConfirmed,
    initialLat = 28.7041,
    initialLng = 77.1025,
}: LocationPickerModalProps) => {
    const [step, setStep] = useState<LocationPickerStep>('search');
    const [selectedLocation, setSelectedLocation] = useState<{
        placeId: string;
        description: string;
        latitude: number;
        longitude: number;
        address?: string;
    } | null>(null);

    const handleSelectLocation = (placeId: string, description: string, coords?: { lat: number; lng: number }) => {
        console.log('📍 LocationPickerModal: handleSelectLocation called with:', { placeId, description, coords });
        const locationData = {
            placeId,
            description,
            address: description,
            latitude: coords?.lat || initialLat,
            longitude: coords?.lng || initialLng,
        };
        console.log('📍 LocationPickerModal: Setting selectedLocation to:', locationData);
        setSelectedLocation(locationData);
        console.log('📍 LocationPickerModal: Moving to map step');
        setStep('map');
    };

    const handleMapConfirm = (lat: number, lng: number, address: string) => {
        console.log('📍 LocationPickerModal: handleMapConfirm called with:', { lat, lng, address });
        console.log('📍 LocationPickerModal: selectedLocation:', selectedLocation);
        if (selectedLocation) {
            // Use the address from map (reverse geocode if marker was dragged, or initial if not)
            // If address is empty, fall back to selectedLocation.address
            const finalAddress = address.trim() || selectedLocation.address || selectedLocation.description;
            const finalData = {
                ...selectedLocation,
                latitude: lat,
                longitude: lng,
                address: finalAddress,
            };
            console.log('📍 LocationPickerModal: Sending onLocationConfirmed with:', finalData);
            console.log('📍 LocationPickerModal: About to call onLocationConfirmed callback');
            onLocationConfirmed(finalData);
            console.log('📍 LocationPickerModal: Called onLocationConfirmed, now closing modal');
            handleClose();
        } else {
            console.warn('📍 LocationPickerModal: selectedLocation is null!');
        }
    };

    const handleClose = () => {
        setStep('search');
        setSelectedLocation(null);
        onClose();
    };

    const handleBackFromMap = () => {
        setStep('search');
        setSelectedLocation(null);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose}>
                        <Ionicons name="close" size={24} color={TEXT_DARK} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {step === 'search' ? 'Select Location' : 'Confirm Location'}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Content */}
                {step === 'search' && selectedLocation === null && (
                    <LocationSearch
                        onSelectLocation={handleSelectLocation}
                        onClose={handleClose}
                        showRecentSearches={true}
                    />
                )}

                {step === 'map' && selectedLocation && (
                    <>
                        <TouchableOpacity style={styles.backButton} onPress={handleBackFromMap}>
                            <Ionicons name="chevron-back" size={20} color={PRIMARY_GREEN} />
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                        <LocationMapConfirm
                            initialLat={selectedLocation.latitude}
                            initialLng={selectedLocation.longitude}
                            initialAddress={selectedLocation.description}
                            onConfirm={handleMapConfirm}
                            onCancel={handleBackFromMap}
                        />
                    </>
                )}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        zIndex: 10,
    },
    backButtonText: {
        fontSize: 14,
        color: PRIMARY_GREEN,
        fontWeight: '500',
        marginLeft: 4,
    },
});

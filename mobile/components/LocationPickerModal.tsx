import React, { useState, useEffect } from 'react';
import {
    View, Text, Modal, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { LocationSearch } from './LocationSearch';
import { LocationMapConfirm } from './LocationMapConfirm';

type LocationPickerStep = 'search' | 'map';

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
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const [step, setStep] = useState<LocationPickerStep>('search');
    const [selectedLocation, setSelectedLocation] = useState<{
        placeId: string;
        description: string;
        latitude: number;
        longitude: number;
        address?: string;
    } | null>(null);

    const handleSelectLocation = (placeId: string, description: string, coords?: { lat: number; lng: number }) => {
        setSelectedLocation({
            placeId,
            description,
            address: description,
            latitude: coords?.lat || initialLat,
            longitude: coords?.lng || initialLng,
        });
        setStep('map');
    };

    const handleMapConfirm = (lat: number, lng: number, address: string) => {
        if (selectedLocation) {
            const finalAddress = address.trim() || selectedLocation.address || selectedLocation.description;
            onLocationConfirmed({ ...selectedLocation, latitude: lat, longitude: lng, address: finalAddress });
            handleClose();
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

    const bg = isDarkMode ? '#1A1A1A' : '#FFFFFF';

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
            <View style={[styles.safeTopPadding, { height: insets.top, backgroundColor: Colors.primaryDark }]} />
            <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={step === 'map' ? handleBackFromMap : handleClose}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons
                            name={step === 'map' ? 'arrow-back' : 'close'}
                            size={20}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>
                            {step === 'search' ? 'Search Location' : 'Confirm on Map'}
                        </Text>
                        <Text style={styles.headerSub}>
                            {step === 'search' ? 'Type your area or address' : 'Drag pin to fine-tune'}
                        </Text>
                    </View>

                    <View style={styles.headerBtn} />
                </View>

                {/* Step indicator */}
                <View style={styles.stepBar}>
                    <View style={styles.stepRow}>
                        <View style={[styles.stepDot, styles.stepDotActive]}>
                            <Ionicons name="search" size={10} color="#FFFFFF" />
                        </View>
                        <View style={[styles.stepLine, step === 'map' && styles.stepLineActive]} />
                        <View style={[styles.stepDot, step === 'map' && styles.stepDotActive]}>
                            <Ionicons name="map" size={10} color={step === 'map' ? '#FFFFFF' : Colors.primaryDark} />
                        </View>
                    </View>
                    <View style={styles.stepLabels}>
                        <Text style={[styles.stepLabel, styles.stepLabelActive]}>Search</Text>
                        <Text style={[styles.stepLabel, step === 'map' && styles.stepLabelActive]}>Confirm</Text>
                    </View>
                </View>

                {/* Content */}
                <View style={[styles.content, { backgroundColor: bg }]}>
                    {step === 'search' && (
                        <LocationSearch
                            onSelectLocation={handleSelectLocation}
                            showRecentSearches={true}
                        />
                    )}

                    {step === 'map' && selectedLocation && (
                        <LocationMapConfirm
                            initialLat={selectedLocation.latitude}
                            initialLng={selectedLocation.longitude}
                            initialAddress={selectedLocation.description}
                            onConfirm={handleMapConfirm}
                            onCancel={handleBackFromMap}
                        />
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    safeTopPadding: {
        width: '100%',
    },
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // Header — green band
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryDark,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: '#FFFFFF',
    },
    headerSub: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 1,
    },

    // Step indicator
    stepBar: {
        backgroundColor: Colors.primaryDark,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xl,
        alignItems: 'center',
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 100,
    },
    stepDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    stepDotActive: {
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 4,
    },
    stepLineActive: {
        backgroundColor: Colors.accent,
    },
    stepLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 100,
        marginTop: 4,
    },
    stepLabel: {
        fontFamily: Fonts.regular,
        fontSize: 10,
        color: 'rgba(255,255,255,0.45)',
    },
    stepLabelActive: {
        color: 'rgba(255,255,255,0.9)',
        fontFamily: Fonts.medium,
    },

    // Content area — bg set dynamically via isDarkMode inline style
    content: {
        flex: 1,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
        marginTop: -20,
    },
});

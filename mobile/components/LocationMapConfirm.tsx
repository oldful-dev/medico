import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.ayuxacare.com/api';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';
const LIGHT_GREEN_BG = '#F0FDF4';

interface LocationMapConfirmProps {
    initialLat: number;
    initialLng: number;
    initialAddress: string;
    onConfirm: (lat: number, lng: number, address: string) => void;
    onCancel: () => void;
}

export const LocationMapConfirm = ({
    initialLat,
    initialLng,
    initialAddress,
    onConfirm,
    onCancel,
}: LocationMapConfirmProps) => {
    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState({
        latitude: initialLat,
        longitude: initialLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });
    const [markerCoord, setMarkerCoord] = useState({
        latitude: initialLat,
        longitude: initialLng,
    });
    const [address, setAddress] = useState(initialAddress);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        console.log('🗺️ LocationMapConfirm: Mounted with initialAddress:', initialAddress);
        setAddress(initialAddress);
    }, [initialAddress]);

    const windowWidth = Dimensions.get('window').width;
    const windowHeight = Dimensions.get('window').height;

    // Reverse geocode when marker moves
    const handleMarkerDragEnd = async (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        console.log('Marker dragged to:', latitude, longitude);
        setMarkerCoord({ latitude, longitude });
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/location/reverse-geocode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude }),
            });

            const data = await response.json();
            console.log('Reverse geocode response:', data);
            if (data.statusCode === 0) {
                const formattedAddress = data.data.formatted_address || '';
                console.log('Setting address to:', formattedAddress);
                setAddress(formattedAddress);
            }
        } catch (error) {
            console.error('Reverse geocode error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCurrentLocation = async () => {
        // This would use device geolocation service
        // For now, just center on initial location
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: initialLat,
                longitude: initialLng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    const handleConfirm = () => {
        console.log('🗺️ LocationMapConfirm: Confirm button pressed');
        console.log('🗺️ LocationMapConfirm: Current address state:', address);
        console.log('🗺️ LocationMapConfirm: Current markerCoord:', markerCoord);
        console.log('🗺️ LocationMapConfirm: About to call onConfirm');
        onConfirm(markerCoord.latitude, markerCoord.longitude, address);
        console.log('🗺️ LocationMapConfirm: onConfirm callback executed');
    };

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                style={[styles.map, { width: windowWidth, height: windowHeight * 0.65 }]}
                region={region}
                onRegionChange={setRegion}
            >
                <Marker
                    coordinate={markerCoord}
                    draggable
                    onDragEnd={handleMarkerDragEnd}
                    title="Drop pin here"
                    pinColor={PRIMARY_GREEN}
                />
            </MapView>

            {/* Center Reticle */}
            <View style={styles.reticleContainer}>
                <Ionicons name="location-sharp" size={32} color={PRIMARY_GREEN} />
            </View>

            {/* Current Location Button */}
            <TouchableOpacity style={styles.currentLocationBtn} onPress={handleCurrentLocation}>
                <Ionicons name="locate" size={20} color={PRIMARY_GREEN} />
            </TouchableOpacity>

            {/* Bottom Sheet - Address Info */}
            <View style={styles.bottomSheet}>
                <View style={styles.dragHandle} />

                {/* Loading State */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={PRIMARY_GREEN} />
                        <Text style={styles.loadingText}>Updating address...</Text>
                    </View>
                )}

                {/* Address Display */}
                {!loading && (
                    <>
                        <View style={styles.addressContainer}>
                            <Ionicons name="location" size={20} color={PRIMARY_GREEN} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.addressTitle}>Drop pin to confirm</Text>
                                <Text style={styles.addressText} numberOfLines={3}>{address}</Text>
                            </View>
                        </View>

                        {/* Coordinates Info */}
                        <View style={styles.coordsContainer}>
                            <View style={styles.coordRow}>
                                <Text style={styles.coordLabel}>Latitude:</Text>
                                <Text style={styles.coordValue}>{markerCoord.latitude.toFixed(6)}</Text>
                            </View>
                            <View style={styles.coordRow}>
                                <Text style={styles.coordLabel}>Longitude:</Text>
                                <Text style={styles.coordValue}>{markerCoord.longitude.toFixed(6)}</Text>
                            </View>
                        </View>
                    </>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
                        onPress={handleConfirm}
                        disabled={loading}
                    >
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.confirmButtonText}>Confirm Location</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    map: {
        flex: 1,
    },
    reticleContainer: {
        position: 'absolute',
        top: '32.5%',
        left: '50%',
        marginLeft: -16,
        marginTop: -16,
        zIndex: 10,
    },
    currentLocationBtn: {
        position: 'absolute',
        bottom: 220,
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    bottomSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingBottom: 24,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    dragHandle: {
        width: 36,
        height: 4,
        backgroundColor: CARD_BORDER,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 12,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    loadingText: {
        fontSize: 13,
        color: TEXT_MUTED,
        marginLeft: 10,
    },
    addressContainer: {
        flexDirection: 'row',
        backgroundColor: LIGHT_GREEN_BG,
        borderWidth: 1,
        borderColor: '#D1FAE5',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
        marginBottom: 12,
    },
    addressTitle: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '500',
        marginBottom: 4,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '500',
        color: TEXT_DARK,
    },
    coordsContainer: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    coordRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    coordLabel: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '500',
    },
    coordValue: {
        fontSize: 12,
        color: TEXT_DARK,
        fontFamily: 'monospace',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    confirmButtonDisabled: {
        opacity: 0.6,
    },
    confirmButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

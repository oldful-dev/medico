// ──────────────────────────────────────────────
//  Reusable Google Maps component
//  Used for address selection, SOS location, booking locations
// ──────────────────────────────────────────────

import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

interface MapViewComponentProps {
    latitude: number;
    longitude: number;
    markerTitle?: string;
    markerDescription?: string;
    showMarker?: boolean;
    onLocationChange?: (coords: { latitude: number; longitude: number }) => void;
    style?: object;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
}

const DEFAULT_DELTA = { latitudeDelta: 0.005, longitudeDelta: 0.005 };

const MapViewComponent: React.FC<MapViewComponentProps> = ({
    latitude,
    longitude,
    markerTitle,
    markerDescription,
    showMarker = true,
    onLocationChange,
    style,
    scrollEnabled = true,
    zoomEnabled = true,
}) => {
    const { t } = useTranslation();
    const region: Region = {
        latitude,
        longitude,
        ...DEFAULT_DELTA,
    };

    const resolvedMarkerTitle = markerTitle ?? t('common.selected_location');

    return (
        <View style={[styles.container, style]}>
            <MapView
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={styles.map}
                initialRegion={region}
                scrollEnabled={scrollEnabled}
                zoomEnabled={zoomEnabled}
                onPress={(e) => {
                    if (onLocationChange) {
                        onLocationChange(e.nativeEvent.coordinate);
                    }
                }}
            >
                {showMarker && (
                    <Marker
                        coordinate={{ latitude, longitude }}
                        title={resolvedMarkerTitle}
                        description={markerDescription}
                    />
                )}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
});

export default MapViewComponent;

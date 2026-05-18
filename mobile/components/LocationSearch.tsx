import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocationSearch, type LocationPrediction } from '@/hooks/useLocationSearch';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CARD_BORDER = '#E5E7EB';
const LIGHT_GREEN_BG = '#F0FDF4';

interface LocationSearchProps {
    onSelectLocation: (placeId: string, description: string, coords?: { lat: number; lng: number }) => void;
    onClose?: () => void;
    showRecentSearches?: boolean;
}

export const LocationSearch = ({
    onSelectLocation,
    onClose,
    showRecentSearches = true,
}: LocationSearchProps) => {
    const { predictions, loading, error, search, clear, getPlaceDetails } = useLocationSearch();
    const [searchText, setSearchText] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    const handleSearch = (text: string) => {
        setSearchText(text);
        if (text.length >= 2) {
            search(text);
        } else {
            clear();
        }
    };

    const handleSelectPrediction = async (prediction: LocationPrediction) => {
        console.log('🔍 LocationSearch: Selected prediction:', prediction);

        // Add to recent searches
        if (!recentSearches.includes(prediction.description)) {
            setRecentSearches(prev => [prediction.description, ...prev].slice(0, 5));
        }

        // Fetch full details
        console.log('🔍 LocationSearch: Fetching place details for:', prediction.place_id);
        const details = await getPlaceDetails(prediction.place_id);
        console.log('🔍 LocationSearch: Got place details:', details);

        // Use formatted_address if available, otherwise fall back to description
        const fullAddress = details?.formatted_address || prediction.description;
        console.log('🔍 LocationSearch: Using fullAddress:', fullAddress);

        console.log('🔍 LocationSearch: Calling onSelectLocation with:', {
            placeId: prediction.place_id,
            description: fullAddress,
            coords: { lat: details?.latitude || 0, lng: details?.longitude || 0 },
        });

        onSelectLocation(prediction.place_id, fullAddress, {
            lat: details?.latitude || 0,
            lng: details?.longitude || 0,
        });

        // Clear and close
        setSearchText('');
        clear();
        onClose?.();
    };

    const handleSelectRecent = (location: string) => {
        setSearchText(location);
        search(location);
    };

    const renderPredictionItem = ({ item }: { item: LocationPrediction }) => (
        <TouchableOpacity
            style={styles.predictionItem}
            onPress={() => handleSelectPrediction(item)}
        >
            <Ionicons name="location-outline" size={20} color={PRIMARY_GREEN} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
                <Text style={styles.mainText} numberOfLines={1}>{item.main_text}</Text>
                {item.secondary_text && (
                    <Text style={styles.secondaryText} numberOfLines={1}>{item.secondary_text}</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderRecentSearch = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={styles.recentItem}
            onPress={() => handleSelectRecent(item)}
        >
            <Ionicons name="time-outline" size={16} color={TEXT_MUTED} style={{ marginRight: 10 }} />
            <Text style={styles.recentText}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Search Input */}
            <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={TEXT_MUTED} style={{ marginRight: 10 }} />
                <TextInput
                    placeholder="Search location or address..."
                    placeholderTextColor={TEXT_MUTED}
                    value={searchText}
                    onChangeText={handleSearch}
                    style={styles.searchInput}
                    autoFocus
                />
                {searchText ? (
                    <TouchableOpacity onPress={() => { setSearchText(''); clear(); }}>
                        <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Error Message */}
            {error && (
                <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Loading State */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                    <Text style={styles.loadingText}>Searching locations...</Text>
                </View>
            )}

            {/* Predictions List */}
            {!loading && predictions.length > 0 && (
                <FlatList
                    data={predictions}
                    renderItem={renderPredictionItem}
                    keyExtractor={(item) => item.place_id}
                    scrollEnabled={false}
                    style={styles.predictionsList}
                />
            )}

            {/* Recent Searches */}
            {!loading && predictions.length === 0 && searchText.length < 2 && showRecentSearches && recentSearches.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <FlatList
                        data={recentSearches}
                        renderItem={renderRecentSearch}
                        keyExtractor={(item, idx) => `${item}-${idx}`}
                        scrollEnabled={false}
                        style={styles.recentList}
                    />
                </>
            )}

            {/* Empty State */}
            {!loading && predictions.length === 0 && searchText.length >= 2 && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="location-outline" size={40} color={TEXT_MUTED} />
                    <Text style={styles.emptyText}>No locations found</Text>
                    <Text style={styles.emptySubtext}>Try a different search term</Text>
                </View>
            )}

            {/* Help Text */}
            {!loading && predictions.length === 0 && searchText.length === 0 && (
                <View style={styles.helpContainer}>
                    <Ionicons name="information-circle-outline" size={24} color={TEXT_MUTED} style={{ marginBottom: 12 }} />
                    <Text style={styles.helpText}>Type at least 2 characters to search</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: LIGHT_GREEN_BG,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: TEXT_DARK,
        padding: 0,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FEE2E2',
        borderBottomWidth: 1,
        borderBottomColor: '#FECACA',
    },
    errorText: {
        fontSize: 13,
        color: '#DC2626',
        marginLeft: 8,
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        fontSize: 14,
        color: TEXT_MUTED,
        marginTop: 12,
    },
    predictionsList: {
        flex: 1,
    },
    predictionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    mainText: {
        fontSize: 14,
        fontWeight: '500',
        color: TEXT_DARK,
    },
    secondaryText: {
        fontSize: 12,
        color: TEXT_MUTED,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_MUTED,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        textTransform: 'uppercase',
    },
    recentList: {
        flex: 1,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    recentText: {
        fontSize: 14,
        color: TEXT_DARK,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_DARK,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: TEXT_MUTED,
        marginTop: 6,
    },
    helpContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    helpText: {
        fontSize: 14,
        color: TEXT_MUTED,
        textAlign: 'center',
    },
});

import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    FlatList, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useLocationSearch, type LocationPrediction } from '@/hooks/useLocationSearch';

interface LocationSearchProps {
    onSelectLocation: (placeId: string, description: string, coords?: { lat: number; lng: number }) => void;
    showRecentSearches?: boolean;
}

export const LocationSearch = ({
    onSelectLocation,
    showRecentSearches = true,
}: LocationSearchProps) => {
    const { predictions, loading, error, search, clear, getPlaceDetails } = useLocationSearch();
    const [searchText, setSearchText] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [selecting, setSelecting] = useState(false);

    const handleSearch = (text: string) => {
        setSearchText(text);
        if (text.length >= 2) search(text);
        else clear();
    };

    const handleSelectPrediction = async (prediction: LocationPrediction) => {
        setSelecting(true);
        if (!recentSearches.includes(prediction.description)) {
            setRecentSearches(prev => [prediction.description, ...prev].slice(0, 5));
        }

        const details = await getPlaceDetails(prediction.place_id);
        let fullAddress = details?.formatted_address || prediction.description;
        let finalLat = details?.latitude || 0;
        let finalLng = details?.longitude || 0;

        if (details && !fullAddress.match(/\b\d{6}\b/)) {
            try {
                const revRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://api.ayuxacare.com/api'}/location/reverse-geocode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latitude: details.latitude, longitude: details.longitude }),
                });
                const revData = await revRes.json();
                if (revData.statusCode === 0 && revData.data?.formatted_address) {
                    fullAddress = revData.data.formatted_address;
                    const geoRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://api.ayuxacare.com/api'}/location/geocode`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ address: fullAddress }),
                    });
                    const geoData = await geoRes.json();
                    if (geoData.statusCode === 0 && geoData.data) {
                        finalLat = geoData.data.latitude || finalLat;
                        finalLng = geoData.data.longitude || finalLng;
                    }
                }
            } catch { /* keep original */ }
        }

        setSelecting(false);
        onSelectLocation(prediction.place_id, fullAddress, { lat: finalLat, lng: finalLng });
        setSearchText('');
        clear();
    };

    const handleSelectRecent = (location: string) => {
        setSearchText(location);
        search(location);
    };

    const showEmpty = !loading && !selecting && predictions.length === 0 && searchText.length >= 2;
    const showHelp  = !loading && !selecting && predictions.length === 0 && searchText.length === 0;
    const showRecent = showHelp && showRecentSearches && recentSearches.length > 0;

    return (
        <View style={styles.container}>
            {/* Search bar */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search area, street, landmark..."
                        placeholderTextColor={Colors.textLight}
                        value={searchText}
                        onChangeText={handleSearch}
                        style={styles.searchInput}
                        autoFocus
                        returnKeyType="search"
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchText(''); clear(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Error */}
            {error && (
                <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Loading / selecting */}
            {(loading || selecting) && (
                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primaryDark} />
                    <Text style={styles.loadingText}>
                        {selecting ? 'Fetching address details…' : 'Searching…'}
                    </Text>
                </View>
            )}

            {/* Results */}
            {!loading && !selecting && predictions.length > 0 && (
                <FlatList
                    data={predictions}
                    keyExtractor={item => item.place_id}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingTop: 4 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.resultRow}
                            onPress={() => handleSelectPrediction(item)}
                            activeOpacity={0.75}
                        >
                            <View style={styles.resultIcon}>
                                <Ionicons name="location" size={16} color={Colors.primaryDark} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.resultMain} numberOfLines={1}>{item.main_text}</Text>
                                {item.secondary_text ? (
                                    <Text style={styles.resultSub} numberOfLines={1}>{item.secondary_text}</Text>
                                ) : null}
                            </View>
                            <Ionicons name="chevron-forward" size={15} color={Colors.textLight} />
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Recent searches */}
            {showRecent && (
                <View>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="time-outline" size={13} color={Colors.textMuted} style={{ marginRight: 5 }} />
                        <Text style={styles.sectionTitle}>Recent Searches</Text>
                    </View>
                    {recentSearches.map((loc, i) => (
                        <TouchableOpacity
                            key={`${loc}-${i}`}
                            style={styles.recentRow}
                            onPress={() => handleSelectRecent(loc)}
                            activeOpacity={0.75}
                        >
                            <View style={styles.recentIcon}>
                                <Ionicons name="time" size={14} color={Colors.textMuted} />
                            </View>
                            <Text style={styles.recentText} numberOfLines={1}>{loc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Empty state */}
            {showEmpty && (
                <View style={styles.centerBox}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="location-outline" size={32} color={Colors.primaryDark} />
                    </View>
                    <Text style={styles.emptyTitle}>No results found</Text>
                    <Text style={styles.emptySub}>Try a different area or landmark name</Text>
                </View>
            )}

            {/* Help state */}
            {showHelp && !showRecent && (
                <View style={styles.centerBox}>
                    <View style={styles.helpCards}>
                        {[
                            { icon: 'business-outline' as const, text: 'Search by area or locality' },
                            { icon: 'flag-outline' as const,     text: 'Try a landmark or street' },
                            { icon: 'pin-outline' as const,      text: 'Enter full address or pincode' },
                        ].map((tip, i) => (
                            <View key={i} style={styles.tipRow}>
                                <View style={styles.tipIcon}>
                                    <Ionicons name={tip.icon} size={15} color={Colors.primaryDark} />
                                </View>
                                <Text style={styles.tipText}>{tip.text}</Text>
                            </View>
                        ))}
                    </View>
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

    // Search bar
    searchWrap: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: Colors.borderLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
    },
    searchInput: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
        padding: 0,
    },

    // Error
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
        backgroundColor: '#FEF2F2',
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: '#EF4444',
    },
    errorText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: '#DC2626',
        flex: 1,
    },

    // Loading
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    loadingText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },

    // Results
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        gap: Spacing.md,
    },
    resultIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F0FAF4',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    resultMain: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    resultSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        marginTop: 2,
    },

    // Recent
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    recentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        gap: Spacing.md,
    },
    recentIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    recentText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
        flex: 1,
    },

    // Centre-aligned states
    centerBox: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl * 2,
    },
    emptyIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F0FAF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        textAlign: 'center',
    },

    // Tips / help
    helpCards: {
        width: '100%',
        gap: Spacing.sm,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: '#F8F9FA',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 13,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    tipIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E8F5EE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
});

// City Selection Screen — Server-Driven UI
// City list (names, states, availability) comes from AppConfigContext.
// Admin can add/activate cities without an app release.
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { useTranslation } from 'react-i18next';

export default function CitySelectionScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { setSelectedCity } = useUser();
    const { cities } = useAppConfig();

    const availableCities = cities.filter(c => c.available);
    const comingSoonCities = cities.filter(c => !c.available);

    const [selectedId, setSelectedId] = useState(availableCities[0]?.id ?? '');

    const handleContinue = () => {
        const city = availableCities.find(c => c.id === selectedId);
        if (city) setSelectedCity(city.name);
        router.back();
    };

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('city_selection.header')}</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* ─── Content Card ─── */}
            <View style={styles.contentCard}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Illustration */}
                    <View style={styles.illustrationCard}>
                        <Ionicons name="map" size={40} color="#048357" style={styles.illustrationIcon} />
                        <Text style={styles.illustrationTitle}>Where are you located?</Text>
                        <Text style={styles.illustrationSubtitle}>
                            Select your city to see available services near you.
                        </Text>
                    </View>

                    {/* Auto-detect button */}
                    <TouchableOpacity
                        style={styles.autoDetectButton}
                        onPress={async () => {
                            try {
                                const { locationService } = await import('@/services/device/locationService');
                                const coords = await locationService.getCurrentLocation();
                                const Location = await import('expo-location');
                                const results = await Location.reverseGeocodeAsync({
                                    latitude: coords.latitude,
                                    longitude: coords.longitude,
                                });
                                if (results.length > 0) {
                                    const city = results[0].city || results[0].subregion;
                                    if (city) {
                                        setSelectedCity(city);
                                        router.back();
                                    }
                                }
                            } catch {
                                Alert.alert('Error', 'Could not detect location. Please select manually.');
                            }
                        }}
                    >
                        <Ionicons name="navigate" size={18} color="#048357" />
                        <Text style={styles.autoDetectText}>Detect My Location Automatically</Text>
                    </TouchableOpacity>

                    {/* Available Cities (SDUI) */}
                    {availableCities.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>Available Now</Text>
                            {availableCities.map(city => {
                                const isSelected = city.id === selectedId;
                                return (
                                    <TouchableOpacity
                                        key={city.id}
                                        style={[styles.cityCard, isSelected && styles.cityCardSelected]}
                                        onPress={() => setSelectedId(city.id)}
                                    >
                                        <View style={[styles.cityIconCircle, isSelected && styles.cityIconCircleSelected]}>
                                            <Ionicons
                                                name={isSelected ? 'location' : 'location-outline'}
                                                size={22}
                                                color={isSelected ? '#FFFFFF' : '#048357'}
                                            />
                                        </View>
                                        <View style={styles.cityTextGroup}>
                                            <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
                                                {city.name}
                                            </Text>
                                            <Text style={styles.cityState}>{city.state}</Text>
                                        </View>
                                        {isSelected && (
                                            <View style={styles.activeTag}>
                                                <Text style={styles.activeTagText}>Active</Text>
                                            </View>
                                        )}
                                        <Ionicons
                                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                            size={22}
                                            color={isSelected ? '#048357' : '#AAAEAC'}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </>
                    )}

                    {/* Coming Soon Cities (SDUI) */}
                    {comingSoonCities.length > 0 && (
                        <>
                            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Coming Soon</Text>
                            {comingSoonCities.map(city => (
                                <View key={city.id} style={[styles.cityCard, styles.cityCardDisabled]}>
                                    <View style={styles.cityIconCircle}>
                                        <Ionicons name="location-outline" size={22} color="#AAAEAC" />
                                    </View>
                                    <View style={styles.cityTextGroup}>
                                        <Text style={styles.cityNameDisabled}>{city.name}</Text>
                                        <Text style={styles.cityState}>{city.state}</Text>
                                    </View>
                                    <View style={styles.comingSoonTag}>
                                        <Text style={styles.comingSoonTagText}>{t('city_selection.coming_soon')}</Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {/* Notify Banner */}
                    <View style={styles.notifyBanner}>
                        <Ionicons name="notifications-outline" size={20} color="#02743F" />
                        <Text style={styles.notifyText}>
                            We&apos;ll notify you when we launch in your city!
                        </Text>
                    </View>
                </ScrollView>

                {/* ─── Continue Button ─── */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.continueButton} activeOpacity={0.8} onPress={handleContinue}>
                        <Text style={styles.continueButtonText}>{t('city_selection.continue')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#048357' },
    header: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#048357',
        paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10,
    },
    backButton: { padding: 5 },
    headerTitle: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 20, color: '#FFFFFF', textAlign: 'center' },
    contentCard: { flex: 1, backgroundColor: '#FDFDE8', borderTopLeftRadius: 45, borderTopRightRadius: 45, overflow: 'hidden' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 120 },
    illustrationCard: { alignItems: 'center', marginBottom: 28 },
    illustrationIcon: { marginBottom: 12 },
    illustrationTitle: { fontFamily: Fonts.semiBold, fontSize: 18, color: '#2F2F2F', textAlign: 'center', marginBottom: 6 },
    illustrationSubtitle: { fontFamily: Fonts.regular, fontSize: 12, color: '#777777', textAlign: 'center', lineHeight: 18 },
    sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#02743F', marginBottom: 10 },
    cityCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
        borderWidth: 1.5, borderColor: 'transparent',
        shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    cityCardSelected: { borderColor: '#048357', backgroundColor: 'rgba(4, 131, 87, 0.04)' },
    cityCardDisabled: { opacity: 0.7 },
    cityIconCircle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(4, 131, 87, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    cityIconCircleSelected: { backgroundColor: '#048357' },
    cityTextGroup: { flex: 1 },
    cityName: { fontFamily: Fonts.medium, fontSize: 15, color: '#2F2F2F' },
    cityNameSelected: { color: '#02743F', fontFamily: Fonts.semiBold },
    cityNameDisabled: { fontFamily: Fonts.medium, fontSize: 15, color: '#AAAEAC' },
    cityState: { fontFamily: Fonts.regular, fontSize: 11, color: '#AAAEAC', marginTop: 2 },
    activeTag: { backgroundColor: 'rgba(4, 131, 87, 0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 },
    activeTagText: { fontFamily: Fonts.medium, fontSize: 9, color: '#048357' },
    comingSoonTag: { backgroundColor: 'rgba(232, 163, 23, 0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    comingSoonTagText: { fontFamily: Fonts.medium, fontSize: 9, color: '#E8A317' },
    notifyBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(4, 131, 87, 0.08)',
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16, gap: 10,
    },
    notifyText: { flex: 1, fontFamily: Fonts.regular, fontSize: 12, color: '#02743F', lineHeight: 18 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#FDFDE8', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36, alignItems: 'center',
    },
    continueButton: { width: '85%', maxWidth: 320, height: 48, backgroundColor: '#02743F', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    continueButtonText: { fontFamily: Fonts.medium, fontSize: 15, color: '#FFFFFF' },
    autoDetectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 12,
        paddingVertical: 12,
        marginBottom: 24,
        gap: 10,
    },
    autoDetectText: {
        fontFamily: Fonts.medium,
        fontSize: 14,
        color: '#048357',
    },
});

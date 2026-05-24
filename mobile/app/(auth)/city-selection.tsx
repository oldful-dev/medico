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
    TextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/api/apiClient';
import { useTheme } from '@/context/ThemeContext';

export default function CitySelectionScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { setSelectedCity, setSelectedCityId } = useUser();
    const { cities } = useAppConfig();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(isDarkMode);

    const availableCities = cities.filter(c => c.available);
    const comingSoonCities = cities.filter(c => !c.available);

    const [selectedId, setSelectedId] = useState(availableCities[0]?.id ?? '');

    // Notify me modal state
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [notifyCity, setNotifyCity] = useState('');
    const [notifyName, setNotifyName] = useState('');
    const [notifyEmail, setNotifyEmail] = useState('');
    const [notifyLoading, setNotifyLoading] = useState(false);

    const handleNotifyMe = async () => {
        if (!notifyName.trim()) { Alert.alert('Required', 'Please enter your name.'); return; }
        if (!notifyEmail.trim() || !notifyEmail.includes('@')) { Alert.alert('Required', 'Please enter a valid email address.'); return; }
        try {
            setNotifyLoading(true);
            await apiClient.post('/waitlist', {
                name: notifyName.trim(),
                email: notifyEmail.trim().toLowerCase(),
                city: notifyCity || undefined,
                source: 'city_selection',
            });
            setShowNotifyModal(false);
            setNotifyName(''); setNotifyEmail(''); setNotifyCity('');
            Alert.alert("You're on the list! 🎉", `We'll email you as soon as Ayuxa launches${notifyCity ? ` in ${notifyCity}` : ''}.`);
        } catch (e: any) {
            const msg = e?.message?.toLowerCase() || '';
            if (msg.includes('unique') || msg.includes('already')) {
                Alert.alert('Already registered', 'You are already on our waitlist. We will notify you soon!');
                setShowNotifyModal(false);
            } else {
                Alert.alert('Error', 'Something went wrong. Please try again.');
            }
        } finally {
            setNotifyLoading(false);
        }
    };

    const handleContinue = () => {
        const city = availableCities.find(c => c.id === selectedId);
        if (city) {
            setSelectedCity(city.name);
            setSelectedCityId(city.id);
        }
        router.back();
    };

    return (
        <View style={[styles.screen, { backgroundColor: '#048357' }]}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('city_selection.header')}</Text>
            </View>

            {/* ─── Content Card ─── */}
            <View style={[styles.contentCard, { backgroundColor: isDarkMode ? '#252525' : '#FDFDE8' }]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Illustration */}
                    <View style={styles.illustrationCard}>
                        <Ionicons name="map" size={40} color="#048357" style={styles.illustrationIcon} />
                        <Text style={[styles.illustrationTitle, { color: isDarkMode ? '#E0E0E0' : '#2F2F2F' }]}>Where are you located?</Text>
                        <Text style={[styles.illustrationSubtitle, { color: isDarkMode ? '#A0A0A0' : '#777777' }]}>
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
                                        const detectedCity = (results[0].city || results[0].subregion || '').toLowerCase();
                                        
                                        const CITY_SYNONYMS: Record<string, string[]> = {
                                            'Bangalore': ['bengaluru', 'bangalore urban', 'bangalore rural'],
                                            'Gurgaon': ['gurugram'],
                                            'Delhi NCR': ['new delhi', 'delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad'],
                                            'Mumbai': ['bombay', 'navi mumbai', 'thane'],
                                        };

                                        // Find best match in our supported cities list
                                        const match = cities.find(c => {
                                            const primary = c.name.toLowerCase();
                                            if (detectedCity.includes(primary) || primary.includes(detectedCity)) return true;
                                            const synonyms = CITY_SYNONYMS[c.name] || [];
                                            return synonyms.some(s => detectedCity.includes(s) || s.includes(detectedCity));
                                        });

                                        if (match) {
                                            setSelectedCity(match.name);
                                            setSelectedCityId(match.id);
                                            router.back();
                                        } else if (detectedCity) {
                                            setSelectedCity(results[0].city || results[0].subregion || 'Unknown');
                                            router.back();
                                        }
                                    }
                                } catch (error) {
                                    console.error("Auto-detect failed:", error);
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
                                        style={[styles.cityCard, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FFFFFF' }, isSelected && styles.cityCardSelected]}
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
                                            <Text style={[styles.cityName, { color: isDarkMode ? '#E0E0E0' : '#2F2F2F' }, isSelected && styles.cityNameSelected]}>
                                                {city.name}
                                            </Text>
                                            <Text style={[styles.cityState, { color: isDarkMode ? '#A0A0A0' : '#AAAEAC' }]}>{city.state}</Text>
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
                                <View key={city.id} style={[styles.cityCard, styles.cityCardDisabled, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FFFFFF' }]}>
                                    <View style={styles.cityIconCircle}>
                                        <Ionicons name="location-outline" size={22} color={isDarkMode ? '#666666' : '#AAAEAC'} />
                                    </View>
                                    <View style={styles.cityTextGroup}>
                                        <Text style={[styles.cityNameDisabled, { color: isDarkMode ? '#909090' : '#AAAEAC' }]}>{city.name}</Text>
                                        <Text style={[styles.cityState, { color: isDarkMode ? '#707070' : '#AAAEAC' }]}>{city.state}</Text>
                                    </View>
                                    <View style={styles.comingSoonTag}>
                                        <Text style={styles.comingSoonTagText}>{t('city_selection.coming_soon')}</Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {/* Notify Banner */}
                    <TouchableOpacity style={styles.notifyBanner} activeOpacity={0.8} onPress={() => setShowNotifyModal(true)}>
                        <Ionicons name="notifications-outline" size={20} color="#02743F" />
                        <Text style={styles.notifyText}>
                            Don&apos;t see your city? Tap to get notified when we launch near you!
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#02743F" />
                    </TouchableOpacity>
                </ScrollView>

                {/* ─── Continue Button ─── */}
                <View style={[styles.bottomBar, { backgroundColor: isDarkMode ? '#252525' : '#FDFDE8' }]}>
                    <TouchableOpacity style={styles.continueButton} activeOpacity={0.8} onPress={handleContinue}>
                        <Text style={styles.continueButtonText}>{t('city_selection.continue')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── Notify Me Modal ─── */}
            <Modal visible={showNotifyModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: isDarkMode ? '#3A3A3A' : '#F0F0F0' }]}>
                            <Text style={[styles.modalTitle, { color: isDarkMode ? '#E0E0E0' : '#2F2F2F' }]}>Notify Me When You Launch</Text>
                            <TouchableOpacity onPress={() => setShowNotifyModal(false)}>
                                <Ionicons name="close" size={22} color={isDarkMode ? '#B0B0B0' : '#2F2F2F'} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { color: isDarkMode ? '#A0A0A0' : '#777777' }]}>
                            We&apos;ll send you an email the moment Ayuxa goes live in your city.
                        </Text>
                        <View style={styles.modalBody}>
                            <Text style={[styles.inputLabel, { color: isDarkMode ? '#C0C0C0' : '#555555' }]}>Your Name *</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FAFAFA', color: isDarkMode ? '#E0E0E0' : '#2F2F2F', borderColor: isDarkMode ? '#4A4A4A' : '#E0E0E0' }]}
                                placeholder="Enter your name"
                                placeholderTextColor={isDarkMode ? '#808080' : '#AAAEAC'}
                                value={notifyName}
                                onChangeText={setNotifyName}
                            />
                            <Text style={[styles.inputLabel, { color: isDarkMode ? '#C0C0C0' : '#555555' }]}>Email Address *</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FAFAFA', color: isDarkMode ? '#E0E0E0' : '#2F2F2F', borderColor: isDarkMode ? '#4A4A4A' : '#E0E0E0' }]}
                                placeholder="Enter your email"
                                placeholderTextColor={isDarkMode ? '#808080' : '#AAAEAC'}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={notifyEmail}
                                onChangeText={setNotifyEmail}
                            />
                            <Text style={[styles.inputLabel, { color: isDarkMode ? '#C0C0C0' : '#555555' }]}>Your City (optional)</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FAFAFA', color: isDarkMode ? '#E0E0E0' : '#2F2F2F', borderColor: isDarkMode ? '#4A4A4A' : '#E0E0E0' }]}
                                placeholder="e.g. Pune, Chennai, Kolkata"
                                placeholderTextColor={isDarkMode ? '#808080' : '#AAAEAC'}
                                value={notifyCity}
                                onChangeText={setNotifyCity}
                            />
                            <TouchableOpacity
                                style={[styles.notifySubmitBtn, notifyLoading && { opacity: 0.6 }]}
                                activeOpacity={0.85}
                                onPress={handleNotifyMe}
                                disabled={notifyLoading}
                            >
                                {notifyLoading
                                    ? <ActivityIndicator color="#FFFFFF" />
                                    : <Text style={styles.notifySubmitText}>Notify Me</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#048357' },
    header: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#048357',
        paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10,
    },
    backButton: { padding: 5 },
    headerTitle: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 20, color: '#FFFFFF', textAlign: "left", marginLeft: 12 },
    contentCard: { flex: 1, borderTopLeftRadius: 45, borderTopRightRadius: 45, overflow: 'hidden' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 120 },
    illustrationCard: { alignItems: 'center', marginBottom: 28 },
    illustrationIcon: { marginBottom: 12 },
    illustrationTitle: { fontFamily: Fonts.semiBold, fontSize: 18, textAlign: 'center', marginBottom: 6 },
    illustrationSubtitle: { fontFamily: Fonts.regular, fontSize: 12, textAlign: 'center', lineHeight: 18 },
    sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#02743F', marginBottom: 10 },
    cityCard: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
        borderWidth: 1.5, borderColor: 'transparent',
        shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    cityCardSelected: { borderColor: '#048357', backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.04)' },
    cityCardDisabled: { opacity: 0.7 },
    cityIconCircle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(4, 131, 87, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    cityIconCircleSelected: { backgroundColor: '#048357' },
    cityTextGroup: { flex: 1 },
    cityName: { fontFamily: Fonts.medium, fontSize: 15 },
    cityNameSelected: { color: '#02743F', fontFamily: Fonts.semiBold },
    cityNameDisabled: { fontFamily: Fonts.medium, fontSize: 15 },
    cityState: { fontFamily: Fonts.regular, fontSize: 11, marginTop: 2 },
    activeTag: { backgroundColor: 'rgba(4, 131, 87, 0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 },
    activeTagText: { fontFamily: Fonts.medium, fontSize: 9, color: '#048357' },
    comingSoonTag: { backgroundColor: 'rgba(232, 163, 23, 0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    comingSoonTagText: { fontFamily: Fonts.medium, fontSize: 9, color: '#E8A317' },
    notifyBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.08)',
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16, gap: 10,
    },
    notifyText: { flex: 1, fontFamily: Fonts.regular, fontSize: 12, color: '#02743F', lineHeight: 18 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36, alignItems: 'center',
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
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
    },
    modalSheet: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 24, paddingVertical: 20,
        borderBottomWidth: 1,
    },
    modalTitle: { fontFamily: Fonts.semiBold, fontSize: 16 },
    modalSubtitle: {
        fontFamily: Fonts.regular, fontSize: 13,
        paddingHorizontal: 24, paddingTop: 14, lineHeight: 18,
    },
    modalBody: { paddingHorizontal: 24, paddingTop: 16, gap: 4 },
    inputLabel: { fontFamily: Fonts.medium, fontSize: 12, marginBottom: 4, marginTop: 10 },
    modalInput: {
        borderWidth: 1, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: Fonts.regular, fontSize: 14,
    },
    notifySubmitBtn: {
        backgroundColor: '#02743F', borderRadius: 24, height: 48,
        justifyContent: 'center', alignItems: 'center', marginTop: 20,
    },
    notifySubmitText: { fontFamily: Fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
});

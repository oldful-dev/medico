// City Selection Screen - Bangalore (active), Chennai & Hyderabad (Coming Soon)
// PRD: Currently launching in Bangalore, with "Coming Soon" notification for other cities
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── City Data ───
const CITIES = [
    {
        name: 'Bangalore',
        state: 'Karnataka',
        available: true,
        icon: 'location' as const,
        selected: true,
    },
    {
        name: 'Chennai',
        state: 'Tamil Nadu',
        available: false,
        icon: 'location-outline' as const,
        selected: false,
    },
    {
        name: 'Hyderabad',
        state: 'Telangana',
        available: false,
        icon: 'location-outline' as const,
        selected: false,
    },
    {
        name: 'Mumbai',
        state: 'Maharashtra',
        available: false,
        icon: 'location-outline' as const,
        selected: false,
    },
    {
        name: 'Delhi NCR',
        state: 'Delhi',
        available: false,
        icon: 'location-outline' as const,
        selected: false,
    },
    {
        name: 'Pune',
        state: 'Maharashtra',
        available: false,
        icon: 'location-outline' as const,
        selected: false,
    },
];

export default function CitySelectionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select City</Text>
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

                    {/* Available Cities */}
                    <Text style={styles.sectionLabel}>Available Now</Text>
                    {CITIES.filter(c => c.available).map((city) => (
                        <TouchableOpacity
                            key={city.name}
                            style={[
                                styles.cityCard,
                                city.selected && styles.cityCardSelected,
                            ]}
                        >
                            <View style={[
                                styles.cityIconCircle,
                                city.selected && styles.cityIconCircleSelected,
                            ]}>
                                <Ionicons
                                    name={city.icon}
                                    size={22}
                                    color={city.selected ? '#FFFFFF' : '#048357'}
                                />
                            </View>
                            <View style={styles.cityTextGroup}>
                                <Text style={[
                                    styles.cityName,
                                    city.selected && styles.cityNameSelected,
                                ]}>
                                    {city.name}
                                </Text>
                                <Text style={styles.cityState}>{city.state}</Text>
                            </View>
                            {city.selected && (
                                <View style={styles.activeTag}>
                                    <Text style={styles.activeTagText}>Active</Text>
                                </View>
                            )}
                            <Ionicons
                                name={city.selected ? 'radio-button-on' : 'radio-button-off'}
                                size={22}
                                color={city.selected ? '#048357' : '#AAAEAC'}
                            />
                        </TouchableOpacity>
                    ))}

                    {/* Coming Soon Cities */}
                    <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Coming Soon</Text>
                    {CITIES.filter(c => !c.available).map((city) => (
                        <View key={city.name} style={[styles.cityCard, styles.cityCardDisabled]}>
                            <View style={styles.cityIconCircle}>
                                <Ionicons name={city.icon} size={22} color="#AAAEAC" />
                            </View>
                            <View style={styles.cityTextGroup}>
                                <Text style={styles.cityNameDisabled}>{city.name}</Text>
                                <Text style={styles.cityState}>{city.state}</Text>
                            </View>
                            <View style={styles.comingSoonTag}>
                                <Text style={styles.comingSoonTagText}>Coming Soon</Text>
                            </View>
                        </View>
                    ))}

                    {/* Notify Me Banner */}
                    <View style={styles.notifyBanner}>
                        <Ionicons name="notifications-outline" size={20} color="#02743F" />
                        <Text style={styles.notifyText}>
                            We'll notify you when we launch in your city!
                        </Text>
                    </View>
                </ScrollView>

                {/* ─── Continue Button ─── */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.continueButton} activeOpacity={0.8}>
                        <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357',
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: -0.24,
    },

    /* ─── Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: '#FDFDE8',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 120,
    },

    /* ─── Illustration Card ─── */
    illustrationCard: {
        alignItems: 'center',
        marginBottom: 28,
    },
    illustrationIcon: {
        marginBottom: 12,
    },
    illustrationTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: '#2F2F2F',
        textAlign: 'center',
        marginBottom: 6,
        letterSpacing: -0.24,
    },
    illustrationSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777777',
        textAlign: 'center',
        lineHeight: 18,
    },

    /* ─── Section Label ─── */
    sectionLabel: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        color: '#02743F',
        marginBottom: 10,
        letterSpacing: -0.24,
    },

    /* ─── City Cards ─── */
    cityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: 'transparent',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    cityCardSelected: {
        borderColor: '#048357',
        backgroundColor: 'rgba(4, 131, 87, 0.04)',
    },
    cityCardDisabled: {
        opacity: 0.7,
    },
    cityIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(4, 131, 87, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cityIconCircleSelected: {
        backgroundColor: '#048357',
    },
    cityTextGroup: {
        flex: 1,
    },
    cityName: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
        letterSpacing: -0.24,
    },
    cityNameSelected: {
        color: '#02743F',
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
    },
    cityNameDisabled: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#AAAEAC',
        letterSpacing: -0.24,
    },
    cityState: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#AAAEAC',
        marginTop: 2,
    },
    activeTag: {
        backgroundColor: 'rgba(4, 131, 87, 0.12)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginRight: 10,
    },
    activeTagText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 9,
        color: '#048357',
    },
    comingSoonTag: {
        backgroundColor: 'rgba(232, 163, 23, 0.12)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    comingSoonTagText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 9,
        color: '#E8A317',
    },

    /* ─── Notify Banner ─── */
    notifyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.08)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 16,
        gap: 10,
    },
    notifyText: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#02743F',
        lineHeight: 18,
    },

    /* ─── Bottom Bar ─── */
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FDFDE8',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 36,
        alignItems: 'center',
    },
    continueButton: {
        width: '85%',
        maxWidth: 320,
        height: 48,
        backgroundColor: '#02743F',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#FFFFFF',
    },
});

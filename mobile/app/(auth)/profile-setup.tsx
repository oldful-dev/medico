// Profile Setup Screen — Pixel-matched to Figma frame "Registration Screen" (602:368)
// Layout: ScrollView with form fields, profile photo, checkbox, save button
// No business logic — pure presentation
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { FormInput } from '@/components/common';

// Figma-exported assets
const logoImage = require('@/assets/images/2549b5ede370bbb67a088920cac9a8719fec5968.png');
const profilePhoto = require('@/assets/images/5ee16de31c7d04e701fcca78f59c060b6f999c60.png');
const checkmarkImage = require('@/assets/images/5a8dfb52053e366f8cbd3f09d8e940ff289c61af.png');

export default function ProfileSetupScreen() {
    const router = useRouter();

    const [locationAddress, setLocationAddress] = useState('Fetching GPS Location...');

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationAddress('Permission to access location was denied');
                return;
            }

            try {
                let location = await Location.getCurrentPositionAsync({});
                let geocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (geocode && geocode.length > 0) {
                    const address = `${geocode[0].street ? geocode[0].street + ', ' : ''}${geocode[0].city ? geocode[0].city + ', ' : ''}${geocode[0].region || ''}`;
                    setLocationAddress(address || 'Location found, address unavailable');
                } else {
                    setLocationAddress('Location found, address unavailable');
                }
            } catch (error) {
                console.error("Error fetching location:", error);
                setLocationAddress('Failed to fetch location');
            }
        })();
    }, []);

    return (
        <View style={styles.screen}>
            <StatusBar style="dark" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Header: Logo + "Let's Create your PROFILE" ─── */}
                <View style={styles.header}>
                    <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
                    <View style={styles.headerRight}>
                        <Text style={styles.headerSubtitle}>Let's Create your</Text>
                        <Text style={styles.headerTitle}>PROFILE</Text>
                    </View>
                </View>

                {/* ─── Row 1: Full Name + Profile Photo ─── */}
                <View style={styles.row}>
                    <FormInput
                        placeholder="Enter your full name"
                        style={styles.nameInput}
                    />
                    <View style={styles.profilePhotoContainer}>
                        <Image source={profilePhoto} style={styles.profilePhoto} />
                    </View>
                </View>

                {/* ─── Row 2: Language + DOB + Gender ─── */}
                <View style={styles.row}>
                    <FormInput
                        placeholder="language"
                        showChevron
                        style={styles.flexInput}
                        editable={false}
                    />
                    <FormInput
                        placeholder="DOB"
                        style={styles.flexInput}
                        editable={false}
                    />
                    <FormInput
                        placeholder="Gender"
                        showChevron
                        style={styles.flexInput}
                        editable={false}
                    />
                </View>

                {/* ─── Row 3: Email ─── */}
                <FormInput
                    placeholder="Enter your Email ID"
                    keyboardType="email-address"
                    style={styles.fullWidthInput}
                />

                {/* ─── Row 4: Mobile Number + OTP ─── */}
                <View style={styles.row}>
                    <FormInput
                        placeholder="Mobile Number"
                        prefix="+91"
                        keyboardType="phone-pad"
                        style={styles.halfInput}
                        fontSize={13}
                    />
                    <FormInput
                        placeholder="OTP"
                        keyboardType="numeric"
                        style={styles.halfInput}
                    />
                </View>

                {/* ─── Row 5: Address (Auto GPS) + Flat Number ─── */}
                <View style={styles.addressRowWrapper}>
                    <View style={styles.row}>
                        <FormInput
                            placeholder="Address"
                            value={locationAddress}
                            editable={false} // PRD: Auto-populated
                            style={styles.addressInput}
                        />
                        <View style={styles.locationButton}>
                            <Ionicons name="location" size={27} color="#048357" />
                        </View>
                    </View>
                    <FormInput
                        placeholder="Type Flat / House Number"
                        style={[styles.fullWidthInput, { marginTop: 15 }]}
                    />
                </View>

                {/* ─── Row 6: Emergency Number + Auto ID ─── */}
                <View style={styles.row}>
                    <FormInput
                        placeholder="Emergency Number"
                        prefix="+91"
                        keyboardType="phone-pad"
                        style={styles.halfInput}
                        fontSize={13}
                    />
                    <FormInput
                        placeholder="Auto Generated Unique ID"
                        editable={false}
                        style={styles.halfInput}
                        value="ID-12345"
                        fontSize={11}
                    />
                </View>

                {/* ─── Checkbox: Policies ─── */}
                <View style={styles.checkboxRow}>
                    <Image source={checkmarkImage} style={styles.checkmark} resizeMode="contain" />

                    <Text style={styles.policyText}>
                        <Text style={styles.policyTextNormal}>I have Read and agreed to the </Text>
                        <Text style={styles.policyTextUnderline}>policies</Text>
                    </Text>
                </View>

                {/* ─── Save & Continue Button ─── */}
                <TouchableOpacity
                    style={styles.saveButton}
                    activeOpacity={0.8}
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text style={styles.saveButtonText}>Save & Continue</Text>
                </TouchableOpacity>

                {/* ─── Already a member? Login ─── */}
                <View style={styles.loginRow}>
                    <Text style={styles.loginText}>Already a member? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                        <Text style={styles.loginLink}>Login</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    /* ─── Screen ─── */

    screen: {
        flex: 1,
        backgroundColor: '#FFFFEE',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 28,
        paddingTop: 57,
        paddingBottom: 40,
    },

    /* ─── Header ─── */
    /* Figma: Logo 143×59 at x=29,y=57 | "Let's Create your" Laila Bold 10px + "PROFILE" Lexend Deca Bold 24px at right */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    headerLogo: {
        width: 143,
        height: 59,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    headerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '700',
        fontSize: 10,
        color: '#02743F',
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontWeight: '700',
        fontSize: 24,
        color: '#0EDD94',
        letterSpacing: -0.24,
    },

    /* ─── Shared row layout ─── */
    row: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 15,
        alignItems: 'center',
    },

    /* ─── Row 1: Name (234w) + Profile Photo (92×92) ─── */
    nameInput: {
        flex: 1,
        elevation: 0,
        borderRadius: 8,
    },
    profilePhotoContainer: {
        elevation: 0,
        width: 92,
        height: 92,
        borderRadius: 46,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#888888',
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
    },

    /* ─── Row 2: Flex Inputs ─── */
    flexInput: {
        flex: 1,
        elevation: 0,
    },

    /* ─── Row 3: Full width Email ─── */
    fullWidthInput: {
        marginBottom: 15,
        elevation: 0,
    },

    /* ─── Row 4 & 6: Half-width inputs (170w each) ─── */
    halfInput: {
        flex: 1,
        elevation: 0,
    },

    /* ─── Row 5: Address (Flex) + Location pin button ─── */
    addressRowWrapper: {
        marginBottom: 15,
    },
    addressInput: {
        flex: 1,
        minHeight: 80,
        paddingVertical: 12,
        elevation: 0,
    },
    locationButton: {
        width: 80,
        height: 80,
        borderWidth: 1,
        borderColor: '#02743F',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },

    /* ─── Checkbox row ─── */
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    checkmark: {
        width: 33,
        height: 33,
        marginRight: 8,
    },
    policyText: {
        flex: 1,
    },
    policyTextNormal: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 14,
        color: '#2F2F2F',
    },
    policyTextUnderline: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 14,
        color: '#000000',
        textDecorationLine: 'underline',
    },

    /* ─── Save & Continue button ─── */
    /* Figma: bg #048357, border 1px #02743F, radius 27.5, h=55, w=342 */
    saveButton: {
        height: 55,
        borderRadius: 27.5,
        backgroundColor: '#048357',
        borderWidth: 1,
        borderColor: '#02743F',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    saveButtonText: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontWeight: '700',
        fontSize: 18,
        color: '#FFFFFF',
        letterSpacing: -0.24,
    },

    /* ─── Already a member? Login ─── */
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 14,
        color: '#848484',
    },
    loginLink: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 14,
        color: '#02743F',
    },
});

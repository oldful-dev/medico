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
    KeyboardAvoidingView,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { FormInput } from '@/components/common';
import { userService, cityService, ApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// Figma-exported assets
const logoImage = require('@/assets/images/2549b5ede370bbb67a088920cac9a8719fec5968.png');
const profilePhoto = require('@/assets/images/5ee16de31c7d04e701fcca78f59c060b6f999c60.png');
const checkmarkImage = require('@/assets/images/5a8dfb52053e366f8cbd3f09d8e940ff289c61af.png');

export default function ProfileSetupScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const passedPhone = typeof params.phone === 'string' ? params.phone : '';
    const { login } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [locationAddress, setLocationAddress] = useState('Fetching GPS Location...');
    const [locationDenied, setLocationDenied] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const [cityId, setCityId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchGPSLocation = async () => {
        setLocationAddress('Fetching GPS Location...');
        setLocationDenied(false);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setLocationAddress('');
            setLocationDenied(true);
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
    };

    const fetchDefaultCity = async () => {
        try {
            const response = await cityService.getCities();
            if (response.data && response.data.length > 0) {
                // Find an active city, otherwise fallback to the first one
                const activeCity = response.data.find(c => c.isEnabled && !c.isComingSoon);
                setCityId(activeCity ? activeCity.id : response.data[0].id);
            }
        } catch (error) {
            console.error("Failed to load cities", error);
        }
    };

    useEffect(() => {
        fetchGPSLocation();
        fetchDefaultCity();
    }, []);

    const handleSaveAndContinue = async () => {
        if (!agreed) {
            Alert.alert("Permission Denied", "Please agree to the Policies and Terms to continue.");
            return;
        }
        if (!name || name.trim().length < 3) {
            Alert.alert("Validation", "Please enter a valid full name.");
            return;
        }
        if (!cityId) {
            Alert.alert("City Loading", "Still fetching city data. Please wait a second and try again.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await userService.createUser({
                name: name.trim(),
                phone: passedPhone,
                email: email.trim() || undefined,
                cityId: cityId,
                preferredLanguage: 'en',
            });

            if (response.success && response.data) {
                // The `createUser` service is now updated to return accessToken and refreshToken
                const tokens = (response as any).data; // Casting config since types might be strict
                if (tokens.accessToken && tokens.refreshToken) {
                    await login(
                        tokens.accessToken,
                        tokens.refreshToken,
                        response.data.id
                    );
                }

                // On register success, we replace the stack and navigate home
                router.replace('/(tabs)');
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (error) {
            const apiError = error as ApiError;
            Alert.alert("Registration Error", apiError.message || "Failed to create profile.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
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
                            value={name}
                            onChangeText={setName}
                        />
                        <View style={styles.profilePhotoContainer}>
                            <Image source={profilePhoto} style={styles.profilePhoto} />
                        </View>
                    </View>

                    {/* ─── Row 2: Language ─── */}
                    <FormInput
                        placeholder="Language"
                        showChevron
                        style={styles.fullWidthInput}
                        editable={false}
                    />

                    {/* ─── Row 2b: DOB + Gender ─── */}
                    <View style={styles.row}>
                        <FormInput
                            placeholder="DOB"
                            style={styles.halfInput}
                            editable={false}
                        />
                        <FormInput
                            placeholder="Gender"
                            showChevron
                            style={styles.halfInput}
                            editable={false}
                        />
                    </View>

                    {/* ─── Row 3: Email ─── */}
                    <FormInput
                        placeholder="Enter your Email ID"
                        keyboardType="email-address"
                        style={styles.fullWidthInput}
                        value={email}
                        onChangeText={setEmail}
                    />

                    {/* ─── Row 4: Mobile Number (Read-only since verified) ─── */}
                    <FormInput
                        placeholder="Mobile Number"
                        value={passedPhone.replace('+91', '')}
                        prefix="+91"
                        keyboardType="phone-pad"
                        style={styles.fullWidthInput}
                        editable={false}
                        fontSize={13}
                    />

                    {/* ─── Row 5: Address (Auto GPS) + Flat Number ─── */}
                    <View style={styles.addressRowWrapper}>
                        <View style={styles.row}>
                            <FormInput
                                placeholder={locationDenied ? "Type your full address" : "Address"}
                                value={locationAddress}
                                editable={locationDenied}
                                onChangeText={locationDenied ? setLocationAddress : undefined}
                                style={styles.addressInput}
                                multiline={true}
                                fontSize={12}
                            />
                            <TouchableOpacity
                                style={styles.locationButton}
                                activeOpacity={0.7}
                                onPress={fetchGPSLocation}
                            >
                                <Ionicons name="location" size={27} color="#048357" />
                            </TouchableOpacity>
                        </View>
                        <FormInput
                            placeholder="Type Flat / House Number"
                            style={[styles.fullWidthInput, { marginTop: 15 }]}
                        />
                    </View>

                    {/* ─── Row 6: Emergency Number ─── */}
                    <FormInput
                        placeholder="Emergency Number"
                        prefix="+91"
                        keyboardType="phone-pad"
                        style={styles.fullWidthInput}
                        fontSize={13}
                    />

                    {/* ─── Row 7: Auto ID ─── */}
                    <FormInput
                        placeholder="Auto Generated Unique ID"
                        editable={false}
                        style={styles.fullWidthInput}
                        value="Will be generated after saving"
                        fontSize={13}
                    />

                    {/* ─── Checkbox: Policies ─── */}
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        activeOpacity={0.8}
                        onPress={() => setAgreed(!agreed)}
                    >
                        <View style={styles.checkboxContainer}>
                            {agreed && <Image source={checkmarkImage} style={styles.checkmark} resizeMode="contain" />}
                        </View>

                        <Text style={styles.policyText}>
                            <Text style={styles.policyTextNormal}>I have Read and agreed to the </Text>
                            <Text style={styles.policyTextUnderline}>policies</Text>
                        </Text>
                    </TouchableOpacity>

                    {/* ─── Save & Continue Button ─── */}
                    <TouchableOpacity
                        style={[styles.saveButton, (!agreed || isLoading) && { opacity: 0.7 }]}
                        activeOpacity={0.8}
                        onPress={handleSaveAndContinue}
                        disabled={isLoading}
                    >
                        <Text style={styles.saveButtonText}>
                            {isLoading ? "Saving..." : "Save & Continue"}
                        </Text>
                    </TouchableOpacity>

                    {/* ─── Already a member? Login ─── */}
                    <View style={styles.loginRow}>
                        <Text style={styles.loginText}>Already a member? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text style={styles.loginLink}>Login</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
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
        width: 140,
        height: 59,
        flexShrink: 1,
    },
    headerRight: {
        alignItems: 'flex-end',
        flexShrink: 1,
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
        overflow: 'hidden',
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
    checkboxContainer: {
        width: 26,
        height: 26,
        borderWidth: 1.5,
        borderColor: '#02743F',
        borderRadius: 6,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    checkmark: {
        width: 18,
        height: 18,
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

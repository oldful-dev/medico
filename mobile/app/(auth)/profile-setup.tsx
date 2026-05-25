// Profile Setup Screen — Pixel-matched to Figma frame "Registration Screen" (602:368)
// Layout: ScrollView with form fields, profile photo, checkbox, save button
// No business logic — pure presentation
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Alert,
    ActionSheetIOS,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FormInput } from '@/components/common';
import { userService, cityService, ApiError, authService } from '@/services/api';
import { mediaService } from '@/services/api/mediaService';
import { OTPInput, type OTPInputRef } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { useTranslation } from 'react-i18next';
import { locationService } from '@/services/device/locationService';
import { useTheme } from '@/context/ThemeContext';

// Figma-exported assets
const logoImage = require('@/assets/images/nameandlogo.png');
const defaultProfilePhoto = require('@/assets/images/5ee16de31c7d04e701fcca78f59c060b6f999c60.png');
const checkmarkImage = require('@/assets/images/5a8dfb52053e366f8cbd3f09d8e940ff289c61af.png');

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Bengali'];

// GPS error strings that should NOT be saved as address
const GPS_ERROR_STATES = [
    'Fetching GPS Location...',
    'Failed to fetch location',
    'Location found, address unavailable',
    '',
];

export default function ProfileSetupScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const passedPhone = typeof params.phone === 'string' ? params.phone : '';
    const googleEmail = typeof params.googleEmail === 'string' ? params.googleEmail : '';
    const googleName = typeof params.googleName === 'string' ? params.googleName : '';
    const googlePhoto = typeof params.googlePhoto === 'string' ? params.googlePhoto : '';
    const { login } = useAuth();
    const { selectedCityId: contextCityId } = useUser();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(isDarkMode);

    // isGoogleFlow: user came from Google Sign-In with no OTP-verified phone
    const isGoogleFlow = !passedPhone && !!googleEmail;

    const [name, setName] = useState(googleName);
    const [email, setEmail] = useState(googleEmail);
    const [phoneInput, setPhoneInput] = useState(''); // only used in Google flow
    const [profileImageUri, setProfileImageUri] = useState<string | null>(googlePhoto || null);
    const [gender, setGender] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [language, setLanguage] = useState('English');
    const [line1, setLine1] = useState('');
    const [emergencyNumber, setEmergencyNumber] = useState('');
    const [line2, setLine2] = useState('Fetching GPS Location...');
    const [locationDenied, setLocationDenied] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const [cityId, setCityId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(!!passedPhone);
    const [otpSent, setOtpSent] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const otpRef = useRef<OTPInputRef>(null);

    const fetchGPSLocation = async () => {
        setLine2('Fetching GPS Location...');
        setLocationDenied(false);

        try {
            const hasPermission = await locationService.requestPermission();
            if (!hasPermission) {
                setLine2('');
                setLocationDenied(true);
                return;
            }

            const coords = await locationService.getCurrentLocation();
            const address = await locationService.getAddressFromCoordinates(coords);
            setLine2(address);

            // Extract city for auto-matching
            // Simple extraction: last part of address usually contains city/pincode in formatted_address
            // but we can also use locationService to return an object if needed.
            // For now, let's just use the string.
            const parts = address.split(',');
            const city = parts[parts.length - 2]?.trim() || ''; 
            
            // Only GPS-match city if user didn't explicitly select one
            if (city && !contextCityId) {
                try {
                    const response = await cityService.getCities();
                    if (response.data) {
                        const match = response.data.find(c => city.toLowerCase().includes(c.name.toLowerCase()) && c.isEnabled);
                        if (match) setCityId(match.id);
                    }
                } catch { }
            }
        } catch (error) {
            console.error("Error fetching location:", error);
            setLine2('Failed to fetch location');
        }
    };

    const fetchDefaultCity = async () => {
        try {
            const response = await cityService.getCities();
            if (response.data && response.data.length > 0) {
                const activeCity = response.data.find(c => c.isEnabled && !c.isComingSoon);
                setCityId(activeCity ? activeCity.id : response.data[0].id);
            }
        } catch (error) {
            console.error("Failed to load cities", error);
        }
    };

    useEffect(() => {
        // If user explicitly selected a city in city-selection, use it immediately
        if (contextCityId) {
            setCityId(contextCityId);
        } else {
            fetchDefaultCity();
        }
        // Always try GPS for address autofill (independent of city matching)
        fetchGPSLocation();
    }, [contextCityId]);

    const handleReqOTP = async () => {
        if (phoneInput.length !== 10) {
            Alert.alert("Invalid Phone", "Please enter a 10-digit mobile number.");
            return;
        }
        setIsVerifyingOtp(true);
        try {
            await authService.requestOTP({ phoneNumber: `+91${phoneInput}` });
            setOtpSent(true);
            Alert.alert("OTP Sent", "Verification code has been sent to your mobile.");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to send OTP");
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleVerifyOTP = async (otp: string) => {
        setIsLoading(true);
        try {
            await authService.verifyOTP({ phoneNumber: `+91${phoneInput}`, otp });
            setIsPhoneVerified(true);
            setOtpSent(false);
            Alert.alert("Verified", "Phone number verified successfully!");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Invalid OTP");
            otpRef.current?.clear();
        } finally {
            setIsLoading(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setProfileImageUri(result.assets[0].uri);
        }
    };

    const handleSelectGender = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Cancel', ...GENDER_OPTIONS], cancelButtonIndex: 0 },
                (idx) => { if (idx > 0) setGender(GENDER_OPTIONS[idx - 1]); }
            );
        } else {
            Alert.alert('Select Gender', '', GENDER_OPTIONS.map(g => ({
                text: g, onPress: () => setGender(g),
            })).concat({ text: 'Cancel', onPress: () => { }, style: 'cancel' } as any));
        }
    };

    const handleSelectLanguage = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Cancel', ...LANGUAGE_OPTIONS], cancelButtonIndex: 0 },
                (idx) => { if (idx > 0) setLanguage(LANGUAGE_OPTIONS[idx - 1]); }
            );
        } else {
            Alert.alert('Select Language', '', LANGUAGE_OPTIONS.map(l => ({
                text: l, onPress: () => setLanguage(l),
            })).concat({ text: 'Cancel', onPress: () => { }, style: 'cancel' } as any));
        }
    };

    const formatDOB = (date: Date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    };

    const handleSaveAndContinue = async () => {
        if (!name || name.trim().length < 3) {
            Alert.alert("Full Name Required", "Please enter your full name (at least 3 characters).");
            return;
        }
        if (!isPhoneVerified) {
            Alert.alert("Phone Verification Required", "Please enter and verify your mobile number to complete registration.");
            return;
        }
        if (!agreed) {
            Alert.alert("Terms Required", "Please read and agree to the Policies and Terms to continue.");
            return;
        }
        if (!cityId) {
            // Fallback to first city if still not loaded, though useEffect should handle this
            Alert.alert("City Loading", "Still fetching city data. Please wait a second and try again.");
            return;
        }

        // Sanitise emergency number — strip non-digits, keep last 10
        const cleanEmergency = emergencyNumber.replace(/\D/g, '').slice(-10);

        // Only save address if it's a real value, not a GPS error/loading string
        const validAddress = !GPS_ERROR_STATES.includes(line2);

        const langCode = language === 'Hindi' ? 'hi'
            : language === 'Kannada' ? 'kn'
                : language === 'Tamil' ? 'ta'
                    : language === 'Telugu' ? 'te'
                        : language === 'Bengali' ? 'bn'
                            : 'en';

        setIsLoading(true);
        try {
            // Resolve final phone: OTP-verified phone takes priority; Google flow uses manually entered phone
            const finalPhone = passedPhone || `+91${phoneInput.replace(/\D/g, '').slice(-10)}`;

            // ── Step 1: Create user (no token yet — profile image skipped here) ──
            const response = await userService.createUser({
                name: name.trim(),
                phone: finalPhone,
                email: email.trim() || undefined,
                cityId: cityId,
                preferredLanguage: langCode,
                gender: gender.toLowerCase() || undefined,
                dateOfBirth: dateOfBirth?.toISOString() || undefined,
                emergencyNumber: cleanEmergency.length === 10 ? `+91${cleanEmergency}` : undefined,
                line1: line1.trim() || undefined,
                line2: validAddress ? line2 : undefined,
            } as any);

            if (!response.success || !response.data) {
                throw new Error("Invalid response from server");
            }

            const tokens = (response as any).data;
            if (!tokens.accessToken || !tokens.refreshToken) {
                throw new Error("Authentication tokens missing from server response");
            }

            // ── Step 2: Authenticate (sets token on apiClient + persists to storage) ──
            await login(tokens.accessToken, tokens.refreshToken, response.data.id);

            // ── Step 3: Upload profile image NOW (token is set, media endpoints are open) ──
            if (profileImageUri) {
                try {
                    let imageUrl: string | null = null;

                    if (profileImageUri.startsWith('http')) {
                        // Google photo — use URL directly
                        imageUrl = profileImageUri;
                    } else {
                        // Local file — upload to GCS via proxy
                        const uploadResult = await mediaService.uploadMedia(profileImageUri, 'profile-avatars');
                        if (uploadResult.success && uploadResult.data?.fileUrl) {
                            imageUrl = uploadResult.data.fileUrl;
                        } else {
                            console.warn('PFP upload failed:', uploadResult.message);
                        }
                    }

                    if (imageUrl) {
                        const patchResult = await userService.updateProfile({ profileImageUrl: imageUrl } as any);
                        if (!patchResult.success) {
                            console.warn('PFP profile patch failed:', patchResult.message);
                        }
                    }
                } catch (imgErr: any) {
                    // Non-blocking — user is registered, image just didn't sync
                    console.warn('Profile image upload failed (non-blocking):', imgErr?.message ?? imgErr);
                }
            }

            // ── Step 4: Navigate home ──
            router.replace('/(tabs)');

        } catch (error) {
            const apiError = error as ApiError;
            Alert.alert("Registration Error", apiError.message || "Failed to create profile.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.screen, { backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFEE' }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
                extraScrollHeight={20}
            >
                {/* ─── Header: Logo + "Let's Create your PROFILE" ─── */}
                <View style={styles.header}>
                    <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
                    <View style={styles.headerRight}>
                        <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#52C77A' : '#02743F' }]}>Let&apos;s Create your</Text>
                        <Text style={[styles.headerTitle, { color: isDarkMode ? '#2FFF89' : '#0EDD94' }]}>PROFILE</Text>
                    </View>
                </View>

                {/* ─── Row 1: Full Name + Profile Photo ─── */}
                <View style={styles.row}>
                    <FormInput
                        placeholder={t('profile_setup.name_placeholder')}
                        style={styles.nameInput}
                        value={name}
                        onChangeText={setName}
                    />
                    <TouchableOpacity style={styles.profilePhotoContainer} onPress={handlePickImage} activeOpacity={0.7}>
                        {profileImageUri ? (
                            <>
                                <Image
                                    source={{ uri: profileImageUri }}
                                    style={styles.profilePhoto}
                                />
                                <View style={styles.cameraOverlay}>
                                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.profilePhotoPlaceholder}>
                                    <View style={styles.placeholderHead} />
                                    <View style={styles.placeholderBody} />
                                </View>
                                <View style={styles.cameraOverlay}>
                                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ─── Row 2: Language, DOB, Gender (Shared Row) ─── */}
                <View style={[styles.row, { marginBottom: 15 }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={handleSelectLanguage} activeOpacity={0.7}>
                        <FormInput
                            placeholder="Language"
                            showChevron
                            style={styles.flexInput}
                            editable={false}
                            value={language}
                            fontSize={11}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                        <FormInput
                            placeholder="DOB"
                            style={styles.flexInput}
                            editable={false}
                            value={dateOfBirth ? formatDOB(dateOfBirth) : ''}
                            fontSize={11}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={{ flex: 1 }} onPress={handleSelectGender} activeOpacity={0.7}>
                        <FormInput
                            placeholder="Gender"
                            showChevron
                            style={styles.flexInput}
                            editable={false}
                            value={gender}
                            fontSize={11}
                        />
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={dateOfBirth || new Date(2000, 0, 1)}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        maximumDate={new Date()}
                        minimumDate={new Date(1920, 0, 1)}
                        onChange={(_, date) => {
                            // Always close picker on both platforms
                            setShowDatePicker(false);
                            if (date) setDateOfBirth(date);
                        }}
                    />
                )}

                {/* ─── Row 3: Email ─── */}
                <FormInput
                    placeholder="Enter your Email ID"
                    keyboardType="email-address"
                    style={styles.fullWidthInput}
                    value={email}
                    onChangeText={setEmail}
                />

                {/* ─── Row 4: Mobile Number (read-only if verified; editable if not) ─── */}
                <FormInput
                    placeholder="Mobile Number"
                    value={isPhoneVerified ? (passedPhone ? passedPhone.replace('+91', '') : phoneInput) : phoneInput}
                    prefix="+91"
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={styles.fullWidthInput}
                    editable={!isPhoneVerified}
                    onChangeText={!isPhoneVerified ? setPhoneInput : undefined}
                    fontSize={13}
                    suffix={
                        !isPhoneVerified ? (
                            <TouchableOpacity onPress={handleReqOTP} disabled={phoneInput.length !== 10 || isVerifyingOtp}>
                                <Text style={[styles.verifyBtnText, phoneInput.length === 10 ? { color: '#048357' } : { color: '#CCC' }]}>
                                    {otpSent ? 'RESEND' : 'VERIFY'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <Ionicons name="checkmark-circle" size={20} color="#048357" />
                        )
                    }
                />

                {/* ─── OTP Input for Unverified Flow ─── */}
                {!isPhoneVerified && otpSent && (
                    <View style={styles.otpVerifyContainer}>
                        <Text style={styles.otpHint}>Enter 4-digit code sent to +91 {phoneInput}</Text>
                        <OTPInput otpRef={otpRef} length={4} onComplete={handleVerifyOTP} />
                    </View>
                )}


                {/* ─── Row 5: Address (Auto GPS) + Flat Number ─── */}
                <View style={styles.addressRowWrapper}>
                    <View style={styles.row}>
                        <FormInput
                            placeholder={locationDenied ? "Type your full address" : "Address"}
                            value={line2}
                            editable={locationDenied}
                            onChangeText={locationDenied ? setLine2 : undefined}
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
                        value={line1}
                        onChangeText={setLine1}
                    />
                </View>

                {/* ─── Row 6: Emergency Number + Auto ID (Shared Row) ─── */}
                <View style={styles.row}>
                    <FormInput
                        placeholder="Emergency No"
                        prefix="+91"
                        keyboardType="phone-pad"
                        style={styles.flexInput}
                        fontSize={12}
                        value={emergencyNumber}
                        onChangeText={setEmergencyNumber}
                        maxLength={10}
                    />
                    <FormInput
                        placeholder="Unique ID"
                        editable={false}
                        style={styles.flexInput}
                        value="TBD"
                        fontSize={12}
                    />
                </View>

                {/* ─── Checkbox: Policies ─── */}
                <View style={styles.checkboxRow}>
                    <TouchableOpacity
                        style={[styles.checkboxContainer, { borderColor: '#02743F', backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' }]}
                        activeOpacity={0.8}
                        onPress={() => setAgreed(!agreed)}
                    >
                        {agreed && <Image source={checkmarkImage} style={styles.checkmark} resizeMode="contain" />}
                    </TouchableOpacity>

                    <Text style={styles.policyText}>
                        <Text style={[styles.policyTextNormal, { color: isDarkMode ? '#E0E0E0' : '#2F2F2F' }]}>I have Read and agreed to the </Text>
                        <Text
                            style={[styles.policyTextUnderline, { color: isDarkMode ? '#E0E0E0' : '#000000' }]}
                            onPress={() => router.push('/terms-policy')}
                        >
                            policies
                        </Text>
                    </Text>
                </View>

                {/* ─── Save & Continue Button ─── */}
                <TouchableOpacity
                    style={[styles.saveButton, (!agreed || isLoading) && { opacity: 0.7 }]}
                    activeOpacity={0.8}
                    onPress={handleSaveAndContinue}
                    disabled={!agreed || isLoading}
                >
                    <Text style={styles.saveButtonText}>
                        {isLoading ? t('profile_setup.completing') : t('profile_setup.complete_profile')}
                    </Text>
                </TouchableOpacity>

                {/* ─── Already a member? Login ─── */}
                <View style={styles.loginRow}>
                    <Text style={[styles.loginText, { color: isDarkMode ? '#A0A0A0' : '#848484' }]}>Already a member? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                        <Text style={[styles.loginLink, { color: '#02743F' }]}>Login</Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAwareScrollView>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    /* ─── Screen ─── */

    screen: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 28,
        paddingTop: 57,
        paddingBottom: 120,
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
        borderWidth: 3,
        borderColor: '#66BB6A',
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
    },
    profilePhotoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderHead: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#81C784',
        marginBottom: 6,
    },
    placeholderBody: {
        width: 40,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#81C784',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 4,
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
    verifyBtnText: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontSize: 12,
        fontWeight: '700',
    },
    otpVerifyContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    otpHint: {
        fontFamily: Platform.select({ ios: 'Poppins-Regular', android: 'Poppins_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
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
        borderRadius: 6,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        width: 18,
        height: 18,
    },
    policyText: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    policyTextNormal: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 14,
    },
    policyTextUnderline: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 14,
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
    },
    loginLink: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 14,
    },
});

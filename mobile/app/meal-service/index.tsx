import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { locationService } from '@/services/device/locationService';
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';
import { useTranslation } from 'react-i18next';

// ─── Figma Assets ───
const imgThali = require('@/assets/images/6fdd60a0eb22e90770fb958a6ddcf54c1c9dc6b6.png'); // Meal image
const imgCheckmark = require('@/assets/images/019640d27de157c119b045c46aae6a6559dd3a79.png'); // Green Check Circle

// Radio button mock components for the static layout
const CheckedRadio = () => (
    <View style={styles.radioContainer}>
        <Image source={imgCheckmark} style={styles.checkedRadioIcon} />
    </View>
);

const UncheckedRadio = () => (
    <View style={styles.radioContainer}>
        <View style={styles.uncheckedRadioCircle} />
    </View>
);

const CheckedSolidRadio = () => (
    <View style={styles.radioContainer}>
        <View style={styles.solidCheckedRadio} />
    </View>
);

export default function MealServiceScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [mealType, setMealType] = useState('Home Style');
    const [subMode, setSubMode] = useState('Monthly Subscription');
    const [noOnionGarlic, setNoOnionGarlic] = useState(false);
    const [spicy, setSpicy] = useState(false);
    const [otherReq, setOtherReq] = useState('');

    // Global Initialization
    const { isReady, cityId, serviceId, serviceName, servicePrice, address, isLoading: isLoadingInit } = useServiceInitialization('tiffin');
    const [isBooking, setIsBooking] = useState(false);

    const handleBookService = async () => {
        if (!isReady) {
            Alert.alert('Error', 'Service initialization incomplete. Please check your internet connection or try logging out and back in.');
            return;
        }
        try {
            setIsBooking(true);

            // Navigate to checkout — booking created inside checkout after payment succeeds
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: new Date().toISOString(),
                addressLine: address || undefined,
                formDataJson: {
                    mealType,
                    subscriptionMode: subMode,
                    noOnionGarlic,
                    spicy,
                    otherReq: otherReq || undefined,
                },
            });

            router.push({
                pathname: '/payment/checkout',
                params: { bookingPayload, amount: String(servicePrice), label: serviceName || 'Meal Service' },
            });
        } catch (error) {
            console.error('Meal service error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };
    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select Meal Plan</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                {/* ─── Top Meal Selection Card ─── */}
                <View style={styles.mealSelectionCard}>
                    <View style={styles.mealOptionsContainer}>

                        <TouchableOpacity style={styles.mealOptionItem} onPress={() => setMealType('Diabetic Friendly')} activeOpacity={0.7}>
                            {mealType === 'Diabetic Friendly' ? <CheckedRadio /> : <UncheckedRadio />}
                            <View>
                                <Text style={styles.mealOptionTitle}>Diabetic Friendly</Text>
                                <Text style={styles.mealOptionDesc}>(Low GI, Less rice)</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.mealOptionItem} onPress={() => setMealType('Home Style')} activeOpacity={0.7}>
                            {mealType === 'Home Style' ? <CheckedRadio /> : <UncheckedRadio />}
                            <View>
                                <Text style={styles.mealOptionTitle}>Home Style</Text>
                                <Text style={styles.mealOptionDesc}>(Roti,Dal, Sabzi)</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.mealOptionItem} onPress={() => setMealType('Soft Food')} activeOpacity={0.7}>
                            {mealType === 'Soft Food' ? <CheckedRadio /> : <UncheckedRadio />}
                            <View>
                                <Text style={styles.mealOptionTitle}>Soft Food</Text>
                                <Text style={styles.mealOptionDesc}>(Khichdi/porridge - for{'\n'}recovering patients)</Text>
                            </View>
                        </TouchableOpacity>

                    </View>

                    {/* Right side Image & Decoration */}
                    <View style={styles.mealImageContainer}>
                        <Image source={imgThali} style={styles.mealImage} resizeMode="contain" />
                    </View>

                    {/* Dots indicator at bottom */}
                    <View style={styles.paginationDots}>
                        <View style={[styles.dot, mealType === 'Diabetic Friendly' ? styles.dotActive : styles.dotInactive]} />
                        <View style={[styles.dot, mealType === 'Home Style' ? styles.dotActive : styles.dotInactive]} />
                        <View style={[styles.dot, mealType === 'Soft Food' ? styles.dotActive : styles.dotInactive]} />
                    </View>
                </View>

                {/* ─── Subscription Mode ─── */}
                <Text style={styles.sectionTitle}>Subscription Mode</Text>
                <View style={styles.sectionCard}>
                    <TouchableOpacity style={styles.optionRow} onPress={() => setSubMode('Trial')} activeOpacity={0.7}>
                        {subMode === 'Trial' ? <CheckedSolidRadio /> : <UncheckedRadio />}
                        <Text style={styles.optionMainText}>Trial<Text style={styles.optionSubText}>(3 Days)</Text></Text>
                    </TouchableOpacity>
                    <View style={{ height: 18 }} />
                    <TouchableOpacity style={styles.optionRow} onPress={() => setSubMode('Monthly Subscription')} activeOpacity={0.7}>
                        {subMode === 'Monthly Subscription' ? <CheckedSolidRadio /> : <UncheckedRadio />}
                        <Text style={styles.optionMainText}>Monthly Subscription</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── Dietary Preferences ─── */}
                <Text style={styles.sectionTitle}>Dietary Preferences</Text>
                <View style={styles.sectionCard}>

                    <TouchableOpacity style={styles.preferenceRow} onPress={() => setNoOnionGarlic(!noOnionGarlic)} activeOpacity={0.7}>
                        <View style={styles.switchBox}>
                            {noOnionGarlic ? <Image source={imgCheckmark} style={styles.checkedSwitchIcon} /> : <View style={styles.uncheckedRadioCircle} />}
                        </View>
                        <Text style={styles.preferenceText}>No Onion/Garlic?</Text>
                    </TouchableOpacity>

                    <View style={{ height: 16 }} />

                    <TouchableOpacity style={styles.preferenceRow} onPress={() => setSpicy(!spicy)} activeOpacity={0.7}>
                        <View style={styles.switchBox}>
                            {spicy ? <Image source={imgCheckmark} style={styles.checkedSwitchIcon} /> : <View style={styles.uncheckedRadioCircle} />}
                        </View>
                        <Text style={styles.preferenceText}>Spicy / Non-Spicy?</Text>
                    </TouchableOpacity>

                </View>

                {/* ─── Something Else? ─── */}
                <Text style={styles.sectionTitle}>Something Else?</Text>
                <View style={[styles.textAreaContainer, { paddingHorizontal: 0 }]}>
                    <TextInput
                        style={[styles.textAreaPlaceholder, { flex: 1, paddingHorizontal: 15 }]}
                        placeholder="write your specific requirement...(e.g, ‘No Salt’)"
                        placeholderTextColor="#898989"
                        value={otherReq}
                        onChangeText={setOtherReq}
                    />
                </View>

                {/* ─── Action Button ─── */}
                <TouchableOpacity
                    style={[styles.submitButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                    activeOpacity={0.8}
                    disabled={isBooking || isLoadingInit}
                    onPress={handleBookService}
                >
                    {isLoadingInit ? (
                        <Text style={styles.submitButtonText}>Initializing...</Text>
                    ) : isBooking ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Request Tiffin</Text>
                    )}
                </TouchableOpacity>

            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Cream color matches Figma
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 15,
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
    scrollContent: {
        paddingHorizontal: 15,
        paddingTop: 20,
        paddingBottom: 40,
    },

    /* ─── Top Meal Selection Card ─── */
    mealSelectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 18,
        paddingTop: 20,
        marginBottom: 25,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 5,
        minHeight: 182,
        position: 'relative',
    },
    mealOptionsContainer: {
        flex: 1,
        zIndex: 2,
    },
    mealOptionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    mealOptionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
        lineHeight: 20,
    },
    mealOptionDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777777',
        marginTop: 2,
    },
    mealImageContainer: {
        position: 'absolute',
        right: -10, // Let it bleed out slightly to match design
        top: 25,
        width: 170,
        height: 115,
        zIndex: 1,
    },
    mealImage: {
        width: '100%',
        height: '100%',
        // Slight rotation matches screenshot
        transform: [{ rotate: '-8.37deg' }],
    },
    paginationDots: {
        position: 'absolute',
        bottom: 15,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 3,
    },
    dotInactive: {
        backgroundColor: 'rgba(4, 131, 87, 0.4)', // Faded green
    },
    dotActive: {
        backgroundColor: '#048357', // Solid green
    },

    /* ─── Section Header ─── */
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        marginLeft: 5,
        marginBottom: 12,
    },

    /* ─── Outlined Cards ─── */
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 10,
        padding: 20,
        paddingVertical: 22,
        marginBottom: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionMainText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
    },
    optionSubText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: 'normal',
    },

    /* ─── Dietary Preferences ─── */
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    preferenceText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: '#898989',
    },
    checkedSwitchIcon: {
        width: 20,
        height: 20,
        marginRight: 6,
    },

    /* ─── Text Area ─── */
    textAreaContainer: {
        height: 53,
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 10,
        paddingHorizontal: 15,
        justifyContent: 'center',
        marginBottom: 35,
    },
    textAreaPlaceholder: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: '#555555',
    },

    /* ─── Reusable Components ─── */
    radioContainer: {
        width: 24,
        marginRight: 8,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginTop: 2,
    },
    checkedRadioIcon: {
        width: 16,
        height: 16,
    },
    uncheckedRadioCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#777777', // subtle gray
    },
    solidCheckedRadio: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#048357',
    },

    /* ─── Submit Button ─── */
    submitButton: {
        backgroundColor: '#02743F',
        height: 45,
        borderRadius: 22.5,
        width: 281,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 14,
    },
});
